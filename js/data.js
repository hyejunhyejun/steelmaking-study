export async function loadData() {
  const res = await fetch("data/questions.json");
  if (!res.ok) throw new Error("questions.json 로드 실패");
  return res.json();
}

export function getRound(data, id) {
  return data.rounds.find((r) => r.id === id);
}
