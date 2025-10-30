import { spawn } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import path from 'node:path';
import { mkdir, writeFile } from 'node:fs/promises';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const projectRoot = path.resolve(__dirname, '..');
const telemetryDir = path.join(projectRoot, 'artifacts', 'telemetry');

async function resolveElectronBinary() {
  try {
    const electronModule = await import('electron');
    return electronModule.default ?? electronModule;
  } catch (error) {
    if (process.env.ELECTRON_SMOKE_REQUIRED === '1') {
      console.error('Electron binary is required for smoke tests but was not found.');
      throw error;
    }
    console.warn('Electron not installed. Skipping smoke test.');
    process.exit(0);
  }
}

async function runSmokeTest() {
  const electronBinary = await resolveElectronBinary();
  const electronArgs = [
    '--headless',
    '--disable-gpu',
    '--no-sandbox',
    path.join(projectRoot, 'electron', 'main.js'),
  ];

  const startHr = process.hrtime.bigint();
  const startTime = Date.now();
  const telemetry = {
    startTime,
    args: electronArgs,
    ready: false,
    exitCode: null,
    events: [],
    logs: [],
  };

  const child = spawn(
    electronBinary,
    electronArgs,
    {
      stdio: ['ignore', 'pipe', 'pipe'],
      env: {
        ...process.env,
        ELECTRON_ENABLE_LOGGING: '1',
        ELECTRON_SMOKE_TEST: '1',
        ELECTRON_NO_ATTACH_CONSOLE: '1',
      },
    },
  );

  const parseLine = (line) => {
    if (!line) return;
    if (line.includes('SMOKE_TEST:READY')) {
      telemetry.ready = true;
      telemetry.readyTimestamp = Date.now();
    }
    const match = line.match(/^SMOKE_TEST:EVENT:(.+)$/);
    if (match) {
      try {
        telemetry.events.push(JSON.parse(match[1]));
      } catch (error) {
        telemetry.events.push({ event: 'parse-error', message: error.message, raw: match[1] });
      }
    }
  };

  await new Promise((resolve, reject) => {
    child.stdout.on('data', (chunk) => {
      const text = chunk.toString();
      process.stdout.write(text);
      telemetry.logs.push({ stream: 'stdout', text, ts: Date.now() });
      text.split(/\r?\n/).forEach(parseLine);
    });

    child.stderr.on('data', (chunk) => {
      const text = chunk.toString();
      process.stderr.write(text);
      telemetry.logs.push({ stream: 'stderr', text, ts: Date.now() });
    });

    child.on('exit', (code) => {
      telemetry.exitCode = code;
      resolve();
    });

    child.on('error', (error) => {
      telemetry.logs.push({ stream: 'process', text: error.message, ts: Date.now() });
      reject(error);
    });
  });

  telemetry.durationMs = Number(process.hrtime.bigint() - startHr) / 1e6;

  await mkdir(telemetryDir, { recursive: true });
  const telemetryPath = path.join(telemetryDir, `electron-smoke-${startTime}.json`);
  await writeFile(telemetryPath, JSON.stringify(telemetry, null, 2), 'utf8');
  console.log(`Smoke telemetry written to ${telemetryPath}`);

  if (telemetry.exitCode !== 0) {
    throw new Error(`Electron exited with code ${telemetry.exitCode}`);
  }

  if (!telemetry.ready) {
    throw new Error('Electron exited before signalling readiness.');
  }

  console.log('Electron smoke test completed successfully.');
}

runSmokeTest().catch((error) => {
  console.error('Electron smoke test failed:', error);
  process.exit(1);
});
