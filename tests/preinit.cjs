// Before JS runs, every demo slider must already be one horizontal row (no stacked giant blocks).
const chromium = require('playwright')[process.env.BROWSER || 'chromium'];
const http = require('http'), fs = require('fs'), path = require('path');
const root = path.join(__dirname, '..', 'site');
const mime = { '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css', '.png': 'image/png' };
const srv = http.createServer((q, r) => { let f = path.join(root, decodeURIComponent(q.url.split('?')[0])); if (fs.existsSync(f) && fs.statSync(f).isDirectory()) f = path.join(f, 'index.html'); if (!fs.existsSync(f)) { r.statusCode = 404; return r.end(); } r.setHeader('content-type', mime[path.extname(f)] || 'application/octet-stream'); r.end(fs.readFileSync(f)); });
let fail = 0; const ok = (c, m, x) => { console.log((c ? 'ok   ' : 'FAIL ') + m, c ? '' : JSON.stringify(x)); if (!c) fail++; };
(async () => {
  await new Promise((r) => srv.listen(0, r)); const port = srv.address().port;
  const b = await chromium.launch();
  for (const pg of ['examples/', '']) for (const w of [1280, 390]) {
    const ctx = await b.newContext({ viewport: { width: w, height: 800 }, javaScriptEnabled: false });
    const p = await ctx.newPage(); await p.goto(`http://localhost:${port}/${pg}`);
    const r = await p.evaluate(() => [...document.querySelectorAll('.mozert-pre')].map((e) => { const k = [...e.children]; const a = k[0].getBoundingClientRect(), c = k[1] && k[1].getBoundingClientRect(); return { id: e.id, n: k.length, row: !c || Math.abs(a.top - c.top) < 2, h: Math.round(e.getBoundingClientRect().height) }; }));
    ok(r.length > (pg ? 15 : 0), `/${pg} ${w}px: pre-init sliders found`, r.length);
    ok(r.every((x) => x.row), `/${pg} ${w}px: all pre-init sliders are one row`, r.filter((x) => !x.row));
    await ctx.close();
    const c2 = await b.newContext({ viewport: { width: w, height: 800 } }); const q = await c2.newPage(); await q.goto(`http://localhost:${port}/${pg}`); await q.waitForTimeout(1200);
    const post = await q.evaluate((ids) => Object.fromEntries(ids.map((i) => [i, Math.round((document.querySelector('#' + i + ' .mozert-list') || document.getElementById(i)).getBoundingClientRect().height)])), r.map((x) => x.id));
    const bad = r.filter((x) => post[x.id] && Math.abs(post[x.id] - x.h) > Math.max(60, post[x.id] * 0.35)).map((x) => ({ id: x.id, pre: x.h, post: post[x.id] }));
    ok(bad.length === 0, `/${pg} ${w}px: pre-init height close to initialised height`, bad);
    await c2.close();
  }
  await b.close(); srv.close(); console.log(fail ? 'FAILED' : 'preinit OK'); process.exit(fail ? 1 : 0);
})();
