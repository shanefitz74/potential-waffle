import { TILE_SIZE, COLS } from "../constants.js";
import {
  createBufferCanvas,
  drawByte,
  drawGlitch,
  drawEnergyNode,
  drawOverclockCore,
  drawMazeModern,
} from "./helpers.js";

function drawCollectibles(ctx, maze, theme, time) {
  const pelletType = theme.collectibles?.pellet?.type ?? "energy";
  maze.pelletSet.forEach((index) => {
    const col = index % COLS;
    const row = Math.floor(index / COLS);
    const { x, y } = maze.tileCenter(col, row);
    if (pelletType === "dot") {
      ctx.fillStyle = theme.collectibles?.pellet?.color ?? "#ffe58a";
      ctx.beginPath();
      ctx.arc(x, y, TILE_SIZE * 0.16, 0, Math.PI * 2);
      ctx.fill();
    } else {
      drawEnergyNode(ctx, x, y);
    }
  });

  const powerType = theme.collectibles?.power?.type ?? "core";
  maze.powerPelletSet.forEach((index) => {
    const col = index % COLS;
    const row = Math.floor(index / COLS);
    const { x, y } = maze.tileCenter(col, row);
    if (powerType === "power") {
      ctx.fillStyle = theme.collectibles?.power?.color ?? "#ffffff";
      ctx.beginPath();
      ctx.arc(x, y, TILE_SIZE * 0.28, 0, Math.PI * 2);
      ctx.fill();
    } else {
      drawOverclockCore(ctx, x, y, time);
    }
  });
}

export class ModernRenderer {
  constructor(canvas, maze, theme) {
    this.canvas = canvas;
    this.ctx = canvas.getContext("2d");
    this.maze = maze;
    this.theme = theme;
    this.time = 0;
    this.wallLayer = null;
    this.#buildWallLayer();
  }

  setTheme(theme, maze) {
    this.theme = theme;
    if (maze) {
      this.maze = maze;
    }
    this.#buildWallLayer();
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

  resize(maze) {
    if (maze) this.maze = maze;
    this.#buildWallLayer();
  }

  draw(state, delta) {
    this.time += delta;
    const { player, enemies, fruit } = state;
    const { ctx } = this;
    ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
    if (this.wallLayer) {
      ctx.drawImage(this.wallLayer, 0, 0);
    }
    drawCollectibles(ctx, this.maze, this.theme, this.time);
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
