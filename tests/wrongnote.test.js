import { test } from "node:test";
import assert from "node:assert/strict";
import { addWrong, removeWrong, listWrong, clearWrong } from "../js/wrongnote.js";

function fakeStore() {
  const m = new Map();
  return {
    getItem: (k) => (m.has(k) ? m.get(k) : null),
    setItem: (k, v) => m.set(k, v),
    removeItem: (k) => m.delete(k),
  };
}

test("틀린 문제를 추가하면 목록에 쌓인다", () => {
  const s = fakeStore();
  addWrong(s, "21-1-4");
  addWrong(s, "21-1-9");
  assert.deepEqual(listWrong(s), ["21-1-4", "21-1-9"]);
});

test("같은 문제를 두 번 추가해도 하나만 남는다", () => {
  const s = fakeStore();
  addWrong(s, "21-1-4");
  addWrong(s, "21-1-4");
  assert.deepEqual(listWrong(s), ["21-1-4"]);
});

test("맞힌 문제는 목록에서 빠진다", () => {
  const s = fakeStore();
  addWrong(s, "21-1-4");
  addWrong(s, "21-1-9");
  removeWrong(s, "21-1-4");
  assert.deepEqual(listWrong(s), ["21-1-9"]);
});

test("없는 문제를 제거해도 오류가 없다", () => {
  const s = fakeStore();
  removeWrong(s, "없음");
  assert.deepEqual(listWrong(s), []);
});

test("초기화하면 전부 비워진다", () => {
  const s = fakeStore();
  addWrong(s, "a");
  addWrong(s, "b");
  clearWrong(s);
  assert.deepEqual(listWrong(s), []);
});

test("저장된 값이 없으면 빈 배열", () => {
  assert.deepEqual(listWrong(fakeStore()), []);
});
