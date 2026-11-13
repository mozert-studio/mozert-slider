// One release, one set of numbers: package.json, README, website, source banner and changelog must agree.
const fs = require('fs'), path = require('path'), zlib = require('zlib');
const root = path.join(__dirname, '..');
const R = (f) => fs.readFileSync(path.join(root, f), 'utf8');
let fail = 0; const ok = (c, m, x) => { console.log((c ? 'ok   ' : 'FAIL ') + m, c ? '' : JSON.stringify(x)); if (!c) fail++; };
const pkg = JSON.parse(R('package.json')), V = pkg.version;
const kb = (n) => (n / 1024).toFixed(1);
const gz = (f) => kb(zlib.gzipSync(fs.readFileSync(path.join(root, 'dist', f)), { level: 9 }).length);
const full = gz('mozert.min.js'), core = gz('mozert.core.min.js');

ok(JSON.parse(R('packages/react/package.json')).version === V, 'react package version = ' + V);
ok(JSON.parse(R('packages/vue/package.json')).version === V, 'vue package version = ' + V);
ok(new RegExp(' \\* Mozert ' + V.replace(/\./g, '\\.')).test(R('src/mozert.js')) && R('src/mozert.js').includes("VERSION = '" + V + "'"), 'source banner and VERSION = ' + V);
ok(R('dist/mozert.min.js').includes(V), 'dist build carries ' + V);

const readme = R('README.md');
ok(readme.includes('Version **' + V + '**'), 'README states version ' + V);
ok(readme.includes(`**${full} KB**`) && readme.includes(`**${core} KB**`), 'README size table matches dist', { full, core });
ok(readme.includes(`Core + all modules: ${full} KB gzip (core-only ${core} KB)`), 'README summary line matches dist');
ok(!/~\s*\d+\s*KB/.test(readme), 'README has no hand-written approximate sizes');

const strip = (h) => h.replace(/<[^>]+>/g, ' ');
const home = strip(R('site/index.html')), inst = strip(R('site/features/index.html')), foot = R('site/index.html');
ok(home.includes(full + ' KB') && home.includes(core + ' KB'), 'website home shows the same sizes', { full, core });
ok(inst.includes(full + ' KB') && inst.includes(core + ' KB'), 'features page shows the same sizes');
for (const p of ['', 'features', 'examples', 'docs', 'installation', 'api', 'blog', 'changelog']) {
  const h = R('site/' + (p ? p + '/' : '') + 'index.html');
  ok(h.includes('</strong> v' + V + '<br>'), 'footer of /' + p + ' says v' + V);
}
const all = ['', 'features', 'examples', 'docs', 'installation', 'api', 'blog', 'changelog'].map((p) => strip(R('site/' + (p ? p + '/' : '') + 'index.html'))).join(' ');
const sizes = [...all.matchAll(/(\d+\.\d) KB/g)].map((m) => m[1]);
ok(!sizes.includes('18.0') && !sizes.includes('18'), 'no stale 18 KB claim anywhere on the site');
ok(R('site/changelog/index.html').indexOf('v' + V) !== -1 || R('site/changelog/index.html').includes(V), 'changelog lists ' + V);
const rows = ['Chrome', 'Firefox', 'Safari', 'Samsung', 'Internet Explorer'];
ok(rows.every((r) => readme.includes(r) && inst.includes(r)), 'README and website list the same browsers');
ok(!/after the package (is|has been) published|until then, copy the files/i.test(all), 'no stale "after the package is published" note');
console.log(fail ? 'FAILED' : 'consistency OK'); process.exit(fail ? 1 : 0);
