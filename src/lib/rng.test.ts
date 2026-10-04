import assert from "node:assert/strict";
import test from "node:test";
import { mulberry32 } from "./rng.ts";

test("the same seed yields the same sequence", () => {
  const a = mulberry32(12345);
  const b = mulberry32(12345);
  const seqA = Array.from({ length: 200 }, () => a());
  const seqB = Array.from({ length: 200 }, () => b());
  assert.deepEqual(seqA, seqB);
});

test("different seeds diverge", () => {
  const a = mulberry32(1);
  const b = mulberry32(2);
  const seqA = Array.from({ length: 20 }, () => a());
  const seqB = Array.from({ length: 20 }, () => b());
  assert.notDeepEqual(seqA, seqB);
});

test("values stay in [0, 1)", () => {
  const r = mulberry32(20261003);
  for (let i = 0; i < 5000; i += 1) {
    const v = r();
    assert.ok(v >= 0 && v < 1, `out of range: ${v}`);
  }
});
