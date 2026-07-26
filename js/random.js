// 랜덤 풀: 회차 문제 전체 + 유형 문제 중 기출 출제 표시가 없는 것
// (기출 표시가 있는 유형 문제는 이미 회차에 있으므로 제외 → 중복 방지)
export function buildRandomPool(data) {
  const pool = [];
  (data.rounds || []).forEach((r) =>
    r.questions.forEach((q) => pool.push({ ...q, ownerLabel: r.label }))
  );
  (data.topics || []).forEach((t) =>
    t.questions.forEach((q) => {
      if (!q.examRefs || q.examRefs.length === 0) {
        pool.push({ ...q, ownerLabel: t.label });
      }
    })
  );
  return pool;
}

// 피셔-예이츠 셔플로 n개 추출(원본 배열은 건드리지 않음)
export function pickRandom(pool, n, rand = Math.random) {
  const copy = pool.slice();
  for (let i = copy.length - 1; i > 0; i--) {
    const j = Math.floor(rand() * (i + 1));
    [copy[i], copy[j]] = [copy[j], copy[i]];
  }
  return copy.slice(0, Math.min(n, copy.length));
}
