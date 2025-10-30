import { TILE_SIZE } from "../constants.js";
import { wrapTunnelX } from "../utils.js";

export class Entity {
  constructor(maze, spawn, speed) {
    this.maze = maze;
    this.spawn = { ...spawn };
    this.baseSpeed = speed;
    this.speed = speed;
    this.reset();
  }

  reset() {
    const { x, y } = this.maze.tileCenter(this.spawn.col, this.spawn.row);
    this.x = x;
    this.y = y;
    this.dir = { x: 0, y: 0 };
    this.nextDir = { x: 0, y: 0 };
    this.pendingWrap = false;
  }

  setMaze(maze) {
    this.maze = maze;
  }

  setSpeedMultiplier(multiplier = 1) {
    this.speed = this.baseSpeed * multiplier;
  }

  setDirection(dir) {
    this.nextDir = { ...dir };
  }

  get col() {
    return Math.floor(this.x / TILE_SIZE);
  }

  get row() {
    return Math.floor(this.y / TILE_SIZE);
  }

  get tileCenter() {
    return this.maze.tileCenter(this.col, this.row);
  }

  atCenter(threshold = 0.45) {
    const center = this.tileCenter;
    return Math.abs(this.x - center.x) < threshold && Math.abs(this.y - center.y) < threshold;
  }

  canMove(dir) {
    if (!dir.x && !dir.y) return false;
    const targetCol = this.col + dir.x;
    const targetRow = this.row + dir.y;
    return !this.maze.isWall(targetCol, targetRow);
  }

  move(delta) {
    const seconds = delta / 1000;
    if (this.atCenter()) {
      if (this.nextDir && this.canMove(this.nextDir)) {
        this.dir = { ...this.nextDir };
      }
      if (!this.canMove(this.dir)) {
        this.dir = { x: 0, y: 0 };
      }
      const center = this.tileCenter;
      this.x = center.x;
      this.y = center.y;
    }

    if (!this.dir.x && !this.dir.y) {
      this.pendingWrap = false;
      return;
    }

    const dx = this.dir.x * this.speed * seconds;
    const dy = this.dir.y * this.speed * seconds;
    const nextX = this.x + dx;
    const nextY = this.y + dy;
    const wrappedX = wrapTunnelX(
      nextX,
      this.dir.x,
      this.row,
      this.maze.tunnelRows,
      this.maze.totalWidth,
    );
    this.pendingWrap = wrappedX !== nextX;
    this.x = wrappedX;
    this.y = nextY;
  }

  consumeWrapFlag() {
    const wrapped = this.pendingWrap;
    this.pendingWrap = false;
    return wrapped;
  }
}
