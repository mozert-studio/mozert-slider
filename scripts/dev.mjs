// Zero-dependency dev server: builds, builds the library and the website (site/), serves it with live reload, rebuilds when src/ or site-src/ change.
// Usage: npm run dev            (PORT=3000 npm run dev to change the port)
import { createServer } from 'node:http';
import { readFileSync, existsSync, statSync, watch } from 'node:fs';
import { execFileSync } from 'node:child_process';
import { dirname, join, extname, normalize } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const port = Number(process.env.PORT) || 5173;
const types = { '.html': 'text/html; charset=utf-8', '.js': 'text/javascript; charset=utf-8', '.mjs': 'text/javascript; charset=utf-8', '.css': 'text/css; charset=utf-8', '.svg': 'image/svg+xml', '.json': 'application/json', '.png': 'image/png', '.jpg': 'image/jpeg', '.map': 'application/json' };
const clients = new Set();

function build() {
  try {
    execFileSync(process.execPath, [join(root, 'scripts', 'build.mjs')], { cwd: root, stdio: 'pipe' });
    execFileSync(process.execPath, [join(root, 'scripts', 'site.mjs')], { cwd: root, stdio: 'pipe' });
    console.log(new Date().toLocaleTimeString(), 'built');
    return true;
  } catch (e) {
    console.error('Build failed:\n' + (e.stderr || e.message));
    return false;
  }
}

build();

let timer;
['src', 'site-src'].forEach((d) => watch(join(root, d), { recursive: true }, () => {
  clearTimeout(timer);
  timer = setTimeout(() => { if (build()) clients.forEach((res) => res.write('data: reload\n\n')); }, 120);
}));

const reloadSnippet = '<script>new EventSource("/__reload").onmessage=function(){location.reload()}</script>';

createServer((req, res) => {
  const url = decodeURIComponent(req.url.split('?')[0]);
  if (url === '/__reload') {
    res.writeHead(200, { 'Content-Type': 'text/event-stream', 'Cache-Control': 'no-cache', Connection: 'keep-alive' });
    res.write('retry: 1000\n\n');
    clients.add(res);
    req.on('close', () => clients.delete(res));
    return;
  }
  let rel = normalize(url).replace(/^(\.\.[/\\])+/, '');
  let file = join(root, 'site', rel);
  if (existsSync(file) && statSync(file).isDirectory()) file = join(file, 'index.html');
  if (!file.startsWith(root) || !existsSync(file) || !statSync(file).isFile()) {
    res.writeHead(404, { 'Content-Type': 'text/plain' });
    return res.end('Not found: ' + url);
  }
  const type = types[extname(file)] || 'application/octet-stream';
  let body = readFileSync(file);
  if (type.startsWith('text/html')) body = Buffer.from(body.toString('utf8').replace('</body>', reloadSnippet + '</body>'));
  res.writeHead(200, { 'Content-Type': type, 'Cache-Control': 'no-store' });
  res.end(body);
}).listen(port, () => {
  console.log(`\n  Mozert website:  http://localhost:${port}\n  Watching src/ for changes. Press Ctrl+C to stop.\n`);
});
