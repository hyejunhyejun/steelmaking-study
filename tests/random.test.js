import { test } from "node:test";
import assert from "node:assert/strict";
import { buildRandomPool, pickRandom } from "../js/random.js";
import { numberTopics } from "../js/data.js";

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

test("범위별 랜덤 풀: 기출만 / 이외 기출만 / 전체", () => {
  const data = {
    rounds: [{ label: "21년 1회차", questions: [{ qid: "a" }, { qid: "b" }] }],
    topics: [{ label: "열풍로", questions: [
      { qid: "t1", examRefs: [] },
      { qid: "t2", examRefs: ["21-1"] },   // 회차에 이미 있는 문제
    ] }],
  };
  const ids = (scope) => buildRandomPool(data, scope).map((q) => q.qid);
  assert.deepEqual(ids("exam"), ["a", "b"]);
  assert.deepEqual(ids("topic"), ["t1", "t2"]);       // 이외 기출은 전부
  assert.deepEqual(ids("all"), ["a", "b", "t1"]);     // 전체는 중복 제외
});

test("범위를 안 주면 전체", () => {
  const data = { rounds: [{ label: "r", questions: [{ qid: "a" }] }], topics: [] };
  assert.deepEqual(buildRandomPool(data).map((q) => q.qid), ["a"]);
});

test("이외 기출문제 번호는 어느 화면에서 꺼내도 순서대로", () => {
  const data = { rounds: [], topics: [
    { questions: [{ qid: "t01-1", num: 1 }, { qid: "t01-2", num: 2 }] },
    { questions: [{ qid: "t26-502", num: 502 }, { qid: "t26-96", num: 96 }] },
  ] };
  numberTopics(data);
  const all = data.topics.flatMap((t) => t.questions);
  assert.deepEqual(all.map((q) => q.displayNum), [1, 2, 3, 4]);
  // 내부 번호가 502여도 화면에는 3번으로 보인다
  assert.equal(all.find((q) => q.qid === "t26-502").displayNum, 3);
});
