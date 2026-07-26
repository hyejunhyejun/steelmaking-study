import { test } from "node:test";
import assert from "node:assert/strict";
import { buildRandomPool, pickRandom } from "../js/random.js";

const data = {
  rounds: [
    { id: "21-1", label: "2021년 1회차", questions: [{ qid: "21-1-1" }, { qid: "21-1-2" }] },
    { id: "21-2", label: "2021년 2회차", questions: [{ qid: "21-2-1" }] },
  ],
  topics: [
    { id: "t01", label: "01. 열풍로", questions: [
      { qid: "t01-1", examRefs: ["21-1"] },   // 회차와 중복 → 제외
      { qid: "t01-2", examRefs: [] },          // 고유 → 포함
    ] },
  ],
};

test("랜덤 풀은 회차 전체 + 기출표시 없는 유형 문제", () => {
  const pool = buildRandomPool(data);
  assert.deepEqual(pool.map((q) => q.qid), ["21-1-1", "21-1-2", "21-2-1", "t01-2"]);
});

test("풀에 중복 qid가 없다", () => {
  const ids = buildRandomPool(data).map((q) => q.qid);
  assert.equal(ids.length, new Set(ids).size);
});

test("출처 라벨이 붙는다", () => {
  const pool = buildRandomPool(data);
  assert.equal(pool[0].ownerLabel, "2021년 1회차");
  assert.equal(pool[3].ownerLabel, "01. 열풍로");
});

test("요청 개수만큼 뽑고 서로 다르다", () => {
  const picked = pickRandom(buildRandomPool(data), 3, () => 0.5);
  assert.equal(picked.length, 3);
  assert.equal(new Set(picked.map((q) => q.qid)).size, 3);
});

test("풀보다 많이 요청하면 풀 크기만큼만 반환", () => {
  assert.equal(pickRandom(buildRandomPool(data), 99).length, 4);
});

test("원본 풀 배열을 변형하지 않는다", () => {
  const pool = buildRandomPool(data);
  const before = pool.map((q) => q.qid);
  pickRandom(pool, 2);
  assert.deepEqual(pool.map((q) => q.qid), before);
});
