// SEO checks on the built site: clean internal links, no broken links, valid JSON-LD, unique titles, canonicals match sitemap.
const fs = require('fs'), path = require('path');
const root = path.resolve(__dirname, '../site');
let fail = 0; const ok = (c, m, d) => { if (!c) { fail++; console.log('FAIL', m, d || ''); } };
const pages = [];
(function walk(d) { for (const f of fs.readdirSync(d)) { const p = path.join(d, f); if (fs.statSync(p).isDirectory()) { if (f !== 'assets') walk(p); } else if (f === 'index.html') pages.push(p); } })(root);
const sm = fs.readFileSync(path.join(root, 'sitemap.xml'), 'utf8');
const locs = [...sm.matchAll(/<loc>([^<]+)<\/loc>/g)].map((m) => m[1]);
ok(locs.length === pages.length, `sitemap lists every page (${locs.length}/${pages.length})`);
const titles = new Set(), descs = new Set();
for (const f of pages) {
  const raw = fs.readFileSync(f, 'utf8'), h = raw.replace(/<pre[\s\S]*?<\/pre>/g, ''), dir = path.dirname(f), rel = path.relative(root, dir) || '/';
  const canon = (h.match(/<link rel="canonical" href="([^"]+)"/) || [])[1];
  ok(canon && locs.includes(canon), rel + ': canonical is in the sitemap', canon);
  const t = (h.match(/<title>([^<]*)<\/title>/) || [])[1], d = (h.match(/<meta name="description" content="([^"]*)"/) || [])[1];
  ok(t && t.length <= 70, rel + ': title present and <= 70 chars', t); ok(!titles.has(t), rel + ': unique title', t); titles.add(t);
  ok(d && d.length >= 60 && d.length <= 330, rel + ': description length', d && d.length); ok(!descs.has(d), rel + ': unique description'); descs.add(d);
  ok((h.match(/<h1[ >]/g) || []).length === 1, rel + ': exactly one h1');
  ok(!/href="[^"]*index\.html/.test(h), rel + ': no index.html links');
  for (const m of h.matchAll(/<script type="application\/ld\+json">([\s\S]*?)<\/script>/g)) { try { JSON.parse(m[1]); } catch (e) { ok(false, rel + ': JSON-LD parses', e.message); } }
  for (const m of h.matchAll(/(?:href|src)="([^"#?]+)[^"]*"/g)) {
    const u = m[1]; if (/^(https?:|mailto:|data:|\/\/)/.test(u)) continue;
    const tgt = u.startsWith('/') ? path.join(root, u) : path.resolve(dir, u);
    const okf = fs.existsSync(tgt) && (!fs.statSync(tgt).isDirectory() || fs.existsSync(path.join(tgt, 'index.html')));
    if (!okf && !/\.(jpg|jpeg|png|webp|mp4)$/.test(u) && !tgt.includes('/photos/')) ok(false, rel + ': broken link ' + u);
  }
}
const home = fs.readFileSync(path.join(root, 'index.html'), 'utf8');
ok(home.includes('"FAQPage"') && home.includes('"SoftwareApplication"') && home.includes('"WebSite"'), 'home has SoftwareApplication, WebSite and FAQPage data');
ok(fs.readFileSync(path.join(root, 'blog/hero-slider/index.html'), 'utf8').includes('"Article"'), 'blog post has Article data');
ok(fs.readFileSync(path.join(root, 'blog/hero-slider/index.html'), 'utf8').includes('"BreadcrumbList"'), 'blog post has breadcrumbs');
console.log(fail ? 'seo FAILED' : 'seo OK (' + pages.length + ' pages)'); process.exit(fail ? 1 : 0);
