// Extra feature tests. Usage: node tests/extra.cjs [dist/mozert.js]
const chromium = require('playwright')[process.env.BROWSER || 'chromium'];
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

  await run('custom arrows + appendArrows/Dots + customPaging', async () => {
    const r = await page.evaluate(async () => {
      const a = document.createElement('div'); a.id = 'arrowbox'; const b = document.createElement('div'); b.id = 'dotbox';
      document.getElementById('stage').append(a, b);
      const d = mk({ dots: true, prevArrow: '<button class="my-p">P</button>', nextArrow: '<button class="my-n">N</button>', appendArrows: '#arrowbox', appendDots: '#dotbox', customPaging: (s, i) => '<a>' + (i + 1) + '</a>' }, 4, 'c1');
      return { inBox: a.querySelectorAll('.my-p,.my-n').length, dots: b.querySelectorAll('li').length, label: b.querySelector('li a').textContent };
    });
    ok(r.inBox === 2 && r.dots === 4 && r.label === '1', 'custom arrows/dots', r);
  });

  await run('setOption live + refresh false', async () => {
    const r = await page.evaluate(async () => {
      const d = mk({ speed: 100 }, 6, 'c2');
      d.setOption('autoplay', true, false); d.setOption('autoplaySpeed', 200, false);
      await settle(700); const moved = d.currentSlide();
      d.setOption('autoplay', false, false); const at = d.currentSlide(); await settle(500);
      return { moved, still: d.currentSlide() === at, getOpt: d.getOption('autoplaySpeed') };
    });
    ok(r.moved >= 1 && r.still && r.getOpt === 200, 'setOption live', r);
  });

  await run('useCSS:false + easing', async () => {
    const r = await page.evaluate(async () => {
      const d = mk({ useCSS: false, easing: 'easeOutCubic', speed: 200 }, 5, 'c3');
      d.next(); await settle(60); const mid = d.track.style.transform; await settle(300);
      return { mid, cur: d.currentSlide(), end: d.track.style.transform, trans: d.track.style.transition };
    });
    ok(r.cur === 1 && /none/.test(r.trans) && r.mid !== r.end, 'useCSS false animates via JS', r);
  });

  await run('useTransform:false', async () => {
    const r = await page.evaluate(async () => {
      const d = mk({ useTransform: false, speed: 100 }, 5, 'c4'); d.next(); await settle(250);
      return { left: d.track.style.left, tr: d.track.style.transform, cur: d.currentSlide() };
    });
    ok(r.cur === 1 && /px/.test(r.left) && !r.tr, 'useTransform false uses left', r);
  });

  await run('waitForAnimate', async () => {
    const r = await page.evaluate(async () => {
      const a = mk({ speed: 300 }, 6, 'c5'); a.next(); a.next(); a.next(); await settle(500);
      const b = mk({ speed: 300, waitForAnimate: false }, 6, 'c5b'); b.next(); b.next(); await settle(600);
      return { a: a.currentSlide(), b: b.currentSlide() };
    });
    ok(r.a === 1 && r.b >= 1, 'waitForAnimate true ignores clicks during animation', r);
  });

  await run('slidesToScroll uneven, non-infinite', async () => {
    const r = await page.evaluate(async () => {
      const d = mk({ slidesToShow: 3, slidesToScroll: 2, infinite: false, speed: 80, dots: true }, 8, 'c6');
      const seq = []; for (let i = 0; i < 5; i++) { d.next(); await settle(160); seq.push(d.currentSlide()); }
      return { seq, dots: d.el.querySelectorAll('.mozert-dots li').length };
    });
    ok(JSON.stringify(r.seq) === '[2,4,5,5,5]' && r.dots === 4, 'uneven scroll clamps to last window', r);
  });

  await run('centerMode non-infinite', async () => {
    const r = await page.evaluate(async () => {
      const d = mk({ centerMode: true, infinite: false, slidesToShow: 3, speed: 80 }, 5, 'c7');
      for (let i = 0; i < 8; i++) { d.next(); await settle(140); }
      return { cur: d.currentSlide(), nextDisabled: d._next.classList.contains('mozert-disabled') };
    });
    ok(r.cur === 4 && r.nextDisabled, 'center non-infinite ends at last', r);
  });

  await run('mobileFirst + respondTo slider', async () => {
    const r = await page.evaluate(async () => {
      const d = mk({ mobileFirst: true, slidesToShow: 1, respondTo: 'slider', responsive: [{ breakpoint: 500, settings: { slidesToShow: 2 } }, { breakpoint: 900, settings: { slidesToShow: 3 } }] }, 8, 'c8', 700);
      const a = d.options.slidesToShow; d.el.style.width = '950px'; await settle(400); const b = d.options.slidesToShow;
      d.el.style.width = '300px'; await settle(400); const c = d.options.slidesToShow;
      return { a, b, c };
    });
    ok(r.a === 2 && r.b === 3 && r.c === 1, 'mobileFirst/respondTo slider', r);
  });

  await run('touch swipe', async () => {
    await page.evaluate(() => mk({ speed: 100 }, 5, 'c9'));
    const box = await (await page.$('#c9 .mozert-list')).boundingBox();
    const cdp = await ctx.newCDPSession(page);
    const pt = (x) => [{ x: box.x + x, y: box.y + 40 }];
    await cdp.send('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: pt(450) });
    for (let x = 440; x >= 150; x -= 40) await cdp.send('Input.dispatchTouchEvent', { type: 'touchMove', touchPoints: pt(x) });
    await cdp.send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] });
    await wait(350);
    const cur = await page.evaluate(() => Mozert.get('#c9').currentSlide());
    ok(cur === 1, 'touch swipe next', cur);
  });

  await run('swipe:false / draggable:false', async () => {
    await page.evaluate(() => mk({ draggable: false, speed: 80 }, 5, 'c10'));
    const box = await (await page.$('#c10 .mozert-list')).boundingBox();
    await page.mouse.move(box.x + 500, box.y + 30); await page.mouse.down(); await page.mouse.move(box.x + 50, box.y + 30, { steps: 5 }); await page.mouse.up(); await wait(300);
    ok((await page.evaluate(() => Mozert.get('#c10').currentSlide())) === 0, 'draggable false: mouse drag ignored');
  });

  await run('edge event + edgeFriction', async () => {
    await page.evaluate(() => { window.edges = []; const d = mk({ infinite: false, speed: 80 }, 3, 'c11'); d.on('edge', (s, dir) => edges.push(dir)); });
    const box = await (await page.$('#c11 .mozert-list')).boundingBox();
    await page.mouse.move(box.x + 100, box.y + 30); await page.mouse.down(); await page.mouse.move(box.x + 500, box.y + 30, { steps: 6 });
    const t = await page.evaluate(() => { const d = Mozert.get('#c11'); const m = /translate3d\(([-\d.]+)px/.exec(d.track.style.transform); return +m[1]; });
    await page.mouse.up(); await wait(300);
    const e = await page.evaluate(() => edges.slice());
    ok(t > 0 && t < 400 * 0.3, 'edgeFriction resists overscroll', t);
    ok(e[0] === 'right', 'edge event fired', e);
  });

  await run('pauseOnDotsHover + dots a11y', async () => {
    await page.evaluate(() => mk({ autoplay: true, autoplaySpeed: 200, speed: 50, dots: true, pauseOnHover: false, pauseOnDotsHover: true }, 5, 'c12'));
    const box = await (await page.$('#c12 .mozert-dots')).boundingBox();
    await page.mouse.move(box.x + 5, box.y + 5); await wait(150);
    const a = await page.evaluate(() => Mozert.get('#c12').currentSlide()); await wait(700);
    const b = await page.evaluate(() => Mozert.get('#c12').currentSlide());
    ok(a === b, 'pauseOnDotsHover', { a, b });
    await page.mouse.move(950, 780);
  });

  await run('vertical keyboard + dots', async () => {
    const r = await page.evaluate(async () => {
      const d = mk({ vertical: true, verticalSwiping: true, dots: true, speed: 60 }, 4, 'c13');
      d.el.querySelector('.mozert-list').focus();
      d.el.dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowDown', bubbles: true })); await settle(150);
      return { cur: d.currentSlide(), dotsPos: getComputedStyle(d.el.querySelector('.mozert-dots')).position };
    });
    ok(r.cur === 1 && r.dotsPos === 'absolute', 'vertical keys/dots', r);
  });

  await run('lazy srcset + clones synced', async () => {
    const r = await page.evaluate(async () => {
      const px = 'data:image/svg+xml;utf8,' + encodeURIComponent('<svg xmlns="http://www.w3.org/2000/svg" width="10" height="10"/>');
      const h = document.createElement('div'); h.id = 'c14'; h.style.width = '300px';
      h.innerHTML = [0, 1, 2].map(() => '<div><img data-lazy="' + px + '" alt=""></div>').join('');
      document.getElementById('stage').appendChild(h);
      const d = new Mozert(h, { lazyLoad: 'progressive' }); await settle(500);
      return { left: h.querySelectorAll('img[data-lazy]').length, cloneLoaded: h.querySelectorAll('.mozert-cloned img[src]').length > 0 };
    });
    ok(r.left === 0 && r.cloneLoaded, 'lazy progressive fills clones too', r);
  });

  await run('events: init/reInit/setPosition/destroy + DOM events', async () => {
    const r = await page.evaluate(async () => {
      const log = []; const h = document.createElement('div'); h.id = 'c15'; h.style.width = '400px'; h.innerHTML = '<div>1</div><div>2</div><div>3</div>';
      document.getElementById('stage').appendChild(h);
      h.addEventListener('mozert:init', () => log.push('dom-init'));
      const d = new Mozert(h, { on: { init: () => log.push('cb-init') } });
      d.on('reInit', () => log.push('reInit')); d.on('destroy', () => log.push('destroy')); d.on('setPosition', () => log.push('pos'));
      d.refresh(); d.destroy();
      return log;
    });
    ok(r.includes('dom-init') && r.includes('cb-init') && r.includes('reInit') && r.includes('destroy') && r.includes('pos'), 'event surface', r);
  });

  ok(errors.length === 0, 'no page errors', errors);
  await browser.close();
  console.log(`\n[extra ${target}]  ${pass} passed, ${fail} failed`);
  if (failures.length) { console.log(' - ' + failures.join('\n - ')); process.exit(1); }
})().catch((e) => { console.error(e); process.exit(2); });
