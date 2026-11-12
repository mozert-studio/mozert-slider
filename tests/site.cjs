// Site demo audit: every demo on the Examples page keeps a clean DOM and sane geometry,
// including after add/remove/filter interactions, at desktop and phone widths.
const chromium = require('playwright')[process.env.BROWSER || 'chromium'];
const path = require('path');
const url = 'file://' + path.resolve(__dirname, '../site/examples/index.html');
let pass = 0, fail = 0;
const ok = (c, m) => { if (c) pass++; else { fail++; console.log('FAIL', m); } };

const audit = `(() => {
  const out = [];
  document.querySelectorAll('.demo [id^="d-"]').forEach((el) => {
    if (el.id.endsWith('-box') || el.id.endsWith('-count')) return;
    const m = window.Mozert.get(el);
    if (!m) { out.push(el.id + ': not initialised'); return; }
    const stray = [...el.children].filter((c) => !/(^|\\s)mozert-/.test(c.className));
    if (stray.length) out.push(el.id + ': ' + stray.length + ' stray children in slider root');
    const hl = el.getBoundingClientRect().height;
    if (hl > 900 && !el.closest('.stage.v')) out.push(el.id + ': slider height ' + Math.round(hl));
    // pagination / dots / scrollbar geometry
    el.querySelectorAll('.mozert-dots, .mozert-pagination, .mozert-scrollbar').forEach((p) => {
      const r = p.getBoundingClientRect(), e = el.getBoundingClientRect();
      if (!r.width || !r.height) return;
      const vert = el.classList.contains('mozert-vertical');
      if (vert && p.classList.contains('mozert-dots')) {
        if (r.right > e.right + 0.5 || r.left < e.left - 0.5) out.push(el.id + ': vertical dots outside slider');
        if (Math.abs((r.top + r.bottom) / 2 - (e.top + e.bottom) / 2) > 3) out.push(el.id + ': vertical dots not centred');
      } else if (!vert) {
        if (Math.abs((r.left + r.right) / 2 - (e.left + e.right) / 2) > 3) out.push(el.id + ': ' + p.className + ' not centred (' + Math.round((r.left + r.right) / 2 - (e.left + e.right) / 2) + 'px)');
        if (r.left < e.left - 1 || r.right > e.right + 1) out.push(el.id + ': ' + p.className + ' wider than slider');
      }
    });
    m.dom.forEach((w, i) => {
      const c = w.firstElementChild;
      if (c && el.id !== 'd-expand' && c.classList.contains('sc') && c.offsetWidth > w.offsetWidth + 1) out.push(el.id + ': card wider than slide #' + i + ' (' + c.offsetWidth + '>' + w.offsetWidth + ')');
    });
    
  });
  window.scrollTo(9999, 0);
  if (window.scrollX > 0) out.push('page scrolls horizontally by ' + window.scrollX);
  window.scrollTo(0, window.scrollY);
  return out;
})()`;

(async () => {
  const b = await chromium.launch();
  for (const vp of [{ width: 1366, height: 800 }, { width: 390, height: 800 }]) {
    const pg = await b.newPage({ viewport: vp });
    const errs = [];
    pg.on('pageerror', (e) => errs.push(e.message));
    await pg.route(/^https?:/, (r) => r.abort());
    await pg.goto(url);
    await pg.waitForTimeout(900);
    ok((await pg.evaluate(audit)).length === 0, vp.width + ' initial: ' + JSON.stringify(await pg.evaluate(audit)));

    // navigate every slider
    await pg.evaluate(async () => {
      for (const el of document.querySelectorAll('.demo [id^="d-"]')) {
        if (el.id.endsWith('-box') || el.id.endsWith('-count')) continue;
        const m = Mozert.get(el);
        if (m && m.canNav) { m.next(); await new Promise((r) => setTimeout(r, 60)); m.next(); await new Promise((r) => setTimeout(r, 60)); m.prev(); }
      }
    });
    await pg.waitForTimeout(500);
    const a2 = await pg.evaluate(audit);
    ok(a2.length === 0, vp.width + ' after navigation: ' + JSON.stringify(a2));

    // dynamic add/remove in many orders
    const seqs = [['add', 'add', 'remove', 'removefirst', 'addfirst'], ['remove', 'remove', 'remove', 'remove', 'remove', 'add'], ['removefirst', 'removefirst', 'add', 'reset'], ['reset', 'remove', 'addfirst', 'removefirst', 'reset']];
    for (const seq of seqs) {
      const r = await pg.evaluate(async (seq) => {
        const bx = document.getElementById('d-dyn-add-box');
        const el = document.getElementById('d-dyn-add');
        const log = [];
        for (const a of seq) {
          bx.querySelector('[data-act=' + a + ']').click();
          await new Promise((r) => setTimeout(r, 120));
          const m = Mozert.get(el);
          const kids = [...el.children].filter((c) => !/mozert-/.test(c.className)).length;
          const tl = el.querySelectorAll('.mozert-track > .mozert-slide:not(.mozert-cloned)').length;
          log.push(a + ':' + m.slideCount() + '/' + tl + '/' + kids + '/' + Math.round(el.getBoundingClientRect().height));
        }
        return log;
      }, seq);
      const bad = r.filter((x) => { const [, n, t, k, h] = x.split(/[:/]/); return +n !== +t || +k !== 0 || +h > 700; });
      ok(bad.length === 0, vp.width + ' dynamic ' + seq.join('>') + ' => ' + r.join(' '));
    }

    // filters
    const fl = await pg.evaluate(async () => {
      const bx = document.getElementById('d-filter-box');
      const el = document.getElementById('d-filter');
      const out = [];
      for (const a of ['.cat-a', '.cat-b', '.cat-c', 'all', '.cat-b', 'all']) {
        bx.querySelector('[data-act="' + a + '"]').click();
        await new Promise((r) => setTimeout(r, 120));
        const m = Mozert.get(el);
        const kids = [...el.children].filter((c) => !/mozert-/.test(c.className)).length;
        out.push([a, m.slideCount(), kids, Math.round(el.getBoundingClientRect().height), m.dom.map((w) => w.textContent.match(/\d\d/)[0]).join(',')]);
      }
      return out;
    });
    fl.forEach(([a, n, k, h, order]) => ok(k === 0 && h < 700 && n === (a === 'all' ? 9 : 3), vp.width + ' filter ' + a + ' ' + n + '/' + k + '/' + h));
    ok(fl[3][4] === '01,02,03,04,05,06,07,08,09', 'filter order restored: ' + fl[3][4]);

    // thumbnails: clicking any thumbnail (including the last visible ones) shows that slide in the main slider
    const th = await pg.evaluate(async () => {
      const main = Mozert.get(document.getElementById('th-main')), nav = Mozert.get(document.getElementById('th-nav'));
      const res = [];
      for (const i of [3, 5, 5, 0, 4, 1]) {
        nav.dom.filter((e) => !e.classList.contains('mozert-cloned'))[i].querySelector('*').click();
        await new Promise((r) => setTimeout(r, 450));
        res.push([i, main.current]);
      }
      main.goTo(5); await new Promise((r) => setTimeout(r, 450));
      res.push(['main5', nav.current, nav.dom.filter((e) => e.classList.contains('mozert-current')).map((e) => e.getAttribute('data-mozert-index')).join()]);
      return res;
    });
    th.slice(0, 6).forEach(([i, c]) => ok(i === c, vp.width + ' thumbnail click ' + i + ' -> main ' + c));
    ok(th[6][1] >= 2 && th[6][2].split(',').every((x) => x === '5'), vp.width + ' main at 5 moves thumbnails and highlights #6: ' + th[6]);

    // 3D carousel: cards behind the active one are raised and dimmed
    const d3 = await pg.evaluate(async () => {
      const m = Mozert.get(document.getElementById('d-3d')); m.goTo(2, true); await new Promise((r) => setTimeout(r, 200));
      const tY = (e) => { const t = getComputedStyle(e).transform; return t === 'none' ? 0 : new DOMMatrix(t).m42; };
      const cur = m.dom.filter((e) => e.classList.contains('mozert-current'))[0] || m.dom[m.current + m.cloneCount];
      const i = m.dom.indexOf(cur);
      return { mid: tY(cur), near: tY(m.dom[i + 1]), far: tY(m.dom[i + 2]), opFar: +getComputedStyle(m.dom[i + 2]).opacity };
    });
    ok(d3.near < d3.mid - 20 && d3.far < d3.near && d3.opFar < 1, vp.width + ' 3D carousel lift/fade: ' + JSON.stringify(d3));

    // Expanding cards: active card is wider, neighbours never overlap or leave gaps, also after many moves and across the loop seam
    const ex = await pg.evaluate(async () => {
      const m = Mozert.get(document.getElementById('d-expand')); const out = { bad: [], wide: true };
      const gap = m.s.spaceBetween;
      for (let step = 0; step < 16; step++) {
        m.next(); await new Promise((r) => setTimeout(r, 800));
        const cards = m.dom.map((e) => e.firstElementChild.getBoundingClientRect()).filter((r, i) => m.dom[i].offsetParent);
        const cur = m.dom.filter((e) => e.classList.contains('mozert-current'))[0];
        const cw = cur.firstElementChild.getBoundingClientRect().width;
        const others = m.dom.filter((e) => e !== cur && !e.classList.contains('mozert-cloned')).map((e) => e.firstElementChild.getBoundingClientRect().width);
        if (!(cw > Math.max.apply(null, others) * 1.5)) out.wide = false;
        const sorted = cards.sort((a, b) => a.left - b.left);
        for (let i = 1; i < sorted.length; i++) { const d = sorted[i].left - sorted[i - 1].right; if (Math.abs(d - gap) > 3) { out.bad.push(step + ':' + d.toFixed(1)); break; } }
      }
      return out;
    });
    ok(ex.wide && ex.bad.length === 0, vp.width + ' expand cards: ' + JSON.stringify(ex));

    const a3 = await pg.evaluate(audit);
    ok(a3.length === 0, vp.width + ' after interactions: ' + JSON.stringify(a3));
    ok(errs.length === 0, vp.width + ' page errors: ' + errs.join('|'));
    if (vp.width === 1366) await pg.screenshot({ path: process.env.SHOT || '/tmp/site-examples.png', fullPage: true });
    await pg.close();
  }
  // header: no wrapping nav, no overflow, stable height at any width (also covers browser zoom)
  for (const w of [1920, 1366, 1200, 1101, 1100, 910, 768, 390, 320]) {
    const pg = await b.newPage({ viewport: { width: w, height: 600 } });
    await pg.route(/^https?:/, (r) => r.abort());
    await pg.goto(url.replace('examples/index.html', 'index.html'));
    await pg.waitForTimeout(300);
    const r = await pg.evaluate(() => {
      const nav = document.querySelector('nav.main');
      const vis = getComputedStyle(nav).display !== 'none';
      const tops = vis ? [...nav.querySelectorAll('a')].map((a) => a.getBoundingClientRect().top) : [0];
      const logo = document.querySelector('.logo img').getBoundingClientRect();
      const burger = document.querySelector('.menu summary').getBoundingClientRect().width;
      return { h: document.querySelector('header').getBoundingClientRect().height, wrapped: Math.max(...tops) - Math.min(...tops) > 5, vis, burger, ovf: document.documentElement.scrollWidth > innerWidth, logoH: logo.height };
    });
    ok(!r.wrapped && !r.ovf && r.h <= 70 && r.logoH <= 41, w + ' header: ' + JSON.stringify(r));
    ok(r.vis !== (r.burger > 0), w + ' header shows either nav or hamburger: ' + JSON.stringify(r));
    await pg.close();
  }
  await b.close();
  console.log('\n[site examples] ' + pass + ' passed, ' + fail + ' failed');
  process.exit(fail ? 1 : 0);
})();
