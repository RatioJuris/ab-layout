# Advocate Workflows

*Developed by PrajnaBytes International Private Limited and RatioJuris · GPL-3.0-or-later*

How documents are typically prepared, where things go wrong, and where AB
Layout helps. Workflows are **[Hypothesis]** descriptions of common practice,
written to guide design; they have not yet been validated with a sample of
advocates (see PRODUCT_RESEARCH.md §14).

## W1. New petition from an old one

1. Open last year's similar petition; *Save As*.
2. Replace cause title, parties, dates, facts; paste new grounds from another file.
3. Paste extracts from a judgment (often from a PDF).
4. Renumber paragraphs by hand.
5. "Select all → Times New Roman 14 → Justify" to tidy up.
6. Print / e-file.

**What goes wrong:** step 2–3 bring four fonts and spacings; step 4 leaves gaps
or repeats; step 5 justifies the cause title and party block and turns Kruti
Dev text into Latin gibberish.

**AB Layout:** *Check* (finds mixed formatting, numbering gaps, blanks "____"),
*Clean* instead of step 5 (keeps titles/VERSUS/party/signature lines,
quotation indents, tables and Hindi fonts), text check after applying.

## W2. Hindi pleading in a district court

1. Typist drafts in Kruti Dev 010 on the office PC.
2. Document must now be filed in a Unicode font, or opened on another PC.

**What goes wrong:** other PCs without Kruti Dev show English letters; online
converters require pasting client text into a website and lose bold/italics,
and convert English words too.

**AB Layout:** *Hindi* tab → Kruti Dev → Unicode, selection or whole document,
preview with sample, only Kruti Dev words converted, formatting kept.
Reverse direction for offices that still require Kruti Dev.

## W3. Junior preparing a senior's draft for filing

1. Receive the draft with comments and tracked changes.
2. Accept changes, remove comments, fix formatting, check page size.

**AB Layout:** *Check* lists comments, unaccepted tracked changes, highlights,
coloured text, paper size (desktop), placeholders; "Show" jumps to each.

## W4. Affidavit on stamp paper

1. Page 1 is printed on stamp paper with a printed heading; text must start lower.
2. Remaining pages on plain paper with normal margins.

**AB Layout:** *Page* tab → "Notary / Affidavit". Windows version: page 1's
text starts 16.5 cm down (a blank first-page header makes the space; footer
copied to page 1; no section break, no text change); other pages get normal
margins. Web version: needs a section break after page 1, which AB Layout
explains instead of putting the large top margin on every page (a 3.x bug).

## W5. Chamber house style

1. Senior wants all chamber documents in one style.

**AB Layout:** *Profiles* tab → create a custom profile → share it to other
chamber PCs by copying the profile text (no account or server).

## W6. Office copy / client copy

1. Print a compact copy for the file or client.

**AB Layout:** *Office Copy (compact)* profile (12 pt, single spacing).
Use on a copy (*Save As* first).
