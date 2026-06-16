// Pure numerical calculus tests (no math.js / DOM).
import { test } from "node:test";
import assert from "node:assert/strict";
import { derivative, integrate } from "../src/calculus.js";

const near = (a, b, eps = 1e-6) => assert.ok(Math.abs(a - b) <= eps, `${a} ≈ ${b}`);

test("derivative matches known analytic values", () => {
  near(derivative((x) => x * x, 3), 6);            // d/dx x² = 2x → 6
  near(derivative((x) => x ** 3, 2), 12);          // 3x² → 12
  near(derivative(Math.sin, 0), 1);                // cos(0) = 1
  near(derivative(Math.exp, 0), 1);                // e⁰ = 1
  near(derivative((x) => 1 / x, 2), -0.25);        // -1/x² → -0.25
});

test("derivative returns null where f is undefined", () => {
  assert.equal(derivative(() => null, 0), null);
});

test("integrate matches known definite integrals", () => {
  near(integrate((x) => x * x, 0, 1), 1 / 3);      // ∫₀¹ x² = 1/3
  near(integrate((x) => x, 0, 2), 2);              // ∫₀² x = 2
  near(integrate(Math.sin, 0, Math.PI), 2);        // ∫₀^π sin = 2
  near(integrate((x) => 2 * x, 0, 3), 9);          // ∫₀³ 2x = 9
});

test("integrate handles reversed and empty bounds", () => {
  near(integrate((x) => x, 2, 0), -2);             // reversed → negated
  assert.equal(integrate((x) => x, 5, 5), 0);      // a == b → 0
});

test("integrate returns null across a singularity", () => {
  assert.equal(integrate((x) => 1 / x, 0, 1), null); // f(0) = ∞
});
