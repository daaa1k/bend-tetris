export function landingY(board, cells, x, startY = -2) {
  const rows = board.length;
  const cols = board[0].length;
  const collides = y => cells.some(([cx, cy]) => {
    const bx = x + cx;
    const by = y + cy;
    return bx < 0 || bx >= cols || by >= rows || (by >= 0 && board[by][bx] !== -1);
  });

  if (collides(startY)) return null;
  let y = startY;
  while (!collides(y + 1)) y++;
  return y;
}

function assess(board, cells, x, y) {
  const next = board.map(row => [...row]);
  let aboveTop = false;
  for (const [cx, cy] of cells) {
    const by = y + cy;
    if (by < 0) aboveTop = true;
    else next[by][x + cx] = 1;
  }

  const remaining = next.filter(row => row.some(cell => cell === -1));
  const lines = next.length - remaining.length;
  while (remaining.length < next.length) remaining.unshift(Array(next[0].length).fill(-1));

  const heights = [];
  let holes = 0;
  for (let x = 0; x < next[0].length; x++) {
    let first = next.length;
    for (let y = 0; y < next.length; y++) {
      if (remaining[y][x] !== -1) { first = y; break; }
    }
    heights.push(next.length - first);
    for (let y = first; y < next.length; y++) if (remaining[y][x] === -1) holes++;
  }
  const bumpiness = heights.slice(1).reduce((sum, height, index) => sum + Math.abs(height - heights[index]), 0);
  return { lines, holes, height: Math.max(...heights), aggregateHeight: heights.reduce((a, b) => a + b, 0), bumpiness, aboveTop };
}

export function enumeratePlacements(board, rotations) {
  const candidates = [];
  rotations.forEach((cells, rotation) => {
    const minX = Math.min(...cells.map(([x]) => x));
    const maxX = Math.max(...cells.map(([x]) => x));
    for (let x = -minX; x < board[0].length - maxX; x++) {
      const y = landingY(board, cells, x);
      if (y === null) continue;
      const metrics = assess(board, cells, x, y);
      if (!metrics.aboveTop) candidates.push({ id: `r${rotation}x${x}`, rotation, x, y, metrics });
    }
  });
  return candidates;
}

export function fallbackPlacement(candidates) {
  return [...candidates].sort((a, b) => {
    const score = value => value.metrics.lines * 10 - value.metrics.holes * 8 - value.metrics.aggregateHeight * .45 - value.metrics.bumpiness * .8;
    return score(b) - score(a);
  })[0] ?? null;
}

export function candidateCriteria(candidates) {
  return Object.fromEntries(candidates.map(candidate => [candidate.id, {
    placement: `rotation ${candidate.rotation}, column ${candidate.x}`,
    completed_lines: candidate.metrics.lines,
    holes_after_move: candidate.metrics.holes,
    maximum_height: candidate.metrics.height,
    aggregate_height: candidate.metrics.aggregateHeight,
    surface_bumpiness: candidate.metrics.bumpiness
  }]));
}
