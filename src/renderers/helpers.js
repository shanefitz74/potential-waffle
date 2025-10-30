import { TILE_SIZE, COLS } from "../constants.js";

export function createBufferCanvas(canvas) {
  if (typeof OffscreenCanvas === "function") {
    return new OffscreenCanvas(canvas.width, canvas.height);
  }
  const doc = canvas.ownerDocument ?? (typeof document !== "undefined" ? document : null);
  if (doc?.createElement) {
    const buffer = doc.createElement("canvas");
    buffer.width = canvas.width;
    buffer.height = canvas.height;
    return buffer;
  }
  const clone = Object.create(canvas);
  clone.getContext = () => canvas.getContext("2d");
  return clone;
}

export function withGlow(ctx, color, blur, drawFn) {
  ctx.save();
  const { shadowColor, shadowBlur } = ctx;
  ctx.shadowColor = color;
  ctx.shadowBlur = blur;
  drawFn();
  ctx.shadowColor = shadowColor;
  ctx.shadowBlur = shadowBlur;
  ctx.restore();
}

export function withAdditive(ctx, drawFn) {
  ctx.save();
  const previous = ctx.globalCompositeOperation;
  ctx.globalCompositeOperation = "lighter";
  drawFn();
  ctx.globalCompositeOperation = previous;
  ctx.restore();
}

export function drawByte(ctx, x, y, size, phase = 0, dir = { x: 1, y: 0 }) {
  const radius = (size * 0.9) / 2;
  const mouthSwing = Math.abs(Math.sin(phase)) * Math.PI * 0.18 + Math.PI * 0.12;
  const facingAngle = Math.atan2(dir?.y ?? 0, dir?.x ?? 1);
  const trailMagnitude = Math.hypot(dir?.x ?? 0, dir?.y ?? 0);

  ctx.save();
  ctx.translate(x, y);

  if (trailMagnitude > 0.01) {
    for (let i = 1; i <= 3; i += 1) {
      const falloff = 0.22 * i;
      const alpha = 0.22 - i * 0.05;
      const trailX = -(dir.x ?? 0) * size * falloff;
      const trailY = -(dir.y ?? 0) * size * falloff;
      withAdditive(ctx, () => {
        withGlow(ctx, `rgba(80, 200, 255, ${0.4 - i * 0.06})`, size * 0.4, () => {
          ctx.beginPath();
          ctx.fillStyle = `rgba(48, 160, 255, ${alpha})`;
          ctx.arc(trailX, trailY, radius * (0.65 - i * 0.12), 0, Math.PI * 2);
          ctx.fill();
        });
      });
    }
  }

  withAdditive(ctx, () => {
    withGlow(ctx, "rgba(72, 200, 255, 0.65)", size * 0.55, () => {
      ctx.beginPath();
      ctx.fillStyle = "rgba(32, 120, 255, 0.18)";
      ctx.arc(0, 0, radius * 1.45, 0, Math.PI * 2);
      ctx.fill();
    });
  });

  withGlow(ctx, "rgba(140, 230, 255, 0.6)", size * 0.32, () => {
    const aura = ctx.createRadialGradient(0, 0, radius * 0.15, 0, 0, radius * 1.2);
    aura.addColorStop(0, "rgba(220, 255, 255, 0.95)");
    aura.addColorStop(0.45, "rgba(120, 220, 255, 0.85)");
    aura.addColorStop(1, "rgba(24, 64, 180, 0.05)");
    ctx.beginPath();
    ctx.fillStyle = aura;
    ctx.arc(0, 0, radius * 1.2, 0, Math.PI * 2);
    ctx.fill();
  });

  ctx.rotate(facingAngle);

  const shell = ctx.createLinearGradient(-radius, -radius, radius, radius);
  shell.addColorStop(0, "rgba(26, 110, 255, 0.85)");
  shell.addColorStop(0.55, "rgba(160, 240, 255, 0.95)");
  shell.addColorStop(1, "rgba(38, 140, 255, 0.85)");
  ctx.fillStyle = shell;
  ctx.beginPath();
  ctx.moveTo(0, 0);
  ctx.arc(0, 0, radius, mouthSwing, Math.PI * 2 - mouthSwing);
  ctx.closePath();
  ctx.fill();

  const core = ctx.createRadialGradient(-radius * 0.1, 0, radius * 0.05, 0, 0, radius * 0.65);
  core.addColorStop(0, "rgba(240, 255, 255, 0.95)");
  core.addColorStop(0.5, "rgba(160, 235, 255, 0.85)");
  core.addColorStop(1, "rgba(40, 140, 255, 0.3)");
  ctx.beginPath();
  ctx.fillStyle = core;
  ctx.arc(-radius * 0.05, 0, radius * 0.55, 0, Math.PI * 2);
  ctx.fill();

  ctx.strokeStyle = "rgba(200, 250, 255, 0.85)";
  ctx.lineWidth = radius * 0.18;
  ctx.lineCap = "round";
  ctx.beginPath();
  ctx.moveTo(radius * 0.18, 0);
  ctx.lineTo(radius * 0.78, 0);
  ctx.stroke();

  ctx.restore();
}

function drawStaticWraith(ctx, size, t) {
  const radius = size * 0.45;
  const flicker = 0.55 + 0.25 * Math.sin(t / 90);
  withAdditive(ctx, () => {
    withGlow(ctx, "rgba(174, 92, 255, 0.75)", size * 0.6, () => {
      const gradient = ctx.createRadialGradient(0, 0, radius * 0.25, 0, 0, radius);
      gradient.addColorStop(0, "rgba(215, 200, 255, 0.95)");
      gradient.addColorStop(0.6, `rgba(168, 88, 255, ${flicker})`);
      gradient.addColorStop(1, "rgba(40, 0, 80, 0.05)");
      ctx.beginPath();
      ctx.fillStyle = gradient;
      ctx.arc(0, 0, radius, 0, Math.PI * 2);
      ctx.fill();
    });
  });

  ctx.strokeStyle = "rgba(255, 255, 255, 0.25)";
  ctx.lineWidth = 1.2;
  for (let i = 0; i < 6; i += 1) {
    const noise = Math.sin(t / 45 + i * 1.7) * radius * 0.7;
    ctx.beginPath();
    ctx.moveTo(-radius * 0.9, noise);
    ctx.lineTo(radius * 0.9, -noise);
    ctx.stroke();
  }
}

function drawNeonPhantom(ctx, size, t) {
  const radius = size * 0.46;
  const pulse = 0.6 + 0.2 * Math.sin(t / 80);
  ctx.globalAlpha = 0.65;
  withGlow(ctx, "rgba(255, 79, 225, 0.8)", size * 0.6, () => {
    ctx.beginPath();
    ctx.fillStyle = `rgba(255, 79, 225, ${pulse})`;
    ctx.arc(0, 0, radius, 0, Math.PI * 2);
    ctx.fill();
  });
  ctx.globalAlpha = 1;
  ctx.strokeStyle = "rgba(255, 149, 245, 0.9)";
  ctx.lineWidth = 3;
  ctx.beginPath();
  ctx.arc(0, 0, radius * (0.95 + Math.sin(t / 150) * 0.02), 0, Math.PI * 2);
  ctx.stroke();
}

function drawCrystallineShard(ctx, size, t) {
  const radius = size * 0.5;
  const shards = 6;
  const wiggle = Math.sin(t / 120) * radius * 0.12;
  withAdditive(ctx, () => {
    withGlow(ctx, "rgba(74, 228, 255, 0.8)", size * 0.45, () => {
      ctx.beginPath();
      for (let i = 0; i < shards; i += 1) {
        const angle = (Math.PI * 2 * i) / shards;
        const r = radius * (0.6 + (i % 2 === 0 ? 0.22 : -0.12));
        const px = Math.cos(angle) * (r + wiggle);
        const py = Math.sin(angle) * (r + wiggle);
        if (i === 0) ctx.moveTo(px, py);
        else ctx.lineTo(px, py);
      }
      ctx.closePath();
      const fill = ctx.createLinearGradient(-radius, -radius, radius, radius);
      fill.addColorStop(0, "rgba(140, 250, 255, 0.9)");
      fill.addColorStop(1, "rgba(60, 170, 255, 0.7)");
      ctx.fillStyle = fill;
      ctx.fill();
    });
  });
  ctx.strokeStyle = "rgba(220, 255, 255, 0.7)";
  ctx.lineWidth = 1.2;
  ctx.beginPath();
  ctx.moveTo(0, -radius * 0.4);
  ctx.lineTo(0, radius * 0.4);
  ctx.moveTo(-radius * 0.35, 0);
  ctx.lineTo(radius * 0.35, 0);
  ctx.stroke();
}

function drawInfernoBug(ctx, size, t) {
  const radius = size * 0.44;
  withAdditive(ctx, () => {
    withGlow(ctx, "rgba(255, 120, 32, 0.85)", size * 0.55, () => {
      ctx.beginPath();
      ctx.fillStyle = `rgba(255, 120, 32, ${0.55 + 0.25 * Math.sin(t / 130)})`;
      ctx.arc(0, 0, radius, 0, Math.PI * 2);
      ctx.fill();
    });
  });
  ctx.fillStyle = "rgba(255, 200, 120, 0.85)";
  ctx.beginPath();
  ctx.ellipse(0, 0, radius * 0.7, radius * (0.5 + Math.sin(t / 160) * 0.08), 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.strokeStyle = "rgba(255, 188, 80, 0.8)";
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(-radius * 0.75, 0);
  ctx.quadraticCurveTo(0, radius * (0.9 + 0.1 * Math.sin(t / 90)), radius * 0.75, 0);
  ctx.stroke();
}

export function drawGlitch(ctx, x, y, size, type, t) {
  ctx.save();
  ctx.translate(x, y);
  switch (type) {
    case "neon":
      drawNeonPhantom(ctx, size, t);
      break;
    case "crystal":
      drawCrystallineShard(ctx, size, t);
      break;
    case "inferno":
      drawInfernoBug(ctx, size, t);
      break;
    default:
      drawStaticWraith(ctx, size, t);
      break;
  }
  ctx.restore();
}

export function drawEnergyNode(ctx, x, y) {
  withAdditive(ctx, () => {
    withGlow(ctx, "rgba(255, 220, 120, 0.8)", TILE_SIZE * 0.6, () => {
      ctx.beginPath();
      ctx.fillStyle = "rgba(255, 215, 120, 0.95)";
      ctx.arc(x, y, TILE_SIZE * 0.14, 0, Math.PI * 2);
      ctx.fill();
    });
  });
}

export function drawOverclockCore(ctx, x, y, t) {
  withAdditive(ctx, () => {
    const pulse = 0.8 + 0.15 * Math.sin(t / 320);
    withGlow(ctx, "rgba(180, 255, 255, 0.8)", TILE_SIZE * 0.9, () => {
      ctx.beginPath();
      ctx.fillStyle = `rgba(120, 235, 255, ${pulse})`;
      ctx.arc(x, y, TILE_SIZE * 0.25, 0, Math.PI * 2);
      ctx.fill();
    });
  });
}

export function drawMazeModern(ctx, maze, theme) {
  ctx.fillStyle = theme.walls.fill ?? "#000";
  ctx.fillRect(0, 0, maze.totalWidth, maze.totalHeight);
  ctx.strokeStyle = theme.walls.stroke ?? "#0ff";
  ctx.lineWidth = 2;
  ctx.shadowBlur = 0;
  withAdditive(ctx, () => {
    ctx.shadowBlur = TILE_SIZE * 0.4;
    ctx.shadowColor = theme.walls.glow ?? "rgba(0, 255, 255, 0.4)";
    ctx.beginPath();
    maze.walls.forEach((index) => {
      const col = index % COLS;
      const row = Math.floor(index / COLS);
      ctx.rect(col * TILE_SIZE, row * TILE_SIZE, TILE_SIZE, TILE_SIZE);
    });
    ctx.stroke();
  });
}
