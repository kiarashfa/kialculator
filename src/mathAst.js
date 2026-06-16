// ═══════════════════════════════════════════════════════════════════════════
// STRUCTURAL MATH TREE  (pure, no React/DOM — Node-testable; see test/ast.test.js)
// Nodes: {id, type, ...}
// "seq"   → children[]          (sequence of nodes)
// "char"  → value               (single character/token)
// "frac"  → num(seq), den(seq)  (fraction)
// "sup"   → base(seq), exp(seq) (superscript/exponent)
// "sqrt"  → rad(seq)            (square root)
// "func"  → name, arg(seq)      (named function)
// "paren" → inner(seq)          (parenthesized group)
// ═══════════════════════════════════════════════════════════════════════════

let _nid = 0;
export function nid() { return ++_nid; }

export function mkSeq(ch) { return { id: nid(), type: "seq", children: ch || [] }; }
export function mkChar(v) { return { id: nid(), type: "char", value: v }; }
export function mkFrac(n, d) { return { id: nid(), type: "frac", num: n || mkSeq(), den: d || mkSeq() }; }
export function mkSup(b, e) { return { id: nid(), type: "sup", base: b || mkSeq(), exp: e || mkSeq() }; }
export function mkSqrt(r) { return { id: nid(), type: "sqrt", rad: r || mkSeq() }; }
export function mkFunc(name, a) { return { id: nid(), type: "func", name, arg: a || mkSeq() }; }
export function mkParen(c) { return { id: nid(), type: "paren", inner: c || mkSeq() }; }

// AST → flat expression string
export function toExpr(n) {
  if (!n) return "";
  switch (n.type) {
    case "char": return n.value;
    case "seq": return n.children.map(toExpr).join("");
    case "frac": return `((${toExpr(n.num)})/(${toExpr(n.den)}))`;
    case "sup": return `(${toExpr(n.base)})^(${toExpr(n.exp)})`;
    case "sqrt": return `sqrt(${toExpr(n.rad)})`;
    case "func": return `${n.name}(${toExpr(n.arg)})`;
    case "paren": return `(${toExpr(n.inner)})`;
    default: return "";
  }
}

// Function names whose meaning differs between the app's dialect and math.js.
// The app follows calculator convention: log = base 10, ln = natural. math.js
// uses log = natural, log10 = base 10. (log2 / sqrt / cbrt / trig all match.)
const MATHJS_FN_MAP = {
  ln: "log", log: "log10",
  nCr: "combinations", nPr: "permutations", // multi-arg combinatorics
  logb: "log", // log(x, base): math.js `log` is base-aware with 2 args (single-arg `log` → log10 above)
};

// Translate a flat toExpr() string (app dialect) into a math.js expression:
//   π → pi, log → log10, ln → log; everything else is already compatible
//   (implicit multiplication, ^, !, sqrt(), ans/x as scope vars, e, pi).
//
// `%` is treated as a POSTFIX PERCENT (x% = x/100), the behavior users expect
// from a calculator — NOT math.js's modulo. We rewrite it to `*(1/100)`, which
// attaches to the preceding operand and is safe before a following number
// (the `)` prevents digit-gluing): 50% → 0.5, 200+10% → 200.1, 100*5% → 5.
// (True modulo is exposed separately as mod(a,b) — Phase 4.3.) Edge case: `%`
// binds at multiply precedence, so `50%^2` ≠ `(50%)^2`; unusual, accepted.
export function toMathjs(expr) {
  if (!expr) return "";
  return expr
    .replace(/×/g, "*").replace(/÷/g, "/").replace(/−/g, "-") // normalize pretty glyphs (defense-in-depth)
    .replace(/%/g, "*(1/100)")
    .replace(/π/g, "pi")
    .replace(/[A-Za-z][A-Za-z0-9]*/g, (w) => MATHJS_FN_MAP[w] ?? w);
}

// Find seq by id
export function findSeq(node, id) {
  if (!node) return null;
  if (node.id === id && node.type === "seq") return node;
  switch (node.type) {
    case "seq": for (const c of node.children) { const r = findSeq(c, id); if (r) return r; } return null;
    case "frac": return findSeq(node.num, id) || findSeq(node.den, id);
    case "sup": return findSeq(node.base, id) || findSeq(node.exp, id);
    case "sqrt": return findSeq(node.rad, id);
    case "func": return findSeq(node.arg, id);
    case "paren": return findSeq(node.inner, id);
    default: return null;
  }
}

// Slot (child-seq) names for each structural node type.
const NODE_SLOTS = { frac: ["num", "den"], sup: ["base", "exp"], sqrt: ["rad"], func: ["arg"], paren: ["inner"] };

// Find which seq contains the structural node owning the slot-seq `seqId`.
// Returns { parentSeq, structIdx, structNode, slotName } or null.
// Single traversal: scan a seq's structural children for a direct slot match,
// otherwise recurse into those slots (which are themselves seqs).
export function findParentOf(root, seqId) {
  function search(seq) {
    for (let i = 0; i < seq.children.length; i++) {
      const child = seq.children[i];
      const slots = NODE_SLOTS[child.type];
      if (!slots) continue; // plain char
      for (const slot of slots)
        if (child[slot].id === seqId) return { parentSeq: seq, structIdx: i, structNode: child, slotName: slot };
      for (const slot of slots) {
        const found = search(child[slot]);
        if (found) return found;
      }
    }
    return null;
  }
  if (root.id === seqId) return null; // root has no parent
  return root.type === "seq" ? search(root) : null;
}

// Is this node a char that forms part of a numeric literal (digits / decimal)?
function isNumericChar(node) {
  return node && node.type === "char" && /[0-9.]/.test(node.value);
}
// Is this node a binary/relational operator char (i.e. NOT an operand)?
function isOperatorChar(node) {
  return node && node.type === "char" && "+-*/^%=×÷−".includes(node.value);
}

// Extract the single operand immediately preceding `pos` in `seq`, removing it
// from seq.children. "Operand" mirrors the exponent (sup) logic but is a little
// smarter: a full numeric literal (run of digit/decimal chars), or a single
// structural node (frac/sup/sqrt/func/paren) or constant/variable char. A
// preceding operator (or nothing) yields no operand.
//
// Returns { nodes, start }:
//   nodes — the removed operand nodes in order (empty if none)
//   start — the index where the operand began (= insertion point for callers)
export function extractPrecedingOperand(seq, pos) {
  if (pos <= 0) return { nodes: [], start: pos };
  const prev = seq.children[pos - 1];
  if (isOperatorChar(prev)) return { nodes: [], start: pos };
  let start = pos - 1;
  if (isNumericChar(prev)) {
    while (start > 0 && isNumericChar(seq.children[start - 1])) start--;
  }
  const nodes = seq.children.splice(start, pos - start);
  return { nodes, start };
}
