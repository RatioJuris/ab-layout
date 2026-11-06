# Word Compatibility

*Developed by PrajnaBytes International Private Limited and RatioJuris · GPL-3.0-or-later*

## Minimum requirements

| | Requirement |
|---|---|
| Manifest minimum | WordApi 1.3 |
| Windows | Word 2019 or later, Word 2021/2024, Microsoft 365 (all use WebView2) |
| Mac | Word 2019 or later / Microsoft 365 |
| Web | Word for the web (any modern browser) |
| **Not supported** | Word 2007, 2010, 2013 (no add-in support); Word 2016 is out of support |

Validated with Microsoft's validator (`npx office-addin-manifest validate manifest.xml`):
"The manifest is valid", eligible for Word 2019+ on Windows, Microsoft 365,
Mac, iPad and Word on the web.

## Capability matrix

Detection uses `Office.context.requirements.isSetSupported(...)` at run time,
never the browser or OS name.

| Feature | API used | Requirement set | Word Windows/Mac (M365, 2019+) | Word for the web | Fallback when unavailable |
|---|---|---|---|---|---|
| Read paragraphs, fonts, spacing | Paragraph, Font | WordApi 1.1/1.3 | Yes | Yes | Panel explains Word is too old |
| List/table detection | `isListItem`, `tableNestingLevel` | WordApi 1.3 | Yes | Yes | — |
| Mixed-font inspection | `Paragraph.getOoxml()` | WordApi 1.1 | Yes | Yes | Paragraph treated as protected |
| Apply formatting | Paragraph/Font setters | WordApi 1.1 | Yes | Yes | — |
| Remove blank lines | `getOoxml()`, `delete()` | WordApi 1.1 | Yes | Yes | — |
| Show paragraph | `select()` | WordApi 1.1 | Yes | Yes | — |
| Count comments | `Body.getComments()` | WordApi 1.4 | M365 / 2024: yes; 2019/2021 VL: no | Yes | "Could not be checked" |
| Count tracked changes | `Body.getTrackedChanges()` | WordApi 1.6 | M365 / 2024: yes; 2019/2021 VL: no | Yes | "Could not be checked" |
| Kruti Dev ↔ Unicode | `getTextRanges`, `insertText("Replace")`, `intersectWithOrNullObject` | WordApi 1.3 | Yes | Yes | — |
| Paper size & margins | `Section.pageSetup` | **WordApiDesktop 1.3** | M365 Version 2507+ only | **No** | Page tab disabled with instructions to use Layout > Size/Margins |

## What has actually been tested

| Environment | Status |
|---|---|
| Core logic (Node.js unit tests) | **Tested** — 56 tests |
| Task pane UI in Microsoft Edge 156 (the WebView2 engine) with a simulated Word document | **Tested** — 2 end-to-end tests, desktop and web capability modes |
| Manifest validation (Microsoft validator) | **Tested** — valid |
| Real Word for Windows (16.0.20527 is installed on the build PC) | **Not tested** — sideloading and clicking the task pane could not be automated in this environment |
| Real Word for the web | **Not tested** |
| Real Word for Mac | **Not tested** |

Full parity is **not claimed** until the manual checklist in
[DEVELOPMENT.md](./DEVELOPMENT.md#manual-test-checklist-real-word) has been run in
each environment.

## Behaviours that need confirmation in real Word

1. `lineSpacing` written as points (1.5 lines = 18) is shown by Word as
   "Multiple 1.5". Documentation says "In the Word UI, this value is divided
   by 12"; not yet observed.
2. `font.name` on a paragraph with mixed fonts returns empty — handled
   defensively (null, "" both treated as mixed).
3. Setting `font.name` on a paragraph also applies to complex-script (Hindi)
   text? AB Layout avoids the question by never re-fonting paragraphs with
   Indian-language or Urdu characters.
4. `insertText(..., "Replace")` keeps bold/italic/size of the replaced word.
5. Undo (Ctrl+Z) after Apply — how many steps it takes on each platform.
6. Word for the web payload limits on very large documents (300+ pages).

## Internet and hosting

- The add-in's files are served from GitHub Pages
  (`https://ratiojuris.github.io/ab-layout/`); Office.js is loaded from
  Microsoft's CDN. **An internet connection is needed to open the panel.**
  Offline use is not promised.
- Document processing happens inside Word in the user's computer/browser.
  No document content is sent to GitHub, Microsoft (beyond Word itself) or
  anyone else; there is no server-side code.
