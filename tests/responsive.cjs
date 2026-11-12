// Examples page: every demo must work at phone, tablet and desktop widths.
const http = require('http'), fs = require('fs'), path = require('path');
const chromium = require('playwright')[process.env.BROWSER || 'chromium'];
const root = path.join(__dirname, '..', 'site');
const types = { '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css', '.svg': 'image/svg+xml', '.png': 'image/png', '.ico': 'image/x-icon' };
const srv = http.createServer((q, s) => {
  let f = path.join(root, decodeURIComponent(q.url.split('?')[0]));
  if (fs.existsSync(f) && fs.statSync(f).isDirectory()) f = path.join(f, 'index.html');
  if (!fs.existsSync(f)) { s.writeHead(404); return s.end(); }
  s.writeHead(200, { 'content-type': types[path.extname(f)] || 'application/octet-stream' });
  fs.createReadStream(f).pipe(s);
});
let pass = 0, fail = 0;
const ok = (c, m, d) => { if (c) pass++; else { fail++; console.log('FAIL', m, d ? JSON.stringify(d) : ''); } };
(async () => {
  await new Promise((r) => srv.listen(0, r));
  const url = 'http://localhost:' + srv.address().port + '/examples/';
  const b = await chromium.launch();
  for (const [w, h] of [[360, 740], [390, 800], [768, 1024], [1024, 768], [1366, 768]]) {
    const p = await b.newPage({ viewport: { width: w, height: h } });
    const errs = [];
    p.on('pageerror', (e) => errs.push(e.message));
    await p.goto(url);
    await p.waitForTimeout(1200);
    const res = await p.evaluate(() => {
      const out = [];
      document.querySelectorAll('[id^="d-"][id$="-box"]').forEach((box) => {
        const id = box.id.replace('-box', '');
        const m = document.getElementById(id);
        const s = m && m._mozert;
        const bx = box.getBoundingClientRect();
        const el = m.getBoundingClientRect();
        const strip = box.querySelector('[data-mozert-thumbs]');
        out.push({ id, init: !!s, sts: s && s.s.slidesToShow, inside: bx.left >= -1 && bx.right <= innerWidth + 1, elW: Math.round(el.width), elH: Math.round(el.height), strip: strip ? strip.getAttribute('data-mozert-thumbs') : null, sdH: id === 'd-scroll' ? Math.round(el.height) : 0, slideH: Math.round((m.querySelector('.mozert-slide') || { getBoundingClientRect: () => ({ height: 0 }) }).getBoundingClientRect().height) });
      });
      return { out, overflowX: (function () { scrollTo({ left: 500, top: 0, behavior: 'instant' }); const x = scrollX; scrollTo({ left: 0, top: 0, behavior: 'instant' }); return x; })() };
    });
    ok(res.out.length >= 30, w + ': all demos on the page', res.out.length);
    ok(res.out.every((d) => d.init), w + ': every demo initialised', res.out.filter((d) => !d.init).map((d) => d.id));
    ok(res.out.every((d) => d.inside), w + ': every demo inside the screen', res.out.filter((d) => !d.inside).map((d) => d.id));
    const arrows = await p.evaluate(() => [...document.querySelectorAll('#d-basic .mozert-prev, #d-basic .mozert-next, #d-multi .mozert-prev')].filter((a) => a.offsetParent).map((a) => Math.round(a.getBoundingClientRect().width)));
    ok(arrows.length > 0 && arrows.every((a) => (w <= 640 ? a <= 36 : a >= 40)), w + ': arrow size follows the screen (small on phones)', arrows);
    ok(res.overflowX === 0, w + ': page does not scroll sideways', res.overflowX);
    ok(errs.length === 0, w + ': no JS errors', errs);
    const g = (id) => res.out.find((d) => d.id === id);
    if (w <= 640) {
      ok(g('d-coverflow').sts <= 2 && g('d-coverflow').elH >= 80, w + ': coverflow shows few, readable cards', g('d-coverflow'));
      ok(g('d-3d').sts <= 2, w + ': 3D carousel few slides', g('d-3d'));
      ok(g('d-expand').sts <= 2, w + ': expanding cards few slides', g('d-expand'));
      ok(g('d-scroll').sdH <= 420 && g('d-scroll').sdH >= 160, w + ': scroll-driven slider height capped on phones', g('d-scroll'));
      for (const id of ['d-thumbs2', 'd-product']) ok(g(id).strip === 'bottom', w + ': ' + id + ' strip moves below the picture', g(id));
    } else {
      ok(g('d-thumbs2').strip === 'right' && g('d-product').strip === 'left', w + ': side thumbs stay beside the picture', [g('d-thumbs2'), g('d-product')]);
      ok(g('d-coverflow').sts >= 2, w + ': coverflow shows several', g('d-coverflow'));
    }
    if (w >= 768 && w < 1000) ok(g('d-expand').sts > 2 && g('d-3d').sts >= 1.7, w + ': tablet shows more slides than phone', [g('d-expand'), g('d-3d')]);
    // scroll-driven sticks and moves at this width
    const sd = await p.evaluate(async () => {
      const w = document.querySelector('.mozert-sd');
      scrollTo({ top: 0, behavior: 'instant' });
      await new Promise((r) => setTimeout(r, 100));
      const tp = w.getBoundingClientRect().top + scrollY;
      const e = document.getElementById('d-scroll');
      const res = [];
      for (const dy of [0, 120, 240]) {
        scrollTo({ top: tp + dy, behavior: 'instant' });
        await new Promise((r) => setTimeout(r, 300));
        res.push({ cur: e._mozert.current, top: Math.round(e.getBoundingClientRect().top), h: Math.round(e.getBoundingClientRect().height), vh: innerHeight });
      }
      return res;
    });
    ok(sd[0].top === sd[1].top && sd[1].top === sd[2].top && sd[2].cur > sd[0].cur && sd.every((x) => x.top >= 0 && x.top + x.h <= x.vh), w + ': scroll-driven stays pinned on screen and moves', sd);
    await p.close();
  }
  await b.close();
  srv.close();
  console.log('responsive: ' + pass + ' passed, ' + fail + ' failed');
  process.exit(fail ? 1 : 0);
})();
