// Every tuning number and colour for The Gilded Vault, in one place.
// The playfield is a fixed 1280x800 logical area (32x20 tiles of 40px);
// the renderer scales it to the window, so no rule depends on screen size.

export const FIELD = { width: 1280, height: 800 };
export const TILE = 40;
export const COLS = 32;
export const ROWS = 20;

/** The simulation's fixed step, in seconds: 60 updates a second. */
export const STEP = 1 / 60;

export const PLAYER = {
  radius: 13,
  walkSpeed: 205,
  sneakSpeed: 115,
};

export const LOOT_COUNT = 3;
export const PEBBLES = 3;

/** Guard vision: range in px, half-angle in radians, alarm rates per second. */
export const GUARD = {
  speed: 78,
  investigateSpeed: 108,
  range: 200,
  sneakRange: 165,
  halfAngle: 0.61,
  suspicionRate: 1.6,
  decayRate: 0.35,
  alarmRate: 30,
};

export const CAMERA = {
  range: 220,
  halfAngle: 0.5,
  sweepSpeed: 0.55,
  alarmRate: 26,
};

export const ALARM = { decay: 14, caught: 100 };

export const PALETTE = {
  backdrop: '#0b0a12',
  floor: '#2e2647',
  floorAlt: '#352c52',
  wall: '#171226',
  wallTop: '#2e2547',
  shelf: '#3a2c1e',
  shelfTop: '#5a4630',
  gold: '#f2c94c',
  goldDim: '#b08d2e',
  green: '#3ddc84',
  red: '#ff4d5e',
  orange: '#ff9f43',
  text: '#f4efe4',
  muted: '#a89ec4',
  guard: '#e8b4b8',
  guardUniform: '#3d4a6b',
  thief: '#1f2430',
  thiefTrim: '#f2c94c',
  cone: 'rgba(242, 201, 76, 0.20)',
  coneSeen: 'rgba(255, 77, 94, 0.30)',
  lamp: 'rgba(255, 190, 90, 0.16)',
  dark: 'rgba(5, 4, 12, 0.42)',
  panel: '#171226',
  hud: 'rgba(12, 10, 22, 0.88)',
};

export const FONT = 'system-ui, -apple-system, "Segoe UI", sans-serif';

/** Where the best time is kept between visits (this browser only). */
export const BEST_KEY = 'gilded-vault.best-seconds';
