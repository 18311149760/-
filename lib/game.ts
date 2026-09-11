export const LEVEL_COUNT = 36;
export const STORAGE_KEY = 'starry-puzzle-v1';
export const DIFFICULTIES = [
  { id: 'easy', label: '轻松', description: '多一点尝试空间' },
  { id: 'standard', label: '标准', description: '先想一想再动手' },
  { id: 'challenge', label: '挑战', description: '让每一步都算数' },
] as const;
export type Difficulty = typeof DIFFICULTIES[number]['id'];
export const CHAPTERS = [
  { name: '初见微光', caption: '从一颗星星开始', size: 3 },
  { name: '漫游星野', caption: '让思路多拐个弯', size: 4 },
  { name: '拥抱银河', caption: '把整片星光连起来', size: 5 },
];
export type Level = { id: number; size: number; source: number; solution: number[]; initial: number[]; par: number; fixed: number[] };
export type Run = { turns: number[]; history: { index: number; previous: number }[]; moves: number; hints: number };
export type Save = { version: 2; difficulty: Difficulty; current: number; runs: Record<string, Run>; best: Record<number, { stars: number; moves: number }> };
export type Action = { type: 'rotate' | 'hint'; index: number } | { type: 'undo' } | { type: 'restart' } | { type: 'select'; level: number } | { type: 'difficulty'; difficulty: Difficulty };

export function moveLimit(level: Level, difficulty: Difficulty): number {
  if (difficulty === 'easy') return level.par * 2 + level.size;
  if (difficulty === 'challenge') return level.par + Math.max(1, Math.ceil(level.par * .2));
  return Math.ceil(level.par * 1.5) + Math.max(2, Math.floor(level.size / 2));
}
function runKey(save: Save, level = save.current): string { return `${save.difficulty}:${level}`; }
export function isExhausted(level: Level, run: Run, difficulty: Difficulty): boolean { return run.moves >= moveLimit(level, difficulty) && !isSolved(level, run); }

export function rotate(mask: number, turns = 1): number {
  for (let n = 0; n < ((turns % 4) + 4) % 4; n++) mask = ((mask << 1) & 15) | (mask >> 3);
  return mask;
}
function rng(seed: number) {
  return () => {
    seed |= 0; seed = (seed + 0x6d2b79f5) | 0;
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
export function neighbor(index: number, direction: number, size: number): number {
  const row = Math.floor(index / size), col = index % size;
  if (direction === 0) return row > 0 ? index - size : -1;
  if (direction === 1) return col < size - 1 ? index + 1 : -1;
  if (direction === 2) return row < size - 1 ? index + size : -1;
  return col > 0 ? index - 1 : -1;
}
export function connected(masks: number[], source: number, size: number): Set<number> {
  const seen = new Set([source]), queue = [source];
  for (let n = 0; n < queue.length; n++) {
    const index = queue[n];
    for (let d = 0; d < 4; d++) {
      const next = neighbor(index, d, size);
      if (next >= 0 && !seen.has(next) && (masks[index] & (1 << d)) && (masks[next] & (1 << ((d + 2) % 4)))) {
        seen.add(next); queue.push(next);
      }
    }
  }
  return seen;
}
export function makeLevel(id: number): Level {
  const size = CHAPTERS[Math.floor((id - 1) / 12)].size;
  const random = rng(id * 9041 + 20260905), count = size * size;
  const source = Math.floor(size / 2) * size + Math.floor(size / 2);
  const solution = Array<number>(count).fill(0), visited = new Set([source]), frontier = [source];
  while (visited.size < count) {
    const index = frontier[Math.floor(random() * frontier.length)];
    const directions = [0, 1, 2, 3].filter(d => { const next = neighbor(index, d, size); return next >= 0 && !visited.has(next); });
    if (!directions.length) { frontier.splice(frontier.indexOf(index), 1); continue; }
    const d = directions[Math.floor(random() * directions.length)], next = neighbor(index, d, size);
    solution[index] |= 1 << d; solution[next] |= 1 << ((d + 2) % 4);
    visited.add(next); frontier.push(next);
  }
  const shuffled = Array.from({ length: count }, (_, i) => i).filter(i => i !== source && solution[i] !== 15);
  for (let i = shuffled.length - 1; i > 0; i--) { const j = Math.floor(random() * (i + 1)); [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]]; }
  const changedCount = id < 4 ? id + 1 : Math.min(count - 1, 4 + Math.floor(id * .7));
  const changed = new Set(shuffled.slice(0, changedCount));
  const initial = solution.map((mask, i) => {
    if (!changed.has(i)) return 0;
    const possibilities = [1, 2, 3].filter(t => rotate(mask, t) !== mask);
    return possibilities[Math.floor(random() * possibilities.length)] ?? 0;
  });
  const fixed = id <= 3 ? shuffled.filter(i => !changed.has(i)).concat(source) : [source];
  const par = initial.reduce((sum, t, i) => { let clicks = 0; while (rotate(solution[i], t + clicks) !== solution[i]) clicks++; return sum + clicks; }, 0);
  return { id, size, source, solution, initial, par, fixed };
}
export const LEVELS = Array.from({ length: LEVEL_COUNT }, (_, i) => makeLevel(i + 1));
export function freshRun(level: Level): Run { return { turns: [...level.initial], history: [], moves: 0, hints: 0 }; }
export function freshSave(): Save { return { version: 2, difficulty: 'standard', current: 1, runs: { 'standard:1': freshRun(LEVELS[0]) }, best: {} }; }
export function getRun(save: Save): Run { return save.runs[runKey(save)] ?? freshRun(LEVELS[save.current - 1]); }
export function masksFor(level: Level, run: Run): number[] { return level.solution.map((mask, i) => rotate(mask, run.turns[i])); }
export function isSolved(level: Level, run: Run): boolean { return connected(masksFor(level, run), level.source, level.size).size === level.size ** 2; }
export function unlocked(save: Save): number { let last = 1; while (last < LEVEL_COUNT && save.best[last]) last++; return last; }
export function rating(level: Level, run: Run): number {
  if (run.hints === 0 && run.moves <= level.par + 3) return 3;
  if (run.hints <= 1 && run.moves <= level.par * 2 + 6) return 2;
  return 1;
}
export function hintIndex(level: Level, run: Run): number {
  const masks = masksFor(level, run), order = [level.source], seen = new Set(order);
  for (let n = 0; n < order.length; n++) {
    const index = order[n];
    if (!level.fixed.includes(index) && masks[index] !== level.solution[index]) return index;
    for (let d = 0; d < 4; d++) {
      const next = neighbor(index, d, level.size);
      if ((level.solution[index] & (1 << d)) && next >= 0 && !seen.has(next)) { seen.add(next); order.push(next); }
    }
  }
  return -1;
}
export function hintCost(level: Level, run: Run, index: number): number {
  if (index < 0 || index >= level.solution.length || level.fixed.includes(index)) return 0;
  let steps = 0;
  while (rotate(level.solution[index], run.turns[index] + steps) !== level.solution[index]) steps++;
  return steps;
}
export function gameReducer(save: Save, action: Action): Save {
  if (action.type === 'difficulty') {
    if (!DIFFICULTIES.some(d => d.id === action.difficulty) || action.difficulty === save.difficulty) return save;
    return { ...save, difficulty: action.difficulty, runs: { ...save.runs, [`${action.difficulty}:${save.current}`]: freshRun(LEVELS[save.current - 1]) } };
  }
  if (action.type === 'select') {
    if (!Number.isInteger(action.level) || action.level < 1 || action.level > unlocked(save)) return save;
    const key = runKey(save, action.level);
    return { ...save, current: action.level, runs: { ...save.runs, [key]: save.runs[key] ?? freshRun(LEVELS[action.level - 1]) } };
  }
  const level = LEVELS[save.current - 1], old = getRun(save), key = runKey(save);
  if (action.type === 'restart') return { ...save, runs: { ...save.runs, [key]: freshRun(level) } };
  if (isSolved(level, old) || isExhausted(level, old, save.difficulty)) return save;
  let run: Run;
  if (action.type === 'undo') {
    if (!old.history.length) return save;
    const last = old.history.at(-1)!;
    run = { ...old, turns: old.turns.map((t, i) => i === last.index ? last.previous : t), history: old.history.slice(0, -1) };
  } else {
    const i = action.index;
    if (!Number.isInteger(i) || i < 0 || i >= old.turns.length || level.fixed.includes(i) || level.solution[i] === 15) return save;
    let steps = 1;
    if (action.type === 'hint') {
      steps = hintCost(level, old, i);
      if (!steps) return save;
    }
    if (old.moves + steps > moveLimit(level, save.difficulty)) return save;
    run = { turns: old.turns.map((t, index) => index === i ? t + steps : t), history: [...old.history, { index: i, previous: old.turns[i] }].slice(-250), moves: old.moves + steps, hints: old.hints + (action.type === 'hint' ? 1 : 0) };
  }
  const next = { ...save, runs: { ...save.runs, [key]: run } };
  if (isSolved(level, run)) {
    const stars = rating(level, run), previous = save.best[save.current];
    if (!previous || stars > previous.stars || (stars === previous.stars && run.moves < previous.moves)) next.best = { ...save.best, [save.current]: { stars, moves: run.moves } };
  }
  return next;
}
export function parseSave(raw: string | null): Save {
  if (!raw) return freshSave();
  try {
    const parsed = JSON.parse(raw);
    if (!parsed || ![1, 2].includes(parsed.version) || !parsed.runs || !parsed.best) return freshSave();
    // The original unlimited version used numeric run keys. Retain its boards and scores.
    const save: Save = parsed.version === 1 ? { ...parsed, version: 2, difficulty: 'standard', runs: Object.fromEntries(Object.entries(parsed.runs).map(([id, run]) => [`standard:${id}`, run])) } : parsed;
    if (!DIFFICULTIES.some(d => d.id === save.difficulty) || !Number.isInteger(save.current) || save.current < 1 || save.current > LEVEL_COUNT) return freshSave();
    for (const [key, run] of Object.entries(save.runs)) {
      const match = /^(easy|standard|challenge):(\d+)$/.exec(key);
      const level = match ? LEVELS[Number(match[2]) - 1] : undefined;
      if (!level || !Array.isArray(run.turns) || run.turns.length !== level.size ** 2 || !run.turns.every(t => Number.isSafeInteger(t) && t >= 0) || !Array.isArray(run.history) || !Number.isSafeInteger(run.moves) || run.moves < 0 || !Number.isSafeInteger(run.hints) || run.hints < 0) return freshSave();
      if (level.fixed.some(i => run.turns[i] !== 0) || run.history.some(h => !h || !Number.isInteger(h.index) || h.index < 0 || h.index >= run.turns.length || !Number.isSafeInteger(h.previous) || h.previous < 0)) return freshSave();
    }
    for (const [id, best] of Object.entries(save.best)) if (!LEVELS[Number(id) - 1] || !best || ![1, 2, 3].includes(best.stars) || !Number.isSafeInteger(best.moves) || best.moves < 0) return freshSave();
    if (save.current > unlocked(save)) return freshSave();
    return save;
  } catch { return freshSave(); }
}
