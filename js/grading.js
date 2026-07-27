// 서술형 답 채점: 정답 문장을 통째로 맞히라고 하면 아무도 못 맞춘다.
// 각 채점 단위가 요구하는 '핵심어'를 몇 개나 썼는지로 판정한다.
const HIT_RATIO = 0.6;      // 이 비율 이상이면 맞춘 것으로 본다
const PARTIAL_RATIO = 0.3;  // 이 비율 이상이면 부분 인정

export function normalizeAnswer(s) {
  return String(s).replace(/\s+/g, "").replace(/[.,·、()\[\]{}]/g, "").toLowerCase();
}

export function matchKeywords(userText, keywords) {
  const u = normalizeAnswer(userText);
  return (keywords || []).map((k) => {
    // 구버전 데이터(문자열)는 통째로 포함 여부만 본다
    if (typeof k === "string") {
      const hit = u.includes(normalizeAnswer(k));
      return { keyword: k, terms: [k], found: hit ? [k] : [], missing: hit ? [] : [k],
               ratio: hit ? 1 : 0, hit, partial: false };
    }
    const terms = (k.terms && k.terms.length) ? k.terms : [k.label];
    const found = terms.filter((t) => u.includes(normalizeAnswer(t)));
    const missing = terms.filter((t) => !found.includes(t));
    const ratio = terms.length ? found.length / terms.length : 0;
    return {
      keyword: k.label,
      terms, found, missing, ratio,
      hit: ratio >= HIT_RATIO,
      partial: ratio >= PARTIAL_RATIO && ratio < HIT_RATIO,
    };
  });
}

// 채점 요약: 맞춘 개수(부분은 0.5로 계산)와 백분율
export function scoreOf(results) {
  const total = results.length;
  if (!total) return { total: 0, hit: 0, partial: 0, percent: 0 };
  const hit = results.filter((r) => r.hit).length;
  const partial = results.filter((r) => r.partial).length;
  return {
    total, hit, partial,
    percent: Math.round(((hit + partial * 0.5) / total) * 100),
  };
}
