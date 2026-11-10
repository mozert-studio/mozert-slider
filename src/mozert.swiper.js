/*!
 * Mozert Swiper-style API v1.0.0 | MIT
 * new Mozert.Swiper('.swiper', { slidesPerView: 3, loop: true, pagination: { el: '.swiper-pagination' } })
 * Load after mozert.min.js. If `window.Swiper` is not defined, it is set to Mozert.Swiper so existing code keeps working.
 */
;(function (root, factory) {
  if (typeof define === 'function' && define.amd) define(['mozert'], factory);
  else if (typeof module === 'object' && module.exports) module.exports = factory(require('./mozert.js'));
  else factory(root.Mozert);
}(typeof self !== 'undefined' ? self : this, function (Mozert) {
  'use strict';
  if (!Mozert) throw new Error('Mozert.Swiper needs Mozert loaded first');
  var isObj = function (v) { return v && typeof v === 'object' && !Array.isArray(v) && !v.nodeType; };
  var node = function (v, scope) { return !v ? null : typeof v === 'string' ? (scope && scope.querySelector(v)) || document.querySelector(v) : v; };
  var obj = function (v, d) { return isObj(v) ? v : (v ? d || {} : null); };

  /** Swiper options -> Mozert options (one level; used for the base and for every breakpoint). */
  function mapOptions(p, ctx) {
    var o = {};
    if (p.slidesPerView !== undefined) { if (p.slidesPerView === 'auto') o.variableWidth = true; else { o.slidesToShow = p.slidesPerView; o.variableWidth = false; } }
    if (p.slidesPerGroup !== undefined) o.slidesToScroll = p.slidesPerGroup;
    if (p.spaceBetween !== undefined) o.spaceBetween = parseFloat(p.spaceBetween) || 0;
    if (p.loop !== undefined) o.infinite = !!p.loop;
    if (p.speed !== undefined) o.speed = p.speed;
    if (p.initialSlide !== undefined) o.initialSlide = p.initialSlide;
    if (p.direction) o.vertical = p.direction === 'vertical';
    if (p.centeredSlides !== undefined) { o.centerMode = !!p.centeredSlides; o.centerPadding = '0px'; }
    if (p.autoHeight !== undefined) o.adaptiveHeight = !!p.autoHeight;
    if (p.allowTouchMove !== undefined) { o.draggable = !!p.allowTouchMove; o.touchMove = !!p.allowTouchMove; }
    if (p.touchRatio !== undefined) o.touchRatio = p.touchRatio;
    if (p.threshold !== undefined) o.dragThreshold = Math.max(p.threshold, 1);
    if (p.slidesOffsetBefore !== undefined) o.edgePadding = p.slidesOffsetBefore;
    if (p.a11y !== undefined) o.accessibility = p.a11y !== false;
    if (p.effect) {
      o.effect = p.effect;
      ['coverflow', 'cube', 'flip', 'cards', 'creative'].forEach(function (k) { if (p[k + 'Effect']) o[k + 'Effect'] = p[k + 'Effect']; });
    }
    if (p.autoplay) {
      var a = obj(p.autoplay, {});
      o.autoplay = true;
      o.autoplaySpeed = a.delay !== undefined ? a.delay : 3000;
      o.pauseOnHover = !!a.pauseOnMouseEnter;
      o.disableOnInteraction = a.disableOnInteraction !== false;
      o.autoplayReverse = !!a.reverseDirection;
      o.stopOnLastSlide = !!a.stopOnLastSlide;
    } else if (p.autoplay === false) o.autoplay = false;
    if (p.freeMode) o.freeMode = p.freeMode;
    if (p.mousewheel) o.mousewheel = p.mousewheel;
    if (p.keyboard) o.globalKeyboard = obj(p.keyboard, {}).enabled === false ? false : p.keyboard;
    if (p.zoom) { var z = obj(p.zoom, {}); o.zoom = { max: z.maxRatio || 3, min: z.minRatio || 1, toggle: z.toggle !== false }; }
    if (p.parallax) o.parallax = true;
    if (p.virtual) o.virtual = p.virtual;
    if (p.hashNavigation) o.hashNavigation = p.hashNavigation;
    if (p.grid && p.grid.rows > 1) { o.rows = p.grid.rows; o.slidesPerRow = 1; }
    if (p.scrollbar) { var sb = obj(p.scrollbar, {}); o.scrollbar = { el: node(sb.el, ctx.el), draggable: !!sb.draggable, hide: !!sb.hide }; }
    if (p.pagination) {
      var pg = obj(p.pagination, {});
      o.pagination = { el: node(pg.el, ctx.el), type: pg.dynamicBullets && (!pg.type || pg.type === 'bullets') ? 'dynamic' : pg.type || 'bullets', clickable: pg.clickable !== false, renderBullet: pg.renderBullet, renderFraction: pg.renderFraction, renderCustom: pg.renderCustom, progressbarOpposite: !!pg.progressbarOpposite, dynamicMainBullets: pg.dynamicMainBullets || 1 };
    }
    return o;
  }

  var EV = { slideChange: 'beforeChange', slideChangeTransitionStart: 'beforeChange', slideChangeTransitionEnd: 'afterChange', transitionEnd: 'afterChange', transitionStart: 'beforeChange', resize: 'setPosition', lazyImageReady: 'lazyLoaded', touchEnd: 'swipe', sliderMove: 'swipe' };
  var CLS = { 'mozert-slide': 'swiper-slide', 'mozert-current': 'swiper-slide-active', 'mozert-active': 'swiper-slide-visible', 'mozert-cloned': 'swiper-slide-duplicate', 'mozert-track': 'swiper-wrapper', 'mozert-vertical': 'swiper-vertical', 'mozert-bullet': 'swiper-pagination-bullet', 'mozert-bullet-active': 'swiper-pagination-bullet-active', 'mozert-pagination': 'swiper-pagination', 'mozert-pagination-bullets': 'swiper-pagination-bullets', 'mozert-pagination-fraction': 'swiper-pagination-fraction', 'mozert-pagination-progressbar': 'swiper-pagination-progressbar', 'mozert-pg-fill': 'swiper-pagination-progressbar-fill', 'mozert-pg-current': 'swiper-pagination-current', 'mozert-pg-total': 'swiper-pagination-total', 'mozert-scrollbar': 'swiper-scrollbar', 'mozert-scrollbar-drag': 'swiper-scrollbar-drag', 'mozert-initialized': 'swiper-initialized' };
  function mirror(n) {
    var l = n.classList; if (!l) return;
    Array.prototype.slice.call(l).forEach(function (c) { var m = CLS[c]; if (m && !l.contains(m)) l.add(m); });
  }
  function mirrorTree(r) { mirror(r); var a = r.querySelectorAll('[class*="mozert-"]'); for (var i = 0; i < a.length; i++) mirror(a[i]); }

  function Swiper(target, params) {
    if (!(this instanceof Swiper)) return new Swiper(target, params);
    var el = typeof target === 'string' ? document.querySelector(target) : target;
    if (!el) throw new Error('Swiper: container not found');
    if (el.swiper) return el.swiper;
    var p = this.params = Object.assign({ slidesPerView: 1, spaceBetween: 0, speed: 300, init: true }, params || {});
    this.el = el; el.swiper = this; this.destroyed = false; this._h = {}; this.allowSlideNext = true; this.allowSlidePrev = true;
    this.previousIndex = 0;
    if (p.init !== false) this.init();
  }
  var P = Swiper.prototype;

  P.init = function () {
    var self = this, p = this.params, el = this.el, i;
    this._fire('beforeInit');
    this._nextEl = node(p.navigation && p.navigation.nextEl, el); this._prevEl = node(p.navigation && p.navigation.prevEl, el);
    var o = mapOptions(p, this);
    o.arrows = !!p.navigation && !(this._nextEl || this._prevEl) ? true : false;
    o.dots = false;
    if (p.dir === 'rtl' || el.getAttribute('dir') === 'rtl' || p.rtl) o.rtl = true;
    if (p.breakpoints) {
      o.mobileFirst = true;
      o.responsive = Object.keys(p.breakpoints).map(Number).sort(function (a, b) { return a - b; }).map(function (bp) { return { breakpoint: bp, settings: mapOptions(p.breakpoints[bp], self) }; });
      // Swiper's breakpoint objects only override what they list; below the first breakpoint the top-level params apply.
    }
    if (p.thumbs && p.thumbs.swiper) o._thumbs = p.thumbs.swiper;
    if (p.controller && p.controller.control) o._control = p.controller.control;
    // Unwrap .swiper-wrapper > .swiper-slide into plain children; park helper elements (pagination, arrows...) until Mozert has built.
    var wrap = el.querySelector(':scope > .swiper-wrapper');
    this._parked = [];
    if (wrap) {
      Array.prototype.slice.call(el.children).forEach(function (c) { if (c !== wrap) { self._parked.push([c, c.nextSibling]); el.removeChild(c); } });
      var kids = Array.prototype.slice.call(wrap.children);
      el.removeChild(wrap);
      kids.forEach(function (k) { el.appendChild(k); });
    }
    this._cleanOpts = o;
    var m = this.mozert = new Mozert(el, Object.assign({}, o));
    // re-attach parked helpers (pagination, navigation, scrollbar elements)
    this._parked.forEach(function (pair) { el.appendChild(pair[0]); });
    // pagination/scrollbar modules ran inside Mozert's build; if the host was parked they must be (re)built now
    this._wireNav();
    this._wireEvents();
    // class mirroring
    if (typeof MutationObserver === 'function') {
      this._mo = new MutationObserver(function (recs) { recs.forEach(function (r) { if (r.type === 'attributes') mirror(r.target); else Array.prototype.forEach.call(r.addedNodes, function (n) { if (n.nodeType === 1) mirrorTree(n); }); }); });
      var obsRoots = [el]; if (o.pagination && o.pagination.el) obsRoots.push(o.pagination.el); if (o.scrollbar && o.scrollbar.el) obsRoots.push(o.scrollbar.el);
      obsRoots.forEach(function (r) { mirrorTree(r); self._mo.observe(r, { subtree: true, childList: true, attributes: true, attributeFilter: ['class'] }); });
    }
    ['beforeChange', 'afterChange', 'reInit'].forEach(function (e) { m.on(e, function () { self._neighbours(); }); });
    this._neighbours();
    // thumbs / controller via asNavFor-style syncing
    var other = (p.thumbs && p.thumbs.swiper) || (p.controller && p.controller.control);
    if (other) [].concat(other).forEach(function (t) { self._link(t); });
    if (p.thumbs && p.thumbs.swiper) this._thumbsSetup(p.thumbs.swiper, p.thumbs.slideThumbActiveClass || 'swiper-slide-thumb-active');
    this.mozert.on('beforeChange', function (s, old, real) { self.previousIndex = old; });
    this._fire('init'); this._fire('afterInit');
    return this;
  };

  P._wireNav = function () {
    var self = this, m = this.mozert, n = this._nextEl, pv = this._prevEl;
    this._navOff = [];
    var on = function (e, f) { if (e) { e.addEventListener('click', f); self._navOff.push(function () { e.removeEventListener('click', f); }); } };
    on(n, function (e) { e.preventDefault(); if (self.allowSlideNext) { m._user(); m.next(); } });
    on(pv, function (e) { e.preventDefault(); if (self.allowSlidePrev) { m._user(); m.prev(); } });
    var upd = function () {
      if (n) { n.classList.toggle('swiper-button-disabled', !m.s.infinite && self.isEnd); n.classList.add('swiper-button-next'); }
      if (pv) { pv.classList.toggle('swiper-button-disabled', !m.s.infinite && self.isBeginning); pv.classList.add('swiper-button-prev'); }
    };
    m.on('beforeChange', upd); m.on('afterChange', upd); m.on('reInit', upd); upd();
  };

  P._neighbours = function () {
    var m = this.mozert; if (!m || !m._units) return;
    var c = m.current, n = m._units.length;
    m._units.forEach(function (u, i) {
      u.classList.toggle('swiper-slide-next', n > 1 && i === (c + 1) % n);
      u.classList.toggle('swiper-slide-prev', n > 1 && i === (c - 1 + n) % n);
    });
  };

  P._wireEvents = function () {
    var self = this, on = this.params.on;
    if (on) Object.keys(on).forEach(function (k) { self.on(k, on[k]); });
    var m = this.mozert;
    m.on('afterChange', function () {
      if (self.isEnd) self._fire('reachEnd'); if (self.isBeginning) self._fire('reachBeginning'); self._fire('slideChangeTransitionEnd'); self._fire('transitionEnd');
    });
    m.on('beforeChange', function () { self._fire('slideChange'); self._fire('slideChangeTransitionStart'); self._fire('transitionStart'); });
    ['autoplayStart', 'autoplayStop', 'autoplayTimeLeft', 'zoomChange', 'breakpoint', 'setPosition', 'lazyLoaded', 'swipe'].forEach(function (k) {
      m.on(k, function () { var a = Array.prototype.slice.call(arguments, 1); var sw = k === 'setPosition' ? 'resize' : k === 'lazyLoaded' ? 'lazyImageReady' : k === 'swipe' ? 'sliderMove' : k; self._fire.apply(self, [sw].concat(a)); });
    });
    m.on('destroy', function () { self._fire('destroy'); });
  };

  P._link = function (other) {
    var self = this;
    other = other && other.mozert ? other : null; if (!other) return;
    var lock = false;
    var sync = function (a, b) { a.mozert.on('beforeChange', function (s, o, real) { if (lock) return; lock = true; b.slideTo(real); lock = false; }); };
    sync(self, other); sync(other, self);
  };
  P._thumbsSetup = function (t, cls) {
    var self = this;
    var mark = function () { (t.slides || []).forEach(function (s, i) { s.classList.toggle(cls, i === self.realIndex); }); };
    this.mozert.on('beforeChange', mark); mark();
    (t.slides || []).forEach(function (s, i) { s.addEventListener('click', function () { self.slideTo(i); }); });
  };

  /* ---- events (Swiper semantics: handler(swiper, ...args), `this` = swiper) ---- */
  P.on = function (n, f, prepend) { var a = this._h[n] = this._h[n] || []; if (prepend) a.unshift(f); else a.push(f); return this; };
  P.once = function (n, f) { var s = this; var w = function () { s.off(n, w); f.apply(s, arguments); }; w._o = f; return this.on(n, w); };
  P.off = function (n, f) { if (!n) this._h = {}; else if (!f) delete this._h[n]; else this._h[n] = (this._h[n] || []).filter(function (x) { return x !== f && x._o !== f; }); return this; };
  P.emit = function (n) { return this._fire.apply(this, arguments); };
  P._fire = function (n) { var a = Array.prototype.slice.call(arguments, 1), s = this; (this._h[n] || []).slice().forEach(function (f) { f.apply(s, [s].concat(a)); }); (this._h['*'] || []).slice().forEach(function (f) { f.apply(s, [n, s].concat(a)); }); return this; };

  /* ---- methods ---- */
  P.slideTo = function (i, speed, run) { var m = this.mozert; if (speed === 0) m.goTo(i, true); else m.goTo(i); return this; };
  P.slideToLoop = P.slideTo;
  P.slideNext = function (speed) { this.mozert.next(); return this; };
  P.slidePrev = function (speed) { this.mozert.prev(); return this; };
  P.slideReset = function () { this.mozert._snapBack(); return this; };
  P.update = P.updateSlides = P.updateSize = P.updateSlidesClasses = P.updateProgress = function () { this.mozert.refresh(); return this; };
  P.enable = function () { this.mozert.setOption('draggable', true); return this; };
  P.disable = function () { this.mozert.setOption('draggable', false); return this; };
  P.changeDirection = function (d) { this.mozert.setOption('vertical', d === 'vertical'); return this; };
  P.destroy = function (deleteInstance, clean) {
    if (this.destroyed) return;
    (this._navOff || []).forEach(function (f) { f(); });
    if (this._mo) this._mo.disconnect();
    this.mozert.destroy();
    this.destroyed = true; this._fire('destroy');
    if (deleteInstance !== false) delete this.el.swiper;
  };
  var toNode = function (h) { if (typeof h === 'string') { var d = document.createElement('div'); d.innerHTML = h.trim(); return d.firstElementChild || d; } return h; };
  P.appendSlide = function (s) { var m = this.mozert; [].concat(s).forEach(function (x) { m.add(toNode(x)); }); return this; };
  P.prependSlide = function (s) { var m = this.mozert; [].concat(s).reverse().forEach(function (x) { m.add(toNode(x), true); }); return this; };
  P.addSlide = function (i, s) { var m = this.mozert; if (i <= 0) return this.prependSlide(s); [].concat(s).forEach(function (x, k) { m.add(toNode(x), i - 1 + k); }); return this; };
  P.removeSlide = function (i) { var m = this.mozert; (Array.isArray(i) ? i.slice().sort(function (a, b) { return b - a; }) : [i]).forEach(function (k) { m.remove(k); }); return this; };
  P.removeAllSlides = function () { this.mozert.removeAll(); return this; };

  /* ---- properties ---- */
  var def = function (k, g) { Object.defineProperty(P, k, { get: g, configurable: true }); };
  def('activeIndex', function () { return this.mozert.currentSlide(); });
  def('realIndex', function () { return this.mozert.currentSlide(); });
  def('slides', function () { return this.mozert._units.slice(); });
  def('wrapperEl', function () { return this.mozert.track; });
  def('isBeginning', function () { var m = this.mozert; return !m.s.infinite && m.current <= 0; });
  def('isEnd', function () { var m = this.mozert; return !m.s.infinite && m.current >= m.maxIndex; });
  def('width', function () { return this.mozert.list.clientWidth; });
  def('height', function () { return this.mozert.list.clientHeight; });
  def('translate', function () { return this.mozert._cur; });
  def('progress', function () { var m = this.mozert; return m.maxIndex ? Math.max(0, Math.min(1, m._pvFromT(m._cur) / m.maxIndex)) : 0; });
  def('autoplay', function () { var m = this.mozert; return { running: m.isPlaying(), start: function () { m.play(); return true; }, stop: function () { m.pause(); return true; }, pause: function () { m.pause(); }, resume: function () { m.play(); } }; });
  def('zoom', function () { var z = this.mozert.zoom; return z ? { in: z.in, out: z.out, toggle: z.toggle, scale: z.scale } : undefined; });
  def('virtual', function () { return this.mozert.virtual; });

  Swiper.use = function () { return Swiper; };      // modules are built in, kept so `Swiper.use([Navigation, Pagination])` code runs
  Swiper.defaults = {};
  Swiper.version = Mozert.version;
  Swiper.default = Swiper;
  Mozert.Swiper = Swiper;
  if (typeof window !== 'undefined' && !window.Swiper) window.Swiper = Swiper;
  return Swiper;
}));
