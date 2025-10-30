import http from 'http';
import { promises as fs, existsSync } from 'fs';
import path from 'path';
import { fileURLToPath, pathToFileURL, URL } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.resolve(__dirname);
const distDir = path.join(rootDir, 'dist');
const publicDir = existsSync(distDir) ? distDir : rootDir;

const mimeTypes = {
  '.html': 'text/html; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.js': 'application/javascript; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.gif': 'image/gif',
  '.svg': 'image/svg+xml',
  '.ico': 'image/x-icon',
  '.wav': 'audio/wav',
  '.mp3': 'audio/mpeg'
};

const defaultPort = Number.parseInt(process.env.PORT ?? '', 10) || 3000;

function sanitizePath(requestPath) {
  const decoded = decodeURIComponent(requestPath);
  const normalized = path.normalize(decoded).replace(/^\/+/, '');
  return normalized;
}

async function serveFile(res, filePath) {
  try {
    let targetPath = filePath;

    const stats = await fs.stat(targetPath);
    if (stats.isDirectory()) {
      targetPath = path.join(targetPath, 'index.html');
    }

    const data = await fs.readFile(targetPath);
    const ext = path.extname(targetPath).toLowerCase();
    const contentType = mimeTypes[ext] ?? 'application/octet-stream';
    res.writeHead(200, { 'Content-Type': contentType });
    res.end(data);
  } catch (error) {
    if (error.code === 'ENOENT') {
      res.writeHead(404, { 'Content-Type': 'text/plain; charset=utf-8' });
      res.end('Not found');
    } else {
      res.writeHead(500, { 'Content-Type': 'text/plain; charset=utf-8' });
      res.end('Internal server error');
      console.error(`Failed to serve ${filePath}:`, error);
    }
  }
}

export function createPacmanServer() {
  return http.createServer(async (req, res) => {
    if (!req.url) {
      res.writeHead(400, { 'Content-Type': 'text/plain; charset=utf-8' });
      res.end('Bad request');
      return;
    }

    const requestUrl = new URL(req.url, `http://${req.headers.host ?? 'localhost'}`);
    const sanitized = sanitizePath(requestUrl.pathname);
    let relativePath = sanitized;

    if (relativePath === '' || relativePath === '/') {
      relativePath = 'index.html';
    }

    const resolvedPath = path.resolve(publicDir, relativePath);

    if (!resolvedPath.startsWith(publicDir)) {
      res.writeHead(403, { 'Content-Type': 'text/plain; charset=utf-8' });
      res.end('Forbidden');
      return;
    }

    const filePath = resolvedPath;

    await serveFile(res, filePath);
  });
}

export function startServer(port = defaultPort) {
  const server = createPacmanServer();
  return new Promise((resolve) => {
    server.listen(port, () => {
      console.log(`Pac-Man server running at http://localhost:${port}`);
      resolve(server);
    });
  });
}

const isMainModule = process.argv[1] && pathToFileURL(process.argv[1]).href === import.meta.url;

if (isMainModule) {
  startServer();
}

