const fs = require('fs');
const path = require('path');
const vm = require('vm');
const ts = require('typescript');
const srcPath = path.join(process.cwd(), 'lib', 'i18n.ts');
const src = fs.readFileSync(srcPath, 'utf8');
const out = ts.transpileModule(src, { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020 } }).outputText;
const sandbox = { exports: {}, module: { exports: {} }, require, console };
vm.runInNewContext(out, sandbox, { filename: 'i18n.js' });
const mod = Object.keys(sandbox.module.exports).length ? sandbox.module.exports : sandbox.exports;
const T = mod.T;
const SUPPORTED_LANGS = mod.SUPPORTED_LANGS;
const LANG_META = mod.LANG_META;
const FALLBACK_LANG = mod.FALLBACK_LANG;
const outDir = path.join(process.cwd(), 'lib', 'locales');
fs.mkdirSync(outDir, { recursive: true });
const keys = Object.keys(T);
for (const lang of SUPPORTED_LANGS) {
  const lines = keys.map((key) => `  ${JSON.stringify(key)}: ${JSON.stringify(T[key][lang] ?? T[key][FALLBACK_LANG] ?? key)},`).join('\n');
  fs.writeFileSync(path.join(outDir, `${lang}.ts`), `import type { LocaleDict } from './types';\n\nexport const ${lang}: LocaleDict = {\n${lines}\n};\n`);
}
const types = `export const SUPPORTED_LANGS = ${JSON.stringify(SUPPORTED_LANGS)} as const;\nexport type Lang = typeof SUPPORTED_LANGS[number];\nexport const FALLBACK_LANG: Lang = ${JSON.stringify(FALLBACK_LANG)};\nexport const LANG_META = ${JSON.stringify(LANG_META, null, 2)} as const;\n\nexport type LocaleKey =\n${keys.map((k) => `  | ${JSON.stringify(k)}`).join('\n')};\n\nexport type LocaleDict = Record<LocaleKey, string>;\n`;
fs.writeFileSync(path.join(outDir, 'types.ts'), types);
fs.writeFileSync(path.join(outDir, 'index.ts'), `export { ko } from './ko';\nexport { en } from './en';\nexport { de } from './de';\nexport { SUPPORTED_LANGS, FALLBACK_LANG, LANG_META, type Lang, type LocaleKey as TKey, type LocaleDict } from './types';\n`);
fs.writeFileSync(path.join(outDir, 'keys.json'), JSON.stringify(keys, null, 2) + '\n');
const frLines = keys.map((key) => `  ${JSON.stringify(key)}: ${JSON.stringify(T[key]['en'] ?? T[key]['ko'] ?? key)},`).join('\n');
fs.writeFileSync(path.join(outDir, 'fr.template.ts.txt'), `// Copy this file to fr.ts and translate the values.\n\nexport const fr = {\n${frLines}\n};\n`);
fs.writeFileSync(path.join(outDir, 'README.md'), `# locale structure\n\n- Source locale files: ko.ts, en.ts, de.ts\n- Add the same key to every locale file when adding a new UI string.\n- Run \`npm run locales:check\` to verify key alignment.\n- To add French later, copy \`fr.template.ts.txt\` to \`fr.ts\`, translate it, then register it in \`lib/locales/index.ts\` and \`lib/i18n.ts\`.\n`);
