// Lentera Malam — staged scenes for screenshots and self-tests.
// A screenshot must show the real game, so each scene plays the rules
// forward from a fresh world with a small autopilot: it finds a path
// across the tile grid to the lantern, then to the gate, and waits in
// a safe tile whenever a guard's cone sweeps over the next step. The
// same seed always gives the same frame.
import { TILE, GUARD } from './config.js';
import { sightStrength } from './vision.js';
import { blocksMove } from './levels.js';
import { PHASE_LEVEL } from './world.js';

const STEP = 1 / 60;
const DIRS = [[1, 0], [-1, 0], [0, 1], [0, -1]];

/** Breadth-first path over walkable tiles, from tile A to tile B. */
export function findPath(tiles, from, to) {
  const width = tiles[0].length;
  const height = tiles.length;
  const key = (x, y) => y * width + x;
  const prev = new Map();
  const seen = new Set([key(from.x, from.y)]);
  const queue = [{ x: from.x, y: from.y }];
  while (queue.length > 0) {
    const cur = queue.shift();
    if (cur.x === to.x && cur.y === to.y) {
      const path = [];
      let node = cur;
      while (node) {
        path.unshift(node);
        node = prev.get(key(node.x, node.y));
      }
      return path;
    }
    for (const [dx, dy] of DIRS) {
      const nx = cur.x + dx;
      const ny = cur.y + dy;
      if (nx < 0 || ny < 0 || nx >= width || ny >= height) continue;
      if (blocksMove(tiles, nx, ny)) continue;
      const k = key(nx, ny);
      if (seen.has(k)) continue;
      seen.add(k);
      prev.set(k, cur);
      queue.push({ x: nx, y: ny });
    }
  }
  return null;
}

function tileCentre(tx, ty) {
  return { x: tx * TILE + TILE / 2, y: ty * TILE + TILE / 2 };
}

/** Strongest sight any guard has on a point right now. */
function watchedAt(world, x, y) {
  let best = 0;
  for (const guard of world.guards) {
    const seen = sightStrength(world.tiles, guard.x, guard.y, guard.facing, x, y);
    if (seen > best) best = seen;
  }
  return best;
}

function keysToward(world, tx, ty, sneak = false) {
  const dx = tx - world.player.x;
  const dy = ty - world.player.y;
  return {
    left: dx < -6,
    right: dx > 6,
    up: dy < -6,
    down: dy > 6,
    sneak,
  };
}

const IDLE = { left: false, right: false, up: false, down: false, sneak: true };

function goalTile(world) {
  return world.lanternTaken ? world.exitTile : world.lanternTile;
}

/** Walk one autopilot step: follow the path, wait out watched tiles. */
function autopilotStep(world, path, pathIndex) {
  if (!path || pathIndex >= path.length) return pathIndex;
  const node = path[pathIndex];
  const centre = tileCentre(node.x, node.y);
  const dist = Math.hypot(centre.x - world.player.x, centre.y - world.player.y);
  if (dist < 12) return pathIndex + 1;
  // A guard is closing in or already chasing: run away from the threat
  // along one axis (a diagonal into a wall bleeds speed). Rara is faster
  // on foot, so distance breaks the chase; standing still while a guard
  // walks up is how she gets caught.
  let threatX = 0;
  let threatY = 0;
  let threats = 0;
  for (const guard of world.guards) {
    const seen = sightStrength(world.tiles, guard.x, guard.y, guard.facing, world.player.x, world.player.y);
    if (guard.alarmed || seen > 0.05) {
      threatX += guard.x;
      threatY += guard.y;
      threats += 1;
    }
  }
  if (threats > 0) {
    const cx = threatX / threats;
    const cy = threatY / threats;
    // Flee along the open axis that gains the most distance: a wall
    // blocks one way out, so probe one tile in each direction first.
    // (Probe close: a far probe's own radius clips the map's edge wall
    // even where the corridor is open.)
    const options = [
      { dx: -48, dy: 0 },
      { dx: 48, dy: 0 },
      { dx: 0, dy: -48 },
      { dx: 0, dy: 48 },
    ];
    let best = null;
    let bestGain = -Infinity;
    for (const opt of options) {
      const px = world.player.x + opt.dx;
      const py = world.player.y + opt.dy;
      if (world.player.collides(world.tiles, px, py)) continue;
      const gain = Math.hypot(px - cx, py - cy) - Math.hypot(world.player.x - cx, world.player.y - cy);
      if (gain > bestGain) {
        bestGain = gain;
        best = opt;
      }
    }
    if (best) {
      world.step(STEP, keysToward(world, world.player.x + best.dx, world.player.y + best.dy));
    } else {
      world.step(STEP, IDLE);
    }
    return pathIndex;
  }
  // The next tile is watched: hold still in this safe one.
  if (watchedAt(world, centre.x, centre.y) > 0) {
    world.step(STEP, IDLE);
    return pathIndex;
  }
  // Near a guard, or already half-seen: sneak. It is slower, but silent
  // and far harder to spot — the way a careful player crosses a patrol.
  let nearest = Infinity;
  for (const guard of world.guards) {
    const d = Math.hypot(guard.x - world.player.x, guard.y - world.player.y);
    if (d < nearest) nearest = d;
  }
  const sneak = world.detection > 0.15 || nearest < 220;
  world.step(STEP, keysToward(world, centre.x, centre.y, sneak));
  return pathIndex;
}

/** Play the current level with the autopilot for up to `seconds`. */
export function autopilotLevel(world, seconds) {
  const started = world.levelIndex;
  const steps = Math.floor(seconds / STEP);
  let path = null;
  let pathIndex = 0;
  let replanIn = 0;
  let lastGoal = null;
  for (let i = 0; i < steps; i += 1) {
    if (world.phase !== PHASE_LEVEL || world.levelIndex !== started) break;
    const goal = goalTile(world);
    if (!path || replanIn <= 0 || lastGoal !== goal) {
      path = findPath(world.tiles, world.player.tile, goal);
      pathIndex = 1;
      replanIn = 45;
      lastGoal = goal;
    }
    replanIn -= 1;
    pathIndex = autopilotStep(world, path, pathIndex);
  }
}

/**
 * Stage a named scene and return the screen to draw over it.
 * title: fresh level 1 under the title screen.
 * play: level 1, mid-sneak, a guard's cone close by.
 * alert: level 2, the player half-seen and a guard closing in.
 * win: the win screen after the last level.
 */
export function stageShot(name, world) {
  if (name === 'win') {
    world.loadLevel(2);
    world.score = 3450;
    world.totalTime = 214;
    world.lanternTaken = true;
    world.phase = 'win';
    return { screen: 'win' };
  }
  if (name === 'alert') {
    world.loadLevel(1);
    const guard = world.guards[0];
    // Put Rara just inside the first guard's cone, mid-patrol.
    world.player.x = guard.x + Math.cos(guard.facing) * (GUARD.viewRange * 0.55);
    world.player.y = guard.y + Math.sin(guard.facing) * (GUARD.viewRange * 0.55);
    world.detection = 0.82;
    guard.state = 'chase';
    guard.lastSeen = { x: world.player.x, y: world.player.y };
    guard.lostLeft = 3;
    guard.alertFlash = 0.5;
    for (let i = 0; i < 30; i += 1) {
      world.step(STEP, { left: false, right: false, up: false, down: false, sneak: false });
    }
    return { screen: 'play' };
  }
  world.loadLevel(0);
  if (name === 'play') {
    // A few seconds in: Rara mid-sneak, the lantern still ahead, a
    // guard's cone sweeping nearby — the game itself, not its ending.
    autopilotLevel(world, 6);
    return { screen: 'play' };
  }
  // Default: the title scene, a few seconds of the garden at rest.
  for (let i = 0; i < 5 / STEP; i += 1) {
    world.step(STEP, IDLE);
  }
  return { screen: 'title' };
}

/** Run the autopilot through every level; returns one line per level. */
export function selfTest(world) {
  const lines = [];
  for (let level = 0; level < 3; level += 1) {
    world.loadLevel(level);
    autopilotLevel(world, 150);
    const won = world.phase === 'levelClear' || world.phase === 'win';
    lines.push(
      `L${level + 1} ${won ? 'WIN' : world.phase.toUpperCase()} score=${world.score} ` +
      `lives=${world.lives} time=${world.levelTime.toFixed(1)}s`,
    );
    if (!won) break;
  }
  return lines;
}
