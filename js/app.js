import { loadData } from "./data.js";

const app = document.getElementById("app");

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
    b.addEventListener("click", () => console.log("선택 회차:", b.dataset.id))
  );
}

loadData()
  .then(renderRoundSelect)
  .catch((e) => (app.textContent = "데이터를 불러오지 못했습니다: " + e.message));
