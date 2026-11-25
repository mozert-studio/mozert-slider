// 1.1.3 features: offscreen autoplay pause, image hints + blur-up, pre-init aspect ratio, autoplay indicator,
// static cursor, lightbox touch gestures (pinch, double-tap, swipe down, swipe sideways).
// Usage: node tests/v113.cjs [dist/mozert.min.js]
const chromium = require('playwright')[process.env.BROWSER || 'chromium'];
const path = require('path');
const root = path.join(__dirname, '..');
const target = process.argv[2] || 'dist/mozert.min.js';
let fail = 0;
const ok = (c, m, x) => { console.log((c ? 'ok   ' : 'FAIL ') + m, c ? '' : JSON.stringify(x)); if (!c) fail++; };
const wait = (p, ms) => p.waitForTimeout(ms);
const PX = 'data:image/gif;base64,R0lGODlhAQABAIAAAP///wAAACH5BAEAAAAALAAAAAABAAEAAAICRAEAOw==';

(async () => {
  const b = await chromium.launch();
  const ctx = await b.newContext({ viewport: { width: 420, height: 700 } });
  const page = await ctx.newPage();
  const errs = []; page.on('pageerror', (e) => errs.push(e.message));
  const boot = async (html) => {
    await page.setContent('<!doctype html><meta charset="utf-8"><body style="margin:0">' + html);
    await page.addStyleTag({ path: path.join(root, 'dist/mozert.css') });
    await page.addScriptTag({ path: path.join(root, target) });
  };

  /* ---------- offscreen autoplay pause ---------- */
  await boot('<div style="height:1500px">spacer</div><div id="a" style="width:300px"><div>1</div><div>2</div><div>3</div><div>4</div></div><div style="height:1500px"></div>');
  let r = await page.evaluate(async () => {
    const out = {};
    window.S = new Mozert('#a', { autoplay: true, autoplaySpeed: 250, speed: 100, arrows: false });
    await new Promise((r) => setTimeout(r, 1200));
    out.startedOffscreen = S.current;
    return out;
  });
  ok(r.startedOffscreen === 0, 'autoplay does not run while the slider is below the fold', r);
  await page.evaluate(() => document.getElementById('a').scrollIntoView());
  await wait(page, 1200);
  r = await page.evaluate(() => ({ cur: S.current }));
  ok(r.cur !== 0, 'autoplay starts when the slider scrolls into view', r);
  await page.evaluate(() => window.scrollTo(0, 0));
  await wait(page, 400);
  const c1 = await page.evaluate(() => S.current);
  await wait(page, 1000);
  const c2 = await page.evaluate(() => S.current);
  ok(c1 === c2, 'autoplay stops when the slider scrolls out of view again', { c1, c2 });
  await page.evaluate(() => document.getElementById('a').scrollIntoView());
  await wait(page, 900);
  const c3 = await page.evaluate(() => S.current);
  ok(c3 !== c2, 'autoplay resumes on return', { c2, c3 });

  await boot('<div style="height:1500px">spacer</div><div id="a" style="width:300px"><div>1</div><div>2</div><div>3</div><div>4</div></div>');
  r = await page.evaluate(async () => {
    window.S = new Mozert('#a', { autoplay: true, autoplaySpeed: 250, speed: 100, arrows: false, pauseOffscreen: false });
    await new Promise((r) => setTimeout(r, 1000));
    return { cur: S.current };
  });
  ok(r.cur !== 0, 'pauseOffscreen: false keeps autoplay running offscreen', r);

  /* ---------- image hints + blur-up ---------- */
  await boot('<div id="a" style="width:300px"></div>');
  r = await page.evaluate(async (PX) => {
    const host = document.getElementById('a');
    for (let i = 0; i < 8; i++) host.insertAdjacentHTML('beforeend', '<div><img src="' + PX + '#' + i + '" alt="" width="300" height="100"></div>');
    host.insertAdjacentHTML('beforeend', '<div><img data-lazy="' + PX + '#lz" data-lazy-placeholder="' + PX + '#ph" alt="" width="300" height="100"></div>');
    const S = new Mozert(host, { arrows: false, infinite: false });
    const imgs = [...host.querySelectorAll('.mozert-slide:not(.mozert-cloned) img')];
    return {
      first: imgs[0].getAttribute('fetchpriority'),
      second: imgs[1].getAttribute('fetchpriority'),
      near: imgs[1].getAttribute('loading'),
      far: imgs[5].getAttribute('loading'),
      dec: imgs[0].getAttribute('decoding'),
      blur: imgs[8].classList.contains('mozert-blur'),
      bg: imgs[8].style.backgroundImage.includes('ph'),
    };
  }, PX);
  ok(r.first === 'high' && !r.second, 'first visible picture gets fetchpriority=high, others do not', r);
  ok(r.far === 'lazy' && !r.near, 'far slides get loading=lazy, near ones stay eager', r);
  ok(r.dec === 'async', 'pictures get decoding=async', r);
  ok(r.blur && r.bg, 'data-lazy-placeholder shows a blurred placeholder', r);
  await boot('<div id="a" style="width:300px"></div>');
  r = await page.evaluate(async (PX) => {
    const host = document.getElementById('a');
    host.insertAdjacentHTML('beforeend', '<div><img src="' + PX + '#x" alt=""></div><div><img data-lazy="' + PX + '#lz2" data-lazy-placeholder="' + PX + '#ph2" alt="" width="300" height="100"></div>');
    const S = new Mozert(host, { arrows: false, infinite: false });
    const im = host.querySelectorAll('img')[1];
    const before = im.classList.contains('mozert-blur');
    S.goTo(1); await new Promise((r) => setTimeout(r, 600));
    return { before, after: im.classList.contains('mozert-loaded'), bg: im.style.backgroundImage, blurStill: im.classList.contains('mozert-blur') };
  }, PX);
  ok(r.before && r.after && r.bg === '', 'blur-up: placeholder is removed when the real picture has loaded', r);
  await boot('<div id="a" style="width:300px"></div>');
  r = await page.evaluate(async (PX) => {
    const host = document.getElementById('a');
    for (let i = 0; i < 6; i++) host.insertAdjacentHTML('beforeend', '<div><img src="' + PX + '#' + i + '" alt=""></div>');
    new Mozert(host, { arrows: false, optimizeImages: false });
    const imgs = [...host.querySelectorAll('img')];
    return { any: imgs.some((i) => i.hasAttribute('fetchpriority') || i.hasAttribute('loading') || i.hasAttribute('decoding')) };
  }, PX);
  ok(!r.any, 'optimizeImages: false leaves the pictures alone', r);

  /* ---------- pre-init aspect ratio ---------- */
  await page.setViewportSize({ width: 900, height: 700 });
  await page.setContent('<!doctype html><meta charset="utf-8"><body style="margin:0"><div id="p" class="mozert-pre" style="width:600px;--mozert-pre-ratio:16/9;--mozert-pre-ratio-sm:1/1"><div>1</div><div>2</div></div>');
  await page.addStyleTag({ path: path.join(root, 'dist/mozert.css') });
  r = await page.evaluate(() => { const e = document.getElementById('p'); return { w: e.offsetWidth, h: e.offsetHeight }; });
  ok(r.w === 600 && Math.abs(r.h - 337.5) < 2, '--mozert-pre-ratio reserves the height before the script runs', r);
  await page.setViewportSize({ width: 420, height: 700 });
  r = await page.evaluate(() => { const e = document.getElementById('p'); e.style.width = '400px'; return { w: e.offsetWidth, h: e.offsetHeight }; });
  ok(Math.abs(r.h - 400) < 2, '--mozert-pre-ratio-sm applies on small screens', r);

  /* ---------- autoplay indicator ---------- */
  await boot('<div id="a" style="width:300px"><div>1</div><div>2</div><div>3</div></div><div id="b" style="width:300px"><div>1</div><div>2</div><div>3</div></div>');
  r = await page.evaluate(async () => {
    window.A = new Mozert('#a', { autoplay: true, autoplaySpeed: 1200, arrows: false, autoplayIndicator: 'ring' });
    window.B = new Mozert('#b', { autoplay: true, autoplaySpeed: 1200, arrows: false, autoplayIndicator: 'bar', pauseOnHover: true });
    const ring = document.querySelector('#a .mozert-ap-ring .mozert-ap-fg');
    const bar = document.querySelector('#b .mozert-ap-bar i');
    const o0 = parseFloat(ring.style.strokeDashoffset);
    await new Promise((r) => setTimeout(r, 600));
    const o1 = parseFloat(ring.style.strokeDashoffset);
    const b1 = new DOMMatrix(getComputedStyle(bar).transform).a;
    return { has: !!ring && !!bar, o0, o1, b1, hidden: document.querySelector('#a .mozert-ap').getAttribute('aria-hidden') };
  });
  ok(r.has && r.hidden === 'true', 'indicator elements exist and are hidden from screen readers', r);
  ok(r.o1 < r.o0, 'ring fills while autoplay counts down', r);
  ok(r.b1 > 0.15 && r.b1 < 0.95, 'bar fills while autoplay counts down', r);
  r = await page.evaluate(async () => {
    A.destroy();
    return { gone: !document.querySelector('#a .mozert-ap') };
  });
  ok(r.gone, 'indicator is removed on destroy', r);

  /* ---------- static slider has no grab cursor ---------- */
  await boot('<div id="a" style="width:300px"><div>only</div></div>');
  r = await page.evaluate(() => { new Mozert('#a', { arrows: false }); const l = document.querySelector('#a .mozert-list'); return { st: document.getElementById('a').classList.contains('mozert-static'), cur: getComputedStyle(l).cursor }; });
  ok(r.st && r.cur === 'auto', 'a slider with nothing to scroll does not show the grab cursor', r);

  /* ---------- lightbox touch gestures ---------- */
  await boot('<div id="a" style="width:380px;margin:0 auto"></div>');
  await page.evaluate(() => {
    const c = document.createElement('canvas'); c.width = 800; c.height = 600; const g = c.getContext('2d'); g.fillStyle = '#c33'; g.fillRect(0, 0, 800, 600);
    const url = c.toDataURL('image/png');
    const host = document.getElementById('a');
    for (let i = 0; i < 4; i++) host.insertAdjacentHTML('beforeend', '<div><img src="' + url + '" data-full="' + url + '" alt="s' + i + '" width="380" height="200"></div>');
    window.S = new Mozert(host, { arrows: false, lightbox: { maxZoom: 2.5 } });
    S.lightbox.open(0);
  });
  await wait(page, 500);
  const info = () => page.evaluate(() => {
    const el = document.querySelector('.mozert-lb-img');
    const t = el ? getComputedStyle(el).transform : 'none';
    const m = t === 'none' ? [1, 0, 0, 1, 0, 0] : t.match(/matrix\(([^)]+)\)/)[1].split(',').map(Number);
    return { open: !!document.querySelector('.mozert-lb'), count: (document.querySelector('.mozert-lb-count') || {}).textContent, sc: m[0], tx: m[4], ty: m[5], op: document.querySelector('.mozert-lb') ? getComputedStyle(document.querySelector('.mozert-lb')).opacity : null };
  });
  const fire = (type, id, x, y) => page.evaluate(([type, id, x, y]) => {
    const el = document.querySelector('.mozert-lb-img') || document.querySelector('.mozert-lb-stage');
    el.dispatchEvent(new PointerEvent(type, { pointerId: id, pointerType: 'touch', isPrimary: id === 1, clientX: x, clientY: y, bubbles: true, cancelable: true }));
  }, [type, id, x, y]);
  const rect = await page.evaluate(() => { const r = document.querySelector('.mozert-lb-img').getBoundingClientRect(); return { cx: r.left + r.width / 2, cy: r.top + r.height / 2 }; });
  const { cx, cy } = rect;

  // single tap on the picture: nothing happens (no accidental zoom, no close)
  await fire('pointerdown', 1, cx, cy); await fire('pointerup', 1, cx, cy);
  await page.evaluate(([x, y]) => document.querySelector('.mozert-lb-img').dispatchEvent(new MouseEvent('click', { clientX: x, clientY: y, bubbles: true })), [cx, cy]);
  await wait(page, 350);
  let i = await info();
  ok(i.open && i.sc === 1, 'single tap on the picture does not zoom or close', i);

  // double-tap zooms in
  for (let k = 0; k < 2; k++) { await fire('pointerdown', 1, cx, cy); await fire('pointerup', 1, cx, cy); await wait(page, 60); }
  await wait(page, 350);
  i = await info();
  ok(i.open && Math.abs(i.sc - 2.5) < 0.05, 'double-tap zooms to maxZoom', i);
  // double-tap again zooms out
  for (let k = 0; k < 2; k++) { await fire('pointerdown', 1, cx, cy); await fire('pointerup', 1, cx, cy); await wait(page, 60); }
  await wait(page, 350);
  i = await info();
  ok(i.sc === 1 && !i.tx && !i.ty, 'double-tap again returns to the normal view', i);

  // pinch out
  await fire('pointerdown', 1, cx - 40, cy); await fire('pointerdown', 2, cx + 40, cy);
  for (let k = 1; k <= 8; k++) { await fire('pointermove', 1, cx - 40 - k * 5, cy); await fire('pointermove', 2, cx + 40 + k * 5, cy); }
  await wait(page, 100);
  i = await info();
  ok(i.sc > 1.9 && i.sc < 2.6, 'pinch out zooms in with the fingers', i);
  await fire('pointerup', 2, cx + 80, cy); await fire('pointerup', 1, cx - 80, cy);
  await wait(page, 100);
  // pan while zoomed
  const before = await info();
  await fire('pointerdown', 1, cx, cy);
  for (let k = 1; k <= 6; k++) await fire('pointermove', 1, cx - k * 6, cy);
  await fire('pointerup', 1, cx - 36, cy);
  await wait(page, 100);
  i = await info();
  ok(i.open && i.count === '1 / 4' && i.tx < before.tx - 15, 'drag while zoomed pans the picture instead of changing it', { before, i });
  // pinch in back to 1
  await fire('pointerdown', 1, cx - 80, cy); await fire('pointerdown', 2, cx + 80, cy);
  for (let k = 1; k <= 12; k++) { await fire('pointermove', 1, cx - 80 + k * 6, cy); await fire('pointermove', 2, cx + 80 - k * 6, cy); }
  await fire('pointerup', 2, cx, cy); await fire('pointerup', 1, cx, cy);
  await wait(page, 350);
  i = await info();
  ok(i.sc === 1 && !i.tx && !i.ty, 'pinching back in returns to the normal view', i);

  // short pull down springs back
  await fire('pointerdown', 1, cx, cy);
  for (let k = 1; k <= 5; k++) await fire('pointermove', 1, cx, cy + k * 8);
  await fire('pointerup', 1, cx, cy + 40);
  await wait(page, 400);
  i = await info();
  ok(i.open && i.sc === 1 && i.ty === 0 && Number(i.op) > 0.95, 'a short swipe down springs back and keeps the viewer open', i);

  // swipe sideways: next picture
  await fire('pointerdown', 1, cx + 60, cy);
  for (let k = 1; k <= 8; k++) await fire('pointermove', 1, cx + 60 - k * 15, cy + 2);
  await fire('pointerup', 1, cx - 60, cy + 2);
  await wait(page, 400);
  i = await info();
  ok(i.open && i.count === '2 / 4', 'swipe sideways shows the next picture', i);

  // long swipe down closes
  const r2 = await page.evaluate(() => { const r = document.querySelector('.mozert-lb-img').getBoundingClientRect(); return { cx: r.left + r.width / 2, cy: r.top + r.height / 2 }; });
  await fire('pointerdown', 1, r2.cx, r2.cy);
  for (let k = 1; k <= 12; k++) await fire('pointermove', 1, r2.cx, r2.cy + k * 15);
  await fire('pointerup', 1, r2.cx, r2.cy + 180);
  await wait(page, 600);
  i = await info();
  ok(!i.open, 'swipe down closes the lightbox', i);

  // mouse still works like before: click toggles zoom
  await page.evaluate(() => S.lightbox.open(0));
  await wait(page, 400);
  await page.mouse.click(cx, cy);
  await wait(page, 400);
  i = await info();
  ok(i.open && Math.abs(i.sc - 2.5) < 0.05, 'mouse click on the picture still toggles zoom', i);
  await page.mouse.click(cx, cy);
  await wait(page, 400);
  i = await info();
  ok(i.sc === 1, 'mouse click again zooms out', i);

  ok(errs.length === 0, 'no page errors', errs);
  await b.close();
  console.log(fail ? 'v113 FAILED' : 'v113 OK');
  process.exit(fail ? 1 : 0);
})();
