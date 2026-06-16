// Pure base-conversion tests (BigInt, no math.js / DOM).
import { test } from "node:test";
import assert from "node:assert/strict";
import { parseInBase, formatBases } from "../src/baseConvert.js";

test("parseInBase reads each base", () => {
  assert.equal(parseInBase("255", 10), 255n);
  assert.equal(parseInBase("FF", 16), 255n);
  assert.equal(parseInBase("ff", 16), 255n); // case-insensitive
  assert.equal(parseInBase("11111111", 2), 255n);
  assert.equal(parseInBase("377", 8), 255n);
});

test("parseInBase tolerates 0x/0b/0o prefixes and signs/spaces", () => {
  assert.equal(parseInBase("0xFF", 16), 255n);
  assert.equal(parseInBase("0b1010", 2), 10n);
  assert.equal(parseInBase("0o17", 8), 15n);
  assert.equal(parseInBase("-FF", 16), -255n);
  assert.equal(parseInBase(" 1 0 ", 2), 2n);
});

test("parseInBase rejects digits invalid for the base", () => {
  assert.equal(parseInBase("8", 8), null); // 8 invalid in octal
  assert.equal(parseInBase("2", 2), null);
  assert.equal(parseInBase("G", 16), null);
  assert.equal(parseInBase("", 10), null);
  assert.equal(parseInBase("-", 10), null);
});

test("formatBases renders all four bases (HEX upper-cased)", () => {
  assert.deepEqual(formatBases(255n), { dec: "255", hex: "FF", bin: "11111111", oct: "377" });
  assert.deepEqual(formatBases(0n), { dec: "0", hex: "0", bin: "0", oct: "0" });
  assert.deepEqual(formatBases(-10n), { dec: "-10", hex: "-A", bin: "-1010", oct: "-12" });
});

test("arbitrary precision: no loss beyond 2^53", () => {
  const big = parseInBase("FFFFFFFFFFFFFFFF", 16); // 2^64 - 1
  assert.equal(big, 18446744073709551615n);
  assert.equal(formatBases(big).dec, "18446744073709551615");
});
