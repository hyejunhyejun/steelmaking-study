import { loadData } from "./data.js";
import { renderQuestionCard } from "./render.js";
import { matchKeywords } from "./grading.js";
import { saveProgress, loadProgress } from "./storage.js";
import { renderFormula } from "./formula.js";

const app = document.getElementById("app");
let DATA = null;

function home() { renderRoundSelect(DATA); }

function renderRoundSelect(data) {
  const exams = data.rounds.filter((r) => r.type === "exam");
  const wrong = data.rounds.filter((r) => r.type === "wrong");
  app.innerHTML = `
    <h2>회차 선택</h2>
    <div class="round-grid">
      ${exams.map((r) => `<button class="round" data-id="${r.id}">${r.label}<br><small>${r.questions.length}문제</small></button>`).join("")}
    </div>
    <h2>복습</h2>
    <div class="round-grid">
      ${wrong.map((r) => `<button class="round wrong" data-id="${r.id}">${r.label}<br><small>${r.questions.length}문제</small></button>`).join("")}
    </div>`;
  app.querySelectorAll("button.round").forEach((b) =>
    b.addEventListener("click", () => renderModeSelect(data.rounds.find((r) => r.id === b.dataset.id)))
  );
}

function renderModeSelect(round) {
  app.innerHTML = `
    <button class="back">← 회차</button>
    <h2>${round.label}</h2>
    <div class="mode-grid">
      <button data-mode="practice">연습</button>
      <button data-mode="test">테스트</button>
      <button data-mode="exam">시험</button>
    </div>`;
  app.querySelector(".back").addEventListener("click", home);
  app.querySelector('[data-mode="practice"]').addEventListener("click", () => startPractice(round));
  app.querySelector('[data-mode="test"]').addEventListener("click", () => startTest(round));
  app.querySelector('[data-mode="exam"]').addEventListener("click", () => startExam(round));
}

function startPractice(round) {
  app.innerHTML = `<button class="back">← 모드</button><h2>${round.label} · 연습</h2><div id="list"></div>`;
  app.querySelector(".back").addEventListener("click", () => renderModeSelect(round));
  const list = app.querySelector("#list");
  round.questions.forEach((q) => list.appendChild(renderQuestionCard(q, { showAnswers: true })));
}

function startTest(round) {
  const saved = loadProgress(localStorage, round.id) || { index: 0, marks: {} };
  let i = saved.index || 0;
  const marks = saved.marks || {};

  function renderOne() {
    const q = round.questions[i];
    const src = q.source ? `<span class="src">[${q.source}]</span>` : "";
    const inputs = q.parts.map((p, pi) => {
      const label = p.label ? `<div class="plabel">${renderFormula(p.label)}</div>` : "";
      return `${label}<textarea class="ans" data-pi="${pi}" rows="2" placeholder="답 입력"></textarea>
              <div class="kw" data-pi="${pi}"></div>`;
    }).join("");
    app.innerHTML = `
      <button class="back">← 모드</button>
      <div class="progress">${i + 1} / ${round.questions.length}</div>
      <article class="qcard">
        <div class="qhead"><span class="qnum">${q.num}.</span><span class="qtext">${renderFormula(q.text)}</span>${src}</div>
        ${(q.images || []).map((s) => `<img class="qimg" src="data/${s}" alt="그림" loading="lazy" decoding="async">`).join("")}
        ${inputs}
      </article>
      <div class="controls">
        <button class="check">채점</button>
        <div class="reveal" hidden>
          <div class="model"></div>
          <button class="mark-o">O 맞음</button>
          <button class="mark-x">X 틀림</button>
        </div>
      </div>`;
    app.querySelector(".back").addEventListener("click", () => renderModeSelect(round));
    app.querySelector(".check").addEventListener("click", doCheck);
    app.querySelector(".mark-o").addEventListener("click", () => next(true));
    app.querySelector(".mark-x").addEventListener("click", () => next(false));
  }

  function doCheck() {
    const q = round.questions[i];
    q.parts.forEach((p, pi) => {
      const ta = app.querySelector(`textarea[data-pi="${pi}"]`);
      const res = matchKeywords(ta.value, p.keywords || []);
      const hits = res.filter((r) => r.hit).length;
      app.querySelector(`.kw[data-pi="${pi}"]`).innerHTML =
        `핵심어 ${res.length}개 중 <b>${hits}</b>개 포함 ` +
        res.map((r) => `<span class="${r.hit ? "hit" : "miss"}">${r.keyword}${r.hit ? "✓" : "✗"}</span>`).join(" ");
    });
    const reveal = app.querySelector(".reveal");
    reveal.hidden = false;
    reveal.querySelector(".model").innerHTML =
      "<b>모범답안</b>" + q.parts.map((p) =>
        `<div>${p.label ? renderFormula(p.label) + ": " : ""}${p.answers.map(renderFormula).join(", ")}</div>`).join("");
  }

  function next(ok) {
    marks[round.questions[i].num] = ok;
    i = Math.min(i + 1, round.questions.length - 1);
    saveProgress(localStorage, round.id, { index: i, marks });
    renderOne();
  }

  renderOne();
}

function startExam(round) {
  const forms = round.questions.map((q, qi) => {
    const parts = q.parts.map((p, pi) => {
      const label = p.label ? `<div class="plabel">${renderFormula(p.label)}</div>` : "";
      return `${label}<textarea class="ans" data-qi="${qi}" data-pi="${pi}" rows="2"></textarea>`;
    }).join("");
    return `<article class="qcard"><div class="qhead"><span class="qnum">${q.num}.</span>
      <span class="qtext">${renderFormula(q.text)}</span></div>
      ${(q.images || []).map((s) => `<img class="qimg" src="data/${s}" alt="그림" loading="lazy" decoding="async">`).join("")}
      ${parts}</article>`;
  }).join("");
  app.innerHTML = `<button class="back">← 모드</button><h2>${round.label} · 시험</h2>
    ${forms}<button class="submit">제출하고 채점</button><div id="result"></div>`;
  app.querySelector(".back").addEventListener("click", () => renderModeSelect(round));
  app.querySelector(".submit").addEventListener("click", () => grade(round));
}

function grade(round) {
  let totalKw = 0, hitKw = 0;
  const lines = round.questions.map((q, qi) => {
    let qHit = 0, qTot = 0;
    q.parts.forEach((p, pi) => {
      const ta = app.querySelector(`textarea[data-qi="${qi}"][data-pi="${pi}"]`);
      const res = matchKeywords(ta ? ta.value : "", p.keywords || []);
      qTot += res.length; qHit += res.filter((r) => r.hit).length;
    });
    totalKw += qTot; hitKw += qHit;
    const model = q.parts.map((p) => `${p.label ? renderFormula(p.label) + ": " : ""}${p.answers.map(renderFormula).join(", ")}`).join(" / ");
    return `<div class="rline"><b>${q.num}.</b> 키워드 ${qHit}/${qTot}
      <div class="model">${model}</div></div>`;
  }).join("");
  const pct = totalKw ? Math.round((hitKw / totalKw) * 100) : 0;
  const result = app.querySelector("#result");
  result.innerHTML = `<h3>채점 결과: 키워드 ${hitKw}/${totalKw} (${pct}%)</h3>${lines}`;
  result.scrollIntoView({ behavior: "smooth" });
}

loadData().then((d) => { DATA = d; home(); })
  .catch((e) => (app.textContent = "데이터를 불러오지 못했습니다: " + e.message));
