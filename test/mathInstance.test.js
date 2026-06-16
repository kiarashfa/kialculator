// Guards the CURATED math.js instance (src/mathInstance.js): every function the
// keypad/parser can reach must be present, or evaluate() would throw "undefined
// symbol". Uses the installed `mathjs` package via the curated instance; skips
// if mathjs isn't installed (the instance can't be built without it).
import { test } from "node:test";
import assert from "node:assert/strict";
import { createMathEngine } from "../src/mathjsEngine.js";

let math = null, mathFrac = null;
try {
  ({ math, mathFrac } = await import("../src/mathInstance.js"));
} catch {
  /* mathjs not installed in this sandbox */
}
const SKIP = math ? false : "curated instance unavailable (mathjs not installed)";

test("curated instance covers every reachable function (app dialect)", { skip: SKIP }, () => {
  const E = createMathEngine(math);
  const cases = {
    "sin(0)": 0, "cos(0)": 1, "tan(0)": 0, "asin(1)": Math.PI / 2, "acos(1)": 0, "atan(0)": 0,
    "sinh(0)": 0, "cosh(0)": 1, "tanh(0)": 0, "ln(e)": 1, "log(1000)": 3, "log2(8)": 3,
    "sqrt(9)": 3, "cbrt(27)": 3, "abs(-5)": 5, "exp(0)": 1, "5!": 120, "2pi": 2 * Math.PI,
    "2(3)": 6, "-3+5": 2, "50%": 0.5,
  };
  for (const [e, w] of Object.entries(cases)) {
    const g = E.evaluate(e);
    assert.ok(g !== null && Math.abs(g - w) <= 1e-9 * (1 + Math.abs(w)), `${e}: got ${g}, want ${w}`);
  }
});

test("curated instance still supports Complex (sqrt of a negative)", { skip: SKIP }, () => {
  const c = math.evaluate("sqrt(-4)");
  assert.equal(math.typeOf(c), "Complex");
  assert.ok(Math.abs(c.im - 2) < 1e-9);
});

test("curated instance resolves the imaginary unit i (input support)", { skip: SKIP }, () => {
  const E = createMathEngine(math);
  assert.equal(E.evalRich("2+3i").display, "2 + 3i");
  assert.equal(E.evalRich("i").display, "i");
  assert.equal(E.evalRich("i^2").value, -1);
});

test("curated instance registers the multi-arg functions (app dialect)", { skip: SKIP }, () => {
  const E = createMathEngine(math);
  for (const [e, w] of Object.entries({
    "gcd(12,8)": 4, "lcm(4,6)": 12, "min(3,1,2)": 1, "max(3,1,2)": 3,
    "nCr(5,2)": 10, "nPr(5,2)": 20, "mod(10,3)": 1, "logb(8,2)": 3,
    "mean(1,2,3)": 2, "median(1,2,3,4)": 2.5, "std(2,4,6)": 2, "variance(2,4,6)": 4, "sum(1,2,3,4)": 10,
  })) {
    assert.equal(E.evaluate(e), w, `${e} should be ${w}`);
  }
});

// ─── exactFraction (Phase 4.1) ──────────────────────────────────────────────
test("exactFraction returns exact rationals, null otherwise", { skip: SKIP }, () => {
  const E = createMathEngine(math, mathFrac);
  assert.equal(E.exactFraction("1/3+1/6"), "1/2");
  assert.equal(E.exactFraction("0.1+0.2"), "3/10"); // exact, avoids 0.30000000004
  assert.equal(E.exactFraction("7/3"), "7/3");
  assert.equal(E.exactFraction("-1/2"), "-1/2");
  assert.equal(E.exactFraction("2.5"), "5/2");
  // null for whole numbers and irrationals
  assert.equal(E.exactFraction("6/3"), null); // = 2
  assert.equal(E.exactFraction("1/3*3"), null); // = 1
  assert.equal(E.exactFraction("2"), null);
  assert.equal(E.exactFraction("sqrt(2)"), null);
  assert.equal(E.exactFraction("pi/4"), null);
});

test("exactFraction agrees with the decimal value", { skip: SKIP }, () => {
  const E = createMathEngine(math, mathFrac);
  const f = E.exactFraction("1/3+1/6"); // "1/2"
  const [n, d] = f.split("/").map(Number);
  assert.ok(Math.abs(n / d - E.evaluate("1/3+1/6")) < 1e-12);
});
