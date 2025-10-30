import { COLS, ROWS, TILE_SIZE } from "./constants.js";
import { mapIndex } from "./utils.js";
import { LEVEL_LAYOUT } from "./layout.js";

export function createLevel(layout = LEVEL_LAYOUT) {
  const pelletSet = new Set();
  const powerPelletSet = new Set();
  const walls = new Set();

  function populate() {
    pelletSet.clear();
    powerPelletSet.clear();
    walls.clear();

    for (let row = 0; row < ROWS; row += 1) {
      for (let col = 0; col < COLS; col += 1) {
        const char = layout[row][col];
        const index = mapIndex(col, row);
        if (char === "#") {
          walls.add(index);
        } else if (char === ".") {
          pelletSet.add(index);
        } else if (char === "o") {
          powerPelletSet.add(index);
        }
      }
    }
  }

  populate();

  return {
    layout,
    pelletSet,
    powerPelletSet,
    walls,
    reset: populate,
    isWall(col, row) {
      if (col < 0 || col >= COLS || row < 0 || row >= ROWS) {
        return true;
      }
      return walls.has(mapIndex(col, row));
    },
    consume(col, row) {
      const index = mapIndex(col, row);
      if (pelletSet.delete(index)) {
        return "pellet";
      }
      if (powerPelletSet.delete(index)) {
        return "power";
      }
      return null;
    },
    pelletsRemaining() {
      return pelletSet.size + powerPelletSet.size;
    },
    tileCenter(col, row) {
      return {
        x: col * TILE_SIZE + TILE_SIZE / 2,
        y: row * TILE_SIZE + TILE_SIZE / 2,
      };
    },
    totalWidth: COLS * TILE_SIZE,
    totalHeight: ROWS * TILE_SIZE,
  };
}
