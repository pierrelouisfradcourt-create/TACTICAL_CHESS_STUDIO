import http from 'node:http';
import { readFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const PORT = Number(process.env.PORT) || 3000;

const MIME_TYPES = {
  '.html': 'text/html',
  '.mjs': 'text/javascript',
};

const ALLOWED_MJS = new Set(['game.mjs', 'level.mjs', 'render.mjs', 'input.mjs']);

function sendError(res, statusCode, message) {
  res.writeHead(statusCode, { 'Content-Type': 'text/plain; charset=utf-8' });
  res.end(message);
}

const server = http.createServer(async (req, res) => {
  try {
    if (req.method !== 'GET' && req.method !== 'HEAD') {
      sendError(res, 405, 'Method Not Allowed');
      return;
    }

    let requestPath = decodeURIComponent((req.url || '/').split('?')[0]);
    if (requestPath === '/') {
      requestPath = '/index.html';
    }

    const fileName = path.basename(requestPath);
    const ext = path.extname(fileName);

    const isIndexHtml = fileName === 'index.html' && ext === '.html';
    const isAllowedMjs = ext === '.mjs' && ALLOWED_MJS.has(fileName);

    if (!isIndexHtml && !isAllowedMjs) {
      sendError(res, 404, 'Not Found');
      return;
    }

    const filePath = path.join(__dirname, fileName);

    let data;
    try {
      data = await readFile(filePath);
    } catch (err) {
      if (err && err.code === 'ENOENT') {
        sendError(res, 404, 'Not Found');
      } else {
        sendError(res, 500, 'Internal Server Error');
      }
      return;
    }

    res.writeHead(200, { 'Content-Type': MIME_TYPES[ext] || 'application/octet-stream' });
    if (req.method === 'HEAD') {
      res.end();
    } else {
      res.end(data);
    }
  } catch (err) {
    sendError(res, 500, 'Internal Server Error');
  }
});

server.listen(PORT, () => {
  console.log(`Breakout server listening on http://localhost:${PORT}`);
});
