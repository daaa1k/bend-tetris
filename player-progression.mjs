import { isTSpinPosition } from "./t-spin.mjs";
import { createLockState, observeGround, resetAfterManeuver } from "./lock-delay.mjs";

const COLS = 10;
const ROWS = 20;

export function createPlayerProgression(rules, initialSeed, startedAt = 0) {
  let seed = initialSeed >>> 0 || 1;
  let board = Array.from({ length: ROWS }, () => Array(COLS).fill(-1));
  let queue = [];
  let held = null;
  let canHold = true;
  let score = 0;
  let lines = 0;
  let active;
  let running = true;
  let lastFall = startedAt;
  let lastActionWasRotation = false;
  let lockState = createLockState();

  const cells = (piece, rotation = 0) => {
    const mask = rules.mask(piece, rotation) >>> 0;
    const result = [];
    for (let i = 0; i < 16; i++) if (mask & (1 << (15 - i))) result.push([i % 4, Math.floor(i / 4)]);
    return result;
  };
  const random = () => {
    seed = rules.next_seed(seed) >>> 0;
    return seed / 0x100000000;
  };
  const bag = () => {
    const pieces = [0, 1, 2, 3, 4, 5, 6];
    for (let i = pieces.length - 1; i > 0; i--) {
      const j = Math.floor(random() * (i + 1));
      [pieces[i], pieces[j]] = [pieces[j], pieces[i]];
    }
    return pieces;
  };
  const fillQueue = () => { while (queue.length < 7) queue.push(...bag()); };
  const collides = (piece, rotation, px, py) => cells(piece, rotation).some(([x, y]) => {
    const bx = px + x;
    const by = py + y;
    return bx < 0 || bx >= COLS || by >= ROWS || (by >= 0 && board[by][bx] !== -1);
  });
  const grounded = () => collides(active.piece, active.rotation, active.x, active.y + 1);
  const topOut = events => { running = false; events.push({ type: "top-out" }); };
  const spawn = (piece, now, events) => {
    active = { piece, rotation: 0, x: 3, y: -1 };
    lastActionWasRotation = false;
    lockState = createLockState();
    lastFall = now;
    canHold = true;
    if (collides(active.piece, active.rotation, active.x, active.y)) topOut(events);
  };
  const spawnNext = (now, events) => {
    fillQueue();
    spawn(queue.shift(), now, events);
  };
  const move = (dx, dy, now, soft = false) => {
    const wasGrounded = grounded();
    if (collides(active.piece, active.rotation, active.x + dx, active.y + dy)) return false;
    active.x += dx;
    active.y += dy;
    lastActionWasRotation = false;
    resetAfterManeuver(lockState, wasGrounded, grounded(), now);
    if (soft) score++;
    return true;
  };
  const rotate = (direction, now) => {
    const wasGrounded = grounded();
    const next = (active.rotation + direction + 4) % 4;
    for (const kick of [0, -1, 1, -2, 2]) {
      if (collides(active.piece, next, active.x + kick, active.y)) continue;
      active.rotation = next;
      active.x += kick;
      lastActionWasRotation = true;
      resetAfterManeuver(lockState, wasGrounded, grounded(), now);
      break;
    }
  };
  const lock = (now, events) => {
    const tSpin = isTSpinPosition(board, { ...active, lastActionWasRotation });
    let aboveTop = false;
    for (const [x, y] of cells(active.piece, active.rotation)) {
      const by = active.y + y;
      if (by < 0) aboveTop = true;
      else board[by][active.x + x] = active.piece;
    }
    if (aboveTop) { topOut(events); return; }
    const before = board.length;
    board = board.filter(row => row.some(cell => cell === -1));
    const cleared = before - board.length;
    while (board.length < ROWS) board.unshift(Array(COLS).fill(-1));
    const level = rules.level(lines) >>> 0;
    if (tSpin) {
      score += rules.t_spin_score(cleared, level) >>> 0;
      events.push({ type: "t-spin", lines: cleared });
    } else if (cleared) score += rules.line_score(cleared, level) >>> 0;
    if (cleared) { lines += cleared; events.push({ type: "line-clear", lines: cleared }); }
    events.push({ type: "lock" });
    spawnNext(now, events);
  };
  const ghostY = () => {
    let y = active.y;
    while (!collides(active.piece, active.rotation, active.x, y + 1)) y++;
    return y;
  };
  const view = (now = lastFall) => ({
    board: board.map(row => [...row]), active: { ...active }, queue: queue.slice(0, 3),
    held, canHold, score, lines, level: rules.level(lines) >>> 0,
    ghostY: ghostY(), running, grounded: grounded(),
    lockRemainingMs: lockState.startedAt === null ? null : Math.max(0, 500 - (now - lockState.startedAt))
  });
  const result = (events, now) => ({ state: view(now), events });
  spawnNext(startedAt, []);
  return {
    view,
    resume(now) { lastFall = now; if (lockState.startedAt !== null) lockState.startedAt = now; return result([], now); },
    dispatch(action, now) {
      const events = [];
      if (!running) return result(events, now);
      switch (action) {
        case "left": move(-1, 0, now); break;
        case "right": move(1, 0, now); break;
        case "down": move(0, 1, now, true); break;
        case "rotate-left": rotate(-1, now); break;
        case "rotate-right": rotate(1, now); break;
        case "drop": {
          let distance = 0;
          while (move(0, 1, now)) distance++;
          score += distance * 2;
          lock(now, events);
          break;
        }
        case "hold": {
          if (!canHold) break;
          const current = active.piece;
          if (held === null) { held = current; spawnNext(now, events); }
          else {
            spawn(held, now, events);
            held = current;
          }
          canHold = false;
          break;
        }
      }
      return result(events, now);
    },
    tick(now) {
      const events = [];
      if (!running) return result(events, now);
      const interval = rules.gravity_ms(rules.level(lines) >>> 0) >>> 0;
      if (now - lastFall >= interval) { move(0, 1, now); lastFall = now; }
      if (observeGround(lockState, grounded(), now)) lock(now, events);
      return result(events, now);
    }
  };
}
