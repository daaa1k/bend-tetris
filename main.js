import Rules from "./game.bend";
import { createPlayerProgression } from "./player-progression.mjs";
import { candidateCriteria, enumeratePlacements, fallbackPlacement } from "./jev-ai.mjs";

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
const calloutEl = document.querySelector("#callout");
const gameLayout = document.querySelector(".game-layout");
const jevWrap = document.querySelector("#jev-board-wrap");
const jevCanvas = document.querySelector("#jev-board");
const jevCtx = jevCanvas.getContext("2d");
const jevThinkingEl = document.querySelector("#jev-thinking");
const jevStatusEl = document.querySelector("#jev-status");

let progression;
let player;
let running = false;
let paused = false;
let seed = (Date.now() >>> 0) || 1;
let mode = "solo";
let jevBoard;
let jevQueue;
let jevSeed;
let jevScore = 0;
let jevLines = 0;
let jevBusy = false;
let jevRun = 0;
let jevConfigured = false;

const maskOf = (piece, rotation = 0) => Rules.mask(piece, rotation) >>> 0;

function cells(piece, rotation = 0) {
  const mask = maskOf(piece, rotation);
  const result = [];
  for (let i = 0; i < 16; i++) {
    if (mask & (1 << (15 - i))) result.push([i % 4, Math.floor(i / 4)]);
  }
  return result;
}

function jevRandom() {
  jevSeed = Rules.next_seed(jevSeed) >>> 0;
  return jevSeed / 0x100000000;
}

function jevBag() {
  const pieces = [0, 1, 2, 3, 4, 5, 6];
  for (let i = pieces.length - 1; i > 0; i--) {
    const j = Math.floor(jevRandom() * (i + 1));
    [pieces[i], pieces[j]] = [pieces[j], pieces[i]];
  }
  return pieces;
}

function reset() {
  seed = (Date.now() >>> 0) || 1;
  jevSeed = (seed ^ 0x9e3779b9) >>> 0 || 1;
  progression = createPlayerProgression(Rules, seed, performance.now());
  player = progression.view();
  paused = false;
  updateHud();
  renderPreviews();
  drawMini(document.querySelector("#hold"), player.held);
  resetJev();
}

function resetJev() {
  jevRun++;
  jevBoard = Array.from({ length: ROWS }, () => Array(COLS).fill(-1));
  jevQueue = [];
  jevScore = 0;
  jevLines = 0;
  jevBusy = false;
  jevThinkingEl.textContent = "WAITING";
  document.querySelector("#jev-confidence").textContent = "—";
  updateJevHud();
}

function applyProgress(result) {
  const previous = player;
  player = result.state;
  if (previous.score !== player.score || previous.lines !== player.lines) updateHud();
  if (previous.held !== player.held) drawMini(document.querySelector("#hold"), player.held);
  if (previous.queue.some((piece, index) => piece !== player.queue[index])) renderPreviews();
  for (const event of result.events) {
    if (event.type === "t-spin") announce(["T-SPIN", "T-SPIN SINGLE", "T-SPIN DOUBLE", "T-SPIN TRIPLE"][event.lines] || "T-SPIN");
    if (event.type === "line-clear") {
      document.body.classList.remove("flash");
      void document.body.offsetWidth;
      document.body.classList.add("flash");
    }
    if (event.type === "top-out") endGame();
  }
}

function announce(text) {
  calloutEl.textContent = text;
  calloutEl.classList.remove("show");
  void calloutEl.offsetWidth;
  calloutEl.classList.add("show");
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
  player.board.forEach((row, y) => row.forEach((piece, x) => {
    if (piece !== -1) paintCell(ctx, x, y, COLORS[piece]);
  }));
  if (player.active && running) {
    const active = player.active;
    const gy = player.ghostY;
    cells(active.piece, active.rotation).forEach(([x, y]) => {
      if (gy + y >= 0) paintCell(ctx, active.x + x, gy + y, COLORS[active.piece], .14);
    });
    cells(active.piece, active.rotation).forEach(([x, y]) => {
      if (active.y + y >= 0) paintCell(ctx, active.x + x, active.y + y, COLORS[active.piece]);
    });
  }
}

function drawJevBoard() {
  jevCtx.clearRect(0, 0, jevCanvas.width, jevCanvas.height);
  jevCtx.strokeStyle = "rgba(255,255,255,.035)";
  jevCtx.lineWidth = 1;
  for (let x = 1; x < COLS; x++) {
    jevCtx.beginPath(); jevCtx.moveTo(x * CELL + .5, 0); jevCtx.lineTo(x * CELL + .5, ROWS * CELL); jevCtx.stroke();
  }
  for (let y = 1; y < ROWS; y++) {
    jevCtx.beginPath(); jevCtx.moveTo(0, y * CELL + .5); jevCtx.lineTo(COLS * CELL, y * CELL + .5); jevCtx.stroke();
  }
  jevBoard?.forEach((row, y) => row.forEach((piece, x) => {
    if (piece !== -1) paintCell(jevCtx, x, y, COLORS[piece]);
  }));
}

function updateJevHud() {
  document.querySelector("#jev-score").textContent = String(jevScore).padStart(6, "0");
  document.querySelector("#jev-lines").textContent = String(jevLines).padStart(2, "0");
}

function serializeBoard(target) {
  return target.map(row => row.map(piece => piece === -1 ? "." : NAMES[piece]).join("")).join("\n");
}

function fillJevQueue() {
  while (jevQueue.length < 7) jevQueue.push(...jevBag());
}

async function playJevMove(run) {
  if (!running || paused || mode !== "jev" || jevBusy || run !== jevRun) return;
  jevBusy = true;
  jevThinkingEl.textContent = "THINKING…";
  fillJevQueue();
  const piece = jevQueue.shift();
  const rotations = [0, 1, 2, 3].map(rotation => cells(piece, rotation));
  const candidates = enumeratePlacements(jevBoard, rotations);
  if (!candidates.length) {
    jevBusy = false;
    running = false;
    showOverlay("YOU WIN", `JEV TOPPED OUT · SCORE ${String(player.score).padStart(6, "0")}`, "PLAY AGAIN");
    return;
  }

  let selected;
  let confidence = null;
  try {
    const response = await fetch("/api/jev/move", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ board: serializeBoard(jevBoard), piece: NAMES[piece], candidates: candidateCriteria(candidates) })
    });
    if (!response.ok) throw new Error("Jev unavailable");
    const decision = await response.json();
    selected = candidates.find(candidate => candidate.id === decision.choice);
    confidence = decision.confidence;
    if (!selected) throw new Error("Invalid Jev move");
  } catch {
    selected = fallbackPlacement(candidates);
    jevThinkingEl.textContent = "LOCAL FALLBACK";
  }

  if (!running || run !== jevRun) { jevBusy = false; return; }
  if (paused) {
    jevBusy = false;
    jevQueue.unshift(piece);
    return;
  }
  for (const [x, y] of rotations[selected.rotation]) jevBoard[selected.y + y][selected.x + x] = piece;
  const before = jevBoard.length;
  jevBoard = jevBoard.filter(row => row.some(cell => cell === -1));
  const cleared = before - jevBoard.length;
  while (jevBoard.length < ROWS) jevBoard.unshift(Array(COLS).fill(-1));
  jevScore += (Rules.line_score(cleared, Rules.level(jevLines) >>> 0) >>> 0) + Math.max(0, selected.y + 2) * 2;
  jevLines += cleared;
  document.querySelector("#jev-confidence").textContent = confidence === null ? "—" : `${Math.round(confidence * 100)}%`;
  updateJevHud();
  drawJevBoard();
  jevThinkingEl.textContent = confidence === null ? "FALLBACK" : "DECIDED";
  jevBusy = false;
  setTimeout(() => playJevMove(run), 420);
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
  player.queue.forEach((piece, index) => {
    const canvas = document.createElement("canvas");
    canvas.width = 128;
    canvas.height = 76;
    canvas.setAttribute("aria-label", `${index + 1}番目: ${NAMES[piece]}ミノ`);
    list.append(canvas);
    drawMini(canvas, piece);
  });
}

function updateHud() {
  scoreEl.textContent = String(player.score).padStart(6, "0");
  linesEl.textContent = String(player.lines).padStart(2, "0");
  levelEl.textContent = String(player.level).padStart(2, "0");
}

function showOverlay(title, copy, button) {
  titleEl.textContent = title;
  copyEl.textContent = copy;
  startButton.textContent = button;
  overlay.classList.remove("hidden");
}

function startGame() {
  if (mode === "jev" && !jevConfigured) {
    showOverlay("JEV OFFLINE", "サーバーに TYPESAFE_API_KEY を設定してください", "RETRY");
    checkJevStatus();
    return;
  }
  reset();
  running = true;
  paused = false;
  overlay.classList.add("hidden");
  document.querySelector("#player-state").textContent = "PLAYING";
  if (mode === "jev") playJevMove(jevRun);
}

function endGame() {
  running = false;
  jevRun++;
  document.querySelector("#player-state").textContent = "TOPPED OUT";
  const heading = mode === "jev" && player.score > jevScore ? "YOU WIN" : "GAME OVER";
  const rival = mode === "jev" ? ` · JEV ${String(jevScore).padStart(6, "0")}` : "";
  showOverlay(heading, `YOU ${String(player.score).padStart(6, "0")}${rival}`, "PLAY AGAIN");
}

function togglePause() {
  if (!running) return;
  paused = !paused;
  if (paused) showOverlay("PAUSED", "P またはボタンで再開", "RESUME");
  else {
    overlay.classList.add("hidden");
    applyProgress(progression.resume(performance.now()));
    if (mode === "jev") playJevMove(jevRun);
  }
}

function action(name) {
  if (running && !paused) applyProgress(progression.dispatch(name, performance.now()));
}

document.addEventListener("keydown", event => {
  const keymap = {
    ArrowLeft: "left", ArrowRight: "right", ArrowDown: "down",
    ArrowUp: "rotate-right", x: "rotate-right", X: "rotate-right",
    z: "rotate-left", Z: "rotate-left",
    " ": "drop", c: "hold", C: "hold"
  };
  if (event.key === "Enter" && !running) { startGame(); return; }
  if (event.key === "p" || event.key === "P" || event.key === "Escape") { togglePause(); return; }
  const name = keymap[event.key];
  if (name) { event.preventDefault(); action(name); }
});

startButton.addEventListener("click", () => paused ? togglePause() : startGame());
document.querySelectorAll(".mode-switch button").forEach(button => {
  button.addEventListener("click", () => {
    if (running) return;
    mode = button.dataset.mode;
    document.querySelectorAll(".mode-switch button").forEach(item => item.classList.toggle("active", item === button));
    const versus = mode === "jev";
    gameLayout.classList.toggle("versus", versus);
    jevWrap.classList.toggle("hidden", !versus);
    showOverlay(versus ? "VS JEV" : "READY?", versus ? "それぞれのピース列でJevとスコア対戦" : "Enter またはタップでスタート", "START GAME");
    drawJevBoard();
  });
});
document.querySelectorAll(".touch button").forEach(button => {
  button.addEventListener("pointerdown", event => { event.preventDefault(); action(button.dataset.action); });
});

function frame(now) {
  if (running && !paused) applyProgress(progression.tick(now));
  drawBoard();
  if (mode === "jev") drawJevBoard();
  requestAnimationFrame(frame);
}

async function checkJevStatus() {
  try {
    const response = await fetch("/api/jev/status", { cache: "no-store" });
    const status = await response.json();
    jevConfigured = Boolean(status.configured);
  } catch {
    jevConfigured = false;
  }
  jevStatusEl.textContent = jevConfigured ? "JEV ONLINE" : "JEV OFFLINE";
  jevStatusEl.classList.toggle("online", jevConfigured);
}

reset();
checkJevStatus();
requestAnimationFrame(frame);
