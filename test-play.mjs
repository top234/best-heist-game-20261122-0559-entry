// Playwright playtest + screenshot driver for The Gilded Vault.
// Uses the proven Playwright headless-shell Chromium (NOT the Hatch
// /opt/meta-chromium build, which blocks localhost navigations).
// Usage: node test-play.mjs [shots|play|all]
import { chromium } from 'playwright-core';
import { spawn } from 'node:child_process';
import { mkdirSync } from 'node:fs';

const PORT = 8931;
const BASE = `http://127.0.0.1:${PORT}`;
const SHOTS = [
  ['cover', '1-cover.jpg'],
  ['pebble', '2-pebble.jpg'],
  ['hide', '3-hide.jpg'],
  ['exit', '4-exit.jpg'],
];

function sleep(ms) { return new Promise((r) => setTimeout(r, ms)); }

const mode = process.argv[2] || 'all';
const server = spawn(process.execPath, ['serve.ts', '--port', String(PORT)], { cwd: process.cwd(), stdio: 'ignore' });
const errors = [];
let browser = null;
try {
  await sleep(1200);
  browser = await chromium.launch({
    executablePath: '/home/hatch/.cache/ms-playwright/chromium_headless_shell-1187/chrome-linux/headless_shell',
    args: ['--no-sandbox', '--disable-dev-shm-usage', '--use-angle=swiftshader', '--enable-unsafe-swiftshader'],
  });
  const page = await browser.newPage({ viewport: { width: 1280, height: 800 } });
  page.on('console', (m) => { if (m.type() === 'error') errors.push(`console: ${m.text().slice(0, 300)}`); });
  page.on('pageerror', (e) => errors.push(`pageerror: ${String(e).slice(0, 300)}`));

  const state = async () => page.evaluate(() => {
    const d = window.__dbg ? window.__dbg() : null;
    return d ? JSON.stringify(d) : 'no-dbg';
  });

  if (mode === 'all' || mode === 'shots') {
    mkdirSync('screenshots', { recursive: true });
    for (const [name, file] of SHOTS) {
      await page.goto(`${BASE}/?shot=${name}`, { waitUntil: 'load', timeout: 30000 });
      try {
        await page.waitForFunction(() => window.__shotReady === true, { timeout: 15000 });
        console.log(`shot ${name}: ready=true`);
      } catch { console.log(`shot ${name}: ready=TIMEOUT`); }
      await page.screenshot({ path: `screenshots/${file}`, type: 'jpeg', quality: 82 });
    }
  }

  if (mode === 'all' || mode === 'play') {
    await page.goto(`${BASE}/`, { waitUntil: 'load', timeout: 30000 });
    await sleep(400);
    await page.keyboard.press('Space');
    await sleep(300);
    console.log('after start:', await state());
    // Move with keys: right then down.
    await page.keyboard.down('KeyD'); await sleep(1200); await page.keyboard.up('KeyD');
    await page.keyboard.down('KeyS'); await sleep(600); await page.keyboard.up('KeyS');
    console.log('after move:', await state());
    // Sneak toggle check (Shift held briefly, no pebble spent yet).
    await page.keyboard.down('ShiftLeft');
    await sleep(300);
    await page.keyboard.up('ShiftLeft');
    // H opens Field Notes, H closes.
    await page.keyboard.press('KeyH'); await sleep(200);
    await page.screenshot({ path: '/tmp/notes-open.png' });
    await page.keyboard.press('KeyH'); await sleep(200);

    async function clickTile(tx, ty) {
      await page.mouse.click(tx * 40 + 20, ty * 40 + 20);
    }
    async function lureTile(tx, ty) {
      // Right-click: throw a pebble at that tile to pull a guard away.
      await page.mouse.click(tx * 40 + 20, ty * 40 + 20, { button: 'right' });
      await sleep(1200);
    }
    async function waitFor(cond, timeoutMs, label) {
      const t0 = Date.now();
      let s = await state();
      while (Date.now() - t0 < timeoutMs) {
        s = JSON.parse(await state());
        if (cond(s) || s.caught || s.won) break;
        await sleep(300);
      }
      console.log(label, s);
      return s;
    }
    // Sneak the whole loot run (Shift held): slower, much harder to spot.
    // Before each crossing, lure the guard on that route away with a pebble.
    await page.keyboard.down('ShiftLeft');
    await clickTile(5, 16); // Jade Vase
    await waitFor((s) => s.loot >= 1, 20000, 'go vase:');
    await sleep(2500); // let the alarm drain in the dark
    await lureTile(19, 5); // pull guard 2 to its bottom corner: its return then
    // runs along the bottom row, never back through the Idol tile itself
    await lureTile(19, 17); // pull guard 4 to the far corner
    await clickTile(15, 2); // Golden Idol
    const idol = await waitFor((s) => s.loot >= 2, 25000, 'go idol:');
    let won = { won: false, screen: '?' };
    if (!idol.caught) {
      // No pause after the Idol, and no lure first: guard 2 walks back
      // through the loot tile, so leave south at once, then lure guard 3
      // from behind the wall.
      await clickTile(15, 10);
      await waitFor((s) => Math.abs(s.x - 620) < 40 && Math.abs(s.y - 420) < 40, 15000, 'go south:');
      await lureTile(23, 5); // pull guard 3 to its far corner
      await clickTile(26, 6);
      await waitFor((s) => Math.abs(s.x - 1060) < 40 && Math.abs(s.y - 260) < 40, 15000, 'go door:');
      await clickTile(27, 4); // Sapphire Tiara
      const tiara = await waitFor((s) => s.loot >= 3, 25000, 'go tiara:');
      // Slip out at once via the middle band (door at x=26) to break guard 3's sight.
      if (!tiara.caught) {
        await clickTile(26, 10);
        await waitFor((s) => Math.abs(s.x - 1060) < 40 && Math.abs(s.y - 420) < 40, 15000, 'go middle:');
        await clickTile(29, 18); // EXIT
        won = await waitFor((s) => s.won, 25000, 'go exit:');
      } else {
        console.log('FAILED at tiara leg, caught before exit');
      }
    } else {
      console.log('FAILED at idol leg');
    }
    await page.keyboard.up('ShiftLeft');
    console.log('WIN:', won.won, 'screen:', won.screen);
    // Restart and get caught: stand on each corner of guard 1's patrol loop
    // in turn until the guard walks into the thief (touch or full alarm).
    await page.keyboard.press('KeyR');
    await sleep(400);
    console.log('after R:', await state());
    // Q throws a pebble ahead of the thief (fresh run: 3 -> 2).
    await page.keyboard.press('KeyQ');
    await sleep(600);
    console.log('after Q (pebbles should be 2):', await state());
    let caught = JSON.parse(await state());
    for (const [gx, gy] of [[12, 2], [19, 2], [19, 5], [12, 5], [15, 3]]) {
      if (caught.caught) break;
      await clickTile(gx, gy);
      caught = await waitFor((s) => s.caught, 12000, `caught hunt (${gx},${gy}):`);
    }
    console.log('CAUGHT:', caught.caught, 'screen:', caught.screen, 'alarm:', Math.round(caught.alarm));
  }

  console.log('CONSOLE ERRORS:', errors.length);
  errors.forEach((e) => console.log('  ERR', e));
} finally {
  if (browser) await browser.close().catch(() => {});
  server.kill();
}
