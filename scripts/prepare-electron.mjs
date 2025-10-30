import { promises as fs } from 'node:fs';
import { fileURLToPath } from 'node:url';
import path from 'node:path';
import { deflateSync } from 'node:zlib';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const projectRoot = path.resolve(__dirname, '..');
const resourcesDir = path.join(projectRoot, 'electron', 'resources');

const SIZES = [64, 128, 256, 512];
const PNG_HEADER = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);

const CRC_TABLE = (() => {
  const table = new Uint32Array(256);
  for (let n = 0; n < 256; n += 1) {
    let c = n;
    for (let k = 0; k < 8; k += 1) {
      if (c & 1) {
        c = 0xedb88320 ^ (c >>> 1);
      } else {
        c >>>= 1;
      }
    }
    table[n] = c >>> 0;
  }
  return table;
})();

function crc32(buffer) {
  let crc = 0xffffffff;
  for (let i = 0; i < buffer.length; i += 1) {
    const byte = buffer[i];
    crc = CRC_TABLE[(crc ^ byte) & 0xff] ^ (crc >>> 8);
  }
  return (crc ^ 0xffffffff) >>> 0;
}

function chunk(tag, data) {
  const type = Buffer.from(tag, 'ascii');
  const length = Buffer.alloc(4);
  length.writeUInt32BE(data.length, 0);
  const crcBuffer = Buffer.concat([type, data]);
  const crcValue = crc32(crcBuffer);
  const crc = Buffer.alloc(4);
  crc.writeUInt32BE(crcValue, 0);
  return Buffer.concat([length, type, data, crc]);
}

function createGradientPng(size) {
  const rowStride = 1 + size * 4;
  const raw = Buffer.alloc(rowStride * size);
  for (let y = 0; y < size; y += 1) {
    const rowOffset = y * rowStride;
    raw[rowOffset] = 0; // filter type none
    for (let x = 0; x < size; x += 1) {
      const t = x / (size - 1 || 1);
      const glow = y / (size - 1 || 1);
      const r = Math.round(30 + 200 * t);
      const g = Math.round(60 + 160 * glow);
      const b = Math.round(160 + 80 * (1 - t));
      const base = rowOffset + 1 + x * 4;
      raw[base] = r;
      raw[base + 1] = g;
      raw[base + 2] = b;
      raw[base + 3] = 0xff;
    }
  }
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(size, 0);
  ihdr.writeUInt32BE(size, 4);
  ihdr[8] = 8; // bit depth
  ihdr[9] = 6; // RGBA
  ihdr[10] = 0;
  ihdr[11] = 0;
  ihdr[12] = 0;
  const idat = deflateSync(raw, { level: 9 });
  return Buffer.concat([
    PNG_HEADER,
    chunk('IHDR', ihdr),
    chunk('IDAT', idat),
    chunk('IEND', Buffer.alloc(0)),
  ]);
}

async function writeIcon(size) {
  const png = createGradientPng(size);
  const target = path.join(resourcesDir, `icon-${size}.png`);
  await fs.mkdir(path.dirname(target), { recursive: true });
  await fs.writeFile(target, png);
  return target;
}

export async function prepareElectronAssets() {
  await fs.mkdir(resourcesDir, { recursive: true });
  let largest = '';
  for (const size of SIZES) {
    const file = await writeIcon(size);
    largest = file;
  }
  if (largest) {
    await fs.copyFile(largest, path.join(resourcesDir, 'icon.png'));
  }
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  prepareElectronAssets().catch((error) => {
    console.error('Failed to prepare Electron assets', error);
    process.exitCode = 1;
  });
}
