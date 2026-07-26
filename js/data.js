export async function loadData() {
  const res = await fetch("data/questions.json");
  if (!res.ok) throw new Error("questions.json 로드 실패");
  return res.json();
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
