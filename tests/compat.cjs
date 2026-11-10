// Slick drop-in + Swiper-style API tests. Usage: node tests/compat.cjs
const { chromium } = require('playwright');
const path = require('path');
const root = path.join(__dirname, '..');
let pass = 0, fail = 0; const failures = [];
const ok = (c, n, x) => { if (c) pass++; else { fail++; failures.push(n + (x !== undefined ? ' -> ' + JSON.stringify(x) : '')); } };
(async () => {
  const browser = await chromium.launch();
  const page = await (await browser.newContext({ viewport: { width: 1000, height: 800 } })).newPage();
  const errors = []; page.on('pageerror', (e) => errors.push(e.message));
  await page.setContent('<body><div id="stage"></div></body>');
  await page.addStyleTag({ path: path.join(root, 'dist/mozert.css') });
  await page.addScriptTag({ path: process.argv[2] || '/usr/share/javascript/jquery/jquery.min.js' });
  await page.addScriptTag({ path: path.join(root, 'dist/mozert.min.js') });
  await page.addScriptTag({ path: path.join(root, 'dist/mozert.slick.min.js') });
  await page.addScriptTag({ path: path.join(root, 'dist/mozert.swiper.min.js') });
  await page.evaluate(() => { window.MozertAutoInit = false; window.settle = (ms) => new Promise((r) => setTimeout(r, ms || 300)); });
  const run = async (n, f) => { try { await page.evaluate(() => (document.getElementById('stage').innerHTML = '')); await f(); } catch (e) { fail++; failures.push(n + ' THREW ' + e.message.split('\n')[0]); } };

  await run('slick drop-in', async () => {
    const r = await page.evaluate(async () => {
      const $s = $('<div id="sk" style="width:500px" data-slick=\'{"slidesToShow":2,"dots":true}\'><div>1</div><div>2</div><div>3</div><div>4</div></div>').appendTo('#stage');
      const ev = []; $s.on('init', (e, slick) => ev.push('init:' + slick.slideCount)); $s.on('beforeChange', (e, slick, c, n) => ev.push('bc:' + c + '>' + n)); $s.on('afterChange', (e, slick, c) => ev.push('ac:' + c + ':' + slick.currentSlide));
      $s.slick(); await settle(100);
      $s.slick('slickNext'); await settle(500); $s.slick('slickGoTo', 3, true); await settle(100);
      const sl = $s.slick('getSlick');
      return { cls: ['slick-slider', 'slick-list', 'slick-track', 'slick-slide', 'slick-dots', 'slick-arrow'].map((c) => $s.find('.' + c).length + ($s.hasClass(c) ? 1 : 0) > 0), cur: $s.slick('slickCurrentSlide'), idx: $s.find('.slick-slide').first().attr('data-slick-index') !== undefined, ev, sc: sl.slideCount, opt: $s.slick('slickGetOption', 'slidesToShow') };
    });
    ok(r.cls.every(Boolean) && r.cur === 3 && r.idx && r.ev[0] === 'init:4' && r.ev.some((e) => e.startsWith('bc:0>1')) && r.sc === 4 && r.opt === 2, 'slick', r);
  });

  await run('swiper basic API', async () => {
    const r = await page.evaluate(async () => {
      document.getElementById('stage').innerHTML = '<div class="swiper" id="sw" style="width:600px"><div class="swiper-wrapper"><div class="swiper-slide">1</div><div class="swiper-slide">2</div><div class="swiper-slide">3</div><div class="swiper-slide">4</div><div class="swiper-slide">5</div></div><div class="swiper-pagination"></div><button class="swiper-button-prev"></button><button class="swiper-button-next"></button></div>';
      const log = [];
      const sw = new Swiper('#sw', { slidesPerView: 2, spaceBetween: 10, loop: false, speed: 50, pagination: { el: '.swiper-pagination', clickable: true }, navigation: { nextEl: '.swiper-button-next', prevEl: '.swiper-button-prev' }, on: { init() { log.push('init'); }, slideChange(s) { log.push('sc' + s.activeIndex); } } });
      await settle(150);
      document.querySelector('.swiper-button-next').click(); await settle(200);
      sw.slideTo(3); await settle(200);
      const slideW = Math.round(sw.slides[0].getBoundingClientRect().width);
      return { log, idx: sw.activeIndex, slides: sw.slides.length, begin: sw.isBeginning, end: sw.isEnd, bullets: document.querySelectorAll('.swiper-pagination .swiper-pagination-bullet').length, wrapper: !!document.querySelector('.swiper-wrapper'), cls: document.querySelectorAll('.swiper-slide-active').length, slideW, own: document.getElementById('sw').swiper === sw, nextDis: document.querySelector('.swiper-button-next').classList.contains('swiper-button-disabled') };
    });
    ok(r.log[0] === 'init' && r.log.includes('sc1') && r.idx === 3 && r.slides === 5 && r.bullets === 5 && r.cls >= 1 && r.slideW === 295 && r.own && r.end, 'swiper basic', r);
  });

  await run('swiper breakpoints + effect + autoplay', async () => {
    const r = await page.evaluate(async () => {
      const h = document.createElement('div'); h.className = 'swiper'; h.id = 'sw2'; h.style.width = '900px'; h.innerHTML = '<div class="swiper-wrapper">' + [1, 2, 3, 4, 5, 6].map((i) => '<div class="swiper-slide">' + i + '</div>').join('') + '</div>'; document.getElementById('stage').appendChild(h);
      const sw = new Swiper(h, { slidesPerView: 1, breakpoints: { 640: { slidesPerView: 2 }, 800: { slidesPerView: 3, spaceBetween: 30 } }, loop: true, autoplay: { delay: 200, disableOnInteraction: false }, speed: 50 });
      await settle(700);
      const per = sw.mozert._show; const moved = sw.activeIndex;
      sw.autoplay.stop();
      const h2 = document.createElement('div'); h2.className = 'swiper'; h2.id = 'sw3'; h2.style.width = '400px'; h2.innerHTML = '<div class="swiper-wrapper"><div class="swiper-slide">a</div><div class="swiper-slide">b</div><div class="swiper-slide">c</div></div>'; document.getElementById('stage').appendChild(h2);
      const cu = new Swiper(h2, { effect: 'cube', speed: 50 }); await settle(100); cu.slideNext(); await settle(200);
      return { per, moved: moved > 0, tr: /rotateY/.test(cu.slides[0].style.transform), running: sw.autoplay.running };
    });
    ok(r.per === 3 && r.moved && r.tr && !r.running, 'swiper bp/effect/autoplay', r);
  });
  console.log('\n[compat]  ' + pass + ' passed, ' + fail + ' failed');
  if (failures.length) console.log(failures.join('\n'));
  if (errors.length) console.log('PAGE ERRORS:', errors);
  await browser.close();
  process.exit(fail || errors.length ? 1 : 0);
})();
