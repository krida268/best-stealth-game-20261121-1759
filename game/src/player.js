// Lentera Malam — Rara, the courier sneaking through the gardens.
// She walks by default and sneaks while Shift is held: slower, silent,
// and harder to spot. Running is never offered — in this garden, haste
// is what gets you caught.
import { PLAYER, TILE } from './config.js';
import { blocksMove } from './levels.js';

export class Player {
  constructor(spawnTile) {
    this.reset(spawnTile);
  }

  reset(spawnTile) {
    this.x = spawnTile.x * TILE + TILE / 2;
    this.y = spawnTile.y * TILE + TILE / 2;
    this.facing = -Math.PI / 2;
    this.moving = false;
    this.sneaking = false;
    this.stepPhase = 0;
  }

  /** Move by the held keys for one step; returns the noise made, if any. */
  update(tiles, dt, keys) {
    let dx = 0;
    let dy = 0;
    if (keys.left) dx -= 1;
    if (keys.right) dx += 1;
    if (keys.up) dy -= 1;
    if (keys.down) dy += 1;
    this.sneaking = Boolean(keys.sneak);
    this.moving = dx !== 0 || dy !== 0;
    if (!this.moving) return null;
    const len = Math.hypot(dx, dy);
    const speed = this.sneaking ? PLAYER.sneakSpeed : PLAYER.walkSpeed;
    const nx = this.x + (dx / len) * speed * dt;
    const ny = this.y + (dy / len) * speed * dt;
    this.facing = Math.atan2(dy, dx);
    this.stepPhase += (speed * dt) / 26;
    if (!this.collides(tiles, nx, this.y)) this.x = nx;
    if (!this.collides(tiles, this.x, ny)) this.y = ny;
    if (this.sneaking) return null;
    return { x: this.x, y: this.y, radius: PLAYER.walkNoise };
  }

  collides(tiles, px, py) {
    const r = PLAYER.radius - 2;
    return (
      blocksMove(tiles, Math.floor((px - r) / TILE), Math.floor((py - r) / TILE)) ||
      blocksMove(tiles, Math.floor((px + r) / TILE), Math.floor((py - r) / TILE)) ||
      blocksMove(tiles, Math.floor((px - r) / TILE), Math.floor((py + r) / TILE)) ||
      blocksMove(tiles, Math.floor((px + r) / TILE), Math.floor((py + r) / TILE))
    );
  }

  get tile() {
    return { x: Math.floor(this.x / TILE), y: Math.floor(this.y / TILE) };
  }
}
