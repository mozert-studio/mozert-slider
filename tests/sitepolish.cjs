// Site polish: heading spacing, examples category tabs, features cards and their links, blog code wrapping.
const chromium = require('playwright')[process.env.BROWSER || 'chromium'];
const http = require('http'), fs = require('fs'), path = require('path');
const root = path.join(__dirname, '..', 'site');
const mime = { '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css', '.svg': 'image/svg+xml', '.png': 'image/png' };
const srv = http.createServer((q, r) => { let f = path.join(root, decodeURIComponent(q.url.split('?')[0])); if (fs.existsSync(f) && fs.statSync(f).isDirectory()) f = path.join(f, 'index.html'); if (!fs.existsSync(f)) { r.statusCode = 404; return r.end(); } r.setHeader('content-type', mime[path.extname(f)] || 'application/octet-stream'); r.end(fs.readFileSync(f)); });
let fail = 0; const ok = (c, m, x) => { console.log((c ? 'ok   ' : 'FAIL ') + m, c ? '' : JSON.stringify(x)); if (!c) fail++; };
(async () => {
  await new Promise((r) => srv.listen(0, r)); const base = `http://localhost:${srv.address().port}/`;
  const b = await chromium.launch();
  for (const w of [1280, 390]) {
    const p = await b.newPage({ viewport: { width: w, height: 800 } }); const errs = []; p.on('pageerror', (e) => errs.push(e.message));
    // heading spacing under the sticky header
    for (const pg of ['features', 'examples', 'docs', 'installation', 'api', 'blog', 'changelog']) {
      await p.goto(base + pg + '/'); await p.waitForTimeout(300);
      const gap = await p.evaluate(() => { const h = document.querySelector('main h1, h1'); const hd = document.querySelector('header'); return Math.round(h.getBoundingClientRect().top - hd.getBoundingClientRect().bottom); });
      ok(gap >= 20, `${w}px /${pg}: heading has room under the header (${gap}px)`, gap);
    }
    // blog code does not overflow sideways
    await p.goto(base + 'blog/'); await p.waitForTimeout(300);
    const over = await p.evaluate(() => [...document.querySelectorAll('.post pre')].filter((e) => e.scrollWidth > e.clientWidth + 2).length);
    ok(over === 0, `${w}px blog: code blocks wrap`, over);
    // examples tabs
    await p.goto(base + 'examples/'); await p.waitForTimeout(1200);
    const total = await p.evaluate(() => [...document.querySelectorAll('article.demo')].filter((a) => getComputedStyle(a).display !== 'none').length);
    const vis = () => p.evaluate(() => ({ demos: [...document.querySelectorAll('article.demo')].filter((a) => !a.hidden && getComputedStyle(a).display !== 'none').length, chips: [...document.querySelectorAll('.chips a')].filter((a) => !a.hidden && getComputedStyle(a).display !== 'none').length }));
    let v = await vis(); ok(v.demos === total && v.chips === total, `${w}px examples: All shows every demo`, { v, total });
    const counts = {};
    for (const k of ['basics', 'effects', 'galleries', 'controls', 'advanced']) {
      await p.click(`#cats button[data-cat=${k}]`); await p.waitForTimeout(500); v = await vis(); counts[k] = v.demos;
      ok(v.demos > 0 && v.demos === v.chips, `${w}px examples: ${k} tab shows ${v.demos} demos and as many chips`, v);
      const bad = await p.evaluate(() => [...document.querySelectorAll('article.demo')].filter((a) => !a.hidden && getComputedStyle(a).display !== 'none').flatMap((a) => [...a.querySelectorAll('.mozert-slider')]).filter((s) => s.offsetParent && s.getBoundingClientRect().width < 50).length);
      ok(bad === 0, `${w}px examples: ${k} sliders have a real width after the tab opens`, bad);
    }
    ok(Object.values(counts).reduce((a, c) => a + c, 0) === total, `${w}px examples: every visible demo sits in exactly one category`, { counts, total });
    await p.click('#cats button[data-cat=basics]'); await p.waitForTimeout(200);
    await p.evaluate(() => { location.hash = '#d-cube-box'; }); await p.waitForTimeout(500);
    v = await vis(); ok(v.demos === total, `${w}px examples: a link to a hidden demo switches to All`, v);
    ok(!errs.length, `${w}px: no JS errors`, errs);
    for (const k of ['all', 'basics', 'effects', 'galleries', 'controls', 'advanced']) {
      await p.click(`#cats button[data-cat=${k}]`); await p.waitForTimeout(400);
      const sx = await p.evaluate(() => { window.scrollTo(400, 0); const r = { sw: document.documentElement.scrollWidth, cw: document.documentElement.clientWidth, sx: window.scrollX }; window.scrollTo(0, 0); return r; });
      ok(sx.sw <= sx.cw && sx.sx === 0, `${w}px examples (${k}): page cannot scroll sideways`, sx);
    }
    // features cards and their links
    await p.goto(base + 'features/'); await p.waitForTimeout(300);
    const cards = await p.evaluate(() => [...document.querySelectorAll('.fcard .more')].map((a) => a.getAttribute('href')));
    ok(cards.length === 8, `${w}px features: 8 cards with a link`, cards);
    for (const h of cards) { const [pg, id] = h.replace('../', '').split('#'); const html = fs.readFileSync(path.join(root, pg, 'index.html'), 'utf8'); ok(html.includes(`id="${id}"`), `${w}px features: link target ${pg}#${id} exists`, h); }
    await p.close();
  }
  await b.close(); srv.close(); console.log(fail ? 'FAILED' : 'sitepolish OK'); process.exit(fail ? 1 : 0);
})();
