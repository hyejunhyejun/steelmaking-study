import { test } from "node:test";
import assert from "node:assert/strict";
import { addWrong, removeWrong, listWrong, clearWrong, mergeWrong, parseWrongCode,
         bumpWrong, countOf, mergeCounts } from "../js/wrongnote.js";

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

test("코드로 가져오면 기존 것과 합쳐진다(덮어쓰지 않음)", () => {
  const s = fakeStore();
  addWrong(s, "21-1-4");
  mergeWrong(s, ["21-1-4", "t12-58"]);
  assert.deepEqual(listWrong(s), ["21-1-4", "t12-58"]);
});

test("링크·쉼표·공백 어떤 형태로 붙여넣어도 읽는다", () => {
  assert.deepEqual(parseWrongCode("https://x.io/a/#w=21-1-4,t12-58"), ["21-1-4", "t12-58"]);
  assert.deepEqual(parseWrongCode(" 21-1-4  t12-58 "), ["21-1-4", "t12-58"]);
});

test("내가 지운 문제는 링크로 다시 들어와도 되살아나지 않는다", () => {
  const s = fakeStore();
  addWrong(s, "21-1-1");
  removeWrong(s, "21-1-1");
  mergeWrong(s, ["21-1-1", "21-1-2"]);   // 예전 링크를 다시 열었을 때
  assert.deepEqual(listWrong(s), ["21-1-2"]);
});

test("누를 때마다 틀린 횟수가 1씩 올라간다", () => {
  const s = fakeStore();
  assert.equal(bumpWrong(s, "21-1-4"), 1);
  assert.equal(bumpWrong(s, "21-1-4"), 2);
  assert.equal(bumpWrong(s, "21-1-4"), 3);
  assert.deepEqual(listWrong(s), ["21-1-4"]);   // 목록엔 하나만
});

test("수동으로 담은 문제는 1회로 잡힌다", () => {
  const s = fakeStore();
  addWrong(s, "21-1-4");
  assert.equal(countOf(s, "21-1-4"), 1);
});

test("빼면 횟수도 사라진다", () => {
  const s = fakeStore();
  bumpWrong(s, "21-1-4"); bumpWrong(s, "21-1-4");
  removeWrong(s, "21-1-4");
  assert.equal(countOf(s, "21-1-4"), 0);
  // 다시 담으면 1부터
  assert.equal(bumpWrong(s, "21-1-4"), 1);
});

test("다른 기기 횟수와 합치면 많이 틀린 쪽이 남는다", () => {
  const s = fakeStore();
  bumpWrong(s, "a"); bumpWrong(s, "a");          // 이 기기 2회
  mergeCounts(s, { a: 5, b: 3 });
  assert.equal(countOf(s, "a"), 5);
  assert.equal(countOf(s, "b"), 3);
});

test("지운 문제는 합칠 때 횟수도 되살아나지 않는다", () => {
  const s = fakeStore();
  bumpWrong(s, "a");
  removeWrong(s, "a");
  mergeCounts(s, { a: 9 });
  assert.equal(countOf(s, "a"), 0);
});
