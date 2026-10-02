# Russian and English

The website and desktop frontend share `shared/i18n`. `LanguageProvider` owns the selected locale; the root layout provides the initial website locale from the cookie or Accept-Language. The choice persists in `apex_lang`, synchronises across tabs, and updates the document language. Switching locale does not change telemetry or lesson progress.

## Copy

- `messages/en.json` and `messages/ru.json` contain the original structured interface dictionary, available through `useLang().t`.
- `messages/catalog/en.json` and `ru.json` contain matching translation keys for the extended interface, all 29 Academy lessons, diagnostics and desktop messages.
- `messages/catalog/sources.json` maps those keys to legacy source strings. This compatibility layer lets historical stored diagnostics display in either language without rewriting saved data.
- New copy should use a descriptive catalog key, with an entry in all three files, rendered through `useCopy()`. Keep whole sentences together. Templates use numbered placeholders such as `{0}`; existing diagnostic templates are resolved by the presentation adapter.
- Translate a lesson paragraph before parsing Markdown or truncating a preview. Keep line breaks in both translations.
- Never pass names, filenames, paths, tokens, raw chat messages or telemetry payloads through the translator. Translate labels around them.
- Locale-aware dates use `locales[lang]`. Prefer count-first labels where a count would otherwise need grammatical inflection.

The source text remains a compatibility identifier, not an alternative visible language. Edit visible wording in the English and Russian catalogs together. The Russian Academy copy has also been revised to match the English explanations, including corrections to aerodynamic balance and overcut strategy and removal of unsupported universal tyre targets.

## Requests

API message responses use `localisedJson` and set `Content-Language`; data fields remain untouched. Language selection is explicit query, then cookie, then Accept-Language. Coaching API requests additionally honour the body locale. Changing language cancels in-flight replies.

## Verification

```sh
npm run test:i18n
npm run build
cd desktop
npm run build
```

The localisation checks cover dictionary parity, placeholders, all Academy content, generated diagnostic/comparison messages, compound messages, locale negotiation and preservation of technical strings. Browser checks should cover switching with a loaded lap and an open lesson, navigating between pages, and reloading. The desktop build above validates the React frontend; producing the native installer also requires the Rust/Tauri toolchain.
