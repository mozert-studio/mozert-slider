/*!
 * Mozert Slick compatibility layer v1.0.0 | MIT
 * Load AFTER jQuery, mozert.min.js and mozert.jquery.min.js (or use dist/mozert.slick.min.js, which bundles the adapter).
 * Gives you: $.fn.slick(), slick* method names, slick-* class names, data-slick="{}", slick-style event args and slick.slideCount / currentSlide.
 */
;(function () {
  'use strict';
  var $ = window.jQuery, M = window.Mozert;
  if (!$ || !M || !$.fn.mozert) { if (window.console) console.warn('Mozert Slick layer: needs jQuery, Mozert and the jQuery adapter loaded first.'); return; }

  // 1) slick* method names on the instance (slick.slickNext() inside callbacks)
  var map = { slickNext: 'next', slickPrev: 'prev', slickGoTo: 'goTo', slickPlay: 'play', slickPause: 'pause', slickAdd: 'add', slickRemove: 'remove', slickFilter: 'filter', slickUnfilter: 'unfilter', slickGetOption: 'getOption', slickSetOption: 'setOption', slickCurrentSlide: 'currentSlide', unslick: 'destroy', getSlick: 'getInstance' };
  Object.keys(map).forEach(function (k) { M.prototype[k] = function () { return this[map[k]].apply(this, arguments); }; });

  // 2) Slick-shaped object handed to events (numbers instead of methods for slideCount / currentSlide)
  function facade(inst) {
    return new Proxy(inst, {
      get: function (t, k) {
        switch (k) {
          case 'slideCount': return t.n;
          case 'currentSlide': return t.current;
          case '$slider': return $(t.el);
          case '$list': return $(t.list);
          case '$slideTrack': return $(t.track);
          case '$slides': return $(t._units);
          case 'options': return t.s;
          case 'unslicked': return !t.active;
        }
        var v = t[k];
        return typeof v === 'function' ? v.bind(t) : v;
      }
    });
  }
  M._bridge = function (inst, name, args) { $(inst.el).trigger(name, [facade(inst)].concat(args)); };

  // 3) $.fn.slick
  var base = $.fn.mozert;
  $.fn.slick = function (opt) {
    if (opt === 'getSlick') { var i = this[0] && M.get(this[0]); return i ? facade(i) : undefined; }
    return base.apply(this, arguments);
  };
  $.fn.slick.Constructor = M;

  // 4) data-slick="{...}" as an options source
  M._boot.push(function (el) {
    if (el.hasAttribute && el.hasAttribute('data-slick') && !el.hasAttribute('data-mozert')) el.setAttribute('data-mozert', el.getAttribute('data-slick'));
  });

  // 5) slick-* classes (and data-slick-index) mirrored next to mozert-* ones, so existing Slick CSS/JS keeps working
  function mirror(node) {
    var list = node.classList, i, c;
    if (!list) return;
    for (i = 0; i < list.length; i++) { c = list[i]; if (c.indexOf('mozert-') === 0 && c !== 'mozert-slider') { var m = 'slick-' + c.slice(7); if (!list.contains(m)) list.add(m); } }
    if (list.contains('mozert-slider') && !list.contains('slick-slider')) list.add('slick-slider');
    if (node.hasAttribute('data-mozert-index') && node.getAttribute('data-slick-index') !== node.getAttribute('data-mozert-index')) node.setAttribute('data-slick-index', node.getAttribute('data-mozert-index'));
  }
  function mirrorTree(root) { mirror(root); var all = root.querySelectorAll('[class*="mozert-"],[data-mozert-index]'); for (var i = 0; i < all.length; i++) mirror(all[i]); }
  var obs = typeof MutationObserver === 'function' ? new MutationObserver(function (recs) {
    recs.forEach(function (r) {
      if (r.type === 'attributes') mirror(r.target);
      else Array.prototype.forEach.call(r.addedNodes, function (n) { if (n.nodeType === 1) mirrorTree(n); });
    });
  }) : null;
  M.prototype._slickWatch = function () {
    mirrorTree(this.el);
    if (obs) obs.observe(this.el, { subtree: true, childList: true, attributes: true, attributeFilter: ['class', 'data-mozert-index'] });
  };
  var origEmit = M.prototype.emit;
  M.prototype.emit = function (name) {
    if ((name === 'init' || name === 'reInit') && !this._slickWatched) { this._slickWatched = true; this._slickWatch(); }
    return origEmit.apply(this, arguments);
  };
})();
