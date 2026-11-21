// Lentera Malam — drawing the garden, the guards and the HUD.
// Everything is drawn on one canvas with plain shapes: moonlit tiles,
// stone walls, rustling bushes, crates, and the guards' vision cones,
// so the game needs no image file at all.
import { TILE, VIEW_W, VIEW_H, PALETTE, GUARD, DETECT } from './config.js';
import { PHASE_LEVEL_CLEAR, PHASE_GAME_OVER, PHASE_WIN } from './world.js';

function roundRect(ctx, x, y, w, h, r) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.arcTo(x + w, y, x + w, y + h, r);
  ctx.arcTo(x + w, y + h, x, y + h, r);
  ctx.arcTo(x, y + h, x, y, r);
  ctx.arcTo(x, y, x + w, y, r);
  ctx.closePath();
}

function drawCone(ctx, guard) {
  const range = GUARD.viewRange;
  const half = GUARD.viewHalfAngle;
  const colour = guard.alarmed
    ? PALETTE.coneAlert
    : guard.state === 'suspicious'
      ? PALETTE.coneWarn
      : PALETTE.coneCalm;
  ctx.fillStyle = colour;
  ctx.beginPath();
  ctx.moveTo(guard.x, guard.y);
  ctx.arc(guard.x, guard.y, range, guard.facing - half, guard.facing + half);
  ctx.closePath();
  ctx.fill();
}

function drawGuard(ctx, guard, time) {
  drawCone(ctx, guard);
  const bob = Math.sin(time * 6 + guard.x) * 1.5;
  ctx.fillStyle = PALETTE.guardDark;
  ctx.beginPath();
  ctx.arc(guard.x, guard.y + 3, GUARD.radius, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = PALETTE.guard;
  ctx.beginPath();
  ctx.arc(guard.x, guard.y + bob * 0.4, GUARD.radius - 2, 0, Math.PI * 2);
  ctx.fill();
  // Helmet brim and the direction the guard faces.
  ctx.fillStyle = '#f2c14e';
  ctx.beginPath();
  ctx.arc(guard.x, guard.y + bob * 0.4, 5, 0, Math.PI * 2);
  ctx.fill();
  const nx = guard.x + Math.cos(guard.facing) * (GUARD.radius + 5);
  const ny = guard.y + Math.sin(guard.facing) * (GUARD.radius + 5);
  ctx.strokeStyle = guard.alarmed ? '#ff5a3c' : '#ffd65a';
  ctx.lineWidth = 3;
  ctx.beginPath();
  ctx.moveTo(guard.x, guard.y);
  ctx.lineTo(nx, ny);
  ctx.stroke();
  if (guard.alarmed || guard.state === 'suspicious') {
    ctx.fillStyle = guard.alarmed ? '#ff5a3c' : '#ffd65a';
    ctx.font = 'bold 20px sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText(guard.alarmed ? '!' : '?', guard.x, guard.y - GUARD.radius - 8);
  }
  if (guard.alertFlash > 0) {
    ctx.strokeStyle = `rgba(255, 90, 60, ${Math.min(1, guard.alertFlash * 2)})`;
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.arc(guard.x, guard.y, GUARD.radius + 8, 0, Math.PI * 2);
    ctx.stroke();
  }
}

function drawPlayer(ctx, world, time) {
  const p = world.player;
  const sway = p.moving ? Math.sin(p.stepPhase * Math.PI * 2) * 2 : 0;
  // Lantern glow around Rara.
  const glow = ctx.createRadialGradient(p.x, p.y, 4, p.x, p.y, 64);
  glow.addColorStop(0, 'rgba(255, 214, 106, 0.30)');
  glow.addColorStop(1, 'rgba(255, 214, 106, 0)');
  ctx.fillStyle = glow;
  ctx.beginPath();
  ctx.arc(p.x, p.y, 64, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = PALETTE.playerDark;
  ctx.beginPath();
  ctx.arc(p.x, p.y + 3, 14, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = PALETTE.player;
  ctx.beginPath();
  ctx.arc(p.x + sway * 0.4, p.y, 12, 0, Math.PI * 2);
  ctx.fill();
  // Hood point in the direction she faces.
  ctx.fillStyle = '#e8f0dd';
  ctx.beginPath();
  ctx.arc(p.x + Math.cos(p.facing) * 7, p.y + Math.sin(p.facing) * 7, 4.5, 0, Math.PI * 2);
  ctx.fill();
  if (world.inBush) {
    ctx.strokeStyle = 'rgba(207, 232, 154, 0.9)';
    ctx.lineWidth = 2;
    ctx.setLineDash([4, 4]);
    ctx.beginPath();
    ctx.arc(p.x, p.y, 19, 0, Math.PI * 2);
    ctx.stroke();
    ctx.setLineDash([]);
  }
}

function drawTiles(ctx, world) {
  const tiles = world.tiles;
  for (let y = 0; y < tiles.length; y += 1) {
    for (let x = 0; x < tiles[0].length; x += 1) {
      const px = x * TILE;
      const py = y * TILE;
      const ch = tiles[y][x];
      if (ch === '#') {
        ctx.fillStyle = PALETTE.wall;
        ctx.fillRect(px, py, TILE, TILE);
        ctx.fillStyle = PALETTE.wallTop;
        ctx.fillRect(px, py, TILE, 10);
        ctx.fillStyle = 'rgba(0,0,0,0.25)';
        ctx.fillRect(px, py + TILE - 6, TILE, 6);
      } else {
        ctx.fillStyle = (x + y) % 2 === 0 ? PALETTE.floorA : PALETTE.floorB;
        ctx.fillRect(px, py, TILE, TILE);
        if (ch === 'B') {
          ctx.fillStyle = PALETTE.bushDark;
          ctx.beginPath();
          ctx.arc(px + 14, py + 26, 13, 0, Math.PI * 2);
          ctx.arc(px + 32, py + 20, 14, 0, Math.PI * 2);
          ctx.arc(px + 24, py + 34, 12, 0, Math.PI * 2);
          ctx.fill();
          ctx.fillStyle = PALETTE.bush;
          ctx.beginPath();
          ctx.arc(px + 16, py + 22, 10, 0, Math.PI * 2);
          ctx.arc(px + 32, py + 26, 10, 0, Math.PI * 2);
          ctx.arc(px + 24, py + 32, 9, 0, Math.PI * 2);
          ctx.fill();
        } else if (ch === 'C') {
          ctx.fillStyle = PALETTE.crate;
          ctx.fillRect(px + 5, py + 5, TILE - 10, TILE - 10);
          ctx.strokeStyle = PALETTE.crateEdge;
          ctx.lineWidth = 2;
          ctx.strokeRect(px + 5, py + 5, TILE - 10, TILE - 10);
          ctx.beginPath();
          ctx.moveTo(px + 5, py + 5);
          ctx.lineTo(px + TILE - 5, py + TILE - 5);
          ctx.moveTo(px + TILE - 5, py + 5);
          ctx.lineTo(px + 5, py + TILE - 5);
          ctx.stroke();
        }
      }
    }
  }
  ctx.fillStyle = PALETTE.grassDot;
  for (const d of world.speckles) ctx.fillRect(d.x, d.y, 2, 2);
}

function drawPickups(ctx, world, time) {
  const pulse = 0.75 + Math.sin(time * 3) * 0.25;
  for (const fly of world.fireflies) {
    if (fly.taken) continue;
    const cx = fly.x * TILE + TILE / 2;
    const cy = fly.y * TILE + TILE / 2 + Math.sin(time * 2 + fly.x) * 3;
    const glow = ctx.createRadialGradient(cx, cy, 1, cx, cy, 18);
    glow.addColorStop(0, `rgba(207, 232, 154, ${0.55 * pulse})`);
    glow.addColorStop(1, 'rgba(207, 232, 154, 0)');
    ctx.fillStyle = glow;
    ctx.beginPath();
    ctx.arc(cx, cy, 18, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = PALETTE.firefly;
    ctx.beginPath();
    ctx.arc(cx, cy, 4, 0, Math.PI * 2);
    ctx.fill();
  }
  if (!world.lanternTaken) {
    const cx = world.lanternTile.x * TILE + TILE / 2;
    const cy = world.lanternTile.y * TILE + TILE / 2;
    const glow = ctx.createRadialGradient(cx, cy, 2, cx, cy, 46);
    glow.addColorStop(0, `rgba(255, 157, 46, ${0.5 * pulse})`);
    glow.addColorStop(1, 'rgba(255, 157, 46, 0)');
    ctx.fillStyle = glow;
    ctx.beginPath();
    ctx.arc(cx, cy, 46, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = PALETTE.lantern;
    roundRect(ctx, cx - 8, cy - 11, 16, 22, 4);
    ctx.fill();
    ctx.fillStyle = '#8a5a12';
    ctx.fillRect(cx - 5, cy - 14, 10, 4);
  }
  const ex = world.exitTile.x * TILE + TILE / 2;
  const ey = world.exitTile.y * TILE + TILE / 2;
  const open = world.exitOpen;
  ctx.strokeStyle = open ? PALETTE.exit : '#3d5a44';
  ctx.lineWidth = 4;
  ctx.strokeRect(ex - 18, ey - 18, 36, 36);
  if (open) {
    const glow = ctx.createRadialGradient(ex, ey, 2, ex, ey, 40);
    glow.addColorStop(0, 'rgba(55, 214, 122, 0.45)');
    glow.addColorStop(1, 'rgba(55, 214, 122, 0)');
    ctx.fillStyle = glow;
    ctx.beginPath();
    ctx.arc(ex, ey, 40, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = PALETTE.exit;
    ctx.font = 'bold 15px sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('KELUAR', ex, ey + 5);
  } else {
    ctx.fillStyle = '#5a6b5e';
    ctx.font = 'bold 11px sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('TERKUNCI', ex, ey + 4);
  }
}

function drawHud(ctx, world) {
  ctx.fillStyle = PALETTE.hud;
  ctx.fillRect(0, 0, VIEW_W, 34);
  ctx.fillStyle = PALETTE.text;
  ctx.font = 'bold 15px sans-serif';
  ctx.textAlign = 'left';
  ctx.fillText(`Level ${world.levelIndex + 1}/3 · ${world.levelName}`, 12, 22);
  ctx.fillText(`Skor ${world.score}`, 330, 22);
  const mins = Math.floor(world.totalTime / 60);
  const secs = Math.floor(world.totalTime % 60);
  ctx.fillText(`${mins}:${String(secs).padStart(2, '0')}`, 470, 22);
  ctx.fillText('♥'.repeat(Math.max(0, world.lives)), 560, 22);
  ctx.fillText(world.lanternTaken ? '🏮 Lentera ✓' : '🏮 Cari lentera', 660, 22);
  // Detection meter.
  const mx = 830;
  ctx.fillStyle = '#2a332b';
  roundRect(ctx, mx, 10, 110, 14, 7);
  ctx.fill();
  const d = world.detection;
  ctx.fillStyle = d >= DETECT.warnAt ? '#ff5a3c' : d > 0.25 ? '#ffb13c' : '#37d67a';
  if (d > 0.01) {
    roundRect(ctx, mx, 10, 110 * d, 14, 7);
    ctx.fill();
  }
  ctx.fillStyle = PALETTE.dim;
  ctx.font = '11px sans-serif';
  ctx.textAlign = 'left';
  ctx.fillText('TERLIHAT', mx, 33);
  if (world.inBush) {
    ctx.fillStyle = '#cfe89a';
    ctx.font = 'bold 12px sans-serif';
    ctx.fillText('TERSEMBUNYI DI SEMAK', 12, 52);
  }
  if (world.alarm) {
    ctx.fillStyle = '#ff5a3c';
    ctx.font = 'bold 13px sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('! TERDETEKSI !', VIEW_W / 2, 56);
  }
}

function panel(ctx, title, lines, accent) {
  ctx.fillStyle = 'rgba(8, 12, 9, 0.82)';
  ctx.fillRect(0, 0, VIEW_W, VIEW_H);
  ctx.fillStyle = accent;
  ctx.font = 'bold 44px sans-serif';
  ctx.textAlign = 'center';
  ctx.fillText(title, VIEW_W / 2, 250);
  ctx.fillStyle = PALETTE.text;
  ctx.font = '18px sans-serif';
  lines.forEach((line, i) => ctx.fillText(line, VIEW_W / 2, 300 + i * 30));
}

/** Draw the whole game: the garden, then the HUD, then any open screen. */
export function render(ctx, world, screen, time) {
  ctx.clearRect(0, 0, VIEW_W, VIEW_H);
  ctx.save();
  ctx.translate(0, 34);
  drawTiles(ctx, world);
  drawPickups(ctx, world, time);
  for (const guard of world.guards) drawGuard(ctx, guard, time);
  drawPlayer(ctx, world, time);
  ctx.restore();
  drawHud(ctx, world);
  if (screen === 'title') {
    panel(ctx, 'LENTERA MALAM', [
      'Menyelinaplah melewati penjaga Wisma Kencana.',
      'Ambil lentera yang dicuri, lalu capai gerbang hijau.',
      '',
      'Gerak: WASD / panah · Menyelinap: tahan Shift · Jeda: P',
      'Semak menyembunyikanmu · Berjalan menimbulkan suara',
      '',
      'Tekan Enter atau klik untuk mulai',
    ], '#ffd76a');
  } else if (screen === 'paused') {
    panel(ctx, 'JEDA', ['Tekan P untuk lanjut.', world.levelTip], '#e8f0dd');
  } else if (screen === 'levelClear' || world.phase === PHASE_LEVEL_CLEAR) {
    panel(ctx, 'LEVEL SELESAI!', [
      `${world.levelName} dilewati tanpa tertangkap sepenuhnya.`,
      `Skor: ${world.score}`,
      '',
      'Tekan Enter untuk lanjut ke level berikutnya',
    ], '#37d67a');
  } else if (world.phase === PHASE_GAME_OVER) {
    panel(ctx, 'TERTANGKAP!', [
      'Para penjaga akhirnya menangkap Rara.',
      `Skor akhir: ${world.score}`,
      '',
      'Tekan Enter untuk mencoba lagi dari awal',
    ], '#ff5a3c');
  } else if (world.phase === PHASE_WIN) {
    panel(ctx, 'LENTERA KEMBALI!', [
      'Rara membawa pulang lentera dan lolos tanpa jejak.',
      `Skor akhir: ${world.score} · Waktu: ${Math.floor(world.totalTime / 60)}:${String(Math.floor(world.totalTime % 60)).padStart(2, '0')}`,
      '',
      'Tekan Enter untuk bermain lagi',
    ], '#ffd76a');
  }
}
