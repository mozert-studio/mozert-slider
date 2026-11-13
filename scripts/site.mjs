// Static site generator for the Mozert Slider website. Usage: node scripts/site.mjs  ->  site/
import { readFileSync, writeFileSync, mkdirSync, copyFileSync, rmSync, readdirSync, existsSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

import { createRequire } from 'node:module';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const require = createRequire(import.meta.url);
const M = require(join(root, 'dist/mozert.js'));
const pkg = JSON.parse(readFileSync(join(root, 'package.json'), 'utf8'));
const V = pkg.version;
const PKG = pkg.name;
const OUT = join(root, 'site');
const SITE_URL = (process.env.SITE_URL || 'https://mozert-slider.netlify.app').replace(/\/$/, '');
const esc = (s) => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
import { sizes, SUPPORT } from './facts.mjs';
const SZ = sizes();
const CDN = `https://cdn.jsdelivr.net/npm/${PKG}@${V.split('.')[0]}/dist`;

const code = (s, lang = '') => `<pre data-copy><code>${esc(s.replace(/^\n/, '').replace(/\s+$/, ''))}</code></pre>`;
const tabs = (items) => {
  const id = 't' + Math.random().toString(36).slice(2, 7);
  return `<div class="tabs"><div role="tablist">${items.map((t, i) => `<button role="tab" aria-selected="${i === 0}" id="${id}-${i}" aria-controls="${id}-p${i}" type="button">${esc(t[0])}</button>`).join('')}</div>${items.map((t, i) => `<div role="tabpanel" id="${id}-p${i}" aria-labelledby="${id}-${i}" ${i ? 'hidden' : ''}>${code(t[1])}</div>`).join('')}</div>`;
};
const table = (head, rows, cls = []) => `<div class="tw"><table><thead><tr>${head.map((h) => `<th>${h}</th>`).join('')}</tr></thead><tbody>${rows.map((r) => `<tr>${r.map((c, i) => { let k = ''; if (c === '✓') k = ' class="y"'; else if (c === '✗') k = ' class="n"'; else if (c === '~') k = ' class="p"'; return `<td${k}>${c}</td>`; }).join('')}</tr>`).join('')}</tbody></table></div>`;

/* ---------------------------------------------------------------- demos */
// Demo slides are neutral numbered panels, so the demo shows the slider behaviour and nothing else.
// Drop your own photos into site-src/photos/ (jpg, jpeg, png, webp) and they replace these panels automatically.
const PHOTOS = existsSync(join(root, 'site-src/photos')) ? readdirSync(join(root, 'site-src/photos')).filter((f) => /\.(jpe?g|png|webp)$/i.test(f)).sort() : [];
const slides = (n, base, mode) => Array.from({ length: n }, (_, i) => {
  if (PHOTOS.length) return `<div><img class="${mode === 'zoom' ? 'mozert-zoom-target' : ''}" src="${base}assets/photos/${PHOTOS[i % PHOTOS.length]}" alt="Slide ${i + 1}" loading="lazy" width="1280" height="720"></div>`;
  const num = String(i + 1).padStart(2, '0');
  return `<div><div class="sc sc-${i % 8}${mode === 'mini' ? ' mini' : ''}${mode === 'zoom' ? ' mozert-zoom-target' : ''}"><i class="sc-s"></i><span class="sc-k">Slide</span><strong class="sc-h"${mode === 'cap' ? ' data-parallax-x="-30%"' : ''}>${num}</strong><span class="sc-p">Mozert Slider</span></div></div>`;
}).join('');
const DEMOS = [
  { id: 'd-basic', title: 'Basic with dots and autoplay', desc: 'The classic. Pauses on hover and focus, respects prefers-reduced-motion.', n: 5, opts: { dots: true, autoplay: true, autoplaySpeed: 3500 } },
  { id: 'd-multi', title: 'Fractional slides per view + gap', desc: 'slidesToShow: 2.4 peeks the next card; spaceBetween replaces margin hacks. Breakpoints can be max-width (default) or min-width with mobileFirst.', n: 8, opts: { slidesToShow: 2.4, spaceBetween: 16, infinite: false, responsive: [{ breakpoint: 640, settings: { slidesToShow: 1.3 } }] } },
  { id: 'd-bleed', plain: true, title: 'Bleed layout', desc: 'The first slide lines up with the page content, the rest run off the right edge of the screen. As you scroll, slides leave through the left edge, and the last slide stops at the content edge.', n: 8, opts: { bleed: true, slidesToShow: 2.6, spaceBetween: 16, infinite: false, dots: false, responsive: [{ breakpoint: 640, settings: { slidesToShow: 1.4 } }] } },
  { id: 'd-center', title: 'Center mode', desc: 'Active slide centred, neighbours peek. centerPadding sets the peek width.', n: 6, opts: { centerMode: true, centerPadding: '80px', slidesToShow: 1, spaceBetween: 16, dots: true, responsive: [{ breakpoint: 640, settings: { centerPadding: '32px' } }] } },
  { id: 'd-coverflow', title: 'Coverflow effect', desc: 'Centred 3D coverflow with rotate, depth and stretch options. Works with loop, drag and keyboard.', n: 7, opts: { effect: 'coverflow', slidesToShow: 3, infinite: true, speed: 600, cssEase: 'cubic-bezier(.25,.8,.25,1)', coverflowEffect: { rotate: 40, depth: 140, modifier: 1 }, responsive: [{ breakpoint: 900, settings: { slidesToShow: 2.4 } }, { breakpoint: 640, settings: { slidesToShow: 1.5, arrows: false, dots: true, coverflowEffect: { rotate: 34, depth: 90, modifier: 1 } } }] } },
  { id: 'd-3d', kind: 'tiles', title: '3D carousel with raised background cards', desc: 'Coverflow with lift and fade: the active card is large, neighbours turn away, and cards further back rise and fade. Drag, click a card, or use the arrows.', n: 9, opts: { effect: 'coverflow', centerMode: true, slidesToShow: 3.4, spaceBetween: 0, infinite: true, speed: 650, cssEase: 'cubic-bezier(.25,.8,.25,1)', focusOnSelect: true, dots: false, coverflowEffect: { rotate: 34, depth: 200, scale: 0.8, lift: 70, fade: 0.14, modifier: 1 }, responsive: [{ breakpoint: 640, settings: { slidesToShow: 1.7, arrows: false } }] } },
  { id: 'd-expand', kind: 'expand', title: 'Expanding cards', desc: 'effect: "expand". The active card opens wide while the others stay narrow, and the stage colour follows the active card. Drag, click a card or use the arrows.', n: 7, opts: { effect: 'expand', slidesToShow: 4.4, spaceBetween: 14, infinite: true, speed: 650, cssEase: 'cubic-bezier(.25,.8,.25,1)', focusOnSelect: true, dots: false, expandEffect: { extra: 1.25 }, responsive: [{ breakpoint: 900, settings: { slidesToShow: 3.2, expandEffect: { extra: 1.1 } } }, { breakpoint: 640, settings: { slidesToShow: 1.9, arrows: false, expandEffect: { extra: 0.9 } } }] } },
  { id: 'd-thumbs1', kind: 'thumbs', title: 'Thumbnail gallery with one option', desc: 'One option builds the thumbnail strip, highlights the active one and keeps both in sync. Pass a selector (thumbs: "#nav") to use your own strip, or { count: 4 } to change how many show. The magnifier button (top right of the picture, magnifier: true) turns on hover zoom: move the mouse over the picture to magnify it.', n: 6, opts: { thumbs: { count: 4, options: { responsive: [{ breakpoint: 640, settings: { slidesToShow: 3 } }] } }, magnifier: true, slidesToShow: 1, dots: false } , extra: '<p class="meta mnote">On phones every gallery puts the strip below the picture. On wider screens it can also sit left or right (see the next two examples).</p>' },
  { id: 'd-thumbs2', kind: 'thumbs', title: 'Vertical thumbnails: main picture left, thumbs right', desc: 'thumbs: { position: "right", count: 4 }. The strip stands beside the main picture, and its thumbnails always fill the same height. Use position: "left" to flip it.', n: 8, opts: { thumbs: { position: 'right', count: 4 }, slidesToShow: 1, dots: false } },
  { id: 'd-product', kind: 'thumbs', title: 'Product gallery: thumbs on the left, hover magnifier', desc: 'thumbs: { position: "left" } with magnifier: true, like a shop product page. Turn on the magnifier button, then move the mouse over the picture to zoom into the detail. On phones the strip drops below the picture.', n: 6, opts: { thumbs: { position: 'left', count: 4 }, magnifier: { zoom: 2.4 }, slidesToShow: 1, dots: false, arrows: false } },
  { id: 'd-lightbox', title: 'Lightbox: click a slide to open it full screen', desc: 'lightbox: true. Next and previous, arrow keys, swipe, click the picture to zoom, Esc to close. With real images it opens the big version (data-full or a link to the file) and shows data-caption.', n: 6, opts: { lightbox: true, slidesToShow: 3, spaceBetween: 14, dots: true, responsive: [{ breakpoint: 640, settings: { slidesToShow: 1.4 } }] } },
  { id: 'd-scroll', kind: 'scroll', plain: true, title: 'Scroll-driven slider', desc: 'scrollDriven: true. Scroll down: the slider fills the screen and sticks while the slides move sideways with your scroll, then the page carries on.', n: 6, opts: { scrollDriven: { fill: true, offset: 76, bottom: 24, speed: 2.4, maxHeight: 640 }, slidesToShow: 1.5, responsive: [{ breakpoint: 640, settings: { slidesToShow: 1.15, scrollDriven: { fill: true, offset: 76, bottom: 24, speed: 2.4, maxHeight: 420 } } }], spaceBetween: 16, infinite: false, arrows: false, dots: false, draggable: false } },
  { id: 'd-arrows', title: 'Custom arrows and controls placed anywhere', desc: 'prevArrow and nextArrow take your own markup. appendArrows and appendDots move the arrows and dots into any element, here a control bar under the slider.', n: 6, extra: '<div class="cbar"><div class="cbar-a" id="arrows-bar-a"></div><div class="cbar-d" id="arrows-bar-d"></div></div>', opts: { slidesToShow: 2.2, spaceBetween: 16, arrows: true, dots: true, prevArrow: '<button type="button" class="mz-arr">&larr; Prev</button>', nextArrow: '<button type="button" class="mz-arr">Next &rarr;</button>', appendArrows: '#arrows-bar-a', appendDots: '#arrows-bar-d', responsive: [{ breakpoint: 640, settings: { slidesToShow: 1.2 } }] } },
  { id: 'd-pad', title: 'centerPadding: a wide peek on both sides', desc: 'centerMode with centerPadding: "140px" shows a big slice of the neighbours; the responsive setting shrinks it to 36px on phones.', n: 6, opts: { centerMode: true, centerPadding: '140px', slidesToShow: 1, spaceBetween: 14, dots: true, responsive: [{ breakpoint: 640, settings: { centerPadding: '36px' } }] } },
  { id: 'd-rtl', title: 'Right to left (rtl)', desc: 'rtl: true starts from the right, reverses the swipe and arrow directions and the keyboard arrows. Use it for Arabic, Hebrew and Urdu pages.', n: 6, opts: { rtl: true, slidesToShow: 2.2, spaceBetween: 16, dots: true, responsive: [{ breakpoint: 640, settings: { slidesToShow: 1.2 } }] } },
  { id: 'd-cube', title: 'Cube effect', desc: 'A real 3D cube that follows your finger while dragging.', n: 4, opts: { effect: 'cube', pagination: { type: 'bullets' }, speed: 600 } },
  { id: 'd-flip', title: 'Flip effect', desc: 'Slides flip around the Y axis. Drag to scrub through the flip.', n: 4, opts: { effect: 'flip', pagination: { type: 'bullets' }, speed: 600 } },
  { id: 'd-cards', title: 'Cards effect', desc: 'A swipeable stack: drag the top card away to reveal the next.', n: 6, opts: { effect: 'cards', arrows: false, cardsEffect: { perSlideOffset: 12, perSlideRotate: 3 } } },
  { id: 'd-creative', title: 'Creative effect', desc: 'Describe how previous and next slides translate, rotate, scale and fade. Everything else is interpolated for you.', n: 5, opts: { effect: 'creative', speed: 700, creativeEffect: { prev: { translate: ['-40%', 0, -300], rotate: [0, 0, -8], opacity: 0 }, next: { translate: ['100%', 0, 0] } } } },
  { id: 'd-fade', title: 'Fade with progress-bar pagination', desc: 'Cross-fade plus a progress bar that follows the slider. Autoplay emits autoplayTimeLeft if you want your own timer UI.', n: 4, opts: { fade: true, autoplay: true, autoplaySpeed: 2800, pagination: { type: 'progressbar' }, arrows: false } },
  { id: 'd-free', title: 'Free mode + mousewheel + scrollbar', desc: 'Momentum scrolling that stops anywhere. Try dragging fast, using the mouse wheel, or dragging the scrollbar.', n: 10, opts: { freeMode: true, mousewheel: true, scrollbar: { draggable: true }, slidesToShow: 3.2, spaceBetween: 12, infinite: false, arrows: false, responsive: [{ breakpoint: 640, settings: { slidesToShow: 1.8 } }] } },
  { id: 'd-frac', title: 'Fraction pagination', desc: 'Also available: bullets, dynamic bullets, progressbar and custom renderers.', n: 6, opts: { pagination: { type: 'fraction' } } },
  { id: 'd-dyn', title: 'Dynamic bullets for long lists', desc: 'Only the bullets around the active slide are shown at full size.', n: 12, opts: { pagination: { type: 'dynamic', clickable: true } } },
  { id: 'd-vert', title: 'Vertical slider', desc: 'Set vertical: true. Drag, keys and wheel follow the vertical axis.', n: 6, v: true, opts: { vertical: true, slidesToShow: 2, spaceBetween: 12, mousewheel: true, dots: true } },
  { id: 'd-par', kind: 'parallax', title: 'Parallax', desc: 'Add data-parallax-x / -y / -scale / -opacity to any element inside a slide. Here the background, label, number and caption each travel at a different speed while you drag or click.', n: 5, opts: { parallax: true, speed: 900, dots: true } },
  { id: 'd-dyn-add', kind: 'dynamic', title: 'Add and remove slides at runtime', desc: 'slider.add(html, index, addBefore) and slider.remove(index) rebuild the layout and keep the current slide. Try it.', n: 4, opts: { slidesToShow: 3, spaceBetween: 12, infinite: false, dots: true, responsive: [{ breakpoint: 640, settings: { slidesToShow: 1.15 } }] }, shown: "const slider = new Mozert('#slider', { slidesToShow: 3, infinite: false, responsive: [{ breakpoint: 640, settings: { slidesToShow: 1.15 } }] });\n\nslider.add('<div>New slide</div>');        // append\nslider.add('<div>First</div>', true);       // prepend\nslider.add('<div>After #2</div>', 1);       // after index 1\nslider.remove(slider.slideCount() - 1);    // remove last\nslider.removeAll();                         // clear", extra: '<div class="ctl"><button type="button" data-act="add">Add slide</button><button type="button" data-act="addfirst">Add at start</button><button type="button" data-act="remove">Remove last</button><button type="button" data-act="removefirst">Remove first</button><button type="button" data-act="reset">Reset</button><span class="meta" data-count></span></div>' },
  { id: 'd-filter', kind: 'filter', title: 'Filtering slides', desc: 'slider.filter(selector) shows only matching slides, slider.unfilter() brings everything back. A function works too.', n: 9, opts: { slidesToShow: 2.4, spaceBetween: 12, infinite: false, dots: true, responsive: [{ breakpoint: 640, settings: { slidesToShow: 1.15 } }] }, shown: "const slider = new Mozert('#slider', { slidesToShow: 2.4, infinite: false, responsive: [{ breakpoint: 640, settings: { slidesToShow: 1.15 } }] });\n\nslider.filter('.cat-a');                      // selector\nslider.filter((el, i) => i % 2 === 0);         // or a function\nslider.unfilter();                             // show all", extra: '<div class="ctl"><button type="button" data-act="all" aria-pressed="true">All</button><button type="button" data-act=".cat-a" aria-pressed="false">Category A</button><button type="button" data-act=".cat-b" aria-pressed="false">Category B</button><button type="button" data-act=".cat-c" aria-pressed="false">Category C</button><span class="meta" data-count></span></div>' },
  { id: 'd-zoom', title: 'Zoom: double-click, pinch, pan', desc: 'Double-click (or double-tap) an image. While zoomed, drag pans the image instead of changing slides.', n: 4, opts: { zoom: { max: 3 }, dots: true } },
  { id: 'd-virtual', kind: 'virtual', title: 'Virtual slides: 2,000 slides, a handful of DOM nodes', desc: 'Only the slides near the viewport hold content. Jump around with the dots or arrows.', n: 0, opts: { infinite: false, slidesToShow: 3, spaceBetween: 12, arrows: true }, extra: '<p class="meta" id="d-virtual-count" aria-live="polite"></p>' },
  { id: 'd-marquee', title: 'Marquee / ticker', desc: 'Continuous logo strip. Pauses on hover, stops entirely for reduced-motion users.', n: 0, chips: ['ACME', 'NORTHWIND', 'GLOBEX', 'INITECH', 'UMBRELLA', 'HOOLI', 'STARK', 'WAYNE'], opts: { marquee: { speed: 70 }, slidesToShow: 4, spaceBetween: 14, responsive: [{ breakpoint: 640, settings: { slidesToShow: 2.5 } }] } },
];

const PAR = ['Layer', 'Depth', 'Motion', 'Speed', 'Scroll'];
const parSlides = (n) => Array.from({ length: n }, (_, i) => `<div><div class="sc par sc-${i % 8}"><div class="par-bg" data-parallax-x="-30%"><i class="sc-s"></i></div><span class="sc-k" data-parallax-x="-60%">${PAR[i % 5]}</span><strong class="sc-h" data-parallax-x="-110%">${String(i + 1).padStart(2, '0')}</strong><span class="sc-p" data-parallax-x="-180%" data-parallax-opacity="0">Each layer moves at its own speed</span></div></div>`).join('');
const catSlides = (n) => Array.from({ length: n }, (_, i) => { const c = 'abc'[i % 3]; return `<div class="cat-${c}"><div class="sc sc-${i % 8}"><i class="sc-s"></i><span class="sc-k">Category ${c.toUpperCase()}</span><strong class="sc-h">${String(i + 1).padStart(2, '0')}</strong><span class="sc-p">Mozert Slider</span></div></div>`; }).join('');
const SC_BG = ['#ff6a3d', '#3633f5', '#1f2a44', '#0f8a63', '#7a3cff', '#0b1020', '#f59e0b', '#c2185b'];
// Same numbered panels as every other demo; expand also tags each slide with its stage colour.
const expandSlides = (n, base) => slides(n, base).replace(/<div><div class="sc sc-(\d)/g, (m, k) => `<div data-bg="${SC_BG[+k]}"><div class="sc sc-${k}`);
const CATS = [['basics', 'Basics'], ['effects', 'Effects'], ['galleries', 'Galleries'], ['controls', 'Controls'], ['advanced', 'Advanced']];
const CAT = { 'd-basic': 'basics', 'd-multi': 'basics', 'd-bleed': 'basics', 'd-center': 'basics', 'd-pad': 'basics', 'd-rtl': 'basics', 'd-vert': 'basics', 'd-coverflow': 'effects', 'd-3d': 'effects', 'd-expand': 'effects', 'd-cube': 'effects', 'd-flip': 'effects', 'd-cards': 'effects', 'd-creative': 'effects', 'd-fade': 'effects', 'd-thumbs1': 'galleries', 'd-thumbs2': 'galleries', 'd-product': 'galleries', 'thumbs': 'galleries', 'd-lightbox': 'galleries', 'd-zoom': 'galleries', 'd-arrows': 'controls', 'd-frac': 'controls', 'd-dyn': 'controls', 'd-free': 'controls', 'd-scroll': 'advanced', 'd-par': 'advanced', 'd-dyn-add': 'advanced', 'd-filter': 'advanced', 'd-virtual': 'advanced', 'd-marquee': 'advanced' };
const SHORT = { 'd-basic': 'Basic', 'd-multi': 'Fractional slides', 'd-bleed': 'Bleed layout', 'd-center': 'Center mode', 'd-pad': 'centerPadding', 'd-rtl': 'Right to left', 'd-vert': 'Vertical', 'd-coverflow': 'Coverflow', 'd-3d': '3D carousel', 'd-expand': 'Expanding cards', 'd-cube': 'Cube', 'd-flip': 'Flip', 'd-cards': 'Cards', 'd-creative': 'Creative', 'd-fade': 'Fade', 'd-thumbs1': 'Thumbnails', 'd-thumbs2': 'Thumbs on the right', 'd-product': 'Product gallery', 'd-lightbox': 'Lightbox', 'd-zoom': 'Zoom', 'd-arrows': 'Custom arrows', 'd-frac': 'Fraction pagination', 'd-dyn': 'Dynamic bullets', 'd-free': 'Free mode', 'd-scroll': 'Scroll-driven', 'd-par': 'Parallax', 'd-dyn-add': 'Add and remove', 'd-filter': 'Filtering', 'd-virtual': 'Virtual slides', 'd-marquee': 'Marquee' };
const pre = (d) => {
  if (d.opts.vertical || d.kind === 'virtual') return '';
  const sp = d.opts.spaceBetween || 0;
  const rs = ((d.opts.responsive || []).filter((r) => r.breakpoint <= 640).sort((x, y) => x.breakpoint - y.breakpoint)[0] || {}).settings || {};
  const w = (n) => (sp ? `calc(${(100 / n).toFixed(3)}% - ${(sp * (n - 1) / n).toFixed(2)}px)` : (100 / n).toFixed(3) + '%');
  const n = d.opts.slidesToShow || 1;
  const sd = d.opts.scrollDriven, sds = rs.scrollDriven;
  let v = `--mozert-pre-gap:${sp}px;--mozert-pre-w:${w(n)}`;
  if (rs.slidesToShow) v += `;--mozert-pre-w-sm:${w(rs.slidesToShow)}`;
  if (d.opts.centerMode && d.opts.centerPadding) v += `;--mozert-pre-pad:${d.opts.centerPadding}`;
  if (rs.centerPadding) v += `;--mozert-pre-pad-sm:${rs.centerPadding}`;
  if (sd && sd.maxHeight) v += `;--mozert-pre-h:${sd.maxHeight}px`;
  if (sds && sds.maxHeight) v += `;--mozert-pre-h-sm:${sds.maxHeight}px`;
  return ` class="mozert-pre" style="${v}"`;
};
const demoHtml = (d, base) => {
  const inner = d.chips ? d.chips.map((c) => `<div><div class="chip">${c}</div></div>`).join('') : d.kind === 'virtual' ? '' : d.kind === 'parallax' ? parSlides(d.n) : d.kind === 'filter' ? catSlides(d.n) : d.kind === 'tiles' ? slides(d.n, base) : d.kind === 'expand' ? expandSlides(d.n, base) : slides(d.n, base, d.id === 'd-zoom' ? 'zoom' : '');
  const shown = d.shown || (d.kind === 'virtual' ? `const slides = Array.from({ length: 2000 }, (_, i) => '<div>Slide ' + (i + 1) + '</div>');\nnew Mozert('#slider', {\n  virtual: { slides, addSlidesBefore: 2, addSlidesAfter: 3 },\n  slidesToShow: 3, spaceBetween: 12, infinite: false\n});` : `new Mozert('#slider', ${JSON.stringify(d.opts, null, 2)});`);
  return `<article class="demo${d.plain ? ' plain' : ''}" id="${d.id}-box" data-cat="${CAT[d.id] || ''}"><h3>${esc(d.title)}</h3><p>${esc(d.desc)}</p><div class="stage${d.v ? ' v' : ''}${d.kind === 'tiles' ? ' tiles' : ''}${d.kind === 'expand' ? ' xstage' : ''}${d.kind === 'scroll' ? ' sdstage' : ''}"><div id="${d.id}"${pre(d)}>${inner}</div></div>${d.extra || ''}<details><summary>Code</summary>${code(shown)}</details></article>`;
};

/* ---------------------------------------------------------------- shell */
const NAV = [['', 'Home'], ['features', 'Features'], ['examples', 'Examples'], ['docs', 'Docs'], ['installation', 'Install'], ['api', 'API'], ['blog', 'Blog'], ['changelog', 'Changelog']];
const FONTS = 'https://fonts.googleapis.com/css2?family=Instrument+Sans:wght@400;500;600&family=JetBrains+Mono:wght@400;600&family=Unbounded:wght@500;700&display=swap';
const rel = (from, to) => { const up = from ? '../'.repeat(from.split('/').length) : ''; return up + (to ? to + '/' : '') + 'index.html'; };
const base = (path) => (path ? '../'.repeat(path.split('/').length) : '');

function shell(page, bodyHtml, extraHead = '', scripts = '') {
  const b = base(page.path);
  const links = NAV.map(([p, t]) => `<a href="${rel(page.path, p)}"${p === page.path ? ' aria-current="page"' : ''}>${t}</a>`).join('');
  return `<!doctype html>
<html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>${esc(page.title)}</title><meta name="description" content="${esc(page.desc)}">
<link rel="canonical" href="${SITE_URL}/${page.path ? page.path + '/' : ''}"><link rel="icon" type="image/png" sizes="32x32" href="${b}assets/favicon-32.png"><link rel="apple-touch-icon" href="${b}assets/apple-touch-icon.png"><meta name="theme-color" content="#3633f5">
<meta property="og:type" content="website"><meta property="og:site_name" content="Mozert Slider"><meta property="og:title" content="${esc(page.title)}"><meta property="og:description" content="${esc(page.desc)}"><meta property="og:url" content="${SITE_URL}/${page.path ? page.path + '/' : ''}"><meta property="og:image" content="${SITE_URL}/assets/og.png"><meta property="og:image:width" content="1200"><meta property="og:image:height" content="630">
<meta name="twitter:card" content="summary_large_image"><meta name="twitter:title" content="${esc(page.title)}"><meta name="twitter:description" content="${esc(page.desc)}"><meta name="twitter:image" content="${SITE_URL}/assets/og.png">${page.path === '' ? `
<script type="application/ld+json">${JSON.stringify({ '@context': 'https://schema.org', '@type': 'SoftwareApplication', name: 'Mozert Slider', alternateName: PKG, applicationCategory: 'DeveloperApplication', operatingSystem: 'Web', softwareVersion: V, description: page.desc, url: SITE_URL + '/', license: 'https://opensource.org/licenses/MIT', codeRepository: 'https://github.com/mozert-studio/mozert-slider', author: { '@type': 'Organization', name: 'Mozert Studio' }, offers: { '@type': 'Offer', price: '0', priceCurrency: 'USD' } })}</script>` : ''}
<link rel="preconnect" href="https://fonts.googleapis.com"><link rel="stylesheet" href="${FONTS}">
<link rel="stylesheet" href="${b}assets/mozert.min.css"><link rel="stylesheet" href="${b}assets/mozert-theme.min.css"><link rel="stylesheet" href="${b}assets/site.css">${extraHead}
</head><body>
<header class="top"><div class="wrap bar"><a class="logo" href="${rel(page.path, '')}" aria-label="Mozert Slider home"><img src="${b}assets/logo.png" alt="Mozert Slider" width="262" height="40"></a>
<nav class="main" aria-label="Primary">${links}</nav>
<button class="tt" type="button" aria-label="Toggle dark mode"><svg width="18" height="18" viewBox="0 0 24 24" aria-hidden="true"><circle cx="12" cy="12" r="8.5" fill="none" stroke="currentColor" stroke-width="2"/><path d="M12 3.5a8.5 8.5 0 0 1 0 17z" fill="currentColor"/></svg></button>
<details class="menu"><summary aria-label="Menu"><span class="bars" aria-hidden="true"><i></i><i></i><i></i></span></summary><nav aria-label="Primary mobile">${links}</nav></details></div></header>
<main class="wrap">${bodyHtml}</main>
<footer><div class="wrap fcols"><div><img class="flogo" src="${b}assets/logo-stacked.png" alt="Mozert Slider" width="140" height="90"><br><strong>Mozert Slider</strong> v${V}<br>MIT licensed. Made by Mozert Studio.<br><code>npm i ${PKG}</code><br><a href="https://github.com/mozert-studio/mozert-slider">GitHub</a> · <a href="https://www.npmjs.com/package/${PKG}">npm</a></div>
<div>${NAV.slice(1, 5).map(([p, t]) => `<a href="${rel(page.path, p)}">${t}</a>`).join('')}</div><div>${NAV.slice(5).map(([p, t]) => `<a href="${rel(page.path, p)}">${t}</a>`).join('')}</div></div></footer>
<script src="${b}assets/site.js"></script>
<script src="${b}assets/mozert.min.js"></script>${scripts}
</body></html>`;
}
const demoScripts = (b, demos) => `<script>window.MZ_DEMOS=${JSON.stringify(demos.map(({ id, kind, opts }) => ({ id, kind, opts })))};</script><script src="${b}assets/demos.js"></script>`;

/* ---------------------------------------------------------------- pages */
const pages = [];
const add = (path, title, desc, body, opts = {}) => pages.push({ path, title, desc, body, ...opts });

// HOME
{
  const hero = DEMOS.find((d) => d.id === 'd-coverflow');
  const heroDemo = { ...hero, id: 'hero-demo', opts: { ...hero.opts, slidesToShow: 2.4 } };
  const heroDemos = [heroDemo];
  add('', 'Mozert Slider: JavaScript carousel and image slider', 'A dependency-free, accessible carousel with 3D effects, free mode, virtual slides, parallax, zoom and every pagination style.', `
<section class="hero"><div><p class="eyebrow">v${V} · MIT · zero dependencies</p>
<h1>One slider for every layout, effect and device.</h1>
<p class="lead">Mozert Slider is a dependency-free carousel: infinite loops, responsive breakpoints, 3D effects, free mode, virtual slides, parallax and zoom, all in about ${SZ.full.gz} KB gzipped.</p>
<div class="btns"><a class="btn pri" href="${rel('', 'installation')}">Install it</a><a class="btn" href="${rel('', 'examples')}">Live examples</a></div></div>
<div class="stage" style="padding:0 0 18px"><div id="hero-demo">${slides(7, '')}</div></div></section>
<section class="grid" aria-label="Key numbers">
<div class="card"><div class="stat">${SZ.core.gz} KB<small>core, minified + gzip</small></div></div>
<div class="card"><div class="stat">${SZ.full.gz} KB<small>everything (all effects and modules), gzip</small></div></div>
<div class="card"><div class="stat">0<small>dependencies. jQuery optional</small></div></div>
<div class="card"><div class="stat">5 + fade<small>3D effects: coverflow, cube, flip, cards, creative</small></div></div></section>
<h2>What you get</h2>
<div class="grid">
<div class="card"><h3>Complete core</h3><p>Infinite loop, responsive breakpoints, center mode, variable width, rows and grids, lazy load, synced sliders, RTL, vertical, fade, adaptive height, custom arrows and dots, and an optional jQuery adapter.</p></div>
<div class="card"><h3>3D effects and more</h3><p>Coverflow, cube, flip, cards and creative, with drag-follow, plus parallax, zoom, virtual slides, hash navigation, free mode, mousewheel and scrollbar.</p></div>
<div class="card"><h3>Pagination your way</h3><p>Bullets, dynamic bullets, fraction, progress bar and fully custom renderers.</p></div>
<div class="card"><h3>Accessible by default</h3><p>Roles, labels, keyboard, focus handling, live region while paused, and reduced-motion support.</p></div>
<div class="card"><h3>Real touch handling</h3><p>Pointer Events, axis locking, momentum, edge resistance, and no scroll-jacking on vertical swipes.</p></div>
<div class="card"><h3>Framework friendly</h3><p>Vanilla JS with ESM, CJS, UMD and TypeScript types. Works in Magento, Shopify, React, Vue and plain HTML.</p></div></div>
<h2>Try it</h2>${code(`npm install ${PKG}`)}${code(`import Mozert from '${PKG}';
import '${PKG}/css';

new Mozert('.slider', { slidesToShow: 3, spaceBetween: 16, pagination: { type: 'dynamic' } });`)}
`, { extra: demoScripts('', heroDemos), demos: heroDemos });
}

const ico = (d) => `<svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">${d}</svg>`;
const FICON = {
  Layout: [ico('<rect x="3" y="4" width="7" height="7" rx="1.5"/><rect x="14" y="4" width="7" height="7" rx="1.5"/><rect x="3" y="14" width="7" height="6" rx="1.5"/><rect x="14" y="14" width="7" height="6" rx="1.5"/>'), '../examples/#d-multi-box', 'See layouts live'],
  Effects: [ico('<rect x="6" y="6" width="12" height="12" rx="2"/><path d="M3 9v8a2 2 0 0 0 2 2h8M21 15V7a2 2 0 0 0-2-2h-8"/>'), '../examples/#d-coverflow-box', 'See effects live'],
  Navigation: [ico('<path d="M9 6l-6 6 6 6M15 6l6 6-6 6"/>'), '../examples/#d-arrows-box', 'See controls live'],
  Interaction: [ico('<path d="M9 11V5a2 2 0 0 1 4 0v5l5 1.5a2 2 0 0 1 1.4 2.3L18.5 19a2 2 0 0 1-2 1.5H11a2 2 0 0 1-1.6-.8L5 14l1.5-1.5L9 14"/>'), '../examples/#d-free-box', 'Try free mode'],
  Playback: [ico('<circle cx="12" cy="12" r="9"/><path d="M10 8.5l5 3.5-5 3.5z"/>'), '../examples/#d-basic-box', 'See autoplay live'],
  Content: [ico('<rect x="3" y="4" width="18" height="16" rx="2"/><circle cx="9" cy="10" r="1.6"/><path d="M21 16l-5-5-8 8"/>'), '../examples/#d-virtual-box', 'See virtual slides'],
  Accessibility: [ico('<circle cx="12" cy="5" r="2"/><path d="M5 9l7 1.5L19 9M12 10.5V15l-3 5M12 15l3 5"/>'), '../docs/#a11y', 'Read the accessibility guide'],
  Integration: [ico('<path d="M8 8l-5 4 5 4M16 8l5 4-5 4M14 5l-4 14"/>'), '../docs/#init', 'See setup options'],
};
// FEATURES
add('features', 'Features | Mozert Slider', 'Everything Mozert Slider can do: layout, effects, navigation, interaction, content, accessibility and compatibility.', `
<h1>Features</h1><p class="lead">The full list, grouped. Everything here ships in the default bundle and is switched on with options.</p>
<div class="fgrid">${[
  ['Layout', ['Fractional <code>slidesToShow</code> (2.5 slides)', '<code>spaceBetween</code> gap, <code>slideWidth</code>, <code>edgePadding</code>', 'Center mode with <code>centerPadding</code>', '<code>variableWidth</code> slides', 'Rows and <code>slidesPerRow</code> grids', 'Vertical and RTL', '<code>adaptiveHeight</code>', 'Responsive breakpoints (max-width or <code>mobileFirst</code>), including <code>"destroy"</code>']],
  ['Effects', ['Slide and fade', 'Coverflow, cube, flip, cards, creative', 'Effects follow the finger while dragging', 'Per-effect option objects', 'Custom easing and CSS easing']],
  ['Navigation', ['Arrows (custom markup, <code>appendArrows</code>)', 'Dots and <code>customPaging</code>', 'Pagination: bullets, dynamic, fraction, progress bar, custom', 'Scrollbar (draggable, auto-hide)', 'Keyboard (focused or global)', 'Hash navigation and history', 'Mousewheel']],
  ['Interaction', ['Pointer-based drag with axis locking', '<code>touchRatio</code>, <code>dragThreshold</code>, <code>swipeToSlide</code>, <code>edgeFriction</code>', 'Free mode with momentum and sticky snapping', 'Zoom: double-tap, pinch, pan, ctrl+wheel', 'Click to select with <code>focusOnSelect</code>']],
  ['Playback', ['Autoplay with pause on hover, focus and dots hover', '<code>autoplayReverse</code>, <code>stopOnLastSlide</code>, <code>disableOnInteraction</code>', 'Events: <code>autoplayStart</code>, <code>autoplayStop</code>, <code>autoplayTimeLeft</code>', 'Marquee / ticker mode', 'Video autoplay with wait-for-end']],
  ['Content', ['Lazy load: <code>data-lazy</code>, <code>data-lazy-srcset</code>, <code>data-lazy-bg</code>, progressive', 'Virtual slides for thousands of items', 'Parallax on any element', 'Fullscreen button', 'Built-in lightbox: <code>lightbox: true</code>', 'Thumbnail gallery from one option: <code>thumbs: true</code>', 'Scroll-driven slider: <code>scrollDriven: true</code>', 'Add, remove, filter and unfilter slides at runtime', 'Synced sliders via <code>asNavFor</code> (thumbnails, controllers)']],
  ['Accessibility', ['ARIA roles and labels, translatable via <code>labels</code>', 'Roving tabindex and keyboard arrows', 'Live region toggles with autoplay', '<code>prefers-reduced-motion</code> respected', 'Visible focus styles']],
  ['Integration', ['jQuery adapter and DOM events (<code>mozert:afterChange</code>)', 'ESM, CJS, UMD and TypeScript types', '<code>data-mozert</code> JSON config with auto-init', 'Module API: <code>Mozert.use()</code> for your own effects and features']],
].map(([t, items]) => { const ic = FICON[t]; return `<section class="fcard"><span class="fic" aria-hidden="true">${ic[0]}</span><h2>${t}</h2><ul>${items.map((i) => `<li>${i}</li>`).join('')}</ul><a class="more" href="${ic[1]}">${ic[2]} &rarr;</a></section>`; }).join('')}</div>
<h2>Sizes</h2>${table(['File', 'Minified', 'Gzip', 'Brotli'], [['<code>mozert.min.js</code> (core + every effect and module)', SZ.full.raw + ' KB', SZ.full.gz + ' KB', SZ.full.br + ' KB'], ['<code>mozert.core.min.js</code> (core only, no effect modules)', SZ.core.raw + ' KB', SZ.core.gz + ' KB', SZ.core.br + ' KB'], ['<code>mozert.min.css</code> (layout)', SZ.css.raw + ' KB', SZ.css.gz + ' KB', SZ.css.br + ' KB'], ['<code>mozert-theme.min.css</code> (optional theme)', SZ.theme.raw + ' KB', SZ.theme.gz + ' KB', SZ.theme.br + ' KB']])}<p>Measured on the files in <code>dist/</code> for v${V} (gzip via Node zlib level 9, Brotli quality 11; the <code>gzip</code> command line tool reports about 1% less). Use the core-only file when you need just the slider; the full file adds the 3D effects, free mode, virtual slides, parallax, zoom, lightbox, thumbs, magnifier and scroll-driven mode.</p>
<h2 id="browser-support">Browser support</h2>${table(['Browser', 'Minimum version', 'How it is checked'], SUPPORT)}
`);

// EXAMPLES
{
  const th = [{ id: 'th-main', opts: { fade: true, asNavFor: '#th-nav' } }, { id: 'th-nav', opts: { slidesToShow: 4, spaceBetween: 10, asNavFor: '#th-main', focusOnSelect: true, arrows: false, infinite: false, responsive: [{ breakpoint: 640, settings: { slidesToShow: 3 } }] } }];
  const all = DEMOS.concat(th);
  add('examples', 'Examples | Mozert Slider', 'Live, interactive demos of every Mozert Slider effect and feature, with copy-paste code.', `
<h1>Examples</h1><p class="lead">Every demo below is the real library running on this page. Open <em>Code</em> to copy the options.</p>
<div class="cats" id="cats" role="group" aria-label="Filter examples"><button type="button" class="on" data-cat="all">All (${DEMOS.length + 1})</button>${CATS.map(([k, n]) => `<button type="button" data-cat="${k}">${n} (${Object.values(CAT).filter((v) => v === k).length})</button>`).join('')}</div>
<nav class="chips" aria-label="Demos">${DEMOS.map((d) => `<a href="#${d.id}-box" data-cat="${CAT[d.id]}">${esc(SHORT[d.id] || d.title)}</a>`).join('')}<a href="#thumbs-box" data-cat="galleries">asNavFor thumbnails</a></nav>
${DEMOS.map((d) => demoHtml(d, '../')).join('')}
<article class="demo" id="thumbs-box" data-cat="galleries"><h3>Two linked sliders with asNavFor</h3><p>Two sliders that drive each other. Click a thumbnail or swipe the main image.</p><div class="stage"><div id="th-main">${slides(6, '../')}</div></div><div class="stage" style="padding-top:10px"><div id="th-nav">${slides(6, '../', 'mini')}</div></div><details><summary>Code</summary>${code(`new Mozert('#main', { fade: true, asNavFor: '#nav' });
new Mozert('#nav',  { slidesToShow: 4, spaceBetween: 10, asNavFor: '#main', focusOnSelect: true, infinite: false });`)}</details></article>
`, { extra: demoScripts('../', all), demos: all });
}

// DOCS
{
  const D = M.defaults;
  const DESC = {
    accessibility: 'Adds ARIA roles/labels and keyboard support.', adaptiveHeight: 'Animate the list height to the active slide (single-slide views).', appendArrows: 'Element or selector to place both arrows in (for example a control bar under the slider). Default: inside the slider.', appendDots: 'Element or selector to place the dots in. Default: inside the slider, under the slides.', arrows: 'Show previous/next arrows.', asNavFor: 'Selector of another slider to keep in sync (thumbnails, controllers).', autoplay: 'Start automatically.', disableOnInteraction: 'Stop autoplay for good after the user clicks, taps or drags.', autoplayReverse: 'Autoplay moves backwards.', autoplaySpeed: 'Delay between slides in ms.', centerMode: 'Centre the active slide; neighbours peek.', centerPadding: 'Width of the peek on each side in <code>centerMode</code>: "50px" or "10%". Change it per screen size with <code>responsive</code>.', cssEase: 'CSS easing for transitions.', customPaging: 'Function (slider, i) returning markup for dot i.', dots: 'Show dots.', dotsClass: 'Class of the dots list.', dragThreshold: 'Pixels to move before a drag starts.', draggable: 'Mouse dragging (touch is controlled by <code>swipe</code>).', easing: 'Easing used when <code>useCSS</code> is false.', edgeFriction: 'Resistance when dragging past the first/last slide (non-infinite).', edgePadding: 'Space before the first and after the last slide (px or %).', effect: '<code>slide</code>, <code>fade</code>, <code>coverflow</code>, <code>cube</code>, <code>flip</code>, <code>cards</code>, <code>creative</code> or <code>expand</code>.', fade: 'Shortcut for <code>effect: "fade"</code>.', focusOnSelect: 'Clicking a slide makes it active.', freeMode: 'Drag with momentum and no snapping. Accepts an options object.', infinite: 'Loop forever using clones.', initialSlide: 'First slide index.', labels: 'Object overriding built-in ARIA strings (translations).', lazyLoad: '<code>ondemand</code> or <code>progressive</code>.', mobileFirst: 'Breakpoints are min-width instead of max-width.', nextArrow: 'Your own markup (an HTML string) or an element for the next arrow. It gets the class <code>mozert-next</code> and works as the next button.', pauseOnDotsHover: 'Pause autoplay when hovering the dots.', pauseOnFocus: 'Pause autoplay on keyboard focus.', pauseOnHover: 'Pause autoplay on hover.', prevArrow: 'Your own markup (an HTML string) or an element for the previous arrow. It gets the class <code>mozert-prev</code> and works as the previous button.', respectReducedMotion: 'Disable autoplay/animation for prefers-reduced-motion users.', respondTo: '<code>window</code>, <code>slider</code> or <code>min</code> width used for breakpoints.', responsive: 'Array of <code>{ breakpoint, settings }</code>. <code>settings: "destroy"</code> turns the slider off at that breakpoint.', rows: 'Grid rows.', rtl: 'Right-to-left layout for Arabic, Hebrew, Urdu and other RTL pages. Slides start from the right, swipe, arrows and keyboard arrows are reversed, and <code>dir="rtl"</code> is set on the slider.', slide: 'Selector of the slide elements inside the container.', slideWidth: 'Fixed slide width in px; slides per view is computed.', slidesPerRow: 'Columns per page when <code>rows</code> &gt; 1.', slidesToScroll: 'Slides per move.', slidesToShow: 'Slides visible (fractional allowed).', spaceBetween: 'Gap between slides in px.', speed: 'Transition time in ms.', stopOnLastSlide: 'Stop autoplay after the last slide (non-infinite).', swipe: 'Touch swiping.', swipeToSlide: 'Land on the slide nearest the release point.', touchMove: 'Slides follow the finger.', touchRatio: 'Drag distance multiplier.', touchThreshold: 'Fraction of the width needed to change slide (width / value).', useCSS: 'CSS transitions (false = JS animation).', useTransform: 'Use transform instead of left/top.', variableWidth: 'Slides keep their own width.', vertical: 'Vertical slider.', verticalSwiping: 'Vertical swipe gestures.', waitForAnimate: 'Ignore input while animating.', zIndex: 'Base z-index for stacked effects.', on: 'Event handlers object, e.g. <code>{ afterChange(s, i) {} }</code>.', coverflowEffect: '<code>rotate</code>, <code>depth</code>, <code>stretch</code>, <code>scale</code>, <code>modifier</code>, <code>lift</code> (raises background cards), <code>fade</code> (dims them).', expandEffect: '<code>extra</code>: how much wider the active card gets, as a multiple of a slide width (default 1.4). The card inside each slide is resized, so give slides a single child element.', cubeEffect: '<code>perspective</code>.', flipEffect: '<code>perspective</code>, <code>limitRotation</code>.', cardsEffect: '<code>perSlideOffset</code>, <code>perSlideRotate</code>, <code>rotate</code>, <code>visible</code>.', creativeEffect: '<code>prev</code> / <code>next</code> with <code>translate</code>, <code>rotate</code>, <code>opacity</code>, <code>scale</code>; <code>limitProgress</code>.', parallax: 'Enable <code>data-parallax-*</code> attributes.', zoom: '<code>true</code> or <code>{ max, min, toggle, step }</code>.', virtual: '<code>{ slides, renderSlide, addSlidesBefore, addSlidesAfter, cache }</code>.', hashNavigation: '<code>true</code> or <code>{ watchState, replaceState, prefix }</code>. Slides use <code>data-hash</code>.', scrollbar: '<code>true</code> or <code>{ el, draggable, hide }</code>.', pagination: '<code>{ el, type, clickable, renderBullet, ... }</code>. Types: bullets, dynamic, fraction, progressbar, custom.', mousewheel: '<code>true</code> or <code>{ sensitivity, forceToAxis, releaseOnEdges, thresholdTime }</code>.', globalKeyboard: 'Arrow keys control the slider while it is in the viewport.', marquee: '<code>{ speed, pauseOnHover, direction }</code>. Continuous ticker.', videoAutoplay: 'Play the active slide\'s <code>&lt;video&gt;</code>. <code>{ wait }</code> holds autoplay until it ends.', fullscreen: 'Add a fullscreen toggle button.', thumbs: '<code>true</code> builds a thumbnail strip below the slider; a selector or element uses your own strip; <code>{ el, count, options }</code> for more control. Keeps both sliders in sync.', lightbox: 'Click a slide to open it full screen. <code>true</code> or <code>{ zoom, loop, maxZoom }</code>.', magnifier: 'Hover zoom for product galleries. <code>true</code> or <code>{ zoom: 2.2, button: true, active: false }</code>. A button in the top right corner turns it on and off; <code>data-zoom</code> on an image loads a sharper file.', scrollDriven: 'Page scroll moves the slides while the slider sticks to the top. <code>true</code> or <code>{ fill, maxHeight, speed, top, offset, bottom, step }</code>. Horizontal, non-looping sliders only.', bleed: '<code>true</code>, <code>"left"</code> or <code>"right"</code>. Slides overflow the container towards the viewport edge; the first and last slide still align with the container. Forces <code>infinite: false</code> and sets <code>overflow-x: clip</code> on <code>body</code> so the page gets no horizontal scrollbar.',
  };
  const missing = Object.keys(D).filter((k) => !DESC[k]);
  if (missing.length) console.warn('Docs: options without description:', missing.join(', '));
  const fmt = (v) => (v === null ? '<code>null</code>' : typeof v === 'object' ? '<code>{…}</code>' : `<code>${esc(JSON.stringify(v))}</code>`);
  const rows = Object.keys(D).sort().map((k) => [`<code>${k}</code>`, fmt(D[k]), DESC[k] || '']);
  add('docs', 'Documentation | Mozert Slider', 'How to use Mozert Slider: markup, options, effects, modules, events, lazy loading, accessibility and theming.', `
<h1>Documentation</h1>
<div class="split"><nav class="toc" aria-label="On this page"><a href="#markup">Markup</a><a href="#init">Initialising</a><a href="#options">Options</a><a href="#responsive">Responsive</a><a href="#effects">Effects</a><a href="#pagination">Pagination</a><a href="#free">Free mode</a><a href="#parallax">Parallax</a><a href="#zoom">Zoom</a><a href="#virtual">Virtual slides</a><a href="#lazy">Lazy loading</a><a href="#arrows-dots">Arrows and dots</a><a href="#center-padding">Center padding</a><a href="#rtl">RTL</a><a href="#thumbs">Thumbs gallery</a><a href="#lightbox">Lightbox</a><a href="#magnifier">Magnifier</a><a href="#scroll-driven">Scroll-driven</a><a href="#sync">Synced sliders</a><a href="#a11y">Accessibility</a><a href="#theming">Theming</a></nav><div>
<section id="markup"><h2 style="margin-top:0">Markup</h2><p>Every direct child of the container is a slide. No wrapper elements needed.</p>${code(`<div class="slider">
  <div>Slide 1</div>
  <div>Slide 2</div>
  <div>Slide 3</div>
</div>`)}</section>
<section id="init"><h2>Initialising</h2>${tabs([['JavaScript', `import Mozert from '${PKG}';
const slider = new Mozert('.slider', { dots: true, autoplay: true });`], ['data attribute', `<div class="slider" data-mozert='{"slidesToShow":3,"spaceBetween":16}'>…</div>
<!-- elements with data-mozert are initialised automatically.
     Set window.MozertAutoInit = false before loading to disable. -->`], ['jQuery', `$('.slider').mozert({ dots: true });
$('.slider').mozert('next');
$('.slider').on('afterChange', function (e, slider, current) {});`]])}</section>
<section id="options"><h2>Options</h2><p>Defaults come from <code>Mozert.defaults</code>. Change them globally by assigning to it.</p>${table(['Option', 'Default', 'Description'], rows)}</section>
<section id="responsive"><h2>Responsive</h2><p>Breakpoints are max-width by default; add <code>mobileFirst: true</code> for min-width breakpoints. Only the matching breakpoint's settings override the base.</p>${code(`new Mozert('.slider', {
  slidesToShow: 4,
  responsive: [
    { breakpoint: 1024, settings: { slidesToShow: 3 } },
    { breakpoint: 600,  settings: { slidesToShow: 1.5, spaceBetween: 8 } },
    { breakpoint: 400,  settings: 'destroy' }   // destroy below 400px
  ]
});`)}</section>
<section id="effects"><h2>Effects</h2><p>Choose with <code>effect</code>. Each effect reads its own options object. They respond to dragging, so the slide follows your finger.</p>${code(`new Mozert('.slider', {
  effect: 'coverflow',
  slidesToShow: 3,
  coverflowEffect: { rotate: 40, depth: 140, stretch: 0, modifier: 1, scale: 0.8, lift: 60, fade: 0.2 }  // lift raises background cards, fade dims them
});

// Expanding cards: the active card opens wide, the others stay narrow
new Mozert('.slider', {
  effect: 'expand',
  slidesToShow: 4.4,
  expandEffect: { extra: 1.4 }  // how much wider the active card gets (1.4 = 140% of a slide)
});

new Mozert('.slider', {
  effect: 'creative',
  creativeEffect: {
    prev: { translate: ['-120%', 0, -300], rotate: [0, 0, -6], opacity: 0 },
    next: { translate: ['100%', 0, 0] }
  }
});`)}<div class="callout">Cube, flip, cards, creative and fade show one slide at a time (<code>slidesToShow</code> is forced to 1). Coverflow and expand centre the active slide and support several visible slides.</div></section>
<section id="pagination"><h2>Pagination</h2>${code(`new Mozert('.slider', {
  pagination: {
    el: '#my-pagination',        // optional, otherwise created inside the slider
    type: 'bullets',             // 'bullets' | 'dynamic' | 'fraction' | 'progressbar' | 'custom'
    clickable: true,
    renderBullet: (i, cls) => '<button class="' + cls + '">' + (i + 1) + '</button>',
    renderCustom: (slider, current, total) => current + ' of ' + total   // for type: 'custom'
  },
  scrollbar: { draggable: true, hide: false }
});`)}<p><code>dots</code> (simple dot list) and <code>pagination</code> (typed pagination) are independent; use either.</p></section>
<section id="free"><h2>Free mode, mousewheel, keyboard</h2>${code(`new Mozert('.slider', {
  freeMode: { momentum: true, momentumRatio: 1, sticky: false },
  mousewheel: { sensitivity: 1, releaseOnEdges: true },
  globalKeyboard: true,
  slidesToShow: 3.2, infinite: false
});`)}</section>
<section id="parallax"><h2>Parallax</h2>${code(`<div class="slider" data-mozert='{"parallax":true,"speed":700}'>
  <div>
    <img src="a.jpg" data-parallax-x="-20%" alt="">
    <h2 data-parallax-x="-60%" data-parallax-opacity="0">Title</h2>
  </div>
</div>
<!-- Values are the offset when the slide is one position away. Add data-parallax-bg on an element inside the slider to move a background layer. -->`)}</section>
<section id="zoom"><h2>Zoom</h2><p>Double-click or double-tap an <code>img</code>/<code>canvas</code>/<code>video</code> (or an element with class <code>mozert-zoom-target</code>) in the active slide. Pinch on touch screens, ctrl+wheel on desktop. While zoomed, dragging pans the image.</p>${code(`const s = new Mozert('.gallery', { zoom: { max: 3 } });
s.zoom.toggle(); s.zoom.in(); s.zoom.out(); s.zoom.reset();
s.on('zoomChange', (slider, scale) => {});`)}</section>
<section id="virtual"><h2>Virtual slides</h2>${code(`const slider = new Mozert('#big', {
  virtual: {
    slides: myArrayOf10000Items,
    renderSlide: (item, i) => '<div class="card">' + item.title + '</div>',  // optional
    addSlidesBefore: 2, addSlidesAfter: 3,
    cache: false                       // false = unload slides that leave the window
  },
  slidesToShow: 3
});
slider.virtual.appendSlide(item);  slider.virtual.prependSlide(item);  slider.virtual.removeSlide(0);  slider.virtual.update();`)}<p>Start with an empty container element; Mozert creates lightweight slide shells and fills only those near the viewport. Virtual mode disables <code>infinite</code>.</p></section>
<section id="lazy"><h2>Lazy loading</h2>${code(`<img data-lazy="photo.jpg" data-lazy-srcset="photo-2x.jpg 2x" alt="">
<div data-lazy-bg="hero.jpg"></div>
<!-- lazyLoad: 'ondemand' (default) loads when a slide is about to show; 'progressive' loads the rest after the first paint. -->`)}<p>Events: <code>lazyLoaded</code> and <code>lazyLoadError</code>.</p></section>
<section id="arrows-dots"><h2>Arrows and dots</h2>${code(`// Your own arrow markup
new Mozert('.slider', {
  prevArrow: '<button type="button" class="my-arrow">&larr; Prev</button>',
  nextArrow: '<button type="button" class="my-arrow">Next &rarr;</button>'
});

// Put the arrows and the dots in a control bar anywhere on the page
// <div class="bar"><div id="arrows"></div><div id="dots"></div></div>
new Mozert('.slider', {
  appendArrows: '#arrows',   // selector or element
  appendDots: '#dots',
  dots: true
});`)}<p><code>prevArrow</code> and <code>nextArrow</code> take an HTML string or an element, so the arrows can look and read however you want. Mozert adds the classes <code>mozert-prev</code> / <code>mozert-next</code> and wires the clicks, the disabled state at the ends and the <code>aria-label</code>. <code>appendArrows</code> and <code>appendDots</code> move the arrows and the dots out of the slider into any element. The default round arrows are positioned over the slider, so when you append them elsewhere give them your own style (for example <code>position: static</code>). The dots keep working with <code>customPaging</code>, <code>dotsClass</code> and <code>dots: 'dynamic'</code> style pagination. See the live example on the <a href="../examples/index.html#d-arrows-box">Examples page</a>.</p></section>
<section id="center-padding"><h2>Center padding</h2>${code(`new Mozert('.slider', {
  centerMode: true,
  centerPadding: '140px',   // peek width on each side: px or %
  slidesToShow: 1,
  responsive: [{ breakpoint: 640, settings: { centerPadding: '36px' } }]
});`)}<p>In <code>centerMode</code> the active slide stays in the middle and <code>centerPadding</code> sets how much of the neighbours you see on each side. Use pixels or a percentage, and shrink it on phones with <code>responsive</code>. It works with <code>infinite</code>, arrows, dots and the effects that centre the active slide.</p></section>
<section id="rtl"><h2>Right to left (rtl)</h2>${code(`new Mozert('.slider', {
  rtl: true,
  slidesToShow: 2.2,
  dots: true
});`)}<p><code>rtl: true</code> is for right-to-left pages. The slides start from the right, swiping, the previous/next arrows and the keyboard arrow keys follow the reading direction, and the slider gets <code>dir="rtl"</code> so your text and layout flip with it. It works with vertical off, with <code>infinite</code>, <code>centerMode</code>, thumbs and every pagination type. See the live example on the <a href="../examples/index.html#d-rtl-box">Examples page</a>.</p></section>
<section id="thumbs"><h2>Thumbnails</h2>${code(`// One option: a strip is created below the slider
new Mozert('#gallery', { thumbs: true });

// Your own strip (left empty it is filled for you; filled by you it is used as is)
new Mozert('#gallery', { thumbs: '#nav' });
new Mozert('#gallery', { thumbs: { el: '#nav', count: 4, options: { spaceBetween: 6 } } });

// Vertical gallery: main picture on the left, thumbnails stacked on the right
new Mozert('#gallery', { thumbs: { position: 'right', count: 4 } });
// position: 'left' | 'right' | 'top' | 'bottom' (default)`)}<p>Thumbnails come from <code>data-thumb</code> on the slide, then the first <code>&lt;img&gt;</code>, then the slide's background. Clicking a thumbnail opens that slide, and changing slides highlights the matching thumbnail, even when the strip has nothing to scroll.</p></section>
<section id="lightbox"><h2>Lightbox</h2>${code(`new Mozert('#gallery', { lightbox: true });
new Mozert('#gallery', { lightbox: { zoom: true, loop: true, maxZoom: 2.5 } });

<!-- Big image: data-full on the slide or img, or a link to the file. Caption: data-caption. -->
<div data-caption="Sunrise"><a href="photos/sunrise-large.jpg"><img src="photos/sunrise.jpg" alt="Sunrise"></a></div>

slider.lightbox.open(2);  slider.lightbox.close();  slider.lightbox.isOpen;`)}<p>Arrow keys, swipe, <kbd>Esc</kbd>, click the picture to zoom, focus is kept inside the dialog and returns to where you were. When you close it the slider shows the last picture you viewed. Events: <code>lightboxOpen</code>, <code>lightboxChange</code>, <code>lightboxClose</code>. Ordinary links inside slides still work.</p></section>
<section id="magnifier"><h2>Magnifier</h2>${code(`// Product gallery: thumbnails on the left, hover zoom on the picture
new Mozert('#product', {
  thumbs: { position: 'left', count: 4 },
  magnifier: true            // or { zoom: 2.4, button: true, active: false }
});

<img src="shoe-800.jpg" data-zoom="shoe-2400.jpg" alt="Shoe">   <!-- optional sharper file -->

slider.magnifier.enable();  slider.magnifier.disable();  slider.magnifier.toggle();  slider.magnifier.isOn();`)}<p>A small magnifier button sits in the top right corner of the picture. When it is on, moving the mouse over a slide enlarges it around the pointer, like a product page in a shop. It is for mouse users only; touch screens keep normal swiping, and dragging the slider turns the zoom off while you hold the button. Set <code>button: false</code> to hide the button and control it with the API instead. Event: <code>magnifier</code>.</p></section>
<section id="scroll-driven"><h2>Scroll-driven</h2>${code(`new Mozert('#story', {
  scrollDriven: {
    fill: true,     // the pinned slider takes the whole screen height: no empty space above or below
    offset: 76,     // px kept free at the top for a sticky header
    bottom: 24,     // px kept free at the bottom
    maxHeight: 640, // optional cap: the slider stays centred when the screen is taller
    // top: 'center' // without fill: pin in the middle of the screen (or a number of px from the top)
    speed: 1.6      // px the slides travel per px of scroll: higher = shorter section, less empty space
  },
  infinite: false, arrows: false, dots: false, draggable: false
});`)}<p>The slider is wrapped in a tall section and sticks while you scroll through it. The section is only as tall as the slides need to travel divided by <code>speed</code>; use <code>step</code> (px of scrolling per slide) if you want a fixed distance instead. To avoid empty space above and below, make the slider as tall as the screen under your header, for example <code>.story .slide { height: calc(100svh - 96px) }</code> with <code>top: 76</code> (the header height plus a small gap). Needs a horizontal, non-looping slider, and no ancestor with <code>overflow: hidden</code> (that breaks <code>position: sticky</code>).</p></section>
<section id="sync"><h2>Synced sliders</h2>${code(`new Mozert('#main',  { arrows: false, asNavFor: '#thumbs' });
new Mozert('#thumbs', { slidesToShow: 5, asNavFor: '#main', focusOnSelect: true });`)}</section>
<section id="a11y"><h2>Accessibility</h2><ul><li>Container gets <code>role="region"</code> and <code>aria-roledescription="carousel"</code>; slides get <code>role="group"</code> with "n of total" labels; clones are hidden from assistive tech.</li><li>Left/right (up/down when vertical) keys work when the slider has focus; <code>globalKeyboard</code> extends this to the whole page.</li><li>Autoplay pauses on hover and focus, and the live region switches to <code>polite</code> when autoplay is off or paused.</li><li>Users with <code>prefers-reduced-motion: reduce</code> get no autoplay and instant transitions (disable with <code>respectReducedMotion: false</code>).</li><li>Translate all strings with the <code>labels</code> option.</li></ul></section>
<section id="theming"><h2>Theming</h2>${code(`.my-slider {
  --mozert-accent: #3633f5;
  --mozert-arrow-bg: #fff;
  --mozert-arrow-fg: #111;
  --mozert-arrow-size: 44px;
  --mozert-dot-color: #bbb;
  --mozert-dot-active: #3633f5;
  --mozert-dot-size: 10px;
}`)}<p><code>mozert-theme.css</code> is optional: it only styles arrows and dots. Core layout lives in <code>mozert.css</code>.</p></section>
</div></div>`);
}

// INSTALLATION
add('installation', 'Installation | Mozert Slider', 'Install Mozert Slider with npm, a CDN or a plain script tag. Bundles, ESM, jQuery, Magento, Shopify, React and Vue.', `
<h1>Installation</h1><p class="lead">Pick the way that suits your project. Nothing else needs to be installed.</p>
<h2>npm</h2>${code(`npm install ${PKG}`)}${code(`import Mozert from '${PKG}';
import '${PKG}/css';          // required layout styles
import '${PKG}/theme.css';    // optional arrows and dots styling

const slider = new Mozert('.slider', { dots: true });`)}
<h2>CDN</h2>${code(`<link rel="stylesheet" href="${CDN}/mozert.min.css">
<link rel="stylesheet" href="${CDN}/mozert-theme.min.css">
<script src="${CDN}/mozert.min.js"></script>
<script>new Mozert('.slider', { dots: true });</script>`)}
<div class="callout">The <code>@1</code> in the URL always serves the newest 1.x release. Pin an exact version (for example <code>@${V}</code>) if you want a file that never changes. The files are also in <code>dist/</code> if you would rather host them yourself.</div>
<h2>Which file?</h2>${table(['File', 'Use it for'], [['<code>mozert.min.js</code>', 'Default. Core and every module (effects, pagination types, free mode, zoom, virtual, and so on).'], ['<code>mozert.core.min.js</code>', 'Core features only; smallest download.'], ['<code>mozert.esm.mjs</code>', 'ES module for bundlers (<code>import</code> resolves to this automatically).'], ['<code>mozert.jquery.min.js</code>', 'Adds <code>$.fn.mozert</code>.']])}
<h2>Frameworks</h2><p>Official packages for React and Vue 3. They create the slider after the component mounts, destroy it before the framework removes anything, and rebuild it when slides are added, removed or reordered, or an option changes. Import the slider CSS once.</p>${tabs([['React', `npm install @mozert-studio/react ${PKG}

// root layout
import '${PKG}/css';
import '${PKG}/theme.css';

import MozertSlider from '@mozert-studio/react';

<MozertSlider slidesToShow={3} spaceBetween={16} dots thumbs lightbox onChange={(i) => console.log(i)}>
  {products.map((p) => <div key={p.id}><img src={p.image} alt={p.name} /></div>)}
</MozertSlider>

// Every Mozert option works as a prop (or inside options={{ ... }}).
// Each child renders one element. Give children a key.
// onInit(slider), onChange(index, slider); a ref gives { slider, element }.`], ['Vue 3', `npm install @mozert-studio/vue ${PKG}

// main.js
import '${PKG}/css';
import '${PKG}/theme.css';

<script setup>
import MozertSlider from '@mozert-studio/vue';
</script>

<template>
  <MozertSlider :slidesToShow="3" :spaceBetween="16" dots thumbs lightbox @change="(i) => console.log(i)">
    <div v-for="p in products" :key="p.id"><img :src="p.image" :alt="p.name" /></div>
  </MozertSlider>
</template>

<!-- Every Mozert option works as an attribute (camelCase) or inside :options="{ ... }".
     Events: init, change, before-change. -->`], ['Next.js / Nuxt', `// Next.js (App Router): the file that uses the component starts with
'use client';

// Nuxt 3: render it on the client only
// <ClientOnly><MozertSlider :slidesToShow="3">...</MozertSlider></ClientOnly>

// Mozert touches the DOM, so it never runs during server rendering.
// The packages only create the slider after mount (useEffect / onVnodeMounted).`], ['Shopify (Liquid)', `{{ 'mozert.min.css' | asset_url | stylesheet_tag }}
<div class="product-slider">
  {% for image in product.images %}
    <div><img src="{{ image | image_url: width: 900 }}" alt="{{ image.alt | escape }}" loading="lazy"></div>
  {% endfor %}
</div>
<script src="{{ 'mozert.min.js' | asset_url }}" defer></script>
<script>document.addEventListener('DOMContentLoaded', function(){ new Mozert('.product-slider', { dots: true }); });</script>`], ['Magento 2 / Hyvä', `<!-- Hyvä (Alpine) -->
<div x-data x-init="new Mozert($refs.s, { slidesToShow: 4, spaceBetween: 16 })">
  <div x-ref="s"><?php foreach ($items as $item): ?><div><?= $item ?></div><?php endforeach ?></div>
</div>
<!-- Luma/RequireJS: add mozert.min.js to requirejs-config.js, then require(['mozert'], function (Mozert) {...}); -->`]])}
<h2>Verify</h2><p>Open the console and run <code>Mozert.version</code>; it should print <code>${V}</code>. Check <code>Mozert.get(el)</code> to get an instance back from an element.</p>
`);

// API
add('api', 'API reference | Mozert Slider', 'Complete API reference for Mozert Slider: constructor, methods, properties, events, and the module API.', `
<h1>API reference</h1>
<h2>Constructor and statics</h2>${table(['Member', 'Description'], [['<code>new Mozert(el, options)</code>', 'Create a slider. <code>el</code> is an element or selector. Returns the existing instance if already created.'], ['<code>Mozert.get(el)</code>', 'Instance for an element, or <code>null</code>.'], ['<code>Mozert.initAll(root?, options?)</code>', 'Initialise every <code>[data-mozert]</code> element under <code>root</code>.'], ['<code>Mozert.defaults</code>', 'Default options (mutable).'], ['<code>Mozert.version</code>', 'Version string.'], ['<code>Mozert.use(module)</code>', 'Register a module (see below).']])}
<h2>Methods</h2>${table(['Method', 'Description'], [['<code>next()</code> / <code>prev()</code>', 'Move one step.'], ['<code>goTo(index, dontAnimate?)</code>', 'Go to a slide.'], ['<code>play()</code> / <code>pause()</code> / <code>isPlaying()</code>', 'Control autoplay.'], ['<code>getOption(name)</code> / <code>setOption(name, value, refresh?)</code>', 'Read or change options live. <code>setOption(object)</code> also works.'], ['<code>add(markup, index?, addBefore?)</code> / <code>remove(index, removeBefore?)</code> / <code>removeAll()</code>', 'Change slides at runtime.'], ['<code>filter(selectorOrFn)</code> / <code>unfilter()</code>', 'Show a subset of slides.'], ['<code>getSlides()</code> / <code>slideCount()</code> / <code>currentSlide()</code> / <code>getState()</code>', 'Inspect.'], ['<code>refresh()</code> / <code>setPosition()</code>', 'Rebuild or recalculate layout (after the container size changes).'], ['<code>destroy()</code>', 'Restore the original markup and remove listeners.'], ['<code>on(name, fn)</code> / <code>once</code> / <code>off</code> / <code>emit</code>', 'Events.']])}
<h2>Events</h2><p>Listen with <code>slider.on('afterChange', (slider, current) => {})</code>, the <code>on</code> option, a DOM listener for <code>mozert:afterChange</code>, or jQuery <code>.on('afterChange', ...)</code>.</p>${table(['Event', 'Arguments (after slider)'], [['<code>init</code>, <code>reInit</code>, <code>destroy</code>, <code>setPosition</code>', ''], ['<code>beforeChange</code>', 'currentIndex, nextIndex'], ['<code>afterChange</code>', 'currentIndex'], ['<code>breakpoint</code>', 'breakpoint'], ['<code>swipe</code>, <code>edge</code>', 'direction: left | right | up | down'], ['<code>lazyLoaded</code>, <code>lazyLoadError</code>', 'element, source'], ['<code>autoplayStart</code>, <code>autoplayStop</code>', ''], ['<code>autoplayTimeLeft</code>', 'ms left, progress 0..1'], ['<code>zoomChange</code>', 'scale'], ['<code>virtualRender</code>', 'indexes rendered'], ['<code>freeModeEnd</code>', 'target translate']])}
<h2>Module API</h2>${code(`Mozert.use({
  name: 'my-module',
  defaults: { myOption: false },            // merged into Mozert.defaults
  create(slider) {
    if (!slider.s.myOption) return null;    // slider.s = resolved settings
    slider._onFx((pv, animate, speed) => {  // pv = visual position in slide units
      /* update visuals */
    });
    slider._sub('afterChange', () => {});   // auto-unsubscribed on rebuild
    return { destroy() { /* cleanup */ } };
  }
});`)}<div class="callout">Members starting with <code>_</code> are for modules and may change between minor versions.</div>
`);

// BLOG
{
  const posts = [
    ['hero-slider', 'Build a hero slider with parallax and a progress bar', 'Full-width banners that feel alive without a heavy library.', `${code(`<div class="hero" data-mozert='{"parallax":true,"fade":true,"autoplay":true,"autoplaySpeed":5000,"arrows":false,"pagination":{"type":"progressbar"}}'>
  <div><img src="a.jpg" alt=""><h2 data-parallax-x="-40%">Summer sale</h2></div>
  <div><img src="b.jpg" alt=""><h2 data-parallax-x="-40%">New arrivals</h2></div>
</div>`)}<p>Elements with <code>data-parallax-x</code> move at a different speed than the slide, which gives the depth. The progress bar follows the autoplay timer. Autoplay stops for visitors who prefer reduced motion.</p>`],
    ['accessible-carousels', 'Making a carousel accessible', 'What Mozert does for you and what is left to you.', `<p>Mozert adds the carousel role, labelled slides, keyboard arrows, focus handling and a live region that goes quiet while autoplay runs. Your part: write real <code>alt</code> text, keep controls visible against the images, and translate the built-in strings with the <code>labels</code> option.</p>${code(`new Mozert('.slider', {
  labels: { next: 'Suivant', prev: 'Précédent' },
  pauseOnFocus: true,
  autoplay: true
});`)}`],
    ['coverflow-product-gallery', 'Build a coverflow product gallery', 'A centred, 3D gallery that adapts to mobile.', `${code(`new Mozert('.gallery', {
  effect: 'coverflow',
  slidesToShow: 3,
  infinite: true,
  coverflowEffect: { rotate: 35, depth: 160, modifier: 1 },
  pagination: { type: 'dynamic' },
  responsive: [{ breakpoint: 640, settings: { slidesToShow: 1.6 } }]
});`)}<p>Coverflow forces <code>centerMode</code>. Use <code>depth</code> for how far side slides recede and <code>rotate</code> for the angle. On narrow screens show fewer slides so the centre image stays large.</p>`],
    ['ten-thousand-slides', 'Render 10,000 slides without freezing the page', 'Virtual slides keep the DOM small.', `${code(`const items = await (await fetch('/api/products')).json();
const slider = new Mozert('#catalog', {
  virtual: {
    slides: items,
    renderSlide: (p) => '<article><img data-lazy="' + p.img + '" alt=""><h3>' + p.name + '</h3></article>',
    addSlidesBefore: 3, addSlidesAfter: 4, cache: false
  },
  slidesToShow: 4, spaceBetween: 16
});`)}<p>Mozert creates 10,000 empty shells (cheap) and fills the few near the viewport. Combine with <code>data-lazy</code> for images and with <code>freeMode</code> for a smooth scrolling feel.</p>`],
    ['react-vue-slider', 'How to add Mozert Slider to React, Next.js and Vue', 'Install the official package, import the CSS, and use it as a component.', `<h3>1. Install</h3>${code(`npm install @mozert-studio/react ${PKG}`)}<p>For Vue 3 use <code>@mozert-studio/vue</code> instead.</p><h3>2. Import the styles once</h3>${code(`import '${PKG}/css';
import '${PKG}/theme.css';`)}<h3>3. Use it</h3>${code(`import MozertSlider from '@mozert-studio/react';

<MozertSlider slidesToShow={3} spaceBetween={16} dots lightbox thumbs>
  {products.map(p => <div key={p.id}><img src={p.image} alt={p.name} /></div>)}
</MozertSlider>`)}<p>Every Mozert option works as a prop. Give each child a <code>key</code>; the slider rebuilds itself when slides are added, removed or reordered.</p><h3>Next.js</h3><p>Add <code>'use client'</code> as the first line of the file that uses the component. The slider only runs in the browser, so server rendering is safe.</p><h3>Vue 3 and Nuxt</h3>${code(`<MozertSlider :slidesToShow="3" dots @change="i => current = i">
  <div v-for="p in products" :key="p.id">{{ p.name }}</div>
</MozertSlider>`)}<p>In Nuxt wrap it in <code>&lt;ClientOnly&gt;</code>.</p><h3>Calling methods</h3><p>React: <code>ref.current.slider.next()</code>. Vue: <code>ref.value.slider().goTo(2)</code>. Or keep the instance from <code>onInit</code> / the <code>init</code> event.</p>`],
    ['shopify-magento', 'Using Mozert in Shopify and Magento themes', 'Plain script tags, no build step.', `<p>In Shopify, upload <code>mozert.min.js</code> and <code>mozert.min.css</code> to <em>assets</em>, include them with <code>asset_url</code> and initialise after <code>DOMContentLoaded</code>. In Magento 2 with Hyvä, initialise from an Alpine <code>x-init</code>; with Luma, register the file in <code>requirejs-config.js</code>. The installation page has copy-paste snippets for both.</p>`],
  ];
  add('blog', 'Blog and tutorials | Mozert Slider', 'Tutorials: hero sliders, accessible carousels, coverflow galleries, virtual slides and theme integrations.', `
<h1>Blog and tutorials</h1><nav class="toc" style="position:static;display:flex;flex-wrap:wrap;gap:4px;margin:0 0 12px" aria-label="Articles">${posts.map(([id, t]) => `<a href="#${id}" style="border:1px solid var(--line);border-radius:8px">${esc(t)}</a>`).join('')}</nav>
${posts.map(([id, t, sub, body]) => `<article class="post" id="${id}"><h2>${esc(t)}</h2><p class="meta">${sub}</p>${body}</article>`).join('')}`);
}

// CHANGELOG
add('changelog', 'Changelog | Mozert Slider', 'Version history of Mozert Slider.', `
<h1>Changelog</h1><p class="lead">Mozert follows semantic versioning.</p>
<section class="rel"><h3>${V} <span class="pill">latest</span></h3><p class="meta">2026-11-12</p><ul>
<li>Docs and examples for <code>prevArrow</code> / <code>nextArrow</code>, <code>appendArrows</code> / <code>appendDots</code>, <code>centerPadding</code> and <code>rtl</code>.</li>
<li>Scroll-driven slider: <code>fill: true</code> makes the pinned slider as tall as the screen, plus <code>speed</code>, <code>offset</code> and <code>bottom</code> options.</li>
<li>Fixed: dots moved out of the slider with <code>appendDots</code> now keep their theme styling.</li>
<li>New: <code>magnifier</code> option. A button in the top right corner turns on hover zoom for the main picture, like a shop product page.</li>
<li>New: <code>thumbs: { position: 'right' }</code> puts a vertical thumbnail strip beside the main picture (<code>'left'</code>, <code>'top'</code> and <code>'bottom'</code> work too).</li>
<li>New: <code>thumbs</code> option. One option builds a thumbnail gallery that stays in sync, instead of two sliders with <code>asNavFor</code> and <code>focusOnSelect</code>.</li>
<li>New: built-in lightbox, <code>lightbox: true</code>. Full-screen viewer with next/previous, zoom, swipe, keyboard and focus handling.</li>
<li>New: <code>scrollDriven</code>. The slider sticks to the page and your scroll moves the slides.</li>
<li>New: official <code>@mozert-studio/react</code> and <code>@mozert-studio/vue</code> packages.</li>
<li>Fixed: thumbnail strips that show every thumbnail now still highlight and select correctly; the fullscreen button label.</li>
<li>New: <code>effect: 'expand'</code>. The active card opens wide while the others stay narrow, smooth with drag, loop and autoplay. See the Expanding cards example.</li>
<li>New: 3D carousel look for coverflow. <code>coverflowEffect.lift</code> raises the cards behind the active one and <code>fade</code> dims them, so you get a stacked, layered carousel. See the new 3D carousel example.</li>
<li>New: step-by-step guide for adding Mozert Slider to React, Next.js and Vue.</li></ul></section>
<section class="rel"><h3>1.1.0 <span class="pill">first release</span></h3><p class="meta">2026-11-10</p><ul>
<li>Core: infinite loop, breakpoints, center mode, variable width, rows, vertical, RTL, fade, lazy loading, asNavFor + focusOnSelect, adaptive height, autoplay, accessibility, jQuery adapter, <code>labels</code> translations.</li>
<li>Layout options: fractional <code>slidesToShow</code>, <code>spaceBetween</code>, <code>slideWidth</code>, <code>edgePadding</code>; responsive <code>settings: 'destroy'</code>.</li>
<li>Dynamic slides: <code>add()</code>, <code>remove()</code>, <code>removeAll()</code>, <code>filter()</code> / <code>unfilter()</code>; filtered-out and removed slides leave the page completely.</li>
<li>Effects: coverflow, cube, flip, cards, creative.</li>
<li>Modules: pagination types, scrollbar, free mode, mousewheel, global keyboard, parallax, zoom, virtual slides, hash navigation, marquee, video autoplay, fullscreen.</li>
<li>Design: pagination and arrows aligned, vertical dots stay inside the slider, smoother coverflow transitions.</li>
<li>Thumbnail sliders: with <code>asNavFor</code> + <code>focusOnSelect</code>, clicking any thumbnail opens that slide and highlights it.</li>
<li>Autoplay: <code>autoplayReverse</code>, <code>stopOnLastSlide</code>, <code>disableOnInteraction</code>, <code>autoplayStart</code> / <code>autoplayStop</code> / <code>autoplayTimeLeft</code> events.</li>
<li>Module API: <code>Mozert.use()</code>.</li>
<li>Builds: UMD, ESM, minified JS/CSS, core-only bundle, TypeScript types.</li></ul></section>`);

/* ---------------------------------------------------------------- write */
rmSync(OUT, { recursive: true, force: true });
mkdirSync(join(OUT, 'assets/photos'), { recursive: true });
for (const f of ['mozert.min.js', 'mozert.min.css', 'mozert-theme.min.css']) copyFileSync(join(root, 'dist', f), join(OUT, 'assets', f));
for (const f of ['site.css', 'site.js', 'demos.js']) copyFileSync(join(root, 'site-src', f), join(OUT, 'assets', f));
PHOTOS.forEach((f) => copyFileSync(join(root, 'site-src/photos', f), join(OUT, 'assets/photos', f)));
if (existsSync(join(root, 'site-src/root'))) readdirSync(join(root, 'site-src/root')).forEach((f) => copyFileSync(join(root, 'site-src/root', f), join(OUT, f)));
for (const p of pages) {
  const html = shell(p, p.body, '', p.extra || '');
  const dir = join(OUT, p.path);
  mkdirSync(dir, { recursive: true });
  writeFileSync(join(dir, 'index.html'), html);
}
copyFileSync(join(root, 'site-src/og.png'), join(OUT, 'assets/og.png'));
for (const f of ['favicon.svg', 'favicon-32.png', 'apple-touch-icon.png', 'logo.png', 'logo-stacked.png', 'logo-mark.png', 'logo-512.png']) copyFileSync(join(root, 'site-src', f), join(OUT, 'assets', f));
copyFileSync(join(root, 'site-src/favicon-32.png'), join(OUT, 'favicon.ico'));
const today = new Date().toISOString().slice(0, 10);
writeFileSync(join(OUT, 'sitemap.xml'), `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${pages.map((p) => `  <url><loc>${SITE_URL}/${p.path ? p.path + '/' : ''}</loc><lastmod>${today}</lastmod><priority>${p.path === '' ? '1.0' : '0.8'}</priority></url>`).join('\n')}\n</urlset>\n`);
writeFileSync(join(OUT, 'robots.txt'), `User-agent: *\nAllow: /\n\nSitemap: ${SITE_URL}/sitemap.xml\n`);
writeFileSync(join(OUT, '404.html'), shell({ path: '', title: 'Page not found | Mozert Slider', desc: 'This page does not exist.' }, '<h1>Page not found</h1><p class="lead">That page does not exist. Try the <a href="/index.html">home page</a>, the <a href="/docs/index.html">docs</a> or the <a href="/examples/index.html">examples</a>.</p>').replace(/<link rel="canonical"[^>]*>/, '<meta name="robots" content="noindex">'));
console.log('site/ built:', pages.map((p) => p.path || '/').join(', '));
