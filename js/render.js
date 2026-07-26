import { renderFormula } from "./formula.js";

function starText(n) { return n > 1 ? "★".repeat(n) : ""; }

function examBadge(q) {
  if (!q.examRefs || q.examRefs.length === 0) return "";
  return `<span class="exam-badge">기출 ${q.examRefs.join("·")}</span>`;
}

function ownerBadge(q) {
  return q.ownerLabel ? `<span class="src">[${q.ownerLabel}]</span>` : "";
}

// 그림이 있으면 표시, 그림자리가 있는데 못 채웠으면 '그림 준비중' 박스
export function imageBlock(q) {
  const imgs = (q.images || [])
    .map((s) => `<img class="qimg" src="data/${s}" alt="문제 그림" loading="lazy" decoding="async" />`)
    .join("");
  if (imgs) return imgs;
  if (q.imageNeeded) {
    const hint = q.imageHint ? `<small>${q.imageHint}</small>` : "";
    return `<div class="img-pending">그림 준비중${hint ? "<br>" + hint : ""}</div>`;
  }
  return "";
}

// 표로 출제되는 문제는 HTML 표로 렌더(그림 대신)
export function tableBlock(q) {
  if (!q.table) return "";
  const { headers, rows, note } = q.table;
  return `<div class="table-wrap"><table class="qtable">
      <thead><tr>${headers.map((h) => `<th>${renderFormula(h)}</th>`).join("")}</tr></thead>
      <tbody>${rows.map((r) => `<tr>${r.map((c) => `<td>${renderFormula(c)}</td>`).join("")}</tr>`).join("")}</tbody>
    </table>${note ? `<p class="tnote">${renderFormula(note)}</p>` : ""}</div>`;
}

export function renderQuestionCard(q, { showAnswers }) {
  const el = document.createElement("article");
  el.className = "qcard";
  const parts = q.parts.map((p) => {
    const label = p.label ? `<div class="plabel">${renderFormula(p.label)}</div>` : "";
    const ans = showAnswers && p.answers.length
      ? `<ul class="answers">${p.answers.map((a) => `<li>${renderFormula(a)}</li>`).join("")}</ul>`
      : "";
    return `<div class="part">${label}${ans}</div>`;
  }).join("");
  el.innerHTML = `
    <div class="qhead"><span class="qnum">${q.num}.</span>
      <span class="qtext">${renderFormula(q.text)}</span>
      ${ownerBadge(q)}${examBadge(q)}<span class="stars">${starText(q.stars || 1)}</span></div>
    ${imageBlock(q)}${showAnswers ? tableBlock(q) : ""}${parts}`;
  return el;
}
