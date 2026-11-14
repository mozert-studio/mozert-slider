// Video slides ("reel"): play button, inline playback, autoplay hand-off, thumbs badge, lightbox video, embeds.
// Usage: node tests/reel.cjs [dist/mozert.js]
const chromium = require('playwright')[process.env.BROWSER || 'chromium'];
const http = require('http'), fs = require('fs'), path = require('path');
const root = path.join(__dirname, '..');
const target = process.argv[2] || 'dist/mozert.js';
const files = { '/m.js': path.join(root, target), '/m.css': path.join(root, 'dist/mozert.css'), '/clip.webm': path.join(root, 'tests/fixtures/clip.webm') };
const mime = { '.js': 'text/javascript', '.css': 'text/css', '.webm': 'video/webm' };
const PAGE = '<!doctype html><meta name="viewport" content="width=device-width,initial-scale=1"><link rel="stylesheet" href="/m.css"><body style="margin:0"><div id="stage" style="width:min(600px,92vw);margin:16px"></div><script src="/m.js"></script>';
const srv = http.createServer((q, r) => {
  const u = q.url.split('?')[0];
  if (u === '/') { r.setHeader('content-type', 'text/html'); return r.end(PAGE); }
  const f = files[u]; if (!f) { r.statusCode = 404; return r.end(); }
  const b = fs.readFileSync(f); r.setHeader('content-type', mime[path.extname(f)]);
  if (u === '/clip.webm') { r.setHeader('accept-ranges', 'bytes'); const m = /bytes=(\d+)-(\d*)/.exec(q.headers.range || ''); if (m) { const s = +m[1], e = m[2] ? +m[2] : b.length - 1; r.statusCode = 206; r.setHeader('content-range', `bytes ${s}-${e}/${b.length}`); return r.end(b.slice(s, e + 1)); } }
  r.end(b);
});
let pass = 0, fail = 0; const failures = [];
const ok = (c, n, x) => { if (c) pass++; else { fail++; failures.push(n + (x !== undefined ? ' -> ' + JSON.stringify(x) : '')); } };
const svg = (c) => 'data:image/svg+xml;utf8,' + encodeURIComponent('<svg xmlns="http://www.w3.org/2000/svg" width="400" height="300"><rect width="400" height="300" fill="' + c + '"/></svg>');
(async () => {
  await new Promise((r) => srv.listen(0, r)); const base = `http://localhost:${srv.address().port}`;
  const browser = await chromium.launch();
  for (const vw of [1000, 390]) {
    const ctx = await browser.newContext({ viewport: { width: vw, height: 800 } });
    const page = await ctx.newPage(); const errs = [];
    page.on('pageerror', (e) => errs.push(e.message));
    await page.goto(base + '/');
    const html = (id) => `<div id="${id}">
      <div data-video="/clip.webm" data-poster="${svg('#c33')}" data-caption="Clip"><img src="${svg('#c33')}" alt="clip poster"></div>
      <div data-embed="youtube:dQw4w9WgXcQ" data-poster="${svg('#33c')}"><img src="${svg('#33c')}" alt="embed poster"></div>
      <div><img src="${svg('#3a3')}" alt="plain picture"></div>
      <div><video muted playsinline src="/clip.webm"></video></div>
      <div><img src="${svg('#ea3')}" alt="plain picture 2"></div></div>`;
    const tag = vw + 'px: ';
    await page.evaluate((h) => { document.getElementById('stage').innerHTML = h; }, html('r1'));
    await page.evaluate(() => { window.S = new Mozert('#r1', { reel: { play: 'click', sound: true }, thumbs: { count: 4 }, lightbox: true, autoplay: true, autoplaySpeed: 900, infinite: true }); window.EV = []; ['reelPlay', 'reelPause', 'reelEnd'].forEach((n) => S.on(n, (_s, i) => EV.push(n + ':' + i))); });
    await page.waitForTimeout(300);

    // play buttons only on video slides
    let r = await page.evaluate(() => ({ real: [...document.querySelectorAll('#r1 .mozert-slide:not(.mozert-cloned)')].map((e) => !!e.querySelector('.mozert-vplay')), thumbs: [...document.querySelectorAll('.mozert-thumbs .mozert-thumb-video')].length, label: document.querySelector('.mozert-vplay').getAttribute('aria-label') }));
    ok(JSON.stringify(r.real) === '[true,true,false,true,false]', tag + 'play button only on video slides', r.real);
    ok(r.thumbs === 3, tag + 'thumbnails mark the 3 video slides', r.thumbs);
    ok(r.label === 'Play video', tag + 'play button has an accessible label', r.label);

    // click plays inline, holds autoplay
    await page.evaluate(() => S.pause && 0);
    await page.click('#r1 .mozert-slide.mozert-current .mozert-vplay');
    await page.waitForTimeout(400);
    r = await page.evaluate(() => { const s = document.querySelector('#r1 .mozert-slide.mozert-current'); const v = s.querySelector('video.mozert-vid'); return { playing: s.classList.contains('mozert-vplaying'), vid: !!v, paused: v && v.paused, muted: v && v.muted, hold: S._pause.has('reel'), cur: S.currentSlide(), ev: EV.slice() }; });
    ok(r.playing && r.vid, tag + 'click creates an inline video and marks the slide playing', r);
    ok(r.muted === false, tag + 'a viewer click plays with sound', r.muted);
    ok(r.hold === true, tag + 'autoplay waits while the video plays', r);
    ok(r.ev.indexOf('reelPlay:0') > -1, tag + 'reelPlay event fires', r.ev);
    await page.waitForTimeout(1400); // longer than autoplaySpeed: must not advance
    r = await page.evaluate(() => ({ cur: S.currentSlide() }));
    ok(r.cur === 0, tag + 'slider stays on the playing video', r);

    // video ends: hold released, event fires
    await page.waitForFunction(() => EV.some((e) => e.indexOf('reelEnd') === 0), null, { timeout: 5000 }).catch(() => {});
    r = await page.evaluate(() => ({ ev: EV.slice(), hold: S._pause.has('reel') }));
    ok(r.ev.some((e) => e.indexOf('reelEnd') === 0), tag + 'reelEnd fires when the clip finishes', r.ev);
    ok(r.hold === false, tag + 'autoplay resumes after the clip', r);

    // leaving a slide stops the video and removes the player
    await page.evaluate(() => { S.goTo(0, true); });
    await page.waitForTimeout(200);
    await page.click('#r1 .mozert-slide.mozert-current .mozert-vplay');
    await page.waitForTimeout(300);
    await page.evaluate(() => S.goTo(2));
    await page.waitForTimeout(700);
    r = await page.evaluate(() => ({ vids: document.querySelectorAll('#r1 .mozert-vid').length, playing: document.querySelectorAll('#r1 .mozert-vplaying').length, hold: S._pause.has('reel') }));
    ok(r.vids === 0 && r.playing === 0 && !r.hold, tag + 'leaving the slide stops the video', r);

    // embed: click builds a nocookie iframe, leaving removes it
    await page.evaluate(() => { S.goTo(1, true); });
    await page.waitForTimeout(300);
    await page.click('#r1 .mozert-slide.mozert-current .mozert-vplay');
    r = await page.evaluate(() => { const f = document.querySelector('#r1 .mozert-slide.mozert-current iframe.mozert-vframe'); return f ? { src: f.src, title: f.title, allow: f.getAttribute('allow') } : null; });
    ok(r && r.src.indexOf('https://www.youtube-nocookie.com/embed/dQw4w9WgXcQ') === 0 && r.src.indexOf('autoplay=1') > -1, tag + 'embed uses the privacy-friendly YouTube host with autoplay', r);
    ok(r && /fullscreen/.test(r.allow) && r.title === 'Play video', tag + 'embed allows fullscreen and has a title', r);
    await page.evaluate(() => S.goTo(2));
    await page.waitForTimeout(700);
    r = await page.evaluate(() => document.querySelectorAll('#r1 iframe.mozert-vframe').length);
    ok(r === 0, tag + 'leaving removes the embed (it stops playing)', r);

    // native <video> slide: button plays it; second click path
    await page.evaluate(() => S.goTo(3, true));
    await page.waitForTimeout(300);
    await page.click('#r1 .mozert-slide.mozert-current .mozert-vplay');
    await page.waitForTimeout(400);
    r = await page.evaluate(() => { const v = document.querySelector('#r1 .mozert-slide.mozert-current video'); return { paused: v.paused, t: v.currentTime }; });
    ok(r.paused === false || r.t > 0, tag + 'a slide with its own <video> plays from the button', r);
    await page.evaluate(() => S.goTo(4));
    await page.waitForTimeout(700);
    r = await page.evaluate(() => { const v = document.querySelector('#r1 video:not(.mozert-vid)'); return v.paused; });
    ok(r === true, tag + 'the own <video> pauses when the slide is left', r);

    // lightbox: video slides open a player, no zoom button; picture slides still zoom
    await page.evaluate(() => { S.goTo(0, true); S.lightbox.open(0); });
    await page.waitForTimeout(400);
    r = await page.evaluate(() => ({ vid: !!document.querySelector('.mozert-lb video.mozert-lb-vid'), controls: (document.querySelector('.mozert-lb-vid') || {}).controls, zoomHidden: getComputedStyle(document.querySelector('.mozert-lb-zoom')).display === 'none', cls: document.querySelector('.mozert-lb').classList.contains('mozert-lb-isvideo') }));
    ok(r.vid && r.controls, tag + 'lightbox shows a video player with controls for a video slide', r);
    ok(r.zoomHidden && r.cls, tag + 'lightbox hides the zoom button for video', r);
    await page.keyboard.press('ArrowRight');
    await page.waitForTimeout(300);
    r = await page.evaluate(() => ({ frame: !!document.querySelector('.mozert-lb iframe.mozert-lb-frame') }));
    ok(r.frame, tag + 'lightbox shows an embed for an embed slide', r);
    await page.keyboard.press('ArrowRight');
    await page.waitForTimeout(300);
    r = await page.evaluate(() => ({ img: !!document.querySelector('.mozert-lb img.mozert-lb-img'), zoom: getComputedStyle(document.querySelector('.mozert-lb-zoom')).display !== 'none', vid: !!document.querySelector('.mozert-lb-vid') }));
    ok(r.img && r.zoom && !r.vid, tag + 'a picture slide in the lightbox is a picture with zoom again', r);
    await page.keyboard.press('Escape');
    await page.waitForTimeout(300);
    r = await page.evaluate(() => ({ stray: document.querySelectorAll('.mozert-lb').length }));
    ok(r.stray === 0, tag + 'lightbox closes and leaves no player behind', r);

    // thumbnail click on a video slide goes there
    await page.evaluate(() => S.goTo(0, true));
    await page.waitForTimeout(250);
    await page.click('.mozert-thumbs .mozert-thumb-video >> nth=1');
    await page.waitForTimeout(500);
    r = await page.evaluate(() => S.currentSlide());
    ok(r === 1, tag + 'clicking a video thumbnail moves the slider to it', r);

    // refresh keeps a single button per video slide, destroy cleans up
    await page.evaluate(() => { S.refresh(); S.refresh(); });
    await page.waitForTimeout(300);
    r = await page.evaluate(() => [...document.querySelectorAll('#r1 .mozert-slide:not(.mozert-cloned)')].map((e) => e.querySelectorAll('.mozert-vplay').length));
    ok(JSON.stringify(r) === '[1,1,0,1,0]', tag + 'refresh() does not duplicate play buttons', r);
    await page.evaluate(() => S.destroy());
    await page.waitForTimeout(200);
    r = await page.evaluate(() => ({ btn: document.querySelectorAll('#r1 .mozert-vplay').length, cls: document.querySelectorAll('#r1 .mozert-has-video').length }));
    ok(r.btn === 0 && r.cls === 0, tag + 'destroy() removes play buttons', r);

    // play: 'active' autoplays (muted) the video that becomes current; next:true advances on end
    await page.evaluate((h) => { document.getElementById('stage').innerHTML = h; }, html('r2'));
    await page.evaluate(() => { window.A = new Mozert('#r2', { reel: { play: 'active', next: true }, infinite: false }); });
    await page.waitForTimeout(700);
    r = await page.evaluate(() => { const v = document.querySelector('#r2 .mozert-slide.mozert-current video.mozert-vid'); return v ? { muted: v.muted, playing: !v.paused || v.currentTime > 0 } : null; });
    ok(r && r.muted === true, tag + 'play:"active" starts the current video muted', r);
    await page.waitForFunction(() => window.A.currentSlide() === 1, null, { timeout: 5000 }).catch(() => {});
    r = await page.evaluate(() => window.A.currentSlide());
    ok(r === 1, tag + 'next:true moves on when the video ends', r);
    await page.evaluate(() => window.A.destroy());

    // api
    await page.evaluate((h) => { document.getElementById('stage').innerHTML = h; }, html('r3'));
    r = await page.evaluate(async () => { const s = new Mozert('#r3', { reel: true, infinite: false }); s.reel.play(); await new Promise((x) => setTimeout(x, 300)); const a = s.reel.isPlaying(); s.reel.pause(); const b = s.reel.isPlaying(); s.destroy(); return [a, b]; });
    ok(r[0] === true && r[1] === false, tag + 'sl.reel.play/pause/isPlaying work', r);
    ok(errs.length === 0, tag + 'no JS errors', errs);
    await ctx.close();
  }
  await browser.close(); srv.close();
  console.log(`[reel ${target}]  ${pass} passed, ${fail} failed`);
  failures.forEach((f) => console.log('FAIL ' + f));
  process.exit(fail ? 1 : 0);
})();
