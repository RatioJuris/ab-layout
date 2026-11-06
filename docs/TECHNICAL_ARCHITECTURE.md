# Technical Architecture

*Developed by PrajnaBytes International Private Limited and RatioJuris · GPL-3.0-or-later*

## 1. Existing architecture (3.1.1, audited before changes)

A static Office add-in served by **GitHub Pages** from the `main` branch root:
`manifest.xml`, `web/taskpane.html|js`, `web/styles.css`,
`layouts/layouts.json`, `assets/` icons, `index.html` website. No build step,
no package.json, no tests. Function: set page size and margins from presets.

Defects found (all verified):

| Defect | Effect |
|---|---|
| `layouts.json` began with a `/* */` comment (invalid JSON); the live file was served that way | Panel always showed "Failed to load layouts" — **nothing worked** |
| Manifest icon URLs pointed to `assets/icons/` (folder does not exist) | Missing icons |
| Microsoft validator: "The manifest is not valid" (VersionOverridesV1_1 for a task pane, QuickAccessToolbar) | Unreliable installation |
| Two `Office.onReady` handlers filled the dropdown with different value schemes | Apply could silently do nothing |
| Ribbon `ExecuteFunction` handlers never called `event.completed()`; function file was the task pane | Ribbon buttons hang |
| `section.pageSetup` used without checking WordApiDesktop 1.3 | Fails in Word for the web without explanation |
| Affidavit preset on a one-section document put the 16.5 cm stamp-paper margin on **every** page | Wrong output |
| Undo copied section 1's settings onto all sections | Wrong restore for multi-section documents |
| Right-click disabled in the pane | Accessibility (paste) |

## 2. What was retained

- Hosting on GitHub Pages and **all URLs** (`web/taskpane.html` is the entry
  every installed manifest uses), add-in **Id**, name "AB Layout", identity
  "Advocate Benefit Layout".
- No build step: the repository is served as-is.
- `layouts/layouts.json` with all original presets and layout ids; the
  validation rules from the 3.x engine (`rj-pb-layouts.js`).
- Colour tokens and automatic dark mode in `styles.css`; the website.

## 3. Architecture (4.0.0)

```
web/
  taskpane.html        entry page (URL unchanged)
  taskpane.js          UI controller (state + event wiring only)
  styles.css
  commands.html        function file required by the manifest
  core/                pure logic, no Office dependency, unit-tested in Node
    rj-pb-types.js         JSDoc types (ParagraphSnapshot, FormatChange, Finding…)
    rj-pb-units.js         cm/pt/lines; rounding to Word's 1/20 pt (idempotency)
    rj-pb-fonts.js         protected fonts (Kruti Dev & other legacy, symbol), script detection, OOXML font scan
    rj-pb-classify.js      paragraph kinds: body, centred, right, tabbed, quote, short, list, table, heading, toc, empty
    rj-pb-profiles.js      built-in profiles, validation, "match" keyword
    rj-pb-plan.js          snapshot + profile -> exact FormatChange list; blank-line candidates; delete-safety check
    rj-pb-diagnostics.js   Check Document findings
    rj-pb-numbering.js     typed-number gaps/repeats (report only)
    rj-pb-verify.js        before/after text comparison; fingerprint
    rj-pb-krutidev.js      Kruti Dev <-> Unicode (+ per-word decision)
    rj-pb-layouts.js       page presets; per-section margin planning
    rj-pb-attribution.js   attribution shown in the UI
  word/                Office.js adapters (all take an injected context)
    rj-pb-capabilities.js  requirement-set detection
    rj-pb-reader.js        document -> snapshots (read-only)
    rj-pb-writer.js        FormatChange -> Word, chunked, with per-paragraph fallback
    rj-pb-hindi.js         word-by-word conversion inside Word
    rj-pb-service.js       complete workflows (inspect, preview, apply+verify, restore, page, hindi)
    rj-pb-errors.js        plain-language errors; logging without document text
  ui/
    rj-pb-dom.js           safe DOM helpers (textContent only), accessible tabs
    rj-pb-render.js        result views
    rj-pb-profile-store.js custom profiles in localStorage
```

Data flow for Clean Document:

```
read (reader) -> snapshots -> classify -> plan (only differing properties)
   -> preview shown -> user presses Apply
   -> re-read; fingerprint must match the preview, else nothing is applied
   -> apply in chunks of 100 (locked paragraph -> retried one by one, reported)
   -> optional blank-line removal (each checked in OOXML first)
   -> re-read texts and compare with before -> report + restore point
```

### Safety properties (enforced by tests)

- Formatting code can only set: font name, font size, alignment, line
  spacing, space before/after, first-line/left/right indent. No text APIs.
- Plans are idempotent (second run = 0 changes) for every built-in profile.
- Legacy-font, symbol-font, Indian-language and Urdu text is never re-fonted;
  mixed-font paragraphs are scanned (OOXML) and treated as protected if the
  scan fails.
- Document text is inserted into the UI with `textContent` only (a test
  injects `<img onerror>` text and checks it does not run).
- Errors are logged with codes only, never document text.

### Project website

`index.html` (GitHub Pages home) with `site/rj-pb-site.css` and
`site/rj-pb-site.js`. No framework, no external fonts or CDNs. It shows the
PrajnaBytes emblem (`assets/prajnabytes-emblem.svg`, animated, static under
reduced motion) and logo, reads page presets from `layouts/layouts.json`, and
includes a live Kruti Dev ↔ Unicode converter that imports the add-in's own
`web/core/rj-pb-krutidev.js` and runs entirely in the visitor's browser.

## 4. Word API dependencies

See [WORD_COMPATIBILITY.md](./WORD_COMPATIBILITY.md). Baseline WordApi 1.3;
optional WordApi 1.4 (comments), 1.6 (tracked changes), WordApiDesktop 1.3
(page setup), each detected at run time.

## 5. Local processing and security

- No backend, database, account, analytics or AI service.
- All processing in the task pane (the user's WebView2 / browser).
- Custom profiles (settings only) in `localStorage` of that computer.
- Permissions: `ReadWriteDocument` (needed to apply formatting).
- Only external script: Microsoft's `office.js` (tested: no other external
  script in the task pane).

## 6. Testing

| Layer | How | Command |
|---|---|---|
| Core logic | Node test runner | `npm test` |
| Word adapters | In-memory fake Word (queued writes, locked paragraphs, failures) | `npm test` |
| Task pane UI | Real `taskpane.html` in Microsoft Edge (puppeteer-core) with fake office.js | `npm run test:ui` |
| Types | TypeScript `checkJs` with `@types/office-js` | `npm run typecheck` |
| Manifest | Microsoft validator | `npm run validate:manifest` |
| Real Word | Manual checklist | see DEVELOPMENT.md |

The fake Word cannot prove real Word behaviour; see WORD_COMPATIBILITY.md.

## 7. Deployment and infrastructure

Unchanged: push to `main` → GitHub Pages serves the files. Nothing to build.
`package.json` / `node_modules` are development-only (`node_modules` is
git-ignored). Office caches add-in files; the version query strings
(`?v=4.0.0`) on the task pane's CSS/JS help after an update.

**No new infrastructure, no paid service.**

## 8. Licensing

GPL-3.0-or-later with GPLv3 section 7 additional terms (attribution, marking
of modified versions, names) — see `NOTICE`. The Kruti Dev → Unicode algorithm
is ported from LTRC IIIT Hyderabad's GPL-3.0 `kru2uni`.
