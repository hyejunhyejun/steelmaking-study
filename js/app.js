import { loadData, getTopic, findByQid } from "./data.js";
import { renderQuestionCard, imageBlock } from "./render.js";
import { matchKeywords } from "./grading.js";
import { saveProgress, loadProgress } from "./storage.js";
import { renderFormula } from "./formula.js";
import { buildRandomPool, pickRandom } from "./random.js";
import { addWrong, removeWrong, listWrong, clearWrong } from "./wrongnote.js";

const app = document.getElementById("app");
let DATA = null;

const MODE_LABELS = { practice: "연습", test: "테스트", exam: "시험" };

/* ---------------- 홈 ---------------- */

function home() {
  const rounds = DATA.rounds || [];
  const topics = DATA.topics || [];
  const wrongCount = listWrong(localStorage).length;
  app.innerHTML = `
    <h2>회차별</h2>
    <div class="round-grid">
      ${rounds.map((r) => `<button class="round" data-id="${r.id}">${r.label}<br><small>${r.questions.length}문제</small></button>`).join("")}
    </div>
    <h2>그 외</h2>
    <div class="round-grid">
      <button class="round alt" data-go="topics">이외 기출문제<br><small>${topics.length}개 유형 · ${topics.reduce((n, t) => n + t.questions.length, 0)}문제</small></button>
      <button class="round alt" data-go="random">랜덤 20문제<br><small>전체에서 무작위</small></button>
      <button class="round wrong" data-go="wrong">오답노트<br><small>${wrongCount}문제</small></button>
    </div>`;
  app.querySelectorAll("button.round[data-id]").forEach((b) =>
    b.addEventListener("click", () => renderModeSelect(DATA.rounds.find((r) => r.id === b.dataset.id)))
  );
  const go = { topics: renderTopicList, random: startRandomSetup, wrong: renderWrongNote };
  app.querySelectorAll("button.round[data-go]").forEach((b) =>
    b.addEventListener("click", () => go[b.dataset.go]())
  );
}

/* ---------------- 이외 기출문제(유형별) ---------------- */

function renderTopicList() {
  app.innerHTML = `
    <button class="back">← 홈</button>
    <h2>이외 기출문제 · 유형 선택</h2>
    <div class="topic-list">
      ${DATA.topics.map((t) => `<button class="topic" data-id="${t.id}">${t.label}<small>${t.questions.length}문제</small></button>`).join("")}
    </div>`;
  app.querySelector(".back").addEventListener("click", home);
  app.querySelectorAll("button.topic").forEach((b) =>
    b.addEventListener("click", () => renderModeSelect(getTopic(DATA, b.dataset.id), renderTopicList))
  );
}

/* ---------------- 모드 선택 ---------------- */

function modesFor(collection) {
  if (collection.type === "topic") return ["practice", "test"];
  if (collection.type === "random") return ["test", "exam"];
  if (collection.type === "wrong") return ["practice", "test"];
  return ["practice", "test", "exam"];
}

function renderModeSelect(collection, backFn = home) {
  const modes = modesFor(collection);
  app.innerHTML = `
    <button class="back">← 뒤로</button>
    <h2>${collection.label}</h2>
    <div class="mode-grid">${modes.map((m) => `<button data-mode="${m}">${MODE_LABELS[m]}</button>`).join("")}</div>`;
  app.querySelector(".back").addEventListener("click", backFn);
  const start = { practice: startPractice, test: startTest, exam: startExam };
  modes.forEach((m) =>
    app.querySelector(`[data-mode="${m}"]`)
      .addEventListener("click", () => start[m](collection, () => renderModeSelect(collection, backFn)))
  );
}

/* ---------------- 연습 ---------------- */

function startPractice(collection, backFn) {
  app.innerHTML = `<button class="back">← 뒤로</button><h2>${collection.label} · 연습</h2><div id="list"></div>`;
  app.querySelector(".back").addEventListener("click", backFn);
  const list = app.querySelector("#list");
  collection.questions.forEach((q) => list.appendChild(renderQuestionCard(q, { showAnswers: true })));
}

/* ---------------- 테스트 ---------------- */

function startTest(collection, backFn) {
  const saved = loadProgress(localStorage, collection.id) || { index: 0, marks: {} };
  let i = collection.type === "random" ? 0 : (saved.index || 0);
  if (i >= collection.questions.length) i = 0;
  const marks = saved.marks || {};

  function renderOne() {
    const q = collection.questions[i];
    const owner = q.ownerLabel ? `<span class="src">[${q.ownerLabel}]</span>` : "";
    const inputs = q.parts.map((p, pi) => {
      const label = p.label ? `<div class="plabel">${renderFormula(p.label)}</div>` : "";
      return `${label}<textarea class="ans" data-pi="${pi}" rows="2" placeholder="답 입력"></textarea>
              <div class="kw" data-pi="${pi}"></div>`;
    }).join("");
    app.innerHTML = `
      <button class="back">← 뒤로</button>
      <div class="progress">${i + 1} / ${collection.questions.length}</div>
      <article class="qcard">
        <div class="qhead"><span class="qnum">${q.num}.</span>
          <span class="qtext">${renderFormula(q.text)}</span>${owner}</div>
        ${imageBlock(q)}
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
    app.querySelector(".back").addEventListener("click", backFn);
    app.querySelector(".check").addEventListener("click", doCheck);
    app.querySelector(".mark-o").addEventListener("click", () => next(true));
    app.querySelector(".mark-x").addEventListener("click", () => next(false));
  }

  function doCheck() {
    const q = collection.questions[i];
    q.parts.forEach((p, pi) => {
      const ta = app.querySelector(`textarea[data-pi="${pi}"]`);
      const res = matchKeywords(ta.value, p.keywords || []);
      const hits = res.filter((r) => r.hit).length;
      app.querySelector(`.kw[data-pi="${pi}"]`).innerHTML = res.length
        ? `핵심어 ${res.length}개 중 <b>${hits}</b>개 포함 ` +
          res.map((r) => `<span class="${r.hit ? "hit" : "miss"}">${r.keyword}${r.hit ? "✓" : "✗"}</span>`).join(" ")
        : `<i>그림에 직접 표시하는 문제입니다</i>`;
    });
    const reveal = app.querySelector(".reveal");
    reveal.hidden = false;
    reveal.querySelector(".model").innerHTML =
      "<b>모범답안</b>" + q.parts.map((p) =>
        `<div>${p.label ? renderFormula(p.label) + ": " : ""}${p.answers.map(renderFormula).join(", ")}</div>`).join("");
  }

  function next(ok) {
    const q = collection.questions[i];
    marks[q.qid] = ok;
    if (ok) removeWrong(localStorage, q.qid);
    else addWrong(localStorage, q.qid);
    if (i + 1 >= collection.questions.length) {
      saveProgress(localStorage, collection.id, { index: 0, marks });
      return renderTestDone(collection, marks, backFn);
    }
    i += 1;
    saveProgress(localStorage, collection.id, { index: i, marks });
    renderOne();
  }

  renderOne();
}

function renderTestDone(collection, marks, backFn) {
  const total = collection.questions.length;
  const okCount = collection.questions.filter((q) => marks[q.qid]).length;
  app.innerHTML = `
    <button class="back">← 뒤로</button>
    <h2>${collection.label} · 테스트 완료</h2>
    <p class="result-line">자가채점 결과: <b>${okCount} / ${total}</b> 맞음 (틀린 ${total - okCount}문제는 오답노트에 저장)</p>
    <button class="submit" id="again">다시 풀기</button>`;
  app.querySelector(".back").addEventListener("click", backFn);
  app.querySelector("#again").addEventListener("click", () => startTest(collection, backFn));
}

/* ---------------- 시험 ---------------- */

function startExam(collection, backFn) {
  const forms = collection.questions.map((q, qi) => {
    const parts = q.parts.map((p, pi) => {
      const label = p.label ? `<div class="plabel">${renderFormula(p.label)}</div>` : "";
      return `${label}<textarea class="ans" data-qi="${qi}" data-pi="${pi}" rows="2"></textarea>`;
    }).join("");
    const owner = q.ownerLabel ? `<span class="src">[${q.ownerLabel}]</span>` : "";
    return `<article class="qcard"><div class="qhead"><span class="qnum">${q.num}.</span>
      <span class="qtext">${renderFormula(q.text)}</span>${owner}</div>
      ${imageBlock(q)}${parts}</article>`;
  }).join("");
  app.innerHTML = `<button class="back">← 뒤로</button><h2>${collection.label} · 시험</h2>
    ${forms}<button class="submit">제출하고 채점</button><div id="result"></div>`;
  app.querySelector(".back").addEventListener("click", backFn);
  app.querySelector(".submit").addEventListener("click", () => grade(collection));
}

function grade(collection) {
  let totalKw = 0, hitKw = 0;
  const lines = collection.questions.map((q, qi) => {
    let qHit = 0, qTot = 0;
    q.parts.forEach((p, pi) => {
      const ta = app.querySelector(`textarea[data-qi="${qi}"][data-pi="${pi}"]`);
      const res = matchKeywords(ta ? ta.value : "", p.keywords || []);
      qTot += res.length; qHit += res.filter((r) => r.hit).length;
    });
    totalKw += qTot; hitKw += qHit;
    const model = q.parts.map((p) =>
      `${p.label ? renderFormula(p.label) + ": " : ""}${p.answers.map(renderFormula).join(", ")}`).join(" / ");
    return `<div class="rline"><b>${q.num}.</b> 키워드 ${qHit}/${qTot}
      <div class="model">${model}</div>
      <div class="mark-row" data-qid="${q.qid}">
        <button class="mini o">O 맞음</button><button class="mini x">X 틀림</button>
        <span class="mark-state"></span>
      </div></div>`;
  }).join("");
  const pct = totalKw ? Math.round((hitKw / totalKw) * 100) : 0;
  const result = app.querySelector("#result");
  result.innerHTML = `<h3>채점 결과: 키워드 ${hitKw}/${totalKw} (${pct}%)</h3>
    <p class="hint-line">문제별로 O/X를 누르면 틀린 문제가 오답노트에 저장됩니다.</p>${lines}`;
  result.querySelectorAll(".mark-row").forEach((row) => {
    const qid = row.dataset.qid;
    const state = row.querySelector(".mark-state");
    row.querySelector(".o").addEventListener("click", () => {
      removeWrong(localStorage, qid); state.textContent = "맞음 처리";
    });
    row.querySelector(".x").addEventListener("click", () => {
      addWrong(localStorage, qid); state.textContent = "오답노트에 저장";
    });
  });
  result.scrollIntoView({ behavior: "smooth" });
}

/* ---------------- 랜덤 20문제 ---------------- */

function startRandomSetup() {
  const pool = buildRandomPool(DATA);
  const picked = pickRandom(pool, 20);
  renderModeSelect({
    id: "random",
    label: `랜덤 20문제 (전체 ${pool.length}문제 중)`,
    type: "random",
    questions: picked,
  }, home);
}

/* ---------------- 오답노트 ---------------- */

function renderWrongNote() {
  const qids = listWrong(localStorage);
  const questions = qids.map((id) => findByQid(DATA, id)).filter(Boolean);
  const collection = { id: "wrongnote", label: "오답노트", type: "wrong", questions };
  app.innerHTML = `
    <button class="back">← 홈</button>
    <h2>오답노트 <small>${questions.length}문제</small></h2>
    ${questions.length
      ? `<button class="danger" id="clear">오답노트 초기화</button>
         <div class="mode-grid">
           <button data-mode="practice">연습</button>
           <button data-mode="test">테스트</button>
         </div>`
      : `<p>아직 틀린 문제가 없습니다. 테스트·시험에서 <b>X 틀림</b>을 누르면 여기에 쌓입니다.</p>`}`;
  app.querySelector(".back").addEventListener("click", home);
  if (!questions.length) return;
  app.querySelector('[data-mode="practice"]')
    .addEventListener("click", () => startPractice(collection, renderWrongNote));
  app.querySelector('[data-mode="test"]')
    .addEventListener("click", () => startTest(collection, renderWrongNote));
  app.querySelector("#clear").addEventListener("click", () => {
    if (confirm("오답노트를 모두 비웁니다. 계속할까요?")) {
      clearWrong(localStorage);
      renderWrongNote();
    }
  });
}

/* ---------------- 시작 ---------------- */

loadData().then((d) => { DATA = d; home(); })
  .catch((e) => (app.textContent = "데이터를 불러오지 못했습니다: " + e.message));
