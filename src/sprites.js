import { TILE_SIZE, SPRITE_SKINS } from "./constants.js";

const SPRITE_SIZE = TILE_SIZE;

function createCanvas(size = SPRITE_SIZE) {
  if (typeof document === "undefined") return null;
  const canvas = document.createElement("canvas");
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext?.("2d");
  if (!ctx) return null;
  ctx.translate(size / 2, size / 2);
  return { canvas, ctx };
}

function buildPacFrames(color) {
  const frames = [];
  for (let i = 0; i < 3; i += 1) {
    const entry = createCanvas();
    if (!entry) return null;
    const { canvas, ctx } = entry;
    const mouth = (i / 2) * (Math.PI / 3);
    ctx.fillStyle = color;
    ctx.beginPath();
    ctx.moveTo(0, 0);
    ctx.arc(0, 0, SPRITE_SIZE / 2 - 1, mouth, Math.PI * 2 - mouth);
    ctx.closePath();
    ctx.fill();
    frames.push(canvas);
  }
  return frames;
}

function buildGhostFrames(color) {
  const frames = [];
  for (let i = 0; i < 2; i += 1) {
    const entry = createCanvas();
    if (!entry) return null;
    const { canvas, ctx } = entry;
    ctx.fillStyle = color;
    ctx.beginPath();
    ctx.moveTo(-SPRITE_SIZE / 2, SPRITE_SIZE / 2);
    ctx.lineTo(-SPRITE_SIZE / 2, 0);
    ctx.quadraticCurveTo(0, -SPRITE_SIZE / 2, SPRITE_SIZE / 2, 0);
    ctx.lineTo(SPRITE_SIZE / 2, SPRITE_SIZE / 2);
    const waveHeight = SPRITE_SIZE / 6;
    for (let w = -2; w <= 2; w += 1) {
      const x = (w / 2) * (SPRITE_SIZE / 2);
      const y = SPRITE_SIZE / 2 - (w % 2 === i ? waveHeight : 0);
      ctx.lineTo(x, y);
    }
    ctx.closePath();
    ctx.fill();
    frames.push(canvas);
  }
  return frames;
}

function buildFrightenedFrames() {
  return buildGhostFrames("#1e90ff");
}

function drawEyes(ctx, dir, frightened) {
  ctx.save();
  ctx.translate(SPRITE_SIZE / 2, SPRITE_SIZE / 2);
  ctx.fillStyle = frightened ? "#fff" : "#fff";
  ctx.beginPath();
  ctx.arc(-4, -4, 4, 0, Math.PI * 2);
  ctx.arc(4, -4, 4, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = frightened ? "#000" : "#0000aa";
  ctx.beginPath();
  ctx.arc(-4 + dir.x * 2, -4 + dir.y * 2, 2, 0, Math.PI * 2);
  ctx.arc(4 + dir.x * 2, -4 + dir.y * 2, 2, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();
}

const DEFAULT_PAC_COLOR = "#ffcc00";
const DEFAULT_GHOST_COLOR = "#ffffff";

export function createSpriteSet({ skinId } = {}) {
  const canvas = typeof document !== "undefined" ? document.createElement("canvas") : null;
  const supportsSprites = Boolean(canvas?.getContext?.("2d"));
  if (!supportsSprites) {
    return {
      supported: false,
      setSkin() {},
      drawPac() {
        return false;
      },
      drawGhost() {
        return false;
      },
      drawFruit() {},
    };
  }

  let pacFrames = buildPacFrames(DEFAULT_PAC_COLOR) ?? [];
  const frightenedFrames = buildFrightenedFrames();
  const ghostFrameCache = new Map();
  let activeSkin = skinId ? SPRITE_SKINS[skinId] ?? SPRITE_SKINS.default : SPRITE_SKINS.default;
  let ghostPalette = { ...(activeSkin.ghostPalette ?? {}) };

  function configureSkin(skin) {
    activeSkin = skin ?? SPRITE_SKINS.default;
    ghostPalette = { ...(activeSkin.ghostPalette ?? {}) };
    pacFrames = buildPacFrames(activeSkin.pacColor ?? DEFAULT_PAC_COLOR) ?? [];
    ghostFrameCache.clear();
  }

  configureSkin(activeSkin);

  function getGhostFrames(color) {
    const resolved = color ?? DEFAULT_GHOST_COLOR;
    if (!ghostFrameCache.has(resolved)) {
      ghostFrameCache.set(resolved, buildGhostFrames(resolved));
    }
    return ghostFrameCache.get(resolved);
  }

  function colorForGhost(ghost) {
    return ghostPalette[ghost.name] ?? ghostPalette.default ?? ghost.color ?? DEFAULT_GHOST_COLOR;
  }

  function drawPac(ctx, pacMan, time) {
    const frames = pacFrames ?? [];
    const index = Math.floor((time / 120) % frames.length);
    const frame = frames[index];
    if (!frame) return false;
    ctx.save();
    ctx.translate(pacMan.x, pacMan.y);
    const angle = Math.atan2(pacMan.facing?.y ?? 0, pacMan.facing?.x ?? 1);
    ctx.rotate(angle);
    ctx.drawImage(frame, -SPRITE_SIZE / 2, -SPRITE_SIZE / 2);
    ctx.restore();
    return true;
  }

  function drawGhost(ctx, ghost, time) {
    const frames = ghost.frightened ? frightenedFrames : getGhostFrames(colorForGhost(ghost));
    if (!frames) return false;
    const index = Math.floor((time / 180) % frames.length);
    const frame = frames[index];
    if (!frame) return false;
    ctx.save();
    ctx.translate(ghost.x - SPRITE_SIZE / 2, ghost.y - SPRITE_SIZE / 2);
    ctx.drawImage(frame, 0, 0);
    drawEyes(ctx, ghost.dir ?? { x: 1, y: 0 }, ghost.frightened);
    ctx.restore();
    return true;
  }

  function drawFruit(ctx, fruit) {
    if (!fruit?.visible) return;
    const entry = createCanvas();
    if (!entry) return;
    const { canvas: fruitCanvas, ctx: fruitCtx } = entry;
    fruitCtx.fillStyle = "#ff4d6d";
    fruitCtx.beginPath();
    fruitCtx.ellipse(0, 2, SPRITE_SIZE / 4, SPRITE_SIZE / 3, 0, 0, Math.PI * 2);
    fruitCtx.fill();
    fruitCtx.fillStyle = "#37d67a";
    fruitCtx.fillRect(-2, -SPRITE_SIZE / 6, 4, SPRITE_SIZE / 6);
    ctx.drawImage(fruitCanvas, fruit.x - SPRITE_SIZE / 2, fruit.y - SPRITE_SIZE / 2);
  }

  return {
    supported: true,
    drawPac,
    drawGhost,
    drawFruit,
    setSkin(nextSkinId) {
      configureSkin(nextSkinId ? SPRITE_SKINS[nextSkinId] ?? SPRITE_SKINS.default : SPRITE_SKINS.default);
    },
  };
}
