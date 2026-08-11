// 오답노트를 비공개 Gist 하나에 넣어 기기끼리 맞춘다.
// 토큰은 이 브라우저에만 저장되고 사이트 코드에는 들어가지 않는다.
const TOKEN = "jeseon:gistToken";
const GIST = "jeseon:gistId";
const FILE = "jeseon-wrongnote.json";
const API = "https://api.github.com";

export function isLinked(store) { return !!store.getItem(TOKEN); }
export function setToken(store, token) { store.setItem(TOKEN, String(token).trim()); }
export function unlink(store) { store.removeItem(TOKEN); store.removeItem(GIST); }

const head = (t) => ({ Authorization: `token ${t}`, Accept: "application/vnd.github+json" });

async function findGistId(token) {
  const r = await fetch(`${API}/gists?per_page=100`, { headers: head(token) });
  if (!r.ok) throw new Error(`GitHub 응답 ${r.status}`);
  return (await r.json()).find((g) => g.files && g.files[FILE])?.id || null;
}

// 원격과 로컬을 합쳐 저장하고 합친 목록을 돌려준다.
// 담은 것은 합집합, 지운 것은 removed 목록으로 남겨 어느 기기에서도 되살아나지 않게 한다.
export async function gistSync(store, localList, localRemoved = [], localCounts = {}) {
  const token = store.getItem(TOKEN);
  if (!token) return null;
  let id = store.getItem(GIST) || (await findGistId(token));
  let remote = [], remoteGone = [], remoteCounts = {};
  if (id) {
    const r = await fetch(`${API}/gists/${id}`, { headers: head(token) });
    if (r.ok) {
      try {
        const j = JSON.parse((await r.json()).files[FILE].content);
        remote = j.wrong || []; remoteGone = j.removed || [];
        remoteCounts = j.counts || {};
      } catch {}
    }
  }
  // 양쪽에서 담은 건 모두 살리고, 어느 쪽에서든 지운 건 뺀다
  const gone = new Set([...remoteGone, ...localRemoved]);
  const merged = [...new Set([...remote, ...localList])].filter((q) => !gone.has(q));
  // 틀린 횟수는 더 많이 틀린 기기 쪽을 살린다
  const mergedCounts = {};
  for (const q of merged) {
    mergedCounts[q] = Math.max(remoteCounts[q] || 0, localCounts[q] || 0) || 1;
  }
  const body = JSON.stringify({
    description: "제선기능장 오답노트 (기기 간 동기화)",
    public: false,
    files: { [FILE]: { content: JSON.stringify(
      { wrong: merged, removed: [...gone], counts: mergedCounts }, null, 1) } },
  });
  const res = await fetch(id ? `${API}/gists/${id}` : `${API}/gists`,
    { method: id ? "PATCH" : "POST", headers: head(token), body });
  if (!res.ok) throw new Error(`저장 실패 ${res.status}`);
  if (!id) store.setItem(GIST, (await res.json()).id);
  store.setItem("jeseon:wrongRemoved", JSON.stringify([...gone]));
  store.setItem("jeseon:wrongCount", JSON.stringify(mergedCounts));
  return merged;
}
