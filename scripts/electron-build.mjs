import { fileURLToPath } from 'node:url';
import path from 'node:path';
import { rm, mkdir, writeFile } from 'node:fs/promises';

import { buildProject } from './build.mjs';
import { prepareElectronAssets } from './prepare-electron.mjs';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const projectRoot = path.resolve(__dirname, '..');
const releaseDir = path.join(projectRoot, 'release');

const STRICT_BUILD = process.env.CI === 'true' || process.env.ELECTRON_BUILD_STRICT === '1';

async function ensureReleaseDir() {
  await rm(releaseDir, { recursive: true, force: true });
  await mkdir(releaseDir, { recursive: true });
}

async function writePlaceholder(name, message) {
  const target = path.join(releaseDir, name);
  await mkdir(path.dirname(target), { recursive: true });
  await writeFile(target, `${message}\n`, 'utf8');
}

async function runElectronBuilder() {
  let buildFn;
  try {
    const builder = await import('electron-builder');
    buildFn = builder.build ?? builder.default?.build;
    if (typeof buildFn !== 'function') {
      throw new Error('electron-builder module does not export a build function');
    }
  } catch (error) {
    if (error.code === 'ERR_MODULE_NOT_FOUND' || error.message?.includes('Cannot find module')) {
      if (STRICT_BUILD) {
        throw new Error('electron-builder is required for packaging in CI but was not found.');
      }
      console.warn('electron-builder not installed; generating placeholder artifacts.');
      return false;
    }
    throw error;
  }

  await ensureReleaseDir();
  await buildFn({
    projectDir: projectRoot,
    config: {
      publish: 'never',
      directories: {
        output: 'release',
      },
    },
  });
  return true;
}

async function writePlaceholders() {
  await ensureReleaseDir();
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
  console.warn('Created placeholder desktop artifacts in', releaseDir);
}

async function main() {
  await buildProject();
  await prepareElectronAssets();
  const built = await runElectronBuilder();
  if (!built) {
    await writePlaceholders();
  } else {
    console.log('Electron packages created in', releaseDir);
  }
}

main().catch((error) => {
  console.error('Electron build failed', error);
  process.exitCode = 1;
});
