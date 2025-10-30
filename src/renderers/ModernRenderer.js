import { TILE_SIZE, COLS } from "../constants.js";
import {
  createBufferCanvas,
  drawByte,
  drawGlitch,
  drawEnergyNode,
  drawOverclockCore,
  drawMazeModern,
} from "./helpers.js";

export class ModernRenderer {
  constructor(canvas, maze, theme) {
    this.canvas = canvas;
    this.ctx = canvas.getContext("2d");
    this.maze = maze;
    this.theme = theme;
    this.time = 0;
    this.wallLayer = null;
    this.collectibleLayer = null;
    this.collectibleVersion = -1;
    this.#buildLayers();
  }

  setTheme(theme, maze) {
    this.theme = theme;
    if (maze) {
      this.maze = maze;
    }
    this.#buildLayers();
  }

  #buildWallLayer() {
    if (!this.maze) return;
    const buffer = createBufferCanvas(this.canvas);
    buffer.width = this.canvas.width;
    buffer.height = this.canvas.height;
    const ctx = buffer.getContext("2d");
    drawMazeModern(ctx, this.maze, this.theme);
    this.wallLayer = buffer;
  }

  #buildCollectibleLayer() {
    if (!this.maze) return;
    const buffer = createBufferCanvas(this.canvas);
    buffer.width = this.canvas.width;
    buffer.height = this.canvas.height;
    const ctx = buffer.getContext("2d");
    const pelletType = this.theme.collectibles?.pellet?.type ?? "energy";
    this.maze.pelletSet.forEach((index) => {
      const col = index % COLS;
      const row = Math.floor(index / COLS);
      const { x, y } = this.maze.tileCenter(col, row);
      if (pelletType === "dot") {
        ctx.fillStyle = this.theme.collectibles?.pellet?.color ?? "#ffe58a";
        ctx.beginPath();
        ctx.arc(x, y, TILE_SIZE * 0.16, 0, Math.PI * 2);
        ctx.fill();
      } else {
        drawEnergyNode(ctx, x, y);
      }
    });
    this.collectibleLayer = buffer;
    this.collectibleVersion = this.maze.version ?? 0;
  }

  #buildLayers() {
    this.#buildWallLayer();
    this.collectibleLayer = null;
    this.collectibleVersion = -1;
    this.#buildCollectibleLayer();
  }

  #drawPowerCores(ctx, time) {
    const powerType = this.theme.collectibles?.power?.type ?? "core";
    this.maze.powerPelletSet.forEach((index) => {
      const col = index % COLS;
      const row = Math.floor(index / COLS);
      const { x, y } = this.maze.tileCenter(col, row);
      if (powerType === "power") {
        ctx.fillStyle = this.theme.collectibles?.power?.color ?? "#ffffff";
        ctx.beginPath();
        ctx.arc(x, y, TILE_SIZE * 0.28, 0, Math.PI * 2);
        ctx.fill();
      } else {
        drawOverclockCore(ctx, x, y, time);
      }
    });
  }

  resize(maze) {
    if (maze) this.maze = maze;
    this.#buildLayers();
  }

  draw(state, delta) {
    this.time += delta;
    const { player, enemies, fruit } = state;
    const { ctx } = this;
    ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
    if (this.wallLayer) {
      ctx.drawImage(this.wallLayer, 0, 0);
    }
    if ((this.maze.version ?? 0) !== this.collectibleVersion) {
      this.#buildCollectibleLayer();
    }
    if (this.collectibleLayer) {
      ctx.drawImage(this.collectibleLayer, 0, 0);
    }
    this.#drawPowerCores(ctx, this.time);
    enemies.forEach((enemy) => {
      drawGlitch(ctx, enemy.x, enemy.y, TILE_SIZE, enemy.kind ?? enemy.name, this.time);
    });
    if (player?.trail) {
      player.trail.forEach((segment) => {
        const alpha = segment.life;
        ctx.fillStyle = `rgba(120, 220, 255, ${alpha * 0.25})`;
        ctx.beginPath();
        ctx.arc(segment.x, segment.y, TILE_SIZE * 0.18 * alpha, 0, Math.PI * 2);
        ctx.fill();
      });
    }
    if (player) {
      drawByte(ctx, player.x, player.y, TILE_SIZE, player.mouthPhase, player.facing);
    }
    if (fruit?.visible) {
      drawOverclockCore(ctx, fruit.x, fruit.y, this.time);
    }
  }
}
