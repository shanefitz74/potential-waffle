import { mkdir, rm, readFile, writeFile, copyFile, readdir, stat } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const projectRoot = path.resolve(__dirname, '..');
const distDir = path.join(projectRoot, 'dist');

async function ensureDir(dir) {
  await mkdir(dir, { recursive: true });
}

async function copyFileStrict(source, target) {
  await ensureDir(path.dirname(target));
  await copyFile(source, target);
}

async function copyDir(source, target) {
  const entries = await readdir(source, { withFileTypes: true });
  await ensureDir(target);
  for (const entry of entries) {
    const srcPath = path.join(source, entry.name);
    const destPath = path.join(target, entry.name);
    if (entry.isDirectory()) {
      await copyDir(srcPath, destPath);
    } else if (entry.isFile()) {
      await copyFileStrict(srcPath, destPath);
    }
  }
}

async function rewriteIndex(html) {
  const hasModuleScript = /<script[^>]+src=["']\.\/src\/main\.js["'][^>]*><\/script>/.test(html);
  if (!hasModuleScript) {
    return html;
  }
  return html.replace(
    /<script[^>]+src=["']\.\/src\/main\.js["'][^>]*><\/script>/,
    '  <script type="module" src="./src/main.js"></script>'
  );
}

export async function buildProject() {
  await rm(distDir, { recursive: true, force: true });
  await ensureDir(distDir);

  const indexPath = path.join(projectRoot, 'index.html');
  const rawHtml = await readFile(indexPath, 'utf8');
  const rewritten = await rewriteIndex(rawHtml);
  await writeFile(path.join(distDir, 'index.html'), rewritten, 'utf8');

  const stylePath = path.join(projectRoot, 'style.css');
  try {
    await copyFileStrict(stylePath, path.join(distDir, 'style.css'));
  } catch (error) {
    if (error.code !== 'ENOENT') {
      throw error;
    }
  }

  const srcDir = path.join(projectRoot, 'src');
  try {
    await stat(srcDir);
    await copyDir(srcDir, path.join(distDir, 'src'));
  } catch (error) {
    if (error.code !== 'ENOENT') {
      throw error;
    }
  }

  const assetFiles = [
    'file_00000000077c622f900034ff079a1107.png',
    'file_00000000294c61fdadf2a669d884558a.png',
  ];

  await Promise.all(
    assetFiles.map(async (file) => {
      const source = path.join(projectRoot, file);
      try {
        await copyFileStrict(source, path.join(distDir, file));
      } catch (error) {
        if (error.code !== 'ENOENT') {
          throw error;
        }
      }
    })
  );
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  buildProject().catch((error) => {
    console.error('Build failed', error);
    process.exitCode = 1;
  });
}
