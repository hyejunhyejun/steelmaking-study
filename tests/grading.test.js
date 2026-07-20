import { test } from "node:test";
import assert from "node:assert/strict";
import { normalizeAnswer, matchKeywords } from "../js/grading.js";

test("정규화는 공백·구두점 제거", () => {
  assert.equal(normalizeAnswer("회선철, 백선철"), "회선철백선철");
});

test("키워드 부분일치 판정", () => {
  const r = matchKeywords("회선철 백선철 입니다", ["회선철", "백선철", "반선철"]);
  assert.deepEqual(r, [
    { keyword: "회선철", hit: true },
    { keyword: "백선철", hit: true },
    { keyword: "반선철", hit: false },
  ]);
});
