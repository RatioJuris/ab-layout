# Development

*Developed by PrajnaBytes International Private Limited and RatioJuris · GPL-3.0-or-later*

## Principles

- **No build step.** The repository is served as-is by GitHub Pages. Source
  is plain ES2020 JavaScript modules with JSDoc types, checked by TypeScript
  (`checkJs`) — nothing is compiled.
- Pure logic in `web/core/` (no Office objects) → unit-testable in Node.
- All Office.js access in `web/word/`, through an injected `context` / `run`.
- UI in `web/taskpane.js` + `web/ui/`.
- File naming: `rj-pb-*.js` in `core/`, `word/`, `ui/`; standard header with
  attribution, SPDX licence and the GPLv3 section 7 pointer (enforced by
  `tests/attribution.test.js`).

See [TECHNICAL_ARCHITECTURE.md](./TECHNICAL_ARCHITECTURE.md) for the module map.

## Setup

Requirements: Node.js 20+ (developed with Node 26), Microsoft Edge for UI tests.

```bash
npm install
```

Dev dependencies only (nothing ships to users): TypeScript, @types/office-js,
@types/node, puppeteer-core (drives installed Edge; downloads no browser),
@resvg/resvg-js (icon rendering).

## Commands

| Command | What it does |
|---|---|
| `npm test` | Unit + Word-adapter tests (Node test runner) |
| `npm run test:ui` | Opens `web/taskpane.html` in Edge with a simulated Word document and clicks through every tab |
| `npm run typecheck` | TypeScript check of all JS |
| `npm run check` | typecheck + tests |
| `npm run validate:manifest` | Microsoft's manifest validator (needs internet) |
| `npm run icons` | Re-render PNG icons and `favicon.ico` from `assets/icon.svg` / `icon-small.svg` |
| `npm run serve` | Static server on http://localhost:3000 |
| `npm run serve -- --https` | HTTPS server for sideloading (needs dev certificates) |
| `npm run manifest:local` | Writes `manifest.local.xml` pointing to https://localhost:3000 |

## Running in real Word (sideloading)

### Production files (simplest)

Upload `manifest.xml` (Insert → Add-ins → Upload My Add-in). It loads from
GitHub Pages, so changes must be pushed to `main` first.

### Local development copy

```bash
npx office-addin-dev-certs install     # once; trusts a localhost certificate
npm run manifest:local
npm run serve -- --https
```

Then upload `manifest.local.xml`:

- **Word for Windows:** Insert → Add-ins → My Add-ins → Upload My Add-in
  (or place the manifest in a trusted shared-folder catalog).
- **Word for the web:** Insert → Add-ins → More Add-ins → My Add-ins →
  Upload My Add-in.

The dev copy is called "AB Layout (Dev)" and has a different Id.

## Manual test checklist (real Word)

Use a **copy** of a real-looking document (tests/helpers/rj-pb-fixtures.js
describes a suitable synthetic petition), in both Word for Windows and Word
for the web:

1. Panel opens; footer shows platform and attribution.
2. Check Document: findings appear; **Show** selects the right paragraph.
3. Clean → Petition / Application → Preview → Apply: "Text check passed";
   cause title centred and its size kept; VERSUS centred; party lines with
   tabs unchanged; signature right-aligned; quotation indent kept; Kruti Dev
   and Mangal paragraphs keep their fonts; table font changed only.
4. Format → Paragraph shows Line spacing "Multiple 1.5" (confirms the
   points ÷ 12 assumption).
5. Preview again → "Nothing to change" (idempotency in real Word).
6. Restore → previous formatting back. Ctrl+Z after Apply → note how many presses.
7. Edit a word after Preview, then Apply → "document changed" message.
8. Protect a paragraph in a locked content control → reported as not changed.
9. Hindi: select a Kruti Dev sentence with an English word → convert →
   English untouched, bold kept, font Mangal. Convert back.
10. Page (Windows): A4 Supreme Court layout → Layout → Margins shows 4 cm /
    2 cm. Word for the web: Page tab shows the explanation.
11. Large document (100+ pages): Check and Apply complete; time noted.

Record results in WORD_COMPATIBILITY.md ("What has actually been tested").

## Releasing

1. Update `ATTRIBUTION.version` (`web/core/rj-pb-attribution.js`), the
   `?v=` query strings in `web/taskpane.html`, `package.json` version and the
   manifest `<Version>` (four parts).
2. `npm run check && npm run test:ui && npm run validate:manifest`.
3. Run the manual checklist.
4. Push to `main` (GitHub Pages deploys automatically).
