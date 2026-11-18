// Regression: in an infinite slider, clicking a visible copy of a slide at the other end of the loop (focusOnSelect)
// must take the short way round, never sweep back through the whole strip.
const chromium = require('playwright')[process.env.BROWSER || 'chromium'];
const path = require('path');
const root = path.join(__dirname, '..');
const target = process.argv[2] || 'dist/mozert.js';
let fail = 0;
const ok = (c, m, x) => { console.log((c ? 'ok   ' : 'FAIL ') + m, c ? '' : JSON.stringify(x)); if (!c) fail++; };
(async () => {
  const b = await chromium.launch();
  const page = await (await b.newContext({ viewport: { width: 900, height: 700 } })).newPage();
  const errs = []; page.on('pageerror', (e) => errs.push(e.message));
  await page.setContent('<!doctype html><meta charset="utf-8"><body style="margin:0;padding:20px"><div id="m" style="width:600px"></div>');
  await page.addStyleTag({ path: path.join(root, 'dist/mozert.css') });
  await page.addScriptTag({ path: path.join(root, target) });
  for (const [label, opts] of [['3 up', { slidesToShow: 3 }], ['centred 3 up', { slidesToShow: 3, centerMode: true, centerPadding: '0px' }], ['1 up', { slidesToShow: 1 }]]) {
    for (const dir of ['forward', 'backward']) {
      const r = await page.evaluate(async ([opts, dir]) => {
        const old = document.getElementById('m'); const host = old.cloneNode(false); old.replaceWith(host);
        for (let i = 0; i < 8; i++) host.insertAdjacentHTML('beforeend', '<div style="height:80px">' + i + '</div>');
        const S = new Mozert(host, Object.assign({ infinite: true, speed: 400, focusOnSelect: true, arrows: false, dots: false }, opts));
        S.goTo(dir === 'forward' ? 7 : 0, true); await new Promise((r) => setTimeout(r, 500));
        const x = () => new DOMMatrix(getComputedStyle(S.track).transform).m41;
        const pitch = host.querySelector('.mozert-slide').offsetWidth;
        let last = x(); let far = 0; let on = true;
        // distance the strip really glides (the instant re-base at the end of a loop is a jump of a whole loop, not a glide)
        const f = () => { const v = x(); const d = Math.abs(v - last); if (d < 3 * pitch) far += d; last = v; if (on) requestAnimationFrame(f); }; f();
        // the slide just past the end the user is at: the visible copy of the other end
        const cur = S.currentSlide(); const want = dir === 'forward' ? 0 : 7;
        const copies = [...host.querySelectorAll('.mozert-slide')].filter((e) => +e.getAttribute('data-mozert-index') === want).filter((e) => { const r = e.getBoundingClientRect(); return r.right > host.getBoundingClientRect().left && r.left < host.getBoundingClientRect().right; });
        if (!copies.length) { on = false; return { skip: true, cur, n: S.n }; }
        copies[0].click();
        await new Promise((r) => setTimeout(r, 900)); on = false;
        return { cur: S.currentSlide(), want, travelSlides: +(far / pitch).toFixed(2) };
      }, [opts, dir]);
      if (r.skip) { ok(true, `${label} ${dir}: other end not visible (nothing to click)`); continue; }
      ok(r.cur === r.want, `${label} ${dir}: lands on slide ${r.want}`, r);
      ok(r.travelSlides <= 3.2, `${label} ${dir}: short way round (${r.travelSlides} slides moved)`, r);
    }
  }
  ok(errs.length === 0, 'no page errors', errs);
  await b.close(); console.log(fail ? 'FAILED' : 'loopclick OK'); process.exit(fail ? 1 : 0);
})();
