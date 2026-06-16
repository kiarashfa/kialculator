// Integer base conversion (DEC / HEX / BIN / OCT). Pure + BigInt-based, so it
// handles arbitrarily large integers with no precision loss and is directly
// Node-testable. No math.js dependency.

// Parse a string written in `base` (2/8/10/16) into a BigInt, or null if the
// string contains a digit invalid for that base.
export function parseInBase(str, base) {
  if (typeof str !== "string") return null;
  let s = str.trim().replace(/\s+/g, "");
  let neg = false;
  if (s[0] === "-") { neg = true; s = s.slice(1); }
  if (s[0] === "+") s = s.slice(1);
  // tolerate conventional prefixes (0x / 0b / 0o) when they match the base
  if ((base === 16 && /^0x/i.test(s)) || (base === 2 && /^0b/i.test(s)) || (base === 8 && /^0o/i.test(s))) s = s.slice(2);
  if (!s.length) return null;
  const B = BigInt(base);
  let n = 0n;
  for (const ch of s) {
    const d = parseInt(ch, base); // NaN if ch isn't a valid digit in this base
    if (Number.isNaN(d)) return null;
    n = n * B + BigInt(d);
  }
  return neg ? -n : n;
}

// Format a BigInt in all four bases (digits only; HEX upper-cased).
export function formatBases(n) {
  const neg = n < 0n;
  const a = neg ? -n : n;
  const sign = neg ? "-" : "";
  return {
    dec: sign + a.toString(10),
    hex: sign + a.toString(16).toUpperCase(),
    bin: sign + a.toString(2),
    oct: sign + a.toString(8),
  };
}
