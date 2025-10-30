import { Entity } from "./Entity.js";
import {
  TILE_SIZE,
  GHOST_BASE_SPEED,
  FRIGHTENED_SPEED,
  GHOST_COMBO_VALUES,
} from "../constants.js";
import { clampTile } from "../utils.js";

const PERSONALITY_TARGETS = {
  blinky(pacMan) {
    return { col: pacMan.col, row: pacMan.row };
  },
  pinky(pacMan) {
    const dir = pacMan.dir.x || pacMan.dir.y ? pacMan.dir : pacMan.facing;
    return {
      col: clampTile(pacMan.col + dir.x * 4, 27),
      row: clampTile(pacMan.row + dir.y * 4, 30),
    };
  },
  inky(pacMan, ghosts) {
    const dir = pacMan.dir.x || pacMan.dir.y ? pacMan.dir : pacMan.facing;
    const ahead = {
      col: clampTile(pacMan.col + dir.x * 2, 27),
      row: clampTile(pacMan.row + dir.y * 2, 30),
    };
    const blinky = ghosts.find((ghost) => ghost.name === "blinky") || ghosts[0];
    return {
      col: clampTile(ahead.col + (ahead.col - blinky.col), 27),
      row: clampTile(ahead.row + (ahead.row - blinky.row), 30),
    };
  },
  clyde(pacMan) {
    const distance = Math.hypot(this.x - pacMan.x, this.y - pacMan.y);
    if (distance > TILE_SIZE * 8) {
      return { col: pacMan.col, row: pacMan.row };
    }
    return this.scatterTarget;
  },
};

const GHOST_PERSONALITIES = {
  blinky: { baseMood: "wary", trait: "Driven rival" },
  pinky: { baseMood: "curious", trait: "Strategic dreamer" },
  inky: { baseMood: "anxious", trait: "Empathic skeptic" },
  clyde: { baseMood: "friendly", trait: "Warm-hearted drifter" },
};

export class Ghost extends Entity {
  constructor(maze, options = {}, random = Math.random) {
    super(maze, options.spawn ?? { col: 13, row: 11 }, GHOST_BASE_SPEED);
    this.name = options.name ?? "ghost";
    this.color = options.color ?? "#fff";
    this.scatterTarget = options.scatterTarget ?? { col: 1, row: 1 };
    this.mode = "scatter";
    this.frightened = false;
    this.comboIndex = 0;
    this.random = random;
    this.acceleration = 0;
    this.aiMode = options.aiMode ?? "classic";
    this.affinity = 0;
    this.personality = GHOST_PERSONALITIES[this.name] ?? {
      baseMood: "wary",
      trait: "Mysterious rival",
    };
    this.mood = this.personality.baseMood;
    this.moodTimer = 0;
    this.onMoodListener = null;
  }

  setMode(mode) {
    this.mode = mode;
  }

  enterFrightened(duration) {
    this.frightened = true;
    this.comboIndex = 0;
    this.speed = FRIGHTENED_SPEED;
    this.frightenedTimer = duration;
    this.dir = { x: -this.dir.x, y: -this.dir.y };
  }

  leaveFrightened() {
    this.frightened = false;
    this.frightenedTimer = 0;
    this.syncSpeed();
  }

  applyDifficulty(multiplier) {
    this.baseSpeed = (GHOST_BASE_SPEED + this.acceleration) * multiplier;
    this.syncSpeed();
  }

  accelerate(amount) {
    this.acceleration = amount;
    this.baseSpeed = GHOST_BASE_SPEED + amount;
    this.syncSpeed();
  }

  respawn() {
    this.reset();
    this.leaveFrightened();
  }

  getTargetTile(pacMan, ghosts) {
    if (this.aiMode === "social") {
      if (this.mood === "friendly") {
        return this.scatterTarget;
      }
      if (this.mood === "betrayed") {
        return { col: pacMan.col, row: pacMan.row };
      }
      if (this.mood === "tricked") {
        const options = ghosts.map((ghost) => ghost.scatterTarget);
        return options[Math.floor(this.random() * options.length)] ?? this.scatterTarget;
      }
      if (this.mood === "curious") {
        const targetFn = PERSONALITY_TARGETS[this.name];
        if (targetFn) return targetFn.call(this, pacMan, ghosts);
      }
      if (this.mood === "anxious") {
        return this.scatterTarget;
      }
    }

    if (this.mode === "scatter") {
      return this.scatterTarget;
    }
    if (this.mode === "frightened" || this.frightened) {
      return { col: this.col, row: this.row };
    }

    if (this.name === "clyde") {
      const distance = Math.hypot(this.x - pacMan.x, this.y - pacMan.y);
      if (distance > TILE_SIZE * 8) {
        return { col: pacMan.col, row: pacMan.row };
      }
      return this.scatterTarget;
    }

    if (this.name === "inky") {
      return PERSONALITY_TARGETS.inky.call(this, pacMan, ghosts);
    }

    if (this.name === "pinky") {
      return PERSONALITY_TARGETS.pinky(pacMan);
    }

    return PERSONALITY_TARGETS.blinky(pacMan);
  }

  chooseDirection(pacMan, ghosts) {
    const options = [
      { x: 1, y: 0 },
      { x: -1, y: 0 },
      { x: 0, y: 1 },
      { x: 0, y: -1 },
    ];
    const opposite = { x: -this.dir.x, y: -this.dir.y };
    const validOptions = options.filter((option) => {
      if (option.x === opposite.x && option.y === opposite.y) return false;
      return this.canMove(option);
    });

    if (validOptions.length === 0) {
      this.dir = opposite;
      return;
    }

    if (this.frightened) {
      const randomDir = validOptions[Math.floor(this.random() * validOptions.length)];
      this.dir = randomDir;
      this.nextDir = randomDir;
      return;
    }

    const target = this.getTargetTile(pacMan, ghosts);
    validOptions.sort((a, b) => {
      const aCol = this.col + a.x;
      const aRow = this.row + a.y;
      const bCol = this.col + b.x;
      const bRow = this.row + b.y;
      const aDist = Math.hypot(target.col - aCol, target.row - aRow);
      const bDist = Math.hypot(target.col - bCol, target.row - bRow);
      return aDist - bDist;
    });
    this.dir = validOptions[0];
    this.nextDir = this.dir;
  }

  update(delta, pacMan, ghosts, context = {}) {
    if (context.aiMode) {
      this.aiMode = context.aiMode;
    }
    if (this.frightened) {
      this.frightenedTimer -= delta;
      if (this.frightenedTimer <= 0) {
        this.leaveFrightened();
      }
    }

    if (this.atCenter()) {
      this.chooseDirection(pacMan, ghosts);
    }

    this.move(delta);
    this.tickMood(delta);
  }

  consumeCombo() {
    const score = GHOST_COMBO_VALUES[Math.min(this.comboIndex, GHOST_COMBO_VALUES.length - 1)];
    this.comboIndex += 1;
    return score;
  }

  setAIMode(mode) {
    this.aiMode = mode;
    this.syncSpeed();
  }

  setMoodListener(listener) {
    this.onMoodListener = listener;
  }

  resolveMoodFromAffinity() {
    if (this.affinity >= 3) return "friendly";
    if (this.affinity <= -3) return "betrayed";
    if (this.affinity >= 1) return "curious";
    if (this.affinity <= -1) return "wary";
    return this.personality.baseMood;
  }

  setMood(mood, duration = 0) {
    const nextMood = mood ?? this.resolveMoodFromAffinity();
    if (this.mood === nextMood && duration <= 0) {
      return false;
    }
    this.mood = nextMood;
    this.moodTimer = duration;
    this.syncSpeed();
    this.onMoodListener?.(this);
    return true;
  }

  syncSpeed() {
    if (this.frightened) {
      this.speed = FRIGHTENED_SPEED;
      return;
    }
    let adjusted = this.baseSpeed;
    if (this.aiMode === "social") {
      if (this.mood === "friendly") {
        adjusted *= 0.75;
      } else if (this.mood === "curious") {
        adjusted *= 0.95;
      } else if (this.mood === "tricked") {
        adjusted *= 0.9;
      } else if (this.mood === "betrayed") {
        adjusted *= 1.2;
      } else if (this.mood === "anxious" || this.mood === "wary") {
        adjusted *= 0.98;
      }
    }
    this.speed = adjusted;
  }

  adjustAffinity(delta) {
    this.affinity = Math.max(-5, Math.min(5, this.affinity + delta));
    return this.setMood();
  }

  markTricked() {
    return this.setMood("tricked", 3500);
  }

  tickMood(delta) {
    if (this.moodTimer <= 0) return false;
    this.moodTimer -= delta;
    if (this.moodTimer <= 0) {
      return this.setMood();
    }
    return false;
  }

  get moodLabel() {
    return this.mood;
  }

  get personalityTrait() {
    return this.personality.trait;
  }
}
