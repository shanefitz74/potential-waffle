import { Entity } from "./Entity.js";

export class BonusFruit extends Entity {
  constructor(maze, spawn, score = 100) {
    super(maze, spawn, 0);
    this.score = score;
    this.visible = false;
    this.timer = 0;
  }

  appear(duration) {
    const center = this.maze.tileCenter(this.spawn.col, this.spawn.row);
    this.x = center.x;
    this.y = center.y;
    this.visible = true;
    this.timer = duration;
  }

  update(delta) {
    if (!this.visible) return;
    this.timer -= delta;
    if (this.timer <= 0) {
      this.visible = false;
    }
  }
}
