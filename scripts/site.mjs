// Static site generator for the Mozert Slider website. Usage: node scripts/site.mjs  ->  site/
import { readFileSync, writeFileSync, mkdirSync, copyFileSync, rmSync, readdirSync, existsSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { gzipSync } from 'node:zlib';
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
const kb = (f) => { const b = readFileSync(join(root, 'dist', f)); return { raw: (b.length / 1024).toFixed(1), gz: (gzipSync(b).length / 1024).toFixed(1) }; };
const SZ = { full: kb('mozert.min.js'), core: kb('mozert.core.min.js'), css: kb('mozert.min.css'), jq: kb('mozert.jquery.min.js') };
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
  { id: 'd-bleed', plain: true, title: 'Bleed layout', desc: 'The first slide lines up with the page content, the rest run off the right edge of the screen. As you scroll, slides leave through the left edge, and the last slide stops at the content edge.', n: 8, opts: { bleed: true, slidesToShow: 2.6, spaceBetween: 16, infinite: false, dots: false, responsive: [{ breakpoint: 700, settings: { slidesToShow: 1.4 } }] } },
  { id: 'd-center', title: 'Center mode', desc: 'Active slide centred, neighbours peek. centerPadding sets the peek width.', n: 6, opts: { centerMode: true, centerPadding: '80px', slidesToShow: 1, spaceBetween: 16, dots: true, responsive: [{ breakpoint: 640, settings: { centerPadding: '32px' } }] } },
  { id: 'd-coverflow', title: 'Coverflow effect', desc: 'Centred 3D coverflow with rotate, depth and stretch options. Works with loop, drag and keyboard.', n: 7, opts: { effect: 'coverflow', slidesToShow: 3, infinite: true, speed: 600, cssEase: 'cubic-bezier(.25,.8,.25,1)', coverflowEffect: { rotate: 40, depth: 140, modifier: 1 } } },
  { id: 'd-cube', title: 'Cube effect', desc: 'A real 3D cube that follows your finger while dragging.', n: 4, opts: { effect: 'cube', pagination: { type: 'bullets' }, speed: 600 } },
  { id: 'd-flip', title: 'Flip effect', desc: 'Slides flip around the Y axis. Drag to scrub through the flip.', n: 4, opts: { effect: 'flip', pagination: { type: 'bullets' }, speed: 600 } },
  { id: 'd-cards', title: 'Cards effect', desc: 'A swipeable stack: drag the top card away to reveal the next.', n: 6, opts: { effect: 'cards', arrows: false, cardsEffect: { perSlideOffset: 12, perSlideRotate: 3 } } },
  { id: 'd-creative', title: 'Creative effect', desc: 'Describe how previous and next slides translate, rotate, scale and fade. Everything else is interpolated for you.', n: 5, opts: { effect: 'creative', speed: 700, creativeEffect: { prev: { translate: ['-40%', 0, -300], rotate: [0, 0, -8], opacity: 0 }, next: { translate: ['100%', 0, 0] } } } },
  { id: 'd-fade', title: 'Fade with progress-bar pagination', desc: 'Cross-fade plus a progress bar that follows the slider. Autoplay emits autoplayTimeLeft if you want your own timer UI.', n: 4, opts: { fade: true, autoplay: true, autoplaySpeed: 2800, pagination: { type: 'progressbar' }, arrows: false } },
  { id: 'd-free', title: 'Free mode + mousewheel + scrollbar', desc: 'Momentum scrolling that stops anywhere. Try dragging fast, using the mouse wheel, or dragging the scrollbar.', n: 10, opts: { freeMode: true, mousewheel: true, scrollbar: { draggable: true }, slidesToShow: 3.2, spaceBetween: 12, infinite: false, arrows: false, responsive: [{ breakpoint: 640, settings: { slidesToShow: 1.8 } }] } },
  { id: 'd-frac', title: 'Fraction pagination', desc: 'Also available: bullets, dynamic bullets, progressbar and custom renderers.', n: 6, opts: { pagination: { type: 'fraction' } } },
  { id: 'd-dyn', title: 'Dynamic bullets for long lists', desc: 'Only the bullets around the active slide are shown at full size.', n: 12, opts: { pagination: { type: 'dynamic', clickable: true } } },
  { id: 'd-vert', title: 'Vertical', desc: 'Set vertical: true. Drag, keys and wheel follow the vertical axis.', n: 6, v: true, opts: { vertical: true, slidesToShow: 2, spaceBetween: 12, mousewheel: true, dots: true } },
  { id: 'd-par', kind: 'parallax', title: 'Parallax', desc: 'Add data-parallax-x / -y / -scale / -opacity to any element inside a slide. Here the background, label, number and caption each travel at a different speed while you drag or click.', n: 5, opts: { parallax: true, speed: 900, dots: true } },
  { id: 'd-dyn-add', kind: 'dynamic', title: 'Add and remove slides at runtime', desc: 'slider.add(html, index, addBefore) and slider.remove(index) rebuild the layout and keep the current slide. Try it.', n: 4, opts: { slidesToShow: 3, spaceBetween: 12, infinite: false, dots: true, responsive: [{ breakpoint: 640, settings: { slidesToShow: 1.5 } }] }, shown: "const slider = new Mozert('#slider', { slidesToShow: 3, infinite: false });\n\nslider.add('<div>New slide</div>');        // append\nslider.add('<div>First</div>', true);       // prepend\nslider.add('<div>After #2</div>', 1);       // after index 1\nslider.remove(slider.slideCount() - 1);    // remove last\nslider.removeAll();                         // clear", extra: '<div class="ctl"><button type="button" data-act="add">Add slide</button><button type="button" data-act="addfirst">Add at start</button><button type="button" data-act="remove">Remove last</button><button type="button" data-act="removefirst">Remove first</button><button type="button" data-act="reset">Reset</button><span class="meta" data-count></span></div>' },
  { id: 'd-filter', kind: 'filter', title: 'Filtering slides', desc: 'slider.filter(selector) shows only matching slides, slider.unfilter() brings everything back. A function works too.', n: 9, opts: { slidesToShow: 2.4, spaceBetween: 12, infinite: false, dots: true, responsive: [{ breakpoint: 640, settings: { slidesToShow: 1.3 } }] }, shown: "const slider = new Mozert('#slider', { slidesToShow: 2.4, infinite: false });\n\nslider.filter('.cat-a');                      // selector\nslider.filter((el, i) => i % 2 === 0);         // or a function\nslider.unfilter();                             // show all", extra: '<div class="ctl"><button type="button" data-act="all" aria-pressed="true">All</button><button type="button" data-act=".cat-a" aria-pressed="false">Category A</button><button type="button" data-act=".cat-b" aria-pressed="false">Category B</button><button type="button" data-act=".cat-c" aria-pressed="false">Category C</button><span class="meta" data-count></span></div>' },
  { id: 'd-zoom', title: 'Zoom: double-click, pinch, pan', desc: 'Double-click (or double-tap) an image. While zoomed, drag pans the image instead of changing slides.', n: 4, opts: { zoom: { max: 3 }, dots: true } },
  { id: 'd-virtual', kind: 'virtual', title: 'Virtual slides: 2,000 slides, a handful of DOM nodes', desc: 'Only the slides near the viewport hold content. Jump around with the dots or arrows.', n: 0, opts: { infinite: false, slidesToShow: 3, spaceBetween: 12, arrows: true }, extra: '<p class="meta" id="d-virtual-count" aria-live="polite"></p>' },
  { id: 'd-marquee', title: 'Marquee / ticker', desc: 'Continuous logo strip. Pauses on hover, stops entirely for reduced-motion users.', n: 0, chips: ['ACME', 'NORTHWIND', 'GLOBEX', 'INITECH', 'UMBRELLA', 'HOOLI', 'STARK', 'WAYNE'], opts: { marquee: { speed: 70 }, slidesToShow: 4, spaceBetween: 14, responsive: [{ breakpoint: 640, settings: { slidesToShow: 2.5 } }] } },
];

const PAR = ['Layer', 'Depth', 'Motion', 'Speed', 'Scroll'];
const parSlides = (n) => Array.from({ length: n }, (_, i) => `<div><div class="sc par sc-${i % 8}"><div class="par-bg" data-parallax-x="-30%"><i class="sc-s"></i></div><span class="sc-k" data-parallax-x="-60%">${PAR[i % 5]}</span><strong class="sc-h" data-parallax-x="-110%">${String(i + 1).padStart(2, '0')}</strong><span class="sc-p" data-parallax-x="-180%" data-parallax-opacity="0">Each layer moves at its own speed</span></div></div>`).join('');
const catSlides = (n) => Array.from({ length: n }, (_, i) => { const c = 'abc'[i % 3]; return `<div class="cat-${c}"><div class="sc sc-${i % 8}"><i class="sc-s"></i><span class="sc-k">Category ${c.toUpperCase()}</span><strong class="sc-h">${String(i + 1).padStart(2, '0')}</strong><span class="sc-p">Mozert Slider</span></div></div>`; }).join('');
const demoHtml = (d, base) => {
  const inner = d.chips ? d.chips.map((c) => `<div><div class="chip">${c}</div></div>`).join('') : d.kind === 'virtual' ? '' : d.kind === 'parallax' ? parSlides(d.n) : d.kind === 'filter' ? catSlides(d.n) : slides(d.n, base, d.id === 'd-zoom' ? 'zoom' : '');
  const shown = d.shown || (d.kind === 'virtual' ? `const slides = Array.from({ length: 2000 }, (_, i) => '<div>Slide ' + (i + 1) + '</div>');\nnew Mozert('#slider', {\n  virtual: { slides, addSlidesBefore: 2, addSlidesAfter: 3 },\n  slidesToShow: 3, spaceBetween: 12, infinite: false\n});` : `new Mozert('#slider', ${JSON.stringify(d.opts, null, 2)});`);
  return `<article class="demo${d.plain ? ' plain' : ''}" id="${d.id}-box"><h3>${esc(d.title)}</h3><p>${esc(d.desc)}</p><div class="stage${d.v ? ' v' : ''}"><div id="${d.id}">${inner}</div></div>${d.extra || ''}<details><summary>Code</summary>${code(shown)}</details></article>`;
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

// FEATURES
add('features', 'Features | Mozert Slider', 'Everything Mozert Slider can do: layout, effects, navigation, interaction, content, accessibility and compatibility.', `
<h1>Features</h1><p class="lead">The full list, grouped. Everything here ships in the default bundle and is switched on with options.</p>
${[
  ['Layout', ['Fractional <code>slidesToShow</code> (2.5 slides)', '<code>spaceBetween</code> gap, <code>slideWidth</code>, <code>edgePadding</code>', 'Center mode with <code>centerPadding</code>', '<code>variableWidth</code> slides', 'Rows and <code>slidesPerRow</code> grids', 'Vertical and RTL', '<code>adaptiveHeight</code>', 'Responsive breakpoints (max-width or <code>mobileFirst</code>), including <code>"destroy"</code>']],
  ['Effects', ['Slide and fade', 'Coverflow, cube, flip, cards, creative', 'Effects follow the finger while dragging', 'Per-effect option objects', 'Custom easing and CSS easing']],
  ['Navigation', ['Arrows (custom markup, <code>appendArrows</code>)', 'Dots and <code>customPaging</code>', 'Pagination: bullets, dynamic, fraction, progress bar, custom', 'Scrollbar (draggable, auto-hide)', 'Keyboard (focused or global)', 'Hash navigation and history', 'Mousewheel']],
  ['Interaction', ['Pointer-based drag with axis locking', '<code>touchRatio</code>, <code>dragThreshold</code>, <code>swipeToSlide</code>, <code>edgeFriction</code>', 'Free mode with momentum and sticky snapping', 'Zoom: double-tap, pinch, pan, ctrl+wheel', 'Click to select with <code>focusOnSelect</code>']],
  ['Playback', ['Autoplay with pause on hover, focus and dots hover', '<code>autoplayReverse</code>, <code>stopOnLastSlide</code>, <code>disableOnInteraction</code>', 'Events: <code>autoplayStart</code>, <code>autoplayStop</code>, <code>autoplayTimeLeft</code>', 'Marquee / ticker mode', 'Video autoplay with wait-for-end']],
  ['Content', ['Lazy load: <code>data-lazy</code>, <code>data-lazy-srcset</code>, <code>data-lazy-bg</code>, progressive', 'Virtual slides for thousands of items', 'Parallax on any element', 'Fullscreen button', 'Add, remove, filter and unfilter slides at runtime', 'Synced sliders via <code>asNavFor</code> (thumbnails, controllers)']],
  ['Accessibility', ['ARIA roles and labels, translatable via <code>labels</code>', 'Roving tabindex and keyboard arrows', 'Live region toggles with autoplay', '<code>prefers-reduced-motion</code> respected', 'Visible focus styles']],
  ['Integration', ['jQuery adapter and DOM events (<code>mozert:afterChange</code>)', 'ESM, CJS, UMD and TypeScript types', '<code>data-mozert</code> JSON config with auto-init', 'Module API: <code>Mozert.use()</code> for your own effects and features']],
].map(([t, items]) => `<section><h2>${t}</h2><ul>${items.map((i) => `<li>${i}</li>`).join('')}</ul></section>`).join('')}
<h2>Sizes</h2>${table(['File', 'Minified', 'Gzip'], [['<code>mozert.min.js</code> (core + all modules)', SZ.full.raw + ' KB', SZ.full.gz + ' KB'], ['<code>mozert.core.min.js</code> (core only)', SZ.core.raw + ' KB', SZ.core.gz + ' KB'], ['<code>mozert.min.css</code>', SZ.css.raw + ' KB', SZ.css.gz + ' KB']])}
`);

// EXAMPLES
{
  const th = [{ id: 'th-main', opts: { fade: true, asNavFor: '#th-nav' } }, { id: 'th-nav', opts: { slidesToShow: 4, spaceBetween: 10, asNavFor: '#th-main', focusOnSelect: true, arrows: false, infinite: false } }];
  const all = DEMOS.concat(th);
  add('examples', 'Examples | Mozert Slider', 'Live, interactive demos of every Mozert Slider effect and feature, with copy-paste code.', `
<h1>Examples</h1><p class="lead">Every demo below is the real library running on this page. Open <em>Code</em> to copy the options.</p>
<nav class="toc" style="position:static;display:flex;flex-wrap:wrap;gap:4px;margin:0 0 12px" aria-label="Demos">${DEMOS.map((d) => `<a href="#${d.id}-box" style="border:1px solid var(--line);border-radius:8px">${esc(d.title.split(':')[0].split(' with ')[0])}</a>`).join('')}<a href="#thumbs-box" style="border:1px solid var(--line);border-radius:8px">Thumbnails</a></nav>
${DEMOS.map((d) => demoHtml(d, '../')).join('')}
<article class="demo" id="thumbs-box"><h3>Gallery with thumbnails (asNavFor)</h3><p>Two sliders that drive each other. Click a thumbnail or swipe the main image.</p><div class="stage"><div id="th-main">${slides(6, '../')}</div></div><div class="stage" style="padding-top:10px"><div id="th-nav">${slides(6, '../', 'mini')}</div></div><details><summary>Code</summary>${code(`new Mozert('#main', { fade: true, asNavFor: '#nav' });
new Mozert('#nav',  { slidesToShow: 4, spaceBetween: 10, asNavFor: '#main', focusOnSelect: true, infinite: false });`)}</details></article>
`, { extra: demoScripts('../', all), demos: all });
}

// DOCS
{
  const D = M.defaults;
  const DESC = {
    accessibility: 'Adds ARIA roles/labels and keyboard support.', adaptiveHeight: 'Animate the list height to the active slide (single-slide views).', appendArrows: 'Element or selector to place the arrows in.', appendDots: 'Element or selector to place the dots in.', arrows: 'Show previous/next arrows.', asNavFor: 'Selector of another slider to keep in sync (thumbnails, controllers).', autoplay: 'Start automatically.', disableOnInteraction: 'Stop autoplay for good after the user clicks, taps or drags.', autoplayReverse: 'Autoplay moves backwards.', autoplaySpeed: 'Delay between slides in ms.', centerMode: 'Centre the active slide; neighbours peek.', centerPadding: 'Peek width in center mode (px or %).', cssEase: 'CSS easing for transitions.', customPaging: 'Function (slider, i) returning markup for dot i.', dots: 'Show dots.', dotsClass: 'Class of the dots list.', dragThreshold: 'Pixels to move before a drag starts.', draggable: 'Mouse dragging (touch is controlled by <code>swipe</code>).', easing: 'Easing used when <code>useCSS</code> is false.', edgeFriction: 'Resistance when dragging past the first/last slide (non-infinite).', edgePadding: 'Space before the first and after the last slide (px or %).', effect: '<code>slide</code>, <code>fade</code>, <code>coverflow</code>, <code>cube</code>, <code>flip</code>, <code>cards</code> or <code>creative</code>.', fade: 'Shortcut for <code>effect: "fade"</code>.', focusOnSelect: 'Clicking a slide makes it active.', freeMode: 'Drag with momentum and no snapping. Accepts an options object.', infinite: 'Loop forever using clones.', initialSlide: 'First slide index.', labels: 'Object overriding built-in ARIA strings (translations).', lazyLoad: '<code>ondemand</code> or <code>progressive</code>.', mobileFirst: 'Breakpoints are min-width instead of max-width.', nextArrow: 'Custom markup/element for the next arrow.', pauseOnDotsHover: 'Pause autoplay when hovering the dots.', pauseOnFocus: 'Pause autoplay on keyboard focus.', pauseOnHover: 'Pause autoplay on hover.', prevArrow: 'Custom markup/element for the previous arrow.', respectReducedMotion: 'Disable autoplay/animation for prefers-reduced-motion users.', respondTo: '<code>window</code>, <code>slider</code> or <code>min</code> width used for breakpoints.', responsive: 'Array of <code>{ breakpoint, settings }</code>. <code>settings: "destroy"</code> turns the slider off at that breakpoint.', rows: 'Grid rows.', rtl: 'Right-to-left.', slide: 'Selector of the slide elements inside the container.', slideWidth: 'Fixed slide width in px; slides per view is computed.', slidesPerRow: 'Columns per page when <code>rows</code> &gt; 1.', slidesToScroll: 'Slides per move.', slidesToShow: 'Slides visible (fractional allowed).', spaceBetween: 'Gap between slides in px.', speed: 'Transition time in ms.', stopOnLastSlide: 'Stop autoplay after the last slide (non-infinite).', swipe: 'Touch swiping.', swipeToSlide: 'Land on the slide nearest the release point.', touchMove: 'Slides follow the finger.', touchRatio: 'Drag distance multiplier.', touchThreshold: 'Fraction of the width needed to change slide (width / value).', useCSS: 'CSS transitions (false = JS animation).', useTransform: 'Use transform instead of left/top.', variableWidth: 'Slides keep their own width.', vertical: 'Vertical slider.', verticalSwiping: 'Vertical swipe gestures.', waitForAnimate: 'Ignore input while animating.', zIndex: 'Base z-index for stacked effects.', on: 'Event handlers object, e.g. <code>{ afterChange(s, i) {} }</code>.', coverflowEffect: '<code>rotate</code>, <code>depth</code>, <code>stretch</code>, <code>scale</code>, <code>modifier</code>.', cubeEffect: '<code>perspective</code>.', flipEffect: '<code>perspective</code>, <code>limitRotation</code>.', cardsEffect: '<code>perSlideOffset</code>, <code>perSlideRotate</code>, <code>rotate</code>, <code>visible</code>.', creativeEffect: '<code>prev</code> / <code>next</code> with <code>translate</code>, <code>rotate</code>, <code>opacity</code>, <code>scale</code>; <code>limitProgress</code>.', parallax: 'Enable <code>data-parallax-*</code> attributes.', zoom: '<code>true</code> or <code>{ max, min, toggle, step }</code>.', virtual: '<code>{ slides, renderSlide, addSlidesBefore, addSlidesAfter, cache }</code>.', hashNavigation: '<code>true</code> or <code>{ watchState, replaceState, prefix }</code>. Slides use <code>data-hash</code>.', scrollbar: '<code>true</code> or <code>{ el, draggable, hide }</code>.', pagination: '<code>{ el, type, clickable, renderBullet, ... }</code>. Types: bullets, dynamic, fraction, progressbar, custom.', mousewheel: '<code>true</code> or <code>{ sensitivity, forceToAxis, releaseOnEdges, thresholdTime }</code>.', globalKeyboard: 'Arrow keys control the slider while it is in the viewport.', marquee: '<code>{ speed, pauseOnHover, direction }</code>. Continuous ticker.', videoAutoplay: 'Play the active slide\'s <code>&lt;video&gt;</code>. <code>{ wait }</code> holds autoplay until it ends.', fullscreen: 'Add a fullscreen toggle button.', bleed: '<code>true</code>, <code>"left"</code> or <code>"right"</code>. Slides overflow the container towards the viewport edge; the first and last slide still align with the container. Forces <code>infinite: false</code> and sets <code>overflow-x: clip</code> on <code>body</code> so the page gets no horizontal scrollbar.',
  };
  const missing = Object.keys(D).filter((k) => !DESC[k]);
  if (missing.length) console.warn('Docs: options without description:', missing.join(', '));
  const fmt = (v) => (v === null ? '<code>null</code>' : typeof v === 'object' ? '<code>{…}</code>' : `<code>${esc(JSON.stringify(v))}</code>`);
  const rows = Object.keys(D).sort().map((k) => [`<code>${k}</code>`, fmt(D[k]), DESC[k] || '']);
  add('docs', 'Documentation | Mozert Slider', 'How to use Mozert Slider: markup, options, effects, modules, events, lazy loading, accessibility and theming.', `
<h1>Documentation</h1>
<div class="split"><nav class="toc" aria-label="On this page"><a href="#markup">Markup</a><a href="#init">Initialising</a><a href="#options">Options</a><a href="#responsive">Responsive</a><a href="#effects">Effects</a><a href="#pagination">Pagination</a><a href="#free">Free mode</a><a href="#parallax">Parallax</a><a href="#zoom">Zoom</a><a href="#virtual">Virtual slides</a><a href="#lazy">Lazy loading</a><a href="#sync">Synced sliders</a><a href="#a11y">Accessibility</a><a href="#theming">Theming</a></nav><div>
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
  coverflowEffect: { rotate: 40, depth: 140, stretch: 0, modifier: 1 }
});

new Mozert('.slider', {
  effect: 'creative',
  creativeEffect: {
    prev: { translate: ['-120%', 0, -300], rotate: [0, 0, -6], opacity: 0 },
    next: { translate: ['100%', 0, 0] }
  }
});`)}<div class="callout">Cube, flip, cards, creative and fade show one slide at a time (<code>slidesToShow</code> is forced to 1). Coverflow centres the active slide and supports several visible slides.</div></section>
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
<div class="callout warn">The CDN URLs work after the package has been published to npm. Until then, copy the files from <code>dist/</code>.</div>
<h2>Which file?</h2>${table(['File', 'Use it for'], [['<code>mozert.min.js</code>', 'Default. Core and every module (effects, pagination types, free mode, zoom, virtual, and so on).'], ['<code>mozert.core.min.js</code>', 'Core features only; smallest download.'], ['<code>mozert.esm.mjs</code>', 'ES module for bundlers (<code>import</code> resolves to this automatically).'], ['<code>mozert.jquery.min.js</code>', 'Adds <code>$.fn.mozert</code>.']])}
<h2>Frameworks</h2>${tabs([['React', `import { useEffect, useRef } from 'react';
import Mozert from '${PKG}';
import '${PKG}/css';

export function Slider({ children, options }) {
  const ref = useRef(null);
  useEffect(() => {
    const s = new Mozert(ref.current, options);
    return () => s.destroy();
  }, []);
  return <div ref={ref}>{children}</div>;
}`], ['Vue 3', `<script setup>
import { ref, onMounted, onBeforeUnmount } from 'vue';
import Mozert from '${PKG}';
import '${PKG}/css';
const el = ref(null); let s;
onMounted(() => (s = new Mozert(el.value, { dots: true })));
onBeforeUnmount(() => s && s.destroy());
</script>
<template><div ref="el"><slot /></div></template>`], ['Shopify (Liquid)', `{{ 'mozert.min.css' | asset_url | stylesheet_tag }}
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
    ['shopify-magento', 'Using Mozert in Shopify and Magento themes', 'Plain script tags, no build step.', `<p>In Shopify, upload <code>mozert.min.js</code> and <code>mozert.min.css</code> to <em>assets</em>, include them with <code>asset_url</code> and initialise after <code>DOMContentLoaded</code>. In Magento 2 with Hyvä, initialise from an Alpine <code>x-init</code>; with Luma, register the file in <code>requirejs-config.js</code>. The installation page has copy-paste snippets for both.</p>`],
  ];
  add('blog', 'Blog and tutorials | Mozert Slider', 'Tutorials: hero sliders, accessible carousels, coverflow galleries, virtual slides and theme integrations.', `
<h1>Blog and tutorials</h1><nav class="toc" style="position:static;display:flex;flex-wrap:wrap;gap:4px;margin:0 0 12px" aria-label="Articles">${posts.map(([id, t]) => `<a href="#${id}" style="border:1px solid var(--line);border-radius:8px">${esc(t)}</a>`).join('')}</nav>
${posts.map(([id, t, sub, body]) => `<article class="post" id="${id}"><h2>${esc(t)}</h2><p class="meta">${sub}</p>${body}</article>`).join('')}`);
}

// CHANGELOG
add('changelog', 'Changelog | Mozert Slider', 'Version history of Mozert Slider.', `
<h1>Changelog</h1><p class="lead">Mozert follows semantic versioning.</p>
<section class="rel"><h3>${V} <span class="pill">first release</span></h3><p class="meta">2026-11-10</p><ul>
<li>Core: infinite loop, breakpoints, center mode, variable width, rows, vertical, RTL, fade, lazy loading, asNavFor + focusOnSelect, adaptive height, autoplay, accessibility, jQuery adapter, <code>labels</code> translations.</li>
<li>Layout options: fractional <code>slidesToShow</code>, <code>spaceBetween</code>, <code>slideWidth</code>, <code>edgePadding</code>; responsive <code>settings: 'destroy'</code>.</li>
<li>Dynamic slides: <code>add()</code>, <code>remove()</code>, <code>removeAll()</code>, <code>filter()</code> / <code>unfilter()</code>.</li>
<li>Effects: coverflow, cube, flip, cards, creative.</li>
<li>Modules: pagination types, scrollbar, free mode, mousewheel, global keyboard, parallax, zoom, virtual slides, hash navigation, marquee, video autoplay, fullscreen.</li>
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
