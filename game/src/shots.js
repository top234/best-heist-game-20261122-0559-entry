// The screenshot scenes behind ?shot=cover|pebble|hide|exit.
// Each one stages a real world state by hand (player, guards, loot, alarm,
// pebble) and returns the screen to draw plus gold annotation callouts, so
// every frame is a genuine render of the game's own code — never edited.

import { STEP } from './config.js';
import { EXIT_TILE, LOOT, tileCentre } from './world.js';
import { SCREEN_PLAY } from './render.js';

function placePlayer(world, tx, ty, sneaking) {
  const c = tileCentre({ x: tx, y: ty });
  world.state.player.x = c.x;
  world.state.player.y = c.y;
  world.state.player.sneaking = !!sneaking;
}

function placeGuard(world, index, tx, ty, angle, mode, suspicion) {
  const g = world.state.guards[index];
  const c = tileCentre({ x: tx, y: ty });
  g.x = c.x;
  g.y = c.y;
  g.angle = angle;
  g.mode = mode || 'patrol';
  g.suspicion = suspicion || 0;
}

function takeLoot(world, count) {
  for (let i = 0; i < count; i += 1) {
    world.state.loot[i].taken = true;
  }
  world.state.lootTaken = count;
}

function takeLootIds(world, ids) {
  for (const i of ids) world.state.loot[i].taken = true;
  world.state.lootTaken = ids.length;
}

/** Run the world forward a few steps so cones, cameras and timers settle. */
function settle(world, seconds) {
  for (let i = 0; i < seconds / STEP; i += 1) {
    world.step(STEP, { dx: 0, dy: 0, sneak: false });
  }
}

function anchor(tile, dy) {
  const c = tileCentre(tile);
  return { x: c.x, y: c.y + (dy || 0) };
}

/**
 * Set `world` to the named scene and return {screen, annotations, best}.
 * Unknown names stage the cover scene.
 */
export function stageShot(name, world) {
  world.reset();
  if (name === 'pebble') {
    // Guard lured away from its patrol by a thrown pebble.
    placePlayer(world, 6, 10, true);
    placeGuard(world, 3, 7, 9, Math.PI / 2, 'investigate', 0.3);
    const g = world.state.guards[3];
    g.investigate = tileCentre({ x: 7, y: 11 });
    g.bubble = 'What was that?';
    g.bubbleTtl = 3;
    world.state.pebble = { ...tileCentre({ x: 7, y: 11 }), ttl: 5 };
    world.state.pebbles = 2; // one pebble already thrown in this scene
    world.state.elapsed = 47;
    takeLoot(world, 1);
    settle(world, 0.5);
    const pebble = { x: world.state.pebble.x, y: world.state.pebble.y };
    const guard = { x: world.state.guards[3].x, y: world.state.guards[3].y };
    return {
      screen: SCREEN_PLAY,
      best: 0,
      annotations: [
        { ...pebble, labelX: 300, labelY: 700, text: 'PEBBLE — thrown distraction' },
        { ...guard, labelX: 640, labelY: 120, text: 'GUARD investigates the noise' },
        { x: world.state.player.x, y: world.state.player.y, labelX: 1020, labelY: 700, text: 'YOU — sneaking past' },
      ],
    };
  }
  if (name === 'hide') {
    // Thief crouched in a dark blind spot while a cone sweeps past.
    placePlayer(world, 8, 17, true);
    placeGuard(world, 4, 14, 15, -Math.PI / 2, 'patrol', 0.15);
    world.state.elapsed = 88;
    world.state.alarm = 12;
    takeLootIds(world, [0, 2]); // Idol + Vase already stolen; Tiara remains
    settle(world, 0.5);
    return {
      screen: SCREEN_PLAY,
      best: 0,
      annotations: [
        { x: world.state.player.x, y: world.state.player.y, labelX: 640, labelY: 120, text: 'YOU — hidden in the blind spot' },
        { x: world.state.guards[4].x, y: world.state.guards[4].y, labelX: 1020, labelY: 700, text: 'CONE sweeps past — unseen' },
        { ...anchor({ x: 5, y: 16 }), labelX: 200, labelY: 590, text: 'JADE VASE already stolen' },
      ],
    };
  }
  if (name === 'exit') {
    // All three loot carried; the thief slips out the green EXIT.
    placePlayer(world, 27, 18, false);
    placeGuard(world, 4, 19, 15, Math.PI, 'patrol', 0);
    world.state.elapsed = 142;
    world.state.alarm = 22;
    takeLoot(world, 3);
    settle(world, 0.5);
    const exit = anchor(EXIT_TILE);
    const cam = world.state.cameras[1];
    return {
      screen: SCREEN_PLAY,
      best: 0,
      annotations: [
        { ...exit, labelX: 640, labelY: 120, text: 'EXIT — open with all 3 loot' },
        { x: world.state.player.x, y: world.state.player.y, labelX: 300, labelY: 700, text: 'YOU — clean getaway' },
        { x: cam.x, y: cam.y, labelX: 1020, labelY: 620, text: 'CCTV — sweeping cone' },
      ],
    };
  }
  // Cover: mid-heist — thief between rooms, guard cone sweeping, loot glowing.
  placePlayer(world, 11, 10, false);
  placeGuard(world, 1, 15, 3, Math.PI / 2, 'patrol', 0.55);
  placeGuard(world, 3, 5, 9, 0, 'patrol', 0);
  world.state.elapsed = 34;
  world.state.alarm = 31;
  world.state.spotted = true;
  world.state.seenBy = 'guard';
  settle(world, 0.5);
  const idol = anchor(LOOT[0].tile);
  const guard = { x: world.state.guards[1].x, y: world.state.guards[1].y };
  return {
    screen: SCREEN_PLAY,
    best: 0,
    annotations: [
      { ...idol, labelX: 640, labelY: 120, text: 'GOLDEN IDOL — loot 1 of 3' },
      { ...guard, labelX: 1020, labelY: 700, text: 'GUARD — yellow cone, read it first' },
      { x: world.state.player.x, y: world.state.player.y, labelX: 220, labelY: 700, text: 'YOU — cross the lamplight' },
    ],
  };
}
