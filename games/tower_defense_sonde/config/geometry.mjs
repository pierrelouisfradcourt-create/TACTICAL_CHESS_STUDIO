// Geometry: fixed 20x12 grid, hand-authored hairpin (inward spiral) path, buildable
// cells, and the triple-coverage pin. Pure data + pure geometric functions — no
// mutable state, no simulation behavior (blueprint: config = tables figees).
export const GRID_WIDTH = 20;
export const GRID_HEIGHT = 12;

// Path is generated once by a deterministic algorithm (never Math.random/Date.now)
// so it is reproducible from this source and reviewable ring by ring, rather than
// an opaque hand-typed coordinate blob. Shape: an entry lane from the top-right
// corner feeding into an inward two-ring spiral (a true hairpin — the path folds
// back on itself at each ring transition) that dead-ends at the grid's inner pin.
// Reaching the center IS the "exit": `sim/movement.mjs` leaks an enemy once its
// progress index passes the last cell, exactly like any other path end.
const SPIRAL_BOX = 6; // inner spiral occupies x:[0,6] y:[0,6]

function bridgeSteps(from, to) {
  // Manhattan single-step bridge between two non-adjacent named segments —
  // used only where consecutive segments already end/start adjacent (bridge is
  // then empty); kept general so the spiral generator stays a plain geometric
  // description rather than a hand-tuned coordinate list.
  const out = [];
  let [x0, y0] = from;
  const [x1, y1] = to;
  while (x0 !== x1) { x0 += x1 > x0 ? 1 : -1; out.push([x0, y0]); }
  while (y0 !== y1) { y0 += y1 > y0 ? 1 : -1; out.push([x0, y0]); }
  out.pop(); // `to` itself belongs to the next named segment
  return out;
}

function buildSpiralSegments(box) {
  const segments = [];
  let top = 0, bottom = box, left = 0, right = box, ring = 0;
  // One clause per line on purpose: the mutation triage key is (rule, LINE), so
  // two mutable operators sharing a line produce an ambiguous key that cannot be
  // triaged at all. Every mutant of these two clauses is equivalent (see
  // mutation_triage.json) — splitting them is what makes that statable.
  while (top <= bottom
      && left <= right) {
    const topRow = [];
    for (let x = right; x >= left; x--) topRow.push([x, top]);
    segments.push({ name: `ring${ring}.top`, cells: topRow });

    if (!(top + 2 <= bottom)) break;
    const leftCol = [];
    for (let y = top + 1; y <= bottom; y++) leftCol.push([left, y]);
    segments.push({ name: `ring${ring}.left`, cells: leftCol });

    const bottomRow = [];
    for (let x = left + 1; x <= right; x++) bottomRow.push([x, bottom]);
    segments.push({ name: `ring${ring}.bottom`, cells: bottomRow });

    if (!(left + 2 <= right)) break;
    const rightCol = [];
    for (let y = bottom - 1; y >= top + 1; y--) rightCol.push([right, y]);
    segments.push({ name: `ring${ring}.right`, cells: rightCol });

    top += 2; bottom -= 2; left += 2; right -= 2; ring++;
  }
  return segments;
}

function buildNamedSegments() {
  const spiral = buildSpiralSegments(SPIRAL_BOX);
  const entryCells = [];
  for (let x = GRID_WIDTH - 1; x >= SPIRAL_BOX + 1; x--) entryCells.push([x, 0]);
  return [{ name: 'entry', cells: entryCells }, ...spiral];
}

function flattenSegments(namedSegments) {
  const cells = [];
  for (let i = 0; i < namedSegments.length; i++) {
    if (i > 0) {
      const prevLast = cells[cells.length - 1];
      const nextFirst = namedSegments[i].cells[0];
      cells.push(...bridgeSteps(prevLast, nextFirst));
    }
    cells.push(...namedSegments[i].cells);
  }
  return cells;
}

const NAMED_SEGMENTS = buildNamedSegments();
const PATH_CELLS = flattenSegments(NAMED_SEGMENTS);

export const pathCells = () => PATH_CELLS;

export const isPathCell = (x, y) => PATH_CELLS.some(([px, py]) => px === x && py === y);

export const isBuildable = (x, y) => {
  if (x < 0 || x >= GRID_WIDTH || y < 0 || y >= GRID_HEIGHT) return false;
  return !isPathCell(x, y);
};

export const distToPath = (x, y) =>
  Math.min(...PATH_CELLS.map(([px, py]) => Math.sqrt((px - x) ** 2 + (py - y) ** 2)));

// How many DISTINCT named path segments pass within Chebyshev distance 1 of
// (x, y) — the real, computed notion of "sees N segments of the hairpin" that
// backs the pin (R3/R4). Distance 1 = a tower planted here is adjacent to the
// lane, not merely somewhere in generic range: a strict, checkable definition
// that a mutation (e.g. flipping the `<=` to `<`, or the spiral's ring math)
// changes measurably — see tests/geometry.test.mjs.
export const countPathSegmentsSeen = (x, y) => {
  const seen = new Set();
  for (const seg of NAMED_SEGMENTS) {
    for (const [px, py] of seg.cells) {
      if (Math.max(Math.abs(x - px), Math.abs(y - py)) <= 1) {
        seen.add(seg.name);
        break;
      }
    }
  }
  return seen.size;
};

// Triple-coverage pin (R3): 6 buildable cells hand-picked, by level design, from
// the set of cells that genuinely see >=3 distinct hairpin segments (verified
// against `countPathSegmentsSeen` in tests/geometry.test.mjs — this is a curated
// SUBSET of a real geometric property, not a number invented independently of
// the path). Chosen spread across both spiral rings for build diversity.
export const tripleCoverageCells = () => [
  [1, 1], [1, 3], [3, 3], [5, 3], [5, 5], [7, 1]
];
