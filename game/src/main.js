// Boot and the one loop for The Gilded Vault: input is read every frame, the
// world advances in fixed 1/60 s steps, and the renderer paints what is there.
// Screens: title, play, paused, caught, win — plus the Field Notes overlay.
//
// ?shot=cover|pebble|hide|exit stages that scene instead of running the loop,
// paints it twice and sets window.__shotReady for a screenshot.

import { BEST_KEY, STEP, TILE } from './config.js';
import { createWorld, EVENT_CAUGHT, EVENT_PICKUP, EVENT_THROW, EVENT_WIN } from './world.js';
import { ACTION_CONFIRM, ACTION_NOTES, ACTION_RESTART, ACTION_THROW, createInput } from './input.js';
import { createAudio } from './audio.js';
import { createRenderer, SCREEN_OVER, SCREEN_PAUSED, SCREEN_PLAY, SCREEN_TITLE, SCREEN_WIN } from './render.js';
import { stageShot } from './shots.js';

/** The longest frame the loop catches up on; a longer stall is dropped. */
const MAX_FRAME = 0.25;

const params = new URLSearchParams(window.location.search);
const shot = params.get('shot');

const canvas = document.getElementById('game');
const status = document.getElementById('status');
const world = createWorld();
const renderer = createRenderer(canvas);
const audio = createAudio();

function readBest() {
  try {
    return Number.parseFloat(window.localStorage.getItem(BEST_KEY) ?? '0') || 0;
  } catch {
    return 0;
  }
}

function saveBest(value) {
  try {
    window.localStorage.setItem(BEST_KEY, String(value));
  } catch {
    // Storage can be off (private windows): the best time then lasts this visit only.
  }
}

function runShot(name) {
  const scene = stageShot(name, world);
  let painted = 0;
  function paint() {
    renderer.draw(world.state, scene.screen, { best: scene.best, annotations: scene.annotations });
    painted += 1;
    if (painted < 2) requestAnimationFrame(paint);
    else window.__shotReady = true;
  }
  requestAnimationFrame(paint);
}

function runGame() {
  let screen = SCREEN_TITLE;
  let best = readBest();
  let showNotes = false;
  let accumulator = 0;
  let last = performance.now();
  let stepSoundTtl = 0;
  let pendingClickTile = null;
  let alarmSoundTtl = 0;
  // Test hook (read-only): playtest driver reads state, never writes it.
  window.__dbg = () => ({
    loot: world.state.lootTaken,
    alarm: world.state.alarm,
    pebbles: world.state.pebbles,
    x: world.state.player.x,
    y: world.state.player.y,
    won: world.state.won,
    caught: world.state.caught,
    spotted: world.state.spotted,
    guards: world.state.guards.map((g) => ({ x: Math.round(g.x), y: Math.round(g.y), mode: g.mode })),
    screen,
  });

  function announce(message) {
    status.textContent = message;
  }

  function startGame() {
    world.reset();
    accumulator = 0;
    showNotes = false;
    screen = SCREEN_PLAY;
    announce('Playing. Steal all three treasures, then reach the green exit.');
  }

  function endGame(won) {
    screen = won ? SCREEN_WIN : SCREEN_OVER;
    if (won) {
      audio.win();
      if (best === 0 || world.state.elapsed < best) {
        best = world.state.elapsed;
        saveBest(best);
      }
      announce(`Clean getaway in ${Math.round(world.state.elapsed)} seconds.`);
    } else {
      audio.caught();
      announce('Caught. Press Space or R to try again.');
    }
  }

  const input = createInput(
    canvas,
    (point) => {
      // Right-click: throw a pebble at that point (play screen only).
      if (screen !== SCREEN_PLAY) return;
      const tile = { x: Math.floor(point.x / TILE), y: Math.floor(point.y / TILE) };
      if (world.throwPebble(tile)) {
        audio.coin();
        announce('Pebble thrown. A guard goes to investigate.');
      }
    },
    (point) => {
      // Left-click: walk to that tile — or start from a panel screen.
      audio.unlock();
      if (screen === SCREEN_TITLE || screen === SCREEN_OVER || screen === SCREEN_WIN) {
        startGame();
        return;
      }
      if (screen !== SCREEN_PLAY) return;
      pendingClickTile = { x: Math.floor(point.x / TILE), y: Math.floor(point.y / TILE) };
    },
  );

  function handleActions() {
    const actions = input.takeActions();
    if (actions & ACTION_NOTES) {
      showNotes = !showNotes;
      announce(showNotes ? 'Field notes open.' : 'Field notes closed.');
    }
    if (actions & ACTION_RESTART) {
      if (screen === SCREEN_PLAY || screen === SCREEN_OVER || screen === SCREEN_WIN) startGame();
      return;
    }
    if (actions & ACTION_THROW && screen === SCREEN_PLAY) {
      // Q throws a pebble a few tiles ahead of the thief.
      const p = world.state.player;
      const ahead = {
        x: Math.floor((p.x + Math.cos(p.angle) * 120) / TILE),
        y: Math.floor((p.y + Math.sin(p.angle) * 120) / TILE),
      };
      if (world.throwPebble(ahead)) audio.coin();
    }
    if (actions & ACTION_CONFIRM) {
      audio.unlock();
      if (screen === SCREEN_TITLE || screen === SCREEN_OVER || screen === SCREEN_WIN) startGame();
      else if (screen === SCREEN_PLAY) {
        screen = SCREEN_PAUSED;
        announce('Paused.');
      } else if (screen === SCREEN_PAUSED) {
        screen = SCREEN_PLAY;
        announce('Playing.');
      }
    }
  }

  function step() {
    if (screen === SCREEN_TITLE) return;
    const vec = input.vector();
    const clickTile = pendingClickTile;
    pendingClickTile = null;
    const events = world.step(STEP, {
      dx: vec.dx, dy: vec.dy, sneak: input.sneaking(), clickTile,
    });
    const p = world.state.player;
    if (p.moving) {
      stepSoundTtl -= STEP;
      if (stepSoundTtl <= 0) {
        audio.step();
        stepSoundTtl = p.sneaking ? 0.55 : 0.34;
      }
    }
    if (world.state.spotted) {
      alarmSoundTtl -= STEP;
      if (alarmSoundTtl <= 0) {
        audio.alarm();
        alarmSoundTtl = 0.9;
      }
    }
    if (events & EVENT_PICKUP) {
      audio.pickup();
      const loot = world.state.loot.find((l) => l.taken && !l.announced);
      if (loot) {
        loot.announced = true;
        announce(`${loot.name} stolen. ${world.state.lootTaken} of 3.`);
      }
    }
    if (events & EVENT_WIN) endGame(true);
    else if (events & EVENT_CAUGHT) endGame(false);
  }

  function frame(now) {
    requestAnimationFrame(frame);
    window.__screen = screen;
    accumulator += Math.min((now - last) / 1000, MAX_FRAME);
    last = now;
    handleActions();
    if (screen === SCREEN_PLAY) {
      while (accumulator >= STEP && screen === SCREEN_PLAY) {
        step();
        accumulator -= STEP;
      }
    } else {
      accumulator = 0;
    }
    renderer.draw(world.state, screen, { best, showNotes });
  }

  document.addEventListener('visibilitychange', () => {
    if (document.hidden && screen === SCREEN_PLAY) {
      screen = SCREEN_PAUSED;
      announce('Paused.');
    }
  });

  announce('The Gilded Vault. Press Space or click to start.');
  requestAnimationFrame(frame);
}

if (shot) runShot(shot);
else runGame();
