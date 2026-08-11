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

export function addWrongButton(q, count = 0) {
  const n = typeof count === "number" ? count : (count ? 1 : 0);
  const label = n ? `✓ 오답노트 ${n}회 <span class="plus">＋1</span>` : "＋ 오답노트에 추가";
  const drop = n ? `<button class="drop-wrong" data-qid="${q.qid}"
      title="오답노트에서 빼기">－ 빼기</button>` : "";
  return `<span class="wrong-btns"><button class="add-wrong${n ? " done" : ""}"
      data-qid="${q.qid}">${label}</button>${drop}</span>`;
}

// masked=true면 답을 가리고 '답 보기'를 눌러야 열린다(먼저 떠올리는 연습용)
export function renderQuestionCard(q, { showAnswers, masked = false, wrongCounts = {} }) {
  const el = document.createElement("article");
  el.className = "qcard";
  const parts = q.parts.map((p) => {
    const label = p.label ? `<div class="plabel">${renderFormula(p.label)}</div>` : "";
    if (!showAnswers || !p.answers.length) return `<div class="part">${label}</div>`;
    const list = `<ul class="answers">${p.answers.map((a) => `<li>${renderFormula(a)}</li>`).join("")}</ul>`;
    if (!masked) return `<div class="part">${label}${list}</div>`;
    return `<div class="part masked">${label}
        <button class="reveal-part" type="button">답 보기</button>${list}</div>`;
  }).join("");
  // 표가 곧 정답인 문항은 연습 모드에서 표도 함께 가린다
  const answerTable = showAnswers && q.table
    ? (masked ? `<div class="part masked"><button class="reveal-part" type="button">답 보기</button>${tableBlock(q)}</div>`
              : tableBlock(q))
    : "";
  el.innerHTML = questionHead(q) + conditionBlock(q) + imageBlock(q) +
    questionTableBlock(q) + answerTable + parts +
    addWrongButton(q, wrongCounts[q.qid] || 0);
  return el;
}
