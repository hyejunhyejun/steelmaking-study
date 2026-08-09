// 오답노트: 테스트·시험·랜덤에서 'X 틀림'을 누른 문제의 qid를 누적한다.
const KEY = "jeseon:wrongnote";
// 지운 기록 — 이게 없으면 다른 기기에서 되살아난다
const GONE = "jeseon:wrongRemoved";

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
}

export function removeWrong(store, qid) {
  const gone = listRemoved(store);
  if (!gone.includes(qid)) { gone.push(qid); setRemoved(store, gone); }
  store.setItem(KEY, JSON.stringify(listWrong(store).filter((x) => x !== qid)));
}

export function clearWrong(store) {
  setRemoved(store, [...new Set([...listRemoved(store), ...listWrong(store)])]);
  store.removeItem(KEY);
}

// 기기 간 이동용: 목록을 링크/코드로 주고받는다(서버가 없으므로)
export function mergeWrong(store, qids) {
  const list = listWrong(store);
  for (const q of qids) if (q && !list.includes(q)) list.push(q);
  store.setItem(KEY, JSON.stringify(list));
  return list;
}

export function parseWrongCode(text) {
  return String(text).trim().replace(/^.*#w=/, "")
    .split(/[,\s]+/).map((s) => s.trim()).filter(Boolean);
}
