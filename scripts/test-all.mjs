// Runs every test file even if one fails, then prints a summary (used by CI so one push shows all failures).
import { spawnSync } from 'node:child_process';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const T = [['run', 'dist/mozert.min.js'], ['extra', 'dist/mozert.min.js'], ['labels', 'dist/mozert.min.js'], ['modules', 'dist/mozert.min.js'], ['features', 'dist/mozert.min.js'], ['reel', 'dist/mozert.min.js'], ['jquery'], ['packages'], ['responsive'], ['site'], ['preinit'], ['sitepolish'], ['noscroll'], ['bleed'], ['consistency']];
const bad = [];
for (const [n, ...a] of T) {
  console.log(`\n=== tests/${n}.cjs (${process.env.BROWSER || 'chromium'}) ===`);
  const r = spawnSync('node', [join('tests', n + '.cjs'), ...a], { cwd: root, stdio: 'inherit' });
  if (r.status !== 0) bad.push(n);
}
console.log('\n' + (bad.length ? 'FAILED: ' + bad.join(', ') : 'all test files passed'));
process.exit(bad.length ? 1 : 0);
