// Lentera Malam — the three gardens Rara sneaks through.
// A map is 20 by 15 tiles. Legend:
//   # wall (blocks movement and sight)   . floor
//   B bush (hides the player, slows sight)   C crate (blocks movement and sight)
//   P player start   L the stolen lantern   E the garden gate (exit)
//   F firefly (optional, worth points)   1-4 guard spawns
// Each guard also gets its patrol waypoints in tile coordinates.
export const LEVELS = [
  {
    name: 'Halaman Depan',
    tip: 'Penjaga berjalan mondar-mandir. Tunggu sampai kerucut pandangnya berbalik, lalu lewat.',
    map: [
      '####################',
      '#P....B....#.......#',
      '#.....B....#...F...#',
      '#.##..B.C..#.......#',
      '#.#.......#...##...#',
      '#.#..F....#....#...#',
      '#....##...#....#..E#',
      '#.B......C.....#...#',
      '#..B....#......#...#',
      '#....C..#..B.......#',
      '#.##....#.....##...#',
      '#....F.....1..#....#',
      '#..B....##.....#...#',
      '#.....2....L...#...#',
      '####################',
    ],
    guards: [
      { waypoints: [[6, 11], [14, 11]] },
      { waypoints: [[2, 13], [10, 13]] },
    ],
  },
  {
    name: 'Taman Lentera',
    tip: 'Semak menyembunyikanmu. Berdiri di semak saat kerucut mendekat dan meter deteksi akan turun.',
    map: [
      '####################',
      '#P...B....#....F...#',
      '#....B....#........#',
      '#.##....C....##....#',
      '#..#..B.....#..#...#',
      '#..#........#..#.E.#',
      '#..B..##....#..#...#',
      '#.....#...C....#...#',
      '#.C...#..B.....#...#',
      '#.....#.......C....#',
      '#.##..#..F....##...#',
      '#.....#......1.....#',
      '#.B...#..B....#....#',
      '#..F..2....L..3....#',
      '####################',
    ],
    guards: [
      { waypoints: [[8, 11], [18, 11]] },
      { waypoints: [[2, 13], [10, 13]] },
      { waypoints: [[12, 13], [18, 13]] },
    ],
  },
  {
    name: 'Balai Kencana',
    tip: 'Empat penjaga menjaga balai. Berlari menimbulkan suara — tahan Shift untuk menyelinap diam-diam.',
    map: [
      '####################',
      '#P.B...#.....#..F..#',
      '#....B.#..C..#.....#',
      '#.##...#.....#.##..#',
      '#..#..B...C..#..#..#',
      '#..#......#.....#.E#',
      '#.B..##...#..B..#..#',
      '#....#...C....#....#',
      '#.C..#..B...#...C..#',
      '#....#......#......#',
      '#.##....##..#..##..#',
      '#....F..1....#.....#',
      '#.B.....#..B..2....#',
      '#..3....#....L...4.#',
      '####################',
    ],
    guards: [
      { waypoints: [[2, 11], [12, 11]] },
      { waypoints: [[10, 12], [18, 12]] },
      { waypoints: [[2, 13], [7, 13]] },
      { waypoints: [[14, 13], [18, 13]] },
    ],
  },
];

/** Parse one level map into tiles, the player start, the lantern, the exit and fireflies. */
export function parseLevel(def) {
  const tiles = [];
  let player = { x: 1, y: 1 };
  let lantern = { x: 1, y: 1 };
  let exit = { x: 1, y: 1 };
  const fireflies = [];
  const guardSpawns = [];
  for (let y = 0; y < def.map.length; y += 1) {
    const row = [];
    for (let x = 0; x < def.map[y].length; x += 1) {
      const ch = def.map[y][x];
      if (ch === 'P') player = { x, y };
      else if (ch === 'L') lantern = { x, y };
      else if (ch === 'E') exit = { x, y };
      else if (ch === 'F') fireflies.push({ x, y, taken: false });
      else if (ch >= '1' && ch <= '9') guardSpawns.push({ x, y, index: Number(ch) - 1 });
      row.push(ch === '#' || ch === 'C' ? ch : ch === 'B' ? 'B' : '.');
    }
    tiles.push(row);
  }
  return { tiles, player, lantern, exit, fireflies, guardSpawns };
}

/** True when tile (tx, ty) blocks movement. Walls and crates block; bushes do not. */
export function blocksMove(tiles, tx, ty) {
  if (ty < 0 || ty >= tiles.length || tx < 0 || tx >= tiles[0].length) return true;
  const ch = tiles[ty][tx];
  return ch === '#' || ch === 'C';
}

/** True when tile (tx, ty) blocks a guard's line of sight. */
export function blocksSight(tiles, tx, ty) {
  if (ty < 0 || ty >= tiles.length || tx < 0 || tx >= tiles[0].length) return true;
  const ch = tiles[ty][tx];
  return ch === '#' || ch === 'C';
}

/** True when tile (tx, ty) is a bush the player can hide in. */
export function isBush(tiles, tx, ty) {
  if (ty < 0 || ty >= tiles.length || tx < 0 || tx >= tiles[0].length) return false;
  return tiles[ty][tx] === 'B';
}
