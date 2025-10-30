import { spawn } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const projectRoot = path.resolve(__dirname, '..');

async function ensurePlaywright() {
  try {
    await import('@playwright/test');
    return true;
  } catch (error) {
    if (process.env.PLAYWRIGHT_REQUIRED === '1') {
      throw error;
    }
    console.warn('Playwright is not installed. Skipping end-to-end tests.');
    return false;
  }
}

async function runPlaywright() {
  const available = await ensurePlaywright();
  if (!available) {
    return;
  }

  await new Promise((resolve, reject) => {
    const bin = process.platform === 'win32' ? 'npx.cmd' : 'npx';
    const child = spawn(bin, ['playwright', 'test'], {
      stdio: 'inherit',
      cwd: projectRoot,
      env: { ...process.env },
    });
    child.on('exit', (code) => {
      if (code === 0) {
        resolve();
      } else {
        reject(new Error(`Playwright exited with code ${code}`));
      }
    });
    child.on('error', reject);
  });
}

runPlaywright().catch((error) => {
  console.error('Playwright tests failed:', error);
  process.exit(1);
});
