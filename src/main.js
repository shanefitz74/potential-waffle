import { createMazeManager } from "./maze.js";
import { createGameLoop } from "./gameLoop.js";
import { createRenderer } from "./renderer.js";
import { createHud } from "./hud.js";
import { createAudioManager } from "./audio.js";
import { createInputManager } from "./input.js";
import { createReplaySystem } from "./replay.js";
import { createEventBus } from "./eventBus.js";
import { SPRITE_SKIN_OPTIONS, GHOST_AI_MODES } from "./constants.js";
import { createThemeManager, listThemes } from "./themes/index.js";
import { loadSetting, saveSetting, isTouchDevice } from "./utils.js";

const canvas = document.getElementById("game");
const scoreEl = document.getElementById("score");
const highScoreEl = document.getElementById("high-score");
const livesEl = document.getElementById("lives");
const levelEl = document.getElementById("level");
const frightenedEl = document.getElementById("frightened");
const modeEl = document.getElementById("mode");
const comboEl = document.getElementById("combo");
const fruitEl = document.getElementById("fruit");
const stateEl = document.getElementById("state");
const ghostMoodsEl = document.getElementById("ghost-moods");
const resetBtn = document.getElementById("reset");
const debugToggle = document.getElementById("debug-toggle");
const replayToggle = document.getElementById("replay-toggle");
const themeSelect = document.getElementById("theme-select");
const themeToggleBtn = document.getElementById("theme-toggle");
const modSettingsBtn = document.getElementById("mod-settings");
const modMenu = document.getElementById("mod-menu");
const modMenuClose = document.getElementById("mod-menu-close");
const modMenuApply = document.getElementById("mod-menu-apply");
const menuThemeSelect = document.getElementById("menu-theme-select");
const skinSelect = document.getElementById("skin-select");
const powerToggle = document.getElementById("powerups-toggle");
const ghostAiSelect = document.getElementById("ghost-ai-select");
const touchControls = document.getElementById("touch-controls");
const downloadBtn = document.getElementById("download-replay");
const saveHtmlBtn = document.getElementById("save-html");
const audioToggle = document.getElementById("audio-toggle");
const audioVolume = document.getElementById("audio-volume");
const memoryOverlay = document.getElementById("memory-overlay");
const memoryTitle = document.getElementById("memory-title");
const memoryCaption = document.getElementById("memory-caption");
const memoryContinue = document.getElementById("memory-continue");

const themeCatalog = listThemes();
const defaultTheme = themeCatalog[0]?.id ?? "classic";
const savedTheme = loadSetting("pac-theme", defaultTheme);
const themeManager = createThemeManager(savedTheme);
let activeThemeClass = "";
const savedHighScore = loadSetting("pac-highscore", 0);
const savedDebug = loadSetting("pac-debug", false);
const savedReplay = loadSetting("pac-replay", false);
const savedAudioEnabled = loadSetting("pac-audio-enabled", true);
const savedAudioVolume = loadSetting("pac-audio-volume", 1);
const savedSkin = loadSetting("pac-skin", savedTheme);
const savedPowerUps = loadSetting("pac-powerups", true);
const savedGhostMode = loadSetting("pac-ghost-mode", "classic");

const availableSkins = new Set(SPRITE_SKIN_OPTIONS);
const normalizedSkin = availableSkins.has(savedSkin) ? savedSkin : SPRITE_SKIN_OPTIONS[0] ?? "default";
const ghostModeOptions = new Set(GHOST_AI_MODES.map((mode) => mode.id));
let activeGhostMode = ghostModeOptions.has(savedGhostMode)
  ? savedGhostMode
  : GHOST_AI_MODES[0]?.id ?? "classic";
let activeSkin = normalizedSkin;
const SKIN_LABELS = {
  default: "Arcade Originals",
  neon: "Neon Legends",
  haunted: "Haunted Echoes",
};
const ghostOrder = ["blinky", "pinky", "inky", "clyde"];

let currentHighScore = savedHighScore;
const fallbackNonNeonTheme =
  themeCatalog.find((theme) => theme.id !== "neon")?.id ?? defaultTheme;
let previousNonNeonTheme =
  savedTheme !== "neon" ? savedTheme : fallbackNonNeonTheme;

if (themeSelect) {
  themeCatalog.forEach((theme) => {
    const option = document.createElement("option");
    option.value = theme.id;
    option.textContent = theme.label;
    if (theme.id === savedTheme) {
      option.selected = true;
    }
    themeSelect.appendChild(option);
  });
}

if (menuThemeSelect) {
  themeCatalog.forEach((theme) => {
    const option = document.createElement("option");
    option.value = theme.id;
    option.textContent = theme.label;
    if (theme.id === savedTheme) {
      option.selected = true;
    }
    menuThemeSelect.appendChild(option);
  });
}

if (skinSelect) {
  SPRITE_SKIN_OPTIONS.forEach((id) => {
    const option = document.createElement("option");
    option.value = id;
    option.textContent = SKIN_LABELS[id] ?? id.replace(/^[a-z]/, (match) => match.toUpperCase());
    skinSelect.appendChild(option);
  });
  skinSelect.value = activeSkin;
}

if (ghostAiSelect) {
  GHOST_AI_MODES.forEach((mode) => {
    const option = document.createElement("option");
    option.value = mode.id;
    option.textContent = mode.label;
    if (mode.id === activeGhostMode) {
      option.selected = true;
    }
    ghostAiSelect.appendChild(option);
  });
}

if (powerToggle) {
  powerToggle.checked = Boolean(savedPowerUps);
}

const mazeManager = createMazeManager();
const eventBus = createEventBus();
const game = createGameLoop({ mazeManager, themeManager, eventBus, highScore: savedHighScore });
const renderer = createRenderer({
  canvas,
  game,
  theme: themeManager.theme,
  maze: mazeManager.maze,
});
if (savedDebug) {
  renderer.toggleDebug?.(true);
}
renderer.setSkin(activeSkin);
if (debugToggle) debugToggle.checked = savedDebug;
const hud = createHud({
  scoreEl,
  highScoreEl,
  livesEl,
  levelEl,
  modeEl,
  frightenedEl,
  comboEl,
  fruitEl,
  stateEl,
  ghostMoodsEl,
  debugToggle,
  themeSelect,
  replayToggle,
  audioToggle,
  audioVolume,
  memoryOverlay,
  memoryTitle,
  memoryCaption,
  memoryContinue,
});
hud.hideMemory();
const ghostMoodState = new Map();
hud.updateGhostMoods([]);

function refreshGhostMoodHud() {
  const moods = ghostOrder
    .map((name) => ghostMoodState.get(name))
    .filter(Boolean);
  hud.updateGhostMoods(moods);
}

game.ghosts.forEach((ghost) => {
  ghostMoodState.set(ghost.name, {
    name: ghost.name,
    mood: ghost.moodLabel ?? "wary",
    trait: ghost.personalityTrait,
    affinity: ghost.affinity ?? 0,
  });
});
refreshGhostMoodHud();

let modMenuOpen = false;

function setModMenuOpen(open) {
  if (!modMenu) return;
  modMenuOpen = Boolean(open);
  modMenu.classList.toggle("hidden", !modMenuOpen);
  modMenu.setAttribute("aria-hidden", modMenuOpen ? "false" : "true");
  if (modMenuOpen) {
    menuThemeSelect?.focus();
  }
}

function updateThemeToggle(isNeon) {
  if (!themeToggleBtn) return;
  themeToggleBtn.textContent = "Toggle Theme";
  themeToggleBtn.setAttribute("aria-pressed", isNeon ? "true" : "false");
}

function applyTheme(themeId, { skipSave = false, skipSelectUpdate = false } = {}) {
  const config = themeManager.setTheme(themeId);
  const id = config.id;
  document.body.dataset.theme = id;

  if (activeThemeClass) {
    document.body.classList.remove(activeThemeClass);
  }

  activeThemeClass = `theme-${id}`;
  document.body.classList.add(activeThemeClass);
  document.body.classList.toggle("neon-theme", id === "neon");
  if (!skipSave) {
    saveSetting("pac-theme", id);
  }
  renderer.setTheme(config, mazeManager.maze);
  game.setTheme(config);
  updateThemeToggle(id === "neon");
  if (!skipSelectUpdate && themeSelect && themeSelect.value !== id) {
    themeSelect.value = id;
  }
  if (menuThemeSelect && menuThemeSelect.value !== id) {
    menuThemeSelect.value = id;
  }
  if (id !== "neon") {
    previousNonNeonTheme = id;
  }
}

applyTheme(savedTheme, { skipSave: true, skipSelectUpdate: true });

const audio = createAudioManager({ enabled: savedAudioEnabled, volume: savedAudioVolume });
const replay = createReplaySystem(game);
const input = createInputManager({ game, replay, touchControls });

if (!audio.isSupported()) {
  hud.setAudioEnabled(false);
  audioToggle?.setAttribute("disabled", "true");
  audioVolume?.setAttribute("disabled", "true");
  if (audioVolume) {
    audioVolume.value = `${Math.round(savedAudioVolume * 100)}`;
  }
} else {
  hud.setAudioEnabled(savedAudioEnabled);
  hud.setAudioVolume(Math.round(savedAudioVolume * 100));
}

if (!isTouchDevice()) {
  touchControls?.classList.add("hidden");
} else {
  touchControls?.setAttribute("aria-hidden", "false");
}

if (savedReplay) {
  replay.start();
  if (replayToggle) replayToggle.checked = true;
}

hud.onThemeChange((theme) => {
  applyTheme(theme);
});

menuThemeSelect?.addEventListener("change", (event) => {
  applyTheme(event.target.value);
});

skinSelect?.addEventListener("change", (event) => {
  const nextSkin = event.target.value;
  if (!availableSkins.has(nextSkin)) return;
  activeSkin = nextSkin;
  renderer.setSkin(nextSkin);
  saveSetting("pac-skin", nextSkin);
});

powerToggle?.addEventListener("change", (event) => {
  const enabled = event.target.checked;
  game.setPowerUpsEnabled(enabled);
  saveSetting("pac-powerups", enabled);
});

ghostAiSelect?.addEventListener("change", (event) => {
  const mode = event.target.value;
  const validMode = ghostModeOptions.has(mode) ? mode : GHOST_AI_MODES[0]?.id ?? "classic";
  activeGhostMode = validMode;
  game.setGhostAIMode(validMode);
  saveSetting("pac-ghost-mode", validMode);
});

modSettingsBtn?.addEventListener("click", () => {
  setModMenuOpen(true);
});

modMenuClose?.addEventListener("click", () => {
  setModMenuOpen(false);
});

modMenuApply?.addEventListener("click", () => {
  setModMenuOpen(false);
});

modMenu?.addEventListener("click", (event) => {
  if (event.target === modMenu) {
    setModMenuOpen(false);
  }
});

document.addEventListener("keydown", (event) => {
  if (event.key === "Escape" && modMenuOpen) {
    setModMenuOpen(false);
  }
});

setModMenuOpen(false);

hud.onAudioToggle((enabled) => {
  audio.setEnabled(enabled);
  saveSetting("pac-audio-enabled", enabled);
  hud.setAudioEnabled(enabled);
  if (enabled) {
    const volume = audio.getVolume();
    if (volume === 0 && audioVolume) {
      audioVolume.value = "5";
      audio.setVolume(0.05);
      saveSetting("pac-audio-volume", 0.05);
      hud.setAudioVolume(5);
    }
  }
});

hud.onAudioVolume((value) => {
  const clamped = Math.max(0, Math.min(100, Number.isFinite(value) ? value : 100));
  const normalized = clamped / 100;
  audio.setVolume(normalized);
  saveSetting("pac-audio-volume", normalized);
  if (normalized > 0 && !audio.isEnabled()) {
    audio.setEnabled(true);
    saveSetting("pac-audio-enabled", true);
    hud.setAudioEnabled(true);
  }
});

themeToggleBtn?.addEventListener("click", () => {
  const activeThemeId = themeManager.theme.id || defaultTheme;
  if (activeThemeId === "neon") {
    const nextTheme = previousNonNeonTheme ?? fallbackNonNeonTheme;
    applyTheme(nextTheme);
  } else {
    previousNonNeonTheme = activeThemeId;
    applyTheme("neon");
  }
});

hud.onDebugToggle((enabled) => {
  renderer.toggleDebug(enabled);
  saveSetting("pac-debug", enabled);
});

hud.onReplayToggle((active) => {
  const enabled = replay.toggle(active);
  saveSetting("pac-replay", enabled);
});

hud.onMemoryContinue(() => {
  hud.hideMemory();
  game.completeMemory();
});

function updateHighScore(value) {
  currentHighScore = value;
  saveSetting("pac-highscore", value);
  hud.updateScore(game.score, value);
}

eventBus.on("score", ({ score, highScore }) => {
  if (typeof highScore === "number") {
    currentHighScore = highScore;
  }
  hud.updateScore(score, currentHighScore);
});

eventBus.on("highScore", ({ highScore }) => updateHighScore(highScore));

eventBus.on("lives", ({ lives }) => hud.updateLives(lives));

eventBus.on("level", ({ level, maze }) => hud.updateLevel(level, maze));

eventBus.on("mode", ({ mode }) => hud.updateMode(mode));

eventBus.on("frightened", ({ remaining }) => hud.updateFrightenedTimer(remaining));

eventBus.on("ghostEaten", ({ combo, score }) => {
  hud.updateCombo(combo);
  audio.playGhostCapture(combo);
});

eventBus.on("pellet", ({ type }) => {
  if (type === "power") audio.playPowerPellet();
  else audio.playPellet();
});

eventBus.on("fruit", ({ active, score }) => {
  if (active) {
    hud.setFruitActive(true);
  } else {
    hud.setFruitActive(false);
    if (typeof score === "number") {
      hud.flashFruit(score);
      audio.playFruit();
    }
  }
});

eventBus.on("state", ({ state }) => {
  hud.updateState(state);
  if (state === "gameOver") {
    audio.playDeath();
  }
});

eventBus.on("ghostMood", ({ ghost, mood, trait, affinity }) => {
  ghostMoodState.set(ghost, { name: ghost, mood, trait, affinity });
  refreshGhostMoodHud();
});

eventBus.on("powerUps", ({ enabled }) => {
  if (powerToggle) {
    powerToggle.checked = Boolean(enabled);
  }
});

eventBus.on("ghostMode", ({ mode }) => {
  activeGhostMode = mode;
  if (ghostAiSelect && ghostAiSelect.value !== mode) {
    ghostAiSelect.value = mode;
  }
});

eventBus.on("memory", (panel) => {
  hud.showMemory(panel);
  setModMenuOpen(false);
});

eventBus.on("memoryEnd", () => {
  hud.hideMemory();
});

game.setPowerUpsEnabled(savedPowerUps);
game.setGhostAIMode(activeGhostMode);

resetBtn?.addEventListener("click", () => {
  game.resetGame();
});

downloadBtn?.addEventListener("click", () => {
  const blob = new Blob([JSON.stringify(replay.getFrames(), null, 2)], {
    type: "application/json",
  });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = "pacman-replay.json";
  a.click();
  URL.revokeObjectURL(url);
});

saveHtmlBtn?.addEventListener("click", () => {
  const docType = "<!DOCTYPE html>\n";
  const html = document.documentElement?.outerHTML ?? "";
  const blob = new Blob([docType, html], { type: "text/html" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  const activeMode = document.body?.dataset?.mode ?? themeManager.theme?.id ?? "modern";
  a.href = url;
  a.download = `byte-vs-glitches-${activeMode}.html`;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
});

let lastTime = performance.now();

function frame(now) {
  const delta = now - lastTime;
  lastTime = now;
  game.update(delta);
  renderer.draw(now);
  replay.capture(now);
  input.pollGamepad();
  requestAnimationFrame(frame);
}

requestAnimationFrame(frame);

window.electronAPI?.onReset(() => {
  game.resetGame();
});

window.electronAPI?.onUpdateReady?.(() => {
  console.info("A new update is ready to install.");
});

window.pacDebug = {
  game,
  replay,
  getFrames: () => replay.getFrames(),
};
