import Rules from "./game.bend";

const COLS = 10;
const ROWS = 20;
const CELL = 32;
const COLORS = ["#35d9ff", "#5b72ff", "#ff9d35", "#ffe24a", "#56e881", "#b65cff", "#ff4e68"];
const NAMES = ["I", "J", "L", "O", "S", "T", "Z"];

const boardCanvas = document.querySelector("#board");
const ctx = boardCanvas.getContext("2d");
const overlay = document.querySelector("#overlay");
const titleEl = document.querySelector("#overlay-title");
const copyEl = document.querySelector("#overlay-copy");
const startButton = document.querySelector("#start");
const scoreEl = document.querySelector("#score");
const linesEl = document.querySelector("#lines");
const levelEl = document.querySelector("#level");

let board;
let active;
let queue;
let held;
let canHold;
let score;
let lines;
let running = false;
let paused = false;
let lastFall = 0;
let seed = (Date.now() >>> 0) || 1;

const maskOf = (piece, rotation = 0) => Rules.mask(piece, rotation) >>> 0;

function cells(piece, rotation = 0) {
  const mask = maskOf(piece, rotation);
  const result = [];
  for (let i = 0; i < 16; i++) {
    if (mask & (1 << (15 - i))) result.push([i % 4, Math.floor(i / 4)]);
  }
  return result;
}

function random() {
  seed = Rules.next_seed(seed) >>> 0;
  return seed / 0x100000000;
}

function bag() {
  const pieces = [0, 1, 2, 3, 4, 5, 6];
  for (let i = pieces.length - 1; i > 0; i--) {
    const j = Math.floor(random() * (i + 1));
    [pieces[i], pieces[j]] = [pieces[j], pieces[i]];
  }
  return pieces;
}

function fillQueue() {
  while (queue.length < 7) queue.push(...bag());
}

function collides(piece, rotation, px, py) {
  return cells(piece, rotation).some(([x, y]) => {
    const bx = px + x;
    const by = py + y;
    return bx < 0 || bx >= COLS || by >= ROWS || (by >= 0 && board[by][bx] !== -1);
  });
}

function spawn() {
  fillQueue();
  active = { piece: queue.shift(), rotation: 0, x: 3, y: -1 };
  canHold = true;
  renderPreviews();
  if (collides(active.piece, active.rotation, active.x, active.y)) endGame();
}

function reset() {
  board = Array.from({ length: ROWS }, () => Array(COLS).fill(-1));
  queue = [];
  held = null;
  score = 0;
  lines = 0;
  paused = false;
  fillQueue();
  spawn();
  updateHud();
  drawMini(document.querySelector("#hold"), null);
}

function move(dx, dy) {
  if (!running || paused) return false;
  if (!collides(active.piece, active.rotation, active.x + dx, active.y + dy)) {
    active.x += dx;
    active.y += dy;
    if (dy > 0) score += 1;
    updateHud();
    return true;
  }
  if (dy > 0) lock();
  return false;
}

function rotate() {
  if (!running || paused) return;
  const next = (active.rotation + 1) % 4;
  for (const kick of [0, -1, 1, -2, 2]) {
    if (!collides(active.piece, next, active.x + kick, active.y)) {
      active.rotation = next;
      active.x += kick;
      return;
    }
  }
}

function hardDrop() {
  if (!running || paused) return;
  let distance = 0;
  while (!collides(active.piece, active.rotation, active.x, active.y + 1)) {
    active.y++;
    distance++;
  }
  score += distance * 2;
  lock();
}

function hold() {
  if (!running || paused || !canHold) return;
  const current = active.piece;
  if (held === null) {
    held = current;
    spawn();
  } else {
    active = { piece: held, rotation: 0, x: 3, y: -1 };
    held = current;
  }
  canHold = false;
  drawMini(document.querySelector("#hold"), held);
  renderPreviews();
}

function lock() {
  let aboveTop = false;
  for (const [x, y] of cells(active.piece, active.rotation)) {
    const by = active.y + y;
    if (by < 0) aboveTop = true;
    else board[by][active.x + x] = active.piece;
  }
  if (aboveTop) return endGame();

  const before = board.length;
  board = board.filter(row => row.some(cell => cell === -1));
  const cleared = before - board.length;
  while (board.length < ROWS) board.unshift(Array(COLS).fill(-1));
  if (cleared) {
    const currentLevel = Rules.level(lines) >>> 0;
    score += Rules.line_score(cleared, currentLevel) >>> 0;
    lines += cleared;
    document.body.classList.remove("flash");
    void document.body.offsetWidth;
    document.body.classList.add("flash");
  }
  spawn();
  updateHud();
}

function ghostY() {
  let y = active.y;
  while (!collides(active.piece, active.rotation, active.x, y + 1)) y++;
  return y;
}

function paintCell(target, x, y, color, alpha = 1, size = CELL) {
  const gap = 2;
  target.save();
  target.globalAlpha = alpha;
  target.fillStyle = color;
  target.fillRect(x * size + gap, y * size + gap, size - gap * 2, size - gap * 2);
  target.fillStyle = "rgba(255,255,255,.23)";
  target.fillRect(x * size + gap, y * size + gap, size - gap * 2, 3);
  target.fillStyle = "rgba(0,0,0,.2)";
  target.fillRect(x * size + size - 5, y * size + gap, 3, size - gap * 2);
  target.restore();
}

function drawBoard() {
  ctx.clearRect(0, 0, boardCanvas.width, boardCanvas.height);
  ctx.strokeStyle = "rgba(255,255,255,.035)";
  ctx.lineWidth = 1;
  for (let x = 1; x < COLS; x++) {
    ctx.beginPath(); ctx.moveTo(x * CELL + .5, 0); ctx.lineTo(x * CELL + .5, ROWS * CELL); ctx.stroke();
  }
  for (let y = 1; y < ROWS; y++) {
    ctx.beginPath(); ctx.moveTo(0, y * CELL + .5); ctx.lineTo(COLS * CELL, y * CELL + .5); ctx.stroke();
  }
  board.forEach((row, y) => row.forEach((piece, x) => {
    if (piece !== -1) paintCell(ctx, x, y, COLORS[piece]);
  }));
  if (active && running) {
    const gy = ghostY();
    cells(active.piece, active.rotation).forEach(([x, y]) => {
      if (gy + y >= 0) paintCell(ctx, active.x + x, gy + y, COLORS[active.piece], .14);
    });
    cells(active.piece, active.rotation).forEach(([x, y]) => {
      if (active.y + y >= 0) paintCell(ctx, active.x + x, active.y + y, COLORS[active.piece]);
    });
  }
}

function drawMini(canvas, piece) {
  const mini = canvas.getContext("2d");
  mini.clearRect(0, 0, canvas.width, canvas.height);
  if (piece === null || piece === undefined) return;
  const shape = cells(piece, 0);
  const xs = shape.map(([x]) => x);
  const ys = shape.map(([, y]) => y);
  const size = 20;
  const ox = (canvas.width - (Math.max(...xs) - Math.min(...xs) + 1) * size) / 2 - Math.min(...xs) * size;
  const oy = (canvas.height - (Math.max(...ys) - Math.min(...ys) + 1) * size) / 2 - Math.min(...ys) * size;
  shape.forEach(([x, y]) => paintCell(mini, x + ox / size, y + oy / size, COLORS[piece], 1, size));
}

function renderPreviews() {
  const list = document.querySelector("#next-list");
  list.replaceChildren();
  queue.slice(0, 3).forEach((piece, index) => {
    const canvas = document.createElement("canvas");
    canvas.width = 128;
    canvas.height = 76;
    canvas.setAttribute("aria-label", `${index + 1}番目: ${NAMES[piece]}ミノ`);
    list.append(canvas);
    drawMini(canvas, piece);
  });
}

function updateHud() {
  scoreEl.textContent = String(score).padStart(6, "0");
  linesEl.textContent = String(lines).padStart(2, "0");
  levelEl.textContent = String(Rules.level(lines) >>> 0).padStart(2, "0");
}

function showOverlay(title, copy, button) {
  titleEl.textContent = title;
  copyEl.textContent = copy;
  startButton.textContent = button;
  overlay.classList.remove("hidden");
}

function startGame() {
  reset();
  running = true;
  paused = false;
  lastFall = performance.now();
  overlay.classList.add("hidden");
}

function endGame() {
  running = false;
  showOverlay("GAME OVER", `SCORE ${String(score).padStart(6, "0")}`, "PLAY AGAIN");
}

function togglePause() {
  if (!running) return;
  paused = !paused;
  if (paused) showOverlay("PAUSED", "P またはボタンで再開", "RESUME");
  else { overlay.classList.add("hidden"); lastFall = performance.now(); }
}

function action(name) {
  const actions = { left: () => move(-1, 0), right: () => move(1, 0), down: () => move(0, 1), rotate, drop: hardDrop, hold };
  actions[name]?.();
}

document.addEventListener("keydown", event => {
  const keymap = { ArrowLeft: "left", ArrowRight: "right", ArrowDown: "down", ArrowUp: "rotate", z: "rotate", Z: "rotate", " ": "drop", c: "hold", C: "hold" };
  if (event.key === "Enter" && !running) { startGame(); return; }
  if (event.key === "p" || event.key === "P" || event.key === "Escape") { togglePause(); return; }
  const name = keymap[event.key];
  if (name) { event.preventDefault(); action(name); }
});

startButton.addEventListener("click", () => paused ? togglePause() : startGame());
document.querySelectorAll(".touch button").forEach(button => {
  button.addEventListener("pointerdown", event => { event.preventDefault(); action(button.dataset.action); });
});

function frame(now) {
  if (running && !paused) {
    const level = Rules.level(lines) >>> 0;
    const interval = Rules.gravity_ms(level) >>> 0;
    if (now - lastFall >= interval) { move(0, 1); lastFall = now; }
  }
  drawBoard();
  requestAnimationFrame(frame);
}

reset();
requestAnimationFrame(frame);
