import { COLS, ROWS, TILE_SIZE } from "./constants.js";
import { MAZE_VARIANTS } from "./layout.js";
import { mapIndex } from "./utils.js";

function analyzeTunnelRows(layout) {
  const rows = new Set();
  layout.forEach((row, rowIndex) => {
    if (row.includes("  ")) {
      rows.add(rowIndex);
    }
  });
  return rows;
}

function createMazeFromLayout(layout) {
  const pelletSet = new Set();
  const powerPelletSet = new Set();
  const walls = new Set();
  const fruitTiles = [];

  layout.forEach((row, rowIndex) => {
    [...row].forEach((char, colIndex) => {
      const index = mapIndex(colIndex, rowIndex);
      switch (char) {
        case "#":
          walls.add(index);
          break;
        case ".":
          pelletSet.add(index);
          break;
        case "o":
          powerPelletSet.add(index);
          break;
        case "f":
          pelletSet.add(index);
          fruitTiles.push({ col: colIndex, row: rowIndex });
          break;
        default:
          break;
      }
    });
  });

  return { pelletSet, powerPelletSet, walls, fruitTiles };
}

export function createMazeManager() {
  const variantCount = MAZE_VARIANTS.length;
  let variantIndex = 0;

  function buildVariant(index) {
    const variant = MAZE_VARIANTS[index % variantCount];
    const { layout } = variant;
    const { pelletSet, powerPelletSet, walls, fruitTiles } = createMazeFromLayout(
      layout,
    );
    const tunnelRows = analyzeTunnelRows(layout);
    let version = 0;

    function populate() {
      pelletSet.clear();
      powerPelletSet.clear();
      walls.clear();
      const created = createMazeFromLayout(layout);
      created.pelletSet.forEach((value) => pelletSet.add(value));
      created.powerPelletSet.forEach((value) => powerPelletSet.add(value));
      created.walls.forEach((value) => walls.add(value));
      fruitTiles.length = 0;
      created.fruitTiles.forEach((tile) => fruitTiles.push(tile));
      version += 1;
    }

    populate();

    return {
      name: variant.name,
      layout,
      pelletSet,
      powerPelletSet,
      walls,
      fruitTiles,
      tunnelRows,
      get version() {
        return version;
      },
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
          version += 1;
          return "pellet";
        }
        if (powerPelletSet.delete(index)) {
          version += 1;
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

  let currentMaze = buildVariant(variantIndex);

  return {
    get maze() {
      return currentMaze;
    },
    advance() {
      variantIndex = (variantIndex + 1) % variantCount;
      currentMaze = buildVariant(variantIndex);
      return currentMaze;
    },
    reset() {
      currentMaze.reset();
    },
    restart() {
      variantIndex = 0;
      currentMaze = buildVariant(variantIndex);
      return currentMaze;
    },
  };
}
