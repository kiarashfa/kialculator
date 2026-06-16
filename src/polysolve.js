// ─── Polynomial solver ──────────────────────────────────────────────────────
// Pure, dependency-free (no math.js / React) so it is directly Node-testable.
//
// Strategy for `solve`:
//   1. Numerically recover the polynomial's coefficients from a black-box f(x)
//      via Newton divided differences over Chebyshev nodes, then VERIFY by
//      reconstruction — this both extracts coefficients and rejects anything
//      that isn't a real polynomial (sin, e^x, 1/x, …) so the caller can fall
//      back to a general root-finder.
//   2. Find ALL roots (real + complex, with multiplicity) of the coefficient
//      vector via the Durand–Kerner (Weierstrass) iteration + clustering.
//
// This replaces the old fixed-seed Newton solver, which silently dropped roots.

// ── minimal complex arithmetic ──────────────────────────────────────────────
const cadd = (a, b) => ({ re: a.re + b.re, im: a.im + b.im });
const csub = (a, b) => ({ re: a.re - b.re, im: a.im - b.im });
const cmul = (a, b) => ({ re: a.re * b.re - a.im * b.im, im: a.re * b.im + a.im * b.re });
const cdiv = (a, b) => {
  const d = b.re * b.re + b.im * b.im;
  return { re: (a.re * b.re + a.im * b.im) / d, im: (a.im * b.re - a.re * b.im) / d };
};
const cabs = (a) => Math.hypot(a.re, a.im);

// ── coefficient extraction ──────────────────────────────────────────────────
// f: (x:number) => number|null.  Returns ascending coeffs [c0,c1,…,cd], or null
// if f is not well-approximated by a real polynomial of degree ≤ maxDeg.
export function extractPolyCoeffs(f, { maxDeg = 10, R = 4, tol = 1e-6 } = {}) {
  const N = maxDeg + 1;
  const xs = [], ys = [];
  for (let k = 0; k < N; k++) {
    const x = R * Math.cos(((k + 0.5) * Math.PI) / N); // Chebyshev nodes (distinct, well-conditioned)
    const y = f(x);
    if (y === null || y === undefined || !isFinite(y)) return null;
    xs.push(x); ys.push(y);
  }
  // Newton divided differences → Newton-form coefficients a[]
  const a = ys.slice();
  for (let j = 1; j < N; j++)
    for (let i = N - 1; i >= j; i--)
      a[i] = (a[i] - a[i - 1]) / (xs[i] - xs[i - j]);
  // Newton form → monomial coefficients
  let poly = [a[0]];
  let prod = [1];
  for (let k = 1; k < N; k++) {
    const np = new Array(prod.length + 1).fill(0);
    for (let i = 0; i < prod.length; i++) { np[i] += -xs[k - 1] * prod[i]; np[i + 1] += prod[i]; }
    prod = np;
    for (let i = 0; i < prod.length; i++) poly[i] = (poly[i] || 0) + a[k] * prod[i];
  }
  // drop high-degree ~0 coefficients
  const maxC = Math.max(...poly.map(Math.abs), 1);
  while (poly.length > 1 && Math.abs(poly[poly.length - 1]) <= tol * maxC) poly.pop();
  // verify: a genuine polynomial reconstructs exactly at fresh points
  const horner = (c, x) => c.reduceRight((acc, ci) => acc * x + ci, 0);
  for (let t = 0; t < 6; t++) {
    const x = (((t + 0.5) / 6) * 2 - 1) * R * 1.3; // spread test points beyond the node range
    const got = f(x);
    if (got === null || got === undefined || !isFinite(got)) return null;
    const want = horner(poly, x);
    if (Math.abs(got - want) > 1e-4 * (1 + Math.abs(got) + Math.abs(want))) return null;
  }
  // snap coefficients to nearby integers (cosmetic; keeps results clean).
  // `+ 0` normalizes -0 → 0 so downstream equality/printing is clean.
  return poly.map((c) => (Math.abs(c - Math.round(c)) < 1e-6 ? Math.round(c) + 0 : c));
}

// ── root finding ────────────────────────────────────────────────────────────
// Durand–Kerner: find all n complex roots of a degree-n polynomial at once.
function durandKerner(coeffs) {
  const n = coeffs.length - 1;
  const cn = coeffs[n];
  const a = coeffs.map((c) => c / cn); // monic, ascending; a[n] = 1
  const p = (z) => {
    let r = { re: a[n], im: 0 };
    for (let i = n - 1; i >= 0; i--) r = cadd(cmul(r, z), { re: a[i], im: 0 });
    return r;
  };
  const seed = { re: 0.4, im: 0.9 }; // complex, non-root, breaks symmetry
  const roots = [];
  for (let k = 0; k < n; k++) {
    let zk = { re: 1, im: 0 };
    for (let j = 0; j < k; j++) zk = cmul(zk, seed);
    roots.push(zk);
  }
  for (let iter = 0; iter < 500; iter++) {
    let maxDelta = 0;
    for (let k = 0; k < n; k++) {
      let denom = { re: 1, im: 0 };
      for (let j = 0; j < n; j++) if (j !== k) denom = cmul(denom, csub(roots[k], roots[j]));
      const delta = cdiv(p(roots[k]), denom);
      roots[k] = csub(roots[k], delta);
      maxDelta = Math.max(maxDelta, cabs(delta));
    }
    if (maxDelta < 1e-14) break;
  }
  return roots;
}

// Merge roots that coincide → distinct roots with multiplicity.
function clusterRoots(roots) {
  const used = new Array(roots.length).fill(false);
  const out = [];
  for (let i = 0; i < roots.length; i++) {
    if (used[i]) continue;
    let sumRe = roots[i].re, sumIm = roots[i].im, mult = 1;
    used[i] = true;
    for (let j = i + 1; j < roots.length; j++) {
      if (used[j]) continue;
      const dist = Math.hypot(roots[i].re - roots[j].re, roots[i].im - roots[j].im);
      if (dist < 1e-3 * (1 + cabs(roots[i]))) { used[j] = true; sumRe += roots[j].re; sumIm += roots[j].im; mult++; }
    }
    out.push({ re: sumRe / mult, im: sumIm / mult, mult });
  }
  return out;
}

// Given real coefficients [c0..cd], classify the solution set of poly = 0.
// Returns { kind: "roots"|"none"|"all", roots: [{re,im,mult}] }.
export function solvePolyCoeffs(coeffs) {
  let c = coeffs.slice();
  const maxC = Math.max(...c.map(Math.abs), 1);
  while (c.length > 1 && Math.abs(c[c.length - 1]) <= 1e-9 * maxC) c.pop(); // trim leading zeros
  const deg = c.length - 1;
  if (deg <= 0) {
    return Math.abs(c[0]) <= 1e-9 * maxC ? { kind: "all", roots: [] } : { kind: "none", roots: [] };
  }
  const roots = clusterRoots(durandKerner(c));
  // order: real roots ascending first, then complex by (re, im)
  roots.sort((p, q) => {
    const pr = Math.abs(p.im) < 1e-7, qr = Math.abs(q.im) < 1e-7;
    if (pr !== qr) return pr ? -1 : 1;
    return p.re - q.re || p.im - q.im;
  });
  return { kind: "roots", roots };
}

// ── general (non-polynomial) root finding ───────────────────────────────────
// Refine a sign-change bracket [a,b] (f(a)·f(b) < 0) to a root via bisection.
function bisect(f, a, b, tol) {
  let fa = f(a);
  if (fa === null || !isFinite(fa)) return null;
  for (let i = 0; i < 80; i++) {
    const m = 0.5 * (a + b);
    const fm = f(m);
    if (fm === null || !isFinite(fm)) return null;
    if (fm === 0 || 0.5 * (b - a) < tol) return m;
    if (fa < 0 === fm < 0) { a = m; fa = fm; } else { b = m; }
  }
  return 0.5 * (a + b);
}

// Root finder for non-polynomial equations: scan [xMin,xMax] for sign changes,
// bracket each crossing, and refine. Each candidate is verified (|f(root)| tiny)
// so discontinuities/asymptotes (tan, 1/x, …) don't masquerade as roots. Only
// finds roots WITHIN the scanned window — the caller must surface that caveat.
// f: (x:number) => number|null.
export function bracketRoots(f, { xMin = -100, xMax = 100, samples = 8000, tol = 1e-10 } = {}) {
  const dx = (xMax - xMin) / samples;
  const found = [];
  let prevX = xMin, prevY = f(xMin);
  for (let i = 1; i <= samples; i++) {
    const x = xMin + i * dx;
    const y = f(x);
    if (prevY !== null && y !== null && isFinite(prevY) && isFinite(y) && prevY * y < 0) {
      const r = bisect(f, prevX, x, tol);
      if (r !== null) {
        const fr = f(r);
        if (fr !== null && isFinite(fr) && Math.abs(fr) < 1e-6) found.push(r);
      }
    }
    prevX = x; prevY = y;
  }
  found.sort((a, b) => a - b);
  const out = [];
  for (const r of found) if (!out.length || Math.abs(r - out[out.length - 1]) > 1e-6) out.push(r);
  return out;
}

// Heuristic: are these roots (nearly) evenly spaced → a periodic / infinite
// solution set (e.g. cos(x)=0)? Uses the coefficient of variation of the gaps.
export function looksPeriodic(roots, cvTol = 0.04) {
  if (roots.length < 5) return false;
  const diffs = [];
  for (let i = 1; i < roots.length; i++) diffs.push(roots[i] - roots[i - 1]);
  const mean = diffs.reduce((a, b) => a + b, 0) / diffs.length;
  if (mean <= 1e-9) return false;
  const variance = diffs.reduce((a, d) => a + (d - mean) ** 2, 0) / diffs.length;
  return Math.sqrt(variance) / mean < cvTol;
}

// ── formatting ──────────────────────────────────────────────────────────────
function numStr(v) {
  if (Math.abs(v) < 1e-12) return "0";
  const rnd = Math.round(v);
  if (Math.abs(v - rnd) < 1e-9 * (1 + Math.abs(v))) return String(rnd);
  return String(+v.toFixed(6));
}

export function formatRoot(r) {
  const re = r.re, im = r.im;
  let s;
  if (Math.abs(im) < 1e-7 * (1 + Math.abs(re))) {
    s = numStr(re);
  } else if (Math.abs(re) < 1e-7 * (1 + Math.abs(im))) {
    const mag = numStr(Math.abs(im));
    s = `${im < 0 ? "-" : ""}${mag === "1" ? "" : mag}i`;
  } else {
    const mag = numStr(Math.abs(im));
    s = `${numStr(re)} ${im < 0 ? "-" : "+"} ${mag === "1" ? "" : mag}i`;
  }
  return r.mult > 1 ? `${s} (×${r.mult})` : s;
}
