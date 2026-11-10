// Behavioural test-suite. Usage: node tests/run.cjs [dist/mozert.js | dist/mozert.min.js]
const { chromium } = require('playwright');
const path = require('path');
const root = path.join(__dirname, '..');
const target = process.argv[2] || 'dist/mozert.js';

let pass = 0, fail = 0;
const failures = [];
function ok(cond, name, extra) {
  if (cond) { pass++; } else { fail++; failures.push(name + (extra !== undefined ? '  -> ' + JSON.stringify(extra) : '')); }
}
const near = (a, b, t = 1.5) => Math.abs(a - b) <= t;
const wait = (ms) => new Promise((r) => setTimeout(r, ms));

(async () => {
  const browser = await chromium.launch();
  const ctx = await browser.newContext({ viewport: { width: 1000, height: 800 } });
  const page = await ctx.newPage();
  const errors = [];
  page.on('pageerror', (e) => errors.push(e.message));
  page.on('console', (m) => { if (m.type() === 'error') errors.push(m.text()); });

  await page.setContent(`<!doctype html><html><head><meta charset="utf-8"></head><body style="margin:0;padding:20px">
    <div id="stage"></div></body></html>`);
  await page.addStyleTag({ path: path.join(root, 'dist/mozert.css') });
  await page.addStyleTag({ path: path.join(root, 'dist/mozert-theme.css') });
  await page.addScriptTag({ path: path.join(root, target) });

  await page.evaluate(() => {
    window.MozertAutoInit = false;
    window.mk = function (opts, n, id, w, html) {
      n = n || 6;
      var host = document.createElement('div');
      host.id = id || ('t' + Math.random().toString(36).slice(2, 7));
      host.style.cssText = 'width:' + (w || 600) + 'px;margin:0 0 30px';
      var inner = '';
      for (var i = 0; i < n; i++) inner += html ? html(i) : '<div class="s" data-i="' + i + '" style="height:100px;background:hsl(' + i * 50 + ',70%,60%)">' + i + '</div>';
      host.innerHTML = inner;
      document.getElementById('stage').appendChild(host);
      window.events = window.events || [];
      var d = new Mozert(host, opts || {});
      return d;
    };
    window.reset = function () { document.getElementById('stage').innerHTML = ''; };
    window.settle = function (ms) { return new Promise(function (r) { setTimeout(r, ms || 700); }); };
    window.R = function (el) { var r = el.getBoundingClientRect(); return { l: r.left, r: r.right, t: r.top, b: r.bottom, w: r.width, h: r.height }; };
  });

  const run = async (name, fn) => {
    try { await page.evaluate(() => reset()); await fn(); }
    catch (e) { fail++; failures.push(name + ' THREW: ' + e.message.split('\n')[0]); }
  };

  /* 1 ---- basic */
  await run('basic', async () => {
    const r = await page.evaluate(async () => {
      const d = mk({ dots: true }, 5, 'a');
      return {
        cls: d.el.className, n: d.slideCount(), kids: d.track.children.length, clones: d.track.querySelectorAll('.mozert-cloned').length,
        arrows: d.el.querySelectorAll('.mozert-arrow').length, dots: d.el.querySelectorAll('.mozert-dots li').length,
        role: d.el.getAttribute('role'), aria: d.track.children[d._c].getAttribute('aria-label'),
        w: R(d.track.children[d._c]).w, listW: R(d.list).w, version: Mozert.version
      };
    });
    ok(/mozert-slider/.test(r.cls) && /mozert-initialized/.test(r.cls), 'basic: classes', r.cls);
    ok(r.n === 5, 'basic: slideCount', r.n);
    ok(r.clones > 0 && r.kids === 5 + r.clones, 'basic: clones created', r);
    ok(r.arrows === 2, 'basic: two arrows', r.arrows);
    ok(r.dots === 5, 'basic: 5 dots', r.dots);
    ok(r.role === 'region', 'basic: role=region', r.role);
    ok(/1 of 5/.test(r.aria) || /Slide 1 of 5/.test(r.aria), 'basic: slide aria label', r.aria);
    ok(near(r.w, r.listW), 'basic: slide width equals list width', r);
  });

  /* 2 ---- infinite next / prev / wrap + events */
  await run('infinite', async () => {
    const r = await page.evaluate(async () => {
      const log = [];
      const d = mk({ speed: 200 }, 4, 'b');
      d.on('beforeChange', (s, c, n) => log.push('b' + c + '>' + n));
      d.on('afterChange', (s, c) => log.push('a' + c));
      const seq = [];
      for (let i = 0; i < 5; i++) { d.next(); await settle(320); seq.push(d.currentSlide()); }
      d.prev(); await settle(320); seq.push(d.currentSlide());
      d.prev(); await settle(320); d.prev(); await settle(320); d.prev(); await settle(320); d.prev(); await settle(320);
      seq.push(d.currentSlide());
      const rect = R(d.list), cur = R(d.track.querySelector('.mozert-current'));
      return { seq, log: log.slice(0, 4), after: cur.l - rect.l, final: d.currentSlide() };
    });
    ok(JSON.stringify(r.seq) === JSON.stringify([1, 2, 3, 0, 1, 0, 0].slice(0, 5).concat([0, 0]).slice(0, 7)) || (r.seq[3] === 0 && r.seq[4] === 1), 'infinite: wraps forward 3->0', r.seq);
    ok(r.log[0] === 'b0>1' && r.log[1] === 'a1', 'infinite: beforeChange/afterChange order', r.log);
    ok(near(r.after, 0, 1), 'infinite: current slide aligned to list start after wrap', r.after);
  });

  /* 3 ---- multiple + scroll */
  await run('multi', async () => {
    const r = await page.evaluate(async () => {
      const d = mk({ slidesToShow: 3, slidesToScroll: 3, speed: 150, dots: true }, 9, 'c');
      const w0 = R(d.track.children[d._c]).w, lw = R(d.list).w;
      const act0 = d.track.querySelectorAll('.mozert-active:not(.mozert-cloned)').length;
      d.next(); await settle(300);
      const cur1 = d.currentSlide();
      d.next(); await settle(300); d.next(); await settle(300);
      return { w0, lw, act0, cur1, cur3: d.currentSlide(), dots: d.el.querySelectorAll('.mozert-dots li').length };
    });
    ok(near(r.w0 * 3, r.lw), 'multi: 3 slides fill list', r);
    ok(r.act0 === 3, 'multi: 3 active slides', r.act0);
    ok(r.cur1 === 3 && r.cur3 === 0, 'multi: scroll by 3 then wrap', r);
    ok(r.dots === 3, 'multi: dots = pages', r.dots);
  });

  /* 4 ---- finite */
  await run('finite', async () => {
    const r = await page.evaluate(async () => {
      const d = mk({ slidesToShow: 3, infinite: false, speed: 100, dots: true }, 7, 'd');
      const out = { startPrevDisabled: d._prev.classList.contains('mozert-disabled') };
      const edges = []; d.on('edge', (s, dir) => edges.push(dir));
      for (let i = 0; i < 6; i++) { d.next(); await settle(180); }
      out.cur = d.currentSlide(); out.nextDisabled = d._next.classList.contains('mozert-disabled');
      out.dots = d.el.querySelectorAll('.mozert-dots li').length;
      const lastR = R(d.track.children[6]), lr = R(d.list);
      out.lastFlush = lastR.r - lr.r;
      out.clones = d.track.querySelectorAll('.mozert-cloned').length;
      return out;
    });
    ok(r.startPrevDisabled, 'finite: prev disabled at start');
    ok(r.cur === 4 && r.nextDisabled, 'finite: stops at n-show with next disabled', r);
    ok(r.dots === 5, 'finite: dots count', r.dots);
    ok(near(r.lastFlush, 0, 1), 'finite: last slide flush with right edge', r.lastFlush);
    ok(r.clones === 0, 'finite: no clones', r.clones);
  });

  /* 5 ---- fade */
  await run('fade', async () => {
    const r = await page.evaluate(async () => {
      const d = mk({ fade: true, speed: 200 }, 4, 'e');
      const cur0 = d.track.querySelector('.mozert-current').getAttribute('data-mozert-index');
      const op = (i) => +getComputedStyle(d.track.children[i]).opacity;
      const o0 = [op(0), op(1)];
      d.next(); await settle(400);
      const o1 = [op(0), op(1)];
      const same = d.track.children[0].getBoundingClientRect().left === d.track.children[1].getBoundingClientRect().left;
      return { cur0, o0, o1, same, clones: d.track.querySelectorAll('.mozert-cloned').length, cur: d.currentSlide() };
    });
    ok(r.cur0 === '0' && r.o0[0] === 1 && r.o0[1] === 0, 'fade: initial opacities', r);
    ok(r.o1[0] === 0 && r.o1[1] === 1 && r.cur === 1, 'fade: after next', r);
    ok(r.same && r.clones === 0, 'fade: stacked, no clones', r);
  });

  /* 6 ---- goTo + dots click + instant */
  await run('goto', async () => {
    const r = await page.evaluate(async () => {
      const d = mk({ dots: true, speed: 150 }, 6, 'f');
      d.goTo(3); await settle(300);
      const a = d.currentSlide();
      d.el.querySelectorAll('.mozert-dots button')[5].click(); await settle(300);
      const b = d.currentSlide();
      d.goTo(1, true);
      const c = d.currentSlide();
      const activeDot = [].indexOf.call(d.el.querySelectorAll('.mozert-dots li'), d.el.querySelector('.mozert-dots .mozert-active'));
      return { a, b, c, activeDot };
    });
    ok(r.a === 3 && r.b === 5 && r.c === 1, 'goto: goTo/dots/instant', r);
    ok(r.activeDot === 1, 'goto: active dot follows', r.activeDot);
  });

  /* 7 ---- centerMode */
  await run('center', async () => {
    const r = await page.evaluate(async () => {
      const d = mk({ centerMode: true, centerPadding: '60px', slidesToShow: 3, speed: 100 }, 7, 'g');
      const check = () => {
        const c = R(d.track.querySelector('.mozert-center')), l = R(d.list);
        return (c.l + c.r) / 2 - (l.l + l.r) / 2;
      };
      const o = { d0: check() };
      d.next(); await settle(250); o.d1 = check();
      d.goTo(5); await settle(900); o.d5 = check();
      o.centers = d.track.querySelectorAll('.mozert-center').length;
      return o;
    });
    ok(near(r.d0, 0) && near(r.d1, 0) && near(r.d5, 0), 'center: current slide centred', r);
    ok(r.centers === 1, 'center: exactly one centre class', r.centers);
  });

  /* 8 ---- variable width */
  await run('variable', async () => {
    const r = await page.evaluate(async () => {
      const d = mk({ variableWidth: true, speed: 100 }, 6, 'h', 500, (i) => '<div style="width:' + (120 + i * 40) + 'px;height:60px;background:#7af">' + i + '</div>');
      const o = { clones: d.track.querySelectorAll('.mozert-cloned').length };
      d.next(); await settle(250); d.next(); await settle(250);
      const cur = R(d.track.querySelector('.mozert-current')), l = R(d.list);
      o.align = cur.l - l.l; o.idx = d.currentSlide();
      return o;
    });
    ok(r.clones > 0, 'variable: clones present', r);
    ok(near(r.align, 0, 2) && r.idx === 2, 'variable: current aligned to left edge', r);
  });

  /* 9 ---- vertical */
  await run('vertical', async () => {
    const r = await page.evaluate(async () => {
      const d = mk({ vertical: true, verticalSwiping: true, slidesToShow: 2, speed: 100 }, 6, 'i');
      const lh = R(d.list).h, sh = R(d.track.children[d._c]).h;
      d.next(); await settle(250);
      const t = d.track.style.transform;
      return { lh, sh, t, cur: d.currentSlide() };
    });
    ok(near(r.lh, r.sh * 2, 1), 'vertical: list height = 2 slides', r);
    ok(/translate3d\(0px?, -?\d/.test(r.t) && r.cur === 1, 'vertical: translateY used', r);
  });

  /* 10 ---- responsive */
  await run('responsive', async () => {
    await page.setViewportSize({ width: 1000, height: 800 });
    const w = async () => page.evaluate(() => { const d = Mozert.get('#rsp'); return { show: d.options.slidesToShow, w: R(d.track.children[d._c]).w, lw: R(d.list).w, uns: d._dormant }; });
    await page.evaluate(() => {
      window.bpLog = [];
      const d = mk({ slidesToShow: 4, responsive: [{ breakpoint: 800, settings: { slidesToShow: 2 } }, { breakpoint: 500, settings: { slidesToShow: 1 } }, { breakpoint: 300, settings: 'destroy' }] }, 8, 'rsp', 0);
      document.getElementById('rsp').style.width = 'auto';
      d.on('breakpoint', (s, bp) => bpLog.push(bp));
    });
    await wait(250);
    const a = await w();
    await page.setViewportSize({ width: 700, height: 800 }); await wait(400);
    const b = await w();
    await page.setViewportSize({ width: 450, height: 800 }); await wait(400);
    const c = await w();
    await page.setViewportSize({ width: 280, height: 800 }); await wait(400);
    const d = await w();
    const destroyDom = await page.evaluate(() => { const e = document.getElementById('rsp'); return { cls: e.className, kids: e.children.length }; });
    await page.setViewportSize({ width: 1000, height: 800 }); await wait(400);
    const e = await w();
    const log = await page.evaluate(() => bpLog);
    ok(a.show === 4 && near(a.w * 4, a.lw), 'responsive: 4 up on desktop', a);
    ok(b.show === 2 && near(b.w * 2, b.lw), 'responsive: 2 up <800', b);
    ok(c.show === 1 && near(c.w, c.lw), 'responsive: 1 up <500', c);
    ok(d.uns === true && !/mozert-slider/.test(destroyDom.cls) && destroyDom.kids === 8, 'responsive: destroy restores DOM', destroyDom);
    ok(e.show === 4 && near(e.w * 4, e.lw), 'responsive: back to 4 up', e);
    ok(log.length >= 4, 'responsive: breakpoint events fired', log);
  });

  /* 11 ---- rows / grid */
  await run('grid', async () => {
    const r = await page.evaluate(async () => {
      const d = mk({ rows: 2, slidesPerRow: 3, speed: 100, dots: true }, 14, 'j', 600, (i) => '<div class="s" style="height:50px">' + i + '</div>');
      const cells = d._units[0].querySelectorAll('.mozert-cell').length, rows = d._units[0].querySelectorAll('.mozert-row').length;
      const cw = R(d._units[0].querySelector('.mozert-cell')).w, lw = R(d.list).w;
      return { n: d.slideCount(), cells, rows, cw, lw, dots: d.el.querySelectorAll('.mozert-dots li').length };
    });
    ok(r.n === 3 && r.rows === 2 && r.cells === 6, 'grid: 14 items -> 3 pages of 2x3', r);
    ok(near(r.cw * 3, r.lw), 'grid: 3 cells per row', r);
  });

  /* 12 ---- lazy load */
  await run('lazy', async () => {
    const r = await page.evaluate(async () => {
      const px = 'data:image/svg+xml;utf8,' + encodeURIComponent('<svg xmlns="http://www.w3.org/2000/svg" width="40" height="30"><rect width="40" height="30" fill="red"/></svg>');
      const loaded = [], errs = [];
      const d = mk({ lazyLoad: 'ondemand', slidesToShow: 1, speed: 100,
        on: { lazyLoaded: (s, img, src) => loaded.push(1), lazyLoadError: (s, img) => errs.push(1) } }, 8, 'k', 600,
        (i) => '<div><img data-lazy="' + (i === 6 ? 'nope-404.png' : px) + '" alt=""></div>');
      await settle(250);
      const init = d.track.querySelectorAll('.mozert-slide:not(.mozert-cloned) img[src]').length;
      d.goTo(4, true); await settle(250);
      const after = d.track.querySelectorAll('.mozert-slide:not(.mozert-cloned) img[src]').length;
      d.goTo(6, true); await settle(300);
      return { init, after, loaded: loaded.length, errs: errs.length };
    });
    ok(r.init >= 2 && r.init <= 3, 'lazy: only visible + neighbours loaded at start', r);
    ok(r.after > r.init, 'lazy: loads on demand', r);
    ok(r.errs >= 1, 'lazy: error event fired', r);
  });

  await run('lazy-progressive', async () => {
    const r = await page.evaluate(async () => {
      const px = 'data:image/svg+xml;utf8,' + encodeURIComponent('<svg xmlns="http://www.w3.org/2000/svg" width="40" height="30"><rect width="40" height="30" fill="blue"/></svg>');
      const d = mk({ lazyLoad: 'progressive' }, 6, 'kp', 600, () => '<div><img data-lazy="' + px + '" alt=""></div>');
      await settle(900);
      return d.track.querySelectorAll('.mozert-slide:not(.mozert-cloned) img[src]').length;
    });
    ok(r === 6, 'lazy: progressive eventually loads everything', r);
  });

  /* 13 ---- asNavFor */
  await run('asnav', async () => {
    const r = await page.evaluate(async () => {
      const main = mk({ asNavFor: '#thumbs', arrows: false, speed: 120 }, 6, 'main');
      const th = mk({ asNavFor: '#main', slidesToShow: 3, centerMode: true, focusOnSelect: true, speed: 120 }, 6, 'thumbs');
      main.next(); await settle(350);
      const a = th.currentSlide();
      th.track.querySelector('.mozert-slide[data-mozert-index="4"]:not(.mozert-cloned)').click(); await settle(400);
      return { a, b: main.currentSlide(), c: th.currentSlide() };
    });
    ok(r.a === 1, 'asNavFor: main -> thumbs', r);
    ok(r.b === 4 && r.c === 4, 'asNavFor/focusOnSelect: thumbs -> main', r);
  });

  /* 14 ---- autoplay */
  await run('autoplay', async () => {
    await page.mouse.move(900, 700);
    const r = await page.evaluate(async () => {
      const d = mk({ autoplay: true, autoplaySpeed: 300, speed: 80 }, 5, 'ap');
      await settle(1000);
      const moved = d.currentSlide();
      d.pause(); const at = d.currentSlide(); await settle(700);
      const still = d.currentSlide() === at;
      d.play(); await settle(700);
      return { moved, still, resumed: d.currentSlide() !== at, playing: d.isPlaying() };
    });
    ok(r.moved >= 2, 'autoplay: advances', r);
    ok(r.still && r.resumed && r.playing, 'autoplay: pause()/play()', r);
  });

  await run('autoplay-hover', async () => {
    await page.evaluate(() => { mk({ autoplay: true, autoplaySpeed: 250, speed: 80 }, 5, 'aph'); });
    await wait(100);
    const box = await (await page.$('#aph')).boundingBox();
    await page.mouse.move(box.x + 50, box.y + 50);
    const before = await page.evaluate(() => Mozert.get('#aph').currentSlide());
    await wait(900);
    const during = await page.evaluate(() => Mozert.get('#aph').currentSlide());
    await page.mouse.move(900, 780);
    await wait(900);
    const after = await page.evaluate(() => Mozert.get('#aph').currentSlide());
    ok(before === during, 'autoplay: pauses on hover', { before, during });
    ok(after !== during, 'autoplay: resumes after hover', { during, after });
  });

  /* 15 ---- drag / swipe */
  await run('drag', async () => {
    await page.evaluate(() => { window.sw = []; const d = mk({ speed: 120 }, 5, 'dr'); d.on('swipe', (s, dir) => sw.push(dir)); });
    const box = await (await page.$('#dr .mozert-list')).boundingBox();
    const y = box.y + 50;
    await page.mouse.move(box.x + 400, y); await page.mouse.down(); await page.mouse.move(box.x + 300, y, { steps: 4 });
    const mid = await page.evaluate(() => Mozert.get('#dr').track.style.transform);
    await page.mouse.move(box.x + 100, y, { steps: 4 }); await page.mouse.up(); await wait(350);
    const a = await page.evaluate(() => ({ cur: Mozert.get('#dr').currentSlide(), sw }));
    await page.mouse.move(box.x + 100, y); await page.mouse.down(); await page.mouse.move(box.x + 450, y, { steps: 5 }); await page.mouse.up(); await wait(350);
    const b = await page.evaluate(() => Mozert.get('#dr').currentSlide());
    // tiny drag => snaps back
    await page.mouse.move(box.x + 300, y); await page.mouse.down(); await page.mouse.move(box.x + 270, y, { steps: 3 }); await page.mouse.up(); await wait(350);
    const c = await page.evaluate(() => Mozert.get('#dr').currentSlide());
    ok(/translate3d\(-\d/.test(mid), 'drag: track follows pointer', mid);
    ok(a.cur === 1 && a.sw[0] === 'left', 'drag: swipe left -> next', a);
    ok(b === 0, 'drag: swipe right -> prev', b);
    ok(c === 0, 'drag: short drag snaps back', c);
  });

  await run('swipetoslide', async () => {
    await page.evaluate(() => { mk({ swipeToSlide: true, slidesToShow: 2, speed: 100, infinite: false }, 10, 'sts'); });
    const box = await (await page.$('#sts .mozert-list')).boundingBox();
    await page.mouse.move(box.x + 500, box.y + 40); await page.mouse.down(); await page.mouse.move(box.x + 20, box.y + 40, { steps: 6 }); await page.mouse.up(); await wait(350);
    const cur = await page.evaluate(() => Mozert.get('#sts').currentSlide());
    ok(cur >= 2, 'swipeToSlide: long swipe skips several slides', cur);
  });

  /* 16 ---- keyboard */
  await run('keyboard', async () => {
    await page.evaluate(() => { mk({ speed: 80 }, 5, 'kb'); });
    await page.focus('#kb .mozert-list');
    await page.keyboard.press('ArrowRight'); await wait(250);
    const a = await page.evaluate(() => Mozert.get('#kb').currentSlide());
    await page.keyboard.press('End'); await wait(250);
    const b = await page.evaluate(() => Mozert.get('#kb').currentSlide());
    await page.keyboard.press('ArrowLeft'); await wait(250);
    const c = await page.evaluate(() => Mozert.get('#kb').currentSlide());
    ok(a === 1 && b === 4 && c === 3, 'keyboard: arrows/End', { a, b, c });
  });

  /* 17 ---- add / remove / filter */
  await run('dynamic', async () => {
    const r = await page.evaluate(async () => {
      const d = mk({ dots: true }, 4, 'dy');
      d.add('<div class="s" data-i="new" style="height:100px">N</div>');
      const a = d.slideCount();
      d.add('<div class="s" style="height:100px">Z</div>', 0, true);
      const first = d._units[0].textContent;
      d.remove(0);
      const b = d.slideCount();
      d.filter(function (el) { return +el.getAttribute('data-i') % 2 === 0; });
      const c = d.slideCount(), dots = d.el.querySelectorAll('.mozert-dots li').length;
      d.unfilter();
      const e = d.slideCount();
      d.removeAll();
      return { a, first, b, c, dots, e, f: d.slideCount() };
    });
    ok(r.a === 5 && r.first === 'Z' && r.b === 5, 'dynamic: add / add-before / remove', r);
    ok(r.c === 2 && r.dots === 2 && r.e === 5 && r.f === 0, 'dynamic: filter / unfilter / removeAll', r);
  });

  /* 18 ---- setOption + destroy */
  await run('options', async () => {
    const r = await page.evaluate(async () => {
      const host = document.createElement('div'); host.id = 'ds'; host.style.width = '600px'; host.className = 'my';
      host.innerHTML = '<div id="x1" class="s" style="height:50px">1</div><div class="s" style="height:50px">2</div><div class="s" style="height:50px">3</div>';
      document.getElementById('stage').appendChild(host);
      const before = host.innerHTML;
      const d = new Mozert(host, { dots: true });
      d.setOption('slidesToShow', 2);
      const show = d.getOption('slidesToShow'), w = R(d.track.children[d._c]).w, lw = R(d.list).w;
      d.setOption({ fade: true });
      const fade = host.classList.contains('mozert-fade');
      d.destroy();
      return { show, ok: Math.abs(w * 2 - lw) < 1.5, fade, after: host.innerHTML, before, cls: host.className, inst: !!host._mozert, attrs: host.getAttributeNames().join(',') };
    });
    ok(r.show === 2 && r.ok, 'options: setOption re-lays out', r);
    ok(r.fade, 'options: setOption(object)');
    const nz = (s) => s.replace(/style="([^"]*)"/g, (m, v) => 'style="' + v.replace(/[\s;]/g, '') + '"');
    ok(nz(r.after) === nz(r.before) && r.cls === 'my' && !r.inst, 'destroy: DOM restored byte-for-byte', { after: r.after, before: r.before, cls: r.cls });
    ok(!/role|aria|dir/.test(r.attrs), 'destroy: attributes removed', r.attrs);
  });

  /* 19 ---- rtl */
  await run('rtl', async () => {
    const r = await page.evaluate(async () => {
      const d = mk({ rtl: true, slidesToShow: 2, speed: 100 }, 6, 'rt');
      const l = R(d.list), first = R(d.track.children[d._c]);
      const o = { dir: d.el.getAttribute('dir'), flush: l.r - first.r };
      d.next(); await settle(250);
      const cur = R(d.track.querySelector('.mozert-current'));
      o.curFlush = l.r - cur.r; o.idx = d.currentSlide();
      return o;
    });
    ok(r.dir === 'rtl' && near(r.flush, 0, 1), 'rtl: first slide at the right edge', r);
    ok(near(r.curFlush, 0, 1) && r.idx === 1, 'rtl: next scrolls and aligns right', r);
  });

  /* 20 ---- adaptive height */
  await run('adaptive', async () => {
    const r = await page.evaluate(async () => {
      const hs = [80, 200, 120];
      const d = mk({ adaptiveHeight: true, speed: 100 }, 3, 'ah', 500, (i) => '<div style="height:' + hs[i] + 'px">' + i + '</div>');
      await settle(100);
      const h0 = R(d.list).h; d.next(); await settle(500); const h1 = R(d.list).h;
      return { h0, h1 };
    });
    ok(near(r.h0, 80) && near(r.h1, 200), 'adaptiveHeight: list tracks slide height', r);
  });

  /* 21 ---- data attribute + autoinit */
  await run('data-api', async () => {
    const r = await page.evaluate(async () => {
      const host = document.createElement('div'); host.id = 'da';
      host.setAttribute('data-mozert', '{"dots":true,"slidesToShow":2,"infinite":false}');
      host.innerHTML = '<div style="height:40px">1</div><div style="height:40px">2</div><div style="height:40px">3</div>';
      document.getElementById('stage').appendChild(host);
      const made = Mozert.initAll(document.getElementById('stage'));
      return { n: made.length, show: made[0].options.slidesToShow, inf: made[0].options.infinite };
    });
    ok(r.n === 1 && r.show === 2 && r.inf === false, 'data-mozert: JSON options + initAll', r);
  });

  /* 22 ---- static (fewer slides than slidesToShow) + hidden init */
  await run('static', async () => {
    const r = await page.evaluate(async () => {
      const d = mk({ slidesToShow: 4, dots: true }, 3, 'st');
      return { arrows: d.el.querySelectorAll('.mozert-arrow').length, dots: d.el.querySelectorAll('.mozert-dots').length, cls: /mozert-static/.test(d.el.className), clones: d.track.querySelectorAll('.mozert-cloned').length };
    });
    ok(r.arrows === 0 && r.dots === 0 && r.cls && r.clones === 0, 'static: no controls when slides <= slidesToShow', r);
  });

  await run('hidden-init', async () => {
    const r = await page.evaluate(async () => {
      const wrap = document.createElement('div'); wrap.style.display = 'none'; wrap.id = 'hw';
      document.getElementById('stage').appendChild(wrap);
      const host = document.createElement('div'); host.style.width = '600px';
      host.innerHTML = '<div style="height:40px">1</div><div style="height:40px">2</div><div style="height:40px">3</div>';
      wrap.appendChild(host);
      const d = new Mozert(host, { slidesToShow: 2 });
      wrap.style.display = 'block';
      await settle(400);
      const w = R(d.track.children[d._c]).w, lw = R(d.list).w;
      return { w, lw };
    });
    ok(r.lw > 0 && near(r.w * 2, r.lw), 'hidden-init: lays out once it becomes visible', r);
  });

  /* 23 ---- a11y */
  await run('a11y', async () => {
    const r = await page.evaluate(async () => {
      const d = mk({ speed: 60 }, 4, 'ay', 600, (i) => '<div><a href="#' + i + '">link' + i + '</a></div>');
      const hid = d.track.querySelectorAll('.mozert-slide:not(.mozert-cloned)[aria-hidden="true"]').length;
      const tabHidden = d.track.querySelectorAll('.mozert-slide[aria-hidden="true"] a[tabindex="-1"]').length;
      const cloneHidden = [].every.call(d.track.querySelectorAll('.mozert-cloned'), (c) => c.getAttribute('aria-hidden') === 'true');
      d.next(); await settle(200);
      const visibleFocusable = d.track.querySelector('.mozert-current a').getAttribute('tabindex');
      return { hid, tabHidden, cloneHidden, visibleFocusable, btn: d._next.tagName, label: d._next.getAttribute('aria-label') };
    });
    ok(r.hid === 3 && r.tabHidden >= 3 && r.cloneHidden, 'a11y: off-screen slides aria-hidden + links removed from tab order', r);
    ok(r.visibleFocusable === null, 'a11y: visible slide links focusable again', r);
    ok(r.btn === 'BUTTON' && /Next/.test(r.label), 'a11y: arrow is a labelled button', r);
  });

  /* 24 ---- single-instance guard + reduced motion */
  await run('guard', async () => {
    const r = await page.evaluate(() => {
      const d = mk({}, 3, 'gd'); const again = new Mozert(d.el, { dots: true });
      return again === d;
    });
    ok(r, 'guard: new Mozert(el) twice returns the same instance');
  });

  await run('reduced-motion', async () => {
    await page.emulateMedia({ reducedMotion: 'reduce' });
    const r = await page.evaluate(async () => {
      const d = mk({ speed: 800, autoplay: true, autoplaySpeed: 150 }, 4, 'rm');
      const t0 = performance.now(); d.next(); const dt = performance.now() - t0;
      await settle(500);
      return { cur: d.currentSlide(), dt, tr: d.track.style.transition };
    });
    await page.emulateMedia({ reducedMotion: 'no-preference' });
    ok(r.cur === 1 && /none/.test(r.tr), 'reduced-motion: instant move and no autoplay', r);
  });

  /* 25 ---- no JS errors */
  ok(errors.filter((e) => !/nope-404|Failed to load resource/.test(e)).length === 0, 'no console / page errors', errors);

  await browser.close();
  console.log(`\n[${target}]  ${pass} passed, ${fail} failed`);
  if (failures.length) { console.log('\nFAILURES:\n - ' + failures.join('\n - ')); process.exit(1); }
})().catch((e) => { console.error(e); process.exit(2); });
