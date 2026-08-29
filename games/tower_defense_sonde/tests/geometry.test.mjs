import { strict as assert } from 'assert';
import { test } from 'node:test';
import {
  pathCells, isBuildable, isPathCell, tripleCoverageCells,
  countPathSegmentsSeen, distToPath, GRID_WIDTH, GRID_HEIGHT
} from '../config/geometry.mjs';

// ROOT of the "map and its surface" suite. The sealed mutation command has
// exactly four entry points (see run-oracle.mjs), and every module of the
// blueprint must be reachable from one of them — a test the sealed command never
// executes kills no mutant. This root carries the map, the canvas view drawn from
// it, and the composition root that drives that view.
//
// input.test.mjs is deliberately rooted elsewhere (tests/solvability.test.mjs):
// it installs its own globalThis.document double, which would collide with the
// one main.test.mjs installs if both ran in this process.
import './render.test.mjs';
import './main.test.mjs';

// R1 golden: the hairpin is a FIXED table (blueprint: "config = tables figees",
// "chemin en epingle code en dur"). Asserting the whole polyline cell-by-cell is
// what makes the generator's ring math load-bearing: any change to the spiral
// bounds, the entry lane, or a loop guard moves at least one cell and fails here.
// Produced by executing config/geometry.mjs#pathCells() and frozen.
const PATH_GOLDEN = [
  [19, 0], [18, 0], [17, 0], [16, 0], [15, 0], [14, 0], [13, 0], [12, 0], [11, 0], [10, 0],
  [9, 0], [8, 0], [7, 0], [6, 0], [5, 0], [4, 0], [3, 0], [2, 0], [1, 0], [0, 0],
  [0, 1], [0, 2], [0, 3], [0, 4], [0, 5], [0, 6],
  [1, 6], [2, 6], [3, 6], [4, 6], [5, 6], [6, 6],
  [6, 5], [6, 4], [6, 3], [6, 2], [6, 1],
  [5, 1], [4, 1],
  [4, 2], [3, 2], [2, 2],
  [2, 3], [2, 4],
  [3, 4], [4, 4], [4, 3]
];

export const PATH_LENGTH = PATH_GOLDEN.length; // 47

test('R1: the hairpin path is the exact frozen polyline (cell by cell)', () => {
  const path = pathCells();
  assert.equal(path.length, PATH_LENGTH, 'path length is the frozen table length');
  assert.deepEqual(path, PATH_GOLDEN, 'every path cell matches the frozen table');
});

test('R1: path is continuous (each step moves exactly 1 cell, no jumps)', () => {
  const path = pathCells();
  for (let i = 0; i < path.length - 1; i++) {
    const [x0, y0] = path[i];
    const [x1, y1] = path[i + 1];
    assert.equal(Math.abs(x0 - x1) + Math.abs(y0 - y1), 1, `Path is continuous at segment ${i}`);
  }
});

test('R1b: path folds back on itself (real hairpin, not a straight lane)', () => {
  const path = pathCells();
  const xs = path.map(([x]) => x);
  assert.equal(Math.max(...xs), GRID_WIDTH - 1, 'entry lane starts on the far right edge');
  assert.equal(Math.min(...xs), 0, 'the spiral reaches the left edge');

  // A straight lane never reverses direction on an axis. Counting BOTH
  // directions to an exact expected number of reversals (not "at least one")
  // is what makes a flattened path fail here instead of silently passing.
  let increases = 0, decreases = 0;
  for (let i = 0; i < path.length - 1; i++) {
    if (path[i + 1][0] > path[i][0]) increases++;
    if (path[i + 1][0] < path[i][0]) decreases++;
  }
  assert.equal(decreases, 23, 'exact number of leftward steps');
  assert.equal(increases, 8, 'exact number of rightward steps (the folds)');
});

test('R1c: entry lane and dead-end pin are the exact frozen endpoints', () => {
  const path = pathCells();
  assert.deepEqual(path[0], [19, 0], 'enemies enter at the top-right corner');
  assert.deepEqual(path[path.length - 1], [4, 3], 'the lane dead-ends at the inner pin');
  assert.equal(distToPath(19, 0), 0, 'a path cell is at distance 0 from the path');
  assert.equal(distToPath(19, 11), 11, 'exact euclidean distance from the far corner');
});

test('R2: every non-path cell is buildable, every path cell is not', () => {
  const path = pathCells();
  let buildableCount = 0;
  for (let x = 0; x < GRID_WIDTH; x++) {
    for (let y = 0; y < GRID_HEIGHT; y++) {
      const isPath = path.some(([px, py]) => px === x && py === y);
      assert.equal(isPathCell(x, y), isPath, `isPathCell mismatch at (${x},${y})`);
      assert.equal(isBuildable(x, y), !isPath, `isBuildable mismatch at (${x},${y})`);
      if (!isPath) buildableCount++;
    }
  }
  assert.equal(buildableCount, GRID_WIDTH * GRID_HEIGHT - PATH_LENGTH, '240 cells - 47 path cells');
  assert.equal(buildableCount, 193);
});

test('R2b: out-of-bounds cells are never buildable', () => {
  assert.equal(isBuildable(-1, 0), false);
  assert.equal(isBuildable(GRID_WIDTH, 0), false);
  assert.equal(isBuildable(0, -1), false);
  assert.equal(isBuildable(0, GRID_HEIGHT), false);
});

test('R3: the pin is exactly 6 cells, each seeing an EXACT number of hairpin segments', () => {
  const triple = tripleCoverageCells();
  assert.equal(triple.length, 6, 'exactly 6 cells form the triple-coverage pin');
  assert.deepEqual(triple, [[1, 1], [1, 3], [3, 3], [5, 3], [5, 5], [7, 1]]);

  // Exact per-cell coverage (measured, then frozen) — an equality, never ">= 3":
  // a weaker path that still technically clears 3 segments would slip past a
  // threshold assertion but not past these.
  const expected = { '1,1': 3, '1,3': 3, '3,3': 4, '5,3': 4, '5,5': 3, '7,1': 3 };
  for (const [x, y] of triple) {
    assert.equal(isBuildable(x, y), true, `Pin cell (${x},${y}) must be buildable`);
    assert.equal(countPathSegmentsSeen(x, y), expected[`${x},${y}`],
      `Pin cell (${x},${y}) sees an exact number of distinct path segments`);
  }
  assert.equal(new Set(triple.map((c) => c.join(','))).size, 6, 'pin cells are distinct');
});

test('R3b: falsification twin — cells away from the folds see an EXACT lower count', () => {
  assert.equal(countPathSegmentsSeen(15, 6), 0, 'deep in the empty right half: sees nothing');
  assert.equal(countPathSegmentsSeen(8, 1), 1, 'beside the straight entry lane: exactly 1 segment');
});
