// Rewrites the generated block of README.md (between the facts markers) from scripts/facts.mjs.
import { readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { root, factsMarkdown, sizes } from './facts.mjs';

export function updateReadme() {
  const f = join(root, 'README.md');
  let s = readFileSync(f, 'utf8');
  const a = '<!-- facts:start -->', b = '<!-- facts:end -->';
  const block = `${a}\n${factsMarkdown()}\n${b}`;
  if (s.includes(a) && s.includes(b)) s = s.slice(0, s.indexOf(a)) + block + s.slice(s.indexOf(b) + b.length);
  else s = s.replace('## Install', `## Size, version and browser support\n\n${block}\n\n## Install`);
  const z = sizes();
  s = s.replace(/^- Core \+ all modules: .*$/m, `- Core + all modules: ${z.full.gz} KB gzip (core-only ${z.core.gz} KB), no dependencies, jQuery optional`);
  // size badge from the real build, so it never goes stale or depends on a third-party size service
  s = s.replace(/^\[!\[bundle size\]\(.*$/m, `[![size](https://img.shields.io/badge/gzip-${z.core.gz}%20KB%20core%20%7C%20${z.full.gz}%20KB%20all-brightgreen)](#size-version-and-browser-support)`);
  writeFileSync(f, s);
}
if (process.argv[1] && process.argv[1].endsWith('readme.mjs')) updateReadme();
