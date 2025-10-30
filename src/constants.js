import { MAZE_VARIANTS } from "./layout.js";

export const TILE_SIZE = 20;
export const COLS = MAZE_VARIANTS[0].layout[0].length;
export const ROWS = MAZE_VARIANTS[0].layout.length;

export const PAC_BASE_SPEED = 85;
export const GHOST_BASE_SPEED = 80;
export const FRIGHTENED_SPEED = 60;
export const FRIGHTENED_DURATION = 6000;
export const MODE_SWITCH_INTERVAL = 7000;
export const FRUIT_DURATION = 9000;
export const GHOST_COMBO_VALUES = [200, 400, 800, 1600];
export const PLAYER_TRAIL_LENGTH = 12;

export const GAME_STATES = {
  READY: "ready",
  PLAYING: "playing",
  FRIGHTENED: "frightened",
  MEMORY: "memory",
  PAUSED: "paused",
  GAME_OVER: "gameOver",
};

export const DEBUG_FLAGS = {
  OVERLAY: "overlay",
  REPLAY: "replay",
};

export const TOUCH_THRESHOLD = 24;

export const SPRITE_SKINS = {
  default: {
    pacColor: "#ffcc00",
    ghostPalette: {},
  },
  neon: {
    pacColor: "#6fe4ff",
    ghostPalette: {
      blinky: "#ff4fd8",
      pinky: "#ff9aff",
      inky: "#5fe0ff",
      clyde: "#ffb360",
      default: "#f8f8ff",
    },
  },
  haunted: {
    pacColor: "#ffd6ff",
    ghostPalette: {
      default: "#caa5ff",
    },
  },
};

export const SPRITE_SKIN_OPTIONS = Object.keys(SPRITE_SKINS);

export const GHOST_AI_MODES = [
  { id: "classic", label: "Classic Pursuit" },
  { id: "social", label: "Social Bonds" },
];

export const MEMORY_REVEAL_DURATION = 4500;
