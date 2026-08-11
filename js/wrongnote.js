// 오답노트: 테스트·시험·랜덤에서 'X 틀림'을 누른 문제의 qid를 누적한다.
const KEY = "jeseon:wrongnote";
// 지운 기록 — 이게 없으면 다른 기기에서 되살아난다
const GONE = "jeseon:wrongRemoved";
// 문제별 틀린 횟수 {qid: n} — 목록과 따로 둬서 기존 동기화를 건드리지 않는다
const CNT = "jeseon:wrongCount";

export function counts(store) {
  const raw = store.getItem(CNT);
  try { return raw ? JSON.parse(raw) : {}; } catch { return {}; }
}
function setCounts(store, c) { store.setItem(CNT, JSON.stringify(c)); }

export function countOf(store, qid) { return counts(store)[qid] || 0; }

// 틀릴 때마다 눌러 1씩 올린다. 목록에 없으면 같이 담긴다.
export function bumpWrong(store, qid) {
  const before = countOf(store, qid);   // addWrong이 1로 채우기 전 값
  addWrong(store, qid);
  const c = counts(store);
  c[qid] = before + 1;
  setCounts(store, c);
  return c[qid];
}

// 원격 카운트와 합칠 때는 큰 쪽을 남긴다(어느 기기에서 더 틀렸든 살린다)
export function mergeCounts(store, remote = {}) {
  const c = counts(store);
  for (const [q, n] of Object.entries(remote)) c[q] = Math.max(c[q] || 0, n || 0);
  for (const q of listRemoved(store)) delete c[q];
  setCounts(store, c);
  return c;
}

export function listRemoved(store) {
  const raw = store.getItem(GONE);
  return raw ? JSON.parse(raw) : [];
}
function setRemoved(store, list) { store.setItem(GONE, JSON.stringify(list)); }

export function listWrong(store) {
  const raw = store.getItem(KEY);
  return raw ? JSON.parse(raw) : [];
}

export function addWrong(store, qid) {
  setRemoved(store, listRemoved(store).filter((x) => x !== qid));
  const list = listWrong(store);
  if (!list.includes(qid)) {
    list.push(qid);
    store.setItem(KEY, JSON.stringify(list));
  }
  // 예전에 담아둔 문제는 횟수 기록이 없다 → 1회로 본다
  const c = counts(store);
  if (!c[qid]) { c[qid] = 1; setCounts(store, c); }
}

export function removeWrong(store, qid) {
  const gone = listRemoved(store);
  if (!gone.includes(qid)) { gone.push(qid); setRemoved(store, gone); }
  store.setItem(KEY, JSON.stringify(listWrong(store).filter((x) => x !== qid)));
  const c = counts(store); delete c[qid]; setCounts(store, c);
}

export function clearWrong(store) {
  setRemoved(store, [...new Set([...listRemoved(store), ...listWrong(store)])]);
  store.removeItem(KEY);
  store.removeItem(CNT);
}

// 기기 간 이동용: 목록을 링크/코드로 주고받는다(서버가 없으므로)
export function mergeWrong(store, qids) {
  const list = listWrong(store);
  const gone = listRemoved(store);   // 내가 지운 건 다시 들어오지 않게
  const c = counts(store);
  for (const q of qids) if (q && !list.includes(q) && !gone.includes(q)) {
    list.push(q);
    if (!c[q]) c[q] = 1;
  }
  setCounts(store, c);
  store.setItem(KEY, JSON.stringify(list));
  return list;
}

export function parseWrongCode(text) {
  return String(text).trim().replace(/^.*#w=/, "")
    .split(/[,\s]+/).map((s) => s.trim()).filter(Boolean);
}
