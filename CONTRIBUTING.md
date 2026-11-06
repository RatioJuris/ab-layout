# 🤝 Contributing to AB Layout

Thank you for your interest in contributing to **AB Layout (Advocate Benefit Layout)**.

This is the guide for **developers and contributors**: how the project is built, tested, run in Word and released. If you only want to *use* AB Layout, see the [README](./README.md) and the [User Guide](./docs/USER_GUIDE.md).

**Developed by:** PrajnaBytes International Private Limited and RatioJuris

---

## 📌 Before You Start

* ⭐ Star the repository
* 📖 Read the [README](./README.md) to understand what advocates see
* 🔍 Check existing Issues / Pull Requests
* 🧭 Skim [docs/TECHNICAL_ARCHITECTURE.md](./docs/TECHNICAL_ARCHITECTURE.md) (module map and data flow)

---

## 🧾 Rules that protect advocates' documents

These are not style preferences — every change must keep them true:

* Formatting code never changes document **text**. Only the properties in `FormatChange` (font name/size, alignment, line spacing, space before/after, indents) may be written.
* Never send document content anywhere, never store it, never log it.
* Anything uncertain is **reported**, not guessed.
* Legacy-font (Kruti Dev etc.), symbol-font, Indian-language and Urdu text is never re-fonted while formatting.
* Every change to the document happens only after a preview and the user's confirmation.
* Profiles and presets are conveniences — never describe them as guaranteeing court compliance. Cite official sources where a preset follows one.

---

## 🧱 How the project is built

- **No build step.** GitHub Pages serves the repository as-is (`main` branch). Source is plain ES2020 JavaScript modules with JSDoc types, checked by TypeScript (`checkJs`); nothing is compiled or bundled.
- **No backend, database, account or AI service.** Everything runs in the Word task pane.
- `web/taskpane.html` is the URL every installed manifest points to — **never rename or move it**. The add-in `<Id>` in `manifest.xml` must never change.

```
manifest.xml             add-in manifest (Id, URLs on GitHub Pages)
index.html, site/        project website (live Kruti Dev converter, PrajnaBytes branding)
layouts/layouts.json     paper/margin presets (must stay valid JSON)
assets/                  icons (SVG masters + rendered PNGs), PrajnaBytes logos
web/
  taskpane.html|js       task pane entry + UI controller
  styles.css
  commands.html          function file required by the manifest
  core/rj-pb-*.js        pure logic, no Office objects (unit-tested in Node)
  word/rj-pb-*.js        all Office.js access, through an injected context/run
  ui/rj-pb-*.js          DOM helpers, rendering, profile storage
tests/                   unit, Word-adapter (fake Word) and browser UI tests
scripts/                 icons, dev server, local manifest
docs/                    user guide, research, compatibility, architecture, roadmap
```

**Naming and headers:** files in `web/core`, `web/word` and `web/ui` use the `rj-pb-` prefix. Every source file starts with the standard header (attribution, copyright, `SPDX-License-Identifier: GPL-3.0-or-later`, and the GPLv3 section 7 pointer). `tests/attribution.test.js` fails if these are missing.

---

## ⚙️ Setup

Requirements: **Node.js 20+** and **Microsoft Edge** (for the UI tests).

```bash
git clone https://github.com/YOUR_USERNAME/ab-layout.git
cd ab-layout
npm install
```

Dev dependencies only — nothing ships to users: TypeScript, @types/office-js, @types/node, puppeteer-core (drives your installed Edge; downloads no browser), @resvg/resvg-js (icon rendering).

| Command | What it does |
|---|---|
| `npm test` | Unit tests and Word-adapter tests (Node test runner) |
| `npm run test:ui` | Opens the real `web/taskpane.html` in Edge with a simulated Word document and clicks through every tab |
| `npm run typecheck` | TypeScript check of all JavaScript |
| `npm run check` | typecheck + tests |
| `npm run validate:manifest` | Microsoft's manifest validator (needs internet) |
| `npm run icons` | Re-render PNG icons and `favicon.ico` from `assets/icon.svg` / `assets/icon-small.svg` |
| `npm run serve` | Static server on http://localhost:3000 |
| `npm run serve -- --https` | HTTPS server for sideloading into Word |
| `npm run manifest:local` | Writes `manifest.local.xml` pointing to https://localhost:3000 |

---

## 🛠️ Development Workflow

```bash
git checkout -b feature/your-feature-name
# make changes
npm run check && npm run test:ui
git commit -m "Add: short description"
git push origin feature/your-feature-name
```

Then open a **Pull Request** describing what you changed and why, and which environments you tested in.

### Guidelines

* ✔ Keep changes **small and focused**; write clear commit messages
* ✔ Keep logic in `web/core` (testable) and Office calls in `web/word`
* ✔ Add or update tests for every behaviour change
* ✔ Plain, non-technical wording in anything an advocate reads
* ❌ No new frameworks, build systems, servers or paid services without discussion
* ❌ No `innerHTML` with document text (use `textContent`)
* ❌ No hardcoded environment-specific URLs other than the GitHub Pages base in the manifest

---

## 🧪 Testing

### Automated

```bash
npm run check      # 0 type errors, all unit tests pass
npm run test:ui    # task pane in Edge with a simulated document
npm run validate:manifest
```

The fake Word used in tests imitates the API (queued writes, locked paragraphs, failures) but **does not prove behaviour in real Word**.

### In real Word (sideloading)

**Production files:** upload `manifest.xml` in Word (**Insert → Add-ins → My Add-ins → Upload My Add-in**). It loads from GitHub Pages, so changes must be pushed to `main` first. After an update, reload Word for the web with **Ctrl+F5**; if old files persist, remove and re-upload the add-in (Office caches add-in files).

**Local development copy:**

```bash
npx office-addin-dev-certs install     # once; trusts a localhost certificate
npm run manifest:local
npm run serve -- --https
```

Upload `manifest.local.xml` (Word for Windows: Insert → Add-ins → My Add-ins → Upload My Add-in; Word for the web: Insert → Add-ins → More Add-ins → My Add-ins → Upload My Add-in). It appears as **"AB Layout (Dev)"** with its own Id, next to the installed version.

### Manual checklist (Word for Windows **and** Word for the web)

Use a copy of a realistic document (`tests/helpers/rj-pb-fixtures.js` describes a suitable synthetic petition):

1. Panel opens; footer shows the platform and the attribution.
2. **Check Document:** findings appear; **Show** selects the right paragraph.
3. **Clean → Petition / Application → Preview → Apply:** "Text check passed"; cause title centred with its size kept; VERSUS centred; party lines with tabs unchanged; signature right-aligned; quotation indent kept; Kruti Dev and Mangal paragraphs keep their fonts; tables get the font only.
4. Format → Paragraph shows line spacing **"Multiple 1.5"** (confirms points ÷ 12).
5. Preview again → **"Nothing to change"** (idempotency in real Word).
6. **Restore** → previous formatting back. Ctrl+Z after Apply → note how many presses are needed.
7. Edit a word after Preview, then Apply → "document changed" message, nothing applied.
8. A paragraph in a locked content control → reported as not changed.
9. **Hindi:** select a Kruti Dev sentence containing an English word → convert → English untouched, bold kept, font Mangal. Convert back.
10. **Page** (Windows): Supreme Court A4 → Layout → Margins shows 4 cm / 2 cm. Word for the web: Page tab shows the explanation.
11. A 100+ page document: Check and Apply complete; note the time.

Record results in [docs/WORD_COMPATIBILITY.md](./docs/WORD_COMPATIBILITY.md) under "What has actually been tested". Screenshots of real-Word runs go in `docs/`.

---

## 🚀 Ways to Contribute

### 🏛 Add a court layout

Edit `/layouts/layouts.json`:

* Page size and margins **in points** (1 cm = 28.35 pt)
* Clear naming
* A `note` citing the official source (circular / rule number and date). Unsourced presets must be described as conventions, never as court requirements.
* The file must stay **valid JSON** (no comments) — `npm test` checks this.

### 🔤 Add a legacy font

Protected font names live in `web/core/rj-pb-fonts.js`. Converters for other legacy fonts (Chanakya, DevLys, regional scripts) should follow `rj-pb-krutidev.js`: per-word decisions, refuse anything not convertible exactly, and tests with real legal vocabulary.

### 🐛 Report bugs

Open an Issue with: steps to reproduce, expected and actual behaviour, **Word version and platform** (Windows / Mac / web), and a screenshot of the panel. Never attach a client's document — reproduce with dummy text.

### 💡 Suggest features

Open an Issue labelled `enhancement` and describe the advocate's workflow it helps. See [docs/PRODUCT_ROADMAP.md](./docs/PRODUCT_ROADMAP.md) for what is planned and what is deliberately out of scope (AI, accounts, subscriptions, cloud storage).

### 🎨 Improve UI, accessibility or documentation

Task pane: `web/taskpane.html`, `web/styles.css`, `web/ui/`. Keep keyboard navigation and screen-reader labels working. User-facing docs: `README.md`, `docs/USER_GUIDE.md`.

---

## 📦 Releasing

1. Update the version in `web/core/rj-pb-attribution.js` (`ATTRIBUTION.version`), the `?v=` query strings in `web/taskpane.html` and `index.html`, `package.json`, `layouts/layouts.json` (`_meta.version`) and the manifest `<Version>` (four parts, e.g. `4.0.1.0`).
2. `npm run check && npm run test:ui && npm run validate:manifest`
3. Run the manual checklist in Word for Windows and Word for the web.
4. Push to `main` — GitHub Pages deploys automatically (check with `gh run list`). Verify the live files, then reload Word with Ctrl+F5.

---

## 💬 Communication

* Be respectful and constructive
* Ask questions if unsure
* Discussions are encouraged

---

## 📄 License

By contributing, you agree that your contributions will be licensed under the **GNU General Public License v3.0 or later**, together with the additional terms in [NOTICE](./NOTICE) (GPLv3 section 7: preservation of the attribution "Developed by PrajnaBytes International Private Limited and RatioJuris", marking of modified versions, and no rights to the project names). Do not remove or alter file headers or the task pane attribution.

---

## 🙌 Acknowledgement

Every contributor helps make this project better. Thank you for contributing to **AB Layout** ⚖️

---

**Developed by:** PrajnaBytes International Private Limited and RatioJuris
**Maintained by:** Bee Isrg Rajan — 🔗 https://github.com/isrgrajan
