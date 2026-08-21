import { loadData, loadMnemonics, findByQid, allQuestions } from "./data.js";
import {
  renderQuestionCard, imageBlock, tableBlock, questionTableBlock, conditionBlock,
  questionHead, addWrongButton,
} from "./render.js";
import { matchKeywords, scoreOf } from "./grading.js";
import { saveProgress, loadProgress } from "./storage.js";
import { renderFormula } from "./formula.js";
import { buildRandomPool, pickRandom, RANDOM_SCOPES } from "./random.js";
import { addWrong, removeWrong, listWrong, listRemoved, clearWrong, mergeWrong, parseWrongCode,
         bumpWrong, counts, countOf, listRevive, importOnce,
         sortWrongIds, getSort, setSort, SORT_MODES,
         WRONG_SCOPES, getScope, setScope, filterByScope } from "./wrongnote.js";
import { isLinked, setToken, unlink, gistSync } from "./gistsync.js";

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
const APP_VERSION = "2026-08-20b";

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

/* ---------------- 채점 결과 표시 ---------------- */

function shorten(s, n = 26) {
  return s.length > n ? s.slice(0, n) + "…" : s;
}

// 맞춘 것 ✓ / 부분 △ / 놓친 것 ✗ — 놓친 핵심어를 함께 보여준다
function renderScore(res) {
  if (!res.length) return "<i>그림·표로 답하는 문제입니다</i>";
  const s = scoreOf(res);
  const items = res.map((r) => {
    const cls = r.hit ? "hit" : r.partial ? "part-hit" : "miss";
    const mark = r.hit ? "✓" : r.partial ? "△" : "✗";
    const detail = r.terms.length > 1 && !r.hit
      ? ` <small>(놓침: ${r.missing.join(", ")})</small>`
      : "";
    return `<div class="kw-item ${cls}">${mark} ${shorten(r.keyword)}${detail}</div>`;
  }).join("");
  const partTxt = s.partial ? `, 부분 ${s.partial}개` : "";
  return `<div class="kw-summary">채점 <b>${s.percent}%</b>
      <small>(${s.total}개 중 정답 ${s.hit}개${partTxt})</small></div>${items}`;
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

/* ---------------- 단축키 참고 패널 ---------------- */

function setupShortcutPanel() {
  const btn = document.getElementById("shortcut-toggle");
  const panel = document.getElementById("shortcut-panel");
  const paint = () => btn.setAttribute("aria-expanded", String(!panel.hidden));
  btn.addEventListener("click", () => { panel.hidden = !panel.hidden; paint(); });
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
      ${RANDOM_SCOPES.map(([k, name, hint]) =>
        `<button class="round alt" data-random="${k}">랜덤 ${RANDOM_COUNT}문제 · ${name}
           <br><small>${hint}</small></button>`).join("")}
      <button class="round wrong" data-go="wrong">오답노트<br><small>${wrongCount}문제</small></button>
      <button class="round alt" data-go="mnemonic">📌 암기법<br><small>두문자로 외우기</small></button>
    </div>`;
  app.querySelectorAll("button.round[data-id]").forEach((b) =>
    b.addEventListener("click", () => renderModeSelect(DATA.rounds.find((r) => r.id === b.dataset.id)))
  );
  app.querySelectorAll("button.round[data-random]").forEach((b) =>
    b.addEventListener("click", () => startRandom(b.dataset.random))
  );
  const go = { topics: startTopicsAll, wrong: renderWrongNote,
               mnemonic: renderMnemonics };
  app.querySelectorAll("button.round[data-go]").forEach((b) =>
    b.addEventListener("click", () => go[b.dataset.go]())
  );
}

/* ---------------- 이외 기출문제 (유형 구분 없이 전체) ---------------- */

function topicsCollection() {
  const questions = [];
  // 표시 번호는 순서대로 다시 매긴다(중간에 문항을 끼워넣어도 번호가 이어지도록)
  (DATA.topics || []).forEach((t) =>
    t.questions.forEach((q) => questions.push({ ...q, displayNum: questions.length + 1 })));
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
  const wrongCounts = counts(localStorage);
  app.innerHTML = `<button class="back">← 뒤로</button>
    <h2>${collection.label} · 공부</h2><div id="list"></div>${bottomBack("← 뒤로")}`;
  bindBacks(backFn);
  const list = app.querySelector("#list");
  collection.questions.forEach((q) =>
    list.appendChild(renderQuestionCard(q, { showAnswers: true, wrongCounts }))
  );
}

/* ---------------- 연습 (답 가리고 떠올린 뒤 확인) ---------------- */

function startPractice(collection, backFn) {
  keyHandler = null;
  const wrongCounts = counts(localStorage);
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
    list.appendChild(renderQuestionCard(q, { showAnswers: true, masked: true, wrongCounts }))
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
    const wrongCounts = counts(localStorage);
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
        ${addWrongButton(q, wrongCounts[q.qid] || 0)}
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
      app.querySelector(`.kw[data-pi="${pi}"]`).innerHTML = renderScore(res);
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
    const was = marks[q.qid];
    marks[q.qid] = ok;
    if (ok) removeWrong(localStorage, q.qid);
    else if (was !== false) bumpWrong(localStorage, q.qid);   // 같은 문제 두 번 눌러도 1회만
    noteChanged();
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
      const s = scoreOf(res);
      qTot += s.total; qHit += s.hit + s.partial * 0.5;
    });
    totalKw += qTot; hitKw += qHit;
    const model = q.parts.map((p) =>
      `${p.label ? renderFormula(p.label) + ": " : ""}${p.answers.map(renderFormula).join(", ")}`).join(" / ");
    return `<div class="rline"><b>${q.displayNum ?? q.num}.</b> 채점 ${Math.round(qHit * 10) / 10}/${qTot}
      <div class="model">${model}${tableBlock(q)}</div>
      <div class="mark-row" data-qid="${q.qid}">
        <button class="mini o">O 맞음</button><button class="mini x">X 틀림</button>
        <span class="mark-state"></span>
      </div></div>`;
  }).join("");
  const pct = totalKw ? Math.round((hitKw / totalKw) * 100) : 0;
  const result = app.querySelector("#result");
  result.innerHTML = `<h3>채점 결과: ${Math.round(hitKw * 10) / 10} / ${totalKw} (${pct}%)</h3>
    <p class="hint-line">문제별로 O/X를 누르면 틀린 문제가 오답노트에 저장됩니다.</p>${lines}`;
  result.querySelectorAll(".mark-row").forEach((row) => {
    const qid = row.dataset.qid;
    const state = row.querySelector(".mark-state");
    row.querySelector(".o").addEventListener("click", () => {
      delete row.dataset.counted;
      removeWrong(localStorage, qid); noteChanged(); state.textContent = "맞음 처리";
    });
    row.querySelector(".x").addEventListener("click", () => {
      if (row.dataset.counted === "1") return;                // 연타로 두 번 세지 않게
      row.dataset.counted = "1";
      const n = bumpWrong(localStorage, qid);
      noteChanged();
      state.textContent = `오답노트 ${n}회`;
    });
  });
  result.scrollIntoView({ behavior: "smooth" });
}

/* ---------------- 랜덤 20문제 (한 문제씩 · 번호 1~20) ---------------- */

function startRandom(scope = "all") {
  const pool = buildRandomPool(DATA, scope);
  const picked = pickRandom(pool, RANDOM_COUNT).map((q, idx) => ({ ...q, displayNum: idx + 1 }));
  const name = (RANDOM_SCOPES.find(([k]) => k === scope) || [, "전체"])[1];
  const collection = {
    id: "random-" + scope,
    label: `랜덤 ${picked.length}문제 · ${name}`,
    type: "random",
    questions: picked,
  };
  renderModeSelect(collection, home);
}

/* ---------------- 오답노트 ---------------- */

function renderWrongNote() {
  keyHandler = null;
  const cnt = counts(localStorage);
  const mode = getSort(localStorage);
  // 전체 문제 순서(회차 → 유형)를 정렬 기준으로 쓴다
  const order = {};
  allQuestions(DATA).forEach((q, i) => { order[q.qid] = i; });
  const all = listWrong(localStorage);
  const scope = getScope(localStorage);
  const qids = sortWrongIds(filterByScope(all, scope), { mode, counts: cnt, order });
  const questions = qids.map((id) => findByQid(DATA, id)).filter(Boolean);
  const scopeName = (WRONG_SCOPES.find(([k]) => k === scope) || [, "전체"])[1];
  const collection = { id: "wrongnote-" + scope, label: `오답노트 · ${scopeName}`,
                       type: "wrong", questions };
  const tabs = WRONG_SCOPES.map(([k, name]) =>
    `<button class="wtab${k === scope ? " on" : ""}" data-scope="${k}">${name}
       <small>${filterByScope(all, k).length}</small></button>`).join("");
  app.innerHTML = `
    <button class="back">← 홈</button>
    <h2>오답노트 <small>${questions.length}문제 · v${APP_VERSION}</small></h2>
    <div class="wtabs">${tabs}</div>
    <div class="controls" style="margin:.4rem 0 .8rem">
      ${isLinked(localStorage)
        ? `<button id="sync-now">☁️ 지금 동기화</button><button id="unlink">연결 해제</button>`
        : `<button id="show-link">☁️ 기기 간 자동 동기화 연결</button>`}
      <label class="sortbox">정렬
        <select id="wrong-sort">${SORT_MODES.map(([k, t]) =>
          `<option value="${k}"${k === mode ? " selected" : ""}>${t}</option>`).join("")}</select>
      </label>
      <button id="copy-link">🔗 링크 복사</button>
      <button id="show-import">📥 가져오기</button>
      <span id="sync-state" class="mark-state"></span>
    </div>
    <div id="link-box" hidden>
      <p class="hint-line">GitHub → Settings → Developer settings → <b>Tokens (classic)</b>에서
        <b>gist</b> 권한만 체크해 토큰을 만들어 붙여넣으세요.
        토큰은 이 브라우저에만 저장되고, 비공개 Gist 하나에 오답노트가 보관됩니다.</p>
      <textarea class="ans" id="token-input" rows="1" placeholder="ghp_..."></textarea>
      <button id="do-link">연결하기</button>
    </div>
    <div id="sync-box" hidden>
      <p class="hint-line">다른 기기에서 복사한 링크나 코드를 붙여넣으세요. 기존 목록에 <b>합쳐집니다</b>.</p>
      <textarea class="ans" id="sync-input" rows="2" placeholder="여기에 붙여넣기"></textarea>
      <button id="do-import">합치기</button>
    </div>
    ${questions.length
      ? `<ul class="wrong-list">${questions.map((q) => {
            const n = cnt[q.qid] || 1;
            return `<li><span class="times${n > 2 ? " hot" : ""}">${n}회</span>
              <span class="wq">${q.text.replace(/</g, "&lt;").slice(0, 70)}</span>
              <button class="drop-wrong" data-qid="${q.qid}">－ 빼기</button></li>`;
          }).join("")}</ul>
         <button class="danger" id="clear">오답노트 초기화</button>
         <div class="mode-grid">
           <button data-mode="practice">연습</button>
           <button data-mode="test">테스트</button>
         </div>`
      : `<p>${all.length ? "이 범위에는 담긴 문제가 없습니다. 위 탭을 바꿔 보세요."
            : "아직 담긴 문제가 없습니다. 테스트·시험에서 <b>X 틀림</b>을 누르거나, " +
              "문제 아래 <b>＋ 오답노트에 추가</b> 버튼을 누르면 여기에 쌓입니다."}</p>`}
    ${bottomBack("← 홈")}`;
  bindBacks(home);
  app.querySelectorAll(".wtab").forEach((b) =>
    b.addEventListener("click", () => { setScope(localStorage, b.dataset.scope); renderWrongNote(); })
  );
  app.querySelector("#wrong-sort")?.addEventListener("change", (e) => {
    setSort(localStorage, e.target.value);
    renderWrongNote();
  });
  const state = app.querySelector("#sync-state");
  const run = async (msg) => {
    state.textContent = "동기화 중…";
    try { await syncNow(); state.textContent = msg; renderWrongNote(); }
    catch (err) { state.textContent = "실패: " + err.message; }
  };
  app.querySelector("#sync-now")?.addEventListener("click", () => run("동기화 완료"));
  app.querySelector("#unlink")?.addEventListener("click", () => { unlink(localStorage); renderWrongNote(); });
  const linkBox = app.querySelector("#link-box");
  app.querySelector("#show-link")?.addEventListener("click", () => { linkBox.hidden = !linkBox.hidden; });
  app.querySelector("#do-link")?.addEventListener("click", () => {
    const t = app.querySelector("#token-input").value.trim();
    if (!t) return;
    setToken(localStorage, t);
    run("연결됨 · 동기화 완료");
  });
  app.querySelector("#copy-link").addEventListener("click", async (e) => {
    const link = location.origin + location.pathname + "#w=" + qids.join(",");
    try {
      await navigator.clipboard.writeText(link);
      e.target.textContent = "✓ 복사됨 — 다른 기기에서 열기";
    } catch {
      prompt("이 링크를 복사해서 다른 기기에서 여세요", link);
    }
  });
  const box = app.querySelector("#sync-box");
  app.querySelector("#show-import").addEventListener("click", () => { box.hidden = !box.hidden; });
  app.querySelector("#do-import").addEventListener("click", () => {
    const added = parseWrongCode(app.querySelector("#sync-input").value);
    if (!added.length) return;
    mergeWrong(localStorage, added);
    noteChanged();
    renderWrongNote();
  });
  if (!questions.length) return;
  app.querySelector('[data-mode="practice"]')
    .addEventListener("click", () => startPractice(collection, renderWrongNote));
  app.querySelector('[data-mode="test"]')
    .addEventListener("click", () => startTest(collection, renderWrongNote));
  app.querySelector("#clear").addEventListener("click", () => {
    if (confirm("오답노트를 모두 비웁니다. 계속할까요?")) {
      clearWrong(localStorage);
      noteChanged();
      renderWrongNote();
    }
  });
}

/* ---------------- 오답노트 기기 간 동기화 (GitHub Gist) ---------------- */

// 지운 것도 반영하려면 replace=true로 로컬 목록을 그대로 올린다
let syncTimer = null;
// 오답노트가 바뀔 때마다 호출 — 잠깐 모았다가 한 번만 올린다
function noteChanged() {
  if (!isLinked(localStorage)) return;
  clearTimeout(syncTimer);
  syncTimer = setTimeout(() => {
    syncNow().catch(() => {});
  }, 800);
}

async function syncNow() {
  if (!isLinked(localStorage)) return null;
  const merged = await gistSync(localStorage, listWrong(localStorage),
                               listRemoved(localStorage), counts(localStorage),
                               listRevive(localStorage));
  if (merged) localStorage.setItem("jeseon:wrongnote", JSON.stringify(merged));
  return merged;
}

/* ---------------- 암기법 ---------------- */

let MNEMONICS = null;

function mnemonicEntry(e) {
  const rounds = e.rounds.length
    ? `<span class="mn-rounds">기출 ${e.rounds.join(" · ")}</span>`
    : `<span class="mn-rounds none">기출 없음 · 보충</span>`;
  const flags = [e.reordered ? "🔀 순서 바꿈" : "", e.origin ? "원본 두문자" : ""]
    .filter(Boolean).map((f) => `<span class="mn-flag">${f}</span>`).join(" ");
  const items = e.items.map(([k, v]) =>
    `<div class="mn-key">${k}</div><div class="mn-val">${renderFormula(v)}</div>`).join("");
  return `<article class="mn-entry">
      <div class="mn-head"><span class="mn-title">${e.title}</span>${rounds}${flags}</div>
      <div class="mn-phrase">${e.emoji ? e.emoji + " " : ""}${e.phrase}</div>
      ${e.read ? `<p class="mn-read">${e.read}</p>` : ""}
      <div class="mn-items">${items}</div>
    </article>`;
}

async function renderMnemonics() {
  keyHandler = null;
  if (!MNEMONICS) {
    app.innerHTML = "암기법 불러오는 중…";
    try {
      MNEMONICS = await loadMnemonics();
    } catch (err) {
      app.innerHTML = `<button class="back">← 홈</button><p>암기법을 불러오지 못했습니다: ${err.message}</p>`;
      bindBacks(home);
      return;
    }
  }
  const sections = MNEMONICS.sections.map((s) =>
    `<h2>${s.name}</h2>${s.entries.map(mnemonicEntry).join("")}`).join("");
  const pairs = MNEMONICS.pairs.map((p) =>
    `<tr><td><b>${p.topic}</b></td><td>${p.left}</td><td>${p.right}</td></tr>`).join("");
  const numbers = MNEMONICS.numbers.map((n) =>
    `<tr><td>${renderFormula(n.name)}</td><td><b>${renderFormula(n.value)}</b></td></tr>`).join("");
  app.innerHTML = `
    <button class="back">← 홈</button>
    <h2>📌 두문자 암기법 <small>${MNEMONICS.sections.reduce((a, s) => a + s.entries.length, 0)}개</small></h2>
    <p class="hint-line">순서를 바꿔 한 문장으로 읽히게 만든 암기법입니다. 각 항목에 출제 회차를 표시했습니다.</p>
    ${sections}
    <h2>헷갈리는 짝 — 반대로 외우기</h2>
    <div class="table-wrap"><table class="qtable">
      <thead><tr><th>구분</th><th>한쪽</th><th>반대쪽</th></tr></thead>
      <tbody>${pairs}</tbody></table></div>
    <h2>숫자로 외우는 것</h2>
    <div class="table-wrap"><table class="qtable">
      <thead><tr><th>항목</th><th>값</th></tr></thead>
      <tbody>${numbers}</tbody></table></div>
    ${bottomBack("← 홈")}`;
  bindBacks(home);
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
    // 누를 때마다 +1 — 여러 번 틀린 문제가 위로 올라온다
    const qid = el.dataset.qid;
    const n = bumpWrong(localStorage, qid);
    noteChanged();
    el.closest(".wrong-btns").outerHTML =
      addWrongButton({ qid }, n);
    return;
  }
  if (el instanceof HTMLElement && el.classList.contains("drop-wrong")) {
    const qid = el.dataset.qid;
    removeWrong(localStorage, qid);
    noteChanged();
    const box = el.closest(".wrong-btns");
    if (box) box.outerHTML = addWrongButton({ qid }, 0);
    // 오답노트 화면에서 뺐으면 목록을 다시 그린다
    if (app.querySelector("h2")?.textContent.startsWith("오답노트")) renderWrongNote();
  }
});

/* ---------------- 시작 ---------------- */

resetStorageIfStale();
// 다른 기기에서 보낸 오답노트 링크(#w=...)로 들어오면 합쳐 준다
if (location.hash.startsWith("#w=")) {
  const code = location.hash.slice(3);
  importOnce(localStorage, parseWrongCode(location.hash), code);
  history.replaceState(null, "", location.pathname);
}
setupTheme();
setupShortcutPanel();
document.addEventListener("visibilitychange", () => {
  if (!document.hidden) syncNow().then((m) => { if (m) renderIfHome(); }).catch(() => {});
});

function renderIfHome() {
  if (app.querySelector('[data-go="wrong"]')) home();
}

loadData().then((d) => {
  DATA = d;
  home();
  // 연결돼 있으면 조용히 맞춘 뒤 개수만 갱신
  syncNow().then((m) => { if (m) home(); }).catch(() => {});
})
  .catch((e) => (app.textContent = "데이터를 불러오지 못했습니다: " + e.message));
