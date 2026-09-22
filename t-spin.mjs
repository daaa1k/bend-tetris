export function isTSpinPosition(board, active) {
  if (active.piece !== 5 || !active.lastActionWasRotation) return false;

  const rows = board.length;
  const cols = board[0]?.length ?? 0;
  const cx = active.x + 1;
  const cy = active.y + 1;
  const occupiedCorners = [[-1, -1], [1, -1], [-1, 1], [1, 1]].filter(([dx, dy]) => {
    const x = cx + dx;
    const y = cy + dy;
    return x < 0 || x >= cols || y < 0 || y >= rows || board[y][x] !== -1;
  }).length;

  return occupiedCorners >= 3;
}
