<p align="center"><img src="assets/icon-128.png" width="96" height="96" alt="AB Layout logo"></p>

# AB Layout (Advocate Benefit Layout)

![Platform](https://img.shields.io/badge/Platform-Microsoft%20Word%20Add--in-blue)
![License](https://img.shields.io/badge/License-GPL--3.0--or--later-green)
![Status](https://img.shields.io/badge/Status-4.0.0%20%E2%80%94%20pending%20real--Word%20validation-orange)

**Developed by PrajnaBytes International Private Limited and RatioJuris.**

A free Microsoft Word add-in that helps advocates in India spend less time
fighting document formatting. It checks a document for formatting problems
and filing slip-ups, makes formatting consistent **without changing a single
word**, converts Hindi between Kruti Dev and Unicode, and sets paper size and
margins.

No AI. No account. No subscription. Your document stays in Word.

---

## Who it is for

Advocates in district courts, High Courts and the Supreme Court; juniors
preparing drafts for seniors; independent practitioners and chambers —
including those with one ordinary Windows PC and no budget for legal software.

## Main uses

- A petition assembled from old files and PDFs has four fonts and three
  spacings → **Clean Document** makes it consistent, keeps the cause title,
  VERSUS, party and signature lines, tables, quotations and Hindi as they are,
  and confirms afterwards that the text is unchanged.
- Before filing → **Check Document** finds gaps in paragraph numbers,
  `____`/`XXX` blanks, highlights, comments, unaccepted tracked changes, old
  Hindi fonts and the wrong paper size, and jumps to each one.
- Hindi pleading typed in Kruti Dev must be in Unicode → **Hindi** tab
  converts it inside Word, word by word, leaving English untouched.

## Features (4.0.0)

| | |
|---|---|
| **Check Document** | Inconsistent font / size / line spacing / alignment / indents / paragraph spacing; typed-number gaps and repeats (reported, never auto-renumbered); legacy fonts; blanks and placeholders; highlights; coloured text; comments; tracked changes; paper size (desktop); groups of blank lines; space-typed indents; manual line breaks. |
| **Clean Document** | 7 profiles incl. "Make Consistent (match this document)", Supreme Court A4 2020 style, double-spaced 14 pt; preview; stale-document guard; text verification; Restore; optional safe blank-line removal. |
| **Custom profiles** | Saved on the computer; share by copy/paste. |
| **Kruti Dev ↔ Unicode** | Selection or whole document; preview; exact round-trip check for Unicode → Kruti Dev. |
| **Page layout** | A4 / legal / affidavit presets with sources (Word for Windows/Mac). |

Profiles and presets are conveniences, **not** guarantees of compliance with
any court's rules.

## Requirements

- Microsoft 365, Word 2019 or later (Windows/Mac), or Word for the web.
- Internet connection to open the panel (files are served from GitHub Pages).
- Word 2007/2010/2013 cannot run add-ins.

## Installation

1. Download `manifest.xml` from <https://ratiojuris.github.io/ab-layout/>.
2. Word → **Insert → Add-ins → My Add-ins → Upload My Add-in** → choose the file.
3. Open the **AB Layout** ribbon tab → **AB Layout**.

Full instructions: [docs/USER_GUIDE.md](docs/USER_GUIDE.md).

## Word for Windows and Word for the web

Everything works in both, except **paper size and margins**, which Word only
lets add-ins change in recent desktop Word (WordApiDesktop 1.3). In Word for
the web the Page tab explains how to do it with Word's own menus. Comment and
tracked-change counts need newer Word versions and are reported as "could not
be checked" otherwise. Details: [docs/WORD_COMPATIBILITY.md](docs/WORD_COMPATIBILITY.md).

## Development

```bash
npm install
npm run check        # type check + 56 unit tests
npm run test:ui      # task pane in Microsoft Edge with a simulated document
npm run validate:manifest
```

No build step: GitHub Pages serves the repository as-is. See
[docs/DEVELOPMENT.md](docs/DEVELOPMENT.md) and
[docs/TECHNICAL_ARCHITECTURE.md](docs/TECHNICAL_ARCHITECTURE.md).

## Limitations (honest status)

- Tested with unit tests, Microsoft's manifest validator and a browser test
  of the real task pane in Microsoft Edge with a **simulated** Word document.
  **Not yet tested inside real Word** (desktop or web) — see the manual
  checklist in DEVELOPMENT.md.
- Restore cannot bring back the exact mix of fonts inside a paragraph that
  had several; removed blank lines are not restored (use Undo).
- Typed paragraph numbers are checked, not fixed.
- Only Kruti Dev is converted (not Chanakya, DevLys or regional legacy fonts).
- Needs internet to open the panel.

## Roadmap

[docs/PRODUCT_ROADMAP.md](docs/PRODUCT_ROADMAP.md) · Research:
[docs/PRODUCT_RESEARCH.md](docs/PRODUCT_RESEARCH.md) ·
Workflows: [docs/ADVOCATE_WORKFLOWS.md](docs/ADVOCATE_WORKFLOWS.md)

## Privacy

AB Layout has no server, no account and no analytics. Documents are processed
inside Word; their text is never sent, stored or logged. The only external
code is Microsoft's `office.js`.

## License

Copyright (C) 2026 PrajnaBytes International Private Limited and RatioJuris.

Free software under the **GNU General Public License v3.0 or later**
([LICENSE](LICENSE)), with additional terms under GPLv3 section 7 in
[NOTICE](NOTICE): the attribution "Developed by PrajnaBytes International
Private Limited and RatioJuris" must be preserved (including in the task
pane), modified versions must be marked as such, and no rights are granted to
the names "AB Layout", "RatioJuris" or "PrajnaBytes". Versions up to 3.1.1 were
published under Apache-2.0.

Kruti Dev → Unicode conversion is ported from
[kru2uni](https://github.com/ltrc/kru2uni) (LTRC, IIIT Hyderabad, GPL-3.0).

AB Layout is not legal advice.
