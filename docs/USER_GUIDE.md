# AB Layout — User Guide

*Advocate Benefit Layout · Developed by PrajnaBytes International Private Limited and RatioJuris*

AB Layout helps you tidy the formatting of your legal documents inside
Microsoft Word. It does **not** rewrite your pleadings: it never changes your
words, names, dates, citations or prayers when formatting. It does not use AI
and does not upload your document.

> **Always save your document before making changes.** It is the simplest and
> safest way to go back.

---

## 1. Open AB Layout

**First time (install):**

1. Download `manifest.xml` from <https://ratiojuris.github.io/ab-layout/>
   ("Install Add-in").
2. In Word: **Insert → Add-ins → My Add-ins → Upload My Add-in** (in some
   versions: **Home → Add-ins → More Add-ins → My Add-ins → Upload**).
3. Choose `manifest.xml`.

**Every time:** click the **AB Layout** tab on the ribbon, then the
**AB Layout** button. The panel opens on the right.

You need Microsoft 365, Word 2019 or later, or Word for the web, and an
internet connection to open the panel. Word 2007/2010/2013 cannot run add-ins.

## 2. Check your document

1. Go to **Check** and press **Check Document**.
2. AB Layout lists what it found. Nothing in the document is changed.
   - **Fix** — formatting that is not consistent (font, size, spacing,
     alignment, indents) or paragraph numbers that look wrong.
   - **Check** — things to look at before filing: blanks like `____` or
     `XXX`, highlighted text, comments, unaccepted tracked changes, old
     Hindi fonts.
   - **Note** — useful information (paper size, blank lines, etc.).
3. Press **Show** to jump to the paragraph in Word; press again for the next one.

**Paragraph numbers:** if you typed numbers by hand (1., 2., 3.), AB Layout
tells you about gaps or repeats ("Jumps from 3 to 5; 4 missing"). It does not
renumber, because other places in your documents may refer to "para 5".

## 3. Choose a formatting profile

Go to **Clean** and choose a profile:

| Profile | What it does |
|---|---|
| **Make Consistent (match this document)** | Keeps your own style. Every body paragraph gets what most of the document already uses. Safest choice. |
| **Supreme Court A4 style (Circular 2020)** | Times New Roman 14, 1.5 spacing, quotations 12 pt single — as in the Supreme Court circular of 05.03.2020. |
| **Double-spaced 14 pt** | Times New Roman 14, double spacing (e.g. Allahabad High Court directions, Oct 2026). |
| **Petition / Application**, **Written Submission**, **Affidavit** | Common conventions (TNR 14, 1.5 spacing). |
| **Office Copy (compact)** | 12 pt, single spacing — for file copies, not for filing. |

Profiles are conveniences. **They do not guarantee compliance with any
court's rules** — check the current requirements of your court.

## 4. Review the proposed changes

Press **Preview Changes**. AB Layout shows:

- how many paragraphs will change and what the target formatting is;
- which lines keep their layout: centred titles and VERSUS, right-aligned
  party names and signatures, lines with tabs, short lines (Place, Date),
  tables (font only), indented quotations (indent kept);
- paragraphs that keep their own font: Hindi (Unicode or Kruti Dev),
  other Indian languages, Urdu, symbols.

## 5. Apply formatting

Press **Apply These Changes**.

- If you edited the document after the preview, nothing is applied and a
  fresh preview is shown.
- After applying, AB Layout reads the document again and confirms:
  **"Text check passed: all N paragraphs have exactly the same words and
  order as before."**
- **Restore Previous Formatting** puts the old formatting back, as long as
  you have not edited the document since. Paragraphs that had mixed fonts
  become uniform and cannot be restored exactly — use Undo (Ctrl+Z) or your
  saved copy.

**Remove extra blank lines** (option): keeps one (or two) blank lines in each
group. Lines holding pictures, page/section breaks, bookmarks or comments are
never removed. Caution: blank lines you left for a signature or stamp are
also reduced.

## 6. Save the document

Look through the document, then save (**Ctrl+S**). If you are unhappy, use
**Restore**, **Ctrl+Z**, or close without saving.

## 7. Hindi: Kruti Dev ↔ Unicode

1. Go to **Hindi**.
2. Choose **Kruti Dev → Unicode** (or the reverse).
3. Choose **Selected text** (select it in Word first) or **Whole document**.
4. Choose the font for the converted text (Mangal or Nirmala UI come with
   Windows).
5. Press **Preview Conversion** — you see how many words will change and a
   sample of the result.
6. Press **Convert Now**.

Only Hindi words are converted: English words, numbers, bold and italics stay
as they are. Words that cannot be converted exactly (or that contain a
footnote mark or field) are left unchanged and counted in the report.
**This changes the letters stored in the document — save a copy first.**
For Unicode → Kruti Dev, every computer that opens the file needs the Kruti
Dev font installed.

## 8. Paper size and margins

Go to **Page**, choose a layout and press **Apply Page Layout**. This works in
Word for Windows and Mac (recent Microsoft 365 versions). In Word for the
web, use **Layout → Size** and **Layout → Margins** instead — AB Layout tells
you this.

**Affidavit on stamp paper:** to leave space only on page 1, put the cursor
at the end of page 1, choose **Layout → Breaks → Next Page**, then apply the
"Notary / Affidavit" layout.

## 9. Create your own profile

1. Go to **Profiles**, choose **Start from** (any profile).
2. Change the name, font, size, line spacing (e.g. 1.5), alignment, indents
   (in cm) and spacing (in pt). Type **match** in a box to keep what most of
   your document uses.
3. Optional: quotation size/spacing, heading and table fonts, fonts that must
   never be changed (e.g. your firm's special font).
4. Press **Save Profile**. It is now selected in the Clean tab.

Profiles are saved on this computer only. To use them on another computer:
**Share profiles → Show My Profiles**, copy the text, paste it on the other
computer and press **Import**.

## 10. Understanding warnings

| Message | Meaning / what to do |
|---|---|
| "Word did not allow the change" | The document is read-only/protected or in Reading View. Click *Enable Editing*. |
| "N paragraph(s) could not be changed (locked or protected)" | Parts of a form or locked content controls; change them by hand. |
| "The document changed after the preview" | You typed while the preview was open. Review the fresh preview. |
| "Text check warning" | The text read back differently (usually because you typed during Apply). Review, or use Undo. |
| "Old (non-Unicode) Indian-language font found" | Kruti Dev or similar; consider converting (Hindi tab). |
| "Word does not let add-ins change paper size here" | Word for the web: use Layout → Size / Margins. |
| "This version of Word is too old" | Needs Word 2019+, Microsoft 365 or Word for the web. |

## Privacy

Your document is processed inside Word on your computer or in your browser
session. AB Layout has no server, no account and no analytics. It never
sends, stores or logs your document's text.
