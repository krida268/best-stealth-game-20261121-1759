// Lentera Malam — the game loop, the keyboard and the screens.
// Boots the world, listens for keys, steps the simulation in fixed
// slices, draws every frame, and plays the sounds the world asks for.
// With ?shot=<name> it stages one deterministic scene and holds it for
// a screenshot; with ?selftest=1 it plays all three levels with the
// autopilot and writes the result into the page for the maker to read.
import { VIEW_W, VIEW_H } from './config.js';
import { World, PHASE_LEVEL, PHASE_LEVEL_CLEAR, PHASE_GAME_OVER, PHASE_WIN } from './world.js';
import { render } from './render.js';
import { SoundBank } from './audio.js';
import { stageShot, selfTest } from './shots.js';

const STEP = 1 / 60;
const canvas = document.getElementById('game');
const statusLine = document.getElementById('status');
const ctx = canvas.getContext('2d');
canvas.width = VIEW_W;
canvas.height = VIEW_H;

const params = new URLSearchParams(window.location.search);
const shotName = params.get('shot');
const wantSelfTest = params.get('selftest') === '1';

const world = new World(20261122);
const sounds = new SoundBank();
let screen = 'title';
let time = 0;
let accumulator = 0;
let lastTick = performance.now();
let wasAlarmed = false;
let statusTimer = 0;

const keys = { left: false, right: false, up: false, down: false, sneak: false };

function readKeys(e) {
  switch (e.key) {
    case 'ArrowLeft':
    case 'a':
    case 'A':
      keys.left = true;
      break;
    case 'ArrowRight':
    case 'd':
    case 'D':
      keys.right = true;
      break;
    case 'ArrowUp':
    case 'w':
    case 'W':
      keys.up = true;
      break;
    case 'ArrowDown':
    case 's':
    case 'S':
      keys.down = true;
      break;
    case 'Shift':
      keys.sneak = true;
      break;
    default:
      break;
  }
}

function clearKeys(e) {
  switch (e.key) {
    case 'ArrowLeft':
    case 'a':
    case 'A':
      keys.left = false;
      break;
    case 'ArrowRight':
    case 'd':
    case 'D':
      keys.right = false;
      break;
    case 'ArrowUp':
    case 'w':
    case 'W':
      keys.up = false;
      break;
    case 'ArrowDown':
    case 's':
    case 'S':
      keys.down = false;
      break;
    case 'Shift':
      keys.sneak = false;
      break;
    default:
      break;
  }
}

function startLevel() {
  sounds.ensure();
  screen = 'play';
}

function advance() {
  if (screen === 'title') {
    startLevel();
  } else if (world.phase === PHASE_LEVEL_CLEAR) {
    world.nextLevel();
    screen = 'play';
  } else if (world.phase === PHASE_GAME_OVER || world.phase === PHASE_WIN) {
    world.restart();
    screen = 'title';
  }
}

window.addEventListener('keydown', (e) => {
  if (['ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown', ' '].includes(e.key)) e.preventDefault();
  sounds.ensure();
  if (e.key === 'Enter' || e.key === ' ') {
    if (screen !== 'play' || world.phase !== PHASE_LEVEL) advance();
    return;
  }
  if (e.key === 'p' || e.key === 'P') {
    if (screen === 'play' && world.phase === PHASE_LEVEL) screen = 'paused';
    else if (screen === 'paused') screen = 'play';
    return;
  }
  if (e.key === 'm' || e.key === 'M') {
    sounds.muted = !sounds.muted;
    return;
  }
  readKeys(e);
});
window.addEventListener('keyup', clearKeys);
canvas.addEventListener('pointerdown', () => {
  sounds.ensure();
  if (screen !== 'play' || world.phase !== PHASE_LEVEL) advance();
});

function announce() {
  const bits = [
    `Level ${world.levelIndex + 1} ${world.levelName}`,
    `skor ${world.score}`,
    `nyawa ${world.lives}`,
    world.lanternTaken ? 'lentera didapat, capai gerbang' : 'cari lentera',
  ];
  if (world.alarm) bits.push('terdeteksi');
  statusLine.textContent = bits.join('. ');
}

function playWorldSounds() {
  if (world.player.moving && screen === 'play' && world.phase === PHASE_LEVEL) {
    sounds.footstep(world.player.sneaking, time);
  }
  if (!wasAlarmed && world.alarm) sounds.alert();
  wasAlarmed = world.alarm;
  while (world.events.length > 0) {
    const event = world.events.shift();
    if (event === 'firefly') sounds.firefly();
    else if (event === 'lantern') sounds.lantern();
    else if (event === 'caught') sounds.caught();
    else if (event === 'exit') sounds.clear();
  }
  if (world.phase === PHASE_WIN && screen === 'play') sounds.win();
}

function frame(now) {
  const dt = Math.min(0.1, (now - lastTick) / 1000);
  lastTick = now;
  time += dt;
  if (screen === 'play' && world.phase === PHASE_LEVEL) {
    accumulator += dt;
    while (accumulator >= STEP) {
      world.step(STEP, keys);
      accumulator -= STEP;
    }
    playWorldSounds();
  }
  render(ctx, world, screen, time);
  statusTimer += dt;
  if (statusTimer > 0.5) {
    statusTimer = 0;
    announce();
  }
  requestAnimationFrame(frame);
}

if (wantSelfTest) {
  const lines = selfTest(world);
  const report = `SELFTEST ${lines.join(' | ')}`;
  statusLine.textContent = report;
  document.title = report;
  render(ctx, world, 'play', 0);
} else if (shotName) {
  const staged = stageShot(shotName, world);
  screen = staged.screen;
  render(ctx, world, screen, 4);
} else {
  requestAnimationFrame(frame);
}
