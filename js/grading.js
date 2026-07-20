export function normalizeAnswer(s) {
  return String(s).replace(/\s+/g, "").replace(/[.,·、()\[\]{}]/g, "").toLowerCase();
}

export function matchKeywords(userText, keywords) {
  const u = normalizeAnswer(userText);
  return keywords.map((k) => ({ keyword: k, hit: u.includes(normalizeAnswer(k)) }));
}
