import { test } from "node:test";
import assert from "node:assert/strict";
import { isLinked, setToken, unlink, gistSync } from "../js/gistsync.js";

function fakeStore(init = {}) {
  const m = new Map(Object.entries(init));
  return {
    getItem: (k) => (m.has(k) ? m.get(k) : null),
    setItem: (k, v) => m.set(k, v),
    removeItem: (k) => m.delete(k),
  };
}

function stubFetch(handlers) {
  const calls = [];
  globalThis.fetch = async (url, opt = {}) => {
    calls.push({ url, method: opt.method || "GET", body: opt.body });
    for (const [pattern, res] of handlers) {
      if (url.includes(pattern) && (!res.method || res.method === (opt.method || "GET"))) {
        return { ok: res.ok !== false, status: res.status || 200, json: async () => res.json };
      }
    }
    return { ok: false, status: 404, json: async () => ({}) };
  };
  return calls;
}

test("토큰이 없으면 아무것도 하지 않는다", async () => {
  const s = fakeStore();
  assert.equal(isLinked(s), false);
  assert.equal(await gistSync(s, ["21-1-4"]), null);
});

test("원격과 로컬을 합쳐서 저장한다", async () => {
  const s = fakeStore({ "jeseon:gistToken": "tok", "jeseon:gistId": "g1" });
  const calls = stubFetch([
    ["gists/g1", { json: { files: { "jeseon-wrongnote.json": { content: JSON.stringify({ wrong: ["t12-58"] }) } } } }],
  ]);
  const merged = await gistSync(s, ["21-1-4"]);
  assert.deepEqual(merged, ["t12-58", "21-1-4"]);
  const patch = calls.find((c) => c.method === "PATCH");
  assert.ok(patch.body.includes("21-1-4") && patch.body.includes("t12-58"));
});

test("다른 기기에서 만든 Gist를 찾아 이어 쓴다(새로 만들지 않음)", async () => {
  const s = fakeStore({ "jeseon:gistToken": "tok" });
  stubFetch([
    ["gists?per_page", { json: [{ id: "found1", files: { "jeseon-wrongnote.json": {} } }] }],
    ["gists/found1", { json: { files: { "jeseon-wrongnote.json": { content: JSON.stringify({ wrong: ["a"] }) } } } }],
  ]);
  assert.deepEqual(await gistSync(s, ["b"]), ["a", "b"]);
});

test("replace 옵션은 로컬 목록으로 덮어쓴다(삭제 반영)", async () => {
  const s = fakeStore({ "jeseon:gistToken": "tok", "jeseon:gistId": "g1" });
  stubFetch([
    ["gists/g1", { json: { files: { "jeseon-wrongnote.json": { content: JSON.stringify({ wrong: ["a", "b"] }) } } } }],
  ]);
  assert.deepEqual(await gistSync(s, ["a"], { replace: true }), ["a"]);
});

test("연결 해제하면 토큰과 Gist 정보가 지워진다", () => {
  const s = fakeStore();
  setToken(s, " tok ");
  assert.equal(isLinked(s), true);
  unlink(s);
  assert.equal(isLinked(s), false);
});
