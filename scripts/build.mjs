// Build script - zero dependencies.
// Produces dist/: UMD + ESM builds, minified JS and CSS.
// (If you prefer terser / lightningcss, swap `minJS` / `minCSS` below.)
import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const src = (f) => readFileSync(join(root, 'src', f), 'utf8');
const out = (f, s) => { mkdirSync(join(root, 'dist'), { recursive: true }); writeFileSync(join(root, 'dist', f), s); };

const idc = (c) => /[A-Za-z0-9_$]/.test(c);

/** Small, careful JS minifier: strips comments + whitespace, keeps strings/regex intact. */
export function minJS(code) {
  let i = 0, o = '', n = code.length;
  const banner = code.match(/^\/\*![\s\S]*?\*\//);
  if (banner) { o += banner[0] + '\n'; i = banner[0].length; }
  let pendingSpace = false;
  const last = () => o[o.length - 1] || '';
  const regexOK = () => {
    const l = last();
    if (!l) return true;
    if ('(,=:[!&|?{};+-*%<>~^'.includes(l)) return true;
    const m = o.match(/(?:^|[^A-Za-z0-9_$.])(return|typeof|case|in|of|delete|void|throw|new|else|do)$/);
    return !!m;
  };
  const push = (s) => {
    if (pendingSpace) {
      const l = last(), f = s[0];
      if ((idc(l) && idc(f)) || (l === '+' && f === '+') || (l === '-' && f === '-') || (l === '/' && f === '/')) o += ' ';
      pendingSpace = false;
    }
    o += s;
  };
  while (i < n) {
    const c = code[i], d = code[i + 1];
    if (c === '/' && d === '/') { while (i < n && code[i] !== '\n') i++; pendingSpace = true; continue; }
    if (c === '/' && d === '*') { const e = code.indexOf('*/', i + 2); i = e < 0 ? n : e + 2; pendingSpace = true; continue; }
    if (/\s/.test(c)) { pendingSpace = true; i++; continue; }
    if (c === '"' || c === "'" || c === '`') {
      let j = i + 1;
      while (j < n && code[j] !== c) { if (code[j] === '\\') j++; j++; }
      push(code.slice(i, j + 1)); i = j + 1; continue;
    }
    if (c === '/' && regexOK()) {
      let j = i + 1, cls = false;
      while (j < n) {
        if (code[j] === '\\') { j += 2; continue; }
        if (code[j] === '[') cls = true; else if (code[j] === ']') cls = false;
        else if (code[j] === '/' && !cls) break;
        j++;
      }
      j++;
      while (j < n && /[a-z]/.test(code[j])) j++;
      push(code.slice(i, j)); i = j; continue;
    }
    // identifiers / numbers
    if (idc(c)) { let j = i; while (j < n && idc(code[j])) j++; push(code.slice(i, j)); i = j; continue; }
    push(c); i++;
  }
  return o;
}

export function minCSS(css) {
  const banner = css.match(/^\/\*![\s\S]*?\*\//);
  let s = css.replace(/\/\*[\s\S]*?\*\//g, '');
  s = s.replace(/\s+/g, ' ')
    .replace(/\s*([{};,>])\s*/g, '$1')
    .replace(/:\s+/g, ':')
    .replace(/\s+\{/g, '{')
    .replace(/;}/g, '}')
    .trim();
  return (banner ? banner[0] + '\n' : '') + s + '\n';
}

// ---- JS
const coreOnly = src('mozert.js');
const mods = src('mozert.modules.js');
// Default bundle = core + all modules; mozert.core.* = core only.
const core = coreOnly.replace('//#endregion core', mods + '\n//#endregion core');
out('mozert.core.js', coreOnly);
out('mozert.core.min.js', minJS(coreOnly));
out('mozert.js', core);
out('mozert.min.js', minJS(core));

const region = core.match(/\/\/#region core([\s\S]*?)\/\/#endregion core/)[1];
const banner = core.match(/^\/\*![\s\S]*?\*\//)[0];
const esm = `${banner}\nconst Mozert = (function () {${region}\n  return Mozert;\n})();\nexport { Mozert };\nexport default Mozert;\n`;
out('mozert.esm.js', esm);
out('mozert.esm.min.js', minJS(esm.replace(/^export .*$/gm, (m) => '@@' + m)).replace(/@@/g, '\n'));

const jq = src('mozert.jquery.js');
out('mozert.jquery.js', jq);
out('mozert.jquery.min.js', minJS(jq));


// ---- CSS
for (const f of ['mozert.css', 'mozert-theme.css']) {
  const s = src(f);
  out(f, s);
  out(f.replace('.css', '.min.css'), minCSS(s));
}

const kb = (s) => (Buffer.byteLength(s) / 1024).toFixed(1) + ' KB';
console.log('built dist/: mozert.min.js', kb(minJS(core)), '| css', kb(minCSS(src('mozert.css')) + minCSS(src('mozert-theme.css'))));

// Node-friendly ES module entry (.mjs avoids the "module type not specified" warning).
out('mozert.esm.mjs', readFileSync(join(root, 'dist', 'mozert.esm.js'), 'utf8'));
