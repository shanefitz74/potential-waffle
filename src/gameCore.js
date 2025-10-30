import {
  MODE_SWITCH_INTERVAL,
  FRIGHTENED_DURATION,
  TILE_SIZE,
  COLS,
  ROWS,
} from "./constants.js";
import { createLevel } from "./level.js";
import { PacMan, Ghost } from "./entities.js";
import { createEventBus } from "./eventBus.js";

function createGhosts(level, random) {
  return [
    new Ghost(level, { name: "blinky", color: "#ff0000", scatterTarget: { col: COLS - 2, row: 1 } }, random),
    new Ghost(level, { name: "pinky", color: "#ffb8ff", scatterTarget: { col: 1, row: 1 } }, random),
    new Ghost(level, { name: "inky", color: "#00ffff", scatterTarget: { col: COLS - 2, row: ROWS - 2 } }, random),
    new Ghost(level, { name: "clyde", color: "#ffb851", scatterTarget: { col: 1, row: ROWS - 2 } }, random),
  ];
}

export function createGameCore(options = {}) {
  const {
    layout,
    random = Math.random,
    onScoreChange,
    onLivesChange,
    onLevelChange,
    onFrightenedTimerChange,
    onModeChange,
  } = options;

  const debugBus = createEventBus();
  const level = createLevel(layout);
  let pacMan = new PacMan(level);
  let ghosts = createGhosts(level, random);
  let frightenedGlobalTimer = 0;
  let modeTimer = MODE_SWITCH_INTERVAL;
  let chaseMode = false;
  let score = 0;
  let lives = 3;
  let levelNumber = 1;
  let gameOver = false;

  function notifyScore() {
    onScoreChange?.(score);
    debugBus.emit("score", { score });
  }

  function notifyLives() {
    onLivesChange?.(lives);
    debugBus.emit("lives", { lives });
  }

  function notifyLevel() {
    onLevelChange?.(levelNumber);
    debugBus.emit("level", { level: levelNumber });
  }

  function notifyFrightenedTimer() {
    onFrightenedTimerChange?.(Math.max(0, frightenedGlobalTimer));
    debugBus.emit("frightenedTimer", { remaining: Math.max(0, frightenedGlobalTimer) });
  }

  function notifyMode() {
    onModeChange?.(chaseMode ? "chase" : "scatter");
    debugBus.emit("mode", { mode: chaseMode ? "chase" : "scatter" });
  }

  function resetActors() {
    pacMan.reset();
    ghosts.forEach((ghost) => {
      ghost.reset();
      ghost.leaveFrightened();
      ghost.speed = ghost.baseSpeed;
    });
    ghosts.forEach((ghost) => ghost.setMode(chaseMode ? "chase" : "scatter"));
  }

  function resetLevelState() {
    level.reset();
    resetActors();
    frightenedGlobalTimer = 0;
    modeTimer = MODE_SWITCH_INTERVAL;
    chaseMode = false;
    notifyFrightenedTimer();
    notifyMode();
  }

  function restartGameState() {
    score = 0;
    lives = 3;
    levelNumber = 1;
    gameOver = false;
    notifyScore();
    notifyLives();
    notifyLevel();
    resetLevelState();
  }

  function handlePowerPellet() {
    frightenedGlobalTimer = FRIGHTENED_DURATION;
    ghosts.forEach((ghost) => ghost.enterFrightened(FRIGHTENED_DURATION));
    notifyFrightenedTimer();
    debugBus.emit("frightened", { active: true, duration: FRIGHTENED_DURATION });
  }

  function handlePelletScore(points) {
    score += points;
    notifyScore();
  }

  function loseLife() {
    lives -= 1;
    notifyLives();
    debugBus.emit("life", { lives });
    frightenedGlobalTimer = 0;
    notifyFrightenedTimer();
    if (lives <= 0) {
      gameOver = true;
      debugBus.emit("gameover", { win: false, score });
      return;
    }

    resetActors();
  }

  function advanceLevel() {
    levelNumber += 1;
    debugBus.emit("levelAdvance", { level: levelNumber });
    notifyLevel();
    level.reset();
    resetActors();
    frightenedGlobalTimer = 0;
    notifyFrightenedTimer();
  }

  function checkCollisions() {
    ghosts.forEach((ghost) => {
      const distance = Math.hypot(ghost.x - pacMan.x, ghost.y - pacMan.y);
      if (distance < TILE_SIZE * 0.6) {
        if (ghost.frightened) {
          ghost.respawn();
          handlePelletScore(200);
          debugBus.emit("ghostEaten", { ghost: ghost.name, score });
        } else {
          loseLife();
        }
      }
    });
  }

  function update(delta) {
    if (gameOver) return;

    pacMan.update(delta, {
      onPellet: () => handlePelletScore(10),
      onPowerPellet: () => {
        handlePelletScore(50);
        handlePowerPellet();
      },
    });

    ghosts.forEach((ghost) => ghost.update(delta, pacMan, ghosts));

    if (frightenedGlobalTimer > 0) {
      frightenedGlobalTimer = Math.max(0, frightenedGlobalTimer - delta);
      notifyFrightenedTimer();
      if (frightenedGlobalTimer === 0) {
        debugBus.emit("frightened", { active: false, duration: 0 });
      }
    }

    modeTimer -= delta;
    if (modeTimer <= 0) {
      chaseMode = !chaseMode;
      modeTimer = MODE_SWITCH_INTERVAL;
      ghosts.forEach((ghost) => ghost.setMode(chaseMode ? "chase" : "scatter"));
      notifyMode();
      debugBus.emit("modeSwitch", { mode: chaseMode ? "chase" : "scatter" });
    }

    checkCollisions();

    if (level.pelletsRemaining() === 0) {
      advanceLevel();
    }
  }

  restartGameState();

  return {
    level,
    get pacMan() {
      return pacMan;
    },
    get ghosts() {
      return ghosts;
    },
    get score() {
      return score;
    },
    get lives() {
      return lives;
    },
    get levelNumber() {
      return levelNumber;
    },
    get frightenedTimer() {
      return Math.max(0, frightenedGlobalTimer);
    },
    get mode() {
      return chaseMode ? "chase" : "scatter";
    },
    get gameOver() {
      return gameOver;
    },
    setDirection(dir) {
      pacMan.setDirection(dir);
    },
    update,
    resetGame() {
      restartGameState();
    },
    debug: {
      events: () => [...debugBus.events],
      on: (...args) => debugBus.on(...args),
    },
    stepSimulation(delta, steps = 1) {
      for (let i = 0; i < steps; i += 1) {
        update(delta);
      }
    },
  };
}
