import test from 'node:test';
import assert from 'node:assert/strict';
import { DIFFICULTIES, LEVELS, LEVEL_COUNT, connected, freshRun, freshSave, gameReducer, getRun, hintCost, hintIndex, isExhausted, isSolved, makeLevel, masksFor, moveLimit, neighbor, parseSave, rotate, unlocked } from '../lib/game.ts';

function startingAt(level, difficulty = 'standard') {
  return { ...freshSave(), current: level.id, difficulty, runs: { [`${difficulty}:${level.id}`]: freshRun(level) } };
}
function solve(save) {
  const level = LEVELS[save.current - 1];
  for (let index = 0; index < level.solution.length && !isSolved(level, getRun(save)); index++) {
    let rotations = 0;
    while (masksFor(level, getRun(save))[index] !== level.solution[index] && !isSolved(level, getRun(save))) {
      save = gameReducer(save, { type: 'rotate', index });
      assert.ok(++rotations <= 3, 'solution must be reachable under the cap');
    }
  }
  return save;
}

test('36 deterministic puzzles start unsolved and have a connected, leak-free tree solution', () => {
  assert.equal(LEVELS.length, LEVEL_COUNT);
  for (const level of LEVELS) {
    assert.deepEqual(makeLevel(level.id), level);
    assert.equal(isSolved(level, freshRun(level)), false);
    assert.equal(connected(level.solution, level.source, level.size).size, level.size ** 2);
    let ports = 0;
    level.solution.forEach((mask, i) => {
      assert.ok(mask > 0 && mask < 16);
      for (let d = 0; d < 4; d++) if (mask & (1 << d)) {
        ports++; const next = neighbor(i, d, level.size);
        assert.ok(next >= 0);
        assert.ok(level.solution[next] & (1 << ((d + 2) % 4)));
      }
    });
    assert.equal(ports, 2 * (level.size ** 2 - 1));
    assert.ok(moveLimit(level, 'easy') > moveLimit(level, 'standard'));
    assert.ok(moveLimit(level, 'standard') > moveLimit(level, 'challenge'));
    assert.ok(moveLimit(level, 'challenge') >= level.par);
  }
});

test('all 108 level and difficulty combinations are solvable, rated, unlocked and reloadable', () => {
  for (const { id: difficulty } of DIFFICULTIES) {
    let save = gameReducer(freshSave(), { type: 'difficulty', difficulty });
    for (const level of LEVELS) {
      save = gameReducer(save, { type: 'select', level: level.id });
      assert.equal(save.current, level.id); assert.equal(save.difficulty, difficulty);
      save = solve(save);
      assert.equal(isSolved(level, getRun(save)), true, `${difficulty} ${level.id}`);
      assert.ok(getRun(save).moves <= moveLimit(level, difficulty));
      assert.equal(save.best[level.id].stars, 3);
      assert.equal(unlocked(save), Math.min(level.id + 1, LEVEL_COUNT));
      const restored = parseSave(JSON.stringify(save));
      assert.deepEqual(restored, save);
      save = restored;
    }
    assert.equal(Object.keys(save.best).length, 36);
  }
});

test('hints from the initial board converge within the budget in every difficulty', () => {
  for (const { id: difficulty } of DIFFICULTIES) for (const level of LEVELS) {
    let save = startingAt(level, difficulty), hints = 0;
    while (!isSolved(level, getRun(save))) {
      const index = hintIndex(level, getRun(save)), cost = hintCost(level, getRun(save), index), before = getRun(save).moves;
      assert.ok(index >= 0 && cost >= 1 && cost <= 3);
      save = gameReducer(save, { type: 'hint', index });
      assert.equal(getRun(save).moves - before, cost);
      assert.ok(++hints <= level.solution.length);
    }
    assert.ok(getRun(save).moves <= moveLimit(level, difficulty));
    assert.ok(save.best[level.id]);
  }
});

test('the last allowed rotation can win in all 108 combinations', () => {
  for (const { id: difficulty } of DIFFICULTIES) for (const level of LEVELS) {
    const save = startingAt(level, difficulty);
    getRun(save).moves = moveLimit(level, difficulty) - level.par;
    const done = solve(save);
    assert.equal(isSolved(level, getRun(done)), true);
    assert.equal(isExhausted(level, getRun(done), difficulty), false);
    assert.equal(getRun(done).moves, moveLimit(level, difficulty));
    assert.ok(done.best[level.id]);
  }
});

test('exhaustion freezes rotation, hints and undo; retries reset the budget', () => {
  for (const { id: difficulty } of DIFFICULTIES) for (const level of LEVELS) {
    let save = startingAt(level, difficulty);
    const limit = moveLimit(level, difficulty);
    const index = level.solution.findIndex((mask, i) => !level.fixed.includes(i) && mask !== 15 && !isSolved(level, getRun(gameReducer(save, { type: 'rotate', index: i }))));
    assert.ok(index >= 0);
    for (let n = 0; n < limit; n++) {
      save = gameReducer(save, { type: 'rotate', index });
      if (n < limit - 1) save = gameReducer(save, { type: 'undo' });
    }
    assert.equal(getRun(save).moves, limit);
    assert.equal(isExhausted(level, getRun(save), difficulty), true);
    for (const action of [{ type: 'rotate', index }, { type: 'hint', index: hintIndex(level, getRun(save)) }, { type: 'undo' }]) assert.equal(gameReducer(save, action), save);
    assert.equal(save.best[level.id], undefined);
    const again = gameReducer(save, { type: 'restart' });
    assert.deepEqual(getRun(again), freshRun(level));
    assert.equal(again.difficulty, difficulty);
  }
});

test('an unaffordable hint is rejected atomically without overspending', () => {
  const level = LEVELS.find(l => hintCost(l, freshRun(l), hintIndex(l, freshRun(l))) >= 2);
  assert.ok(level);
  const save = startingAt(level), run = getRun(save), index = hintIndex(level, run), cost = hintCost(level, run, index);
  run.moves = moveLimit(level, save.difficulty) - cost + 1;
  assert.equal(gameReducer(save, { type: 'hint', index }), save);
  assert.equal(run.hints, 0); assert.equal(run.history.length, 0);
});

test('undo restores only the board; fixed cells and unavailable levels do not spend moves', () => {
  const save = freshSave(), level = LEVELS[0], index = hintIndex(level, getRun(save));
  assert.equal(gameReducer(save, { type: 'rotate', index: level.source }), save);
  assert.equal(gameReducer(save, { type: 'select', level: 36 }), save);
  assert.equal(gameReducer(save, { type: 'undo' }), save);
  const changed = gameReducer(save, { type: 'rotate', index }), undone = gameReducer(changed, { type: 'undo' });
  assert.deepEqual(getRun(undone).turns, getRun(save).turns);
  assert.equal(getRun(undone).moves, 1); assert.equal(getRun(save).moves, 0);
  const hinted = gameReducer(save, { type: 'hint', index });
  assert.equal(getRun(gameReducer(hinted, { type: 'undo' })).hints, 1);
});

test('difficulty changes restart this level and preserve scores and other saved boards', () => {
  let save = solve(freshSave());
  const best = structuredClone(save.best), firstRun = structuredClone(getRun(save));
  save = gameReducer(save, { type: 'select', level: 2 });
  save = gameReducer(save, { type: 'rotate', index: hintIndex(LEVELS[1], getRun(save)) });
  const progress = structuredClone(getRun(save));
  save = gameReducer(save, { type: 'select', level: 1 });
  save = gameReducer(save, { type: 'select', level: 2 });
  assert.deepEqual(getRun(save), progress);
  const changed = gameReducer(save, { type: 'difficulty', difficulty: 'challenge' });
  assert.deepEqual(getRun(changed), freshRun(LEVELS[1]));
  assert.deepEqual(changed.runs['standard:1'], firstRun);
  assert.deepEqual(changed.runs['standard:2'], progress);
  assert.deepEqual(changed.best, best);
  assert.deepEqual(parseSave(JSON.stringify(changed)), changed);
  assert.equal(gameReducer(changed, { type: 'difficulty', difficulty: 'challenge' }), changed);
  const restarted = gameReducer(changed, { type: 'restart' });
  assert.deepEqual(restarted.best, best);
});

test('v1 migration retains boards and stars, including old runs beyond the new cap', () => {
  const old = { version: 1, current: 2, runs: { 1: freshRun(LEVELS[0]), 2: { ...freshRun(LEVELS[1]), moves: 99, hints: 3 } }, best: { 1: { stars: 3, moves: 2 } } };
  const migrated = parseSave(JSON.stringify(old));
  assert.equal(migrated.version, 2); assert.equal(migrated.difficulty, 'standard');
  assert.deepEqual(migrated.best, old.best);
  assert.deepEqual(migrated.runs['standard:1'], old.runs[1]);
  assert.deepEqual(getRun(migrated), old.runs[2]);
  assert.equal(isExhausted(LEVELS[1], getRun(migrated), 'standard'), true);
  assert.deepEqual(gameReducer(migrated, { type: 'restart' }).best, old.best);
});

test('invalid storage recovers safely and connectivity does not wrap rows', () => {
  for (const raw of [null, '', 'broken', '{}', 'null', '{"version":9}', JSON.stringify({ ...freshSave(), difficulty: 'bad' }), JSON.stringify({ ...freshSave(), current: 88 }), JSON.stringify({ ...freshSave(), runs: { 'standard:1': { turns: [4] } } })]) assert.deepEqual(parseSave(raw), freshSave());
  assert.deepEqual(parseSave(JSON.stringify(freshSave())), freshSave());
  assert.equal(rotate(1), 2); assert.equal(rotate(8), 1); assert.equal(rotate(5, 2), 5);
  assert.equal(connected([0, 2, 8, 0], 1, 2).size, 1);
});
