import { Entity } from "./Entity.js";
import {
  PAC_BASE_SPEED,
  FRIGHTENED_SPEED,
  PLAYER_TRAIL_LENGTH,
} from "../constants.js";

export class Player extends Entity {
  constructor(maze, config = {}) {
    super(maze, config.spawn ?? { col: 13, row: 23 }, config.speed ?? PAC_BASE_SPEED);
    this.variant = config.variant ?? "classic";
    this.trailEnabled = Boolean(config.trail ?? (this.variant !== "classic"));
    this.trail = this.trail ?? [];
    this.mouthPhase = 0;
    this.facing = { x: 1, y: 0 };
  }

  reset() {
    if (!this.trail) {
      this.trail = [];
    } else {
      this.trail.length = 0;
    }
    super.reset();
    this.mouthPhase = 0;
    this.facing = { x: 1, y: 0 };
  }

  update(delta, hooks = {}) {
    if (hooks.speedMultiplier) {
      this.setSpeedMultiplier(hooks.speedMultiplier);
    } else {
      this.setSpeedMultiplier(1);
    }

    super.move(delta);

    if (this.dir.x || this.dir.y) {
      this.facing = { ...this.dir };
    }

    this.mouthPhase = (this.mouthPhase + delta * 0.012) % (Math.PI * 2);

    if (this.trailEnabled) {
      if (this.dir.x || this.dir.y) {
        this.trail.unshift({ x: this.x, y: this.y, life: 1 });
        while (this.trail.length > PLAYER_TRAIL_LENGTH) {
          this.trail.pop();
        }
      }
      const decay = delta / 400;
      this.trail.forEach((segment) => {
        segment.life = Math.max(0, segment.life - decay);
      });
      this.trail = this.trail.filter((segment) => segment.life > 0.02);
    }

    const consumed = this.maze.consume(this.col, this.row);
    if (consumed === "pellet") {
      hooks.onPellet?.();
    } else if (consumed === "power") {
      hooks.onPowerPellet?.();
    }
  }

  frightenedSpeedMultiplier(multiplier = 1) {
    this.speed = FRIGHTENED_SPEED * multiplier;
  }
}
