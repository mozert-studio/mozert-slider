(function () {
  var r = document.documentElement;
  function store(k, v) { try { if (v === undefined) return localStorage.getItem(k); localStorage.setItem(k, v); } catch (e) {} }
  var saved = store('mz-theme'); if (saved) r.setAttribute('data-theme', saved);
  document.querySelectorAll('.tt').forEach(function (b) {
    b.addEventListener('click', function () {
      var dark = r.getAttribute('data-theme') ? r.getAttribute('data-theme') === 'dark' : matchMedia('(prefers-color-scheme: dark)').matches;
      var n = dark ? 'light' : 'dark'; r.setAttribute('data-theme', n); store('mz-theme', n);
    });
  });
  var mn = document.querySelector('details.menu');
  if (mn) {
    document.addEventListener('click', function (e) { if (mn.open && !mn.contains(e.target)) mn.open = false; });
    document.addEventListener('keydown', function (e) { if (e.key === 'Escape') mn.open = false; });
    mn.querySelectorAll('a').forEach(function (a) { a.addEventListener('click', function () { mn.open = false; }); });
  }
  document.querySelectorAll('pre[data-copy]').forEach(function (p) {
    var b = document.createElement('button'); b.className = 'cp'; b.type = 'button'; b.textContent = 'Copy';
    b.addEventListener('click', function () {
      var t = p.querySelector('code').innerText;
      (navigator.clipboard ? navigator.clipboard.writeText(t) : Promise.reject()).then(function () { b.textContent = 'Copied'; }, function () {
        var ta = document.createElement('textarea'); ta.value = t; document.body.appendChild(ta); ta.select(); try { document.execCommand('copy'); b.textContent = 'Copied'; } catch (e) {} ta.remove();
      });
      setTimeout(function () { b.textContent = 'Copy'; }, 1500);
    });
    p.appendChild(b);
  });
  document.querySelectorAll('.tabs').forEach(function (t) {
    var tabs = t.querySelectorAll('[role=tab]'), panels = t.querySelectorAll('[role=tabpanel]');
    tabs.forEach(function (tab, i) {
      tab.addEventListener('click', function () {
        tabs.forEach(function (x, j) { x.setAttribute('aria-selected', j === i); panels[j].hidden = j !== i; });
      });
    });
  });

  // examples: category tabs filter the demos and the chip list
  var cats = document.getElementById('cats');
  if (cats) {
    var items = document.querySelectorAll('article.demo[data-cat], .chips a[data-cat]');
    var show = function (k, quiet) {
      cats.querySelectorAll('button').forEach(function (b) { b.classList.toggle('on', b.getAttribute('data-cat') === k); });
      items.forEach(function (el) { el.hidden = !(k === 'all' || el.getAttribute('data-cat') === k); });
      if (!quiet) { try { window.dispatchEvent(new Event('resize')); } catch (e) {} }
    };
    cats.addEventListener('click', function (e) {
      var b = e.target.closest('button'); if (!b) return;
      show(b.getAttribute('data-cat'));
      var first = document.querySelector('.chips'); if (first) first.scrollIntoView({ block: 'nearest' });
    });
    var openHash = function () {
      var id = location.hash.slice(1); var t = id && document.getElementById(id);
      if (t && t.hidden) show('all');
      if (t) setTimeout(function () { t.scrollIntoView(); }, 0);
    };
    window.addEventListener('hashchange', openHash); openHash();
  }
})();
