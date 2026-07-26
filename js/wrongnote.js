// 오답노트: 테스트·시험·랜덤에서 'X 틀림'을 누른 문제의 qid를 누적한다.
const KEY = "jeseon:wrongnote";

export function listWrong(store) {
  const raw = store.getItem(KEY);
  return raw ? JSON.parse(raw) : [];
}

export function addWrong(store, qid) {
  const list = listWrong(store);
  if (!list.includes(qid)) {
    list.push(qid);
    store.setItem(KEY, JSON.stringify(list));
  }
}

export function removeWrong(store, qid) {
  const list = listWrong(store).filter((x) => x !== qid);
  store.setItem(KEY, JSON.stringify(list));
}

export function clearWrong(store) {
  store.removeItem(KEY);
}
