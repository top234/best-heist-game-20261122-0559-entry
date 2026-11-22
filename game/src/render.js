// Drawing only: the world's state and the current screen in, pixels out.
// The 1280x800 playfield scales to fit the window. Warm lamp pools, a
// darkness mask with light cut out of it, vision cones, speech bubbles,
// HUD, Field Notes panel and the gold annotation layer for screenshots.

import { COLS, FIELD, FONT, LOOT_COUNT, PALETTE, ROWS, TILE } from './config.js';
import { DECOR, EXIT_TILE as EXIT, LAMPS, LOOT, SHELVES, tileCentre } from './world.js';

export const SCREEN_TITLE = 'title';
export const SCREEN_PLAY = 'play';
export const SCREEN_PAUSED = 'paused';
export const SCREEN_OVER = 'over';
export const SCREEN_WIN = 'win';

const NOTES = [
  ['Guard + yellow cone', 'Patrols a fixed route. A red cone means it sees you.'],
  ['Blind spot', 'Dark floor far from lamps: guards see you much later.'],
  ['Lamplight', 'Warm pools of light. Crossing one in a cone is risky.'],
  ['CCTV camera', 'Sweeping cone on the wall. It raises the alarm too.'],
  ['Distraction (Q)', 'Throw a pebble (3x). The nearest guard investigates it.'],
  ['EXIT needs 3 loot', 'The green exit only opens after all three treasures.'],
];

function formatTime(seconds) {
  const m = Math.floor(seconds / 60);
  const s = Math.floor(seconds % 60);
  return `${m}:${String(s).padStart(2, '0')}`;
}

export function createRenderer(canvas) {
  const context = canvas.getContext('2d');
  const view = { scale: 1, x: 0, y: 0 };
  const dark = document.createElement('canvas');
  dark.width = FIELD.width;
  dark.height = FIELD.height;
  const darkCtx = dark.getContext('2d');
  const fonts = new Map();

  function resize() {
    const ratio = window.devicePixelRatio || 1;
    const width = Math.round(window.innerWidth * ratio);
    const height = Math.round(window.innerHeight * ratio);
    canvas.width = width;
    canvas.height = height;
    view.scale = Math.min(width / FIELD.width, height / FIELD.height);
    view.x = (width - FIELD.width * view.scale) / 2;
    view.y = (height - FIELD.height * view.scale) / 2;
  }

  function text(value, x, y, size, color, align, baseline) {
    if (!fonts.has(size)) fonts.set(size, `bold ${size}px ${FONT}`);
    context.font = fonts.get(size);
    context.fillStyle = color;
    context.textAlign = align || 'left';
    context.textBaseline = baseline || 'alphabetic';
    context.fillText(value, x, y);
  }

  function conePath(x, y, angle, range, halfAngle) {
    context.beginPath();
    context.moveTo(x, y);
    context.arc(x, y, range, angle - halfAngle, angle + halfAngle);
    context.closePath();
  }

  function drawFloor(state) {
    for (let y = 0; y < ROWS; y += 1) {
      for (let x = 0; x < COLS; x += 1) {
        context.fillStyle = (x + y) % 2 === 0 ? PALETTE.floor : PALETTE.floorAlt;
        context.fillRect(x * TILE, y * TILE, TILE, TILE);
      }
    }
    // Paint-only decor: bookshelves, glass cases, plants, painting.
    for (const d of DECOR) {
      const px = d.x * TILE;
      const py = d.y * TILE;
      if (d.kind === 'books') {
        context.fillStyle = '#4a3423';
        context.fillRect(px + 3, py + 4, 34, 26);
        for (let i = 0; i < 5; i += 1) {
          context.fillStyle = ['#8a4a3a', '#4a6b8a', '#6b8a4a', '#b08d2e', '#7a4a8a'][i];
          context.fillRect(px + 6 + i * 6, py + 8, 5, 18);
        }
      } else if (d.kind === 'case') {
        context.fillStyle = 'rgba(150, 200, 255, 0.18)';
        context.fillRect(px + 4, py + 4, 32, 24);
        context.strokeStyle = '#9db8d6';
        context.lineWidth = 2;
        context.strokeRect(px + 4, py + 4, 32, 24);
        context.fillStyle = '#f2c94c';
        context.beginPath();
        context.arc(px + 20, py + 16, 4, 0, Math.PI * 2);
        context.fill();
      } else if (d.kind === 'plant') {
        context.fillStyle = '#2c4a2c';
        context.beginPath();
        context.arc(px + 20, py + 14, 11, 0, Math.PI * 2);
        context.fill();
        context.fillStyle = '#3d6b35';
        context.beginPath();
        context.arc(px + 15, py + 10, 7, 0, Math.PI * 2);
        context.arc(px + 25, py + 10, 7, 0, Math.PI * 2);
        context.fill();
        context.fillStyle = '#6b4a2e';
        context.fillRect(px + 15, py + 24, 10, 8);
      } else if (d.kind === 'painting') {
        context.fillStyle = '#b08d2e';
        context.fillRect(px, py + 2, 40, 26);
        context.fillStyle = '#2a4a6b';
        context.fillRect(px + 4, py + 6, 32, 18);
        context.fillStyle = '#f2c94c';
        context.beginPath();
        context.arc(px + 20, py + 15, 5, 0, Math.PI * 2);
        context.fill();
      }
    }
    // Walls.
    for (let y = 0; y < ROWS; y += 1) {
      for (let x = 0; x < COLS; x += 1) {
        if (!state.grid[y][x]) continue;
        const isShelf = SHELVES.some((s) => x >= s.x && x < s.x + s.w && y >= s.y && y < s.y + s.h);
        if (isShelf) {
          context.fillStyle = PALETTE.shelf;
          context.fillRect(x * TILE + 1, y * TILE + 1, TILE - 2, TILE - 2);
          context.fillStyle = PALETTE.shelfTop;
          context.fillRect(x * TILE + 1, y * TILE + 1, TILE - 2, 8);
          context.fillStyle = '#f2c94c';
          context.fillRect(x * TILE + 8, y * TILE + 16, 5, 5);
          context.fillRect(x * TILE + 24, y * TILE + 16, 5, 5);
        } else {
          context.fillStyle = PALETTE.wall;
          context.fillRect(x * TILE, y * TILE, TILE, TILE);
          context.fillStyle = PALETTE.wallTop;
          context.fillRect(x * TILE, y * TILE, TILE, 5);
        }
      }
    }
    // Warm lamp pools on the floor.
    for (const lamp of LAMPS) {
      const c = tileCentre(lamp);
      const grad = context.createRadialGradient(c.x, c.y, 8, c.x, c.y, 130);
      grad.addColorStop(0, PALETTE.lamp);
      grad.addColorStop(1, 'rgba(255, 190, 90, 0)');
      context.fillStyle = grad;
      context.beginPath();
      context.arc(c.x, c.y, 130, 0, Math.PI * 2);
      context.fill();
      context.fillStyle = '#ffd98a';
      context.beginPath();
      context.arc(c.x, c.y, 5, 0, Math.PI * 2);
      context.fill();
    }
  }

  function drawExit(state) {
    const c = tileCentre(EXIT);
    const open = state.lootTaken === LOOT_COUNT;
    context.fillStyle = open ? 'rgba(61, 220, 132, 0.35)' : 'rgba(61, 220, 132, 0.14)';
    context.fillRect(EXIT.x * TILE + 2, EXIT.y * TILE + 2, TILE - 4, TILE - 4);
    context.strokeStyle = PALETTE.green;
    context.lineWidth = 3;
    context.strokeRect(EXIT.x * TILE + 2, EXIT.y * TILE + 2, TILE - 4, TILE - 4);
    text('EXIT', c.x, c.y + 6, 15, open ? '#c8ffe2' : '#7ab894', 'center', 'middle');
    if (!open) text('🔒', c.x, c.y - 14, 13, '#7ab894', 'center', 'middle');
  }

  function drawLoot(state) {
    for (const loot of state.loot) {
      if (loot.taken) continue;
      const c = tileCentre(loot.tile);
      const pulse = 1 + Math.sin(state.elapsed * 3 + loot.id) * 0.12;
      const grad = context.createRadialGradient(c.x, c.y, 2, c.x, c.y, 34 * pulse);
      grad.addColorStop(0, loot.color);
      grad.addColorStop(1, 'rgba(0,0,0,0)');
      context.fillStyle = grad;
      context.beginPath();
      context.arc(c.x, c.y, 34 * pulse, 0, Math.PI * 2);
      context.fill();
      context.fillStyle = loot.color;
      context.beginPath();
      context.arc(c.x, c.y, 11, 0, Math.PI * 2);
      context.fill();
      text(loot.glyph, c.x, c.y + 5, 15, '#171226', 'center', 'middle');
      text(loot.name, c.x, c.y + 28, 11, loot.color, 'center', 'middle');
    }
  }

  function drawCones(state) {
    for (const g of state.guards) {
      conePath(g.x, g.y, g.angle, 200, 0.61);
      context.fillStyle = g.seeing ? PALETTE.coneSeen : PALETTE.cone;
      context.fill();
    }
    for (const cam of state.cameras) {
      conePath(cam.x, cam.y, cam.angle, 220, 0.5);
      context.fillStyle = cam.seeing ? PALETTE.coneSeen : 'rgba(255, 220, 120, 0.16)';
      context.fill();
    }
  }

  function drawBubble(x, y, label) {
    context.font = `bold 13px ${FONT}`;
    const w = context.measureText(label).width + 18;
    const bx = Math.min(Math.max(x - w / 2, 8), FIELD.width - w - 8);
    const by = Math.max(y - 52, 66);
    context.fillStyle = 'rgba(244, 239, 228, 0.95)';
    context.beginPath();
    context.roundRect(bx, by, w, 26, 8);
    context.fill();
    context.fillStyle = '#171226';
    context.textAlign = 'center';
    context.textBaseline = 'middle';
    context.fillText(label, bx + w / 2, by + 14);
    context.beginPath();
    context.moveTo(x - 6, by + 26);
    context.lineTo(x + 6, by + 26);
    context.lineTo(x, by + 34);
    context.closePath();
    context.fill();
  }

  function drawGuards(state) {
    for (const g of state.guards) {
      // Body: navy uniform, brass buttons, cap.
      context.fillStyle = PALETTE.guardUniform;
      context.beginPath();
      context.arc(g.x, g.y, 14, 0, Math.PI * 2);
      context.fill();
      context.fillStyle = PALETTE.guard;
      context.beginPath();
      context.arc(g.x, g.y - 4, 8, 0, Math.PI * 2);
      context.fill();
      context.fillStyle = '#2a3350';
      context.fillRect(g.x - 8, g.y - 12, 16, 5);
      context.fillStyle = PALETTE.gold;
      context.fillRect(g.x - 1, g.y + 2, 2, 8);
      // Facing tick.
      context.strokeStyle = g.seeing ? PALETTE.red : PALETTE.gold;
      context.lineWidth = 3;
      context.beginPath();
      context.moveTo(g.x, g.y);
      context.lineTo(g.x + Math.cos(g.angle) * 20, g.y + Math.sin(g.angle) * 20);
      context.stroke();
      // Suspicion arc above the head.
      if (g.suspicion > 0.05) {
        context.strokeStyle = g.suspicion > 0.7 ? PALETTE.red : PALETTE.orange;
        context.lineWidth = 4;
        context.beginPath();
        context.arc(g.x, g.y, 20, -Math.PI / 2, -Math.PI / 2 + Math.PI * 2 * g.suspicion);
        context.stroke();
      }
      if (g.bubble) drawBubble(g.x, g.y, g.bubble);
      if (g.mode === 'investigate' && g.investigate) {
        context.strokeStyle = PALETTE.orange;
        context.lineWidth = 2;
        context.setLineDash([5, 5]);
        context.beginPath();
        context.arc(g.investigate.x, g.investigate.y, 16, 0, Math.PI * 2);
        context.stroke();
        context.setLineDash([]);
        text('?', g.investigate.x, g.investigate.y + 5, 16, PALETTE.orange, 'center', 'middle');
      }
    }
    // Cameras: small wall boxes with a lens dot.
    for (const cam of state.cameras) {
      context.fillStyle = '#3a3f52';
      context.fillRect(cam.x - 12, cam.y - 9, 24, 18);
      context.fillStyle = cam.seeing ? PALETTE.red : PALETTE.green;
      context.beginPath();
      context.arc(cam.x + Math.cos(cam.angle) * 10, cam.y + Math.sin(cam.angle) * 10, 4, 0, Math.PI * 2);
      context.fill();
      context.strokeStyle = '#9aa3c0';
      context.lineWidth = 2;
      context.beginPath();
      context.moveTo(cam.x, cam.y);
      context.lineTo(cam.x + Math.cos(cam.angle) * 14, cam.y + Math.sin(cam.angle) * 14);
      context.stroke();
    }
  }

  function drawPebble(state) {
    if (!state.pebble) return;
    context.strokeStyle = PALETTE.gold;
    context.lineWidth = 2;
    context.beginPath();
    context.arc(state.pebble.x, state.pebble.y, 10 + (6 - state.pebble.ttl) * 2, 0, Math.PI * 2);
    context.stroke();
    context.fillStyle = '#d8d8d8';
    context.beginPath();
    context.arc(state.pebble.x, state.pebble.y, 4, 0, Math.PI * 2);
    context.fill();
    text('clink!', state.pebble.x, state.pebble.y - 16, 12, PALETTE.gold, 'center', 'middle');
  }

  function drawPlayer(state) {
    const p = state.player;
    // Soft personal light so the thief is always readable.
    const grad = context.createRadialGradient(p.x, p.y, 4, p.x, p.y, 46);
    grad.addColorStop(0, 'rgba(242, 201, 76, 0.18)');
    grad.addColorStop(1, 'rgba(242, 201, 76, 0)');
    context.fillStyle = grad;
    context.beginPath();
    context.arc(p.x, p.y, 46, 0, Math.PI * 2);
    context.fill();
    context.fillStyle = PALETTE.thief;
    context.beginPath();
    context.arc(p.x, p.y, PLAYER_RADIUS, 0, Math.PI * 2);
    context.fill();
    context.strokeStyle = PALETTE.thiefTrim;
    context.lineWidth = 2;
    context.stroke();
    // Wide-brim hat + mask.
    context.fillStyle = '#0d0f16';
    context.beginPath();
    context.ellipse(p.x, p.y - 3, 15, 5, 0, 0, Math.PI * 2);
    context.fill();
    context.fillStyle = '#f4efe4';
    context.beginPath();
    context.arc(p.x - 4, p.y - 1, 2, 0, Math.PI * 2);
    context.arc(p.x + 4, p.y - 1, 2, 0, Math.PI * 2);
    context.fill();
    if (p.sneaking) text('sneak', p.x, p.y + 26, 11, PALETTE.muted, 'center', 'middle');
  }

  function drawDarkness(state) {
    darkCtx.setTransform(1, 0, 0, 1, 0, 0);
    darkCtx.globalCompositeOperation = 'source-over';
    darkCtx.clearRect(0, 0, FIELD.width, FIELD.height);
    darkCtx.fillStyle = PALETTE.dark;
    darkCtx.fillRect(0, 0, FIELD.width, FIELD.height);
    darkCtx.globalCompositeOperation = 'destination-out';
    function hole(x, y, r) {
      const g = darkCtx.createRadialGradient(x, y, 4, x, y, r);
      g.addColorStop(0, 'rgba(0,0,0,1)');
      g.addColorStop(1, 'rgba(0,0,0,0)');
      darkCtx.fillStyle = g;
      darkCtx.beginPath();
      darkCtx.arc(x, y, r, 0, Math.PI * 2);
      darkCtx.fill();
    }
    for (const lamp of LAMPS) {
      const c = tileCentre(lamp);
      hole(c.x, c.y, 150);
    }
    hole(state.player.x, state.player.y, 90);
    for (const loot of state.loot) {
      if (!loot.taken) {
        const c = tileCentre(loot.tile);
        hole(c.x, c.y, 60);
      }
    }
    const exit = tileCentre(EXIT);
    hole(exit.x, exit.y, 70);
    context.drawImage(dark, 0, 0);
  }

  function drawHud(state, screen, best) {
    context.fillStyle = PALETTE.hud;
    context.fillRect(0, 0, FIELD.width, 56);
    text('THE GILDED VAULT', 16, 34, 22, PALETTE.gold, 'left', 'middle');
    text('Steal all 3 treasures, then reach the green EXIT', 240, 34, 14, PALETTE.muted, 'left', 'middle');
    // Loot pips.
    let lx = 640;
    text(`LOOT ${state.lootTaken}/3`, lx, 34, 16, PALETTE.text, 'left', 'middle');
    for (let i = 0; i < LOOT_COUNT; i += 1) {
      context.fillStyle = i < state.lootTaken ? PALETTE.gold : '#3a3350';
      context.beginPath();
      context.arc(lx + 92 + i * 26, 28, 8, 0, Math.PI * 2);
      context.fill();
    }
    text(`◉ pebbles ×${state.pebbles}`, 800, 34, 15, PALETTE.text, 'left', 'middle');
    // Alarm bar.
    text('ALARM', 950, 22, 12, PALETTE.muted, 'left', 'middle');
    context.fillStyle = '#3a3350';
    context.fillRect(950, 28, 150, 12);
    context.fillStyle = state.alarm > 70 ? PALETTE.red : state.alarm > 35 ? PALETTE.orange : PALETTE.gold;
    context.fillRect(950, 28, 150 * (state.alarm / 100), 12);
    // HIDDEN / SPOTTED pill.
    const spotted = state.spotted;
    context.fillStyle = spotted ? PALETTE.red : PALETTE.green;
    context.beginPath();
    context.roundRect(1120, 14, 108, 28, 14);
    context.fill();
    text(spotted ? '● SPOTTED' : '○ HIDDEN', 1174, 29, 14, '#0d0f16', 'center', 'middle');
    // Timer under the alarm bar (never over the HIDDEN/SPOTTED pill).
    text(`⏱ ${formatTime(state.elapsed)}`, 950, 52, 14, PALETTE.muted, 'left', 'middle');
    if (best > 0) text(`best ${formatTime(best)}`, 1230, 52, 11, PALETTE.muted, 'right', 'middle');
    // Footer controls.
    text('WASD / arrows move · click to walk · Shift sneak · Q / right-click throw pebble · H field notes · R restart', FIELD.width / 2, FIELD.height - 12, 13, PALETTE.muted, 'center', 'middle');
  }

  function drawNotes() {
    const w = 560;
    const h = 72 + NOTES.length * 48;
    const x = (FIELD.width - w) / 2;
    const y = (FIELD.height - h) / 2;
    context.fillStyle = 'rgba(5, 4, 12, 0.6)';
    context.fillRect(0, 0, FIELD.width, FIELD.height);
    context.fillStyle = PALETTE.panel;
    context.fillRect(x, y, w, h);
    context.strokeStyle = PALETTE.gold;
    context.lineWidth = 2;
    context.strokeRect(x, y, w, h);
    text('FIELD NOTES — read the room before you move', FIELD.width / 2, y + 36, 18, PALETTE.gold, 'center', 'middle');
    NOTES.forEach((row, i) => {
      const ry = y + 66 + i * 48;
      text(`◆ ${row[0]}`, x + 24, ry, 15, PALETTE.text, 'left', 'middle');
      text(row[1], x + 24, ry + 18, 13, PALETTE.muted, 'left', 'middle');
    });
    text('Press H to close', FIELD.width / 2, y + h - 18, 13, PALETTE.muted, 'center', 'middle');
  }

  function drawPanel(title, lines, prompt, accent) {
    const w = 640;
    const h = 150 + lines.length * 34;
    const x = (FIELD.width - w) / 2;
    const y = (FIELD.height - h) / 2;
    context.fillStyle = 'rgba(5, 4, 12, 0.72)';
    context.fillRect(0, 0, FIELD.width, FIELD.height);
    context.fillStyle = PALETTE.panel;
    context.fillRect(x, y, w, h);
    context.strokeStyle = accent || PALETTE.gold;
    context.lineWidth = 2;
    context.strokeRect(x, y, w, h);
    text(title, FIELD.width / 2, y + 64, 42, accent || PALETTE.gold, 'center', 'middle');
    lines.forEach((line, i) => text(line, FIELD.width / 2, y + 112 + i * 34, 19, PALETTE.text, 'center', 'middle'));
    text(prompt, FIELD.width / 2, y + h - 34, 17, PALETTE.muted, 'center', 'middle');
  }

  function drawAnnotations(annotations) {
    if (!annotations || annotations.length === 0) return;
    for (const a of annotations) {
      // Gold leader line from the label to its anchor.
      context.strokeStyle = PALETTE.gold;
      context.lineWidth = 2;
      context.beginPath();
      context.moveTo(a.labelX, a.labelY);
      context.lineTo(a.x, a.y);
      context.stroke();
      context.fillStyle = PALETTE.gold;
      context.beginPath();
      context.arc(a.x, a.y, 5, 0, Math.PI * 2);
      context.fill();
      context.strokeStyle = '#0d0f16';
      context.lineWidth = 1;
      context.beginPath();
      context.arc(a.x, a.y, 8, 0, Math.PI * 2);
      context.stroke();
      // Label box.
      context.font = `bold 15px ${FONT}`;
      const w = context.measureText(a.text).width + 20;
      const bx = Math.min(Math.max(a.labelX - w / 2, 8), FIELD.width - w - 8);
      const by = Math.min(Math.max(a.labelY - 16, 60), FIELD.height - 40);
      context.fillStyle = 'rgba(12, 10, 22, 0.94)';
      context.beginPath();
      context.roundRect(bx, by, w, 32, 6);
      context.fill();
      context.strokeStyle = PALETTE.gold;
      context.lineWidth = 1.5;
      context.stroke();
      context.fillStyle = PALETTE.gold;
      context.textAlign = 'center';
      context.textBaseline = 'middle';
      context.fillText(a.text, bx + w / 2, by + 17);
    }
  }

  /** Paint one frame. opts: {best, showNotes, annotations}. */
  function draw(state, screen, opts) {
    const options = opts || {};
    context.setTransform(1, 0, 0, 1, 0, 0);
    context.fillStyle = PALETTE.backdrop;
    context.fillRect(0, 0, canvas.width, canvas.height);
    context.setTransform(view.scale, 0, 0, view.scale, view.x, view.y);
    drawFloor(state);
    drawExit(state);
    drawLoot(state);
    drawCones(state);
    drawGuards(state);
    drawPebble(state);
    drawPlayer(state);
    if (screen !== SCREEN_TITLE) drawDarkness(state);
    drawHud(state, screen, options.best || 0);
    if (options.showNotes) drawNotes();
    if (screen === SCREEN_TITLE) {
      drawPanel('THE GILDED VAULT', [
        'A night gallery. Three treasures. Five guards, three cameras.',
        'Steal the Idol, the Tiara and the Vase — then slip out the green EXIT.',
        'Stay out of the yellow cones. Throw pebbles (Q) to lure guards away.',
      ], 'Press Space or click to begin  ·  H for Field Notes', PALETTE.gold);
    } else if (screen === SCREEN_PAUSED) {
      drawPanel('PAUSED', ['The guards hold their patrol.'], 'Press P or Space to resume');
    } else if (screen === SCREEN_OVER) {
      drawPanel('CAUGHT!', [
        'The alarm filled — or a guard laid a hand on you.',
        `You carried ${state.lootTaken} of 3 treasures.`,
      ], 'Press Space or R to try again', PALETTE.red);
    } else if (screen === SCREEN_WIN) {
      drawPanel('CLEAN GETAWAY!', [
        `All three treasures stolen in ${formatTime(state.elapsed)}.`,
        'The vault never knew you were there.',
      ], 'Press Space or R to play again', PALETTE.green);
    }
    drawAnnotations(options.annotations);
  }

  resize();
  window.addEventListener('resize', resize);
  return { draw };
}

const PLAYER_RADIUS = 13;
