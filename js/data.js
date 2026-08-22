export async function loadData() {
  const res = await fetch("data/questions.json");
  if (!res.ok) throw new Error("questions.json 로드 실패");
  return numberTopics(await res.json());
}

// 이외 기출문제의 화면 번호를 1부터 순서대로 매긴다.
// 중간에 문항을 끼워넣으면 내부 번호(num)가 502처럼 튀는데,
// 여기서 한 번 붙여두면 오답노트·랜덤 등 어느 화면에서 꺼내도 번호가 같다.
export function numberTopics(data) {
  let n = 0;
  (data.topics || []).forEach((t) =>
    t.questions.forEach((q) => { q.displayNum = ++n; })
  );
  return data;
}

export function getRound(data, id) {
  return (data.rounds || []).find((r) => r.id === id);
}

export function getTopic(data, id) {
  return (data.topics || []).find((t) => t.id === id);
}

export function allQuestions(data) {
  const out = [];
  (data.rounds || []).forEach((r) =>
    r.questions.forEach((q) => out.push({ ...q, ownerLabel: r.label }))
  );
  (data.topics || []).forEach((t) =>
    t.questions.forEach((q) => out.push({ ...q, ownerLabel: t.label }))
  );
  return out;
}

export function findByQid(data, qid) {
  return allQuestions(data).find((q) => q.qid === qid);
}

export async function loadMnemonics() {
  const res = await fetch("data/mnemonics.json");
  if (!res.ok) throw new Error("mnemonics.json 로드 실패");
  return res.json();
}
