import { build } from 'esbuild';
import { mkdir, rm, readFile, writeFile, copyFile, access } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const projectRoot = path.resolve(__dirname, '..');
const distDir = path.join(projectRoot, 'dist');
const assetsDir = path.join(distDir, 'assets');

async function ensureDir(dir) {
  await mkdir(dir, { recursive: true });
}

async function copyIfExists(source, target) {
  try {
    await access(source);
    await ensureDir(path.dirname(target));
    await copyFile(source, target);
  } catch (error) {
    if (error.code !== 'ENOENT') {
      throw error;
    }
  }
}

async function rewriteHtmlForBundle(html) {
  const modulePattern = /<script[^>]*src=["']\.\/src\/main\.js["'][^>]*><\/script>/;
  if (modulePattern.test(html)) {
    return html.replace(
      modulePattern,
      '  <script type="module" src="./assets/game.js"></script>'
    );
  }
  const scriptPattern = /<script>[\s\S]*?<\/script>/;
  if (scriptPattern.test(html)) {
    return html.replace(
      scriptPattern,
      '  <script type="module" src="./assets/game.js"></script>'
    );
  }
  if (html.includes('</body>')) {
    return html.replace(
      '</body>',
      '  <script type="module" src="./assets/game.js"></script>\n</body>'
    );
  }
  return `${html}\n<script type="module" src="./assets/game.js"></script>`;
}

async function main() {
  await rm(distDir, { recursive: true, force: true });
  await ensureDir(assetsDir);

  await build({
    entryPoints: [path.join(projectRoot, 'src', 'main.js')],
    bundle: true,
    format: 'esm',
    sourcemap: true,
    target: 'es2018',
    outfile: path.join(assetsDir, 'game.js'),
    loader: { '.json': 'json' },
    define: {
      'process.env.NODE_ENV': '"production"',
    },
  });

  const rawHtml = await readFile(path.join(projectRoot, 'index.html'), 'utf8');
  const bundledHtml = await rewriteHtmlForBundle(rawHtml);
  await writeFile(path.join(distDir, 'index.html'), bundledHtml, 'utf8');

  await copyIfExists(path.join(projectRoot, 'style.css'), path.join(distDir, 'style.css'));
  await copyIfExists(path.join(projectRoot, 'file_00000000077c622f900034ff079a1107.png'), path.join(distDir, 'file_00000000077c622f900034ff079a1107.png'));
  await copyIfExists(path.join(projectRoot, 'file_00000000294c61fdadf2a669d884558a.png'), path.join(distDir, 'file_00000000294c61fdadf2a669d884558a.png'));
}

main().catch((error) => {
  console.error('Build failed', error);
  process.exitCode = 1;
});
