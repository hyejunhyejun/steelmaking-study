import { test } from "node:test";
import assert from "node:assert/strict";
import { renderFormula } from "../js/formula.js";

test("화학식 아래첨자", () => {
  assert.equal(renderFormula("Fe2O3"), "Fe<sub>2</sub>O<sub>3</sub>");
});

test("반응식 계수는 유지, 원소 뒤 숫자만 아래첨자", () => {
  assert.equal(
    renderFormula("3Fe2O3 + H2 → 2Fe3O4 + H2O"),
    "3Fe<sub>2</sub>O<sub>3</sub> + H<sub>2</sub> → 2Fe<sub>3</sub>O<sub>4</sub> + H<sub>2</sub>O"
  );
});

test("온도·숫자는 변경 없음", () => {
  assert.equal(renderFormula("570℃"), "570℃");
});

test("지수 마크업 ^n → sup", () => {
  assert.equal(renderFormula("(h/s)^n"), "(h/s)<sup>n</sup>");
});

test("HTML 이스케이프", () => {
  assert.equal(renderFormula("a<b&c"), "a&lt;b&amp;c");
});
