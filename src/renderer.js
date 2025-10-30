import { ClassicRenderer } from "./renderers/ClassicRenderer.js";
import { ModernRenderer } from "./renderers/ModernRenderer.js";

function rendererForTheme(canvas, maze, theme) {
  if (theme?.player?.variant === "modern") {
    return new ModernRenderer(canvas, maze, theme);
  }
  return new ClassicRenderer(canvas, maze, theme);
}

export function createRenderer({ canvas, game, theme, maze }) {
  let activeTheme = theme;
  let activeMaze = maze ?? game?.pacMan?.maze;
  let instance = rendererForTheme(canvas, activeMaze, activeTheme);
  let lastTime = performance.now();
  let debugEnabled = false;
  let activeSkin = null;

  function ensureRenderer(themeConfig, mazeRef) {
    const requiresModern = themeConfig?.player?.variant === "modern";
    const currentModern = instance instanceof ModernRenderer;
    const nextMaze = mazeRef ?? activeMaze ?? game?.pacMan?.maze;
    if ((requiresModern && !currentModern) || (!requiresModern && currentModern)) {
      instance = rendererForTheme(canvas, nextMaze, themeConfig);
    } else {
      instance.setTheme?.(themeConfig, nextMaze);
    }
    activeMaze = nextMaze;
  }

  function currentState() {
    return {
      player: game?.pacMan ?? null,
      enemies: game?.ghosts ?? [],
      fruit: game?.fruit ?? null,
    };
  }

  return {
    get theme() {
      return activeTheme;
    },
    setTheme(themeConfig, mazeRef) {
      activeTheme = themeConfig;
      ensureRenderer(themeConfig, mazeRef);
    },
    resize(mazeRef) {
      activeMaze = mazeRef;
      instance.resize?.(mazeRef);
    },
    setSkin(skin) {
      activeSkin = skin;
      instance.setSkin?.(skin);
    },
    toggleDebug(enabled) {
      debugEnabled = Boolean(enabled);
      instance.toggleDebug?.(debugEnabled);
    },
    draw(now = performance.now()) {
      const delta = now - lastTime;
      lastTime = now;
      const mazeRef = game?.pacMan?.maze ?? activeMaze;
      if (mazeRef && mazeRef !== activeMaze) {
        activeMaze = mazeRef;
        instance.resize?.(activeMaze);
      }
      const state = currentState();
      instance.draw(state, delta);
    },
  };
}
