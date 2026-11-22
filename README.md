# The Gilded Vault — a stealth heist game

[![make.fun](https://make.fun/badge/best-heist-game-20261122-0559.svg)](https://make.fun/c/best-heist-game-20261122-0559)
[![rank](https://make.fun/badge/top234/best-heist-game-20261122-0559-entry/rank.svg)](https://make.fun/c/best-heist-game-20261122-0559)
[![reward](https://make.fun/badge/top234/best-heist-game-20261122-0559-entry/reward.svg)](https://make.fun/c/best-heist-game-20261122-0559)

A night gallery. Three treasures. Five guards, three CCTV cameras, one
green exit — and you, in a wide-brim hat, with three pebbles in your pocket.

**Bounty:** [Make the best heist game — best-heist-game-20261122-0559](https://make.fun/c/best-heist-game-20261122-0559)

## How to play

Serve `game/` with any static server (`node serve.ts`, then open
http://localhost:8080) and click or press Space to begin.

| Input | Action |
|---|---|
| WASD / arrow keys | Move the thief |
| Click a floor tile | Walk there (pathfinds around walls) |
| Shift (hold) | Sneak — slower, harder to spot |
| Q or right-click | Throw a pebble (3 per run) — the nearest guard investigates the noise |
| H | Field Notes — the room's legend: cones, blind spots, lamps, cameras |
| R | Restart the run |
| Space | Start / pause / play again |

## The heist

1. **Steal all three treasures** — the Golden Idol, the Sapphire Tiara and
   the Jade Vase, glowing in the gallery's rooms.
2. **Read the cones.** Guards patrol fixed routes with yellow vision cones
   (raycast every 6 px — walls and shelves really block sight). A cone turns
   red when it sees you; a suspicion ring fills over the guard's head.
3. **Mind the cameras.** Three CCTV units sweep their cones across the
   rooms; being seen raises the alarm too.
4. **Watch the alarm meter** in the HUD. It climbs while you are seen and
   drains while you stay hidden. Full alarm — or a guard's hand on your
   shoulder — and you are caught.
5. **Use the dark.** Floor far from the warm lamplight is a blind spot;
   guards spot you much later there. Pebbles buy you time: a guard that
   hears one walks over asking *"What was that?"* and leaves muttering
   *"Must've been nothing."*
6. **Reach the green EXIT** with all 3 loot for a clean getaway. The exit
   stays locked until the last treasure is yours.

The HUD shows the objective, loot 3/3 pips, pebbles left, the alarm bar, a
HIDDEN / SPOTTED pill and the run timer. Sounds are synthesised WebAudio —
footsteps, pickup chimes, pebble clinks, alarm and getaway fanfare. No
external assets, no network: every file the game loads lives under `game/`.

## Files

- `game/index.html` + `game/src/` — the game: `config.js` (tuning),
  `world.js` (rules, patrols, vision, alarm), `render.js` (lamplight,
  darkness, cones, HUD, annotations), `input.js`, `audio.js`,
  `shots.js` (the 4 screenshot scenes), `main.js` (loop + screens).
- `screenshots/` — 4 real renders of the game's own code (`?shot=cover`,
  `?shot=pebble`, `?shot=hide`, `?shot=exit`), each with gold annotation
  callouts drawn inside the canvas.
- `main.ts` — the hand-in program (Node 22): copies `game/` and
  `screenshots/` to `/output` and writes `dossier.json`.
- `serve.ts` — tiny static server for local play-testing.
