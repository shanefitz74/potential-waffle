import {
  FRIGHTENED_DURATION,
  MODE_SWITCH_INTERVAL,
  FRUIT_DURATION,
  GAME_STATES,
  GHOST_COMBO_VALUES,
  TILE_SIZE,
  MEMORY_REVEAL_DURATION,
} from "./constants.js";
import { createEventBus } from "./eventBus.js";
import { Player } from "./entities/Player.js";
import { Ghost } from "./entities/Ghost.js";
import { Glitch } from "./entities/Glitch.js";
import { BonusFruit } from "./entities/BonusFruit.js";
import { createStateMachine } from "./stateMachine.js";
import { getMemoryPanel } from "./memories.js";

function createGhosts(maze, theme, random) {
  const configs = theme?.enemies ?? [];
  if (configs.length === 0) {
    return [
      new Ghost(
        maze,
        { name: "blinky", color: "#ff0000", scatterTarget: { col: 25, row: 1 } },
        random,
      ),
      new Ghost(
        maze,
        { name: "pinky", color: "#ffb8ff", scatterTarget: { col: 2, row: 1 } },
        random,
      ),
      new Ghost(
        maze,
        { name: "inky", color: "#00ffff", scatterTarget: { col: 25, row: 30 } },
        random,
      ),
      new Ghost(
        maze,
        { name: "clyde", color: "#ffb851", scatterTarget: { col: 2, row: 30 } },
        random,
      ),
    ];
  }
  return configs.map((config) => {
    if (config.type === "glitch") {
      return new Glitch(maze, config, random);
    }
    return new Ghost(maze, config, random);
  });
}

function createFruit(maze) {
  const fallback = { col: 13, row: 17 };
  const tile = maze.fruitTiles[0] ?? fallback;
  return new BonusFruit(maze, tile, 100);
}

export function createGameLoop({
  mazeManager,
  themeManager,
  random = Math.random,
  highScore = 0,
  eventBus = createEventBus(),
}) {
  let maze = mazeManager.maze;
  let activeTheme = themeManager?.theme;
  let pacMan = new Player(maze, activeTheme?.player);
  let ghosts = createGhosts(maze, activeTheme, random);
  let fruit = createFruit(maze);

  const stateMachine = createStateMachine(GAME_STATES.READY, {
    [GAME_STATES.READY]: [GAME_STATES.PLAYING, GAME_STATES.PAUSED, GAME_STATES.MEMORY],
    [GAME_STATES.PLAYING]: [
      GAME_STATES.FRIGHTENED,
      GAME_STATES.PAUSED,
      GAME_STATES.GAME_OVER,
      GAME_STATES.MEMORY,
    ],
    [GAME_STATES.FRIGHTENED]: [GAME_STATES.PLAYING, GAME_STATES.GAME_OVER, GAME_STATES.MEMORY],
    [GAME_STATES.MEMORY]: [GAME_STATES.READY, GAME_STATES.PLAYING],
    [GAME_STATES.PAUSED]: [GAME_STATES.PLAYING, GAME_STATES.MEMORY],
    [GAME_STATES.GAME_OVER]: [GAME_STATES.READY],
  });

  let frightenedTimer = 0;
  let modeTimer = MODE_SWITCH_INTERVAL;
  let chaseMode = false;
  let levelNumber = 1;
  let score = 0;
  let lives = 3;
  let pelletsAtStart = maze.pelletsRemaining();
  let ghostCombo = 0;
  let blinkyCruise = false;
  let fruitArmed = [true, true];
  let currentHighScore = highScore;
  let fruitWasVisible = false;
  let ghostAIMode = "classic";
  let powerUpsEnabled = true;
  let ghostsEatenDuringFrightened = 0;
  let memoryTimer = 0;
  let memoryActive = false;

  eventBus.emit("state", { state: stateMachine.state });
  eventBus.emit("score", { score, highScore: currentHighScore });
  eventBus.emit("lives", { lives });
  eventBus.emit("level", { level: levelNumber, maze: maze.name });
  eventBus.emit("mode", { mode: chaseMode ? "chase" : "scatter" });
  eventBus.emit("powerUps", { enabled: powerUpsEnabled });
  eventBus.emit("ghostMode", { mode: ghostAIMode });

  function broadcastMood(ghost) {
    eventBus.emit("ghostMood", {
      ghost: ghost.name,
      mood: ghost.moodLabel,
      affinity: ghost.affinity,
      trait: ghost.personalityTrait,
    });
  }

  function configureGhost(ghost) {
    ghost.setMoodListener(() => broadcastMood(ghost));
    ghost.setAIMode(ghostAIMode);
    broadcastMood(ghost);
  }

  ghosts.forEach((ghost) => configureGhost(ghost));

  function rebuildEntities(theme = activeTheme) {
    activeTheme = theme;
    pacMan = new Player(maze, activeTheme?.player);
    ghosts = createGhosts(maze, activeTheme, random);
    ghosts.forEach((ghost) => configureGhost(ghost));
    resetLevelState();
  }

  if (themeManager) {
    themeManager.onChange((theme) => {
      rebuildEntities(theme);
      eventBus.emit("theme", { id: theme.id });
    });
  }

  function resetActors() {
    pacMan.reset();
    ghosts.forEach((ghost) => {
      ghost.reset();
      ghost.leaveFrightened();
      ghost.applyDifficulty(difficultyMultiplier());
      ghost.setAIMode(ghostAIMode);
    });
    ghostCombo = 0;
  }

  function resetLevelState() {
    maze.reset();
    pelletsAtStart = maze.pelletsRemaining();
    fruit = createFruit(maze);
    fruitArmed = [true, true];
    frightenedTimer = 0;
    modeTimer = MODE_SWITCH_INTERVAL;
    chaseMode = false;
    blinkyCruise = false;
    fruitWasVisible = false;
    ghostsEatenDuringFrightened = 0;
    eventBus.emit("mode", { mode: "scatter" });
    eventBus.emit("fruit", { active: false });
    resetActors();
  }

  function updateHighScore() {
    if (score > currentHighScore) {
      currentHighScore = score;
      eventBus.emit("highScore", { highScore: currentHighScore });
    }
  }

  function difficultyMultiplier() {
    return 1 + (levelNumber - 1) * 0.08;
  }

  function handleGhostEaten(ghost) {
    const comboScore = GHOST_COMBO_VALUES[Math.min(ghostCombo, GHOST_COMBO_VALUES.length - 1)];
    ghostCombo += 1;
    score += comboScore;
    eventBus.emit("ghostEaten", { ghost: ghost.name, combo: ghostCombo, score: comboScore });
    eventBus.emit("score", { score, highScore: currentHighScore });
    ghost.respawn();
    if (ghostAIMode === "social") {
      ghostsEatenDuringFrightened += 1;
      ghost.adjustAffinity(-2);
      broadcastMood(ghost);
      ghost.setMood("betrayed", 6000);
    }
    updateHighScore();
  }

  function handleLifeLoss() {
    lives -= 1;
    eventBus.emit("lives", { lives });
    if (lives <= 0) {
      stateMachine.transition(GAME_STATES.GAME_OVER);
      eventBus.emit("state", { state: GAME_STATES.GAME_OVER });
      eventBus.emit("gameOver", { score, level: levelNumber });
      return;
    }
    resetActors();
    stateMachine.transition(GAME_STATES.READY);
    eventBus.emit("state", { state: GAME_STATES.READY });
  }

  function handleFruitSpawn() {
    if (!fruit) return;
    fruit.appear(FRUIT_DURATION);
    fruitWasVisible = true;
    eventBus.emit("fruit", { active: true });
  }

  function tryArmFruit() {
    const remaining = maze.pelletsRemaining();
    const firstThreshold = pelletsAtStart - Math.floor(pelletsAtStart * 0.35);
    const secondThreshold = pelletsAtStart - Math.floor(pelletsAtStart * 0.7);
    if (fruitArmed[0] && remaining <= firstThreshold) {
      fruitArmed[0] = false;
      handleFruitSpawn();
    } else if (fruitArmed[1] && remaining <= secondThreshold) {
      fruitArmed[1] = false;
      handleFruitSpawn();
    }
  }

  function advanceLevel() {
    levelNumber += 1;
    const prevMazeName = maze.name;
    maze = mazeManager.advance();
    pacMan.setMaze?.(maze);
    ghosts = createGhosts(maze, activeTheme, random);
    ghosts.forEach((ghost) => configureGhost(ghost));
    fruit = createFruit(maze);
    eventBus.emit("level", { level: levelNumber, maze: maze.name, previous: prevMazeName });
    resetLevelState();
    if (stateMachine.transition(GAME_STATES.MEMORY)) {
      memoryActive = true;
      memoryTimer = MEMORY_REVEAL_DURATION;
      eventBus.emit("state", { state: GAME_STATES.MEMORY });
      const panel = getMemoryPanel(levelNumber);
      eventBus.emit("memory", { ...panel, level: levelNumber });
    }
  }

  function handlePellet(points, type) {
    score += points;
    eventBus.emit("score", { score, highScore: currentHighScore });
    eventBus.emit("pellet", { type, score });
    tryArmFruit();
    updateHighScore();
    if (ghostAIMode === "social") {
      if (type === "pellet") {
        ghosts.forEach((ghost) => {
          ghost.adjustAffinity(0.1);
          broadcastMood(ghost);
        });
      } else if (type === "power" && powerUpsEnabled) {
        ghosts.forEach((ghost) => {
          ghost.adjustAffinity(0.2);
          broadcastMood(ghost);
        });
      }
    }
  }

  function handlePowerPellet() {
    if (!powerUpsEnabled) {
      return;
    }
    frightenedTimer = FRIGHTENED_DURATION;
    ghostCombo = 0;
    ghostsEatenDuringFrightened = 0;
    stateMachine.transition(GAME_STATES.FRIGHTENED);
    eventBus.emit("state", { state: GAME_STATES.FRIGHTENED });
    ghosts.forEach((ghost) => ghost.enterFrightened(frightenedTimer));
    eventBus.emit("mode", { mode: "frightened" });
  }

  function updateMode(delta) {
    modeTimer -= delta;
    if (modeTimer <= 0) {
      chaseMode = !chaseMode;
      modeTimer = Math.max(3000, MODE_SWITCH_INTERVAL - levelNumber * 300);
      const mode = chaseMode ? "chase" : "scatter";
      eventBus.emit("mode", { mode });
      ghosts.forEach((ghost) => ghost.setMode(mode));
    }
  }

  function updateFrightened(delta) {
    if (stateMachine.state !== GAME_STATES.FRIGHTENED) return;
    frightenedTimer -= delta;
    eventBus.emit("frightened", { remaining: Math.max(0, frightenedTimer) });
    if (frightenedTimer <= 0) {
      stateMachine.transition(GAME_STATES.PLAYING);
      eventBus.emit("state", { state: GAME_STATES.PLAYING });
      ghosts.forEach((ghost) => ghost.leaveFrightened());
      eventBus.emit("mode", { mode: chaseMode ? "chase" : "scatter" });
      if (ghostAIMode === "social") {
        if (ghostsEatenDuringFrightened === 0) {
          ghosts.forEach((ghost) => {
            ghost.adjustAffinity(1);
            ghost.setMood("friendly", 5000);
            broadcastMood(ghost);
          });
        } else {
          ghosts.forEach((ghost) => {
            ghost.adjustAffinity(-0.5);
            broadcastMood(ghost);
          });
        }
      }
    }
  }

  function checkComboReset() {
    if (stateMachine.state !== GAME_STATES.FRIGHTENED) {
      ghostCombo = 0;
    }
  }

  function checkFruitCollision() {
    if (!fruit || !fruit.visible) return;
    const distance = Math.hypot(fruit.x - pacMan.x, fruit.y - pacMan.y);
    if (distance < TILE_SIZE * 0.6) {
      score += fruit.score;
      eventBus.emit("fruit", { active: false, score: fruit.score });
      eventBus.emit("score", { score, highScore: currentHighScore });
      fruit.visible = false;
      fruitWasVisible = false;
      updateHighScore();
    }
  }

  function checkCollisions() {
    ghosts.forEach((ghost) => {
      const distance = Math.hypot(ghost.x - pacMan.x, ghost.y - pacMan.y);
      if (distance >= TILE_SIZE * 0.6) return;
      if (ghost.frightened) {
        handleGhostEaten(ghost);
      } else {
        handleLifeLoss();
      }
    });
    checkFruitCollision();
  }

  function blinkyCruiseControl() {
    if (blinkyCruise) return;
    const remaining = maze.pelletsRemaining();
    if (remaining < 20) {
      const blinky = ghosts.find((ghost) => ghost.name === "blinky");
      if (blinky) {
        blinky.accelerate(30);
        blinkyCruise = true;
        eventBus.emit("blinkyRage", {});
      }
    }
  }

  function updateGhostDifficulty() {
    const multiplier = difficultyMultiplier();
    ghosts.forEach((ghost) => ghost.applyDifficulty(multiplier));
  }

  function checkLevelCompletion() {
    if (maze.pelletsRemaining() === 0) {
      advanceLevel();
    }
  }

  function update(delta) {
    if (stateMachine.state === GAME_STATES.PAUSED || stateMachine.state === GAME_STATES.GAME_OVER) {
      return;
    }

    if (stateMachine.state === GAME_STATES.MEMORY) {
      if (memoryActive) {
        memoryTimer -= delta;
        if (memoryTimer <= 0) {
          completeMemory();
        }
      }
      return;
    }

    if (stateMachine.state === GAME_STATES.READY) {
      stateMachine.transition(GAME_STATES.PLAYING);
      eventBus.emit("state", { state: GAME_STATES.PLAYING });
    }

    updateGhostDifficulty();
    updateMode(delta);
    updateFrightened(delta);
    blinkyCruiseControl();

    pacMan.update(delta, {
      onPellet: () => handlePellet(10, "pellet"),
      onPowerPellet: () => {
        if (powerUpsEnabled) {
          handlePellet(50, "power");
          handlePowerPellet();
        } else {
          handlePellet(10, "pellet");
        }
      },
      speedMultiplier: 1 + ghostCombo * 0.05,
    });

    if (ghostAIMode === "social" && pacMan.consumeWrapFlag()) {
      ghosts.forEach((ghost) => {
        if (ghost.markTricked()) {
          broadcastMood(ghost);
        }
      });
    }

    ghosts.forEach((ghost) => ghost.update(delta, pacMan, ghosts, { aiMode: ghostAIMode }));
    const wasVisible = fruit?.visible;
    fruit.update(delta);
    if (wasVisible && !fruit.visible && fruitWasVisible) {
      eventBus.emit("fruit", { active: false });
      fruitWasVisible = false;
    } else if (fruit?.visible) {
      fruitWasVisible = true;
    }

    checkCollisions();
    checkLevelCompletion();
    checkComboReset();
  }

  function setDirection(dir) {
    pacMan.setDirection(dir);
  }

  function togglePause() {
    if (stateMachine.state === GAME_STATES.PAUSED) {
      stateMachine.transition(GAME_STATES.PLAYING);
      eventBus.emit("state", { state: GAME_STATES.PLAYING });
    } else if (stateMachine.state !== GAME_STATES.GAME_OVER) {
      stateMachine.transition(GAME_STATES.PAUSED);
      eventBus.emit("state", { state: GAME_STATES.PAUSED });
    }
  }

  function resetGame() {
    score = 0;
    lives = 3;
    levelNumber = 1;
    ghostCombo = 0;
    ghostsEatenDuringFrightened = 0;
    memoryActive = false;
    memoryTimer = 0;
    stateMachine.transition(GAME_STATES.READY);
    maze = mazeManager.restart();
    pacMan = new Player(maze, activeTheme?.player);
    ghosts = createGhosts(maze, activeTheme, random);
    ghosts.forEach((ghost) => configureGhost(ghost));
    ghosts.forEach((ghost) => configureGhost(ghost));
    fruit = createFruit(maze);
    eventBus.emit("state", { state: GAME_STATES.READY });
    eventBus.emit("score", { score, highScore: currentHighScore });
    eventBus.emit("lives", { lives });
    eventBus.emit("level", { level: levelNumber, maze: maze.name });
    resetLevelState();
    eventBus.emit("powerUps", { enabled: powerUpsEnabled });
    eventBus.emit("ghostMode", { mode: ghostAIMode });
  }

  function completeMemory() {
    if (!memoryActive) return;
    memoryActive = false;
    memoryTimer = 0;
    stateMachine.transition(GAME_STATES.READY);
    eventBus.emit("state", { state: GAME_STATES.READY });
    eventBus.emit("memoryEnd", {});
  }

  function setPowerUpsEnabled(flag) {
    powerUpsEnabled = Boolean(flag);
    eventBus.emit("powerUps", { enabled: powerUpsEnabled });
  }

  function setGhostAIMode(mode) {
    ghostAIMode = mode;
    ghosts.forEach((ghost) => {
      ghost.setAIMode(mode);
      broadcastMood(ghost);
    });
    eventBus.emit("ghostMode", { mode });
  }

  return {
    eventBus,
    stateMachine,
    update,
    setDirection,
    togglePause,
    resetGame,
    completeMemory,
    setPowerUpsEnabled,
    setGhostAIMode,
    setTheme(theme) {
      rebuildEntities(theme);
    },
    get pacMan() {
      return pacMan;
    },
    get ghosts() {
      return ghosts;
    },
    get fruit() {
      return fruit;
    },
    get score() {
      return score;
    },
    get lives() {
      return lives;
    },
    get level() {
      return levelNumber;
    },
    snapshot() {
      return {
        state: stateMachine.state,
        score,
        lives,
        level: levelNumber,
        frightenedTimer,
        modeTimer,
        chaseMode,
        ghostCombo,
        fruitVisible: fruit?.visible ?? false,
        pelletsRemaining: maze.pelletsRemaining(),
      };
    },
  };
}
