import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

import { Player } from "../src/entities/Player.js";
import { Ghost } from "../src/entities/Ghost.js";
import { Glitch } from "../src/entities/Glitch.js";
import { createMazeManager } from "../src/maze.js";
import { createGameLoop } from "../src/gameLoop.js";
import { createEventBus } from "../src/eventBus.js";
import { createRenderer } from "../src/renderer.js";
import { createThemeManager } from "../src/themes/index.js";
import { TILE_SIZE, COLS, ROWS } from "../src/constants.js";

function pickPellet(maze) {
  const iterator = maze.pelletSet.values();
  const entry = iterator.next();
  if (entry.done) {
    throw new Error("maze has no pellets");
  }
  const index = entry.value;
  const col = index % COLS;
  const row = Math.floor(index / COLS);
  return { col, row };
}

function pickPowerPellet(maze) {
  const iterator = maze.powerPelletSet.values();
  const entry = iterator.next();
  if (entry.done) {
    throw new Error("maze has no power pellets");
  }
  const index = entry.value;
  const col = index % COLS;
  const row = Math.floor(index / COLS);
  return { col, row };
}

function centerFor(maze, tile) {
  return maze.tileCenter(tile.col, tile.row);
}

function createMockCanvas() {
  const calls = [];
  const ctx = {
    calls,
    canvas: null,
    save: () => {},
    restore: () => {},
    translate: () => {},
    rotate: () => {},
    beginPath: () => calls.push(["beginPath"]),
    arc: (...args) => calls.push(["arc", ...args]),
    fill: () => calls.push(["fill"]),
    stroke: () => calls.push(["stroke"]),
    clearRect: (...args) => calls.push(["clearRect", ...args]),
    fillRect: (...args) => calls.push(["fillRect", ...args]),
    rect: (...args) => calls.push(["rect", ...args]),
    drawImage: (...args) => calls.push(["drawImage", ...args]),
    ellipse: (...args) => calls.push(["ellipse", ...args]),
    moveTo: () => {},
    lineTo: () => {},
    quadraticCurveTo: () => {},
    closePath: () => {},
    createRadialGradient: () => ({ addColorStop: () => {} }),
    createLinearGradient: () => ({ addColorStop: () => {} }),
    set fillStyle(value) {
      calls.push(["fillStyle", value]);
    },
    get fillStyle() {
      return null;
    },
    set strokeStyle(value) {
      calls.push(["strokeStyle", value]);
    },
    get strokeStyle() {
      return null;
    },
    set lineWidth(value) {
      calls.push(["lineWidth", value]);
    },
    get lineWidth() {
      return 0;
    },
    set globalAlpha(value) {
      calls.push(["globalAlpha", value]);
    },
    get globalAlpha() {
      return 1;
    },
    set shadowBlur(value) {
      calls.push(["shadowBlur", value]);
    },
    get shadowBlur() {
      return 0;
    },
    set shadowColor(value) {
      calls.push(["shadowColor", value]);
    },
    get shadowColor() {
      return "";
    },
    set globalCompositeOperation(value) {
      calls.push(["gco", value]);
    },
    get globalCompositeOperation() {
      return "source-over";
    },
  };
  const canvas = {
    width: COLS * TILE_SIZE,
    height: ROWS * TILE_SIZE,
    ownerDocument: {
      createElement: () => ({
        width: COLS * TILE_SIZE,
        height: COLS * TILE_SIZE,
        getContext: () => ctx,
      }),
    },
    getContext: () => ctx,
  };
  ctx.canvas = canvas;
  return { canvas, ctx, calls };
}

test("Player consumes pellets and notifies hooks", () => {
  const maze = createMazeManager().maze;
  const pelletTile = pickPellet(maze);
  const player = new Player(maze, { spawn: pelletTile });
  let pelletsBefore = maze.pelletsRemaining();
  let pelletEvents = 0;
  player.update(16, {
    onPellet: () => {
      pelletEvents += 1;
    },
  });
  assert.equal(pelletEvents, 1);
  assert.equal(maze.pelletsRemaining(), pelletsBefore - 1);
});

test("Ghost frightened timers expire", () => {
  const maze = createMazeManager().maze;
  const pelletTile = pickPellet(maze);
  const player = new Player(maze, { spawn: pelletTile });
  const ghost = new Ghost(maze, { name: "blinky", scatterTarget: pelletTile });
  ghost.enterFrightened(1000);
  ghost.update(500, player, [ghost]);
  assert.equal(ghost.frightened, true);
  ghost.update(600, player, [ghost]);
  assert.equal(ghost.frightened, false);
});

test("Modern renderer draws glowing collectibles", async () => {
  const maze = createMazeManager().maze;
  const themeManager = createThemeManager("modern");
  const theme = themeManager.theme;
  const player = new Player(maze, theme.player);
  const glitch = new Glitch(maze, theme.enemies[0]);
  const { canvas, calls } = createMockCanvas();
  const { ModernRenderer } = await import("../src/renderers/ModernRenderer.js");
  const modernRenderer = new ModernRenderer(
    canvas,
    maze,
    theme,
  );
  modernRenderer.draw({ player, enemies: [glitch], fruit: null }, 16);
  const arcCalls = calls.filter(([name]) => name === "arc");
  assert.ok(arcCalls.length > 0, "expected energy node arcs to be drawn");
  const gcoCalls = calls.filter(([name, value]) => name === "gco" && value === "lighter");
  assert.ok(gcoCalls.length > 0, "glow composite operation should be used");
});

test("Game loop enters frightened mode when power pellet eaten", () => {
  const mazeManager = createMazeManager();
  const themeManager = createThemeManager("modern");
  const eventBus = createEventBus();
  const game = createGameLoop({ mazeManager, themeManager, eventBus });
  const maze = mazeManager.maze;
  const pacMan = game.pacMan;
  const powerTile = pickPowerPellet(maze);
  const center = centerFor(maze, powerTile);
  pacMan.x = center.x;
  pacMan.y = center.y;
  game.update(16);
  const frightenedCount = game.ghosts.filter((ghost) => ghost.frightened).length;
  assert.ok(frightenedCount > 0, "ghosts should be frightened after core consumption");
});

test("Renderer wrapper tracks theme changes", () => {
  const mazeManager = createMazeManager();
  const themeManager = createThemeManager("classic");
  const eventBus = createEventBus();
  const game = createGameLoop({ mazeManager, themeManager, eventBus });
  const { canvas } = createMockCanvas();
  const renderer = createRenderer({ canvas, game, theme: themeManager.theme, maze: mazeManager.maze });
  renderer.draw(performance.now());
  themeManager.setTheme("modern");
  renderer.setTheme(themeManager.theme, mazeManager.maze);
  assert.equal(renderer.theme.id, "modern");
});

test("index exposes Save HTML control", async () => {
  const html = await readFile(new URL("../index.html", import.meta.url), "utf8");
  assert.match(html, /id="save-html"/);
  assert.match(html, /saveButton\.addEventListener\('click'/);
});
