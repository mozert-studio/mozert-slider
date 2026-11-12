// Tests for thumbs, lightbox and scrollDriven. Usage: node tests/features.cjs [dist/mozert.js]
const { chromium } = require('playwright');
const path = require('path');
const root = path.join(__dirname, '..');
const target = process.argv[2] || 'dist/mozert.js';
let pass = 0, fail = 0; const failures = [];
const ok = (c, n, x) => { if (c) pass++; else { fail++; failures.push(n + (x !== undefined ? ' -> ' + JSON.stringify(x) : '')); } };
const svg = (c) => 'data:image/svg+xml;utf8,' + encodeURIComponent('<svg xmlns="http://www.w3.org/2000/svg" width="400" height="300"><rect width="400" height="300" fill="' + c + '"/></svg>');
const wait = (ms) => new Promise((r) => setTimeout(r, ms));

(async () => {
  const browser = await chromium.launch();
  const page = await (await browser.newContext({ viewport: { width: 1000, height: 700 } })).newPage();
  const errs = []; page.on('pageerror', (e) => errs.push(e.message)); page.on('console', (m) => { if (m.type() === 'error') errs.push(m.text()); });
  await page.setContent('<body style="margin:0"><div id="stage" style="width:600px;margin:20px"></div></body>');
  await page.addStyleTag({ path: path.join(root, 'dist/mozert.css') });
  await page.addScriptTag({ path: path.join(root, target) });
  const colors = ['#e33', '#3a3', '#33e', '#ea3', '#a3e', '#3ae'];
  await page.evaluate(([c, u]) => {
    window.U = u; window.COL = c;
    window.mkHtml = (id, withImg) => '<div id="' + id + '">' + c.map((x, i) => withImg ? '<div><img src="' + u[i] + '" alt="pic ' + (i + 1) + '" data-caption="Caption ' + (i + 1) + '"></div>' : '<div style="height:120px;background:' + x + '">' + (i + 1) + '</div>').join('') + '</div>';
  }, [colors, colors.map(svg)]);
  const tick = (ms) => page.waitForTimeout(ms);

  /* ---------------- thumbs ---------------- */
  // 1. thumbs:true creates a strip from images, click syncs main, main syncs highlight
  let r = await page.evaluate(async () => {
    const st = document.getElementById('stage');
    st.innerHTML = mkHtml('t1', true);
    const m = new Mozert('#t1', { thumbs: true, thumbs_: 1 });
    await new Promise((r) => setTimeout(r, 300));
    const strip = document.querySelector('.mozert-thumbs');
    const out = { hasStrip: !!strip, nextToMain: strip && strip.previousElementSibling === document.getElementById('t1') };
    const slides = strip.querySelectorAll('.mozert-slide:not(.mozert-cloned)');
    out.thumbCount = slides.length;
    out.hasImgs = strip.querySelectorAll('img.mozert-thumb').length === 6;
    slides[3].click(); await new Promise((r) => setTimeout(r, 700));
    out.afterClick = m.current;
    out.hi1 = Array.from(strip.querySelectorAll('.mozert-slide')).findIndex((e) => e.classList.contains('mozert-current'));
    m.goTo(5); await new Promise((r) => setTimeout(r, 700));
    out.afterGo = m.current;
    out.hi2 = Array.from(strip.querySelectorAll('.mozert-slide')).findIndex((e) => e.classList.contains('mozert-current'));
    m.destroy();
    out.cleaned = !document.querySelector('.mozert-thumbs');
    out.asNav = m.s.asNavFor;
    return out;
  });
  ok(r.hasStrip && r.nextToMain, 'thumbs:true creates strip below main', r);
  ok(r.thumbCount === 6 && r.hasImgs, 'thumbs auto-filled from images', r);
  ok(r.afterClick === 3 && r.hi1 === 3, 'thumb click opens that slide and highlights it', r);
  ok(r.afterGo === 5 && r.hi2 === 5, 'main change highlights thumb (last one, strip clamped)', r);
  ok(r.cleaned, 'destroy removes created strip', r);

  // 2. thumbs: '#nav' with existing empty container, filled from backgrounds; add/remove rebuild
  r = await page.evaluate(async () => {
    const st = document.getElementById('stage');
    st.innerHTML = mkHtml('t2', false) + '<div id="nav" style="margin-top:8px"></div>';
    const m = new Mozert('#t2', { thumbs: '#nav' });
    await new Promise((r) => setTimeout(r, 300));
    const n0 = document.querySelectorAll('#nav .mozert-slide:not(.mozert-cloned)').length;
    const fill = document.querySelector('#nav .mozert-thumb-fill');
    const out = { n0, fillBg: !!fill && fill.style.background !== '', label: fill && fill.textContent };
    m.remove(0); await new Promise((r) => setTimeout(r, 400));
    out.n1 = document.querySelectorAll('#nav .mozert-slide:not(.mozert-cloned)').length;
    m.goTo(2); await new Promise((r) => setTimeout(r, 600));
    out.hi = Array.from(document.querySelectorAll('#nav .mozert-slide')).findIndex((e) => e.classList.contains('mozert-current'));
    m.destroy();
    out.empty = document.getElementById('nav').children.length;
    return out;
  });
  ok(r.n0 === 6 && r.fillBg && r.label === '1', 'thumbs:"#nav" fills empty strip from backgrounds', r);
  ok(r.n1 === 5, 'thumbs follow remove()', r);
  ok(r.hi === 2, 'highlight after remove + goTo', r);
  ok(r.empty === 0, 'destroy empties the auto-filled strip, keeps container', r);

  // 3. thumbs with user-built strip is left untouched
  r = await page.evaluate(async () => {
    const st = document.getElementById('stage');
    st.innerHTML = mkHtml('t3', true) + '<div id="nav3"><div>a</div><div>b</div><div>c</div><div>d</div><div>e</div><div>f</div></div>';
    const m = new Mozert('#t3', { thumbs: { el: '#nav3', count: 3 } });
    await new Promise((r) => setTimeout(r, 300));
    const out = { kept: document.querySelectorAll('#nav3 .mozert-slide:not(.mozert-cloned)').length };
    document.querySelectorAll('#nav3 .mozert-slide')[4].click(); await new Promise((r) => setTimeout(r, 700));
    out.cur = m.current;
    m.destroy();
    out.after = document.getElementById('nav3').children.length;
    return out;
  });
  ok(r.kept === 6 && r.cur === 4 && r.after === 6, 'custom thumbs strip works and survives destroy', r);

  // 4. strip that shows every thumbnail (nothing to scroll) still syncs both ways
  r = await page.evaluate(async () => {
    const st = document.getElementById('stage');
    st.innerHTML = mkHtml('t4', true).replace(/<div><img[^>]*pic 5[^]*?<\/div>/, '').replace(/<div><img[^>]*pic 6[^]*?<\/div>/, '');
    const m = new Mozert('#t4', { thumbs: { count: 5 } });
    await new Promise((r) => setTimeout(r, 300));
    const th = document.querySelector('.mozert-thumbs')._mozert;
    const out = { n: m.n, static: !th.canNav };
    const hi = () => Array.from(document.querySelectorAll('.mozert-thumbs .mozert-slide')).findIndex((e) => e.classList.contains('mozert-current'));
    document.querySelectorAll('.mozert-thumbs .mozert-slide')[2].click(); await new Promise((r) => setTimeout(r, 600));
    out.cur = m.current; out.hi = hi();
    m.goTo(3); await new Promise((r) => setTimeout(r, 600));
    out.hi2 = hi();
    m.goTo(0); await new Promise((r) => setTimeout(r, 600));
    out.hi3 = hi();
    m.destroy();
    return out;
  });
  ok(r.n === 4 && r.static && r.cur === 2 && r.hi === 2 && r.hi2 === 3 && r.hi3 === 0, 'thumbs strip with nothing to scroll still syncs both ways', r);

  /* ---------------- lightbox ---------------- */
  r = await page.evaluate(async () => {
    const st = document.getElementById('stage');
    st.innerHTML = mkHtml('l1', true);
    const m = new Mozert('#l1', { lightbox: true, slidesToShow: 1 });
    await new Promise((r) => setTimeout(r, 300));
    const out = {};
    m.getSlides()[0].querySelector('img').click();
    await new Promise((r) => setTimeout(r, 300));
    const lb = document.querySelector('.mozert-lb');
    out.open = !!lb && lb.getAttribute('role') === 'dialog' && lb.getAttribute('aria-modal') === 'true';
    out.count = lb && lb.querySelector('.mozert-lb-count').textContent;
    out.cap = lb && lb.querySelector('.mozert-lb-cap').textContent;
    out.imgSrc = lb && lb.querySelector('.mozert-lb-img').getAttribute('src') === U[0];
    out.focus = document.activeElement && document.activeElement.className;
    out.lock = document.documentElement.classList.contains('mozert-lb-open');
    lb.querySelector('.mozert-lb-next').click(); await new Promise((r) => setTimeout(r, 100));
    out.count2 = lb.querySelector('.mozert-lb-count').textContent;
    document.dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowLeft', bubbles: true }));
    document.dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowLeft', bubbles: true }));
    out.loopCount = lb.querySelector('.mozert-lb-count').textContent; // 1 -> 6 (loop)
    const im = lb.querySelector('.mozert-lb-img');
    im.click(); out.zoomed = lb.classList.contains('mozert-lb-zoomed') && im.style.transform.indexOf('scale') > -1;
    lb.querySelector('.mozert-lb-zoom').click(); out.unzoomed = !lb.classList.contains('mozert-lb-zoomed');
    // zoom resets on next image
    im.click(); lb.querySelector('.mozert-lb-next').click();
    out.resetZoom = !lb.classList.contains('mozert-lb-zoomed');
    // Tab trap: tab from last button wraps to first
    const btns = Array.from(lb.querySelectorAll('button:not([disabled])'));
    btns[btns.length - 1].focus();
    const ev = new KeyboardEvent('keydown', { key: 'Tab', bubbles: true, cancelable: true }); document.dispatchEvent(ev);
    out.trap = document.activeElement === btns[0] && ev.defaultPrevented;
    // close with Escape, main follows
    const idx = parseInt(lb.querySelector('.mozert-lb-count').textContent, 10) - 1;
    document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true }));
    await new Promise((r) => setTimeout(r, 400));
    out.closed = !document.querySelector('.mozert-lb') && !document.documentElement.classList.contains('mozert-lb-open');
    out.mainFollows = m.current === idx;
    out.idx = idx;
    out.api = typeof m.lightbox.open === 'function';
    m.lightbox.open(2); await new Promise((r) => setTimeout(r, 100));
    out.apiOpen = m.lightbox.isOpen && document.querySelector('.mozert-lb-count').textContent === '3 / 6';
    m.destroy();
    out.destroyClosed = !document.querySelector('.mozert-lb');
    return out;
  });
  ok(r.open && r.count === '1 / 6' && r.cap === 'Caption 1' && r.imgSrc, 'lightbox opens with image, counter, caption', r);
  ok(r.focus === 'mozert-lb-close' && r.lock, 'lightbox focuses close button and locks page scroll', r);
  ok(r.count2 === '2 / 6' && r.loopCount === '6 / 6', 'lightbox next/prev and loop', r);
  ok(r.zoomed && r.unzoomed && r.resetZoom, 'lightbox zoom toggle and reset', r);
  ok(r.trap, 'lightbox traps Tab focus', r);
  ok(r.closed && r.mainFollows, 'Esc closes; main slider moves to last viewed image', r);
  ok(r.api && r.apiOpen && r.destroyClosed, 'lightbox JS API and destroy', r);

  // click after a drag must not open; link image uses href; no-image slides show a copy
  r = await page.evaluate(async () => {
    const st = document.getElementById('stage');
    st.innerHTML = '<div id="l2"><div><a href="' + U[1] + '"><img src="' + U[0] + '" alt="x"></a></div><div><a href="https://example.com/page">link</a></div><div style="height:100px;background:#f80">no image</div></div>';
    const m = new Mozert('#l2', { lightbox: { loop: false }, slidesToShow: 1 });
    await new Promise((r) => setTimeout(r, 300));
    const out = {};
    m.getSlides()[0].querySelector('img').click(); await new Promise((r) => setTimeout(r, 200));
    out.href = document.querySelector('.mozert-lb-img') && document.querySelector('.mozert-lb-img').getAttribute('src') === U[1];
    out.prevDisabled = document.querySelector('.mozert-lb-prev').disabled;
    m.lightbox.close(); await new Promise((r) => setTimeout(r, 300));
    m.getSlides()[1].querySelector('a').addEventListener('click', (e) => e.preventDefault());
    m.getSlides()[1].querySelector('a').click(); await new Promise((r) => setTimeout(r, 200));
    out.normalLinkIgnored = !document.querySelector('.mozert-lb');
    m.getSlides()[2].click(); await new Promise((r) => setTimeout(r, 200));
    out.clone = !!document.querySelector('.mozert-lb-clone') && document.querySelector('.mozert-lb-clone').textContent.trim() === 'no image';
    out.nextDisabled = document.querySelector('.mozert-lb-next').disabled;
    m.destroy();
    return out;
  });
  ok(r.href && r.prevDisabled, 'lightbox uses image-link href; no loop disables prev on first', r);
  ok(r.normalLinkIgnored, 'ordinary links inside slides do not open lightbox', r);
  ok(r.clone && r.nextDisabled, 'slides without images open as a larger copy; no loop disables next on last', r);

  // real mouse: drag does not open, click opens
  await page.evaluate(() => { document.getElementById('stage').innerHTML = mkHtml('l3', true); window.L3 = new Mozert('#l3', { lightbox: true, slidesToShow: 1 }); });
  await tick(300);
  const box = await page.locator('#l3').boundingBox();
  await page.mouse.move(box.x + 300, box.y + 80); await page.mouse.down(); await page.mouse.move(box.x + 100, box.y + 80, { steps: 8 }); await page.mouse.up(); await tick(500);
  ok(await page.evaluate(() => !document.querySelector('.mozert-lb') && L3.current === 1), 'dragging a slide does not open the lightbox but slides', await page.evaluate(() => L3.current));
  await page.mouse.click(box.x + 300, box.y + 80); await tick(300);
  ok(await page.evaluate(() => !!document.querySelector('.mozert-lb')), 'real click opens lightbox');
  await page.screenshot({ path: process.env.SHOT_LB || '/tmp/lb.png' });
  await page.keyboard.press('Escape'); await tick(300);
  await page.evaluate(() => L3.destroy());

  // thumbs + lightbox together
  r = await page.evaluate(async () => {
    document.getElementById('stage').innerHTML = mkHtml('c1', true);
    const m = new Mozert('#c1', { thumbs: true, lightbox: true });
    await new Promise((r) => setTimeout(r, 300));
    m.getSlides()[0].querySelector('img').click(); await new Promise((r) => setTimeout(r, 200));
    const out = { lbOpen: !!document.querySelector('.mozert-lb') };
    document.querySelector('.mozert-lb-next').click(); document.querySelector('.mozert-lb-next').click();
    m.lightbox.close(); await new Promise((r) => setTimeout(r, 700));
    out.cur = m.current;
    out.hi = Array.from(document.querySelectorAll('.mozert-thumbs .mozert-slide')).findIndex((e) => e.classList.contains('mozert-current'));
    // thumb strip must never open its own lightbox
    out.thumbLb = !!document.querySelector('.mozert-thumbs.mozert-has-lightbox');
    m.destroy();
    return out;
  });
  ok(r.lbOpen && r.cur === 2 && r.hi === 2 && !r.thumbLb, 'thumbs and lightbox work together and stay in sync', r);

  /* ---------------- scrollDriven ---------------- */
  r = await page.evaluate(async () => {
    document.body.insertAdjacentHTML('afterbegin', '<div id="before" style="height:600px"></div>');
    const st = document.getElementById('stage');
    st.innerHTML = mkHtml('s1', false);
    st.insertAdjacentHTML('afterend', '<div id="after" style="height:1500px"></div>');
    const m = new Mozert('#s1', { scrollDriven: { step: 300 }, slidesToShow: 2, infinite: false, arrows: false, dots: false });
    await new Promise((r) => setTimeout(r, 300));
    const out = { wrapped: !!document.querySelector('.mozert-sd > #s1') };
    const wrap = document.querySelector('.mozert-sd');
    out.height = wrap.offsetHeight > m.maxIndex * 300;
    const top = wrap.getBoundingClientRect().top + scrollY;
    const log = [];
    for (const dy of [0, 150, 300, 450, 900, 1200, 2000]) {
      scrollTo(0, top + dy); await new Promise((r) => setTimeout(r, 80));
      const r1 = document.getElementById('s1').getBoundingClientRect();
      log.push({ dy, cur: m.current, sticky: Math.round(r1.top) });
    }
    out.log = log;
    out.sticky = log.slice(0, 5).every((l) => l.sticky === 0);
    out.mono = log.every((l, i) => i === 0 || l.cur >= log[i - 1].cur);
    out.ends = log[0].cur === 0 && log[log.length - 1].cur === m.maxIndex;
    // continuous: between two steps the track sits between the two positions
    scrollTo(0, top + 150); await new Promise((r) => setTimeout(r, 80));
    const tr = new DOMMatrix(getComputedStyle(m.track).transform).m41;
    out.between = Math.abs(tr) > 0 && Math.abs(tr) < Math.abs(m._pos(1)) + 1 && Math.abs(tr) > Math.abs(m._pos(0));
    m.destroy();
    out.unwrapped = !document.querySelector('.mozert-sd') && document.getElementById('s1') && document.getElementById('s1').parentNode.id === 'stage';
    return out;
  });
  ok(r.wrapped && r.height, 'scrollDriven wraps slider in a tall section', r);
  ok(r.sticky && r.mono && r.ends, 'scrollDriven: sticks while scrolling, moves forward, reaches the end', r.log);
  ok(r.between, 'scrollDriven moves smoothly between slides', r);
  ok(r.unwrapped, 'scrollDriven destroy restores the DOM', r);

  // vertical gallery: main left, thumbs right, same height, survives a refresh/resize
  for (const pos of ['right', 'left']) {
    r = await page.evaluate(async (pos) => {
      const st = document.getElementById('stage');
      st.innerHTML = mkHtml('v1', true);
      const m = new Mozert('#v1', { thumbs: { position: pos, count: 4 }, arrows: false, dots: false });
      await new Promise((r) => setTimeout(r, 300));
      const g = document.querySelector('.mozert-gallery');
      const strip = g && g.querySelector('[data-mozert-thumbs]');
      const o = { wrapped: !!g, cls: g && g.className };
      if (strip) {
        const a = m.el.getBoundingClientRect(), t = strip.getBoundingClientRect();
        o.sideOk = pos === 'right' ? t.left >= a.right - 1 : t.right <= a.left + 1;
        o.sameH = Math.abs(a.height - t.height) < 2;
        o.vertical = strip.classList.contains('mozert-vertical');
        o.rows = strip.querySelectorAll('.mozert-slide').length;
        const sl = [...strip.querySelectorAll('.mozert-slide')].slice(0, 4).map((e) => e.getBoundingClientRect());
        o.stacked = sl.every((b, i) => i === 0 || b.top > sl[i - 1].top);
        o.fills = Math.abs(sl[3].bottom - t.bottom) < 3;
        strip.querySelectorAll('.mozert-slide')[4].click();
        await new Promise((r) => setTimeout(r, 500));
        o.afterClick = m.current;
        m.goTo(5);
        await new Promise((r) => setTimeout(r, 600));
        const cur = strip.querySelector('.mozert-current').getBoundingClientRect(), tb = strip.getBoundingClientRect();
        o.curInView = cur.top >= tb.top - 4 && cur.bottom <= tb.bottom + 4;
        m.refresh();
        await new Promise((r) => setTimeout(r, 300));
        const s2 = document.querySelector('.mozert-gallery [data-mozert-thumbs]');
        o.attrKept = !!s2 && s2.getAttribute('data-mozert-thumbs') === pos && document.querySelectorAll('.mozert-gallery').length === 1;
        o.sameHAfter = !!s2 && Math.abs(m.el.getBoundingClientRect().height - s2.getBoundingClientRect().height) < 2;
      }
      m.destroy();
      o.cleaned = !document.querySelector('.mozert-gallery') && document.getElementById('v1') && document.getElementById('v1').parentNode.id === 'stage';
      return o;
    }, pos);
    ok(r.wrapped && r.sideOk && r.vertical, 'vertical gallery: thumbs on the ' + pos, r);
    ok(r.sameH && r.stacked && r.fills, 'vertical gallery: strip height matches main, thumbs stacked', r);
    ok(r.afterClick === 4 && r.curInView, 'vertical gallery: click + sync scroll the strip', r);
    ok(r.attrKept && r.sameHAfter, 'vertical gallery survives refresh()', r);
    ok(r.cleaned, 'vertical gallery: destroy unwraps the slider', r);
  }

  // thumbs: clicking ANY visible thumb moves the main slider, whatever the strip's scroll position (strip at its last page too)
  for (const pos of ['bottom', 'right']) {
    r = await page.evaluate(async (pos) => {
      const st = document.getElementById('stage');
      st.innerHTML = mkHtml('c1', true);
      const m = new Mozert('#c1', { thumbs: { position: pos, count: 3 }, arrows: false, dots: false });
      await new Promise((r) => setTimeout(r, 300));
      const bad = [];
      let tried = 0;
      for (let start = 0; start < 6; start++) {
        for (let k = 0; k < 6; k++) {
          m.goTo(start);
          await new Promise((r) => setTimeout(r, 380));
          const strip = document.querySelector('[data-mozert-thumbs]');
          const t = strip.getBoundingClientRect();
          const vis = [...strip.querySelectorAll('.mozert-slide:not(.mozert-cloned)')].filter((x) => {
            const b = x.getBoundingClientRect();
            return b.left >= t.left - 2 && b.right <= t.right + 2 && b.top >= t.top - 2 && b.bottom <= t.bottom + 2;
          });
          const e = vis[k];
          if (!e) continue;
          const idx = +e.getAttribute('data-mozert-index');
          const b = e.getBoundingClientRect();
          e.dispatchEvent(new MouseEvent('click', { bubbles: true, clientX: b.left + 5, clientY: b.top + 5 }));
          await new Promise((r) => setTimeout(r, 380));
          tried++;
          if (m.current !== idx) bad.push({ start, idx, got: m.current });
        }
      }
      m.destroy();
      return { bad, tried };
    }, pos);
    ok(r.tried >= 18 && r.bad.length === 0, 'thumbs (' + pos + '): every visible thumb is clickable at every strip position', r);
  }

  // vertical gallery drops below the picture on narrow screens and comes back
  r = await page.evaluate(async () => {
    document.getElementById('stage').innerHTML = mkHtml('mb', true);
    window.MB = new Mozert('#mb', { thumbs: { position: 'right', count: 4, breakpoint: 640 }, arrows: false, dots: false });
    await new Promise((r) => setTimeout(r, 300));
    return { wide: !!document.querySelector('.mozert-gallery') };
  });
  await page.setViewportSize({ width: 560, height: 700 });
  await tick(500);
  const narrow = await page.evaluate(async () => {
    MB.goTo(3);
    await new Promise((r) => setTimeout(r, 400));
    const th = document.querySelector('[data-mozert-thumbs]');
    const a = MB.el.getBoundingClientRect(), t = th.getBoundingClientRect();
    return { gallery: !!document.querySelector('.mozert-gallery'), pos: th.getAttribute('data-mozert-thumbs'), below: t.top >= a.bottom - 1, full: Math.abs(t.width - a.width) < 2, vertical: th.classList.contains('mozert-vertical'), cur: MB.current, one: document.querySelectorAll('[data-mozert-thumbs]').length };
  });
  await page.setViewportSize({ width: 1000, height: 700 });
  await tick(500);
  const back = await page.evaluate(async () => {
    const th = document.querySelector('[data-mozert-thumbs]');
    const a = MB.el.getBoundingClientRect(), t = th.getBoundingClientRect();
    const o = { gallery: !!document.querySelector('.mozert-gallery'), pos: th.getAttribute('data-mozert-thumbs'), side: t.left >= a.right - 1, cur: MB.current, one: document.querySelectorAll('[data-mozert-thumbs]').length };
    MB.destroy();
    o.clean = !document.querySelector('.mozert-gallery') && !document.querySelector('[data-mozert-thumbs]');
    return o;
  });
  ok(r.wide, 'vertical gallery starts side by side on a wide screen', r);
  ok(!narrow.gallery && narrow.pos === 'bottom' && narrow.below && narrow.full && !narrow.vertical && narrow.cur === 3 && narrow.one === 1, 'vertical gallery moves below the picture on a phone, keeps the slide', narrow);
  ok(back.gallery && back.pos === 'right' && back.side && back.cur === 3 && back.one === 1 && back.clean, 'vertical gallery returns to the side when the screen widens; destroy is clean', back);

  // lightbox zoom button works for pictures AND for slides without images
  for (const withImg of [true, false]) {
    r = await page.evaluate(async (withImg) => {
      document.getElementById('stage').innerHTML = mkHtml('lz', withImg);
      const m = new Mozert('#lz', { lightbox: true, slidesToShow: 1 });
      m.lightbox.open(1);
      await new Promise((r) => setTimeout(r, 400));
      const z = () => (document.querySelector('.mozert-lb-img,.mozert-lb-clone') || { style: {} }).style.transform;
      const o = { start: z() };
      document.querySelector('.mozert-lb-zoom').click();
      await new Promise((r) => setTimeout(r, 100));
      o.on = z();
      o.cls = document.querySelector('.mozert-lb').classList.contains('mozert-lb-zoomed');
      document.querySelector('.mozert-lb-zoom').click();
      await new Promise((r) => setTimeout(r, 100));
      o.off = z();
      document.querySelector('.mozert-lb-zoom').click();
      m.lightbox.close();
      await new Promise((r) => setTimeout(r, 300));
      m.lightbox.open(2);
      await new Promise((r) => setTimeout(r, 300));
      o.resetOnOpen = z();
      m.destroy();
      return o;
    }, withImg);
    ok(r.start === '' && /scale\(2\.5\)/.test(r.on) && r.cls && r.off === '' && r.resetOnOpen === '', 'lightbox zoom button toggles zoom (' + (withImg ? 'image' : 'slide without image') + ')', r);
  }

  // magnifier
  await page.evaluate(() => {
    const col = ['#e33', '#3a3', '#33e'];
    document.getElementById('stage').innerHTML = '<div id="mg">' + col.map((c, i) => '<div><img src="' + U[i] + '" data-zoom="' + U[(i + 1) % 3] + '" alt="p' + i + '"></div>').join('') + '</div>';
    window.MG = new Mozert('#mg', { magnifier: { zoom: 2 }, slidesToShow: 1, arrows: false, dots: false });
  });
  await tick(300);
  await page.evaluate(() => { window.scrollTo(0, 0); document.getElementById('mg').scrollIntoView({ block: 'center' }); });
  await tick(200);
  const mgb = await page.evaluate(() => { const r = document.getElementById('mg').getBoundingClientRect(); return [r.left, r.top, r.width, r.height]; });
  const mgState = () => page.evaluate(() => { const n = document.querySelector('#mg .mozert-mag-node'); return { node: !!n, tf: n ? n.style.transform : '', org: n ? n.style.transformOrigin : '', on: MG.magnifier.isOn() }; });
  r = await page.evaluate(() => ({ btn: !!document.querySelector('#mg .mozert-mag-btn'), pressed: document.querySelector('#mg .mozert-mag-btn').getAttribute('aria-pressed'), api: typeof MG.magnifier.toggle, label: document.querySelector('#mg .mozert-mag-btn').getAttribute('aria-label') }));
  ok(r.btn && r.pressed === 'false' && r.api === 'function' && r.label === 'Magnifier', 'magnifier: button present, off by default, accessible', r);
  await page.mouse.move(mgb[0] + mgb[2] * 0.5, mgb[1] + mgb[3] * 0.5);
  await page.mouse.move(mgb[0] + mgb[2] * 0.52, mgb[1] + mgb[3] * 0.5);
  await tick(250);
  ok(!(await mgState()).node, 'magnifier: hovering does nothing while it is off');
  const bb = await page.evaluate(() => { const b = document.querySelector('#mg .mozert-mag-btn').getBoundingClientRect(); const l = document.getElementById('mg').getBoundingClientRect(); return { right: Math.round(l.right - b.right), top: Math.round(b.top - l.top) }; });
  ok(bb.right >= 0 && bb.right < 30 && bb.top >= 0 && bb.top < 30, 'magnifier: button sits in the top right corner', bb);
  await page.click('#mg .mozert-mag-btn');
  await tick(150);
  await page.mouse.move(mgb[0] + mgb[2] * 0.25, mgb[1] + mgb[3] * 0.25);
  await page.mouse.move(mgb[0] + mgb[2] * 0.3, mgb[1] + mgb[3] * 0.3);
  await tick(300);
  let ms = await mgState();
  if (process.env.DBG) console.log('DBG', JSON.stringify(mgb), await page.evaluate(([x, y]) => { const e = document.elementFromPoint(x, y); return e ? e.tagName + '.' + e.className : null; }, [mgb[0] + mgb[2] * 0.3, mgb[1] + mgb[3] * 0.3]));
  ok(ms.on && ms.node && ms.tf === 'scale(2)' && /^3\d(\.\d+)?% 3\d(\.\d+)?%$/.test(ms.org), 'magnifier: on, hovering zooms around the pointer', ms);
  await page.mouse.move(mgb[0] + mgb[2] * 0.8, mgb[1] + mgb[3] * 0.7);
  await tick(200);
  ms = await mgState();
  ok(/^[78]\d(\.\d+)?% [67]\d(\.\d+)?%$/.test(ms.org), 'magnifier: zoom follows the mouse', ms);
  await tick(500);
  ok(await page.evaluate(() => document.querySelector('#mg img').getAttribute('src') === U[1]), 'magnifier: data-zoom loads the sharper picture');
  await page.mouse.move(5, 650);
  await tick(250);
  ok(!(await mgState()).node, 'magnifier: leaving the slider removes the zoom');
  // dragging works normally and drops the zoom
  await page.mouse.move(mgb[0] + mgb[2] * 0.7, mgb[1] + mgb[3] * 0.5);
  await page.mouse.down();
  await page.mouse.move(mgb[0] + mgb[2] * 0.15, mgb[1] + mgb[3] * 0.5, { steps: 8 });
  const during = await mgState();
  await page.mouse.up();
  await tick(600);
  ok(!during.node && (await page.evaluate(() => MG.current)) === 1, 'magnifier: dragging swipes normally (zoom suspended)', during);
  // touch / pen pointers are ignored
  await page.evaluate(() => {
    const l = document.querySelector('#mg .mozert-list').getBoundingClientRect();
    document.querySelector('#mg .mozert-slide.mozert-active').dispatchEvent(new PointerEvent('pointermove', { bubbles: true, pointerType: 'touch', clientX: l.left + 50, clientY: l.top + 50 }));
  });
  await tick(150);
  ok(!(await mgState()).node, 'magnifier: touch pointers are ignored');
  r = await page.evaluate(async () => {
    const o = {};
    MG.magnifier.disable(); o.off = !MG.magnifier.isOn() && !document.querySelector('#mg').classList.contains('mozert-mag-on');
    MG.magnifier.toggle(); o.toggled = MG.magnifier.isOn();
    MG.refresh(); await new Promise((r) => setTimeout(r, 200));
    o.keptAfterRefresh = MG.magnifier.isOn() && document.querySelectorAll('#mg .mozert-mag-btn').length === 1;
    MG.destroy();
    o.clean = !document.querySelector('.mozert-mag-btn') && !document.querySelector('.mozert-mag-node') && !document.getElementById('mg').classList.contains('mozert-has-magnifier');
    return o;
  });
  ok(r.off && r.toggled && r.keptAfterRefresh && r.clean, 'magnifier: API, state survives refresh, destroy is clean', r);
  // no button, active from the start, together with thumbs + lightbox
  r = await page.evaluate(async () => {
    document.getElementById('stage').innerHTML = mkHtml('mg2', true);
    const m = new Mozert('#mg2', { magnifier: { button: false, active: true }, thumbs: { position: 'left', count: 4 }, lightbox: true, slidesToShow: 1 });
    await new Promise((r) => setTimeout(r, 300));
    const o = { noBtn: !document.querySelector('.mozert-mag-btn'), on: m.magnifier.isOn(), gallery: !!document.querySelector('.mozert-gallery-left') };
    m.destroy();
    return o;
  });
  ok(r.noBtn && r.on && r.gallery, 'magnifier: button:false + active:true, works with left thumbs and lightbox', r);

  // scrollDriven: centred pin and speed
  r = await page.evaluate(async () => {
    const out = {};
    for (const speed of [1, 3]) {
      document.getElementById('stage').innerHTML = mkHtml('sp' + speed, false);
      const m = new Mozert('#sp' + speed, { scrollDriven: { top: 'center', speed }, slidesToShow: 2, infinite: false, arrows: false, dots: false });
      await new Promise((r) => setTimeout(r, 200));
      const w = document.querySelector('.mozert-sd');
      out['h' + speed] = w.offsetHeight;
      out['top' + speed] = parseFloat(m.el.style.top);
      out['el' + speed] = m.el.offsetHeight;
      m.destroy();
    }
    return out;
  });
  ok(Math.abs(r.top1 - Math.round((700 - r.el1) / 2)) <= 1, 'scrollDriven top:"center" pins in the middle of the screen', r);
  ok(r.h3 < r.h1 && r.h1 - r.el1 > 3 * (r.h3 - r.el3) - 4 && r.h1 - r.el1 < 3 * (r.h3 - r.el3) + 8 || r.h3 === r.el3 + 240, 'scrollDriven speed shortens the section (less empty space)', r);

  // scrollDriven fill: pinned slider is as tall as the screen
  r = await page.evaluate(async () => {
    document.getElementById('stage').innerHTML = '<div id="sf">' + [1, 2, 3, 4, 5].map((n) => '<div><div style="background:#357">' + n + '</div></div>').join('') + '</div>';
    const m = new Mozert('#sf', { scrollDriven: { fill: true, offset: 40, bottom: 20, speed: 2 }, slidesToShow: 2, infinite: false, arrows: false, dots: false });
    await new Promise((r) => setTimeout(r, 250));
    const o = { h: m.el.offsetHeight, vh: innerHeight, top: parseFloat(m.el.style.top), slide: m.el.querySelector('.mozert-slide').offsetHeight, wrapH: document.querySelector('.mozert-sd').offsetHeight };
    m.destroy();
    o.reset = m.el.style.height === '' && !m.el.classList.contains('mozert-sd-fill');
    return o;
  });
  ok(r.h === r.vh - 40 - 20 && r.top === 40 && r.slide === r.h && r.reset, 'scrollDriven fill: slider fills the screen, destroy resets', r);

  // appendArrows / appendDots / prevArrow / nextArrow / centerPadding / rtl
  r = await page.evaluate(async () => {
    document.getElementById('stage').innerHTML = mkHtml('ap', false) + '<div id="bar"><div id="ba"></div><div id="bd"></div></div>';
    const m = new Mozert('#ap', { slidesToShow: 1, prevArrow: '<button type="button" class="myp">P</button>', nextArrow: '<button type="button" class="myn">N</button>', appendArrows: '#ba', appendDots: '#bd', dots: true });
    await new Promise((r) => setTimeout(r, 200));
    const o = {
      arrows: document.querySelectorAll('#ba .myp.mozert-prev, #ba .myn.mozert-next').length,
      dots: document.querySelectorAll('#bd .mozert-dots li').length,
      none: !document.querySelector('#ap .mozert-arrow') && !document.querySelector('#ap .mozert-dots'),
    };
    document.querySelector('#ba .myn').click();
    await new Promise((r) => setTimeout(r, 400));
    o.next = m.current;
    document.querySelector('#bd .mozert-dots li:nth-child(4) button').click();
    await new Promise((r) => setTimeout(r, 400));
    o.dot = m.current;
    document.querySelector('#ba .myp').click();
    await new Promise((r) => setTimeout(r, 400));
    o.prev = m.current;
    const dotW = document.querySelector('#bd .mozert-dots li:not(.mozert-active) button').offsetWidth;
    o.dotStyled = dotW > 0 && dotW < 20;
    m.destroy();
    o.cleaned = !document.querySelector('#ba *') && !document.querySelector('#bd *');
    return o;
  });
  ok(r.arrows === 2 && r.dots > 1 && r.none && r.next === 1 && r.dot === 3 && r.prev === 2 && r.dotStyled && r.cleaned, 'appendArrows/appendDots + custom prev/next arrows work and clean up', r);
  r = await page.evaluate(async () => {
    document.getElementById('stage').innerHTML = mkHtml('cp', false);
    const m = new Mozert('#cp', { centerMode: true, centerPadding: '90px', slidesToShow: 1, infinite: false, arrows: false });
    await new Promise((r) => setTimeout(r, 250));
    m.goTo(2);
    await new Promise((r) => setTimeout(r, 500));
    const w = m.el.getBoundingClientRect();
    const cur = m.el.querySelector('.mozert-slide.mozert-current').getBoundingClientRect();
    const o = { left: Math.round(cur.left - w.left), right: Math.round(w.right - cur.right) };
    m.destroy();
    return o;
  });
  ok(Math.abs(r.left - 90) <= 2 && Math.abs(r.right - 90) <= 2, 'centerPadding: 90px peek on each side', r);
  r = await page.evaluate(async () => {
    document.getElementById('stage').innerHTML = mkHtml('rt', false);
    const m = new Mozert('#rt', { rtl: true, slidesToShow: 1, infinite: false, arrows: true, dots: false });
    await new Promise((r) => setTimeout(r, 250));
    const l = m.el.getBoundingClientRect();
    const s0 = m.el.querySelectorAll('.mozert-slide')[0].getBoundingClientRect();
    const o = { dir: m.el.getAttribute('dir'), startsRight: s0.left > l.left - 2 && Math.abs(s0.right - l.right) < 4 };
    m.next();
    await new Promise((r) => setTimeout(r, 400));
    const s1 = m.el.querySelectorAll('.mozert-slide')[1].getBoundingClientRect();
    o.nextToLeft = Math.abs(s1.left - l.left) < 4 && m.current === 1;
    m.el.dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowRight', bubbles: true }));
    await new Promise((r) => setTimeout(r, 400));
    o.keyRight = m.current;
    m.destroy();
    return o;
  });
  ok(r.dir === 'rtl' && r.startsRight && r.nextToLeft && r.keyRight === 0, 'rtl: starts from the right, next goes left, ArrowRight = previous', r);

  // infinite + scrollDriven is ignored safely
  r = await page.evaluate(async () => {
    document.getElementById('stage').innerHTML = mkHtml('s2', false);
    const m = new Mozert('#s2', { scrollDriven: true, infinite: true });
    const out = { ignored: !document.querySelector('.mozert-sd') };
    m.destroy();
    return out;
  });
  ok(r.ignored, 'scrollDriven ignored for looping sliders', r);

  ok(errs.length === 0, 'no page errors', errs);
  await browser.close();
  console.log('[features ' + target + ']  ' + pass + ' passed, ' + fail + ' failed');
  if (fail) { failures.forEach((f) => console.log('FAIL', f)); process.exit(1); }
})();
