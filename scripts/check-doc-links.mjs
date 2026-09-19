import { execFileSync } from 'node:child_process';
import { existsSync, readFileSync, statSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
const files = [...new Set([
  ...execFileSync('git', ['diff', '--name-only', 'origin/main'], { encoding: 'utf8' }).split('\n'),
  ...execFileSync('git', ['ls-files', '--others', '--exclude-standard'], { encoding: 'utf8' }).split('\n'),
])].filter(file => file.endsWith('.md') && existsSync(file));
const errors = [];
let checked = 0;
for (const file of files) {
  const source = readFileSync(file, 'utf8');
  const links = [...source.matchAll(/\]\(([^)]+)\)|(?:src|href)="([^"]+)"/g)];
  for (const match of links) {
    const target = (match[1] ?? match[2]).replace(/^<|>$/g, '');
    if (/^(https?:|mailto:)/.test(target)) continue;
    const [path, anchor] = target.split('#');
    const absolute = path ? resolve(dirname(file), decodeURIComponent(path)) : resolve(file);
    checked++;
    if (!existsSync(absolute)) { errors.push(`${file}: missing ${target}`); continue; }
    if (anchor && absolute.endsWith('.md') && statSync(absolute).isFile()) {
      const text = readFileSync(absolute, 'utf8');
      const headings = [...text.matchAll(/^#+ (.+)$/gm)].map(m => m[1].toLowerCase().replace(/[^\p{L}\p{N}_ -]/gu, '').replace(/ /g, '-'));
      if (!headings.includes(decodeURIComponent(anchor))) errors.push(`${file}: missing anchor ${target}`);
    }
  }
}
console.log(`${checked} relative links checked across ${files.length} changed Markdown files`);
if (errors.length) { console.error(errors.join('\n')); process.exitCode = 1; }
