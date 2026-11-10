// Tests for the labels option and data-lazy-bg. Usage: node tests/labels.cjs [dist/mozert.js]
const { chromium } = require('playwright');
const path = require('path');
const root = path.join(__dirname, '..');
const target = process.argv[2] || 'dist/mozert.js';
let pass = 0, fail = 0; const failures = [];
const ok = (c, n, x) => { if (c) pass++; else { fail++; failures.push(n + (x !== undefined ? ' -> ' + JSON.stringify(x) : '')); } };
(async () => {
  const browser = await chromium.launch();
  const page = await (await browser.newContext({ viewport: { width: 900, height: 700 } })).newPage();
  const errs = []; page.on('pageerror', (e) => errs.push(e.message));
  await page.setContent('<div id="stage" style="width:600px"></div>');
  await page.addStyleTag({ path: path.join(root, 'dist/mozert.css') });
  await page.addScriptTag({ path: path.join(root, target) });
  const svg = 'data:image/svg+xml;utf8,' + encodeURIComponent('<svg xmlns="http://www.w3.org/2000/svg" width="10" height="10"><rect width="10" height="10" fill="red"/></svg>');
  const r = await page.evaluate(async (svg) => {
    const st = document.getElementById('stage');
    st.innerHTML = '<div id="a"><div>1</div><div>2</div><div>3</div></div>';
    const d = new Mozert('#a', { dots: true, labels: { slide: 'Shareeha {n} / {total}', prev: 'Pichhe', next: 'Aage', goTo: 'Jao {n}' } });
    const out = {
      slide: d.getSlides()[1].getAttribute('aria-label'),
      prev: document.querySelector('#a .mozert-prev').getAttribute('aria-label'),
      next: document.querySelector('#a .mozert-next').getAttribute('aria-label'),
      dot: document.querySelector('#a .mozert-dots button').getAttribute('aria-label'),
    };
    st.insertAdjacentHTML('beforeend', '<div id="b"><div><span class="bg" data-lazy-bg="' + svg + '" style="display:block;height:20px"></span></div><div>2</div><div>3</div></div>');
    const ev = []; const e = new Mozert('#b', { on: { lazyLoaded(s, el, src) { ev.push(el.className); } } });
    await new Promise((res) => setTimeout(res, 400));
    const bgs = Array.from(document.querySelectorAll('#b .bg')).map((x) => ({ cloned: !!x.closest('.mozert-cloned'), bg: x.style.backgroundImage.slice(0, 8), attr: x.hasAttribute('data-lazy-bg') }));
    e.destroy();
    out.bgAfterDestroy = document.querySelectorAll('#b [data-mozert-bg]').length;
    out.bgs = bgs; out.ev = ev;
    return out;
  }, svg);
  ok(r.slide === 'Shareeha 2 / 3', 'slide label', r.slide);
  ok(r.prev === 'Pichhe' && r.next === 'Aage', 'arrow labels', r);
  ok(r.dot === 'Jao 1', 'dot label', r.dot);
  ok(r.bgs.length >= 2 && r.bgs.every((b) => b.bg === 'url("dat' && !b.attr), 'lazy bg on real and clones', r.bgs);
  ok(r.ev.length === 1, 'lazyLoaded fired once', r.ev);
  ok(r.bgAfterDestroy === 0, 'marker attributes cleaned on destroy', r.bgAfterDestroy);
  ok(errs.length === 0, 'no page errors', errs);
  console.log(`\n[labels ${target}]  ${pass} passed, ${fail} failed`);
  failures.forEach((f) => console.log(' - ' + f));
  await browser.close();
  process.exit(fail ? 1 : 0);
})();
