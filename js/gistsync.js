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
// ponytail: 합집합 방식이라 한 기기에서 지운 항목이 다른 기기에 남아 있으면 되살아난다.
// 삭제 직후 곧바로 push하므로 실사용엔 충분. 문제되면 삭제 표시(tombstone)를 추가.
export async function gistSync(store, localList, { replace = false } = {}) {
  const token = store.getItem(TOKEN);
  if (!token) return null;
  let id = store.getItem(GIST) || (await findGistId(token));
  let remote = [];
  if (id) {
    const r = await fetch(`${API}/gists/${id}`, { headers: head(token) });
    if (r.ok) {
      try { remote = JSON.parse((await r.json()).files[FILE].content).wrong || []; } catch {}
    }
  }
  const merged = replace ? localList : [...new Set([...remote, ...localList])];
  const body = JSON.stringify({
    description: "제선기능장 오답노트 (기기 간 동기화)",
    public: false,
    files: { [FILE]: { content: JSON.stringify({ wrong: merged }, null, 1) } },
  });
  const res = await fetch(id ? `${API}/gists/${id}` : `${API}/gists`,
    { method: id ? "PATCH" : "POST", headers: head(token), body });
  if (!res.ok) throw new Error(`저장 실패 ${res.status}`);
  if (!id) store.setItem(GIST, (await res.json()).id);
  return merged;
}
