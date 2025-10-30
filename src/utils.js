import { COLS, TILE_SIZE } from "./constants.js";

export function mapIndex(col, row) {
  return row * COLS + col;
}

export function clampTile(value, max) {
  return Math.max(0, Math.min(max, value));
}

export function wrapTunnelX(x, dirX, row, tunnelRows, totalWidth) {
  if (!tunnelRows.has(row) || dirX === 0) {
    return x;
  }
  if (x < -TILE_SIZE / 2 && dirX < 0) {
    return totalWidth + TILE_SIZE / 2;
  }
  if (x > totalWidth + TILE_SIZE / 2 && dirX > 0) {
    return -TILE_SIZE / 2;
  }
  return x;
}

export function createRng(seed = Date.now()) {
  let value = seed % 2147483647;
  return () => {
    value = (value * 16807) % 2147483647;
    return (value - 1) / 2147483646;
  };
}

export function lerp(a, b, t) {
  return a + (b - a) * t;
}

export function formatTime(ms) {
  return (ms / 1000).toFixed(1);
}

export function loadSetting(key, fallback) {
  try {
    const raw = localStorage.getItem(key);
    if (!raw) return fallback;
    return JSON.parse(raw);
  } catch (error) {
    console.warn("Failed to load setting", key, error);
    return fallback;
  }
}

export function saveSetting(key, value) {
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch (error) {
    console.warn("Failed to save setting", key, error);
  }
}

export function isTouchDevice() {
  if (typeof navigator === "undefined") {
    return "ontouchstart" in globalThis;
  }
  return "ontouchstart" in globalThis || navigator.maxTouchPoints > 0;
}
