import { TILE_SIZE, COLS } from "../constants.js";
import { createBufferCanvas } from "./helpers.js";

function drawPac(ctx, player) {
  const radius = TILE_SIZE * 0.45;
  const angle = Math.abs(Math.sin(player.mouthPhase)) * Math.PI * 0.2 + Math.PI * 0.1;
  const rotation = Math.atan2(player.facing.y, player.facing.x);
  ctx.save();
  ctx.translate(player.x, player.y);
  ctx.rotate(rotation);
  ctx.fillStyle = "#ffcc00";
  ctx.beginPath();
  ctx.moveTo(0, 0);
  ctx.arc(0, 0, radius, angle, Math.PI * 2 - angle);
  ctx.closePath();
  ctx.fill();
  ctx.restore();
}

function drawGhost(ctx, ghost, frightened) {
  const radius = TILE_SIZE * 0.45;
  ctx.save();
  ctx.translate(ghost.x, ghost.y);
  ctx.fillStyle = frightened ? "#3366ff" : ghost.color;
  ctx.beginPath();
  ctx.arc(0, -radius * 0.2, radius, Math.PI, 0);
  ctx.lineTo(radius, radius);
  for (let i = 0; i < 4; i += 1) {
    const step = (Math.PI * 2 * i) / 4;
    ctx.quadraticCurveTo(
      radius - i * (radius / 2),
      radius + Math.sin(step) * radius * 0.2,
      radius - (i + 1) * (radius / 2),
      radius,
    );
  }
  ctx.closePath();
  ctx.fill();
  ctx.restore();
}

function drawPellets(ctx, maze, theme) {
  const pelletColor = theme.collectibles?.pellet?.color ?? "#f5e6a1";
  ctx.fillStyle = pelletColor;
  maze.pelletSet.forEach((index) => {
    const col = index % COLS;
    const row = Math.floor(index / COLS);
    const { x, y } = maze.tileCenter(col, row);
    ctx.beginPath();
    ctx.arc(x, y, TILE_SIZE * 0.15, 0, Math.PI * 2);
    ctx.fill();
  });

  const powerColor = theme.collectibles?.power?.color ?? "#ffffff";
  ctx.fillStyle = powerColor;
  maze.powerPelletSet.forEach((index) => {
    const col = index % COLS;
    const row = Math.floor(index / COLS);
    const { x, y } = maze.tileCenter(col, row);
    ctx.beginPath();
    ctx.arc(x, y, TILE_SIZE * 0.28, 0, Math.PI * 2);
    ctx.fill();
  });
}

export class ClassicRenderer {
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
    ctx.fillStyle = this.theme.walls?.fill ?? "#000";
    ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);
    ctx.strokeStyle = this.theme.walls?.stroke ?? "#1d3cff";
    ctx.lineWidth = 2;
    ctx.beginPath();
    this.maze.walls.forEach((index) => {
      const col = index % COLS;
      const row = Math.floor(index / COLS);
      ctx.rect(col * TILE_SIZE, row * TILE_SIZE, TILE_SIZE, TILE_SIZE);
    });
    ctx.stroke();
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
    drawPellets(ctx, this.maze, this.theme);
    enemies.forEach((ghost) => drawGhost(ctx, ghost, ghost.frightened));
    if (player) drawPac(ctx, player);
    if (fruit?.visible) {
      ctx.fillStyle = "#ff4444";
      ctx.beginPath();
      ctx.arc(fruit.x, fruit.y, TILE_SIZE * 0.25, 0, Math.PI * 2);
      ctx.fill();
    }
  }
}
