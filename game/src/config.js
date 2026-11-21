// Lentera Malam — shared tuning numbers for the whole game.
// One place holds every speed, range and colour so the levels,
// the guards and the renderer never disagree about the rules.
export const TILE = 48;
export const VIEW_W = 960;
// 15 tile rows of 48px plus the 34px HUD bar on top.
export const VIEW_H = 754;

export const PLAYER = {
  radius: 14,
  walkSpeed: 150,
  sneakSpeed: 82,
  walkNoise: 36,
  sneakNoise: 0,
};

export const GUARD = {
  radius: 14,
  patrolSpeed: 62,
  suspiciousSpeed: 88,
  chaseSpeed: 120,
  viewRange: 150,
  viewHalfAngle: 0.52,
  catchDistance: 22,
  hearRange: 130,
  closeSpotDistance: 42,
};

export const DETECT = {
  risePerSecond: 0.5,
  fallPerSecond: 0.85,
  sneakFactor: 0.45,
  alertAt: 1,
  warnAt: 0.55,
  chaseLoseSeconds: 3,
  investigateSeconds: 2.2,
};

export const SCORE = {
  firefly: 100,
  lantern: 500,
  levelClear: 1000,
  lifeBonus: 250,
};

export const LIVES_PER_LEVEL = 3;

export const PALETTE = {
  floorA: '#1d2b1f',
  floorB: '#182619',
  grassDot: '#243824',
  wall: '#4a4238',
  wallTop: '#6b5f4f',
  bush: '#2e5d33',
  bushDark: '#224425',
  crate: '#7a5a33',
  crateEdge: '#5d4426',
  exit: '#37d67a',
  exitGlow: '#1d7a44',
  lantern: '#ffd76a',
  lanternGlow: '#ff9d2e',
  firefly: '#cfe89a',
  player: '#39c2c9',
  playerDark: '#1d7f86',
  guard: '#e05a4e',
  guardDark: '#8f2f26',
  coneCalm: 'rgba(255, 214, 90, 0.20)',
  coneWarn: 'rgba(255, 150, 40, 0.30)',
  coneAlert: 'rgba(255, 60, 40, 0.34)',
  hud: '#0d130e',
  text: '#e8f0dd',
  dim: '#9fb3a0',
};
