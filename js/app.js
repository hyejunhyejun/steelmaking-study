import { loadData } from "./data.js";
import { renderQuestionCard } from "./render.js";

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
  // test/exam은 이후 태스크에서 연결
}

function startPractice(round) {
  app.innerHTML = `<button class="back">← 모드</button><h2>${round.label} · 연습</h2><div id="list"></div>`;
  app.querySelector(".back").addEventListener("click", () => renderModeSelect(round));
  const list = app.querySelector("#list");
  round.questions.forEach((q) => list.appendChild(renderQuestionCard(q, { showAnswers: true })));
}

loadData().then((d) => { DATA = d; home(); })
  .catch((e) => (app.textContent = "데이터를 불러오지 못했습니다: " + e.message));
