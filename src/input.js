import { TOUCH_THRESHOLD } from "./constants.js";

const KEY_TO_DIR = {
  ArrowUp: { x: 0, y: -1 },
  ArrowDown: { x: 0, y: 1 },
  ArrowLeft: { x: -1, y: 0 },
  ArrowRight: { x: 1, y: 0 },
  w: { x: 0, y: -1 },
  s: { x: 0, y: 1 },
  a: { x: -1, y: 0 },
  d: { x: 1, y: 0 },
};

function applyDirection(game, dir, replay) {
  if (!dir) return;
  game.setDirection(dir);
  replay?.recordInput(dir);
}

export function createInputManager({ game, replay, touchControls }) {
  let touchStart = null;
  let activeGamepad = null;

  function onKeyDown(event) {
    const key = event.key.toLowerCase();
    const dir = KEY_TO_DIR[event.key] || KEY_TO_DIR[key];
    if (dir) {
      event.preventDefault();
      applyDirection(game, dir, replay);
    }
    if (event.key === "p") {
      game.togglePause();
    }
  }

  function handleTouchStart(event) {
    const touch = event.touches[0];
    touchStart = { x: touch.clientX, y: touch.clientY };
  }

  function handleTouchMove(event) {
    if (!touchStart) return;
    const touch = event.touches[0];
    const dx = touch.clientX - touchStart.x;
    const dy = touch.clientY - touchStart.y;
    if (Math.abs(dx) > Math.abs(dy)) {
      if (Math.abs(dx) > TOUCH_THRESHOLD) {
        applyDirection(game, { x: dx > 0 ? 1 : -1, y: 0 }, replay);
        touchStart = null;
      }
    } else if (Math.abs(dy) > TOUCH_THRESHOLD) {
      applyDirection(game, { x: 0, y: dy > 0 ? 1 : -1 }, replay);
      touchStart = null;
    }
  }

  function handleTouchEnd() {
    touchStart = null;
  }

  function bindTouchButtons() {
    touchControls?.querySelectorAll("button[data-dir]").forEach((button) => {
      button.addEventListener("click", () => {
        const [x, y] = button.dataset.dir.split(",").map(Number);
        applyDirection(game, { x, y }, replay);
      });
    });
  }

  function pollGamepad() {
    if (typeof navigator === "undefined" || !navigator.getGamepads) return;
    const pads = navigator.getGamepads();
    activeGamepad = activeGamepad ?? pads.find((pad) => pad);
    const pad = activeGamepad ? pads[activeGamepad.index] : null;
    if (!pad) return;
    const [h, v] = pad.axes;
    const threshold = 0.4;
    if (h > threshold) applyDirection(game, { x: 1, y: 0 }, replay);
    else if (h < -threshold) applyDirection(game, { x: -1, y: 0 }, replay);
    if (v > threshold) applyDirection(game, { x: 0, y: 1 }, replay);
    else if (v < -threshold) applyDirection(game, { x: 0, y: -1 }, replay);
  }

  window.addEventListener("keydown", onKeyDown);
  if (touchControls) {
    touchControls.addEventListener("touchstart", handleTouchStart);
    touchControls.addEventListener("touchmove", handleTouchMove);
    touchControls.addEventListener("touchend", handleTouchEnd);
    bindTouchButtons();
  }

  return {
    pollGamepad,
    dispose() {
      window.removeEventListener("keydown", onKeyDown);
      touchControls?.removeEventListener("touchstart", handleTouchStart);
      touchControls?.removeEventListener("touchmove", handleTouchMove);
      touchControls?.removeEventListener("touchend", handleTouchEnd);
    },
  };
}
