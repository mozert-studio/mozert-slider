/*!
 * Mozert 1.1.1
 * A dependency-free, responsive, touch-friendly carousel / slider.
 * MIT License
 */
(function (root, factory) {
  if (typeof define === 'function' && define.amd) define([], factory);
  else if (typeof module === 'object' && module.exports) { module.exports = factory(); module.exports.default = module.exports; }
  else root.Mozert = factory();
}(typeof self !== 'undefined' ? self : this, function () {
  'use strict';
  //#region core
const VERSION = '1.1.1';

const DEFAULTS = {
  accessibility: true,
  adaptiveHeight: false,
  appendArrows: null,
  appendDots: null,
  arrows: true,
  asNavFor: null,
  autoplay: false,
  disableOnInteraction: false,
  autoplayReverse: false,
  autoplaySpeed: 3000,
  centerMode: false,
  centerPadding: '50px',
  cssEase: 'ease',
  customPaging: null,
  dots: false,
  dotsClass: 'mozert-dots',
  dragThreshold: 6,
  draggable: true,
  easing: 'linear',
  edgeFriction: 0.15,
  edgePadding: 0,
  effect: 'slide',
  fade: false,
  focusOnSelect: false,
  freeMode: false,
  infinite: true,
  initialSlide: 0,
  labels: null,
  lazyLoad: 'ondemand',
  mobileFirst: false,
  nextArrow: null,
  pauseOnDotsHover: false,
  pauseOnFocus: true,
  pauseOnHover: true,
  prevArrow: null,
  respectReducedMotion: true,
  respondTo: 'window',
  responsive: null,
  rows: 1,
  rtl: false,
  slide: '',
  slideWidth: 0,
  slidesPerRow: 1,
  slidesToScroll: 1,
  slidesToShow: 1,
  spaceBetween: 0,
  speed: 300,
  stopOnLastSlide: false,
  swipe: true,
  swipeToSlide: false,
  touchMove: true,
  touchRatio: 1,
  touchThreshold: 5,
  useCSS: true,
  useTransform: true,
  variableWidth: false,
  vertical: false,
  verticalSwiping: false,
  waitForAnimate: true,
  zIndex: 1000,
  on: null,
};

const LABELS = { slide: 'Slide {n} of {total}', prev: 'Previous slide', next: 'Next slide', goTo: 'Go to slide {n}', fullscreen: 'Toggle fullscreen', close: 'Close', zoom: 'Zoom', lightbox: 'Image viewer', imageOf: 'Image {n} of {total}', magnifier: 'Magnifier' };
const DEFAULT_PREV = '<button type="button" class="mozert-prev" aria-label="Previous slide">Previous</button>';
const DEFAULT_NEXT = '<button type="button" class="mozert-next" aria-label="Next slide">Next</button>';
const FOCUSABLE = 'a[href],button,input,select,textarea,[tabindex],[contenteditable="true"]';
const STASH_ATTRS = ['class', 'style', 'role', 'aria-hidden', 'aria-label', 'aria-roledescription', 'data-mozert-index'];

const STACKED = ['fade', 'flip', 'cube', 'cards', 'creative'];
const EASINGS = {
  linear: (t) => t,
  swing: (t) => 0.5 - Math.cos(t * Math.PI) / 2,
  easeInQuad: (t) => t * t,
  easeOutQuad: (t) => t * (2 - t),
  easeInOutQuad: (t) => (t < 0.5 ? 2 * t * t : -1 + (4 - 2 * t) * t),
  easeInCubic: (t) => t * t * t,
  easeOutCubic: (t) => --t * t * t + 1,
  easeInOutCubic: (t) => (t < 0.5 ? 4 * t * t * t : (t - 1) * (2 * t - 2) * (2 * t - 2) + 1),
  easeInOutQuart: (t) => (t < 0.5 ? 8 * t * t * t * t : 1 - 8 * --t * t * t * t),
};

const registry = {
  get: (e) => e._mozert || undefined,
  set: (e, v) => { e._mozert = v; },
  delete: (e) => { delete e._mozert; },
};
const isEl = (v) => typeof Element !== 'undefined' && v instanceof Element;
const clamp = (v, a, b) => Math.min(b, Math.max(a, v));

function htmlToEl(html) {
  const t = document.createElement('template');
  t.innerHTML = String(html).trim();
  return t.content.firstElementChild;
}

function resolveNode(v) {
  if (!v) return null;
  if (isEl(v)) return v;
  if (typeof v === 'string') {
    const t = v.trim();
    return t.charAt(0) === '<' ? htmlToEl(t) : document.querySelector(t);
  }
  if (v[0] && isEl(v[0])) return v[0];
  return null;
}

function parseData(el) {
  const raw = el.getAttribute('data-mozert');
  if (!raw) return {};
  try {
    return JSON.parse(raw);
  } catch (e) {
    console.warn('Mozert: could not parse data-mozert JSON', e);
    return {};
  }
}

class Mozert {
  constructor(el, options = {}) {
    if (typeof el === 'string') el = document.querySelector(el);
    if (!isEl(el)) throw new TypeError('Mozert: a valid element or selector is required');
    const existing = registry.get(el);
    if (existing) return existing;

    this.el = el;
    const _o = Object.assign({}, options, parseData(el));
    Mozert._boot.forEach((f) => f(el, _o));
    this._base = Object.assign({}, DEFAULTS, options, parseData(el));
    this.options = this._base;
    this._dormant = false;
    this.active = false;
    this.canNav = false;
    this.current = 0;
    this.animating = false;
    this.n = 0;

    this._handlers = {};
    this._sources = [];
    this._filter = null;
    this._stash = new WeakMap();
    this._logical = 0;
    this._t = 0;
    this._cur = 0;
    this._bp = null;
    this._off = [];
    this._life = [];
    this._pause = new Set();
    this._fxHooks = [];
    this._mi = [];
    this._release = null;
    this._lockDrag = false;
    this._autoOn = false;
    this._dir = 1;
    this._built = false;
    this._initDone = false;
    this._origDir = el.getAttribute('dir');
    this._lastW = el.clientWidth;

    registry.set(el, this);
    this._collect();
    this._bindLife();
    this._apply(true);
  }

  /* ------------------------------------------------------------------ */
  /* Public API                                                          */
  /* ------------------------------------------------------------------ */

  /** Read-only snapshot of the slider's current state. */
  getState() {
    return {
      active: this.active,
      current: this.current,
      count: this.n,
      total: this.trackLen || 0,
      inner: this.Lc || 0,
      clones: this.cloneCount || 0,
      offset: this._cur || 0,
      animating: this.animating,
      canNavigate: this.canNav,
      playing: this.isPlaying(),
      breakpoint: this._bp,
    };
  }

  slideCount() {
    return this.n;
  }

  currentSlide() {
    return this.current;
  }

  isPlaying() {
    return !!(this.active && this._autoOn && !this._pause.has('user'));
  }

  get _c() {
    return this.cloneCount;
  }

  next() {
    if (!this.active || !this.canNav) return this;
    this._slideTo(this.current + this.s.slidesToScroll);
    return this;
  }

  prev() {
    if (!this.active || !this.canNav) return this;
    this._slideTo(this.current - this.s.slidesToScroll);
    return this;
  }

  goTo(index, dontAnimate = false) {
    if (!this.active || !this.canNav) return this;
    index = parseInt(index, 10);
    if (isNaN(index)) return this;
    this._slideTo(this.s.infinite ? this._norm(index) : clamp(index, 0, Math.max(0, this.n - 1)), { animate: !dontAnimate });
    return this;
  }

  play() {
    const was = this.isPlaying();
    this._autoOn = true;
    this._pause.delete('user');
    this._schedule();
    this._live();
    if (!was) this.emit('autoplayStart');
    return this;
  }

  pause() {
    const was = this.isPlaying();
    this._autoOn = false;
    this._pause.add('user');
    clearTimeout(this._apTimer);
    cancelAnimationFrame(this._apRaf);
    this._live();
    if (was) this.emit('autoplayStop');
    return this;
  }

  getSlides() {
    return this._units ? this._units.slice() : this._activeItems();
  }

  getOption(name) {
    return this.options[name];
  }

  setOption(name, value, refresh) {
    if (name && typeof name === 'object') {
      refresh = value;
      Object.assign(this._base, name);
    } else {
      this._base[name] = value;
    }
    if (refresh === false) {
      // Only re-resolve settings that are read live (autoplay, pauseOn*, ...).
      this._applyLive();
    } else {
      this._apply(false);
    }
    return this;
  }

  _applyLive() {
    const r = this._resolve();
    this.options = r.s;
    if (this.active) {
      this.s = this._prepare(r.s);
      this._autoOn = !!this.s.autoplay && this.canNav;
      if (this._autoOn) this._pause.delete('user');
      this._live();
      this._schedule();
    }
  }

  add(markup, index, addBefore) {
    const node = resolveNode(typeof markup === 'string' && markup.trim().charAt(0) !== '<' ? `<div>${markup}</div>` : markup);
    if (!node) return false;
    if (typeof index === 'boolean') {
      addBefore = index;
      index = null;
    }
    const items = this._activeItems();
    if (index != null && (index < 0 || index >= items.length)) return false;
    if (index == null || !items.length) {
      if (addBefore) this._sources.unshift(node);
      else this._sources.push(node);
    } else {
      const at = this._sources.indexOf(items[index]);
      this._sources.splice(at + (addBefore ? 0 : 1), 0, node);
    }
    this._refreshKeep();
    return this;
  }

  remove(index, removeBefore) {
    const items = this._activeItems();
    if (typeof index === 'boolean') {
      removeBefore = index;
      index = removeBefore ? 0 : items.length - 1;
    } else {
      index = removeBefore ? index - 1 : index;
    }
    if (index == null || index < 0 || index >= items.length) return false;
    const node = items[index];
    this._sources.splice(this._sources.indexOf(node), 1);
    this._restoreItem(node);
    if (node.parentNode) node.parentNode.removeChild(node);
    if (index < this.current) this.current -= 1;
    this._refreshKeep();
    return this;
  }

  removeAll() {
    this._activeItems().forEach((node) => {
      this._sources.splice(this._sources.indexOf(node), 1);
      this._restoreItem(node);
      if (node.parentNode) node.parentNode.removeChild(node);
    });
    this.current = 0;
    this._refreshKeep();
    return this;
  }

  filter(selectorOrFn) {
    this._filter = selectorOrFn || null;
    this.current = 0;
    this._refreshKeep();
    return this;
  }

  unfilter() {
    return this.filter(null);
  }

  /** Re-read options and rebuild everything, keeping the current slide. */
  refresh() {
    this._refreshKeep();
    this.emit('reInit');
    return this;
  }

  /** Re-measure and reposition, e.g. after the container was resized by script. */
  setPosition() {
    if (!this.active) return this;
    this._layout();
    this._paintCurrent(false);
    this.emit('setPosition');
    return this;
  }

  destroy() {
    this.emit('destroy');
    if (this.active) this._teardown();
    this._sources.forEach((n) => this.el.appendChild(n));
    this.active = false;
    this._life.forEach((fn) => fn());
    this._life = [];
    if (this._ro) this._ro.disconnect();
    registry.delete(this.el);
    this._dormant = false;
    this._handlers = {};
    return this;
  }

  on(name, fn) {
    (this._handlers[name] = this._handlers[name] || []).push(fn);
    return this;
  }

  once(name, fn) {
    const wrap = (...a) => {
      this.off(name, wrap);
      fn.apply(this, a);
    };
    return this.on(name, wrap);
  }

  one(name, fn) {
    return this.once(name, fn);
  }

  off(name, fn) {
    if (!name) this._handlers = {};
    else if (!fn) delete this._handlers[name];
    else this._handlers[name] = (this._handlers[name] || []).filter((f) => f !== fn);
    return this;
  }

  emit(name, ...args) {
    (this._handlers[name] || []).slice().forEach((fn) => fn.call(this, this, ...args));
    const cb = this._base.on && this._base.on[name];
    if (typeof cb === 'function') cb.call(this, this, ...args);
    this.el.dispatchEvent(new CustomEvent('mozert:' + name, { bubbles: true, detail: { slider: this, args } }));
    if (Mozert._bridge) Mozert._bridge(this, name, args);
  }

  static get(el) {
    if (typeof el === 'string') el = document.querySelector(el);
    return (isEl(el) && registry.get(el)) || null;
  }

  static initAll(root, options) {
    const scope = root && root.querySelectorAll ? root : document;
    const found = Array.from(scope.querySelectorAll('[data-mozert]'));
    if (scope !== document && scope.matches && scope.matches('[data-mozert]')) found.unshift(scope);
    return found.map((n) => Mozert.get(n) || new Mozert(n, options));
  }

  /* ------------------------------------------------------------------ */
  /* Settings and responsive handling                                    */
  /* ------------------------------------------------------------------ */

  _respondWidth() {
    const mode = this._base.respondTo;
    const w = window.innerWidth;
    if (mode === 'slider') return this.el.clientWidth;
    if (mode === 'min') return Math.min(w, this.el.clientWidth);
    return w;
  }

  _resolve() {
    const base = this._base;
    const list = Array.isArray(base.responsive) ? base.responsive.filter((r) => r && typeof r.breakpoint === 'number') : [];
    const w = this._respondWidth();
    let hit = null;
    if (base.mobileFirst) {
      list.sort((a, b) => a.breakpoint - b.breakpoint).forEach((r) => {
        if (w >= r.breakpoint) hit = r;
      });
    } else {
      list.sort((a, b) => b.breakpoint - a.breakpoint).forEach((r) => {
        if (w <= r.breakpoint) hit = r;
      });
    }
    if (hit && hit.settings === 'destroy') return { bp: hit.breakpoint, dormant: true, s: Object.assign({}, base) };
    return { bp: hit ? hit.breakpoint : null, dormant: false, s: Object.assign({}, base, hit ? hit.settings : {}) };
  }

  _prepare(raw) {
    const s = Object.assign({}, raw);
    s.slidesToShow = Math.max(1, parseFloat(s.slidesToShow) || 1);
    s.slidesToScroll = Math.max(1, parseInt(s.slidesToScroll, 10) || 1);
    s.rows = Math.max(1, parseInt(s.rows, 10) || 1);
    s.slidesPerRow = Math.max(1, parseInt(s.slidesPerRow, 10) || 1);
    s.effect = s.fade ? 'fade' : s.effect || 'slide';
    s.fade = s.effect === 'fade';
    s.stacked = STACKED.indexOf(s.effect) > -1;
    if (s.stacked) {
      s.slidesToShow = 1;
      s.slidesToScroll = 1;
    }
    if (s.effect === 'coverflow' || s.effect === 'expand') s.centerMode = true;
    if (s.freeMode || s.virtual || s.bleed) s.infinite = false;
    if (s.marquee) {
      s.infinite = true;
      s.arrows = false;
      s.dots = false;
      s.autoplay = false;
    }
    s.spaceBetween = parseFloat(s.spaceBetween) || 0;
    if (s.respectReducedMotion && window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
      s.speed = 0;
      s.autoplay = false;
    }
    return s;
  }

  _apply(first) {
    const r = this._resolve();
    const changed = r.bp !== this._bp;
    this._bp = r.bp;
    this._raw = r.s;
    this.options = r.s;
    this._dormant = !!r.dormant;
    if (r.dormant) {
      if (this.active) {
        this._teardown();
        this.active = false;
        this.emit('destroy');
      }
      if (changed && !first) this.emit('breakpoint', r.bp);
      return;
    }
    this.s = this._prepare(r.s);
    if (this.active) this._teardown();
    this._build(!first);
    if (changed && !first) this.emit('breakpoint', r.bp);
  }

  _refreshKeep() {
    if (!this.active) {
      this._apply(false);
      return;
    }
    this._teardown();
    this._build(true);
  }

  _bindLife() {
    let timer;
    const onResize = () => {
      clearTimeout(timer);
      timer = setTimeout(() => this._onResize(), 40);
    };
    window.addEventListener('resize', onResize);
    window.addEventListener('orientationchange', onResize);
    const onVis = () => {
      if (document.hidden) this._holdOn('hidden');
      else this._holdOff('hidden');
    };
    document.addEventListener('visibilitychange', onVis);
    this._life.push(() => {
      clearTimeout(timer);
      window.removeEventListener('resize', onResize);
      window.removeEventListener('orientationchange', onResize);
      document.removeEventListener('visibilitychange', onVis);
    });
    if (typeof ResizeObserver !== 'undefined') {
      this._ro = new ResizeObserver(() => {
        const w = this.el.clientWidth;
        if (w !== this._lastW) {
          this._lastW = w;
          onResize();
        }
      });
      this._ro.observe(this.el);
    }
  }

  _onResize() {
    const r = this._resolve();
    const must = r.bp !== this._bp || (r.dormant && this.active) || (!r.dormant && !this.active);
    if (must) {
      this._apply(false);
      return;
    }
    if (!this.active) return;
    this._layout();
    if (this._computeCan() !== this.canNav) {
      this._refreshKeep();
      return;
    }
    this._paintCurrent(false);
    this.emit('setPosition');
  }

  /* ------------------------------------------------------------------ */
  /* DOM build / teardown                                                */
  /* ------------------------------------------------------------------ */

  _collect() {
    const kids = Array.from(this.el.children);
    const sel = this._base.slide;
    this._sources = sel ? kids.filter((k) => k.matches(sel)) : kids;
  }

  _activeItems() {
    const f = this._filter;
    if (!f) return this._sources.slice();
    return this._sources.filter((el, i) => (typeof f === 'function' ? f.call(el, el, i) : el.matches(f)));
  }

  _remember(el) {
    if (this._stash.has(el)) return;
    const o = {};
    STASH_ATTRS.forEach((a) => (o[a] = el.getAttribute(a)));
    this._stash.set(el, o);
  }

  _restoreItem(el) {
    const o = this._stash.get(el);
    if (!o) return;
    STASH_ATTRS.forEach((a) => (o[a] === null ? el.removeAttribute(a) : el.setAttribute(a, o[a])));
    el.querySelectorAll('[data-mozert-tabindex]').forEach((f) => {
      const v = f.getAttribute('data-mozert-tabindex');
      if (v === '') f.removeAttribute('tabindex');
      else f.setAttribute('tabindex', v);
      f.removeAttribute('data-mozert-tabindex');
    });
    el.querySelectorAll('[data-mozert-bg]').forEach((b) => b.removeAttribute('data-mozert-bg'));
    this._stash.delete(el);
  }

  _label(key, vars) {
    const l = Object.assign({}, LABELS, this.s && this.s.labels);
    return String(l[key]).replace(/\{(\w+)\}/g, (m, k) => (vars && vars[k] !== undefined ? vars[k] : m));
  }

  _px(v) {
    const p = String(v || '0');
    if (p.indexOf('%') > -1) return (parseFloat(p) / 100) * this.el.clientWidth;
    return parseFloat(p) || 0;
  }

  _padPx() {
    return this._px(this.s.centerPadding);
  }

  _edgePad() {
    const s = this.s;
    return s.centerMode ? this._padPx() : this._px(s.edgePadding);
  }

  /** Works out how many slides fit (can be fractional) before the first layout. */
  _calcShow() {
    const s = this.s;
    let show = s.slidesToShow;
    if (s.slideWidth && !s.vertical && !s.variableWidth) {
      const inner = Math.max(1, (this.list ? this.list.clientWidth : this.el.clientWidth) - 2 * this._edgePad());
      show = Math.max(1, (inner + s.spaceBetween) / (parseFloat(s.slideWidth) + s.spaceBetween));
    }
    this._show = show;
    this._showC = Math.ceil(show - 1e-6);
  }

  _build(keep) {
    const s = this.s;
    const el = this.el;
    const items = this._activeItems();
    // Slides hidden by filter() leave the DOM until unfilter() (or destroy) puts them back.
    this._sources.forEach((n) => {
      if (items.indexOf(n) === -1 && n.parentNode === el) el.removeChild(n);
    });

    el.classList.remove('mozert-pre');
    el.classList.add('mozert-slider', 'mozert-initialized');
    el.classList.toggle('mozert-vertical', !!s.vertical);
    el.classList.toggle('mozert-rtl', !!s.rtl);
    el.classList.toggle('mozert-fade', !!s.fade);
    el.classList.toggle('mozert-fx', s.effect !== 'slide' && !s.fade);
    if (s.effect !== 'slide') el.classList.add('mozert-effect-' + s.effect);
    el.classList.toggle('mozert-center', !!s.centerMode);
    el.classList.toggle('mozert-adaptive', !!s.adaptiveHeight);
    el.classList.toggle('mozert-draggable', !!(s.draggable || s.swipe));
    if (s.rtl) el.setAttribute('dir', 'rtl');
    el.setAttribute('role', 'region');
    el.setAttribute('aria-roledescription', 'carousel');

    this.list = document.createElement('div');
    this.list.className = 'mozert-list';
    this.track = document.createElement('div');
    this.track.className = 'mozert-track';
    this.list.appendChild(this.track);
    el.appendChild(this.list);

    // Group into pages when grid mode is on.
    let units = items;
    if (s.rows > 1 || s.slidesPerRow > 1) {
      units = [];
      const per = s.rows * s.slidesPerRow;
      for (let i = 0; i < items.length; i += per) {
        const page = document.createElement('div');
        page.className = 'mozert-page';
        for (let r = 0; r < s.rows; r++) {
          const row = document.createElement('div');
          row.className = 'mozert-row';
          for (let c = 0; c < s.slidesPerRow; c++) {
            const it = items[i + r * s.slidesPerRow + c];
            if (!it) break;
            this._remember(it);
            it.classList.add('mozert-cell');
            it.style.width = 100 / s.slidesPerRow + '%';
            row.appendChild(it);
          }
          if (row.children.length) page.appendChild(row);
        }
        units.push(page);
      }
    }
    this._items = items;
    this._units = units;
    this.n = units.length;
    this._calcShow();

    units.forEach((u, i) => {
      this._remember(u);
      u.classList.add('mozert-slide');
      u.setAttribute('data-mozert-index', i);
      u.setAttribute('role', 'group');
      u.setAttribute('aria-roledescription', 'slide');
      u.setAttribute('aria-label', this._label('slide', { n: i + 1, total: units.length }));
      u.querySelectorAll('[data-lazy-bg]').forEach((b, k) => b.setAttribute('data-mozert-bg', String(k)));
      this.track.appendChild(u);
    });
    this.dom = units.slice();
    this.cloneCount = 0;

    // First pass (only for variable widths) so we know whether navigation is needed.
    if (s.variableWidth) this._layout();
    this.canNav = this._computeCan();

    if (s.infinite && this.canNav && !s.stacked) this._addClones();

    this._layout();
    this.maxIndex = this._maxIndex();
    this.current = clamp(keep ? this.current : parseInt(s.initialSlide, 10) || 0, 0, s.infinite ? Math.max(0, this.n - 1) : this.maxIndex);
    if (!this.canNav) this.current = 0;
    this._logical = this.current;

    if (!this.canNav) el.classList.add('mozert-static');
    else el.classList.remove('mozert-static');

    this._buildArrows();
    this._buildDots();
    this._bindEvents();
    this.active = true;
    this._built = true;
    this._paintCurrent(false);
    if (s.fade) {
      // Show the first slide immediately, then switch the cross-fade on.
      this.dom.forEach((e) => (e.style.transition = 'none'));
      void this.track.offsetWidth;
      this.dom.forEach((e) => (e.style.transition = s.speed > 0 ? 'opacity ' + s.speed + 'ms ' + s.cssEase : 'none'));
    }
    this._updateNav();
    this._lazy();
    this._mi = Mozert._mods.map((m) => (m.create ? m.create(this) : null)).filter(Boolean);

    this._autoOn = !!s.autoplay && this.canNav;
    if (!this._initDone) {
      this._initDone = true;
      this._autoOn = !!s.autoplay && this.canNav;
      this.emit('init');
    } else if (keep) {
      this.emit('reInit');
    }
    this._live();
    this._schedule();
    this.emit('setPosition');
  }

  _addClones() {
    const s = this.s;
    const n = this.n;
    const count = s.variableWidth ? n * 2 : this._showC + s.slidesToScroll + (s.centerMode ? 1 : 0);
    this.cloneCount = count;
    const mk = (idx) => {
      const base = this._units[((idx % n) + n) % n];
      const c = base.cloneNode(true);
      c.removeAttribute('id');
      c.querySelectorAll('[id]').forEach((x) => x.removeAttribute('id'));
      c.classList.remove('mozert-active', 'mozert-center');
      c.classList.add('mozert-cloned');
      c.setAttribute('aria-hidden', 'true');
      c.removeAttribute('role');
      c.removeAttribute('aria-label');
      c.removeAttribute('aria-roledescription');
      c.querySelectorAll(FOCUSABLE).forEach((f) => {
        f.setAttribute('data-mozert-tabindex', f.getAttribute('tabindex') || '');
        f.setAttribute('tabindex', '-1');
      });
      return c;
    };
    const before = [];
    const after = [];
    for (let i = -count; i < 0; i++) before.push(mk(i));
    for (let i = 0; i < count; i++) after.push(mk(n + i));
    const first = this._units[0];
    before.forEach((c) => this.track.insertBefore(c, first));
    after.forEach((c) => this.track.appendChild(c));
    this.dom = before.concat(this._units, after);
  }

  _teardown() {
    this._mi.forEach((m) => m.destroy && m.destroy());
    this._mi = [];
    this._fxHooks = [];
    this._release = null;
    this._lockDrag = false;
    this._off.forEach((fn) => fn());
    this._off = [];
    clearTimeout(this._animTimer);
    clearTimeout(this._apTimer);
    if (this._raf) cancelAnimationFrame(this._raf);
    this._raf = 0;
    this.animating = false;
    const el = this.el;

    (this._items || []).forEach((it) => {
      this._restoreItem(it);
      // Slides removed through remove()/removeAll() must not come back.
      if (this._sources.indexOf(it) > -1) el.appendChild(it);
    });
    (this._units || []).forEach((u) => {
      if (this._items.indexOf(u) === -1) this._stash.delete(u);
    });
    if (this.list && this.list.parentNode) this.list.parentNode.removeChild(this.list);
    (this._navNodes || []).forEach((fn) => fn());
    this._navNodes = [];

    Array.from(el.classList)
      .filter((c) => c.indexOf('mozert') === 0)
      .forEach((c) => el.classList.remove(c));
    el.removeAttribute('role');
    el.removeAttribute('aria-roledescription');
    if (this._origDir === null) el.removeAttribute('dir');
    else el.setAttribute('dir', this._origDir);
    this.dom = [];
    this.active = false;
  }

  /* ------------------------------------------------------------------ */
  /* Measuring                                                           */
  /* ------------------------------------------------------------------ */

  _layout() {
    const s = this.s;
    const v = !!s.vertical;
    const list = this.list;
    const track = this.track;
    const dom = this.dom;
    this._calcShow();
    const show = this._show;
    const gap = s.spaceBetween;
    const pad = this._edgePad();
    const mProp = v ? 'marginBottom' : s.rtl ? 'marginLeft' : 'marginRight';
    list.style.padding = v ? pad + 'px 0' : '0 ' + pad + 'px';

    if (v) {
      dom.forEach((e) => (e.style.height = ''));
      track.style.height = '';
      let h = 0;
      this._units.forEach((u) => (h = Math.max(h, u.offsetHeight)));
      this.slideSize = h;
      dom.forEach((e) => {
        e.style.height = h + 'px';
        e.style[mProp] = gap ? gap + 'px' : '';
      });
      this.Lc = h * show + gap * (show - 1);
      list.style.height = this.Lc + 2 * pad + 'px';
      this.trackLen = (h + gap) * dom.length - gap;
      track.style.height = this.trackLen + gap + 'px';
    } else {
      this.Lc = Math.max(0, list.clientWidth - 2 * pad);
      if (!s.variableWidth) {
        const w = s.slideWidth ? parseFloat(s.slideWidth) : (this.Lc - gap * (show - 1)) / show;
        this.slideSize = w;
        dom.forEach((e) => {
          e.style.width = w + 'px';
          e.style[mProp] = gap ? gap + 'px' : '';
        });
        this.trackLen = (w + gap) * dom.length - gap;
        track.style.width = this.trackLen + gap + 'px';
      } else {
        dom.forEach((e) => (e.style[mProp] = gap ? gap + 'px' : ''));
        track.style.width = '100000px';
      }
    }

    const tr = track.getBoundingClientRect();
    this._mags = [];
    this._sizes = [];
    dom.forEach((e) => {
      const r = e.getBoundingClientRect();
      if (v) {
        this._mags.push(r.top - tr.top);
        this._sizes.push(r.height);
      } else if (s.rtl) {
        this._mags.push(tr.right - r.right);
        this._sizes.push(r.width);
      } else {
        this._mags.push(r.left - tr.left);
        this._sizes.push(r.width);
      }
    });
    if (!v && s.variableWidth) {
      let end = 0;
      this._mags.forEach((m, i) => (end = Math.max(end, m + this._sizes[i])));
      this.trackLen = Math.ceil(end);
      track.style.width = this.trackLen + 'px';
    }
    const cc = this.cloneCount;
    const last = cc + this.n - 1;
    this._realLen = this.n ? this._mags[last] + this._sizes[last] - this._mags[cc] : 0;

    if (s.stacked) {
      const sz = this.slideSize;
      dom.forEach((e, i) => {
        e.style.position = 'relative';
        if (v) e.style.top = -i * sz + 'px';
        else e.style.left = (s.rtl ? i * sz : -i * sz) + 'px';
      });
    }
    this._adaptHeight();
    this._arrowY();
    this.maxIndex = this._maxIndex();
  }

  _computeCan() {
    const s = this.s;
    if (s.variableWidth) return this.n > 1 && this._realLen > this.Lc + 1;
    return this.n > this._show + 1e-6;
  }

  _maxIndex() {
    const s = this.s;
    if (s.infinite || s.stacked) return Math.max(0, this.n - 1);
    if (s.centerMode) return Math.max(0, this.n - 1);
    if (s.variableWidth) {
      const need = this._realLen - this.Lc - 0.5;
      if (need <= 0) return 0;
      for (let i = 0; i < this.n; i++) if (this._mags[this.cloneCount + i] - this._mags[this.cloneCount] >= need) return i;
      return this.n - 1;
    }
    return Math.max(0, Math.ceil(this.n - this._show - 1e-6));
  }

  _adaptHeight() {
    const s = this.s;
    if (!s.adaptiveHeight || s.vertical || this._show !== 1) return;
    const e = this.dom[this.cloneCount + this._logical] || this.dom[0];
    if (!e) return;
    this.list.style.transition = s.speed > 0 ? 'height ' + s.speed + 'ms ' + s.cssEase : 'none';
    this.list.style.height = e.offsetHeight + 'px';
    this._arrowY(e.offsetHeight);
  }

  /** Keeps arrows centred on the slides, not on the whole slider (dots/pagination sit below the list). */
  _arrowY(h) {
    const l = this.list;
    if (!l || this.s.vertical) return;
    const hh = h === undefined ? l.offsetHeight : h;
    this.el.style.setProperty('--mozert-arrow-y', l.offsetTop + hh / 2 + 'px');
  }

  _norm(i) {
    const n = this.n;
    if (this.s.infinite || this.s.stacked) return ((i % n) + n) % n;
    return clamp(i, 0, this.maxIndex);
  }

  _pos(L) {
    const s = this.s;
    const k = this.cloneCount + L;
    if (this._mags[k] === undefined) return this._t;
    let mag = this._mags[k];
    let c = 0;
    if (s.centerMode) c = (this.Lc - this._sizes[k]) / 2;
    else if (!s.infinite) mag = Math.min(mag, Math.max(0, this.trackLen - this.Lc));
    const dir = s.rtl && !s.vertical ? -1 : 1;
    return dir * (c - mag);
  }

  /* ------------------------------------------------------------------ */
  /* Movement                                                            */
  /* ------------------------------------------------------------------ */

  _paint(val, animate) {
    const s = this.s;
    const track = this.track;
    this._cur = val;
    if (s.useTransform) track.style.transform = s.vertical ? 'translate3d(0,' + val + 'px,0)' : 'translate3d(' + val + 'px,0,0)';
    else track.style[s.vertical ? 'top' : 'left'] = val + 'px';
    if (this._fxHooks.length) this._fx(this._pvFromT(val), !!animate);
  }

  /** Visual position in slide units (0 = first slide at the anchor), used by effects, scrollbar and parallax. */
  _pvFromT(t) {
    const s = this.s;
    if (s.variableWidth || !this._mags || !this._mags.length) return this._logical;
    const dir = s.rtl && !s.vertical ? -1 : 1;
    const c = s.centerMode ? (this.Lc - this.slideSize) / 2 : 0;
    const pitch = this.slideSize + s.spaceBetween;
    return (c - dir * t - this._mags[this.cloneCount]) / (pitch || 1);
  }

  _fx(pv, animate) {
    for (let i = 0; i < this._fxHooks.length; i++) this._fxHooks[i](pv, animate, this.s.speed);
  }

  /** For modules: run fn(pv, animate, speed) whenever the visual position changes. */
  _onFx(fn) {
    this._fxHooks.push(fn);
  }

  /** For modules: subscribe to a slider event for the life of this build. */
  _sub(name, fn) {
    this.on(name, fn);
    this._off.push(() => this.off(name, fn));
  }

  _user() {
    if (this.s.disableOnInteraction && this._autoOn) this.pause();
  }

  _setPos(t, animate, opts) {
    const s = this.s;
    const track = this.track;
    if (this._raf) cancelAnimationFrame(this._raf);
    this._raf = 0;
    if (animate && s.speed > 0) {
      const dur = opts && opts.duration ? opts.duration : s.speed;
      if (s.useCSS) {
        track.style.transition = (s.useTransform ? 'transform' : s.vertical ? 'top' : 'left') + ' ' + dur + 'ms ' + (opts && opts.ease ? opts.ease : s.cssEase);
        this._paint(t, true);
      } else {
        track.style.transition = 'none';
        const from = this._cur;
        const ease = typeof s.easing === 'function' ? s.easing : EASINGS[s.easing] || EASINGS.linear;
        const t0 = performance.now();
        const step = (now) => {
          const p = Math.min(1, (now - t0) / s.speed);
          this._paint(from + (t - from) * ease(p));
          this._raf = p < 1 ? requestAnimationFrame(step) : 0;
        };
        this._raf = requestAnimationFrame(step);
      }
    } else {
      track.style.transition = 'none';
      this._paint(t);
      void track.offsetWidth;
    }
    this._t = t;
  }

  _paintCurrent(animate) {
    if (this.s.stacked) this._fx(this._logical, false);
    else this._setPos(this._pos(this._logical), animate);
    this._updateSlideClasses(this._logical);
    this._adaptHeight();
  }

  _snapBack() {
    if (this.s.stacked) this._fx(this._logical, true);
    else this._setPos(this._pos(this._logical), true);
  }

  _slideTo(target, opts = {}) {
    const s = this.s;
    if (!this.active) return false;
    if (!this.canNav) {
      // A strip that shows every slide cannot move, but a synced partner can still change which slide is highlighted.
      if (opts.fromSync) {
        const sel = opts.sel !== undefined && opts.sel !== 0 ? opts.sel : null;
        if (sel !== this._sel) {
          this._sel = sel;
          this._updateSlideClasses(this._logical);
        }
      }
      return false;
    }
    if (this.animating && !opts.fromSync && s.waitForAnimate) return false;
    let next = target;
    if (!s.infinite || s.stacked) next = s.stacked ? this._norm(next) : clamp(next, 0, this.maxIndex);
    const real = this._norm(next);
    // A synced partner follows the requested slide even when this slider cannot scroll that far
    // (a thumbnail strip stops at its last full page, but the main slider should still go to the clicked one).
    const want = s.infinite || s.stacked ? real : clamp(target, 0, this.n - 1);
    if (next === this.current && !this.animating && !opts.force) {
      if (opts.fromSync) {
        // Already at the clamped position: only move the highlight to the slide the partner asked for.
        const sel = opts.sel !== undefined && opts.sel !== next ? opts.sel : null;
        if (sel !== this._sel) {
          this._sel = sel;
          this._updateSlideClasses(this._logical);
        }
      } else {
        // The strip already sits on this index (its last full page), but the partner may still be elsewhere.
        if (want !== next) {
          this._sel = want;
          this._updateSlideClasses(this._logical);
        }
        this._syncNav(want);
      }
      return false;
    }

    const old = this.current;
    this.emit('beforeChange', old, real);
    this._sel = opts.fromSync ? (opts.sel !== undefined && opts.sel !== next ? opts.sel : null) : want !== next ? want : null;
    if (!opts.fromSync) this._syncNav(want);
    clearTimeout(this._animTimer);
    this.current = real;
    this._logical = next;
    this._updateNav();
    this._updateSlideClasses(next);
    this._lazy();

    const animate = opts.animate !== false;
    if (s.stacked) this._fx(next, animate && s.speed > 0);
    else this._setPos(this._pos(next), animate);
    if (!animate || s.speed <= 0) {
      this._finish();
    } else {
      this.animating = true;
      this._animTimer = setTimeout(() => this._finish(), s.speed);
    }
    return true;
  }

  _finish() {
    this.animating = false;
    if (this._logical !== this.current) {
      this._logical = this.current;
      if (!this.s.stacked) this._setPos(this._pos(this.current), false);
      this._updateSlideClasses(this._logical);
    }
    this._adaptHeight();
    this.emit('afterChange', this.current);
    this._schedule();
  }

  _updateSlideClasses(L) {
    const s = this.s;
    const show = this._show;
    const showC = this._showC;
    const half = Math.floor(showC / 2);
    const t = s.stacked ? 0 : this._pos(L);
    this.dom.forEach((e, k) => {
      const l = k - this.cloneCount;
      let active;
      let centered = false;
      if (s.stacked) {
        active = l === L;
      } else if (s.variableWidth) {
        const d = s.rtl ? this._mags[k] - t : this._mags[k] + t;
        active = d + this._sizes[k] > 0.5 && d < this.Lc - 0.5;
        centered = s.centerMode && l === L;
      } else if (s.centerMode) {
        active = l >= L - half && l <= L + half - (showC % 2 === 0 ? 1 : 0);
        centered = l === L;
      } else {
        active = l >= L && l <= L + showC - 1;
      }
      e.classList.toggle('mozert-active', active);
      e.classList.toggle('mozert-center', centered);
      e.classList.toggle('mozert-current', l === (this._sel != null ? this._sel : L));
      e.setAttribute('aria-hidden', active ? 'false' : 'true');
      if (s.stacked) e.style.zIndex = l === L ? s.zIndex : s.zIndex - 2;
      if (!e.classList.contains('mozert-cloned')) {
        e.querySelectorAll(FOCUSABLE).forEach((f) => {
          if (active) {
            if (f.hasAttribute('data-mozert-tabindex')) {
              const v = f.getAttribute('data-mozert-tabindex');
              if (v === '') f.removeAttribute('tabindex');
              else f.setAttribute('tabindex', v);
              f.removeAttribute('data-mozert-tabindex');
            }
          } else if (!f.hasAttribute('data-mozert-tabindex')) {
            f.setAttribute('data-mozert-tabindex', f.getAttribute('tabindex') || '');
            f.setAttribute('tabindex', '-1');
          }
        });
      }
    });
  }

  /* ------------------------------------------------------------------ */
  /* Arrows and dots                                                     */
  /* ------------------------------------------------------------------ */

  _buildArrows() {
    this._navNodes = this._navNodes || [];
    this._arrows = { prev: null, next: null };
    this._prev = this._next = null;
    const s = this.s;
    if (!s.arrows || !this.canNav) return;
    const mount = resolveNode(s.appendArrows) || this.el;
    const make = (val, html, cls, handler) => {
      const node = resolveNode(val) || htmlToEl(html);
      const created = !(val && !(typeof val === 'string' && val.trim().charAt(0) === '<'));
      node.classList.add('mozert-arrow', cls);
      if (!node.parentNode || created) mount.appendChild(node);
      const lab = this._label(cls === 'mozert-prev' ? 'prev' : 'next');
      if (!val || (!node.getAttribute('aria-label') && !node.textContent.trim())) node.setAttribute('aria-label', lab);
      node.addEventListener('click', handler);
      this._navNodes.push(() => {
        node.removeEventListener('click', handler);
        node.classList.remove('mozert-arrow', cls, 'mozert-disabled');
        node.removeAttribute('aria-disabled');
        if (created && node.parentNode) node.parentNode.removeChild(node);
      });
      return node;
    };
    this._arrows.prev = make(s.prevArrow, DEFAULT_PREV, 'mozert-prev', (e) => {
      e.preventDefault();
      this._user();
      this.prev();
    });
    this._arrows.next = make(s.nextArrow, DEFAULT_NEXT, 'mozert-next', (e) => {
      e.preventDefault();
      this._user();
      this.next();
    });
    this._prev = this._arrows.prev;
    this._next = this._arrows.next;
  }

  _dotCount() {
    const s = this.s;
    if (!this.canNav) return 0;
    if (s.infinite) return Math.ceil(this.n / s.slidesToScroll);
    return Math.ceil(this.maxIndex / s.slidesToScroll) + 1;
  }

  _buildDots() {
    this._dots = null;
    const s = this.s;
    if (!s.dots || !this.canNav) return;
    const count = this._dotCount();
    const ul = document.createElement('ul');
    ul.className = s.dotsClass;
    ul.setAttribute('role', 'tablist');
    for (let i = 0; i < count; i++) {
      const li = document.createElement('li');
      li.setAttribute('role', 'presentation');
      let inner = typeof s.customPaging === 'function' ? s.customPaging(this, i) : null;
      if (typeof inner === 'string') inner = htmlToEl(inner.trim().charAt(0) === '<' ? inner : '<button type="button">' + inner + '</button>');
      if (!isEl(inner)) {
        inner = document.createElement('button');
        inner.type = 'button';
        inner.setAttribute('aria-label', this._label('goTo', { n: i + 1 }));
      }
      inner.setAttribute('role', 'tab');
      li.appendChild(inner);
      li.addEventListener('click', (e) => {
        e.preventDefault();
        this._user();
        this._slideTo(this._dotTarget(i));
      });
      ul.appendChild(li);
    }
    (resolveNode(s.appendDots) || this.el).appendChild(ul);
    this._dots = ul;
    this._navNodes.push(() => ul.parentNode && ul.parentNode.removeChild(ul));
    if (s.pauseOnDotsHover) {
      const a = () => this._holdOn('dots');
      const b = () => this._holdOff('dots');
      ul.addEventListener('mouseenter', a);
      ul.addEventListener('mouseleave', b);
    }
  }

  _dotTarget(i) {
    const s = this.s;
    const t = i * s.slidesToScroll;
    return s.infinite ? t : Math.min(t, this.maxIndex);
  }

  _updateNav() {
    const s = this.s;
    if (this._dots) {
      const total = this._dots.children.length;
      const idx = s.infinite ? Math.floor(this.current / s.slidesToScroll) : Math.ceil(this.current / s.slidesToScroll);
      Array.from(this._dots.children).forEach((li, i) => {
        const on = i === Math.min(total - 1, idx);
        li.classList.toggle('mozert-active', on);
        if (li.firstElementChild) li.firstElementChild.setAttribute('aria-selected', on ? 'true' : 'false');
      });
    }
    const { prev, next } = this._arrows || {};
    if (!s.infinite && prev && next) {
      const setD = (node, d) => {
        node.classList.toggle('mozert-disabled', d);
        node.setAttribute('aria-disabled', d ? 'true' : 'false');
        if ('disabled' in node) node.disabled = d;
      };
      setD(prev, this.current <= 0);
      setD(next, this.current >= this.maxIndex);
    }
  }

  /* ------------------------------------------------------------------ */
  /* Events: drag, keyboard, hover, focus                                */
  /* ------------------------------------------------------------------ */

  _axis() {
    const s = this.s;
    if (s.vertical) return s.verticalSwiping ? 'y' : null;
    return 'x';
  }

  _on(target, type, fn, opts) {
    target.addEventListener(type, fn, opts);
    this._off.push(() => target.removeEventListener(type, fn, opts));
  }

  _bindEvents() {
    const s = this.s;
    const el = this.el;
    const list = this.list;
    const axis = this._axis();
    list.style.touchAction = axis === 'x' ? 'pan-y' : axis === 'y' ? 'pan-x' : '';
    if (s.accessibility) list.setAttribute('tabindex', '0');

    // Keyboard
    this._on(el, 'keydown', (e) => {
      if (!s.accessibility || !this.canNav) return;
      const t = e.target;
      if (t && (/^(INPUT|TEXTAREA|SELECT)$/.test(t.tagName) || t.isContentEditable)) return;
      const rtl = s.rtl && !s.vertical;
      let handled = true;
      if (e.key === 'ArrowLeft' || (s.vertical && e.key === 'ArrowUp')) rtl ? this.next() : this.prev();
      else if (e.key === 'ArrowRight' || (s.vertical && e.key === 'ArrowDown')) rtl ? this.prev() : this.next();
      else if (e.key === 'Home') this.goTo(0);
      else if (e.key === 'End') this.goTo(this.n - 1);
      else handled = false;
      if (handled) e.preventDefault();
    });

    // Pause on hover/focus
    if (s.pauseOnHover) {
      this._on(el, 'mouseenter', () => this._holdOn('hover'));
      this._on(el, 'mouseleave', () => this._holdOff('hover'));
    }
    if (s.pauseOnFocus) {
      this._on(el, 'focusin', () => this._holdOn('focus'));
      this._on(el, 'focusout', (e) => {
        if (!el.contains(e.relatedTarget)) this._holdOff('focus');
      });
    }

    // Click handling (select-to-focus, suppress after drag)
    this._on(
      list,
      'click',
      (e) => {
        if (this._dragged) {
          e.preventDefault();
          e.stopPropagation();
          this._dragged = false;
          return;
        }
        if (s.focusOnSelect && (this.canNav || s.asNavFor)) {
          const slide = e.target.closest ? e.target.closest('.mozert-slide') : null;
          if (slide && this.track.contains(slide)) {
            const i = parseInt(slide.getAttribute('data-mozert-index'), 10);
            if (!isNaN(i)) {
              if (this.canNav) this.goTo(i);
              else {
                // Nothing to scroll: just highlight the clicked slide and tell the partner.
                this._sel = i;
                this._updateSlideClasses(this._logical);
                this._syncNav(i);
              }
            }
          }
        }
      },
      true
    );
    this._on(list, 'dragstart', (e) => e.preventDefault());
    this._on(list, 'selectstart', (e) => {
      if (this._pointerDown) e.preventDefault();
    });

    // Images that load late change heights
    this._on(
      this.track,
      'load',
      () => {
        if (!this.active) return;
        clearTimeout(this._imgTimer);
        this._imgTimer = setTimeout(() => this.setPosition(), 30);
      },
      true
    );

    if (axis && this.canNav) this._bindDrag(axis);
  }

  _bindDrag(axis) {
    const s = this.s;
    const list = this.list;
    let d = null;

    const onDown = (e) => {
      if (this._lockDrag) return;
      if (this.animating && s.waitForAnimate) return;
      if (e.pointerType === 'mouse') {
        if (e.button !== 0 || !s.draggable) return;
      } else if (!s.swipe) {
        return;
      }
      this._dragged = false;
      this._pointerDown = true;
      d = { id: e.pointerId, x: e.clientX, y: e.clientY, started: false, base: this._t, delta: 0, samples: [] };
      window.addEventListener('pointermove', onMove);
      window.addEventListener('pointerup', onUp);
      window.addEventListener('pointercancel', onCancel);
    };

    const limits = () => {
      const a = this._pos(0);
      const b = this._pos(this.maxIndex);
      return [Math.min(a, b), Math.max(a, b)];
    };

    const onMove = (e) => {
      if (!d || e.pointerId !== d.id) return;
      if (this._lockDrag && !d.started) return;
      const dx = e.clientX - d.x;
      const dy = e.clientY - d.y;
      const main = (axis === 'x' ? dx : dy) * s.touchRatio;
      const cross = axis === 'x' ? dy : dx;
      if (!d.started) {
        if (Math.abs(main) < s.dragThreshold || Math.abs(main) < Math.abs(cross)) return;
        d.started = true;
        this.el.classList.add('mozert-dragging');
        this._holdOn('drag');
        try {
          list.setPointerCapture(e.pointerId);
        } catch (err) {
          /* ignore */
        }
        this.track.style.transition = 'none';
      }
      d.delta = main;
      d.samples.push({ t: performance.now(), v: main });
      if (d.samples.length > 6) d.samples.shift();
      if (!s.touchMove) return;
      if (s.stacked) {
        const sgn = s.rtl && !s.vertical ? 1 : -1;
        let pv = this._logical + (sgn * main) / (axis === 'x' ? this.list.clientWidth : this.list.clientHeight);
        if (!s.infinite) {
          if (pv < 0) pv *= s.edgeFriction;
          else if (pv > this.maxIndex) pv = this.maxIndex + (pv - this.maxIndex) * s.edgeFriction;
        }
        this._fx(pv, false);
        return;
      }
      let raw = d.base + main;
      if (!s.infinite) {
        const [lo, hi] = limits();
        if (raw > hi) raw = hi + (raw - hi) * s.edgeFriction;
        else if (raw < lo) raw = lo - (lo - raw) * s.edgeFriction;
      }
      this._paint(raw);
    };

    const end = () => {
      window.removeEventListener('pointermove', onMove);
      window.removeEventListener('pointerup', onUp);
      window.removeEventListener('pointercancel', onCancel);
      this._pointerDown = false;
      this.el.classList.remove('mozert-dragging');
      this._holdOff('drag');
    };

    const onCancel = () => {
      if (!d) return;
      const started = d.started;
      d = null;
      end();
      if (started) this._snapBack();
    };

    const onUp = (e) => {
      if (!d || e.pointerId !== d.id) return;
      const st = d;
      d = null;
      end();
      if (!st.started) return;
      this._dragged = true;
      const delta = st.delta;
      const size = axis === 'x' ? this.list.clientWidth : this.list.clientHeight;
      this._user();
      if (this._release && this._release(st, size, axis)) return;
      const fingerDir = axis === 'x' ? (delta < 0 ? 'left' : 'right') : delta < 0 ? 'up' : 'down';
      const rtl = s.rtl && !s.vertical;
      const forward = rtl ? delta > 0 : delta < 0;
      if (Math.abs(delta) < size / s.touchThreshold) {
        this._snapBack();
        return;
      }
      this.emit('swipe', fingerDir);
      let target;
      if (s.swipeToSlide) {
        const raw = st.base + delta;
        let best = this.current;
        let bestD = Infinity;
        const lo = s.infinite ? -this.cloneCount : 0;
        const hi = s.infinite ? this.n + this.cloneCount - 1 : this.maxIndex;
        for (let i = lo; i <= hi; i++) {
          const dist = Math.abs(this._pos(i) - raw);
          if (dist < bestD) {
            bestD = dist;
            best = i;
          }
        }
        target = best;
      } else {
        target = this.current + (forward ? 1 : -1) * s.slidesToScroll;
      }
      if (!s.infinite) {
        const clamped = clamp(target, 0, this.maxIndex);
        if (clamped === this.current) {
          this.emit('edge', fingerDir);
          this._snapBack();
          return;
        }
        target = clamped;
      }
      if (target === this.current) {
        this._snapBack();
        return;
      }
      this._slideTo(target);
    };

    this._on(list, 'pointerdown', onDown);
    this._off.push(() => {
      window.removeEventListener('pointermove', onMove);
      window.removeEventListener('pointerup', onUp);
      window.removeEventListener('pointercancel', onCancel);
    });
  }

  /* ------------------------------------------------------------------ */
  /* Autoplay                                                            */
  /* ------------------------------------------------------------------ */

  _holdOn(reason) {
    this._pause.add(reason);
    clearTimeout(this._apTimer);
  }

  _holdOff(reason) {
    this._pause.delete(reason);
    this._schedule();
  }

  _live() {
    if (this.track) this.track.setAttribute('aria-live', this._autoOn && !this._pause.has('user') ? 'off' : 'polite');
  }

  _schedule() {
    clearTimeout(this._apTimer);
    cancelAnimationFrame(this._apRaf);
    if (!this.active || !this.canNav || !this._autoOn) return;
    if (this._pause.size) return;
    const delay = this.s.autoplaySpeed;
    this._apTimer = setTimeout(() => this._tick(), delay);
    const cb = this.options.on && this.options.on.autoplayTimeLeft;
    if ((this._handlers.autoplayTimeLeft && this._handlers.autoplayTimeLeft.length) || cb) {
      const t0 = performance.now();
      const loop = () => {
        const left = Math.max(0, delay - (performance.now() - t0));
        this.emit('autoplayTimeLeft', left, left / delay);
        if (left > 0) this._apRaf = requestAnimationFrame(loop);
      };
      loop();
    }
  }

  _tick() {
    const s = this.s;
    if (this._pause.size || !this.active) return;
    if (this.animating) {
      this._schedule();
      return;
    }
    const rev = s.autoplayReverse;
    if (s.infinite) {
      if (rev) this.prev();
      else this.next();
      return;
    }
    if (s.stopOnLastSlide && (rev ? this.current <= 0 : this.current >= this.maxIndex)) {
      this.pause();
      return;
    }
    if (this.current >= this.maxIndex) this._dir = -1;
    else if (this.current <= 0) this._dir = 1;
    if ((this._dir === 1) !== !!rev) this.next();
    else this.prev();
  }

  /* ------------------------------------------------------------------ */
  /* Syncing and lazy loading                                            */
  /* ------------------------------------------------------------------ */

  _navTargets() {
    const v = this.s.asNavFor;
    if (!v) return [];
    let els = [];
    if (v instanceof Mozert) return v.active && v !== this ? [v] : [];
    if (typeof v === 'string') els = Array.from(document.querySelectorAll(v));
    else if (isEl(v)) els = [v];
    else if (v.length) els = Array.from(v);
    return els.map((e) => registry.get(e)).filter((i) => i && i !== this && i.active);
  }

  _syncNav(index) {
    this._navTargets().forEach((t) => t._slideTo(t.s.infinite ? index : clamp(index, 0, t.maxIndex), { fromSync: true, sel: index }));
  }

  _lazy() {
    const s = this.s;
    if (!this.track || !this.n) return;
    const mode = s.lazyLoad;
    if (mode !== 'ondemand' && mode !== 'progressive') return;
    const from = this.current - (s.centerMode ? Math.floor(this._show / 2) : 0);
    const to = this.current + this._show - 1 + (s.centerMode ? Math.floor(this._show / 2) : 1);
    const seen = new Set();
    for (let i = from; i <= to; i++) {
      const r = ((i % this.n) + this.n) % this.n;
      if (!seen.has(r)) {
        seen.add(r);
        this._loadSlide(r);
      }
    }
    if (mode === 'progressive' && !this._progressing) this._progressive();
  }

  _progressive() {
    this._progressing = true;
    const step = () => {
      if (!this.active) {
        this._progressing = false;
        return;
      }
      const next = this._units.findIndex((u) => u.querySelector('img[data-lazy]:not([data-mozert-loading]), [data-lazy-bg]:not([data-mozert-loading])'));
      if (next === -1) {
        this._progressing = false;
        return;
      }
      this._loadSlide(next, step);
    };
    step();
  }

  _loadSlide(index, done) {
    const unit = this._units[index];
    if (!unit) return;
    const imgs = unit.querySelectorAll('img[data-lazy]');
    const bgs = unit.querySelectorAll('[data-lazy-bg]');
    if (!imgs.length && !bgs.length) {
      if (done) done();
      return;
    }
    let left = imgs.length + bgs.length;
    const fin = () => {
      if (--left === 0 && done) done();
    };
    bgs.forEach((el) => {
      if (el.hasAttribute('data-mozert-loading')) {
        fin();
        return;
      }
      el.setAttribute('data-mozert-loading', '');
      const src = el.getAttribute('data-lazy-bg');
      const k = el.getAttribute('data-mozert-bg');
      const apply = (n) => {
        n.style.backgroundImage = 'url("' + src.replace(/"/g, '%22') + '")';
        n.removeAttribute('data-lazy-bg');
        n.removeAttribute('data-mozert-loading');
      };
      const probe = new Image();
      probe.onload = () => {
        apply(el);
        this.dom.forEach((e) => {
          if (!e.classList.contains('mozert-cloned') || parseInt(e.getAttribute('data-mozert-index'), 10) !== index) return;
          const c = e.querySelector('[data-mozert-bg="' + k + '"]');
          if (c) apply(c);
        });
        this.emit('lazyLoaded', el, src);
        fin();
      };
      probe.onerror = () => {
        el.removeAttribute('data-lazy-bg');
        el.removeAttribute('data-mozert-loading');
        el.classList.add('mozert-lazy-error');
        this.emit('lazyLoadError', el, src);
        fin();
      };
      probe.src = src;
    });
    imgs.forEach((img) => {
      if (img.hasAttribute('data-mozert-loading')) {
        fin();
        return;
      }
      img.setAttribute('data-mozert-loading', '');
      img.classList.add('mozert-loading');
      const src = img.getAttribute('data-lazy');
      const srcset = img.getAttribute('data-lazy-srcset');
      const sizes = img.getAttribute('data-lazy-sizes');
      const probe = new Image();
      probe.onload = () => {
        if (srcset) img.srcset = srcset;
        if (sizes) img.sizes = sizes;
        img.src = src;
        img.removeAttribute('data-lazy');
        img.removeAttribute('data-mozert-loading');
        img.classList.remove('mozert-loading');
        img.classList.add('mozert-loaded');
        this._lazyClones(index, src, srcset, sizes, img);
        this.emit('lazyLoaded', img, src);
        fin();
      };
      probe.onerror = () => {
        img.removeAttribute('data-lazy');
        img.removeAttribute('data-mozert-loading');
        img.classList.remove('mozert-loading');
        img.classList.add('mozert-lazy-error');
        this.emit('lazyLoadError', img, src);
        fin();
      };
      if (srcset) probe.srcset = srcset;
      probe.src = src;
    });
  }

  _lazyClones(index, src, srcset, sizes, realImg) {
    const imgsInUnit = Array.from(this._units[index].querySelectorAll('img'));
    const pos = imgsInUnit.indexOf(realImg);
    this.dom.forEach((e) => {
      if (!e.classList.contains('mozert-cloned') || parseInt(e.getAttribute('data-mozert-index'), 10) !== index) return;
      const c = e.querySelectorAll('img')[pos];
      if (!c) return;
      if (srcset) c.srcset = srcset;
      if (sizes) c.sizes = sizes;
      c.src = src;
      c.removeAttribute('data-lazy');
      c.classList.add('mozert-loaded');
    });
  }
}

Mozert._mods = [];
Mozert._boot = [];
/** Register a module: { name, defaults?, create(slider) => { destroy() } | null }. */
Mozert.use = function (mod) {
  if (mod && Mozert._mods.indexOf(mod) < 0) {
    Mozert._mods.push(mod);
    Object.keys(mod.defaults || {}).forEach((k) => {
      if (!(k in DEFAULTS)) DEFAULTS[k] = mod.defaults[k];
    });
  }
  return Mozert;
};
Mozert.version = VERSION;
Mozert.defaults = DEFAULTS;
Mozert._bridge = null;

  //#endregion core

  // Auto-init any element with a data-mozert attribute (set window.MozertAutoInit = false to opt out).
  if (typeof window !== 'undefined' && typeof document !== 'undefined') {
    var auto = function () {
      if (window.MozertAutoInit === false) return;
      Mozert.initAll(document);
    };
    if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', auto);
    else auto();
  }
  return Mozert;
}));
