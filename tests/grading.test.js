import { test } from "node:test";
import assert from "node:assert/strict";
import { normalizeAnswer, matchKeywords } from "../js/grading.js";

test("정규화는 공백·구두점 제거", () => {
  assert.equal(normalizeAnswer("회선철, 백선철"), "회선철백선철");
});

test("짧은 항목은 그대로 포함 여부 판정", () => {
  const kws = [
    { label: "회선철", terms: ["회선철"] },
    { label: "백선철", terms: ["백선철"] },
    { label: "반선철", terms: ["반선철"] },
  ];
  const r = matchKeywords("회선철 백선철 입니다", kws);
  assert.deepEqual(r.map((x) => x.hit), [true, true, false]);
});

test("긴 문장은 핵심어 일부만 맞아도 부분 인정", () => {
  const kws = [{
    label: "석탄을 코크스로에 장입하기 전 가열하여 수분을 감소시키는 방법",
    terms: ["석탄", "코크스로", "장입", "가열", "수분", "감소"],
  }];
  // 6개 중 4개(67%) → 정답 처리
  const good = matchKeywords("석탄을 코크스로에 넣기 전 가열해서 수분을 줄임", kws)[0];
  assert.equal(good.hit, true);
  assert.equal(good.found.length, 4);

  // 6개 중 2개(33%) → 부분 인정
  const half = matchKeywords("석탄을 가열한다", kws)[0];
  assert.equal(half.hit, false);
  assert.equal(half.partial, true);

  // 하나도 못 맞추면 오답
  const bad = matchKeywords("전혀 다른 내용", kws)[0];
  assert.equal(bad.hit, false);
  assert.equal(bad.partial, false);
});

test("맞춘 핵심어와 놓친 핵심어를 알려준다", () => {
  const kws = [{ label: "노내 통기성 저하", terms: ["노내", "통기성", "저하"] }];
  const r = matchKeywords("통기성이 저하된다", kws)[0];
  assert.deepEqual(r.found, ["통기성", "저하"]);
  assert.deepEqual(r.missing, ["노내"]);
});

test("문자열 키워드(구버전 데이터)도 그대로 동작", () => {
  const r = matchKeywords("회선철", ["회선철", "백선철"]);
  assert.deepEqual(r.map((x) => x.hit), [true, false]);
});
