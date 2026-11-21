// Lentera Malam — the night guards of Wisma Kencana.
// A guard walks its patrol waypoints, turns to look around at each one,
// investigates a sound or a glimpse, and chases when it is sure it saw
// Rara. Losing sight for a while makes it give up and walk home.
import { GUARD, DETECT, TILE } from './config.js';
import { blocksMove } from './levels.js';

export const STATE_PATROL = 'patrol';
export const STATE_SUSPICIOUS = 'suspicious';
export const STATE_CHASE = 'chase';

function tileCentre(tx, ty) {
  return { x: tx * TILE + TILE / 2, y: ty * TILE + TILE / 2 };
}

/** Slide from (x, y) toward (tx, ty) by at most `speed * dt`, stopping at walls. */
function moveToward(tiles, x, y, tx, ty, speed, dt) {
  const dx = tx - x;
  const dy = ty - y;
  const dist = Math.hypot(dx, dy);
  if (dist < 1) return { x, y, arrived: true };
  const step = Math.min(dist, speed * dt);
  const nx = x + (dx / dist) * step;
  const ny = y + (dy / dist) * step;
  // Try the full step, then each axis alone, so the guard slides along walls.
  if (!hitsWall(tiles, nx, ny)) return { x: nx, y: ny, arrived: step >= dist - 0.5 };
  if (!hitsWall(tiles, nx, y)) return { x: nx, y, arrived: false };
  if (!hitsWall(tiles, x, ny)) return { x, y: ny, arrived: false };
  return { x, y, arrived: false };
}

function hitsWall(tiles, px, py) {
  const r = GUARD.radius - 2;
  return (
    blocksMove(tiles, Math.floor((px - r) / TILE), Math.floor((py - r) / TILE)) ||
    blocksMove(tiles, Math.floor((px + r) / TILE), Math.floor((py - r) / TILE)) ||
    blocksMove(tiles, Math.floor((px - r) / TILE), Math.floor((py + r) / TILE)) ||
    blocksMove(tiles, Math.floor((px + r) / TILE), Math.floor((py + r) / TILE))
  );
}

export class Guard {
  constructor(waypoints) {
    this.waypoints = waypoints.map(([tx, ty]) => tileCentre(tx, ty));
    this.resetToSpawn();
  }

  /** Back to the first waypoint, calm, as if the night had just begun. */
  resetToSpawn() {
    const start = this.waypoints[0];
    this.x = start.x;
    this.y = start.y;
    this.target = 1 % this.waypoints.length;
    this.facing = 0;
    this.state = STATE_PATROL;
    this.waitLeft = 0;
    this.lookLeft = 0;
    this.lookFrom = 0;
    this.lastSeen = null;
    this.lostLeft = 0;
    this.chaseTime = 0;
    this.chaseCooldown = 0;
    this.alertFlash = 0;
  }

  /** One simulation step. `seen` is this guard's sight strength on the player. */
  update(tiles, dt, player, seen, noise) {
    if (this.alertFlash > 0) this.alertFlash -= dt;
    if (this.chaseCooldown > 0) this.chaseCooldown -= dt;
    if (this.state === STATE_CHASE) {
      this.chaseTime += dt;
      if (seen > 0) {
        this.lastSeen = { x: player.x, y: player.y };
        this.lostLeft = DETECT.chaseLoseSeconds;
      } else {
        this.lostLeft -= dt;
      }
      // A chase that drags on ends: the guard loses the trail, falls
      // back to searching, and needs a breather before it can chase
      // again — Rara gets her chance to recover.
      if (this.lostLeft <= 0 || this.chaseTime > 4) {
        this.state = STATE_SUSPICIOUS;
        this.chaseCooldown = 6;
        this.lookLeft = DETECT.investigateSeconds;
        return;
      }
      const goal = this.lastSeen ?? { x: player.x, y: player.y };
      const moved = moveToward(tiles, this.x, this.y, goal.x, goal.y, GUARD.chaseSpeed, dt);
      this.faceToward(moved.x - this.x, moved.y - this.y);
      this.x = moved.x;
      this.y = moved.y;
      return;
    }

    if (seen >= DETECT.alertAt) {
      this.state = STATE_CHASE;
      this.chaseTime = 0;
      this.lastSeen = { x: player.x, y: player.y };
      this.lostLeft = DETECT.chaseLoseSeconds;
      this.alertFlash = 0.6;
      return;
    }

    if (this.state === STATE_SUSPICIOUS) {
      // A glimpse while investigating does not start a chase on its own:
      // the guard keeps closing in on what it saw, and the detection
      // meter decides when the chase begins.
      if (seen > 0) this.lastSeen = { x: player.x, y: player.y };
      // Walk to where the sound or glimpse came from, then look around.
      if (this.lastSeen) {
        const moved = moveToward(tiles, this.x, this.y, this.lastSeen.x, this.lastSeen.y, GUARD.suspiciousSpeed, dt);
        this.faceToward(moved.x - this.x, moved.y - this.y);
        this.x = moved.x;
        this.y = moved.y;
        if (!moved.arrived) return;
        this.lastSeen = null;
        this.lookLeft = DETECT.investigateSeconds;
        return;
      }
      if (this.lookLeft > 0) {
        this.lookLeft -= dt;
        this.facing += dt * 1.6;
        return;
      }
      this.state = STATE_PATROL;
    }

    if (noise && this.state === STATE_PATROL) {
      this.lastSeen = { x: noise.x, y: noise.y };
      this.state = STATE_SUSPICIOUS;
      this.lookLeft = DETECT.investigateSeconds;
      return;
    }

    // Patrol: walk to the next waypoint, pause and look around there.
    if (this.waitLeft > 0) {
      this.waitLeft -= dt;
      this.facing += dt * 0.9;
      return;
    }
    const goal = this.waypoints[this.target];
    const moved = moveToward(tiles, this.x, this.y, goal.x, goal.y, GUARD.patrolSpeed, dt);
    this.faceToward(moved.x - this.x, moved.y - this.y);
    this.x = moved.x;
    this.y = moved.y;
    if (moved.arrived) {
      this.target = (this.target + 1) % this.waypoints.length;
      this.waitLeft = 1.1;
    }
  }

  faceToward(dx, dy) {
    if (Math.abs(dx) > 0.5 || Math.abs(dy) > 0.5) this.facing = Math.atan2(dy, dx);
  }

  get alarmed() {
    return this.state === STATE_CHASE;
  }
}
