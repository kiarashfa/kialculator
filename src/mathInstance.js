// Curated math.js instance: include only the functions handyCalc can actually
// produce (keypad buttons + parser), so the bundler tree-shakes everything else
// (units, simplify, derivative, matrices, BigNumber, statistics, …). The full
// `import * as mathjs` pulls the entire library; this keeps `evaluate` / `compile`
// / `typeOf` fully working for every reachable expression. Injected into
// createMathEngine() in HandyCalc.jsx. Verified against the full expression set.
import {
  create,
  evaluateDependencies, compileDependencies, typeOfDependencies,
  addDependencies, subtractDependencies, multiplyDependencies, divideDependencies,
  powDependencies, unaryMinusDependencies, unaryPlusDependencies, factorialDependencies,
  sqrtDependencies, cbrtDependencies, absDependencies, expDependencies,
  logDependencies, log10Dependencies, log2Dependencies,
  sinDependencies, cosDependencies, tanDependencies,
  asinDependencies, acosDependencies, atanDependencies,
  sinhDependencies, coshDependencies, tanhDependencies,
  ceilDependencies, floorDependencies, roundDependencies,
  complexDependencies, iDependencies, piDependencies, eDependencies,
  fractionDependencies,
  gcdDependencies, lcmDependencies, minDependencies, maxDependencies,
  combinationsDependencies, permutationsDependencies, modDependencies,
  meanDependencies, medianDependencies, stdDependencies, varianceDependencies, sumDependencies,
} from "mathjs";

export const math = create(
  {
    ...evaluateDependencies, ...compileDependencies, ...typeOfDependencies,
    ...addDependencies, ...subtractDependencies, ...multiplyDependencies, ...divideDependencies,
    ...powDependencies, ...unaryMinusDependencies, ...unaryPlusDependencies, ...factorialDependencies,
    ...sqrtDependencies, ...cbrtDependencies, ...absDependencies, ...expDependencies,
    ...logDependencies, ...log10Dependencies, ...log2Dependencies,
    ...sinDependencies, ...cosDependencies, ...tanDependencies,
    ...asinDependencies, ...acosDependencies, ...atanDependencies,
    ...sinhDependencies, ...coshDependencies, ...tanhDependencies,
    ...ceilDependencies, ...floorDependencies, ...roundDependencies,
    ...complexDependencies, ...iDependencies, ...piDependencies, ...eDependencies,
    ...gcdDependencies, ...lcmDependencies, ...minDependencies, ...maxDependencies,
    ...combinationsDependencies, ...permutationsDependencies, ...modDependencies,
    ...meanDependencies, ...medianDependencies, ...stdDependencies, ...varianceDependencies, ...sumDependencies,
  },
  { number: "number" },
);

// Minimal Fraction-mode instance for EXACT rational results (1/3+1/6 → 1/2,
// 0.1+0.2 → 3/10). Only rational operators are registered — expressions with
// irrational functions (sqrt(2), sin, pi, …) throw here, which the engine
// catches and falls back to the decimal value. Used only by exactFraction().
export const mathFrac = create(
  {
    ...evaluateDependencies, ...typeOfDependencies, ...fractionDependencies,
    ...addDependencies, ...subtractDependencies, ...multiplyDependencies, ...divideDependencies,
    ...powDependencies, ...unaryMinusDependencies, ...unaryPlusDependencies,
  },
  { number: "Fraction" },
);
