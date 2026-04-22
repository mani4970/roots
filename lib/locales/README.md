# locale structure

- Source locale files: ko.ts, en.ts, de.ts
- Add the same key to every locale file when adding a new UI string.
- Run `npm run locales:check` to verify key alignment.
- To add French later, copy `fr.template.ts.txt` to `fr.ts`, translate it, then register it in `lib/locales/index.ts` and `lib/i18n.ts`.
