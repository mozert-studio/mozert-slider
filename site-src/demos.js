(function () {
  if (!window.Mozert) return;
  var D = window.MZ_DEMOS || [];
  D.forEach(function (d) {
    var el = document.getElementById(d.id);
    if (!el) return;
    try {
      var o = JSON.parse(JSON.stringify(d.opts || {}));
      if (d.kind === 'virtual') {
        var slides = [];
        for (var i = 1; i <= 2000; i++) slides.push('<div class="chip">Slide ' + i + '</div>');
        o.virtual = { slides: slides, addSlidesBefore: 2, addSlidesAfter: 3, cache: false };
      }
      var inst = new Mozert(el, o);
      var box = document.getElementById(d.id + '-box');
      if (d.kind === 'expand' && box) {
        var xs = box.querySelector('.xstage');
        var paintX = function () { var cur = inst.dom.filter(function (e) { return e.classList.contains('mozert-current'); })[0]; if (cur && xs) xs.style.setProperty('--xbg', cur.getAttribute('data-bg')); };
        inst.on('afterChange', paintX); inst.on('init', paintX); paintX();
      }
      if (d.kind === 'dynamic' && box) {
        var seq = 4, hue = function (k) { return 'sc-' + (k % 8); };
        var mk = function () { seq++; return '<div><div class="sc ' + hue(seq) + '"><i class="sc-s"></i><span class="sc-k">New</span><strong class="sc-h">' + String(seq).padStart(2, '0') + '</strong><span class="sc-p">Mozert Slider</span></div></div>'; };
        var cnt = box.querySelector('[data-count]');
        var upd2 = function () { if (cnt) cnt.textContent = inst.slideCount() + ' slides'; };
        var first = el.innerHTML;
        var acts = {
          add: function () { inst.add(mk()); inst.goTo(inst.slideCount() - 1); },
          addfirst: function () { inst.add(mk(), true); inst.goTo(0); },
          remove: function () { inst.remove(inst.slideCount() - 1); },
          removefirst: function () { inst.remove(0); },
          reset: function () { inst.removeAll(); seq = 0; for (var q = 0; q < 4; q++) inst.add(mk()); seq = 4; inst.goTo(0); }
        };
        box.addEventListener('click', function (e) { var b = e.target.closest('[data-act]'); if (!b || !acts[b.dataset.act]) return; acts[b.dataset.act](); setTimeout(upd2, 30); });
        upd2();
      }
      if (d.kind === 'filter' && box) {
        var cnt2 = box.querySelector('[data-count]');
        box.addEventListener('click', function (e) {
          var b = e.target.closest('[data-act]'); if (!b) return;
          if (b.dataset.act === 'all') inst.unfilter(); else inst.filter(b.dataset.act);
          box.querySelectorAll('[data-act]').forEach(function (x) { x.setAttribute('aria-pressed', x === b ? 'true' : 'false'); });
          if (cnt2) cnt2.textContent = inst.slideCount() + ' slides';
        });
        if (cnt2) cnt2.textContent = inst.slideCount() + ' slides';
      }
      if (d.kind === 'virtual') {
        var out = document.getElementById(d.id + '-count');
        var upd = function () { if (out) out.textContent = el.querySelectorAll('[data-vr]').length + ' of ' + inst.slideCount() + ' slides rendered in the DOM'; };
        inst.on('afterChange', upd); setTimeout(upd, 200);
      }
    } catch (e) { if (window.console) console.error('demo ' + d.id, e); }
  });
})();
