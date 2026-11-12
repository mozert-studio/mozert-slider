/* ---- Mozert modules: effects, parallax, zoom, virtual, hash, scrollbar, pagination, free mode, mousewheel, marquee, video, fullscreen.
 * This file is a fragment: it runs inside the Mozert closure (see scripts/build.mjs) and uses `Mozert`. */
(function () {
  const clampN = (v, a, b) => Math.min(b, Math.max(a, v));
  const num = (v, d) => (v === undefined || v === null || isNaN(parseFloat(v)) ? d : parseFloat(v));
  const objOpt = (v, d) => Object.assign({}, d, v && typeof v === 'object' ? v : {});
  const mk = (tag, cls, html) => {
    const e = document.createElement(tag);
    if (cls) e.className = cls;
    if (html != null) e.innerHTML = html;
    return e;
  };
  /** Signed distance (in slides) of slide i from visual position pv; wraps for loops. */
  const relOf = (i, pv, n, loop) => {
    let r = i - pv;
    if (loop) r = ((((r + n / 2) % n) + n) % n) - n / 2;
    return r;
  };
  const pct = (v, size) => (typeof v === 'string' && v.indexOf('%') > -1 ? (parseFloat(v) / 100) * size : parseFloat(v) || 0);

  /* ------------------------------------------------------------ effects */
  const FX = ['coverflow', 'cube', 'flip', 'cards', 'creative', 'expand'];
  Mozert.use({
    name: 'effects',
    defaults: {
      coverflowEffect: { rotate: 45, depth: 120, scale: 1, stretch: 0, modifier: 1, lift: 0, fade: 0, shadow: true },
      expandEffect: { extra: 1.4 },
      cubeEffect: { shadow: true, slideShadows: true, perspective: 1200 },
      flipEffect: { perspective: 1400, limitRotation: true },
      cardsEffect: { perSlideOffset: 10, perSlideRotate: 2, rotate: true, visible: 4 },
      creativeEffect: {
        limitProgress: 1,
        prev: { translate: ['-120%', 0, -300], rotate: [0, 0, 0], opacity: 0, scale: 1 },
        next: { translate: ['120%', 0, 0], rotate: [0, 0, 0], opacity: 0, scale: 1 },
      },
    },
    create(sl) {
      const s = sl.s;
      const fx = s.effect;
      if (FX.indexOf(fx) < 0) return null;
      const o = objOpt(s[fx + 'Effect'], Mozert.defaults[fx + 'Effect']);
      const stacked = s.stacked;
      const n = sl.n;
      const list = sl.list;
      const prevR = [];
      const persp = fx === 'coverflow' ? 1200 : o.perspective || 1200;
      list.style.perspective = persp + 'px';
      sl.track.style.transformStyle = 'preserve-3d';

      const slides = () => (stacked ? sl._units : sl.dom);
      const place = (e, tr, op, z, animate, speed, jump) => {
        e.style.transition = animate && !jump ? 'transform ' + speed + 'ms ' + s.cssEase + ', opacity ' + speed + 'ms ' + s.cssEase : 'none';
        e.style.transform = tr;
        e.style.opacity = op;
        e.style.zIndex = z;
        e.style.pointerEvents = op > 0.5 && z >= 0 ? '' : 'none';
        e.style.backfaceVisibility = fx === 'flip' || fx === 'cube' ? 'hidden' : '';
      };

      const apply = (pv, animate, speed) => {
        const W = sl.slideSize || sl.list.clientWidth;
        const items = slides();
        const loop = stacked ? true : false;
        for (let k = 0; k < items.length; k++) {
          const i = stacked ? k : k - sl.cloneCount;
          const r = relOf(i, pv, n, loop);
          const jump = prevR[k] !== undefined && Math.abs(r - prevR[k]) > 1.5;
          prevR[k] = r;
          const e = items[k];
          const a = Math.abs(r);
          let tr = '';
          let op = 1;
          let z = Math.round(1000 - a * 10);
          if (fx === 'coverflow') {
            const rot = clampN(-r, -3, 3) * o.rotate * o.modifier;
            const tz = -a * o.depth;
            const sc = 1 - Math.min(a, 3) * (1 - o.scale) * 0.5;
            tr = 'translate3d(' + -r * o.stretch + 'px,' + -Math.min(a, 3) * o.lift + 'px,' + tz + 'px) rotateY(' + rot + 'deg) scale(' + sc + ')';
            op = a > 4 ? 0 : Math.max(0, 1 - Math.min(a, 4) * o.fade);
          } else if (fx === 'expand') {
            // The active card grows wider, its neighbours slide out of the way.
            // Both follow the same linear rule, so dragging stays continuous.
            const m = Math.min(1, a);
            const w0 = e.offsetWidth;
            const grow = o.extra * w0 * (1 - m);
            tr = 'translate3d(' + (r < 0 ? -1 : 1) * ((o.extra * w0) / 2) * m + 'px,0,0)';
            const card = e.firstElementChild;
            if (card) {
              card.style.transition = animate && !jump ? 'width ' + speed + 'ms ' + s.cssEase + ', margin-left ' + speed + 'ms ' + s.cssEase : 'none';
              card.style.width = w0 + grow + 'px';
              card.style.marginLeft = -grow / 2 + 'px';
              card.style.maxWidth = 'none';
            }
          } else if (fx === 'cube') {
            tr = 'translate3d(0,0,' + -W / 2 + 'px) rotateY(' + r * 90 + 'deg) translate3d(0,0,' + W / 2 + 'px)';
            op = a <= 1.01 ? 1 : 0;
          } else if (fx === 'flip') {
            const rr = o.limitRotation ? clampN(r, -1, 1) : r;
            tr = 'rotateY(' + rr * -180 + 'deg)';
            op = a < 1 ? 1 : 0;
            z = Math.round(1000 - a * 100);
          } else if (fx === 'cards') {
            const vis = o.visible;
            if (r < 0) {
              const t = Math.max(r, -1);
              tr = 'translate3d(' + t * 105 + '%,0,0)' + (o.rotate ? ' rotate(' + t * 12 + 'deg)' : '');
              op = 1 + t * 0.3;
              z = 2000;
            } else {
              tr = 'translate3d(0,' + r * -o.perSlideOffset + 'px,' + -r * 40 + 'px) scale(' + (1 - r * 0.05) + ')' + (o.rotate ? ' rotate(' + r * o.perSlideRotate * (i % 2 ? 1 : -1) + 'deg)' : '');
              op = r > vis ? 0 : 1;
              z = Math.round(1000 - r * 10);
            }
          } else {
            const lim = o.limitProgress;
            const p = clampN(r, -lim, lim);
            const d = p < 0 ? o.prev : o.next;
            const m = Math.abs(p);
            const t = d.translate || [0, 0, 0];
            const rt = d.rotate || [0, 0, 0];
            tr =
              'translate3d(' + pct(t[0], W) * m + 'px,' + pct(t[1], sl.list.clientHeight) * m + 'px,' + (parseFloat(t[2]) || 0) * m + 'px) rotateX(' + (rt[0] || 0) * m + 'deg) rotateY(' + (rt[1] || 0) * m + 'deg) rotateZ(' + (rt[2] || 0) * m + 'deg) scale(' + (1 + ((d.scale === undefined ? 1 : d.scale) - 1) * m) + ')';
            op = 1 + ((d.opacity === undefined ? 1 : d.opacity) - 1) * m;
            if (a > lim + 0.01) op = d.opacity === undefined ? 1 : d.opacity;
            z = d.zIndex !== undefined && p !== 0 ? d.zIndex : Math.round(1000 - a * 10);
          }
          place(e, tr, op, z, animate, speed, jump);
        }
      };
      sl._onFx(apply);
      sl.el.classList.add('mozert-fx-' + fx);
      sl._paintCurrent(false);
      return {
        destroy() {
          list.style.perspective = '';
          sl.track.style.transformStyle = '';
          list.style.overflow = '';
          sl.el.classList.remove('mozert-fx-' + fx);
          slides().forEach((e) => {
            if (fx === 'expand' && e.firstElementChild) e.firstElementChild.style.width = e.firstElementChild.style.marginLeft = e.firstElementChild.style.transition = e.firstElementChild.style.maxWidth = '';
            e.style.transform = e.style.opacity = e.style.zIndex = e.style.transition = e.style.pointerEvents = e.style.backfaceVisibility = '';
          });
        },
      };
    },
  });

  /* ----------------------------------------------------------- parallax */
  Mozert.use({
    name: 'parallax',
    defaults: { parallax: false },
    create(sl) {
      if (!sl.s.parallax) return null;
      const items = [];
      const stacked = sl.s.stacked;
      const slides = stacked ? sl._units : sl.dom;
      slides.forEach((slide, k) => {
        const els = [];
        if (slide.hasAttribute('data-parallax-x') || slide.hasAttribute('data-parallax-y')) els.push(slide);
        slide.querySelectorAll('[data-parallax-x],[data-parallax-y],[data-parallax-scale],[data-parallax-opacity]').forEach((e) => els.push(e));
        items.push(els);
      });
      const bg = sl.el.querySelector('[data-parallax-bg]');
      const apply = (pv, animate, speed) => {
        const W = sl.slideSize || sl.list.clientWidth;
        slides.forEach((slide, k) => {
          const i = stacked ? k : k - sl.cloneCount;
          const r = clampN(relOf(i, pv, sl.n, stacked), -2, 2);
          items[k].forEach((e) => {
            const x = e.getAttribute('data-parallax-x');
            const y = e.getAttribute('data-parallax-y');
            const sc = e.getAttribute('data-parallax-scale');
            const op = e.getAttribute('data-parallax-opacity');
            const tx = x ? pct(x, e === slide ? W : e.offsetWidth || W) * r : 0;
            const ty = y ? pct(y, e.offsetHeight || 100) * r : 0;
            e.style.transition = animate ? 'transform ' + speed + 'ms ' + sl.s.cssEase + ', opacity ' + speed + 'ms ' + sl.s.cssEase : 'none';
            e.style.transform = 'translate3d(' + tx + 'px,' + ty + 'px,0)' + (sc ? ' scale(' + (1 + (parseFloat(sc) - 1) * Math.abs(r)) + ')' : '');
            if (op !== null) e.style.opacity = 1 + (parseFloat(op) - 1) * Math.abs(r);
          });
        });
        if (bg) {
          const amt = parseFloat(bg.getAttribute('data-parallax-bg')) || 0.5;
          bg.style.transition = animate ? 'transform ' + speed + 'ms ' + sl.s.cssEase : 'none';
          bg.style.transform = 'translate3d(' + -pv * W * amt + 'px,0,0)';
        }
      };
      sl._onFx(apply);
      sl._paintCurrent(false);
      return {
        destroy() {
          items.forEach((l) => l.forEach((e) => (e.style.transform = e.style.opacity = e.style.transition = '')));
          if (bg) bg.style.transform = '';
        },
      };
    },
  });

  /* --------------------------------------------------------------- zoom */
  Mozert.use({
    name: 'zoom',
    defaults: { zoom: false },
    create(sl) {
      if (!sl.s.zoom) return null;
      const o = objOpt(sl.s.zoom, { max: 3, min: 1, toggle: true, step: 0.5 });
      let scale = 1;
      let tx = 0;
      let ty = 0;
      let target = null;
      const ptrs = new Map();
      let startDist = 0;
      let startScale = 1;
      let pan = null;
      const cur = () => sl._units[sl.current];
      const tgt = () => {
        const u = cur();
        return u ? u.querySelector('.mozert-zoom-target') || u.querySelector('img,picture,canvas,video') : null;
      };
      const paint = (animate) => {
        if (!target) return;
        target.style.transition = animate ? 'transform .25s ease' : 'none';
        target.style.transform = scale === 1 && !tx && !ty ? '' : 'translate3d(' + tx + 'px,' + ty + 'px,0) scale(' + scale + ')';
        target.style.transformOrigin = '50% 50%';
        target.style.cursor = scale > 1 ? 'grab' : '';
        sl._lockDrag = scale > 1;
        sl.el.classList.toggle('mozert-zoomed', scale > 1);
      };
      const bound = () => {
        if (!target) return;
        const mx = (target.offsetWidth * (scale - 1)) / 2;
        const my = (target.offsetHeight * (scale - 1)) / 2;
        tx = clampN(tx, -mx, mx);
        ty = clampN(ty, -my, my);
      };
      const reset = (animate) => {
        if (scale === 1 && !tx && !ty) {
          target = tgt();
          return;
        }
        scale = 1;
        tx = ty = 0;
        paint(animate);
        target = tgt();
      };
      const setScale = (v, animate) => {
        target = tgt();
        if (!target) return;
        scale = clampN(v, o.min, o.max);
        if (scale === 1) tx = ty = 0;
        bound();
        paint(animate);
        sl.emit('zoomChange', scale);
      };
      sl.zoom = {
        in: () => setScale(scale + o.step, true),
        out: () => setScale(scale - o.step, true),
        toggle: () => setScale(scale > 1 ? 1 : o.max, true),
        reset: () => reset(true),
        get scale() {
          return scale;
        },
      };
      const onDbl = (e) => {
        if (!o.toggle || !e.target.closest || !cur() || !cur().contains(e.target)) return;
        e.preventDefault();
        sl.zoom.toggle();
      };
      const onDown = (e) => {
        if (!cur() || !cur().contains(e.target)) return;
        ptrs.set(e.pointerId, { x: e.clientX, y: e.clientY });
        if (ptrs.size === 2) {
          const [a, b] = Array.from(ptrs.values());
          startDist = Math.hypot(a.x - b.x, a.y - b.y);
          startScale = scale;
          sl._lockDrag = true;
        } else if (scale > 1) pan = { x: e.clientX, y: e.clientY, tx, ty };
      };
      const onMove = (e) => {
        if (!ptrs.has(e.pointerId)) return;
        ptrs.set(e.pointerId, { x: e.clientX, y: e.clientY });
        if (ptrs.size === 2 && startDist) {
          const [a, b] = Array.from(ptrs.values());
          setScale((startScale * Math.hypot(a.x - b.x, a.y - b.y)) / startDist, false);
        } else if (pan && scale > 1) {
          tx = pan.tx + (e.clientX - pan.x);
          ty = pan.ty + (e.clientY - pan.y);
          bound();
          paint(false);
        }
      };
      const onUp = (e) => {
        ptrs.delete(e.pointerId);
        if (ptrs.size < 2) startDist = 0;
        if (!ptrs.size) pan = null;
        if (scale <= 1.001) {
          scale = 1;
          tx = ty = 0;
          paint(true);
        }
      };
      const onWheel = (e) => {
        if (!e.ctrlKey || !cur() || !cur().contains(e.target)) return;
        e.preventDefault();
        setScale(scale - e.deltaY * 0.01, false);
      };
      sl._on(sl.list, 'dblclick', onDbl);
      sl._on(sl.list, 'pointerdown', onDown);
      sl._on(window, 'pointermove', onMove);
      sl._on(window, 'pointerup', onUp);
      sl._on(window, 'pointercancel', onUp);
      sl._on(sl.list, 'wheel', onWheel, { passive: false });
      sl._sub('beforeChange', () => reset(false));
      target = tgt();
      return {
        destroy() {
          reset(false);
          sl._lockDrag = false;
          delete sl.zoom;
        },
      };
    },
  });

  /* ------------------------------------------------------------ virtual */
  Mozert._boot.push((el, o) => {
    const v = o.virtual;
    if (!v || !v.slides || el.children.length) return;
    v.slides.forEach((d, i) => {
      const sh = mk('div', 'mozert-v');
      sh.setAttribute('data-vi', i);
      el.appendChild(sh);
    });
  });
  Mozert.use({
    name: 'virtual',
    defaults: { virtual: false },
    create(sl) {
      const v = sl.s.virtual;
      if (!v || !v.slides) return null;
      const before = num(v.addSlidesBefore, 2);
      const after = num(v.addSlidesAfter, 2);
      const store = v.slides;
      const hostOf = (u) => (u.classList.contains('mozert-v') ? u : u.querySelector('.mozert-v') || u);
      const make = (i) => {
        const d = store[i];
        const html = typeof v.renderSlide === 'function' ? v.renderSlide(d, i) : d;
        return html;
      };
      const render = () => {
        const a = Math.max(0, sl.current - before);
        const b = Math.min(sl.n - 1, sl.current + sl._showC - 1 + after);
        const added = [];
        sl._units.forEach((u, i) => {
          const h = hostOf(u);
          const inWin = i >= a && i <= b;
          if (inWin && !h.hasAttribute('data-vr')) {
            const c = make(i);
            if (typeof c === 'string') h.innerHTML = c;
            else if (c && c.nodeType) {
              h.innerHTML = '';
              h.appendChild(c);
            }
            h.setAttribute('data-vr', '1');
            added.push(i);
          } else if (!inWin && h.hasAttribute('data-vr') && v.cache === false) {
            h.innerHTML = '';
            h.removeAttribute('data-vr');
          }
        });
        if (added.length) {
          sl._arrowY();
          sl._lazy();
          sl.emit('virtualRender', added);
        }
      };
      sl._sub('beforeChange', (_s, old, real) => {
        sl.current = real;
        render();
      });
      render();
      sl.virtual = {
        slides: store,
        appendSlide(d) {
          store.push(d);
          sl.add(mk('div', 'mozert-v'));
          return sl;
        },
        prependSlide(d) {
          store.unshift(d);
          sl.add(mk('div', 'mozert-v'), true);
          return sl;
        },
        removeSlide(i) {
          store.splice(i, 1);
          sl.remove(i);
          return sl;
        },
        update() {
          sl._units.forEach((u) => {
            const h = hostOf(u);
            h.innerHTML = '';
            h.removeAttribute('data-vr');
          });
          render();
        },
      };
      return {
        destroy() {
          delete sl.virtual;
        },
      };
    },
  });

  /* ----------------------------------------------------- hash navigation */
  Mozert.use({
    name: 'hash',
    defaults: { hashNavigation: false },
    create(sl) {
      const h = sl.s.hashNavigation;
      if (!h || typeof window === 'undefined') return null;
      const o = objOpt(h, { watchState: true, replaceState: true, prefix: '' });
      const hashes = sl._units.map((u, i) => (u.getAttribute('data-hash') || (u.firstElementChild && u.firstElementChild.getAttribute('data-hash')) || String(i + 1)));
      const read = () => decodeURIComponent((window.location.hash || '').replace(/^#/, '').replace(o.prefix, ''));
      const go = (anim) => {
        const i = hashes.indexOf(read());
        if (i > -1 && i !== sl.current) sl.goTo(i, !anim);
      };
      go(false);
      sl._sub('afterChange', () => {
        const val = o.prefix + hashes[sl.current];
        try {
          if (o.replaceState && window.history && window.history.replaceState) window.history.replaceState(null, '', '#' + val);
          else window.location.hash = val;
        } catch (e) {}
      });
      if (o.watchState) sl._on(window, 'hashchange', () => go(true));
      return null;
    },
  });

  /* ---------------------------------------------------------- scrollbar */
  Mozert.use({
    name: 'scrollbar',
    defaults: { scrollbar: false },
    create(sl) {
      const c = sl.s.scrollbar;
      if (!c || !sl.canNav) return null;
      const o = objOpt(c, { draggable: true, hide: false, el: null });
      const host = o.el ? (typeof o.el === 'string' ? document.querySelector(o.el) : o.el) : null;
      const bar = host || mk('div', 'mozert-scrollbar');
      const thumb = mk('div', 'mozert-scrollbar-drag');
      bar.classList.add('mozert-scrollbar');
      bar.appendChild(thumb);
      if (!host) sl.el.appendChild(bar);
      const show = () => Math.min(sl.n, sl._show);
      const apply = (pv) => {
        const max = Math.max(0.0001, sl.n - show());
        const frac = sl.s.stacked ? (pv - 0) / Math.max(1, sl.n - 1) : clampN(pv / max, 0, 1);
        const tw = sl.s.stacked ? 100 / sl.n : (show() / sl.n) * 100;
        thumb.style.width = tw + '%';
        thumb.style.left = clampN(frac, 0, 1) * (100 - tw) + '%';
      };
      sl._onFx(apply);
      sl._paintCurrent(false);
      let hideT;
      if (o.hide) {
        bar.classList.add('mozert-scrollbar-hide');
        sl._sub('beforeChange', () => {
          bar.classList.add('mozert-scrollbar-show');
          clearTimeout(hideT);
          hideT = setTimeout(() => bar.classList.remove('mozert-scrollbar-show'), 1200);
        });
      }
      if (o.draggable) {
        let drag = false;
        const move = (e) => {
          const r = bar.getBoundingClientRect();
          const f = clampN((e.clientX - r.left) / (r.width || 1), 0, 1);
          const idx = Math.round(f * (sl.s.stacked ? sl.n - 1 : sl.maxIndex));
          sl.goTo(idx);
        };
        const down = (e) => {
          drag = true;
          move(e);
          e.preventDefault();
        };
        sl._on(bar, 'pointerdown', down);
        sl._on(window, 'pointermove', (e) => drag && move(e));
        sl._on(window, 'pointerup', () => (drag = false));
      }
      return {
        destroy() {
          clearTimeout(hideT);
          if (host) {
            if (thumb.parentNode) thumb.parentNode.removeChild(thumb);
          } else if (bar.parentNode) bar.parentNode.removeChild(bar);
        },
      };
    },
  });

  /* --------------------------------------------------------- pagination */
  Mozert.use({
    name: 'pagination',
    defaults: { pagination: false },
    create(sl) {
      const c = sl.s.pagination;
      if (!c || !sl.canNav) return null;
      const o = objOpt(c, { type: 'bullets', el: null, clickable: true, dynamicMainBullets: 1, progressbarOpposite: false, hideOnClick: false });
      const host = o.el ? (typeof o.el === 'string' ? document.querySelector(o.el) : o.el) : null;
      const root = host || mk('div');
      root.classList.add('mozert-pagination', 'mozert-pagination-' + o.type);
      if (!host) sl.el.appendChild(root);
      const total = sl.n;
      const cur = () => sl.current;
      let bullets = [];
      let fill = null;
      const buildBullets = () => {
        root.innerHTML = '';
        bullets = [];
        for (let i = 0; i < total; i++) {
          let b;
          if (typeof o.renderBullet === 'function') {
            const html = o.renderBullet(i, 'mozert-bullet');
            const t = mk('div', null, String(html).trim());
            b = t.firstElementChild || mk('span', 'mozert-bullet');
          } else b = mk('button', 'mozert-bullet');
          if (b.tagName === 'BUTTON') {
            b.type = 'button';
            b.setAttribute('aria-label', sl._label('goTo', { n: i + 1 }));
          }
          if (o.clickable) {
            b.addEventListener('click', (e) => {
              e.preventDefault();
              sl._user();
              sl.goTo(i);
            });
          }
          root.appendChild(b);
          bullets.push(b);
        }
      };
      const update = () => {
        const i = cur();
        if (o.type === 'bullets' || o.type === 'dynamic') {
          const m = o.dynamicMainBullets;
          bullets.forEach((b, k) => {
            b.classList.toggle('mozert-bullet-active', k === i);
            if (o.type === 'dynamic') {
              const d = Math.abs(k - i);
              b.classList.toggle('mozert-bullet-active-main', d <= (m - 1) / 2 || k === i);
              b.classList.toggle('mozert-bullet-near', d === 1 || d === 2);
              b.classList.toggle('mozert-bullet-far', d === 3 || d === 4);
              b.classList.toggle('mozert-bullet-hidden', d > 4 + (m - 1));
            }
          });
        } else if (o.type === 'fraction') {
          const cs = '<span class="mozert-pg-current">' + (i + 1) + '</span>';
          const ts = '<span class="mozert-pg-total">' + total + '</span>';
          root.innerHTML = typeof o.renderFraction === 'function' ? o.renderFraction('mozert-pg-current', 'mozert-pg-total', i + 1, total) : cs + ' / ' + ts;
        } else if (o.type === 'custom' && typeof o.renderCustom === 'function') {
          root.innerHTML = o.renderCustom(sl, i + 1, total);
        }
      };
      if (o.type === 'bullets' || o.type === 'dynamic') buildBullets();
      else if (o.type === 'progressbar') {
        fill = mk('span', 'mozert-pg-fill');
        root.appendChild(fill);
        if (o.progressbarOpposite) root.classList.add('mozert-pg-opposite');
        sl._onFx((pv) => {
          const p = sl.s.stacked ? (relOf(0, -pv, total, false) + 1) / total : clampN((pv + Math.min(sl._show, total)) / total, 0, 1);
          fill.style.transform = 'scaleX(' + clampN(sl.s.stacked ? (pv + 1) / total : p, 0, 1) + ')';
        });
        sl._paintCurrent(false);
      }
      update();
      sl._sub('beforeChange', (_s, old, real) => {
        sl.current = real;
        update();
      });
      sl._sub('afterChange', update);
      return {
        destroy() {
          if (host) root.innerHTML = '';
          else if (root.parentNode) root.parentNode.removeChild(root);
          root.classList.remove('mozert-pagination', 'mozert-pagination-' + o.type);
        },
      };
    },
  });

  /* ---------------------------------------------------- free mode + wheel */
  const bounds = (sl) => [sl._pos(sl.maxIndex), sl._pos(0)]; // [min, max]
  const syncCurrent = (sl) => {
    const s = sl.s;
    if (s.stacked) return;
    const pv = sl._pvFromT(sl._cur);
    const idx = clampN(Math.round(pv), 0, sl.maxIndex);
    if (idx !== sl.current) {
      const old = sl.current;
      sl.emit('beforeChange', old, idx);
      sl.current = idx;
      sl._logical = idx;
      sl._updateNav();
      sl._updateSlideClasses(idx);
      sl._lazy();
      sl.emit('afterChange', idx);
    }
  };
  Mozert.use({
    name: 'freeMode',
    defaults: { freeMode: false },
    create(sl) {
      const s = sl.s;
      if (!s.freeMode || s.stacked) return null;
      const o = objOpt(s.freeMode, { momentum: true, momentumRatio: 1, momentumBounce: true, sticky: false, minimumVelocity: 0.02 });
      let timer;
      sl.el.classList.add('mozert-free');
      sl._release = (st, size, axis) => {
        const sm = st.samples;
        let v = 0;
        if (sm.length > 1) {
          const a = sm[0];
          const b = sm[sm.length - 1];
          v = (b.v - a.v) / Math.max(1, b.t - a.t);
        }
        if (performance.now() - (sm.length ? sm[sm.length - 1].t : 0) > 120) v = 0;
        const [mn, mx] = bounds(sl);
        const cur = sl._cur;
        let dist = o.momentum && Math.abs(v) > o.minimumVelocity ? v * 350 * o.momentumRatio : 0;
        let target = clampN(cur + dist, mn, mx);
        const dur = clampN(Math.abs(target - cur) * 2.2 + 250, 250, 1400);
        sl._setPos(target, true, { duration: dur, ease: 'cubic-bezier(.17,.67,.35,1)' });
        clearTimeout(timer);
        timer = setTimeout(() => {
          if (o.sticky) {
            const idx = clampN(Math.round(sl._pvFromT(sl._cur)), 0, sl.maxIndex);
            sl._setPos(sl._pos(idx), true);
          }
          syncCurrent(sl);
        }, dur + 20);
        sl.emit('freeModeEnd', target);
        return true;
      };
      return {
        destroy() {
          clearTimeout(timer);
          sl.el.classList.remove('mozert-free');
        },
      };
    },
  });

  Mozert.use({
    name: 'mousewheel',
    defaults: { mousewheel: false },
    create(sl) {
      const c = sl.s.mousewheel;
      if (!c) return null;
      const o = objOpt(c, { sensitivity: 1, forceToAxis: false, releaseOnEdges: true, thresholdDelta: 4, thresholdTime: 450 });
      let last = 0;
      let timer;
      const free = !!sl.s.freeMode && !sl.s.stacked;
      const on = (e) => {
        if (!sl.canNav || !sl.active) return;
        let d = sl.s.vertical ? e.deltaY : o.forceToAxis ? e.deltaX : Math.abs(e.deltaX) > Math.abs(e.deltaY) ? e.deltaX : e.deltaY;
        if (e.shiftKey && !sl.s.vertical) d = e.deltaY || e.deltaX;
        if (!d) return;
        if (d > 0 === (sl.s.rtl && !sl.s.vertical)) d = d; // direction handled below
        const edgeFwd = d > 0 && sl.current >= (sl.s.infinite || sl.s.stacked ? Infinity : sl.maxIndex) && (!free || sl._cur <= bounds(sl)[0] + 1);
        const edgeBack = d < 0 && sl.current <= (sl.s.infinite || sl.s.stacked ? -Infinity : 0) && (!free || sl._cur >= bounds(sl)[1] - 1);
        if (o.releaseOnEdges && (edgeFwd || edgeBack)) return;
        e.preventDefault();
        sl._user();
        if (free) {
          const [mn, mx] = bounds(sl);
          const dir = sl.s.rtl && !sl.s.vertical ? 1 : -1;
          sl._setPos(clampN(sl._cur + dir * d * o.sensitivity, mn, mx), false);
          clearTimeout(timer);
          timer = setTimeout(() => syncCurrent(sl), 120);
          return;
        }
        const now = performance.now();
        if (Math.abs(d) < o.thresholdDelta && now - last < o.thresholdTime) return;
        if (now - last < o.thresholdTime) return;
        last = now;
        if (d > 0) sl.next();
        else sl.prev();
      };
      sl._on(sl.el, 'wheel', on, { passive: false });
      return {
        destroy() {
          clearTimeout(timer);
        },
      };
    },
  });

  /* ---------------------------------------------------------- keyboard */
  Mozert.use({
    name: 'globalKeyboard',
    defaults: { globalKeyboard: false },
    create(sl) {
      const c = sl.s.globalKeyboard;
      if (!c) return null;
      const o = objOpt(c, { onlyInViewport: true });
      sl._on(document, 'keydown', (e) => {
        if (e.defaultPrevented || e.altKey || e.ctrlKey || e.metaKey) return;
        const t = e.target;
        if (t && (/^(input|textarea|select)$/i.test(t.tagName) || t.isContentEditable)) return;
        if (o.onlyInViewport) {
          const r = sl.el.getBoundingClientRect();
          const vh = window.innerHeight || document.documentElement.clientHeight;
          if (r.bottom < 0 || r.top > vh) return;
        }
        const v = sl.s.vertical;
        const k = e.key;
        const rtl = sl.s.rtl && !v;
        if ((!v && (k === 'ArrowLeft' || k === 'ArrowRight')) || (v && (k === 'ArrowUp' || k === 'ArrowDown'))) {
          const fwd = k === 'ArrowRight' || k === 'ArrowDown';
          sl._user();
          if (fwd !== rtl) sl.next();
          else sl.prev();
          e.preventDefault();
        }
      });
      return null;
    },
  });

  /* ------------------------------------------------------------ marquee */
  Mozert.use({
    name: 'marquee',
    defaults: { marquee: false },
    create(sl) {
      const c = sl.s.marquee;
      if (!c || !sl.canNav) return null;
      const o = objOpt(c, { speed: 60, pauseOnHover: true, direction: 'left' });
      if (typeof window.matchMedia === 'function' && window.matchMedia('(prefers-reduced-motion: reduce)').matches && sl.s.respectReducedMotion) return null;
      const pitch = sl.slideSize + sl.s.spaceBetween;
      const setLen = pitch * sl.n;
      const base = sl._pos(0);
      let off = 0;
      let last = 0;
      let raf = 0;
      let hold = false;
      sl._lockDrag = true;
      sl.track.style.transition = 'none';
      const dir = (o.direction === 'right' ? -1 : 1) * (sl.s.rtl ? -1 : 1);
      const loop = (t) => {
        if (!last) last = t;
        const dt = Math.min(64, t - last);
        last = t;
        if (!hold) {
          off += (o.speed * dt) / 1000;
          const m = ((off % setLen) + setLen) % setLen;
          const v = o.direction === 'right' ? base - setLen + m : base - m;
          sl._paint(sl.s.rtl ? -v : v);
          sl._t = sl._cur;
        }
        raf = requestAnimationFrame(loop);
      };
      raf = requestAnimationFrame(loop);
      if (o.pauseOnHover) {
        sl._on(sl.el, 'mouseenter', () => (hold = true));
        sl._on(sl.el, 'mouseleave', () => {
          hold = false;
          last = 0;
        });
      }
      sl.marquee = {
        pause: () => (hold = true),
        resume: () => {
          hold = false;
          last = 0;
        },
      };
      return {
        destroy() {
          cancelAnimationFrame(raf);
          sl._lockDrag = false;
          delete sl.marquee;
        },
      };
    },
  });

  /* -------------------------------------------------------------- video */
  Mozert.use({
    name: 'video',
    defaults: { videoAutoplay: false },
    create(sl) {
      const c = sl.s.videoAutoplay;
      if (!c) return null;
      const o = objOpt(c, { wait: false, pauseOthers: true, rewind: true });
      const vids = (u) => Array.from(u.querySelectorAll('video'));
      const ended = () => sl._holdOff('video');
      const sync = () => {
        sl._units.forEach((u, i) => {
          vids(u).forEach((v) => {
            if (i === sl.current) {
              try {
                const p = v.play();
                if (p && p.catch) p.catch(() => {});
              } catch (e) {}
              if (o.wait) {
                sl._holdOn('video');
                v.addEventListener('ended', ended, { once: true });
              }
            } else if (o.pauseOthers) {
              try {
                v.pause();
                if (o.rewind) v.currentTime = 0;
              } catch (e) {}
            }
          });
        });
        if (o.wait && !vids(sl._units[sl.current] || document.createElement('i')).length) sl._holdOff('video');
      };
      sl._sub('afterChange', sync);
      sync();
      return {
        destroy() {
          sl._holdOff('video');
        },
      };
    },
  });

  /* --------------------------------------------------------- fullscreen */
  Mozert.use({
    name: 'fullscreen',
    defaults: { fullscreen: false },
    create(sl) {
      if (!sl.s.fullscreen) return null;
      const btn = mk('button', 'mozert-fullscreen-btn');
      btn.type = 'button';
      btn.setAttribute('aria-label', sl._label('fullscreen') || 'Toggle fullscreen');
      btn.innerHTML = '<svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true"><path d="M4 9V4h5M20 9V4h-5M4 15v5h5M20 15v5h-5"/></svg>';
      sl.el.appendChild(btn);
      const toggle = () => {
        const on = !sl.el.classList.contains('mozert-fullscreen');
        if (on && sl.el.requestFullscreen) sl.el.requestFullscreen().catch(() => sl.el.classList.add('mozert-fullscreen'));
        else if (!on && document.fullscreenElement && document.exitFullscreen) document.exitFullscreen();
        else sl.el.classList.toggle('mozert-fullscreen', on);
        setTimeout(() => window.dispatchEvent(new Event('resize')), 60);
      };
      btn.addEventListener('click', toggle);
      sl._on(document, 'fullscreenchange', () => {
        sl.el.classList.toggle('mozert-fullscreen', document.fullscreenElement === sl.el);
        window.dispatchEvent(new Event('resize'));
      });
      sl.fullscreen = { toggle };
      return {
        destroy() {
          if (btn.parentNode) btn.parentNode.removeChild(btn);
          delete sl.fullscreen;
        },
      };
    },
  });

  /* -------------------------------------------------------------- bleed */
  // Slides start aligned with the container, overflow towards the viewport edge (right, left or both) and the last slide ends aligned with the container.
  Mozert.use({
    name: 'bleed',
    defaults: { bleed: false },
    create(sl) {
      const c = sl.s.bleed;
      if (!c || sl.s.vertical) return null;
      const side = c === 'left' || c === 'right' ? c : 'both';
      const list = sl.list;
      list.style.overflow = 'visible';
      sl.el.classList.add('mozert-bleed');
      // Overflowing slides must not create a horizontal page scrollbar: clip the page on the x axis (restored on destroy).
      const body = document.body;
      const prevClip = body.style.overflowX;
      let clipped = false;
      if (getComputedStyle(body).overflowX === 'visible') {
        body.style.overflowX = 'clip';
        clipped = true;
      }
      const update = () => {
        const r = sl.el.getBoundingClientRect();
        const vw = document.documentElement.clientWidth || window.innerWidth;
        const L = side === 'right' ? 0 : Math.max(0, r.left);
        const R = side === 'left' ? 0 : Math.max(0, vw - r.right);
        list.style.clipPath = 'inset(-48px ' + -R + 'px -48px ' + -L + 'px)';
      };
      update();
      sl._on(window, 'resize', update);
      sl._sub('setPosition', update);
      const t = setTimeout(update, 120);
      return {
        destroy() {
          clearTimeout(t);
          list.style.overflow = '';
          list.style.clipPath = '';
          if (clipped) body.style.overflowX = prevClip;
          sl.el.classList.remove('mozert-bleed');
        },
      };
    },
  });

  /* ------------------------------------------------------------- thumbs */
  // thumbs: '#nav' (an existing strip), true (create one below the slider) or { el, options, count }.
  // An empty strip is filled automatically from each slide's data-thumb, first <img> or background.
  Mozert.use({
    name: 'thumbs',
    defaults: { thumbs: false },
    create(sl) {
      const cfg = sl.s.thumbs;
      if (!cfg || sl.n < 2) return null;
      const o = objOpt(cfg, { el: null, options: {}, count: 5, position: 'bottom', breakpoint: 640 });
      const want = ['left', 'right', 'top', 'bottom'].indexOf(o.position) > -1 ? o.position : 'bottom';
      // A side strip moves below the picture on narrow screens (viewport <= breakpoint px).
      const mq = (want === 'left' || want === 'right') && o.breakpoint > 0 && typeof matchMedia === 'function' ? matchMedia('(max-width:' + o.breakpoint + 'px)') : null;
      const pos = mq && mq.matches ? 'bottom' : want;
      const side = pos === 'left' || pos === 'right';
      const onMq = () => sl.active && sl.refresh();
      if (mq) mq.addEventListener ? mq.addEventListener('change', onMq) : mq.addListener(onMq);
      let host = null;
      let made = false;
      let wrap = null;
      const ref = cfg === true ? null : typeof cfg === 'object' && !cfg.nodeType ? o.el : cfg;
      if (ref) host = typeof ref === 'string' ? document.querySelector(ref) : ref && ref.nodeType ? ref : null;
      if (!host) {
        if (ref) return null;
        host = mk('div', 'mozert-thumbs');
        made = true;
        if (side) {
          wrap = mk('div', 'mozert-gallery mozert-gallery-' + pos);
          sl.el.parentNode.insertBefore(wrap, sl.el);
          wrap.appendChild(sl.el);
          wrap.appendChild(host);
        } else if (pos === 'top') sl.el.parentNode.insertBefore(host, sl.el);
        else sl.el.parentNode.insertBefore(host, sl.el.nextSibling);
      }
      host.setAttribute('data-mozert-thumbs', pos);
      const auto = host.children.length === 0;
      if (auto) {
        (sl._items || []).forEach((src, i) => {
          const cell = mk('div');
          const first = src.firstElementChild;
          const img = src.querySelector('img');
          const url = src.getAttribute('data-thumb') || (img && (img.getAttribute('data-thumb') || img.getAttribute('src') || img.getAttribute('data-lazy')));
          if (url) {
            const t = mk('img', 'mozert-thumb');
            t.src = url;
            t.alt = '';
            t.draggable = false;
            cell.appendChild(t);
          } else {
            const t = mk('div', 'mozert-thumb mozert-thumb-fill');
            const bg = first ? getComputedStyle(first).backgroundImage : 'none';
            if (bg && bg !== 'none') t.style.backgroundImage = bg;
            else t.style.background = (first && getComputedStyle(first).backgroundColor) || '#ccd';
            t.textContent = String(i + 1);
            cell.appendChild(t);
          }
          host.appendChild(cell);
        });
      }
      const count = Math.max(1, Math.min(o.count, sl.n));
      const gap = o.options && o.options.spaceBetween != null ? o.options.spaceBetween : 10;
      const fit = () => {
        // vertical strip: size each thumb so `count` of them fill exactly the height of the main slider
        const H = sl.el.offsetHeight;
        if (!H) return;
        host.style.setProperty('--mozert-thumb-h', Math.max(24, (H - gap * (count - 1)) / count) + 'px');
        host.style.height = H + 'px';
        th.refresh();
      };
      const th = new Mozert(host, Object.assign({ slidesToShow: count, slidesToScroll: 1, arrows: false, dots: false, infinite: false, swipeToSlide: true, spaceBetween: gap, focusOnSelect: true, initialSlide: 0, vertical: side }, o.options, { asNavFor: sl, thumbs: false, lightbox: false }));
      let ro = null;
      if (side) {
        fit();
        if (typeof ResizeObserver !== 'undefined') {
          let lastH = sl.el.offsetHeight;
          ro = new ResizeObserver(() => {
            if (sl.el.offsetHeight !== lastH) {
              lastH = sl.el.offsetHeight;
              fit();
            }
          });
          ro.observe(sl.el);
        }
      }
      const prevNav = sl.s.asNavFor;
      if (!prevNav) sl.s.asNavFor = th;
      host.classList.add('mozert-thumbs');
      sl._syncNav(sl.current);
      return {
        destroy() {
          if (sl.s.asNavFor === th) sl.s.asNavFor = prevNav;
          if (ro) ro.disconnect();
          if (mq) mq.removeEventListener ? mq.removeEventListener('change', onMq) : mq.removeListener(onMq);
          host.removeAttribute('data-mozert-thumbs');
          host.style.removeProperty('--mozert-thumb-h');
          if (side) host.style.height = '';
          th.destroy();
          if (wrap && wrap.parentNode) {
            wrap.parentNode.insertBefore(sl.el, wrap);
            wrap.parentNode.removeChild(wrap);
          } else if (made) host.parentNode && host.parentNode.removeChild(host);
          else if (auto) host.innerHTML = '';
        },
      };
    },
  });

  /* ----------------------------------------------------------- lightbox */
  // lightbox: true | { zoom: true, loop: true }. Click a slide to open it full screen.
  Mozert.use({
    name: 'lightbox',
    defaults: { lightbox: false },
    create(sl) {
      if (!sl.s.lightbox) return null;
      const o = objOpt(sl.s.lightbox, { zoom: true, loop: true, maxZoom: 2.5 });
      let box = null;
      let idx = 0;
      let opener = null;
      let zoomed = false;
      let zrect = null;
      let drag = null;
      const items = () => sl._items || [];
      const isImg = (h) => /^data:image\//i.test(h || '') || /\.(jpe?g|png|gif|webp|avif|svg)(\?|#|$)/i.test(h || '');
      const info = (src) => {
        const img = src.querySelector('img');
        const a = src.querySelector('a[href]');
        const full = src.getAttribute('data-full') || (img && img.getAttribute('data-full')) || (a && isImg(a.getAttribute('href')) ? a.getAttribute('href') : '') || (img && (img.currentSrc || img.getAttribute('src'))) || '';
        return { src: full, alt: (img && img.getAttribute('alt')) || '', cap: src.getAttribute('data-caption') || (img && img.getAttribute('data-caption')) || '', node: src };
      };
      const stageContent = (it) => {
        if (it.src) {
          const im = mk('img', 'mozert-lb-img');
          im.src = it.src;
          im.alt = it.alt;
          im.draggable = false;
          return im;
        }
        // Slides without an image: show a larger copy of the slide itself.
        const w = mk('div', 'mozert-lb-clone');
        w.innerHTML = it.node.innerHTML;
        return w;
      };
      const setZoom = (on, ev) => {
        const el = box && box.querySelector('.mozert-lb-img,.mozert-lb-clone');
        if (!el || !o.zoom) return;
        zoomed = on;
        box.classList.toggle('mozert-lb-zoomed', on);
        if (on) {
          const r = el.getBoundingClientRect();
          zrect = r;
          const ox = ev ? ((ev.clientX - r.left) / r.width) * 100 : 50;
          const oy = ev ? ((ev.clientY - r.top) / r.height) * 100 : 50;
          el.style.transformOrigin = ox + '% ' + oy + '%';
          el.style.transform = 'scale(' + o.maxZoom + ')';
        } else {
          el.style.transform = '';
        }
      };
      const show = (i, dir) => {
        const list = items();
        if (!list.length) return;
        if (o.loop) i = (i + list.length) % list.length;
        else i = clampN(i, 0, list.length - 1);
        idx = i;
        setZoom(false);
        const it = info(list[i]);
        const stage = box.querySelector('.mozert-lb-stage');
        stage.innerHTML = '';
        const c = stageContent(it);
        stage.appendChild(c);
        c.classList.add('mozert-lb-in');
        if (dir) c.style.setProperty('--lb-from', dir > 0 ? '40px' : '-40px');
        box.querySelector('.mozert-lb-count').textContent = i + 1 + ' / ' + list.length;
        box.querySelector('.mozert-lb-cap').textContent = it.cap;
        box.setAttribute('aria-label', sl._label('imageOf', { n: i + 1, total: list.length }));
        const edge = !o.loop && list.length > 1;
        box.querySelector('.mozert-lb-prev').disabled = edge && i === 0;
        box.querySelector('.mozert-lb-next').disabled = edge && i === list.length - 1;
        // Preload the neighbours.
        [i - 1, i + 1].forEach((k) => {
          const n = list[(k + list.length) % list.length];
          const u = n && info(n).src;
          if (u) new Image().src = u;
        });
        if (sl.emit) sl.emit('lightboxChange', i);
      };
      const key = (e) => {
        if (!box) return;
        if (e.key === 'Escape') {
          e.preventDefault();
          close();
        } else if (e.key === 'ArrowRight') show(idx + 1, 1);
        else if (e.key === 'ArrowLeft') show(idx - 1, -1);
        else if (e.key === 'Tab') {
          const f = Array.from(box.querySelectorAll('button:not([disabled])'));
          if (!f.length) return;
          const first = f[0];
          const last = f[f.length - 1];
          if (e.shiftKey && document.activeElement === first) {
            e.preventDefault();
            last.focus();
          } else if (!e.shiftKey && document.activeElement === last) {
            e.preventDefault();
            first.focus();
          }
        }
      };
      const open = (i) => {
        if (box || !items().length) return;
        opener = document.activeElement;
        const lb = (k) => sl._label(k);
        const single = items().length < 2;
        box = mk('div', 'mozert-lb');
        box.setAttribute('role', 'dialog');
        box.setAttribute('aria-modal', 'true');
        box.innerHTML =
          '<div class="mozert-lb-stage"></div>' +
          '<div class="mozert-lb-bar"><span class="mozert-lb-count"></span>' +
          (o.zoom ? '<button type="button" class="mozert-lb-zoom" aria-label="' + lb('zoom') + '"><svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true"><circle cx="11" cy="11" r="7"/><path d="M21 21l-4.3-4.3M11 8v6M8 11h6"/></svg></button>' : '') +
          '<button type="button" class="mozert-lb-close" aria-label="' + lb('close') + '"><svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true"><path d="M5 5l14 14M19 5L5 19"/></svg></button></div>' +
          (single ? '' : '<button type="button" class="mozert-lb-prev" aria-label="' + lb('prev') + '"><svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" stroke-width="2.4" aria-hidden="true"><path d="M15 5l-7 7 7 7"/></svg></button><button type="button" class="mozert-lb-next" aria-label="' + lb('next') + '"><svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" stroke-width="2.4" aria-hidden="true"><path d="M9 5l7 7-7 7"/></svg></button>') +
          '<div class="mozert-lb-cap"></div>';
        if (single) {
          box.insertAdjacentHTML('beforeend', '<button type="button" class="mozert-lb-prev" hidden></button><button type="button" class="mozert-lb-next" hidden></button>');
        }
        document.body.appendChild(box);
        document.documentElement.classList.add('mozert-lb-open');
        show(i);
        requestAnimationFrame(() => box && box.classList.add('mozert-lb-show'));
        const stage = box.querySelector('.mozert-lb-stage');
        box.querySelector('.mozert-lb-close').addEventListener('click', close);
        const pv = box.querySelector('.mozert-lb-prev');
        const nx = box.querySelector('.mozert-lb-next');
        pv.addEventListener('click', () => show(idx - 1, -1));
        nx.addEventListener('click', () => show(idx + 1, 1));
        const zb = box.querySelector('.mozert-lb-zoom');
        if (zb) zb.addEventListener('click', () => setZoom(!zoomed));
        // Click outside the picture closes, click on the picture toggles zoom, swipe changes picture.
        stage.addEventListener('click', (e) => {
          if (drag && drag.moved) return;
          if (e.target.closest && e.target.closest('.mozert-lb-img,.mozert-lb-clone')) setZoom(!zoomed, e);
          else if (e.target === stage) close();
        });
        stage.addEventListener('pointerdown', (e) => {
          drag = { x: e.clientX, y: e.clientY, moved: false, id: e.pointerId };
        });
        stage.addEventListener('pointermove', (e) => {
          // While zoomed, the mouse pans the picture (the zoom follows the pointer).
          if (zoomed && zrect && e.pointerType === 'mouse' && !drag) {
            const z = box.querySelector('.mozert-lb-img,.mozert-lb-clone');
            if (z) z.style.transformOrigin = clampN(((e.clientX - zrect.left) / zrect.width) * 100, 0, 100) + '% ' + clampN(((e.clientY - zrect.top) / zrect.height) * 100, 0, 100) + '%';
          }
          if (!drag) return;
          const dx = e.clientX - drag.x;
          if (Math.abs(dx) > 6 || Math.abs(e.clientY - drag.y) > 6) drag.moved = true;
        });
        stage.addEventListener('pointerup', (e) => {
          if (!drag) return;
          const dx = e.clientX - drag.x;
          const moved = drag.moved;
          if (moved && !zoomed && Math.abs(dx) > 50) show(idx + (dx < 0 ? 1 : -1), dx < 0 ? 1 : -1);
          setTimeout(() => (drag = null), 0);
        });
        document.addEventListener('keydown', key, true);
        (box.querySelector('.mozert-lb-close') || box).focus();
        if (sl.emit) sl.emit('lightboxOpen', i);
      };
      const close = () => {
        if (!box) return;
        const b = box;
        box = null;
        document.removeEventListener('keydown', key, true);
        document.documentElement.classList.remove('mozert-lb-open');
        b.classList.remove('mozert-lb-show');
        setTimeout(() => b.parentNode && b.parentNode.removeChild(b), 180);
        if (sl.active && idx !== sl.current && sl.canNav) sl.goTo(idx);
        if (opener && opener.focus) {
          try {
            opener.focus({ preventScroll: true });
          } catch (e) {}
        }
        if (sl.emit) sl.emit('lightboxClose', idx);
      };
      sl.el.classList.add('mozert-has-lightbox');
      sl._on(sl.list, 'click', (e) => {
        const slide = e.target.closest && e.target.closest('.mozert-slide');
        if (!slide || !sl.track.contains(slide)) return;
        if (e.target.closest('button, input, select, textarea, [data-no-lightbox]')) return;
        const a = e.target.closest('a[href]');
        if (a && !isImg(a.getAttribute('href'))) return;
        const i = parseInt(slide.getAttribute('data-mozert-index'), 10);
        if (isNaN(i)) return;
        if (a) e.preventDefault();
        open(i % Math.max(1, items().length));
      });
      sl.lightbox = { open, close, get isOpen() { return !!box; } };
      return {
        destroy() {
          if (box) {
            box.parentNode && box.parentNode.removeChild(box);
            box = null;
            document.removeEventListener('keydown', key, true);
            document.documentElement.classList.remove('mozert-lb-open');
          }
          sl.el.classList.remove('mozert-has-lightbox');
          delete sl.lightbox;
        },
      };
    },
  });

  /* ---------------------------------------------------------- magnifier */
  // magnifier: true | { zoom: 2.2, button: true, active: false }. Hover zoom like a product page: with the magnifier on,
  // the picture under the mouse is enlarged around the pointer. A small button in the top right corner turns it on and off.
  // A slide's image can name a sharper file with data-zoom (or data-full), which is loaded the first time it is magnified.
  Mozert.use({
    name: 'magnifier',
    defaults: { magnifier: false },
    create(sl) {
      if (!sl.s.magnifier) return null;
      const o = objOpt(sl.s.magnifier, { zoom: 2.2, button: true, active: false });
      let on = sl._magOn !== undefined ? sl._magOn : !!o.active;
      let cur = null;
      let btn = null;
      let pressed = false;
      sl.el.classList.add('mozert-has-magnifier');
      const targetOf = (slide) => slide.querySelector('img,picture,canvas,video') || slide.firstElementChild;
      const reset = () => {
        if (!cur) return;
        cur.node.style.transform = '';
        cur.node.style.transformOrigin = '';
        cur.node.classList.remove('mozert-mag-node');
        cur.slide.classList.remove('mozert-mag-host');
        cur = null;
      };
      const hires = (node) => {
        const img = node.tagName === 'IMG' ? node : node.querySelector && node.querySelector('img');
        const url = img && (img.getAttribute('data-zoom') || img.getAttribute('data-full'));
        if (!img || !url || img.__mozMag) return;
        img.__mozMag = 1;
        const pre = new Image();
        pre.onload = () => {
          img.src = url;
        };
        pre.src = url;
      };
      const move = (e) => {
        if (!on || pressed || e.pointerType !== 'mouse') return;
        const slide = e.target.closest && e.target.closest('.mozert-slide');
        if (!slide || !sl.track.contains(slide) || (e.target.closest && e.target.closest('.mozert-mag-btn'))) {
          reset();
          return;
        }
        if (!cur || cur.slide !== slide) {
          reset();
          const node = targetOf(slide);
          if (!node) return;
          cur = { slide, node };
          slide.classList.add('mozert-mag-host');
          node.classList.add('mozert-mag-node');
          hires(node);
        }
        const r = cur.slide.getBoundingClientRect();
        cur.node.style.transformOrigin = clampN(((e.clientX - r.left) / r.width) * 100, 0, 100) + '% ' + clampN(((e.clientY - r.top) / r.height) * 100, 0, 100) + '%';
        cur.node.style.transform = 'scale(' + o.zoom + ')';
      };
      const paint = () => {
        sl.el.classList.toggle('mozert-mag-on', on);
        if (btn) {
          btn.setAttribute('aria-pressed', on ? 'true' : 'false');
          btn.classList.toggle('mozert-on', on);
        }
        if (!on) reset();
      };
      const set = (v) => {
        on = !!v;
        sl._magOn = on;
        paint();
        sl.emit('magnifier', on);
      };
      sl._on(sl.list, 'pointermove', move);
      sl._on(sl.list, 'pointerleave', reset);
      // Dragging the slider must feel normal: drop the zoom while the button is held down.
      sl._on(sl.list, 'pointerdown', () => {
        pressed = true;
        reset();
      });
      sl._on(window, 'pointerup', () => {
        pressed = false;
      });
      sl._sub('beforeChange', reset);
      if (o.button) {
        btn = mk('button', 'mozert-mag-btn');
        btn.type = 'button';
        btn.setAttribute('aria-label', sl._label('magnifier'));
        btn.innerHTML = '<svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" aria-hidden="true"><circle cx="10.5" cy="10.5" r="6.5"/><path d="M15.5 15.5L21 21"/></svg>';
        btn.addEventListener('click', (e) => {
          e.stopPropagation();
          set(!on);
        });
        sl.el.appendChild(btn);
      }
      paint();
      sl.magnifier = { enable: () => set(true), disable: () => set(false), toggle: () => set(!on), isOn: () => on };
      return {
        destroy() {
          reset();
          if (btn && btn.parentNode) btn.parentNode.removeChild(btn);
          sl.el.classList.remove('mozert-has-magnifier', 'mozert-mag-on');
          delete sl.magnifier;
        },
      };
    },
  });

  /* -------------------------------------------------------- scrollDriven */
  // scrollDriven: true | { speed: 1.6, step: 0, top: 'center' | 0, offset: 0 }.
  // The slider sticks while the user scrolls and the scroll moves the slides. `speed` is how many px the slides travel
  // per px of page scroll (higher = less page height used); `step` forces a fixed number of px per slide instead.
  // `top: 'center'` pins the slider in the middle of the screen, a number pins it that many px from the top;
  // `offset` adds room for a sticky header. Works with non-looping, horizontal sliders.
  Mozert.use({
    name: 'scrollDriven',
    defaults: { scrollDriven: false },
    create(sl) {
      const c = sl.s.scrollDriven;
      if (!c || sl.s.vertical || sl.s.infinite || sl.s.stacked || !sl.canNav) return null;
      const o = objOpt(c, { step: 0, top: 0, speed: 1.6, offset: 0, fill: false, bottom: 0 });
      const el = sl.el;
      const wrap = mk('div', 'mozert-sd');
      el.parentNode.insertBefore(wrap, el);
      wrap.appendChild(el);
      el.classList.add('mozert-sd-stick');
      let topPx = 0;
      const place = () => {
        if (o.fill) {
          // fill: the pinned slider takes the whole screen height (minus offset/bottom), so there is no empty space around it
          topPx = (o.top === 'center' ? 0 : parseFloat(o.top) || 0) + (parseFloat(o.offset) || 0);
          el.classList.add('mozert-sd-fill');
          el.style.height = Math.max(160, window.innerHeight - topPx - (parseFloat(o.bottom) || 0)) + 'px';
          el.style.top = topPx + 'px';
          return;
        }
        const h = el.offsetHeight;
        topPx = o.top === 'center' ? Math.max(0, Math.round((window.innerHeight - h) / 2)) : parseFloat(o.top) || 0;
        topPx += parseFloat(o.offset) || 0;
        el.style.top = topPx + 'px';
      };
      let raf = 0;
      let lastIdx = -1;
      const steps = () => Math.max(1, sl.maxIndex);
      const totalPx = () => {
        if (o.step) return steps() * o.step;
        const travel = Math.abs(sl._pos(sl.maxIndex) - sl._pos(0));
        return Math.max(240, Math.round(travel / Math.max(0.2, o.speed)));
      };
      const size = () => {
        place();
        wrap.style.height = el.offsetHeight + totalPx() + 'px';
      };
      const update = () => {
        raf = 0;
        if (!sl.active) return;
        const r = wrap.getBoundingClientRect();
        const total = totalPx();
        const p = clampN((topPx - r.top) / total, 0, 1);
        const f = p * steps();
        const i0 = Math.floor(f);
        const i1 = Math.min(sl.maxIndex, i0 + 1);
        const k = f - i0;
        const idx = Math.round(f);
        if (idx !== lastIdx) {
          lastIdx = idx;
          sl.goTo(idx, true);
        }
        sl._setPos(sl._pos(i0) + (sl._pos(i1) - sl._pos(i0)) * k, false);
        wrap.style.setProperty('--sd-progress', p.toFixed(4));
      };
      const queue = () => {
        if (!raf) raf = requestAnimationFrame(update);
      };
      size();
      sl._on(window, 'scroll', queue, { passive: true });
      sl._on(window, 'resize', () => {
        size();
        queue();
      });
      sl._sub('reInit', () => {
        size();
        queue();
      });
      update();
      sl.scrollDriven = { update };
      return {
        destroy() {
          if (raf) cancelAnimationFrame(raf);
          el.classList.remove('mozert-sd-stick', 'mozert-sd-fill');
          el.style.top = '';
          if (o.fill) el.style.height = '';
          if (wrap.parentNode) {
            wrap.parentNode.insertBefore(el, wrap);
            wrap.parentNode.removeChild(wrap);
          }
          delete sl.scrollDriven;
        },
      };
    },
  });
})();
