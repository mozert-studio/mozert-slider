// Module tests (effects, free mode, pagination, ...). Usage: node tests/extra.cjs [dist/mozert.js]
const { chromium } = require('playwright');
const path = require('path');
const root = path.join(__dirname, '..');
const target = process.argv[2] || 'dist/mozert.js';
let pass = 0, fail = 0; const failures = [];
const ok = (c, n, x) => { if (c) pass++; else { fail++; failures.push(n + (x !== undefined ? ' -> ' + JSON.stringify(x) : '')); } };
const wait = (ms) => new Promise((r) => setTimeout(r, ms));
(async () => {
  const browser = await chromium.launch();
  const ctx = await browser.newContext({ viewport: { width: 1000, height: 800 }, hasTouch: true });
  const page = await ctx.newPage();
  const errors = []; page.on('pageerror', (e) => errors.push(e.message));
  await page.setContent('<body style="margin:0;padding:20px"><div id="stage"></div></body>');
  await page.addStyleTag({ path: path.join(root, 'dist/mozert.css') });
  await page.addStyleTag({ path: path.join(root, 'dist/mozert-theme.css') });
  await page.addScriptTag({ path: path.join(root, target) });
  await page.evaluate(() => {
    window.MozertAutoInit = false;
    window.mk = (opts, n, id, w) => { const h = document.createElement('div'); h.id = id; h.style.cssText = 'width:' + (w || 600) + 'px;margin:0 0 30px'; let x = ''; for (let i = 0; i < (n || 6); i++) x += '<div class="s" style="height:80px">' + i + '</div>'; h.innerHTML = x; document.getElementById('stage').appendChild(h); return new Mozert(h, opts || {}); };
    window.settle = (ms) => new Promise((r) => setTimeout(r, ms || 400));
    window.R = (e) => e.getBoundingClientRect();
  });
  const run = async (name, fn) => { try { await page.evaluate(() => (document.getElementById('stage').innerHTML = '')); await fn(); } catch (e) { fail++; failures.push(name + ' THREW: ' + e.message.split('\n')[0]); } };


  await run('fractional slidesToShow + spaceBetween', async () => {
    const r = await page.evaluate(async () => {
      const d = mk({ slidesToShow: 2.5, spaceBetween: 20 }, 8, 'm1', 600);
      await settle(100); const sl = d.track.children; const w = R(sl[0]).width; const gap = R(sl[1]).left - R(sl[0]).right;
      return { w: Math.round(w), gap: Math.round(gap), maxI: d.maxIndex };
    });
    ok(r.w === 228 && r.gap === 20 && r.maxI >= 5, 'fractional+gap', r);
  });
  await run('effects apply transforms', async () => {
    const r = await page.evaluate(async () => {
      const out = {};
      for (const fx of ['coverflow', 'cube', 'flip', 'cards', 'creative']) {
        const d = mk({ effect: fx, slidesToShow: fx === 'coverflow' ? 3 : 1, infinite: true, speed: 100, arrows: false }, 5, 'fx' + fx);
        await settle(100);
        const u = d._units || d.dom; const before = Array.from(d.dom).map((e) => e.style.transform).join('|');
        d.next(); await settle(250);
        out[fx] = { has: Array.from(d.dom).some((e) => /rotate|translate|scale/.test(e.style.transform)), changed: before !== Array.from(d.dom).map((e) => e.style.transform).join('|'), cur: d.currentSlide() };
      }
      return out;
    });
    for (const k of Object.keys(r)) ok(r[k].has && r[k].cur === 1, 'effect ' + k, r[k]);
  });
  await run('pagination types', async () => {
    const r = await page.evaluate(async () => {
      const o = {};
      for (const t of ['bullets', 'dynamic', 'fraction', 'progressbar']) {
        const d = mk({ pagination: { type: t }, speed: 50, arrows: false }, 6, 'pg' + t); await settle(80);
        d.goTo(2); await settle(200);
        const el = d.el.querySelector('.mozert-pagination');
        o[t] = { ok: !!el, html: t === 'fraction' ? el.textContent.replace(/\s/g, '') : '', act: el.querySelectorAll('.mozert-bullet-active').length, fill: (el.querySelector('.mozert-pg-fill') || {style:{}}).style.transform };
      }
      return o;
    });
    ok(r.bullets.act === 1 && r.dynamic.act === 1 && r.fraction.html === '3/6' && r.progressbar.fill !== '', 'pagination', r);
  });
  await run('scrollbar', async () => {
    const r = await page.evaluate(async () => {
      const d = mk({ scrollbar: true, slidesToShow: 2, arrows: false, speed: 50 }, 6, 'sb'); await settle(100);
      const t = d.el.querySelector('.mozert-scrollbar-drag'); const w0 = t.style.width; d.goTo(4); await settle(200);
      return { w0, left: t.style.left };
    });
    ok(parseFloat(r.w0) > 30 && parseFloat(r.left) > 30, 'scrollbar', r);
  });
  await run('freeMode drag + mousewheel', async () => {
    await page.evaluate(() => mk({ freeMode: true, slidesToShow: 2.5, spaceBetween: 10, mousewheel: true, infinite: false }, 10, 'fm', 600));
    await page.waitForTimeout(150);
    const box = await page.locator('#fm').boundingBox();
    await page.mouse.move(box.x + 400, box.y + 40); await page.mouse.down(); await page.mouse.move(box.x + 250, box.y + 40, { steps: 5 }); await page.mouse.move(box.x + 100, box.y + 40, { steps: 5 }); await page.mouse.up();
    await page.waitForTimeout(900);
    const t1 = await page.evaluate(() => Mozert.get(document.getElementById('fm'))._cur);
    await page.mouse.move(box.x + 300, box.y + 40); await page.mouse.wheel(0, 120); await page.waitForTimeout(300);
    const t2 = await page.evaluate(() => Mozert.get(document.getElementById('fm'))._cur);
    ok(t1 < -150 && t2 < t1, 'free+wheel', { t1, t2 });
  });
  await run('virtual slides', async () => {
    const r = await page.evaluate(async () => {
      const h = document.createElement('div'); h.id = 'vt'; h.style.width = '500px'; document.getElementById('stage').appendChild(h);
      const d = new Mozert(h, { virtual: { slides: Array.from({ length: 50 }, (_, i) => '<p>S' + i + '</p>'), cache: false }, speed: 50, arrows: false });
      await settle(100); const c0 = h.querySelectorAll('[data-vr]').length; d.goTo(30); await settle(200);
      return { n: d.slideCount(), c0, c1: h.querySelectorAll('[data-vr]').length, has30: !!Array.from(h.querySelectorAll('p')).find((p) => p.textContent === 'S30') };
    });
    ok(r.n === 50 && r.c0 < 10 && r.c1 < 10 && r.has30, 'virtual', r);
  });
  await run('hash navigation', async () => {
    const r = await page.evaluate(async () => {
      location.hash = '#third';
      const h = document.createElement('div'); h.id = 'hn'; h.style.width = '400px'; h.innerHTML = '<div data-hash="first">1</div><div data-hash="second">2</div><div data-hash="third">3</div>'; document.getElementById('stage').appendChild(h);
      const d = new Mozert(h, { hashNavigation: true, speed: 50 }); await settle(150); const a = d.currentSlide(); d.goTo(1); await settle(150);
      return { a, hash: location.hash };
    });
    ok(r.a === 2 && r.hash === '#second', 'hash', r);
  });
  await page.mouse.move(990, 790);
  await run('parallax + zoom API + marquee + autoplay extras', async () => {
    const r = await page.evaluate(async () => {
      const h = document.createElement('div'); h.id = 'px'; h.style.width = '400px'; h.innerHTML = '<div><img data-parallax-x="30%" alt="" src="data:image/gif;base64,R0lGODlhAQABAAAAACw="></div><div>2</div><div>3</div>'; document.getElementById('stage').appendChild(h);
      const d = new Mozert(h, { parallax: true, zoom: true, speed: 100 }); await settle(100);
      d.next(); await settle(200); const tr = h.querySelector('img').style.transform;
      const z = typeof d.zoom.toggle;
      const m = mk({ marquee: { speed: 200 }, slidesToShow: 3 }, 6, 'mq', 600); await settle(100); const a = m._cur; await settle(300); const b = m._cur;
      const ev = []; const ap = mk({ autoplay: true, autoplaySpeed: 150, autoplayReverse: true, stopOnLastSlide: true, infinite: false, speed: 30 }, 3, 'ap'); ap.on('autoplayStop', () => ev.push('stop')); await settle(900);
      return { tr, z, moved: a !== b, ev, cur: ap.currentSlide() };
    });
    ok(/translate3d/.test(r.tr) && r.z === 'function' && r.moved, 'parallax/zoom/marquee', r);
  });
  await run('touchRatio + dragThreshold + disableOnInteraction', async () => {
    const r = await page.evaluate(async () => {
      const d = mk({ autoplay: true, autoplaySpeed: 300, disableOnInteraction: true, speed: 50 }, 4, 'di'); await settle(50);
      d.el.querySelector('.mozert-next').click(); await settle(700);
      return { cur: d.currentSlide(), playing: d.isPlaying() };
    });
    ok(r.cur === 1 && !r.playing, 'disableOnInteraction', r);
  });

  await run('bleed layout', async () => {
    const r = await page.evaluate(async () => {
      const w = document.createElement('div'); w.style.cssText = 'padding:0 100px'; const h = document.createElement('div'); h.id = 'bl'; h.innerHTML = [1,2,3,4,5,6].map((i) => '<div>' + i + '</div>').join(''); w.appendChild(h); document.getElementById('stage').appendChild(w);
      const d = new Mozert(h, { bleed: true, slidesToShow: 2.5, spaceBetween: 10, speed: 30 }); await settle(150);
      const c = h.getBoundingClientRect(); const first = d._units[0].getBoundingClientRect();
      const peek = d._units[2].getBoundingClientRect().right > c.right;
      d.goTo(d.maxIndex, true); await settle(200);
      const last = d._units[5].getBoundingClientRect();
      return { startAligned: Math.abs(first.left - c.left) < 2, peek, endAligned: Math.abs(last.right - c.right) < 2, clip: h.querySelector('.mozert-list').style.clipPath.indexOf('inset') === 0, inf: d.s.infinite };
    });
    ok(r.startAligned && r.peek && r.endAligned && r.clip && !r.inf, 'bleed', r);
  });
  console.log('\n[modules ' + target + ']  ' + pass + ' passed, ' + fail + ' failed');
  if (failures.length) console.log(failures.join('\n'));
  if (errors.length) console.log('PAGE ERRORS:', errors);
  await browser.close();
  process.exit(fail || errors.length ? 1 : 0);
})();
