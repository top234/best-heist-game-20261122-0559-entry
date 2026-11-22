# BUILD NOTES — The Gilded Vault (best-heist-game-20261122-0559)

Stealth heist game built from scratch for make.fun competition
best-heist-game-20261122-0559 ($50, closes 2026-11-23 00:59 WIB).
Repo: https://github.com/top234/best-heist-game-20261122-0559-entry

## What was built

"The Gilded Vault": a night-gallery heist on a 32x20 tile map (canvas
1280x800). Steal the Golden Idol, Sapphire Tiara and Jade Vase, then reach
the green EXIT. 5 guards patrol fixed routes with raycast vision cones
(sampled every 6 px — walls and shelves genuinely block sight); cones turn
red when they see the thief, suspicion rings fill over guard heads, guards
investigate the last seen position and return to patrol. 3 CCTV cameras
sweep their cones and raise the alarm too. Alarm meter (HUD) climbs while
seen, drains while hidden; full alarm or a guard's touch = caught.
Pebble gadget (Q or right-click, 3 per run): nearest guard investigates the
landing point ("What was that?" → "Must've been nothing."). Field Notes
panel (H) with 6 legend items. Warm lamplight pools + darkness mask,
paint-only decor (bookshelves, glass cases, plants, painting), speech
bubbles, synthesised WebAudio sounds (steps, pickup, coin clink, alarm,
getaway fanfare). Title / paused / caught / win screens. No external
assets, no network; everything under game/.

## Controls

WASD/arrows move · click a tile to walk (BFS pathfind) · Shift sneak ·
Q / right-click throw pebble · H field notes · R restart · Space start/pause.

## Files

- game/index.html, game/src/config.js (tuning), world.js (rules, patrols,
  vision, alarm, flood fill, pathfind), render.js (lamplight, darkness,
  cones, HUD, notes, annotations), input.js, audio.js, shots.js (4 scenes),
  main.js (loop + screens, read-only __dbg test hook)
- screenshots/1-cover.jpg … 4-exit.jpg — real renders via ?shot=, gold
  annotation callouts drawn inside the canvas
- main.ts (hand-in program; header revised in a 2nd edit), serve.ts,
  vendor/makefun-game.ts (kit copy, unchanged), README.md, LICENSE (29
  bytes, SPDX only), shots.json, test-play.mjs (Playwright driver)

## Verification (all passed)

1. Headless Playwright Chromium (headless shell 1187; the Hatch
   /opt/meta-chromium build blocks localhost, so the proven Playwright path
   from threejs-fps-work was used): 0 console errors in every run.
   Full playthrough x2 (latest two runs): move keys OK, Q throw 3→2
   pebbles, sneak loot run Vase → Idol → Tiara (loot 1→2→3), EXIT → WIN
   (screen 'win'), restart (R) → caught hunt → CAUGHT (screen 'over').
   Field Notes (H) renders all 6 items (fixed a row overlap first seen).
2. Flood fill from player start (Node, no DOM): 450 reachable tiles;
   all 3 loot, EXIT and all 20 guard waypoints reachable. (First run
   found the top rooms sealed by shelves under the doors; shelves moved
   to 2x1 blocks and re-verified.)
3. 4 screenshots 1280x800, JPEG q82, 70,298–74,127 bytes each (≤256 KiB),
   mean brightness 42.2–42.6 (night scene, well above black); visually
   checked: thief, guards+cones, cameras, loot, alarm meter, callouts
   readable, no text overlap (fixed timer/pill overlap + wrong callout
   anchors + a wrong "already stolen" label first seen).
4. main.ts deterministic: MAKEFUN_OUTPUT_DIR=out1/out2, `diff -r`
   identical; dossier.json 445,591 bytes.
5. Tuning found by playtesting: guard range 235→200 px, sneak vision
   0.7→0.6x, chase speed 118→108, guard/camera alarm 55/38→30/26 per
   second, alarm decay 9→14, distracted guards build suspicion at 0.45x
   (a lure must buy a real window), waypoint pause 0.6→1.0 s. The win
   path needs lures + sneak + wall-breaking routes — verified winnable
   twice in a row after the final tune (earlier blind runs failed,
   which is what exposed the unfair return-path-through-loot bug).

## Session

Builder session id: 261dc18d-0c6f-45f8-9fec-46456714c58a (subagent of
parent session aa019b79-fdcd-4de0-ae78-b30b3068d483). Session files are
kept by the Muse harness; no local session file path is known to this
builder — the coordinator bundles from the harness record.
