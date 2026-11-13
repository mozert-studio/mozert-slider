// bleed: the page must never scroll sideways, even with no page CSS at all (library-only page, phone viewport).
const chromium = require('playwright')[process.env.BROWSER || 'chromium'];
const fs = require('fs'), path = require('path');
const dist = path.join(__dirname, '..', 'dist');
const js = fs.readFileSync(path.join(dist, 'mozert.min.js'), 'utf8'), css = fs.readFileSync(path.join(dist, 'mozert.min.css'), 'utf8');
const html = `<!doctype html><html><head><meta charset=utf-8><meta name=viewport content="width=device-width,initial-scale=1"><style>${css}body{margin:0}.wrap{padding:0 16px}.s div{height:120px;background:#46f}</style></head><body><div class=wrap><div class=s id=a>${'<div></div>'.repeat(6)}</div><div class=s id=b>${'<div></div>'.repeat(6)}</div></div></body></html>`;
let fail = 0; const ok = (c, m, x) => { console.log((c ? 'ok   ' : 'FAIL ') + m, c ? '' : JSON.stringify(x)); if (!c) fail++; };
(async () => {
  const b = await chromium.launch();
  for (const [w, mobile] of [[390, true], [1280, false]]) {
    const ctx = await b.newContext({ viewport: { width: w, height: 700 }, isMobile: mobile && process.env.BROWSER !== 'firefox', hasTouch: mobile && process.env.BROWSER !== 'firefox' || undefined });
    const p = await ctx.newPage(); const errs = []; p.on('pageerror', (e) => errs.push(e.message));
    await p.setContent(html); await p.addScriptTag({ content: js });
    const st = () => p.evaluate(() => ({ h: document.documentElement.style.overflowX, b: document.body.style.overflowX }));
    await p.evaluate(() => { window.A = new Mozert('#a', { bleed: true, slidesToShow: 1.4, spaceBetween: 12, infinite: false, dots: false }); window.B = new Mozert('#b', { bleed: true, slidesToShow: 1.4, spaceBetween: 12, infinite: false, dots: false }); });
    await p.waitForTimeout(500);
    let r = await p.evaluate(() => { window.scrollTo(400, 0); return { sw: document.documentElement.scrollWidth, cw: document.documentElement.clientWidth, sx: scrollX }; });
    ok(r.sw <= r.cw && r.sx === 0, `${w}px: library-only page does not scroll sideways`, r);
    ok(errs.length === 0, `${w}px: no JS errors`, errs);
    await p.evaluate(() => window.A.destroy()); r = await st();
    ok(r.h !== '' && r.b !== '', `${w}px: page stays clipped while another bleed slider lives`, r);
    await p.evaluate(() => window.B.destroy()); r = await st();
    ok(r.h === '' && r.b === '', `${w}px: page styles restored after the last bleed slider is destroyed`, r);
    await ctx.close();
  }
  await b.close(); console.log(fail ? 'FAILED' : 'bleed OK'); process.exit(fail ? 1 : 0);
})();
