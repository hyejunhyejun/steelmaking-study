import { test } from "node:test";
import assert from "node:assert/strict";
import { saveProgress, loadProgress } from "../js/storage.js";

function fakeStore() {
  const m = new Map();
  return { getItem: (k) => (m.has(k) ? m.get(k) : null), setItem: (k, v) => m.set(k, v) };
}

test("저장 후 로드하면 동일 상태", () => {
  const s = fakeStore();
  saveProgress(s, "21-1", { index: 3, marks: { 1: true } });
  assert.deepEqual(loadProgress(s, "21-1"), { index: 3, marks: { 1: true } });
});

test("없는 회차는 null", () => {
  assert.equal(loadProgress(fakeStore(), "없음"), null);
});
