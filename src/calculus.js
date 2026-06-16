// Numerical derivative & definite integral. Pure (takes a black-box
// f: (x:number) => number|null), so it's directly Node-testable. Returns null
// when f is undefined/non-finite where it's needed (e.g. integrating across a
// singularity) rather than a misleading number.

// f'(a) via the 4th-order 5-point central stencil, with a central-difference
// fallback when the wider stencil hits an undefined point.
export function derivative(f, a, h = 1e-4) {
  const fm2 = f(a - 2 * h), fm1 = f(a - h), fp1 = f(a + h), fp2 = f(a + 2 * h);
  const ok = (v) => v !== null && Number.isFinite(v);
  if (ok(fm2) && ok(fm1) && ok(fp1) && ok(fp2)) {
    return (-fp2 + 8 * fp1 - 8 * fm1 + fm2) / (12 * h);
  }
  if (ok(fp1) && ok(fm1)) return (fp1 - fm1) / (2 * h); // 2nd-order fallback
  return null;
}

// ∫_a^b f(x) dx via composite Simpson's rule (n must be even).
export function integrate(f, a, b, n = 1000) {
  if (!Number.isFinite(a) || !Number.isFinite(b)) return null;
  if (a === b) return 0;
  let lo = a, hi = b, sign = 1;
  if (lo > hi) { [lo, hi] = [hi, lo]; sign = -1; }
  if (n % 2) n += 1;
  const h = (hi - lo) / n;
  let sum = 0;
  for (let i = 0; i <= n; i++) {
    const y = f(lo + i * h);
    if (y === null || !Number.isFinite(y)) return null; // undefined / singularity in range
    const w = i === 0 || i === n ? 1 : i % 2 ? 4 : 2;
    sum += w * y;
  }
  return (sign * sum * h) / 3;
}
