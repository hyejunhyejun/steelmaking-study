const KEY = (roundId) => `jeseon:progress:${roundId}`;

export function saveProgress(store, roundId, state) {
  store.setItem(KEY(roundId), JSON.stringify(state));
}

export function loadProgress(store, roundId) {
  const raw = store.getItem(KEY(roundId));
  return raw ? JSON.parse(raw) : null;
}
