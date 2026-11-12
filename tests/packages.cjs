// Tests the React package in a real browser (React is bundled with esbuild) and the Vue package against a stub.
// Needs react, react-dom and esbuild resolvable (NODE_PATH). Skips the React part otherwise.
const chromium = require('playwright')[process.env.BROWSER || 'chromium'];
const path = require('path');
const fs = require('fs');
const Module = require('module');
const root = path.join(__dirname, '..');
let pass = 0, fail = 0; const failures = [];
const ok = (c, n, x) => { if (c) pass++; else { fail++; failures.push(n + (x !== undefined ? ' -> ' + JSON.stringify(x) : '')); } };

(async () => {
  /* ---------- React ---------- */
  let esbuild = null;
  try { esbuild = require('esbuild'); require.resolve('react'); require.resolve('react-dom/client'); } catch (e) { console.log('[packages] react/esbuild not installed, skipping the React part'); }
  if (esbuild) {
    const out = path.join(require('os').tmpdir(), 'mozert-react-test.js');
    await esbuild.build({ entryPoints: [path.join(__dirname, 'pkg/react-app.jsx')], bundle: true, outfile: out, loader: { '.jsx': 'jsx' }, alias: { '@mozert-studio/mozert-slider': path.join(root, 'dist/mozert.js') }, define: { 'process.env.NODE_ENV': '"development"' }, logLevel: 'error', nodePaths: (process.env.NODE_PATH || '').split(path.delimiter).filter(Boolean) });
    const browser = await chromium.launch();
    for (const strict of [false, true]) {
      const tag = strict ? 'StrictMode ' : '';
      const page = await (await browser.newContext({ viewport: { width: 900, height: 700 } })).newPage();
      const errs = []; page.on('pageerror', (e) => errs.push(e.message)); page.on('console', (m) => { if (m.type() === 'error') errs.push(m.text()); });
      await page.setContent('<body><div id="r"></div><div id="r2"></div></body>');
      await page.addStyleTag({ path: path.join(root, 'dist/mozert.css') });
      await page.addScriptTag({ path: out });
      const w = (ms) => page.waitForTimeout(ms);
      const state = () => page.evaluate(() => {
        const el = document.getElementById('s1'); const m = el && el._mozert;
        return el ? { n: m ? m.n : -1, texts: Array.from(el.querySelectorAll('.mozert-slide:not(.mozert-cloned)')).map((e) => e.textContent), show: m && m.s.slidesToShow, cls: el.className.indexOf('my-slider') > -1, active: m && m.active, wraps: el.querySelectorAll('.mozert-list').length } : null;
      });
      await page.evaluate((s) => window.mount(s), strict); await w(400);
      let s = await state();
      ok(s && s.n === 4 && s.show === 2 && s.cls && s.active && s.wraps === 1, tag + 'React: mounts one working slider with props as options', s);
      ok(await page.evaluate(() => window.inited.length >= 1 && window.api.ref.current.slider === window.inited[window.inited.length - 1] && window.api.ref.current.element.id === 's1'), tag + 'React: onInit and ref give the instance');
      await page.evaluate(() => window.api.ref.current.slider.next()); await w(600);
      ok(await page.evaluate(() => (window.changes || []).length >= 1), tag + 'React: onChange fires', await page.evaluate(() => window.changes));
      const inst0 = await page.evaluate(() => window.inited.length);
      // add, remove, reorder
      await page.evaluate(() => window.api.setItems((a) => a.concat({ id: 'e', t: 'E' }))); await w(400);
      s = await state(); ok(s.n === 5 && s.texts.join('') === 'ABCDE' && s.wraps === 1, tag + 'React: adding a child rebuilds with 5 slides, no duplicates', s);
      await page.evaluate(() => window.api.setItems((a) => a.filter((i) => i.id !== 'b'))); await w(400);
      s = await state(); ok(s.n === 4 && s.texts.join('') === 'ACDE', tag + 'React: removing a child', s);
      await page.evaluate(() => window.api.setItems((a) => a.slice().reverse())); await w(400);
      s = await state(); ok(s.texts.join('') === 'EDCA', tag + 'React: reordering follows keys', s);
      // content update only: same instance, text patched
      const before = await page.evaluate(() => window.inited.length);
      await page.evaluate(() => window.api.setItems((a) => a.map((i) => (i.id === 'D' || i.id === 'd' ? { ...i, t: 'Dd' } : i)))); await w(300);
      s = await state();
      ok(s.texts.join('') === 'EDdCA' && (await page.evaluate(() => window.inited.length)) === before, tag + 'React: text change patches in place without rebuilding the slider', { s, before });
      // option change
      await page.evaluate(() => window.api.setShow(3)); await w(400);
      s = await state(); ok(s.show === 3 && s.n === 4 && s.wraps === 1, tag + 'React: option change rebuilds with the new option', s);
      // unmount cleans up
      const inst = await page.evaluate(() => { window.last = window.inited[window.inited.length - 1]; return true; });
      await page.evaluate(() => window.api.setVis(false)); await w(400);
      ok(await page.evaluate(() => !document.querySelector('.mozert-list') && !document.getElementById('s1') && window.last.active === false), tag + 'React: unmount destroys the slider and leaves no DOM');
      // gallery props: thumbs + lightbox through the component
      await page.evaluate(() => window.mountGallery()); await w(500);
      const g = await page.evaluate(async () => {
        const el = document.getElementById('g'); const m = el._mozert;
        const out = { thumbs: !!document.querySelector('.mozert-thumbs'), n: m.n };
        document.querySelectorAll('.mozert-thumbs .mozert-slide')[2].click(); await new Promise((r) => setTimeout(r, 700));
        out.cur = m.current;
        m.getSlides()[2].querySelector('img').click(); await new Promise((r) => setTimeout(r, 300));
        out.lb = !!document.querySelector('.mozert-lb') && document.querySelector('.mozert-lb-count').textContent;
        out.cap = document.querySelector('.mozert-lb-cap').textContent;
        m.lightbox.close();
        return out;
      });
      ok(g.thumbs && g.n === 4 && g.cur === 2 && g.lb === '3 / 4' && g.cap === 'cap 2', tag + 'React: thumbs and lightbox work as props', g);
      ok(errs.length === 0, tag + 'React: no console or page errors', errs);
      await page.close();
    }
    await browser.close();
  }

  /* ---------- Vue (stubbed: checks the wrapper logic, not Vue itself) ---------- */
  const created = [];
  const fakeMozert = function (el, opts) { this.el = el; this.opts = opts; this.destroyed = false; created.push(this); };
  fakeMozert.prototype.destroy = function () { this.destroyed = true; };
  const Fragment = Symbol('Fragment'), Comment = Symbol('Comment'), Text = Symbol('Text');
  const fakeVue = { defineComponent: (c) => c, h: (type, props, children) => ({ type, props, key: props && props.key, children }), Fragment, Comment, Text };
  const orig = Module._load;
  Module._load = function (req) { if (req === 'vue') return fakeVue; if (req === '@mozert-studio/mozert-slider') return fakeMozert; return orig.apply(this, arguments); };
  const vueMod = require(path.join(root, 'packages/vue/index.cjs'));
  Module._load = orig;
  const emitted = [];
  const setup = (props, attrs, slot) => vueMod.setup(Object.assign({ options: {}, tag: 'div' }, props), { slots: { default: slot }, attrs, emit: (...a) => emitted.push(a), expose: (x) => (setup.exposed = x) });
  const v = (key, text) => ({ type: 'div', key, children: text });
  const render = setup({ options: { dots: true } }, { slidesToShow: 3, class: 'c', 'data-x': 1, onClick() {} }, () => [v('a'), { type: Fragment, children: [v('b'), v('c')] }, { type: Comment, children: '' }]);
  let node = render();
  ok(node.type === 'div' && node.key.indexOf('a|b|c') === 0, 'Vue: slides inside fragments are flattened into the key', node.key);
  ok(node.props.class === 'c' && !('slidesToShow' in node.props), 'Vue: class passes to the element, options do not', Object.keys(node.props));
  const el = {};
  node.props.onVnodeMounted({ el });
  const mz = created[created.length - 1];
  ok(mz && mz.el === el && mz.opts.dots === true && mz.opts.slidesToShow === 3 && !('class' in mz.opts) && !('onClick' in mz.opts), 'Vue: Mozert created with options prop plus attributes', mz && mz.opts);
  mz.opts.on.afterChange({}, 2); mz.opts.on.beforeChange({}, 2, 3);
  ok(emitted.some((e) => e[0] === 'change' && e[1] === 2) && emitted.some((e) => e[0] === 'before-change'), 'Vue: change events are emitted', emitted.map((e) => e[0]));
  ok(emitted.some((e) => e[0] === 'init') && setup.exposed.slider() === mz && setup.exposed.element() === el, 'Vue: init event and exposed slider()/element()');
  const render2 = setup({ options: { dots: true } }, { slidesToShow: 3 }, () => [v('a'), v('b'), v('c'), v('d')]);
  ok(render2().key !== node.key, 'Vue: adding a slide changes the key (forces a rebuild)');
  const render3 = setup({ options: { dots: true } }, { slidesToShow: 4 }, () => [v('a'), v('b'), v('c')]);
  ok(render3().key !== node.key, 'Vue: changing an option changes the key');
  node.props.onVnodeBeforeUnmount();
  ok(mz.destroyed && setup.exposed.slider() === null, 'Vue: unmount destroys the slider');

  console.log('[packages]  ' + pass + ' passed, ' + fail + ' failed');
  if (fail) { failures.forEach((f) => console.log('FAIL', f)); process.exit(1); }
})();
