// The Gilded Vault: rules and state, with no drawing and no browser in it.
// A 32x20 tile gallery: the thief steals 3 loot pieces, dodges 5 patrolling
// guards and 3 sweeping CCTV cameras, then reaches the green EXIT.
// step() advances one fixed step and returns event bit flags.

import { ALARM, CAMERA, COLS, GUARD, LOOT_COUNT, PEBBLES, PLAYER, ROWS, TILE } from './config.js';

export const EVENT_PICKUP = 1;
export const EVENT_THROW = 2;
export const EVENT_CAUGHT = 4;
export const EVENT_WIN = 8;
export const EVENT_SEEN = 16;

export const LOOT = [
  { id: 0, name: 'Golden Idol', tile: { x: 15, y: 2 }, color: '#f2c94c', glyph: '◆' },
  { id: 1, name: 'Sapphire Tiara', tile: { x: 27, y: 4 }, color: '#6db7ff', glyph: '♛' },
  { id: 2, name: 'Jade Vase', tile: { x: 5, y: 16 }, color: '#3ddc84', glyph: '⚱' },
];

export const PLAYER_START = { x: 2, y: 18 };
export const EXIT_TILE = { x: 29, y: 18 };

/** Guard patrol routes: axis-aligned waypoint loops inside one wing each. */
export const GUARD_ROUTES = [
  [ { x: 2, y: 2 }, { x: 8, y: 2 }, { x: 8, y: 5 }, { x: 2, y: 5 } ],
  [ { x: 12, y: 2 }, { x: 19, y: 2 }, { x: 19, y: 5 }, { x: 12, y: 5 } ],
  [ { x: 23, y: 2 }, { x: 29, y: 2 }, { x: 29, y: 5 }, { x: 23, y: 5 } ],
  [ { x: 2, y: 9 }, { x: 8, y: 9 }, { x: 8, y: 11 }, { x: 2, y: 11 } ],
  [ { x: 12, y: 15 }, { x: 19, y: 15 }, { x: 19, y: 17 }, { x: 12, y: 17 } ],
];

/** CCTV cameras: fixed on a wall tile, cone sweeps around baseAngle. */
export const CAMERAS = [
  { tile: { x: 16, y: 0 }, baseAngle: Math.PI / 2, sweep: 1.1, phase: 0 },
  { tile: { x: 31, y: 10 }, baseAngle: Math.PI, sweep: 0.9, phase: 1.4 },
  { tile: { x: 0, y: 13 }, baseAngle: 0, sweep: 0.9, phase: 2.6 },
];

/** Warm lamp positions (tile centres): pools of light, paint + blind-spot logic. */
export const LAMPS = [
  { x: 5, y: 3 }, { x: 16, y: 3 }, { x: 27, y: 3 },
  { x: 5, y: 10 }, { x: 16, y: 10 }, { x: 27, y: 10 },
  { x: 5, y: 17 }, { x: 16, y: 17 }, { x: 27, y: 17 },
];

/** 2x1 display shelves (solid cover that blocks movement and sight). */
export const SHELVES = [
  { x: 4, y: 8, w: 2, h: 1 }, { x: 14, y: 8, w: 2, h: 1 }, { x: 25, y: 8, w: 2, h: 1 },
  { x: 4, y: 15, w: 2, h: 1 }, { x: 25, y: 15, w: 2, h: 1 },
];

/** Paint-only decor (no collision): bookshelves, glass cases, plants. */
export const DECOR = [
  { kind: 'books', x: 1, y: 1 }, { kind: 'books', x: 30, y: 1 },
  { kind: 'case', x: 11, y: 3 }, { kind: 'case', x: 20, y: 3 },
  { kind: 'plant', x: 1, y: 7 }, { kind: 'plant', x: 30, y: 7 },
  { kind: 'books', x: 11, y: 8 }, { kind: 'books', x: 20, y: 8 },
  { kind: 'case', x: 1, y: 14 }, { kind: 'case', x: 30, y: 14 },
  { kind: 'plant', x: 11, y: 16 }, { kind: 'plant', x: 20, y: 16 },
  { kind: 'books', x: 1, y: 19 - 1 }, { kind: 'painting', x: 16, y: 1 },
];

export function tileCentre(tile) {
  return { x: tile.x * TILE + TILE / 2, y: tile.y * TILE + TILE / 2 };
}

/** Build the solid grid: border, two vertical and two horizontal divider walls. */
export function buildGrid() {
  const grid = [];
  for (let y = 0; y < ROWS; y += 1) {
    const row = [];
    for (let x = 0; x < COLS; x += 1) row.push(false);
    grid.push(row);
  }
  for (let x = 0; x < COLS; x += 1) { grid[0][x] = true; grid[ROWS - 1][x] = true; }
  for (let y = 0; y < ROWS; y += 1) { grid[y][0] = true; grid[y][COLS - 1] = true; }
  // Vertical dividers at x=10 and x=21, doors at y=3, 10, 16.
  for (const vx of [10, 21]) {
    for (let y = 1; y < ROWS - 1; y += 1) {
      if (y === 3 || y === 10 || y === 16) continue;
      grid[y][vx] = true;
    }
  }
  // Horizontal dividers at y=6 and y=13, doors at x=5, 15, 26.
  for (const hy of [6, 13]) {
    for (let x = 1; x < COLS - 1; x += 1) {
      if (x === 5 || x === 15 || x === 26) continue;
      grid[hy][x] = true;
    }
  }
  for (const s of SHELVES) {
    for (let dy = 0; dy < s.h; dy += 1) for (let dx = 0; dx < s.w; dx += 1) grid[s.y + dy][s.x + dx] = true;
  }
  return grid;
}

export function isSolid(grid, tx, ty) {
  if (tx < 0 || ty < 0 || tx >= COLS || ty >= ROWS) return true;
  return grid[ty][tx];
}

/** Flood fill over non-solid tiles from a start tile; returns a Set of "x,y". */
export function floodFill(grid, start) {
  const seen = new Set();
  const queue = [{ x: start.x, y: start.y }];
  seen.add(`${start.x},${start.y}`);
  while (queue.length > 0) {
    const cur = queue.pop();
    for (const d of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
      const nx = cur.x + d[0];
      const ny = cur.y + d[1];
      const key = `${nx},${ny}`;
      if (seen.has(key) || isSolid(grid, nx, ny)) continue;
      seen.add(key);
      queue.push({ x: nx, y: ny });
    }
  }
  return seen;
}

/** True when the straight segment (sampled every 6px) crosses no solid tile. */
export function hasLineOfSight(grid, ax, ay, bx, by) {
  const dx = bx - ax;
  const dy = by - ay;
  const dist = Math.hypot(dx, dy);
  const steps = Math.max(1, Math.ceil(dist / 6));
  for (let i = 1; i < steps; i += 1) {
    const x = ax + (dx * i) / steps;
    const y = ay + (dy * i) / steps;
    if (isSolid(grid, Math.floor(x / TILE), Math.floor(y / TILE))) return false;
  }
  return true;
}

function angleDiff(a, b) {
  let d = a - b;
  while (d > Math.PI) d -= Math.PI * 2;
  while (d < -Math.PI) d += Math.PI * 2;
  return d;
}

/** Can `eye` (px, facing angle) see `target` (px)? Walls block; range shrinks when sneaking. */
export function canSee(grid, eye, angle, range, halfAngle, target, sneaking) {
  const dx = target.x - eye.x;
  const dy = target.y - eye.y;
  const dist = Math.hypot(dx, dy);
  const effective = sneaking ? range * 0.6 : range;
  if (dist > effective) return false;
  if (Math.abs(angleDiff(Math.atan2(dy, dx), angle)) > halfAngle) return false;
  return hasLineOfSight(grid, eye.x, eye.y, target.x, target.y);
}

/** Breadth-first path over floor tiles; returns a list of tile centres. */
export function findPath(grid, fromTile, toTile) {
  const key = (t) => `${t.x},${t.y}`;
  const prev = new Map();
  const queue = [{ x: fromTile.x, y: fromTile.y }];
  prev.set(key(fromTile), null);
  while (queue.length > 0) {
    const cur = queue.shift();
    if (cur.x === toTile.x && cur.y === toTile.y) break;
    for (const d of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
      const n = { x: cur.x + d[0], y: cur.y + d[1] };
      if (prev.has(key(n)) || isSolid(grid, n.x, n.y)) continue;
      prev.set(key(n), cur);
      queue.push(n);
    }
  }
  if (!prev.has(key(toTile))) return [];
  const path = [];
  let cur = toTile;
  while (cur !== null) {
    path.unshift(tileCentre(cur));
    cur = prev.get(key(cur));
  }
  return path;
}

export function createWorld() {
  const grid = buildGrid();
  const state = {
    grid,
    player: { x: 0, y: 0, angle: 0, sneaking: false, moving: false },
    guards: [],
    cameras: [],
    loot: LOOT.map((l) => ({ ...l, taken: false })),
    lootTaken: 0,
    pebbles: PEBBLES,
    pebble: null, // {x, y, ttl}
    alarm: 0,
    elapsed: 0,
    spotted: false,
    seenBy: '',
    won: false,
    caught: false,
    path: [], // click-to-move waypoints (px)
    lastSeen: null,
  };
  for (const route of GUARD_ROUTES) {
    const start = tileCentre(route[0]);
    state.guards.push({
      route, waypoint: 1, x: start.x, y: start.y, angle: 0,
      mode: 'patrol', suspicion: 0, investigate: null, bubble: '', bubbleTtl: 0,
      pauseTtl: 0, seeing: false,
    });
  }
  for (const c of CAMERAS) {
    const pos = tileCentre(c.tile);
    state.cameras.push({ ...c, x: pos.x, y: pos.y, angle: c.baseAngle, seeing: false });
  }

  function reset() {
    const start = tileCentre(PLAYER_START);
    state.player.x = start.x;
    state.player.y = start.y;
    state.player.angle = 0;
    state.player.sneaking = false;
    state.player.moving = false;
    state.loot = LOOT.map((l) => ({ ...l, taken: false }));
    state.lootTaken = 0;
    state.pebbles = PEBBLES;
    state.pebble = null;
    state.alarm = 0;
    state.elapsed = 0;
    state.spotted = false;
    state.seenBy = '';
    state.won = false;
    state.caught = false;
    state.path = [];
    state.lastSeen = null;
    state.guards.forEach((g, i) => {
      const s = tileCentre(GUARD_ROUTES[i][0]);
      g.x = s.x; g.y = s.y; g.angle = 0; g.waypoint = 1;
      g.mode = 'patrol'; g.suspicion = 0; g.investigate = null;
      g.bubble = ''; g.bubbleTtl = 0; g.pauseTtl = 0; g.seeing = false;
    });
    state.cameras.forEach((c, i) => {
      c.angle = CAMERAS[i].baseAngle;
      c.seeing = false;
    });
  }

  function solidAtPx(x, y) {
    return isSolid(grid, Math.floor(x / TILE), Math.floor(y / TILE));
  }

  function moveCircle(entity, dx, dy, radius) {
    const nx = entity.x + dx;
    if (!solidAtPx(nx + Math.sign(dx) * radius, entity.y - radius + 2)
      && !solidAtPx(nx + Math.sign(dx) * radius, entity.y + radius - 2)
      && !solidAtPx(nx + Math.sign(dx) * radius, entity.y)) entity.x = nx;
    const ny = entity.y + dy;
    if (!solidAtPx(entity.x - radius + 2, ny + Math.sign(dy) * radius)
      && !solidAtPx(entity.x + radius - 2, ny + Math.sign(dy) * radius)
      && !solidAtPx(entity.x, ny + Math.sign(dy) * radius)) entity.y = ny;
  }

  function throwPebble(targetTile) {
    if (state.pebbles <= 0 || state.won || state.caught) return false;
    const centre = tileCentre(targetTile);
    state.pebbles -= 1;
    state.pebble = { x: centre.x, y: centre.y, ttl: 6 };
    // Nearest guard within 420px investigates the landing spot.
    let best = null;
    let bestDist = 420;
    for (const g of state.guards) {
      const d = Math.hypot(g.x - centre.x, g.y - centre.y);
      if (d < bestDist) { bestDist = d; best = g; }
    }
    if (best !== null) {
      best.mode = 'investigate';
      best.investigate = { x: centre.x, y: centre.y };
      best.bubble = 'What was that?';
      best.bubbleTtl = 3;
    }
    return true;
  }

  function updateGuard(g, dt, events) {
    const p = state.player;
    const seeing = canSee(grid, g, g.angle, GUARD.range, GUARD.halfAngle, p, p.sneaking);
    g.seeing = seeing;
    if (seeing) {
      // A distracted guard (investigating a pebble or walking back) is slow to
      // connect what it sees: suspicion and alarm build at less than half rate.
      const distracted = g.mode === 'investigate' || g.mode === 'return';
      const rate = distracted ? 0.45 : 1;
      g.suspicion = Math.min(1, g.suspicion + GUARD.suspicionRate * rate * dt);
      state.lastSeen = { x: p.x, y: p.y };
      state.alarm = Math.min(ALARM.caught, state.alarm + GUARD.alarmRate * rate * dt);
      state.spotted = true;
      state.seenBy = 'guard';
      if (g.suspicion >= 1 && g.mode !== 'chase') {
        g.mode = 'chase';
        g.bubble = 'Hey! Stop right there!';
        g.bubbleTtl = 2;
      }
    } else {
      g.suspicion = Math.max(0, g.suspicion - GUARD.decayRate * dt);
      if (g.mode === 'chase') {
        g.mode = 'investigate';
        g.investigate = state.lastSeen ? { ...state.lastSeen } : { x: g.x, y: g.y };
      }
    }
    if (g.bubbleTtl > 0) {
      g.bubbleTtl -= dt;
      if (g.bubbleTtl <= 0) g.bubble = '';
    }

    let target = null;
    let speed = GUARD.speed;
    if (g.mode === 'chase' && state.lastSeen) {
      target = state.lastSeen;
      speed = GUARD.investigateSpeed;
    } else if (g.mode === 'investigate' && g.investigate) {
      target = g.investigate;
      speed = GUARD.investigateSpeed;
    } else {
      const wp = tileCentre(g.route[g.waypoint]);
      target = wp;
      if (Math.hypot(wp.x - g.x, wp.y - g.y) < 6) {
        g.waypoint = (g.waypoint + 1) % g.route.length;
        g.pauseTtl = 1.0;
      }
    }
    if (g.pauseTtl > 0) {
      g.pauseTtl -= dt;
      return events;
    }
    const dx = target.x - g.x;
    const dy = target.y - g.y;
    const dist = Math.hypot(dx, dy);
    if (dist > 2) {
      const stepLen = Math.min(dist, speed * dt);
      g.x += (dx / dist) * stepLen;
      g.y += (dy / dist) * stepLen;
      g.angle = Math.atan2(dy, dx);
    } else if (g.mode === 'investigate') {
      g.mode = 'return';
      g.investigate = null;
      g.bubble = "Must've been nothing.";
      g.bubbleTtl = 2.5;
    } else if (g.mode === 'return') {
      // Walk back to the nearest patrol waypoint, then resume patrol.
      let bestIdx = 0;
      let bestD = Infinity;
      g.route.forEach((wp, i) => {
        const c = tileCentre(wp);
        const d = Math.hypot(c.x - g.x, c.y - g.y);
        if (d < bestD) { bestD = d; bestIdx = i; }
      });
      g.waypoint = bestIdx;
      g.mode = 'patrol';
    }
    return events;
  }

  /**
   * One fixed step. `input` = {dx, dy, sneak, clickTile} where dx/dy is a
   * unit move vector (0 when idle) and clickTile an optional tile to walk to.
   */
  function step(dt, input) {
    let events = 0;
    if (state.won || state.caught) return events;
    state.elapsed += dt;
    const p = state.player;
    p.sneaking = !!input.sneak;

    if (input.clickTile) {
      const from = { x: Math.floor(p.x / TILE), y: Math.floor(p.y / TILE) };
      state.path = findPath(grid, from, input.clickTile);
      state.path.shift();
    }
    let mx = input.dx || 0;
    let my = input.dy || 0;
    if ((mx === 0 && my === 0) && state.path.length > 0) {
      const next = state.path[0];
      const dx = next.x - p.x;
      const dy = next.y - p.y;
      const d = Math.hypot(dx, dy);
      if (d < 6) state.path.shift();
      else { mx = dx / d; my = dy / d; }
    }
    const len = Math.hypot(mx, my);
    p.moving = len > 0;
    if (len > 0) {
      const speed = p.sneaking ? PLAYER.sneakSpeed : PLAYER.walkSpeed;
      const nx = (mx / len) * speed * dt;
      const ny = (my / len) * speed * dt;
      moveCircle(p, nx, ny, PLAYER.radius);
      p.angle = Math.atan2(my, mx);
    }

    // Loot pickup.
    for (const loot of state.loot) {
      if (loot.taken) continue;
      const c = tileCentre(loot.tile);
      if (Math.hypot(c.x - p.x, c.y - p.y) < 30) {
        loot.taken = true;
        state.lootTaken += 1;
        events |= EVENT_PICKUP;
      }
    }

    // Exit: only opens once all 3 loot are carried.
    const exit = tileCentre(EXIT_TILE);
    if (state.lootTaken === LOOT_COUNT && Math.hypot(exit.x - p.x, exit.y - p.y) < 30) {
      state.won = true;
      events |= EVENT_WIN;
      return events;
    }

    // Guards and cameras.
    state.spotted = false;
    for (const g of state.guards) events = updateGuard(g, dt, events);
    for (const cam of state.cameras) {
      cam.angle = cam.baseAngle + Math.sin(state.elapsed * CAMERA.sweepSpeed + cam.phase) * cam.sweep;
      const seeing = canSee(grid, cam, cam.angle, CAMERA.range, CAMERA.halfAngle, p, p.sneaking);
      cam.seeing = seeing;
      if (seeing) {
        state.alarm = Math.min(ALARM.caught, state.alarm + CAMERA.alarmRate * dt);
        state.spotted = true;
        state.seenBy = 'camera';
        events |= EVENT_SEEN;
      }
    }
    if (!state.spotted) state.alarm = Math.max(0, state.alarm - ALARM.decay * dt);
    if (state.pebble) {
      state.pebble.ttl -= dt;
      if (state.pebble.ttl <= 0) state.pebble = null;
    }
    // Caught: a guard touches the thief, or the alarm fills.
    for (const g of state.guards) {
      if (Math.hypot(g.x - p.x, g.y - p.y) < 26) {
        state.caught = true;
        events |= EVENT_CAUGHT;
        return events;
      }
    }
    if (state.alarm >= ALARM.caught) {
      state.caught = true;
      events |= EVENT_CAUGHT;
    }
    return events;
  }

  reset();
  return { state, reset, step, throwPebble, grid };
}
