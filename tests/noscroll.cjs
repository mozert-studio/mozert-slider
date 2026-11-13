// The page must never be wider than the screen, even in browsers that ignore overflow-x:clip.
const chromium = require('playwright')[process.env.BROWSER || 'chromium'];
const http = require('http'), fs = require('fs'), path = require('path');
const root = path.join(__dirname, '..', 'site');
const mime = { '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css', '.svg': 'image/svg+xml', '.png': 'image/png' };
const srv = http.createServer((q, r) => { let f = path.join(root, decodeURIComponent(q.url.split('?')[0])); if (fs.existsSync(f) && fs.statSync(f).isDirectory()) f = path.join(f, 'index.html'); if (!fs.existsSync(f)) { r.statusCode = 404; return r.end(); } r.setHeader('content-type', mime[path.extname(f)] || 'application/octet-stream'); r.end(fs.readFileSync(f)); });
let fail = 0; const ok = (c, m, x) => { console.log((c ? 'ok   ' : 'FAIL ') + m, c ? '' : JSON.stringify(x)); if (!c) fail++; };
(async () => {
  await new Promise((r) => srv.listen(0, r)); const base = `http://localhost:${srv.address().port}/`;
  const b = await chromium.launch();
  for (const w of [320, 390, 768]) {
    const p = await b.newPage({ viewport: { width: w, height: 800 } });
    for (const pg of ['', 'features', 'examples', 'docs', 'installation', 'api', 'blog', 'changelog']) {
      await p.goto(base + (pg ? pg + '/' : '')); await p.waitForTimeout(900);
      const cats = pg === 'examples' ? ['all', 'basics', 'effects', 'galleries', 'controls', 'advanced'] : [null];
      for (const k of cats) {
        if (k) { await p.click(`#cats button[data-cat=${k}]`); await p.waitForTimeout(400); }
        await p.evaluate(async () => { const h = document.documentElement.scrollHeight; for (let y = 0; y < h; y += 700) { scrollTo({ top: y, behavior: 'instant' }); await new Promise((r) => setTimeout(r, 30)); } scrollTo({ top: 0, behavior: 'instant' }); });
        const r = await p.evaluate(() => {
          // simulate a browser without overflow:clip
          document.documentElement.style.setProperty('overflow-x', 'visible', 'important'); document.body.style.setProperty('overflow-x', 'visible', 'important');
          const vw = document.documentElement.clientWidth, sw = document.documentElement.scrollWidth;
          const out = [...document.querySelectorAll('body *')].filter((e) => { const cs = getComputedStyle(e); if (cs.position === 'fixed' || cs.display === 'none' || e.closest('[hidden], details:not([open]), pre, .tw, .cats')) return false; const r = e.getBoundingClientRect(); return r.width > 0 && r.right > vw + 1 && !e.closest('.mozert-list,.mozert-track'); }).slice(0, 3).map((e) => e.tagName + '.' + String(e.className).slice(0, 25) + ' r=' + Math.round(e.getBoundingClientRect().right));
          return { vw, sw, out };
        });
        ok(r.sw <= r.vw + 1, `${w}px /${pg}${k ? ' [' + k + ']' : ''}: no sideways overflow even without clip`, r);
      }
    }
    await p.close();
  }
  await b.close(); srv.close(); console.log(fail ? 'FAILED' : 'noscroll OK'); process.exit(fail ? 1 : 0);
})();
