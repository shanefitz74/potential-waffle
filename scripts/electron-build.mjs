import { fileURLToPath } from 'node:url';
import path from 'node:path';
import { rm, mkdir, writeFile } from 'node:fs/promises';

import { buildProject } from './build.mjs';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const projectRoot = path.resolve(__dirname, '..');
const releaseDir = path.join(projectRoot, 'release');

async function writePlaceholder(name, message) {
  const target = path.join(releaseDir, name);
  await mkdir(path.dirname(target), { recursive: true });
  await writeFile(target, `${message}\n`, 'utf8');
}

async function main() {
  await buildProject();
  await rm(releaseDir, { recursive: true, force: true });
  await mkdir(releaseDir, { recursive: true });

  const notice = [
    'This placeholder package was generated without electron-builder.',
    'Install the optional electron tooling to produce real installers.',
    'The dist/ directory now contains the browser build used for packaging.',
  ].join('\n');

  await Promise.all([
    writePlaceholder('mac/Pac-Man-Redux.dmg.txt', notice),
    writePlaceholder('win/Pac-Man-Redux.nsis.txt', notice),
    writePlaceholder('linux/Pac-Man-Redux.AppImage.txt', notice),
  ]);

  console.log('Created placeholder desktop artifacts in', releaseDir);
}

main().catch((error) => {
  console.error('Electron build placeholder failed', error);
  process.exitCode = 1;
});
