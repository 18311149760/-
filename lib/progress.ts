import { DIFFICULTIES, LEVELS, freshSave, gameReducer, getRun, isExhausted, isSolved, parseSave, rating, type Action, type Difficulty, type Save } from './game.ts';

export const HISTORY_LIMIT = 500;
export const MAX_PROGRESS_BYTES = 2_000_000;
export type Attempt = { id: string; level: number; difficulty: Difficulty; result: 'won' | 'exhausted'; moves: number; hints: number; stars: number; finishedAt: number };
export type ProgressData = { version: 1; save: Save; updatedAt: number; runUpdatedAt: Record<string, number>; history: Attempt[] };
export function freshProgress(save = freshSave()): ProgressData {
  return { version: 1, save, updatedAt: 0, runUpdatedAt: {}, history: [] };
}
export function progressKey(userId: string | null): string { return `starry-progress:${userId ? `user:${userId}` : 'guest'}`; }
const timestamp = (value: unknown): value is number => Number.isSafeInteger(value) && (value as number) >= 0 && (value as number) <= 8_640_000_000_000_000;

// Reject malformed cloud data instead of silently replacing a real save with a fresh game.
export function readProgress(value: unknown): ProgressData | null {
  if (!value || typeof value !== 'object') return null;
  const data = value as ProgressData;
  if (data.version !== 1 || !data.save || data.save.version !== 2 || !timestamp(data.updatedAt) || !data.runUpdatedAt || Array.isArray(data.runUpdatedAt) || !Array.isArray(data.history) || data.history.length > HISTORY_LIMIT) return null;
  const rawSave = JSON.stringify(data.save), save = parseSave(rawSave);
  if (JSON.stringify(save) !== rawSave || Object.keys(save.runs).length > 108) return null;
  if (Object.entries(save.runs).some(([key, run]) => !/^(easy|standard|challenge):([1-9]|[12]\d|3[0-6])$/.test(key) || run.history.length > 250)) return null;
  if (Object.entries(data.runUpdatedAt).some(([key, at]) => !Object.hasOwn(save.runs, key) || !timestamp(at) || at > data.updatedAt)) return null;
  const ids = new Set<string>();
  for (const entry of data.history) {
    if (!entry || typeof entry.id !== 'string' || !/^[a-zA-Z0-9_-]{8,80}$/.test(entry.id) || ids.has(entry.id) || !Number.isInteger(entry.level) || !LEVELS[entry.level - 1] || !DIFFICULTIES.some(d => d.id === entry.difficulty) || !['won', 'exhausted'].includes(entry.result) || !Number.isSafeInteger(entry.moves) || entry.moves < 0 || !Number.isSafeInteger(entry.hints) || entry.hints < 0 || ![0, 1, 2, 3].includes(entry.stars) || !timestamp(entry.finishedAt) || entry.finishedAt > data.updatedAt || (entry.result === 'exhausted' ? entry.stars !== 0 : entry.stars === 0)) return null;
    ids.add(entry.id);
  }
  return {
    version: 1,
    save: { version: 2, current: save.current, difficulty: save.difficulty, best: Object.fromEntries(Object.entries(save.best).map(([id, b]) => [id, { stars: b.stars, moves: b.moves }])), runs: Object.fromEntries(Object.entries(save.runs).map(([key, r]) => [key, { turns: r.turns, history: r.history.map(h => ({ index: h.index, previous: h.previous })), moves: r.moves, hints: r.hints }])) },
    updatedAt: data.updatedAt, runUpdatedAt: { ...data.runUpdatedAt },
    history: data.history.map(h => ({ id: h.id, level: h.level, difficulty: h.difficulty, result: h.result, moves: h.moves, hints: h.hints, stars: h.stars, finishedAt: h.finishedAt })),
  };
}

export function advanceProgress(data: ProgressData, action: Action, id: string, now = Date.now()): ProgressData {
  const save = gameReducer(data.save, action);
  if (save === data.save) return data;
  const at = Math.max(now, data.updatedAt + 1), runUpdatedAt = { ...data.runUpdatedAt };
  for (const [key, run] of Object.entries(save.runs)) if (run !== data.save.runs[key]) runUpdatedAt[key] = at;
  let history = data.history;
  if (action.type === 'rotate' || action.type === 'hint') {
    const level = LEVELS[save.current - 1], run = getRun(save);
    const won = isSolved(level, run), exhausted = isExhausted(level, run, save.difficulty);
    if (won || exhausted) {
      const entry: Attempt = { id, level: save.current, difficulty: save.difficulty, result: won ? 'won' : 'exhausted', moves: run.moves, hints: run.hints, stars: won ? rating(level, run) : 0, finishedAt: at };
      history = [...history, entry].slice(-HISTORY_LIMIT);
    }
  }
  return { version: 1, save, updatedAt: at, runUpdatedAt, history };
}

function newer<T>(a: T, aTime: number, b: T, bTime: number): T {
  return aTime === bTime ? (JSON.stringify(a) > JSON.stringify(b) ? a : b) : aTime > bTime ? a : b;
}
// Merge is deterministic and idempotent; retrying an offline upload never duplicates a result.
export function mergeProgress(a: ProgressData, b: ProgressData): ProgressData {
  const latest = newer({ current: a.save.current, difficulty: a.save.difficulty }, a.updatedAt, { current: b.save.current, difficulty: b.save.difficulty }, b.updatedAt);
  const runs = { ...a.save.runs }, runUpdatedAt = { ...a.runUpdatedAt }, best = { ...a.save.best };
  for (const [key, run] of Object.entries(b.save.runs)) {
    runs[key] = runs[key] ? newer(runs[key], a.runUpdatedAt[key] ?? 0, run, b.runUpdatedAt[key] ?? 0) : run;
    runUpdatedAt[key] = Math.max(a.runUpdatedAt[key] ?? 0, b.runUpdatedAt[key] ?? 0);
  }
  for (const [id, score] of Object.entries(b.save.best)) {
    const old = best[Number(id)];
    if (!old || score.stars > old.stars || (score.stars === old.stars && score.moves < old.moves)) best[Number(id)] = score;
  }
  const attempts = new Map(a.history.map(h => [h.id, h]));
  for (const h of b.history) attempts.set(h.id, attempts.has(h.id) ? newer(attempts.get(h.id)!, attempts.get(h.id)!.finishedAt, h, h.finishedAt) : h);
  return { version: 1, save: { version: 2, ...latest, runs, best }, updatedAt: Math.max(a.updatedAt, b.updatedAt), runUpdatedAt, history: [...attempts.values()].sort((x, y) => x.finishedAt - y.finishedAt || x.id.localeCompare(y.id)).slice(-HISTORY_LIMIT) };
}

export function sameProgress(a: ProgressData, b: ProgressData): boolean {
  const canonical = (data: ProgressData) => JSON.stringify({ version: 1, updatedAt: data.updatedAt, save: { version: 2, difficulty: data.save.difficulty, current: data.save.current, runs: Object.fromEntries(Object.entries(data.save.runs).sort(([a], [b]) => a.localeCompare(b))), best: Object.fromEntries(Object.entries(data.save.best).sort(([a], [b]) => a.localeCompare(b))) }, runUpdatedAt: Object.fromEntries(Object.keys(data.save.runs).sort().map(key => [key, data.runUpdatedAt[key] ?? 0])), history: data.history });
  return canonical(a) === canonical(b);
}
