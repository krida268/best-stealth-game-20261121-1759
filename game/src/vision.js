// Lentera Malam — seeing and being seen.
// A guard spots the player only when three things line up: the player is
// inside the guard's vision cone, the line between them is not cut by a
// wall or a crate, and the player is not hidden in a bush (unless the
// guard is close enough to see through the leaves).
import { GUARD, DETECT, TILE } from './config.js';
import { blocksSight, isBush } from './levels.js';

/** Walk the line from (x0, y0) to (x1, y1) in pixel space; false when a wall or crate cuts it. */
export function hasLineOfSight(tiles, x0, y0, x1, y1) {
  const dx = x1 - x0;
  const dy = y1 - y0;
  const dist = Math.hypot(dx, dy);
  const steps = Math.max(1, Math.ceil(dist / (TILE / 3)));
  for (let i = 1; i < steps; i += 1) {
    const t = i / steps;
    const tx = Math.floor((x0 + dx * t) / TILE);
    const ty = Math.floor((y0 + dy * t) / TILE);
    if (blocksSight(tiles, tx, ty)) return false;
  }
  return true;
}

/** Smallest absolute difference between two headings, in radians. */
export function angleDiff(a, b) {
  let d = a - b;
  while (d > Math.PI) d -= Math.PI * 2;
  while (d < -Math.PI) d += Math.PI * 2;
  return Math.abs(d);
}

/**
 * How strongly a guard at (gx, gy) facing `facing` can see a player at
 * (px, py): 0 when out of range, outside the cone or behind cover, rising
 * toward 1 as the player comes closer to the guard's nose.
 */
export function sightStrength(tiles, gx, gy, facing, px, py) {
  const dx = px - gx;
  const dy = py - gy;
  const dist = Math.hypot(dx, dy);
  if (dist > GUARD.viewRange) return 0;
  if (dist > 1 && angleDiff(Math.atan2(dy, dx), facing) > GUARD.viewHalfAngle) return 0;
  if (!hasLineOfSight(tiles, gx, gy, px, py)) return 0;
  const ptx = Math.floor(px / TILE);
  const pty = Math.floor(py / TILE);
  if (isBush(tiles, ptx, pty) && dist > GUARD.closeSpotDistance) return 0;
  const closeness = 1 - dist / GUARD.viewRange;
  return 0.35 + 0.65 * closeness;
}

/**
 * Move the detection meter one step. `seen` is the strongest sight
 * strength any guard has on the player right now (0 when nobody sees
 * them). Sneaking halves the rise. Returns the new meter value.
 */
export function stepDetection(meter, seen, sneaking, dt) {
  if (seen > 0) {
    const rate = DETECT.risePerSecond * seen * (sneaking ? DETECT.sneakFactor : 1);
    return Math.min(1, meter + rate * dt);
  }
  return Math.max(0, meter - DETECT.fallPerSecond * dt);
}

/** True when a sound of `radius` at (sx, sy) reaches a guard at (gx, gy). */
export function hearsNoise(gx, gy, sx, sy, radius) {
  return Math.hypot(sx - gx, sy - gy) <= radius + GUARD.hearRange * 0.3;
}
