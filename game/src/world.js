// Lentera Malam — the world: one level's rules, score and win/lose.
// The world owns the player, the guards, the lantern, the fireflies and
// the detection meter, and steps them all forward in fixed slices so a
// replay from the same seed always plays the same way.
import { LEVELS, parseLevel, isBush } from './levels.js';
import { Guard, STATE_CHASE, STATE_PATROL, STATE_SUSPICIOUS } from './guards.js';
import { Player } from './player.js';
import { sightStrength, stepDetection, hearsNoise } from './vision.js';
import { GUARD, DETECT, SCORE, LIVES_PER_LEVEL, TILE } from './config.js';

export const PHASE_LEVEL = 'level';
export const PHASE_LEVEL_CLEAR = 'levelClear';
export const PHASE_GAME_OVER = 'gameOver';
export const PHASE_WIN = 'win';

/** Tiny deterministic random source, so screenshots replay exactly. */
export function mulberry32(seed) {
  let a = seed >>> 0;
  return function next() {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export class World {
  constructor(seed = 20261122) {
    this.seed = seed;
    this.levelIndex = 0;
    this.score = 0;
    this.totalTime = 0;
    this.events = [];
    this.loadLevel(0);
  }

  loadLevel(index) {
    this.levelIndex = index;
    this.def = LEVELS[index];
    const parsed = parseLevel(this.def);
    this.tiles = parsed.tiles;
    this.spawn = parsed.player;
    this.lanternTile = parsed.lantern;
    this.exitTile = parsed.exit;
    this.fireflies = parsed.fireflies;
    this.player = new Player(parsed.player);
    this.guards = this.def.guards.map((g, i) => {
      const spawn = parsed.guardSpawns[i] ?? { x: g.waypoints[0][0], y: g.waypoints[0][1] };
      const waypoints = [[spawn.x, spawn.y], ...g.waypoints.slice(1)];
      return new Guard(waypoints);
    });
    this.lanternTaken = false;
    this.detection = 0;
    this.graceLeft = 0;
    this.lives = LIVES_PER_LEVEL;
    this.levelTime = 0;
    this.phase = PHASE_LEVEL;
    this.phaseTime = 0;
    this.alarm = false;
    this.rng = mulberry32(this.seed + index * 7919);
    this.speckles = this.makeSpeckles();
    this.events = [];
  }

  makeSpeckles() {
    const dots = [];
    for (let y = 0; y < this.tiles.length; y += 1) {
      for (let x = 0; x < this.tiles[0].length; x += 1) {
        if (this.tiles[y][x] !== '.') continue;
        const n = 1 + Math.floor(this.rng() * 3);
        for (let i = 0; i < n; i += 1) {
          dots.push({ x: x * TILE + 6 + this.rng() * (TILE - 12), y: y * TILE + 6 + this.rng() * (TILE - 12) });
        }
      }
    }
    return dots;
  }

  get levelName() {
    return this.def.name;
  }

  get levelTip() {
    return this.def.tip;
  }

  get inBush() {
    const t = this.player.tile;
    return isBush(this.tiles, t.x, t.y);
  }

  get exitOpen() {
    return this.lanternTaken;
  }

  /** Step the world by dt seconds. `keys` are the held movement keys. */
  step(dt, keys) {
    if (this.phase !== PHASE_LEVEL) {
      this.phaseTime += dt;
      return;
    }
    this.levelTime += dt;
    this.totalTime += dt;
    if (this.graceLeft > 0) this.graceLeft -= dt;
    const noise = this.player.update(this.tiles, dt, keys);

    let strongest = 0;
    for (const guard of this.guards) {
      let seen = sightStrength(this.tiles, guard.x, guard.y, guard.facing, this.player.x, this.player.y);
      if (this.graceLeft > 0) seen = 0;
      if (seen > strongest) strongest = seen;
    }
    // Just after being caught, Rara gets a breath: nobody spots her.
    if (this.graceLeft > 0) strongest = 0;
    this.detection = stepDetection(this.detection, strongest, this.player.sneaking, dt);
    this.alarm = this.guards.some((g) => g.alarmed) || this.detection >= DETECT.warnAt;

    // One pursuer at a time: the guard with the clearest sight gives
    // chase, the rest come to look. A whole pack would leave no escape.
    const sights = this.guards.map((guard) => {
      let seen = sightStrength(this.tiles, guard.x, guard.y, guard.facing, this.player.x, this.player.y);
      if (this.graceLeft > 0) seen = 0;
      return seen;
    });
    const bestSight = Math.max(0, ...sights);
    for (let gi = 0; gi < this.guards.length; gi += 1) {
      const guard = this.guards[gi];
      const seen = sights[gi];
      const heard = noise && hearsNoise(guard.x, guard.y, noise.x, noise.y, noise.radius)
        ? { x: noise.x, y: noise.y }
        : null;
      guard.update(this.tiles, dt, this.player, seen, heard);
      if (this.detection >= DETECT.alertAt) {
        if (seen > 0 && seen >= bestSight && guard.state !== STATE_CHASE && guard.chaseCooldown <= 0) {
          guard.state = STATE_CHASE;
          guard.chaseTime = 0;
          guard.lastSeen = { x: this.player.x, y: this.player.y };
          guard.lostLeft = DETECT.chaseLoseSeconds;
          guard.alertFlash = 0.6;
        } else if (seen < bestSight && guard.state === STATE_PATROL) {
          guard.state = STATE_SUSPICIOUS;
          guard.lastSeen = { x: this.player.x, y: this.player.y };
          guard.lookLeft = 0;
        }
      }
    }

    // Caught: a chasing guard reaches Rara.
    for (const guard of this.guards) {
      if (guard.alarmed && Math.hypot(guard.x - this.player.x, guard.y - this.player.y) < GUARD.catchDistance) {
        this.caught();
        return;
      }
    }

    // Fireflies drift by: pick one up for points.
    for (const fly of this.fireflies) {
      if (fly.taken) continue;
      const cx = fly.x * TILE + TILE / 2;
      const cy = fly.y * TILE + TILE / 2;
      if (Math.hypot(cx - this.player.x, cy - this.player.y) < 26) {
        fly.taken = true;
        this.score += SCORE.firefly;
        this.events.push('firefly');
      }
    }

    // The lantern, then the gate.
    if (!this.lanternTaken) {
      const cx = this.lanternTile.x * TILE + TILE / 2;
      const cy = this.lanternTile.y * TILE + TILE / 2;
      if (Math.hypot(cx - this.player.x, cy - this.player.y) < 28) {
        this.lanternTaken = true;
        this.score += SCORE.lantern;
        this.events.push('lantern');
      }
    } else {
      const cx = this.exitTile.x * TILE + TILE / 2;
      const cy = this.exitTile.y * TILE + TILE / 2;
      if (Math.hypot(cx - this.player.x, cy - this.player.y) < 28) {
        this.score += SCORE.levelClear + this.lives * SCORE.lifeBonus;
        this.events.push('exit');
        if (this.levelIndex + 1 >= LEVELS.length) {
          this.phase = PHASE_WIN;
        } else {
          this.phase = PHASE_LEVEL_CLEAR;
        }
        this.phaseTime = 0;
      }
    }
  }

  caught() {
    this.lives -= 1;
    this.events.push('caught');
    this.detection = 0;
    this.graceLeft = 1.5;
    if (this.lives <= 0) {
      this.phase = PHASE_GAME_OVER;
      this.phaseTime = 0;
      return;
    }
    this.player.reset(this.spawn);
    for (const guard of this.guards) guard.resetToSpawn();
  }

  nextLevel() {
    this.loadLevel(this.levelIndex + 1);
  }

  restart() {
    this.score = 0;
    this.totalTime = 0;
    this.loadLevel(0);
  }
}
