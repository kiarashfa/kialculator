// Pure polynomial-solver tests (no math.js / React).
import { test } from "node:test";
import assert from "node:assert/strict";
import { extractPolyCoeffs, solvePolyCoeffs, formatRoot, bracketRoots, looksPeriodic } from "../src/polysolve.js";

const rootStr = (coeffs) => solvePolyCoeffs(coeffs).roots.map(formatRoot).join(", ");

// ─── coefficient extraction ─────────────────────────────────────────────────
test("recovers coefficients of a black-box polynomial", () => {
  assert.deepEqual(extractPolyCoeffs((x) => x * x - 4), [-4, 0, 1]);
  assert.deepEqual(extractPolyCoeffs((x) => 2 * x * x + 3 * x + 1), [1, 3, 2]);
  assert.deepEqual(
    extractPolyCoeffs((x) => (x - 1) * (x - 2) * (x - 3) * (x - 4) * (x - 5)),
    [-120, 274, -225, 85, -15, 1],
  );
});

test("rejects non-polynomials (→ null, so caller can fall back)", () => {
  assert.equal(extractPolyCoeffs(Math.sin), null);
  assert.equal(extractPolyCoeffs((x) => Math.exp(x)), null);
  assert.equal(extractPolyCoeffs((x) => 1 / x), null);
  assert.equal(extractPolyCoeffs((x) => Math.abs(x)), null);
});

// ─── root finding — the audit's verified failures ───────────────────────────
test("degree 5: finds ALL roots (the (x-1)…(x-5)=0 case that dropped 3 and 4)", () => {
  assert.equal(rootStr([-120, 274, -225, 85, -15, 1]), "1, 2, 3, 4, 5");
});

test("complex roots: x²+1 → ±i", () => {
  assert.equal(rootStr([1, 0, 1]), "-i, i");
});

test("cubic with complex roots: x³-1 → 1 and two complex", () => {
  const r = solvePolyCoeffs([-1, 0, 0, 1]).roots;
  assert.equal(r.length, 3);
  assert.equal(formatRoot(r[0]), "1"); // real root first
  assert.ok(r.slice(1).every((x) => Math.abs(x.im) > 0.1)); // other two are complex
});

test("multiplicity is preserved: (x-1)² → 1 (×2), (x-1)³ → 1 (×3)", () => {
  assert.equal(rootStr([1, -2, 1]), "1 (×2)");
  assert.equal(rootStr([-1, 3, -3, 1]), "1 (×3)");
});

test("real quadratic: x²-4 → -2, 2 (ascending)", () => {
  assert.equal(rootStr([-4, 0, 1]), "-2, 2");
});

test("degenerate cases: 0=0 → all, 5=0 → none", () => {
  assert.equal(solvePolyCoeffs([0]).kind, "all");
  assert.equal(solvePolyCoeffs([5]).kind, "none");
  assert.equal(solvePolyCoeffs([0, 1]).roots[0].re, 0); // x = 0
});

// ─── bracketRoots: general fallback root finder (Phase 2.3) ─────────────────
test("bracketRoots finds the root of a transcendental equation", () => {
  const r = bracketRoots((x) => Math.exp(x) - 5, { xMin: -20, xMax: 20 });
  assert.equal(r.length, 1);
  assert.ok(Math.abs(r[0] - Math.log(5)) < 1e-6);
});

test("bracketRoots finds the evenly-spaced zeros of cos", () => {
  const r = bracketRoots(Math.cos, { xMin: -10, xMax: 10 });
  // zeros at ±π/2, ±3π/2, ±5π/2  → 6 of them in [-10,10]
  assert.equal(r.length, 6);
  assert.ok(Math.abs(r.find((x) => x > 0 && x < 2) - Math.PI / 2) < 1e-6);
});

test("bracketRoots rejects asymptotes (no false root at a pole)", () => {
  // 1/(x-0.123) has a pole, not a root, inside the window
  assert.deepEqual(bracketRoots((x) => 1 / (x - 0.123), { xMin: -5, xMax: 5 }), []);
});

test("looksPeriodic detects uniform spacing, rejects irregular/sparse", () => {
  assert.equal(looksPeriodic([-4.712, -1.571, 1.571, 4.712, 7.854]), true);
  assert.equal(looksPeriodic([1.6]), false);
  assert.equal(looksPeriodic([1, 2, 5, 11, 23]), false);
});

// ─── formatting ─────────────────────────────────────────────────────────────
test("formatRoot renders real, imaginary, complex, and multiplicity", () => {
  assert.equal(formatRoot({ re: 2, im: 0, mult: 1 }), "2");
  assert.equal(formatRoot({ re: -2, im: 0, mult: 1 }), "-2");
  assert.equal(formatRoot({ re: 0, im: 1, mult: 1 }), "i");
  assert.equal(formatRoot({ re: 0, im: -1, mult: 1 }), "-i");
  assert.equal(formatRoot({ re: 0, im: 2, mult: 1 }), "2i");
  assert.equal(formatRoot({ re: 3, im: -4, mult: 1 }), "3 - 4i");
  assert.equal(formatRoot({ re: 1, im: 0, mult: 2 }), "1 (×2)");
});
