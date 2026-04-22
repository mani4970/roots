import fs from 'fs';
import path from 'path';

const dir = path.join(process.cwd(), 'lib', 'locales');
const files = ['ko.ts', 'en.ts', 'de.ts'];
const regex = /^\s*"([^"]+)":/gm;
const sets = Object.fromEntries(files.map((file) => {
  const src = fs.readFileSync(path.join(dir, file), 'utf8');
  return [file, new Set([...src.matchAll(regex)].map((m) => m[1]))];
}));
const base = sets['ko.ts'];
let ok = true;
for (const file of files.slice(1)) {
  const cur = sets[file];
  const missing = [...base].filter((k) => !cur.has(k));
  const extra = [...cur].filter((k) => !base.has(k));
  if (missing.length || extra.length) {
    ok = false;
    console.error(`Locale mismatch in ${file}`);
    if (missing.length) console.error('Missing:', missing.slice(0, 20).join(', '));
    if (extra.length) console.error('Extra:', extra.slice(0, 20).join(', '));
  }
}
if (!ok) process.exit(1);
console.log('Locale keys are aligned.');
