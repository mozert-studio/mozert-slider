// jQuery adapter test. Needs a jQuery file: node tests/jquery.cjs /path/to/jquery.min.js
const chromium = require('playwright')[process.env.BROWSER || 'chromium'];
const path = require('path');
const root = path.join(__dirname, '..');
const jq = process.argv[2] || '/usr/share/javascript/jquery/jquery.min.js';
(async () => {
  const b = await chromium.launch(); const p = await b.newPage({ viewport: { width: 900, height: 600 } });
  const errs = []; p.on('pageerror', (e) => errs.push(e.message));
  await p.setContent('<body><div id="s" style="width:500px"><div style="height:50px">1</div><div style="height:50px">2</div><div style="height:50px">3</div></div></body>');
  await p.addStyleTag({ path: path.join(root, 'dist/mozert.css') });
  await p.addScriptTag({ path: jq });
  await p.addScriptTag({ path: path.join(root, 'dist/mozert.min.js') });
  await p.addScriptTag({ path: path.join(root, 'dist/mozert.jquery.min.js') });
  const r = await p.evaluate(async () => {
    const log = [];
    $('#s').on('init', (e, s) => log.push('init:' + (s instanceof Mozert)));
    $('#s').on('afterChange', (e, s, cur) => log.push('after:' + cur));
    $('#s').mozert({ speed: 80, dots: true });
    $('#s').mozert('next'); await new Promise((r) => setTimeout(r, 300));
    $('#s').mozert('next'); await new Promise((r) => setTimeout(r, 300));
    const cur = $('#s').mozert('currentSlide');
    $('#s').mozert('goTo', 0, true);
    const cur0 = $('#s').mozert('currentSlide');
    $('#s').mozert('setOption', 'dots', false);
    const dots = document.querySelectorAll('#s .mozert-dots').length;
    const inst = $('#s').mozert('getInstance') instanceof Mozert;
    $('#s').mozert('destroy');
    return { log, cur, cur0, dots, inst, destroyed: !document.getElementById('s').classList.contains('mozert-slider') };
  });
  console.log(JSON.stringify(r), errs);
  const ok = r.log[0] === 'init:true' && r.log.includes('after:1') && r.log.includes('after:2') && r.cur === 2 && r.cur0 === 0 && r.dots === 0 && r.inst && r.destroyed && !errs.length;
  console.log(ok ? 'jQuery adapter: OK' : 'jQuery adapter: FAIL'); await b.close(); process.exit(ok ? 0 : 1);
})();
