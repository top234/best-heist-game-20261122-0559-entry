// Keyboard and pointer input for The Gilded Vault.
// Held keys give a steering vector; one-shot presses (throw, notes, restart,
// start) are queued as bit flags and taken once by the loop.

export const ACTION_THROW = 1;
export const ACTION_NOTES = 2;
export const ACTION_RESTART = 4;
export const ACTION_CONFIRM = 8;

const UP = new Set(['ArrowUp', 'KeyW']);
const DOWN = new Set(['ArrowDown', 'KeyS']);
const LEFT = new Set(['ArrowLeft', 'KeyA']);
const RIGHT = new Set(['ArrowRight', 'KeyD']);
const SNEAK = new Set(['ShiftLeft', 'ShiftRight']);
const THROW = new Set(['KeyQ']);
const NOTES = new Set(['KeyH']);
const RESTART = new Set(['KeyR']);
const CONFIRM = new Set(['Space', 'Enter']);

export function createInput(canvas, onThrowAt, onClickTile) {
  let up = false;
  let down = false;
  let left = false;
  let right = false;
  let sneak = false;
  let actions = 0;

  window.addEventListener('keydown', (event) => {
    if (UP.has(event.code)) up = true;
    else if (DOWN.has(event.code)) down = true;
    else if (LEFT.has(event.code)) left = true;
    else if (RIGHT.has(event.code)) right = true;
    else if (SNEAK.has(event.code)) sneak = true;
    else if (THROW.has(event.code)) { if (!event.repeat) actions |= ACTION_THROW; }
    else if (NOTES.has(event.code)) { if (!event.repeat) actions |= ACTION_NOTES; }
    else if (RESTART.has(event.code)) { if (!event.repeat) actions |= ACTION_RESTART; }
    else if (CONFIRM.has(event.code)) { if (!event.repeat) actions |= ACTION_CONFIRM; }
    else return;
    event.preventDefault();
  });
  window.addEventListener('keyup', (event) => {
    if (UP.has(event.code)) up = false;
    else if (DOWN.has(event.code)) down = false;
    else if (LEFT.has(event.code)) left = false;
    else if (RIGHT.has(event.code)) right = false;
    else if (SNEAK.has(event.code)) sneak = false;
  });
  window.addEventListener('blur', () => {
    up = false; down = false; left = false; right = false; sneak = false;
  });

  function canvasPoint(event) {
    const rect = canvas.getBoundingClientRect();
    const scaleX = 1280 / rect.width;
    const scaleY = 800 / rect.height;
    return { x: (event.clientX - rect.left) * scaleX, y: (event.clientY - rect.top) * scaleY };
  }

  canvas.addEventListener('pointerdown', (event) => {
    const point = canvasPoint(event);
    if (event.button === 2) {
      onThrowAt(point);
      event.preventDefault();
      return;
    }
    if (event.button === 0) onClickTile(point);
  });
  canvas.addEventListener('contextmenu', (event) => event.preventDefault());

  return {
    /** Unit move vector from held keys (0,0 when idle). */
    vector() {
      return { dx: (right ? 1 : 0) - (left ? 1 : 0), dy: (down ? 1 : 0) - (up ? 1 : 0) };
    },
    sneaking() { return sneak; },
    takeActions() {
      const taken = actions;
      actions = 0;
      return taken;
    },
  };
}
