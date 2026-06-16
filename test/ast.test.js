// Node-native tests for the pure structural AST (no React/DOM).
import { test } from "node:test";
import assert from "node:assert/strict";
import { mkSeq, mkChar, mkFrac, mkSqrt, toExpr, extractPrecedingOperand, toMathjs, findParentOf } from "../src/mathAst.js";

const chars = (s) => s.split("").map(mkChar);
const valStr = (nodes) => nodes.map((n) => n.value).join("");

// ─── extractPrecedingOperand (the new operand-grabbing helper) ──────────────
test("grabs a single digit", () => {
  const seq = mkSeq(chars("5"));
  const { nodes, start } = extractPrecedingOperand(seq, 1);
  assert.equal(valStr(nodes), "5");
  assert.equal(start, 0);
  assert.equal(seq.children.length, 0); // removed from the seq
});

test("grabs a full multi-digit number, not just the last digit", () => {
  const seq = mkSeq(chars("12"));
  const { nodes, start } = extractPrecedingOperand(seq, 2);
  assert.equal(valStr(nodes), "12");
  assert.equal(start, 0);
});

test("stops at a preceding operator (grabs only the operand)", () => {
  const seq = mkSeq(chars("2+3"));
  const { nodes, start } = extractPrecedingOperand(seq, 3);
  assert.equal(valStr(nodes), "3");
  assert.equal(start, 2);
  assert.equal(valStr(seq.children), "2+"); // operand removed, rest intact
});

test("no operand when the preceding char is an operator", () => {
  const seq = mkSeq(chars("2+"));
  const { nodes, start } = extractPrecedingOperand(seq, 2);
  assert.equal(nodes.length, 0);
  assert.equal(start, 2);
  assert.equal(seq.children.length, 2); // untouched
});

test("no operand at the start of an empty seq", () => {
  const seq = mkSeq([]);
  const { nodes, start } = extractPrecedingOperand(seq, 0);
  assert.equal(nodes.length, 0);
  assert.equal(start, 0);
});

test("a single structural node is grabbed whole", () => {
  const frac = mkFrac(mkSeq(chars("1")), mkSeq(chars("2")));
  const seq = mkSeq([frac]);
  const { nodes, start } = extractPrecedingOperand(seq, 1);
  assert.equal(nodes.length, 1);
  assert.equal(nodes[0], frac);
  assert.equal(start, 0);
});

// ─── Reciprocal (1/x) semantics — mirrors insertReciprocal's core transform ──
function reciprocalExpr(seqChars, pos) {
  const seq = mkSeq(seqChars);
  const { nodes, start } = extractPrecedingOperand(seq, pos);
  const frac = mkFrac(mkSeq([mkChar("1")]), mkSeq(nodes));
  seq.children.splice(start, 0, frac);
  return toExpr(seq);
}

// (toExpr STRING shape is asserted here; numeric evaluation of these strings is
// covered in mathjs-engine.test.js "fraction/reciprocal toExpr strings …".)
test("1/x of 5 → ((1)/(5)), not 5/1", () => {
  assert.equal(reciprocalExpr(chars("5"), 1), "((1)/(5))");
});

test("1/x of 12 → ((1)/(12))", () => {
  assert.equal(reciprocalExpr(chars("12"), 2), "((1)/(12))");
});

test("1/x grabs only the operand: 2+3 → 2+((1)/(3))", () => {
  assert.equal(reciprocalExpr(chars("2+3"), 3), "2+((1)/(3))");
});

test("1/x with nothing preceding → empty denominator ((1)/())", () => {
  assert.equal(reciprocalExpr([], 0), "((1)/())");
});

// ─── Fraction (÷) insertion — mirrors insertStructural("frac")'s core transform ─
// Denominator filled with a literal for a concrete string; the app leaves it empty.
function fracExpr(seqChars, pos, den) {
  const seq = mkSeq(seqChars);
  const { nodes, start } = extractPrecedingOperand(seq, pos);
  const frac = mkFrac(mkSeq(nodes), mkSeq(chars(den)));
  seq.children.splice(start, 0, frac);
  return toExpr(seq);
}

test("÷ after 1+2 grabs only the 2 → 1+((2)/(4)), not (1+2)/4 (audit #4)", () => {
  assert.equal(fracExpr(chars("1+2"), 3, "4"), "1+((2)/(4))");
});

test("÷ after a full number grabs the whole number → ((12)/(4))", () => {
  assert.equal(fracExpr(chars("12"), 2, "4"), "((12)/(4))");
});

// ─── findParentOf (simplified single-traversal version) ─────────────────────
test("findParentOf locates the structural owner of a slot-seq", () => {
  const den = mkSeq(chars("3"));
  const frac = mkFrac(mkSeq(chars("2")), den);
  const root = mkSeq([mkChar("1"), mkChar("+"), frac]);
  const info = findParentOf(root, den.id);
  assert.equal(info.parentSeq, root);
  assert.equal(info.structIdx, 2);
  assert.equal(info.structNode, frac);
  assert.equal(info.slotName, "den");
  assert.equal(findParentOf(root, root.id), null); // root has no parent
});

test("findParentOf works for deeply nested slot-seqs", () => {
  const inner = mkSeq(chars("9")); // sqrt radicand, nested inside a fraction denominator
  const sq = mkSqrt(inner);
  const den = mkSeq([sq]);
  const frac = mkFrac(mkSeq(chars("1")), den);
  const root = mkSeq([frac]);
  const info = findParentOf(root, inner.id);
  assert.equal(info.structNode, sq);
  assert.equal(info.slotName, "rad");
  assert.equal(info.parentSeq, den);
  assert.equal(info.structIdx, 0);
});

// ─── toMathjs: app dialect → math.js syntax (pure, no math.js needed) ───────
test("toMathjs maps π → pi", () => {
  assert.equal(toMathjs("2π"), "2pi");
  assert.equal(toMathjs("π"), "pi");
});

test("toMathjs maps log → log10 and ln → log (calculator convention)", () => {
  assert.equal(toMathjs("log(1000)"), "log10(1000)");
  assert.equal(toMathjs("ln(e)"), "log(e)");
});

test("toMathjs leaves log2 / log10 / sqrt / trig untouched", () => {
  assert.equal(toMathjs("log2(8)"), "log2(8)");
  assert.equal(toMathjs("log10(100)"), "log10(100)");
  assert.equal(toMathjs("sqrt(9)"), "sqrt(9)");
  assert.equal(toMathjs("sin(x)+cos(x)"), "sin(x)+cos(x)");
});

test("toMathjs preserves implicit multiplication and ans/x/e", () => {
  assert.equal(toMathjs("2x"), "2x");
  assert.equal(toMathjs("ans+1"), "ans+1");
  assert.equal(toMathjs("2e"), "2e"); // e stays (math.js constant)
});

test("toMathjs treats % as postfix percent (÷100), not modulo", () => {
  assert.equal(toMathjs("50%"), "50*(1/100)");
  assert.equal(toMathjs("200+10%"), "200+10*(1/100)");
});

test("toMathjs passes the imaginary unit i through unchanged", () => {
  assert.equal(toMathjs("2+3i"), "2+3i");
  assert.equal(toMathjs("i"), "i");
});

test("toMathjs maps multi-arg function names and keeps commas", () => {
  assert.equal(toMathjs("nCr(5,2)"), "combinations(5,2)");
  assert.equal(toMathjs("nPr(5,2)"), "permutations(5,2)");
  assert.equal(toMathjs("logb(8,2)"), "log(8,2)"); // 2-arg log = base-aware
  assert.equal(toMathjs("gcd(12,8)"), "gcd(12,8)"); // native, unchanged
  assert.equal(toMathjs("mod(10,3)"), "mod(10,3)");
});
