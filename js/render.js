import { renderFormula } from "./formula.js";

function starText(n) { return n > 1 ? "★".repeat(n) : ""; }

export function renderQuestionCard(q, { showAnswers }) {
  const el = document.createElement("article");
  el.className = "qcard";
  const src = q.source ? `<span class="src">[${q.source}]</span>` : "";
  const imgs = (q.images || []).map((s) => `<img class="qimg" src="data/${s}" alt="문제 그림" loading="lazy" decoding="async" />`).join("");
  const parts = q.parts.map((p) => {
    const label = p.label ? `<div class="plabel">${renderFormula(p.label)}</div>` : "";
    const ans = showAnswers
      ? `<ul class="answers">${p.answers.map((a) => `<li>${renderFormula(a)}</li>`).join("")}</ul>`
      : "";
    return `<div class="part">${label}${ans}</div>`;
  }).join("");
  el.innerHTML = `
    <div class="qhead"><span class="qnum">${q.num}.</span>
      <span class="qtext">${renderFormula(q.text)}</span>
      ${src}<span class="stars">${starText(q.stars || 1)}</span></div>
    ${imgs}${parts}`;
  return el;
}
