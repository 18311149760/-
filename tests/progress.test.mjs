import test from 'node:test';
import assert from 'node:assert/strict';
import { LEVELS, getRun, hintIndex, isSolved, masksFor } from '../lib/game.ts';
import { advanceProgress, freshProgress, mergeProgress, progressKey, readProgress, sameProgress, MAX_PROGRESS_BYTES } from '../lib/progress.ts';
import { progressHandler } from '../lib/progress-api.ts';

let sequence = 0;
const step = (progress, action, at = 1000 + sequence) => advanceProgress(progress, action, `attempt-${++sequence}`, at);
function solve(progress) {
  const level = LEVELS[progress.save.current - 1];
  for (let i = 0; i < level.solution.length; i++) {
    let count = 0;
    while (!isSolved(level, getRun(progress.save)) && masksFor(level, getRun(progress.save))[i] !== level.solution[i]) {
      progress = step(progress, { type: 'rotate', index: i });
      assert.ok(++count <= 3);
    }
  }
  return progress;
}
test('completed attempts have one durable record; replays have different IDs and old stars survive', () => {
  const first = solve(freshProgress());
  assert.equal(first.history.length, 1); assert.equal(first.history[0].result, 'won');
  assert.equal(first.history[0].stars, 3);
  assert.equal(step(first, { type: 'rotate', index: 1 }), first);
  const again = solve(step(first, { type: 'restart' }));
  assert.equal(again.history.length, 2); assert.notEqual(again.history[0].id, again.history[1].id);
  assert.deepEqual(again.save.best, first.save.best);
  assert.ok(sameProgress(readProgress(JSON.parse(JSON.stringify(again))), again));
});
test('exhausted attempts are recorded once; an undo does not invent a result', () => {
  let progress = freshProgress(); const index = hintIndex(LEVELS[0], getRun(progress.save));
  for (let i = 0; i < 5; i++) {
    progress = step(progress, { type: 'rotate', index });
    progress = step(progress, { type: 'undo' });
  }
  assert.equal(progress.history.length, 1); assert.equal(progress.history[0].result, 'exhausted');
  assert.equal(progress.history[0].stars, 0);
});
test('offline device merges preserve both histories and best scores; repeat uploads are idempotent', () => {
  const first = solve(freshProgress());
  const second = solve(step(first, { type: 'select', level: 2 }));
  const otherDevice = solve(step(first, { type: 'difficulty', difficulty: 'challenge' }));
  const merged = mergeProgress(second, otherDevice);
  assert.equal(merged.history.length, 3);
  assert.ok(merged.save.best[1]); assert.ok(merged.save.best[2]);
  assert.ok(sameProgress(merged, mergeProgress(otherDevice, second)));
  assert.ok(sameProgress(merged, mergeProgress(merged, second)));
  assert.ok(sameProgress(merged, mergeProgress(merged, merged)));
  assert.ok(readProgress(merged));
});
test('the newest board wins, including intentional restart; separate levels keep their own timestamps', () => {
  const done = solve(freshProgress());
  const deviceA = step(done, { type: 'restart' }, 100000);
  const deviceB = step(done, { type: 'select', level: 2 }, 90000);
  const merged = mergeProgress(deviceA, deviceB);
  assert.equal(merged.save.current, 1);
  assert.equal(merged.save.runs['standard:1'].moves, 0);
  assert.ok(merged.save.runs['standard:2']); assert.ok(merged.save.best[1]);
});
test('guest and account cache keys are isolated and malformed cloud saves are rejected', () => {
  assert.equal(new Set([progressKey(null), progressKey('alice'), progressKey('bob')]).size, 3);
  for (const input of [null, {}, { ...freshProgress(), save: { version: 2 } }, { ...freshProgress(), updatedAt: -1 }, { ...freshProgress(), runUpdatedAt: { 'invalid:1': 123 } }, { ...freshProgress(), history: [{ id: 'broken' }] }]) assert.equal(readProgress(input), null);
});

function memoryStore() {
  const values = new Map(); let serial = 0;
  return {
    values,
    async getWithMetadata(key) { const entry = values.get(key); return entry ? structuredClone(entry) : null; },
    async setJSON(key, data, conditions) {
      const current = values.get(key);
      if (conditions.onlyIfNew ? !!current : current?.etag !== conditions.onlyIfMatch) return { modified: false };
      values.set(key, { data: structuredClone(data), etag: String(++serial) }); return { modified: true };
    },
  };
}
const origin = 'https://game.example';
function request(progress = freshProgress(), userId = 'alice', overrides = {}) {
  return new Request(`${origin}/api/progress`, { method: 'POST', headers: { origin, 'content-type': 'application/json', 'x-starry-user': userId, ...overrides }, body: typeof progress === 'string' ? progress : JSON.stringify(progress) });
}
test('cloud API rejects anonymous, forged account and cross-site writes without touching storage', async () => {
  const store = memoryStore(); let user = null;
  const handler = progressHandler({ getUser: async () => user, getStore: () => store });
  assert.equal((await handler(request())).status, 401);
  user = { id: 'alice' };
  assert.equal((await handler(request(freshProgress(), 'bob'))).status, 409);
  assert.equal((await handler(request(freshProgress(), 'alice', { origin: 'https://attacker.example' }))).status, 403);
  assert.equal((await handler(request(freshProgress(), 'alice', { 'content-type': 'text/plain' }))).status, 415);
  assert.equal(store.values.size, 0);
});
test('accounts only read and merge their own data and every response forbids shared caching', async () => {
  const store = memoryStore();
  const alice = progressHandler({ getUser: async () => ({ id: 'alice' }), getStore: () => store });
  const bob = progressHandler({ getUser: async () => ({ id: 'bob' }), getStore: () => store });
  const a = await alice(request(solve(freshProgress())));
  assert.equal(a.status, 200); assert.match(a.headers.get('cache-control'), /private, no-store/);
  const b = await bob(request(freshProgress(), 'bob')); const bData = await b.json();
  assert.equal(bData.userId, 'bob'); assert.equal(bData.progress.history.length, 0); assert.deepEqual(bData.progress.save.best, {});
  assert.equal(store.values.size, 2);
});
test('simultaneous first uploads use conditional writes and preserve results from both devices', async () => {
  const store = memoryStore(), handler = progressHandler({ getUser: async () => ({ id: 'alice' }), getStore: () => store });
  const a = solve(freshProgress()), b = solve(step(freshProgress(), { type: 'difficulty', difficulty: 'challenge' }));
  const responses = await Promise.all([handler(request(a)), handler(request(b))]);
  assert.ok(responses.every(r => r.status === 200));
  const restored = await (await handler(request())).json();
  assert.equal(restored.progress.history.length, 2); assert.ok(restored.progress.save.runs['challenge:1']);
});
test('invalid and oversized data cannot erase a cloud save', async () => {
  const store = memoryStore(), handler = progressHandler({ getUser: async () => ({ id: 'alice' }), getStore: () => store });
  await handler(request(solve(freshProgress())));
  const before = JSON.stringify([...store.values]);
  assert.equal((await handler(request('{'))).status, 400);
  assert.equal((await handler(request({ ...freshProgress(), save: { bad: true } }))).status, 400);
  assert.equal((await handler(request(' '.repeat(MAX_PROGRESS_BYTES + 1)))).status, 413);
  assert.equal(JSON.stringify([...store.values]), before);
});
