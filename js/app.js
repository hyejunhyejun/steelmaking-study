import { loadData, findByQid } from "./data.js";
import {
  renderQuestionCard, imageBlock, tableBlock, questionTableBlock, conditionBlock,
  questionHead, addWrongButton,
} from "./render.js";
import { matchKeywords } from "./grading.js";
import { saveProgress, loadProgress } from "./storage.js";
import { renderFormula } from "./formula.js";
import { buildRandomPool, pickRandom } from "./random.js";
import { addWrong, removeWrong, listWrong, clearWrong } from "./wrongnote.js";

const app = document.getElementById("app");
let DATA = null;

const MODE_LABELS = { study: "공부", practice: "연습", test: "테스트", exam: "시험" };
const MODE_HINTS = {
  study: "문제와 답을 함께 보며 익히기",
  practice: "답을 가리고 먼저 떠올린 뒤 확인하기",
  test: "한 문제씩 타이핑하고 채점하기",
  exam: "회차 전체를 풀고 한 번에 채점하기",
};
const RANDOM_COUNT = 20;

/* ---------------- 키보드 단축키 ---------------- */
// 화면마다 처리기를 갈아끼운다(화면 전환 시 이전 처리기가 남지 않도록)
let keyHandler = null;
document.addEventListener("keydown", (e) => { if (keyHandler) keyHandler(e); });

function inTypingField(e) {
  const t = e.target;
  return t instanceof HTMLTextAreaElement || t instanceof HTMLInputElement;
}

function shortcutHint(text) {
  return `<p class="shortcut-hint">⌨ ${text}</p>`;
}

/* ---------------- 저장소 (문제 번호 체계가 바뀌면 초기화) ---------------- */

const STORAGE_VERSION = "2";
function resetStorageIfStale() {
  if (localStorage.getItem("jeseon:version") === STORAGE_VERSION) return;
  Object.keys(localStorage)
    .filter((k) => k.startsWith("jeseon:") && k !== "jeseon:theme")
    .forEach((k) => localStorage.removeItem(k));
  localStorage.setItem("jeseon:version", STORAGE_VERSION);
}

/* ---------------- 다크모드 (수동 토글) ---------------- */

function setupTheme() {
  const btn = document.getElementById("theme-toggle");
  const paint = () => {
    const dark = document.documentElement.getAttribute("data-theme") === "dark";
    btn.textContent = dark ? "☀️ 라이트" : "🌙 다크";
  };
  btn.addEventListener("click", () => {
    const dark = document.documentElement.getAttribute("data-theme") === "dark";
    if (dark) {
      document.documentElement.removeAttribute("data-theme");
      localStorage.setItem("jeseon:theme", "light");
    } else {
      document.documentElement.setAttribute("data-theme", "dark");
      localStorage.setItem("jeseon:theme", "dark");
    }
    paint();
  });
  paint();
}

/* ---------------- 공통 UI 조각 ---------------- */

function bottomBack(label = "← 뒤로") {
  return `<button class="back bottom">${label}</button>`;
}

function bindBacks(fn) {
  app.querySelectorAll(".back").forEach((b) => b.addEventListener("click", fn));
}

/* ---------------- 홈 ---------------- */

function home() {
  keyHandler = null;
  const rounds = DATA.rounds || [];
  const topics = DATA.topics || [];
  const topicQCount = topics.reduce((n, t) => n + t.questions.length, 0);
  const wrongCount = listWrong(localStorage).length;
  app.innerHTML = `
    <h2>회차별</h2>
    <div class="round-grid">
      ${rounds.map((r) => `<button class="round" data-id="${r.id}">${r.label}<br><small>${r.questions.length}문제</small></button>`).join("")}
    </div>
    <h2>그 외</h2>
    <div class="round-grid">
      <button class="round alt" data-go="topics">이외 기출문제<br><small>${topicQCount}문제</small></button>
      <button class="round alt" data-go="random">랜덤 ${RANDOM_COUNT}문제<br><small>전체에서 무작위</small></button>
      <button class="round wrong" data-go="wrong">오답노트<br><small>${wrongCount}문제</small></button>
    </div>`;
  app.querySelectorAll("button.round[data-id]").forEach((b) =>
    b.addEventListener("click", () => renderModeSelect(DATA.rounds.find((r) => r.id === b.dataset.id)))
  );
  const go = { topics: startTopicsAll, random: startRandom, wrong: renderWrongNote };
  app.querySelectorAll("button.round[data-go]").forEach((b) =>
    b.addEventListener("click", () => go[b.dataset.go]())
  );
}

/* ---------------- 이외 기출문제 (유형 구분 없이 전체) ---------------- */

function topicsCollection() {
  const questions = [];
  (DATA.topics || []).forEach((t) => t.questions.forEach((q) => questions.push(q)));
  return { id: "topics-all", label: "이외 기출문제", type: "topic", questions };
}

function startTopicsAll() {
  renderModeSelect(topicsCollection());
}

/* ---------------- 모드 선택 ---------------- */

function modesFor(collection) {
  if (collection.type === "exam") return ["study", "practice", "test", "exam"];
  return ["study", "practice", "test"];
}

function renderModeSelect(collection, backFn = home) {
  keyHandler = null;
  const modes = modesFor(collection);
  app.innerHTML = `
    <button class="back">← 뒤로</button>
    <h2>${collection.label} <small>${collection.questions.length}문제</small></h2>
    <div class="mode-grid">${modes.map((m) =>
      `<button data-mode="${m}">${MODE_LABELS[m]}<small>${MODE_HINTS[m]}</small></button>`).join("")}</div>`;
  bindBacks(backFn);
  const start = { study: startStudy, practice: startPractice, test: startTest, exam: startExam };
  modes.forEach((m) =>
    app.querySelector(`[data-mode="${m}"]`)
      .addEventListener("click", () => start[m](collection, () => renderModeSelect(collection, backFn)))
  );
}

/* ---------------- 공부 (문제 + 답 함께 보기) ---------------- */

function startStudy(collection, backFn) {
  keyHandler = null;
  const wrongIds = listWrong(localStorage);
  app.innerHTML = `<button class="back">← 뒤로</button>
    <h2>${collection.label} · 공부</h2><div id="list"></div>${bottomBack("← 뒤로")}`;
  bindBacks(backFn);
  const list = app.querySelector("#list");
  collection.questions.forEach((q) =>
    list.appendChild(renderQuestionCard(q, { showAnswers: true, wrongIds }))
  );
}

/* ---------------- 연습 (답 가리고 떠올린 뒤 확인) ---------------- */

function startPractice(collection, backFn) {
  keyHandler = null;
  const wrongIds = listWrong(localStorage);
  app.innerHTML = `<button class="back">← 뒤로</button>
    <h2>${collection.label} · 연습</h2>
    <p class="hint-line">답이 가려져 있습니다. 먼저 떠올린 뒤 <b>답 보기</b>를 누르세요.</p>
    <div class="controls">
      <button id="reveal-all">모두 보기</button>
      <button id="hide-all">모두 가리기</button>
    </div>
    <div id="list"></div>${bottomBack("← 뒤로")}`;
  bindBacks(backFn);
  const list = app.querySelector("#list");
  collection.questions.forEach((q) =>
    list.appendChild(renderQuestionCard(q, { showAnswers: true, masked: true, wrongIds }))
  );
  app.querySelector("#reveal-all").addEventListener("click", () =>
    list.querySelectorAll(".part.masked").forEach((p) => p.classList.remove("masked"))
  );
  app.querySelector("#hide-all").addEventListener("click", () =>
    list.querySelectorAll(".part").forEach((p) => {
      if (p.querySelector(".reveal-part")) p.classList.add("masked");
    })
  );
}

/* ---------------- 테스트 (한 문제씩 · 이전/다음) ---------------- */

function startTest(collection, backFn) {
  const saved = loadProgress(localStorage, collection.id) || { index: 0, marks: {} };
  let i = collection.type === "random" ? 0 : (saved.index || 0);
  if (i >= collection.questions.length) i = 0;
  const marks = saved.marks || {};
  const typed = {};      // qid → 입력값 배열(앞뒤로 오갈 때 보존)
  const checked = {};    // qid → 채점 완료 여부

  const persist = () => {
    if (collection.type === "random") return;   // 랜덤은 매번 새로 뽑으므로 저장 안 함
    saveProgress(localStorage, collection.id, { index: i, marks });
  };

  function renderOne() {
    const q = collection.questions[i];
    const wrongIds = listWrong(localStorage);
    const inputs = q.parts.map((p, pi) => {
      const label = p.label ? `<div class="plabel">${renderFormula(p.label)}</div>` : "";
      const val = (typed[q.qid] || [])[pi] || "";
      return `${label}<textarea class="ans" data-pi="${pi}" rows="2" placeholder="답 입력">${val}</textarea>
              <div class="kw" data-pi="${pi}"></div>`;
    }).join("");
    app.innerHTML = `
      <button class="back">← 뒤로</button>
      <div class="progress">${i + 1} / ${collection.questions.length}${marks[q.qid] === true ? " · 맞음 표시됨" : marks[q.qid] === false ? " · 틀림 표시됨" : ""}</div>
      <article class="qcard">
        ${questionHead(q)}${conditionBlock(q)}${imageBlock(q)}${questionTableBlock(q)}
        ${inputs}
        ${addWrongButton(q, wrongIds.includes(q.qid))}
      </article>
      <div class="controls">
        <button class="check">채점</button>
        <div class="reveal" hidden>
          <div class="model"></div>
          <button class="mark-o">O 맞음</button>
          <button class="mark-x">X 틀림</button>
        </div>
      </div>
      <div class="nav-row">
        <button class="prev" ${i === 0 ? "disabled" : ""}>← 이전 문제</button>
        <button class="next" ${i === collection.questions.length - 1 ? "disabled" : ""}>다음 문제 →</button>
        <span class="spacer"></span>
      </div>
      ${shortcutHint("Ctrl+Enter 채점 · Alt+← / Alt+→ 이전·다음 문제 (입력창 밖에서는 ← → 만으로도 이동)")}
      ${bottomBack("← 목록으로")}`;
    bindBacks(backFn);
    app.querySelector(".check").addEventListener("click", doCheck);
    app.querySelector(".mark-o").addEventListener("click", () => mark(true));
    app.querySelector(".mark-x").addEventListener("click", () => mark(false));
    app.querySelector(".prev").addEventListener("click", () => move(-1));
    app.querySelector(".next").addEventListener("click", () => move(1));
    if (checked[q.qid]) doCheck();
    app.querySelector("textarea.ans")?.focus();

    keyHandler = (e) => {
      if (e.key === "Enter" && (e.ctrlKey || e.metaKey)) {
        e.preventDefault();
        // 이미 채점했으면 한 번 더 눌러 다음 문제로
        if (app.querySelector(".reveal")?.hidden === false) move(1);
        else doCheck();
        return;
      }
      const nav = e.altKey || !inTypingField(e);
      if (!nav) return;
      if (e.key === "ArrowRight") { e.preventDefault(); move(1); }
      else if (e.key === "ArrowLeft") { e.preventDefault(); move(-1); }
    };
  }

  function captureTyped() {
    const q = collection.questions[i];
    typed[q.qid] = [...app.querySelectorAll("textarea.ans")].map((t) => t.value);
  }

  function doCheck() {
    const q = collection.questions[i];
    captureTyped();
    checked[q.qid] = true;
    q.parts.forEach((p, pi) => {
      const ta = app.querySelector(`textarea[data-pi="${pi}"]`);
      const res = matchKeywords(ta ? ta.value : "", p.keywords || []);
      const hits = res.filter((r) => r.hit).length;
      app.querySelector(`.kw[data-pi="${pi}"]`).innerHTML = res.length
        ? `핵심어 ${res.length}개 중 <b>${hits}</b>개 포함 ` +
          res.map((r) => `<span class="${r.hit ? "hit" : "miss"}">${r.keyword}${r.hit ? "✓" : "✗"}</span>`).join(" ")
        : `<i>그림·표로 답하는 문제입니다</i>`;
    });
    const reveal = app.querySelector(".reveal");
    reveal.hidden = false;
    reveal.querySelector(".model").innerHTML =
      "<b>모범답안</b>" + q.parts.map((p) =>
        `<div>${p.label ? renderFormula(p.label) + ": " : ""}${p.answers.map(renderFormula).join(", ")}</div>`).join("")
      + tableBlock(q);
  }

  function mark(ok) {
    const q = collection.questions[i];
    marks[q.qid] = ok;
    if (ok) removeWrong(localStorage, q.qid);
    else addWrong(localStorage, q.qid);
    if (i + 1 >= collection.questions.length) {
      persist();
      return renderTestDone(collection, marks, backFn);
    }
    move(1);
  }

  function move(step) {
    captureTyped();
    i = Math.min(Math.max(i + step, 0), collection.questions.length - 1);
    persist();
    renderOne();
  }

  renderOne();
}

function renderTestDone(collection, marks, backFn) {
  keyHandler = null;
  const total = collection.questions.length;
  const okCount = collection.questions.filter((q) => marks[q.qid]).length;
  app.innerHTML = `
    <button class="back">← 뒤로</button>
    <h2>${collection.label} · 테스트 완료</h2>
    <p class="result-line">자가채점 결과: <b>${okCount} / ${total}</b> 맞음 (틀린 ${total - okCount}문제는 오답노트에 저장)</p>
    <button class="submit" id="again">다시 풀기</button>
    ${bottomBack("← 뒤로")}`;
  bindBacks(backFn);
  app.querySelector("#again").addEventListener("click", () => startTest(collection, backFn));
}

/* ---------------- 시험 (회차 전체 일괄) ---------------- */

function startExam(collection, backFn) {
  const forms = collection.questions.map((q, qi) => {
    const parts = q.parts.map((p, pi) => {
      const label = p.label ? `<div class="plabel">${renderFormula(p.label)}</div>` : "";
      return `${label}<textarea class="ans" data-qi="${qi}" data-pi="${pi}" rows="2"></textarea>`;
    }).join("");
    return `<article class="qcard">${questionHead(q)}${conditionBlock(q)}${imageBlock(q)}${questionTableBlock(q)}${parts}</article>`;
  }).join("");
  app.innerHTML = `<button class="back">← 뒤로</button><h2>${collection.label} · 시험</h2>
    ${shortcutHint("Ctrl+Enter 제출하고 채점")}
    ${forms}<button class="submit">제출하고 채점</button><div id="result"></div>${bottomBack("← 뒤로")}`;
  bindBacks(backFn);
  app.querySelector(".submit").addEventListener("click", () => grade(collection));
  keyHandler = (e) => {
    if (e.key === "Enter" && (e.ctrlKey || e.metaKey)) {
      e.preventDefault();
      grade(collection);
    }
  };
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
    return `<div class="rline"><b>${q.displayNum ?? q.num}.</b> 키워드 ${qHit}/${qTot}
      <div class="model">${model}${tableBlock(q)}</div>
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

/* ---------------- 랜덤 20문제 (한 문제씩 · 번호 1~20) ---------------- */

function startRandom() {
  const pool = buildRandomPool(DATA);
  const picked = pickRandom(pool, RANDOM_COUNT).map((q, idx) => ({ ...q, displayNum: idx + 1 }));
  const collection = {
    id: "random",
    label: `랜덤 ${picked.length}문제`,
    type: "random",
    questions: picked,
  };
  renderModeSelect(collection, home);
}

/* ---------------- 오답노트 ---------------- */

function renderWrongNote() {
  keyHandler = null;
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
      : `<p>아직 담긴 문제가 없습니다. 테스트·시험에서 <b>X 틀림</b>을 누르거나,
         문제 아래 <b>＋ 오답노트에 추가</b> 버튼을 누르면 여기에 쌓입니다.</p>`}
    ${bottomBack("← 홈")}`;
  bindBacks(home);
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

/* ---------------- 전역 클릭 처리 (그림 확대 · 오답 담기) ---------------- */

app.addEventListener("click", (e) => {
  const el = e.target;
  if (el instanceof HTMLImageElement && el.classList.contains("qimg")) {
    el.classList.toggle("zoomed");
    return;
  }
  if (el instanceof HTMLElement && el.classList.contains("reveal-part")) {
    el.closest(".part").classList.remove("masked");
    return;
  }
  if (el instanceof HTMLElement && el.classList.contains("add-wrong")) {
    const qid = el.dataset.qid;
    if (el.classList.contains("done")) {
      removeWrong(localStorage, qid);
      el.classList.remove("done");
      el.textContent = "＋ 오답노트에 추가";
    } else {
      addWrong(localStorage, qid);
      el.classList.add("done");
      el.textContent = "✓ 오답노트에 있음";
    }
  }
});

/* ---------------- 시작 ---------------- */

resetStorageIfStale();
setupTheme();
loadData().then((d) => { DATA = d; home(); })
  .catch((e) => (app.textContent = "데이터를 불러오지 못했습니다: " + e.message));
