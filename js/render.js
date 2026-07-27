import { renderFormula } from "./formula.js";

function starText(n) { return n > 1 ? "★".repeat(n) : ""; }

function examBadge(q) {
  if (!q.examRefs || q.examRefs.length === 0) return "";
  return `<span class="exam-badge">기출 ${q.examRefs.join("·")}</span>`;
}

function topicBadge(q) {
  return q.topicLabel ? `<span class="topic-badge">${q.topicLabel}</span>` : "";
}

function ownerBadge(q) {
  return q.ownerLabel ? `<span class="src">[${q.ownerLabel}]</span>` : "";
}

// 문제에 딸린 계산 조건·보기(없으면 빈 문자열)
export function conditionBlock(q) {
  if (!q.conditions || q.conditions.length === 0) return "";
  return `<div class="conditions">${q.conditions
    .map((c) => `<div>${renderFormula(c)}</div>`).join("")}</div>`;
}

// 그림이 있으면 표시, 그림자리가 있는데 못 채웠으면 '그림 준비중' 박스
export function imageBlock(q) {
  const imgs = (q.images || [])
    .map((s) => `<img class="qimg" src="data/${s}" alt="문제 그림" title="클릭하면 원본 크기로 확대" loading="lazy" decoding="async" />`)
    .join("");
  if (imgs) return imgs;
  if (q.imageNeeded) {
    const hint = q.imageHint ? `<small>${q.imageHint}</small>` : "";
    return `<div class="img-pending">그림 준비중${hint ? "<br>" + hint : ""}</div>`;
  }
  return "";
}

function tableHtml(headers, rows, note) {
  return `<div class="table-wrap"><table class="qtable">
      <thead><tr>${headers.map((h) => `<th>${renderFormula(h)}</th>`).join("")}</tr></thead>
      <tbody>${rows.map((r) => `<tr>${r.map((c) => `<td>${c ? renderFormula(c) : "&nbsp;"}</td>`).join("")}</tr>`).join("")}</tbody>
    </table>${note ? `<p class="tnote">${renderFormula(note)}</p>` : ""}</div>`;
}

// 문제에 함께 보여줄 빈칸 표(원본 시험지 형태)
export function questionTableBlock(q) {
  if (!q.table || !q.table.questionRows) return "";
  return tableHtml(q.table.headers, q.table.questionRows, "");
}

// 채점 후 공개할 정답 표
export function tableBlock(q) {
  if (!q.table) return "";
  return tableHtml(q.table.headers, q.table.rows, q.table.note);
}

// 문제 머리(번호·본문·배지). displayNum이 있으면 그 번호로 표시(랜덤 모드 1~20)
export function questionHead(q) {
  return `<div class="qhead"><span class="qnum">${q.displayNum ?? q.num}.</span>
      <span class="qtext">${renderFormula(q.text)}</span>
      ${ownerBadge(q)}${topicBadge(q)}${examBadge(q)}<span class="stars">${starText(q.stars || 1)}</span></div>`;
}

export function addWrongButton(q, saved) {
  return `<button class="add-wrong${saved ? " done" : ""}" data-qid="${q.qid}">
      ${saved ? "✓ 오답노트에 있음" : "＋ 오답노트에 추가"}</button>`;
}

export function renderQuestionCard(q, { showAnswers, wrongIds = [] }) {
  const el = document.createElement("article");
  el.className = "qcard";
  const parts = q.parts.map((p) => {
    const label = p.label ? `<div class="plabel">${renderFormula(p.label)}</div>` : "";
    const ans = showAnswers && p.answers.length
      ? `<ul class="answers">${p.answers.map((a) => `<li>${renderFormula(a)}</li>`).join("")}</ul>`
      : "";
    return `<div class="part">${label}${ans}</div>`;
  }).join("");
  el.innerHTML = questionHead(q) + conditionBlock(q) + imageBlock(q) +
    questionTableBlock(q) + (showAnswers ? tableBlock(q) : "") + parts +
    addWrongButton(q, wrongIds.includes(q.qid));
  return el;
}
