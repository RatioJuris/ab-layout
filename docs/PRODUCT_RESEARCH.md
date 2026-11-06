# AB Layout — Product Research

*Developed by PrajnaBytes International Private Limited and RatioJuris · GPL-3.0-or-later*

This document records what AB Layout's design is based on. Every statement is
labelled:

- **[Verified]** — confirmed from a cited public source or by running code.
- **[Technical]** — a finding about Microsoft Word / Office.js, with its source.
- **[Hypothesis]** — a reasonable product assumption that has **not** been
  validated with advocates. No interviews, surveys or usage statistics were
  conducted for this version; none are claimed.

Research date: November 2026.

---

## 1. Target users

Advocates practising in India who prepare documents in Microsoft Word:

| Group | Typical situation |
|---|---|
| Rural / taluka / district-court advocates | Small chamber, one ordinary Windows PC, a typist or self-typing, old templates reused for years, Hindi or regional-language pleadings. |
| Junior advocates | Draft for a senior; receive many fragments from different people; asked to "make it presentable" before filing. |
| High Court practitioners | Stricter filing scrutiny; A4/font/spacing directions; long paper-books with indexes and annexures. |
| Independent practitioners in cities | Many matters at once; reuse the last similar petition as a template. |
| Chambers | Several people editing the same document; need one house style. |

## 2. Personas [Hypothesis]

1. **Ramesh, 52, district court, Uttar Pradesh.** Drafts in Hindi using Kruti Dev
   (as he learnt in the 2000s) and English using Times New Roman. Has Office
   on one PC. Pain: Hindi from his old files becomes "gibberish" on other
   computers and in e-filing; the court now asks for Unicode Hindi.
2. **Priya, 27, junior in a High Court chamber.** Copies paragraphs from three
   old petitions and a PDF judgment into one draft. Pain: four fonts, three
   spacings, numbering broken; senior wants it filed today.
3. **Abdul, 40, independent practitioner, metro city.** Uses Word for the web on
   a laptop at court. Pain: needs quick check that nothing silly (highlights,
   comments, "XXXX" placeholders, wrong para numbers) goes into the filed copy.

## 3. Everyday document workflows

See [ADVOCATE_WORKFLOWS.md](./ADVOCATE_WORKFLOWS.md) for step-by-step workflows.
In short: *start from an old document → replace parties/facts → paste extracts
→ renumber → format for the court → check → print / e-file → keep office copy.*

## 4. Pain points

| # | Pain point | Evidence | Solvable via Word API without touching text? |
|---|---|---|---|
| P1 | Mixed fonts, sizes and spacing after copy-paste | [Hypothesis] — a universal Word problem; strongly expected in template reuse | **Yes** (paragraph + font properties) |
| P2 | Court-specific font/spacing/paper rules changing (A4 move, TNR 14, 1.5 / double spacing) | **[Verified]** SC circular 2020; Allahabad HC directions Oct 2026; Bombay HC A4 circular 2023 | **Partly**: font/spacing yes; paper/margins only in desktop Word |
| P3 | Legacy Hindi fonts (Kruti Dev) vs Unicode requirement | **[Verified]** Kruti Dev is a legacy non-Unicode font widely used for Hindi; Allahabad HC (Oct 2026) requires Unicode font for Hindi pleadings | **Yes**, but conversion changes stored characters → must be explicit, previewed, word-by-word |
| P4 | Re-fonting legacy-font text destroys it | **[Verified]** by construction: Kruti Dev stores Hindi as Latin characters (e.g. `U;k;ky;` = न्यायालय) | Must be **prevented** — AB Layout protects these fonts |
| P5 | Hand-typed paragraph numbers with gaps/repeats | [Hypothesis] — common when paragraphs are inserted/deleted | **Detect: yes. Auto-fix: unsafe** (references like "para 5" break) |
| P6 | Blank lines used for spacing → bad page breaks | [Hypothesis] | Yes, with safety checks; but blank lines are also used for signature space → opt-in |
| P7 | Leftover highlights, comments, tracked changes, "____"/"XXX" placeholders in filed copies | [Hypothesis] | **Yes** (detect & show) |
| P8 | Text from PDFs with manual line breaks | [Hypothesis] | Detect yes; fixing = text change → report only |
| P9 | Cause title / party block / signature layout broken by "select all → justify" | [Hypothesis], but follows directly from how pleadings are laid out | Avoided by paragraph **classification** |

## 5. Frequency and importance [Hypothesis — to validate]

Ranking used for the MVP (higher = built first): P1, P4, P2, P3, P5, P7, P9, P6, P8.
Rationale: P1/P9 affect every document; P4 is a silent-corruption risk that
any formatter must handle in India; P2/P3 are now enforced by registries.

## 6. Existing alternatives

| Alternative | Limitation for our users |
|---|---|
| Word's own Styles / Format Painter / "Select all → set font" | Needs skill; select-all flattens cause titles and destroys Kruti Dev text. |
| Typists / DTP shops | Cost and time; documents leave the chamber. |
| Online Kruti Dev ↔ Unicode converters | Paste text into a website (confidentiality); lose bold/italics; convert English too. |
| Commercial legal drafting software / AI tools | Cost, accounts, uploading client documents. |

## 7. Product opportunities

1. A **safe** "make it consistent" that understands pleading layout.
2. A **pre-filing check** that points at the exact paragraph.
3. **In-document** Kruti Dev ↔ Unicode conversion that keeps formatting and
   never touches English.
4. Paper/margin presets with **cited** sources.

## 8. Technical feasibility [Technical]

- Word JavaScript API (Office.js) exposes paragraph alignment, indents,
  line spacing (points; Word UI lines = value ÷ 12), space before/after,
  font name/size/colour/highlight, list and table membership, built-in style,
  per-paragraph OOXML, and word-range splitting (WordApi 1.1–1.3).
  Source: learn.microsoft.com/javascript/api/word/word.paragraph.
- Paper size and margins (`Section.pageSetup`) are **WordApiDesktop 1.3 only**
  — not available in Word for the web.
  Source: learn.microsoft.com/javascript/api/word/word.section.
- Comments: WordApi 1.4; tracked changes: WordApi 1.6.
- Font name returns empty for mixed fonts; AB Layout then reads the
  paragraph's OOXML to find every font used before deciding anything.
- Undo: Word's undo of add-in changes "generally works" but is not
  fine-grained and may be cleared in Word for the web (Microsoft Q&A /
  Stack Overflow reports). AB Layout therefore keeps its own **Restore**.

## 9. Word desktop limitations

- Office 2016/2019 reached end of support (October 2025); WordApi 1.3 needs
  Word 2019 or later or Microsoft 365. **Word 2007/2010/2013 cannot run
  Office add-ins at all.** [Technical]
- Volume-licensed Office 2021 supports up to WordApi 1.3 only, so comment and
  tracked-change counts may be unavailable there (handled by capability checks).

## 10. Word for the web limitations

- No page setup API → Page tab disabled with an explanation.
- Request size limits for very large documents → errors are explained, and the
  Hindi converter works on the selection.
- Needs internet (the web version itself is online).

## 11. Cost constraints

- Zero running cost: static files on the existing GitHub Pages hosting.
- No AI, no server, no database, no account, no paid dependency.
- Users need a Word version that supports add-ins (Microsoft 365, Word 2019+,
  or the free Word for the web with a Microsoft account).

## 12. MVP recommendation (implemented in 4.0.0)

1. **Check Document** — diagnostics with "Show" navigation.
2. **Clean Document** — classified, previewed, verified, restorable.
3. **Kruti Dev ↔ Unicode** — added at the product owner's request; directly
   addresses P3 and is consistent with recent court directions.
4. **Page layout** — the existing 3.x feature, repaired.

## 13. Postponed

- Automatic renumbering (reference-safety problem — see roadmap).
- Removing manual line breaks / double spaces (changes text).
- Style-based restructuring (Heading styles), index/annexure tools,
  document comparison, other legacy fonts (Chanakya, DevLys, regional
  scripts).

## 14. Assumptions requiring validation with real advocates

1. That P1 (mixed formatting) is the most time-consuming problem.
2. That the classification rules (centred / right-aligned / tabbed / short
   lines kept) match how advocates in different states lay out pleadings.
3. That "Make Consistent (match this document)" is preferred over fixed
   court-style profiles as the default.
4. Which Indian courts' formatting rules advocates most need as presets.
5. How common Kruti Dev still is outside UP/MP/Rajasthan/Bihar, and which
   other legacy fonts matter (Chanakya, DevLys, Shree-Lipi, regional).
6. Whether advocates have Word 2019+/Microsoft 365, or older/unlicensed
   copies that cannot run add-ins (this would limit reach significantly).
7. Whether connectivity in rural chambers is enough to load the add-in.

## Sources

- Supreme Court of India, circular F.No.01/Judl./2020 dated 05.03.2020 (A4, Times New Roman 14, 1.5 spacing, quotations 12 single, margins 4 cm L/R, 2 cm T/B), as reported by SCC Times, 12.03.2020: https://www.scconline.com/blog/post/2020/03/12/sc-a4-size-paper-shall-be-used-in-pleadings-petitions-affidavits-or-other-documents-to-be-filed-in-supreme-court/
- Allahabad High Court directions, *Sheo Kinkar Singh v. State of U.P.*, 2026 LiveLaw (AB) 900, reported 30.10.2026 (TNR 14, double spacing; Hindi in a Unicode font; effective 12.11.2026): https://www.livelaw.in/high-court/allahabad-high-court/allahabad-high-court-uniform-formatting-rules-physical-e-filings-556701
- Bombay High Court A4 circular (2023), as indexed: "Times New Roman or Georgia, Font size 14 with inner margin of 5 cms and outer margin 3 cms" — full text not reviewed; **verify before use**.
- Delhi High Court practice directions on A4 paper (delhihighcourt.nic.in) — referenced, not reviewed in detail.
- Kruti Dev: https://en.wikipedia.org/wiki/Kruti_Dev
- Office browsers/webviews: https://learn.microsoft.com/office/dev/add-ins/concepts/browsers-used-by-office-web-add-ins
- Word API requirement sets: https://learn.microsoft.com/javascript/api/requirement-sets/word/word-api-requirement-sets
