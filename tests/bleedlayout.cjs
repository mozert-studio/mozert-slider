// Bleed demo on the site: starts at the content edge, the rest runs off the right edge of the screen, slides leave through the
// LEFT edge of the screen (not the content edge), and the last slide stops at the content edge.
const chromium = require('playwright')[process.env.BROWSER || 'chromium'];
const http = require('http'), fs = require('fs'), path = require('path');
const root = path.join(__dirname, '..', 'site');
const mime = { html: 'text/html', js: 'text/javascript', css: 'text/css', png: 'image/png', jpg: 'image/jpeg', svg: 'image/svg+xml', webp: 'image/webp', mp4: 'video/mp4', ico: 'image/x-icon' };
const srv = http.createServer((q, r) => { let f = path.join(root, q.url.split('?')[0]); if (fs.existsSync(f) && fs.statSync(f).isDirectory()) f = path.join(f, 'index.html'); if (!fs.existsSync(f)) { r.statusCode = 404; return r.end(); } r.setHeader('content-type', mime[f.split('.').pop()] || 'application/octet-stream'); r.end(fs.readFileSync(f)); });
let fail = 0; const ok = (c, m, x) => { console.log((c ? 'ok   ' : 'FAIL ') + m, c ? '' : JSON.stringify(x)); if (!c) fail++; };
(async () => {
  await new Promise((r) => srv.listen(0, r));
  const b = await chromium.launch();
  for (const w of [1920, 1366, 1024, 390]) {
    const page = await b.newPage({ viewport: { width: w, height: 800 } });
    await page.goto(`http://localhost:${srv.address().port}/examples/`); await page.waitForTimeout(900);
    await page.locator('#d-bleed-box').scrollIntoViewIfNeeded(); await page.waitForTimeout(400);
    await page.evaluate(() => { window.S = Mozert.get('#d-bleed'); S.pause && S.pause(); });
    const m = () => page.evaluate(() => { const host = document.querySelector('#d-bleed').getBoundingClientRect(); const vis = [...document.querySelectorAll('#d-bleed-box .mozert-slide')].filter((e) => !e.classList.contains('mozert-cloned')).map((e) => e.getBoundingClientRect()).filter((s) => s.right > 0 && s.left < innerWidth); return { hl: host.left, hr: host.right, fl: vis[0].left, lr: vis[vis.length - 1].right, iw: document.documentElement.clientWidth, sw: document.documentElement.scrollWidth - document.documentElement.clientWidth }; });
    let r = await m();
    ok(Math.abs(r.fl - r.hl) <= 1, `${w}px: first slide starts at the content edge`, r);
    ok(r.lr > r.iw, `${w}px: the next slide runs off the right edge of the screen`, r);
    ok(Math.abs((r.iw - r.hr) - r.hl) <= 2, `${w}px: content edge is symmetric (left = right margin)`, r);
    for (let i = 0; i < 3; i++) { await page.evaluate(() => S.next()); await page.waitForTimeout(800); }
    r = await m();
    ok(r.fl < 0, `${w}px: slides leave through the left edge of the screen`, r);
    for (let i = 0; i < 20; i++) { await page.evaluate(() => S.next()); await page.waitForTimeout(250); }
    await page.waitForTimeout(700); r = await m();
    ok(Math.abs(r.lr - r.hr) <= 1, `${w}px: last slide stops at the content edge`, r);
    ok(r.sw <= 0, `${w}px: page does not scroll sideways`, r);
    await page.close();
  }
  await b.close(); srv.close(); console.log(fail ? 'FAILED' : 'bleedlayout OK'); process.exit(fail ? 1 : 0);
})();
