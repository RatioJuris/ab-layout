/*
File: rj-pb-diagnostics.js
Path: /web/core/rj-pb-diagnostics.js
Project: AB Layout (Advocate Benefit Layout)
Developed by PrajnaBytes International Private Limited and RatioJuris
Copyright (C) 2026 PrajnaBytes International Private Limited and RatioJuris
SPDX-License-Identifier: GPL-3.0-or-later
Additional terms under GPLv3 section 7 apply (attribution and names) - see NOTICE.

"Check Document": finds formatting inconsistencies and things to look at
before printing or filing. Every finding is computed from the real document;
nothing here edits the document.
*/

import { classifyAll, isBlankText } from "./rj-pb-classify.js";
import { classifyFontName } from "./rj-pb-fonts.js";
import { checkTypedNumbering } from "./rj-pb-numbering.js";
import { isKrutiDevFont } from "./rj-pb-krutidev.js";
import { ptToCm, linesLabel } from "./rj-pb-units.js";

/**
 * @typedef {import("./rj-pb-types.js").ParagraphSnapshot} ParagraphSnapshot
 * @typedef {import("./rj-pb-types.js").Finding} Finding
 * @typedef {import("./rj-pb-types.js").PageSetupSnapshot} PageSetupSnapshot
 * @typedef {import("./rj-pb-types.js").ReviewInfo} ReviewInfo
 */

const A4 = { w: 595.3, h: 841.9 };
const LEGAL = { w: 612, h: 1008 };
const LETTER = { w: 612, h: 792 };

/**
 * Groups paragraphs by a key and returns groups largest first.
 * @param {number[]} indexes
 * @param {(i: number) => string | null} keyOf
 */
function groupBy(indexes, keyOf) {
  /** @type {Map<string, number[]>} */
  const groups = new Map();
  for (const i of indexes) {
    const k = keyOf(i);
    if (k === null) continue;
    const g = groups.get(k);
    if (g) g.push(i);
    else groups.set(k, [i]);
  }
  return Array.from(groups.entries()).sort((a, b) => b[1].length - a[1].length);
}

/**
 * Builds an "inconsistent X" finding when body paragraphs use more than one value.
 * @param {string} id
 * @param {string} what
 * @param {Array<[string, number[]]>} groups
 * @returns {Finding | null}
 */
function inconsistency(id, what, groups) {
  if (groups.length < 2) return null;
  const main = groups[0];
  const others = groups.slice(1);
  const otherIdx = others.flatMap(([, idx]) => idx).sort((a, b) => a - b);
  const summary = groups.slice(0, 4).map(([k, idx]) => `${k} (${idx.length})`).join(", ");
  return {
    id,
    severity: "problem",
    title: `${what} is not consistent`,
    detail: `Body paragraphs use ${groups.length} different values: ${summary}${groups.length > 4 ? ", ..." : ""}. Most use ${main[0]}.`,
    paragraphs: otherIdx,
    fixable: true
  };
}

/**
 * @param {ParagraphSnapshot[]} paras
 * @param {{ pageSetups?: PageSetupSnapshot[] | null, review?: ReviewInfo | null, protectedFonts?: string[] }} [extra]
 * @returns {{ findings: Finding[], stats: Record<string, number> }}
 */
export function runDiagnostics(paras, extra = {}) {
  const classes = classifyAll(paras, extra.protectedFonts || []);
  /** @type {Finding[]} */
  const findings = [];
  const bodyIdx = paras.map((_, i) => i).filter((i) => classes[i].kind === "body");
  const textIdx = paras.map((_, i) => i).filter((i) => classes[i].kind !== "empty");

  // --- Formatting consistency (body paragraphs only) ---
  const fontGroups = groupBy(bodyIdx, (i) => (classes[i].fontProtected ? null : paras[i].font.name || "mixed fonts"));
  const f1 = inconsistency("font-name", "Font", fontGroups);
  if (f1) findings.push(f1);

  const sizeGroups = groupBy(bodyIdx, (i) => {
    const s = paras[i].font.size;
    return typeof s === "number" ? `${Math.round(s * 10) / 10} pt` : "mixed sizes";
  });
  const f2 = inconsistency("font-size", "Font size", sizeGroups);
  if (f2) findings.push(f2);

  const f3 = inconsistency("line-spacing", "Line spacing", groupBy(bodyIdx, (i) => linesLabel(paras[i].lineSpacing)));
  if (f3) findings.push(f3);

  const f4 = inconsistency("alignment", "Alignment", groupBy(bodyIdx, (i) => paras[i].alignment));
  if (f4) findings.push(f4);

  const f5 = inconsistency("first-indent", "First-line indent", groupBy(bodyIdx, (i) => `${ptToCm(paras[i].firstLineIndent)} cm`));
  if (f5) findings.push(f5);

  const f6 = inconsistency(
    "para-spacing",
    "Space between paragraphs",
    groupBy(bodyIdx, (i) => `${Math.round(paras[i].spaceBefore)} pt before / ${Math.round(paras[i].spaceAfter)} pt after`)
  );
  if (f6) findings.push(f6);

  // --- Blank lines used for spacing ---
  /** @type {number[]} */
  const extraBlanks = [];
  let run = 0;
  let runs = 0;
  paras.forEach((p, i) => {
    if (classes[i].kind === "empty" && p.tableNestingLevel === 0) {
      run++;
      if (run === 2) runs++;
      if (run >= 2) extraBlanks.push(i);
    } else run = 0;
  });
  if (runs > 0) {
    findings.push({
      id: "blank-lines",
      severity: "info",
      title: "Several blank lines in a row",
      detail: `${runs} place(s) use two or more empty lines for spacing (${extraBlanks.length} extra lines). These can push text onto the next page. Clean Document can remove the extras if you tick that option - but check signature spaces first.`,
      paragraphs: extraBlanks,
      fixable: true
    });
  }

  // --- Hand-typed numbering ---
  const numberCandidates = paras
    .map((p, i) => ({ index: i, text: p.text }))
    .filter(({ index }) => ["body", "short", "quote", "tabbed"].includes(classes[index].kind));
  const numbering = checkTypedNumbering(numberCandidates);
  if (numbering.issues.length > 0) {
    findings.push({
      id: "typed-numbering",
      severity: "problem",
      title: "Paragraph numbers may be wrong",
      detail: `${numbering.issues.length} issue(s) in typed paragraph numbers: ${numbering.issues.slice(0, 3).map((x) => x.message).join(" ")}${numbering.issues.length > 3 ? " ..." : ""} AB Layout does not renumber, because references like "para 5" elsewhere would no longer match.`,
      paragraphs: numbering.issues.map((x) => x.index),
      fixable: false
    });
  }
  const autoNumbered = paras.filter((p, i) => p.isListItem && classes[i].kind === "list").length;
  if (autoNumbered > 0 && numbering.numberedCount > 0) {
    findings.push({
      id: "mixed-numbering",
      severity: "info",
      title: "Typed and automatic numbering are mixed",
      detail: `${numbering.numberedCount} paragraph(s) have numbers typed by hand and ${autoNumbered} use Word's automatic numbering. Mixing the two often causes numbering to go wrong after edits.`,
      paragraphs: paras.map((_, i) => i).filter((i) => paras[i].isListItem),
      fixable: false
    });
  }

  // --- Legacy fonts (Kruti Dev etc.) ---
  /** @type {Map<string, number[]>} */
  const legacy = new Map();
  textIdx.forEach((i) => {
    const names = [paras[i].font.name, ...(paras[i].runFonts || [])];
    for (const n of names) {
      if (n && classifyFontName(n).kind === "legacy-indic") {
        const g = legacy.get(n) || [];
        g.push(i);
        legacy.set(n, g);
      }
    }
  });
  if (legacy.size > 0) {
    const names = Array.from(legacy.keys());
    const idx = Array.from(new Set(Array.from(legacy.values()).flat())).sort((a, b) => a - b);
    const kruti = names.some(isKrutiDevFont);
    findings.push({
      id: "legacy-font",
      severity: "check",
      title: "Old (non-Unicode) Indian-language font found",
      detail: `${idx.length} paragraph(s) use ${names.join(", ")}. Text in these fonts cannot be searched or copied correctly, and some courts now ask for Unicode fonts for Hindi pleadings. AB Layout never changes these fonts during cleaning.${kruti ? " You can convert Kruti Dev text to Unicode in the Hindi tab." : ""}`,
      paragraphs: idx,
      fixable: false
    });
  }

  // --- Things that affect printing/filing ---
  const leadingSpaces = textIdx.filter((i) => /^( {2,}|\t)/.test(paras[i].text) && classes[i].kind !== "table");
  if (leadingSpaces.length > 0) {
    findings.push({
      id: "space-indent",
      severity: "info",
      title: "Indents typed with spaces or tabs",
      detail: `${leadingSpaces.length} paragraph(s) start with spaces or a tab. These do not line up reliably when fonts change. AB Layout does not remove typed characters; you may replace them with a paragraph indent by hand.`,
      paragraphs: leadingSpaces,
      fixable: false
    });
  }

  const lineBreaks = textIdx.filter((i) => paras[i].text.includes("\u000b") && classes[i].kind === "body");
  if (lineBreaks.length > 0) {
    findings.push({
      id: "line-breaks",
      severity: "info",
      title: "Lines broken by hand inside paragraphs",
      detail: `${lineBreaks.length} paragraph(s) contain manual line breaks (Shift+Enter), often left over from text copied out of a PDF. They stop justified text from flowing properly. AB Layout does not remove them because that changes the text.`,
      paragraphs: lineBreaks,
      fixable: false
    });
  }

  const blanksToFill = textIdx.filter((i) => /_{4,}|\bX{3,}\b|\bx{3,}\b|\[\s*\]|<<[^>]*>>|\bdd[/.-]mm[/.-]yy(yy)?\b/i.test(paras[i].text));
  if (blanksToFill.length > 0) {
    findings.push({
      id: "blanks",
      severity: "check",
      title: "Blanks or placeholders to fill",
      detail: `${blanksToFill.length} paragraph(s) contain blanks such as "____", "XXX" or "dd/mm/yyyy". Some are intentional (e.g. case number to be given by the Registry) - check the rest before filing.`,
      paragraphs: blanksToFill,
      fixable: false
    });
  }

  const highlighted = textIdx.filter((i) => paras[i].font.highlightColor !== null);
  if (highlighted.length > 0) {
    findings.push({
      id: "highlight",
      severity: "check",
      title: "Highlighted text",
      detail: `${highlighted.length} paragraph(s) contain highlighting, which will print. Remove it before filing if it was only a working note.`,
      paragraphs: highlighted,
      fixable: false
    });
  }

  const coloured = textIdx.filter((i) => {
    const c = (paras[i].font.color || "").toUpperCase();
    return c !== "" && c !== "#000000" && c !== "AUTOMATIC" && c !== "BLACK";
  });
  if (coloured.length > 0) {
    findings.push({
      id: "colour",
      severity: "info",
      title: "Coloured text",
      detail: `${coloured.length} paragraph(s) are in a colour other than black. Check this is intended before printing.`,
      paragraphs: coloured,
      fixable: false
    });
  }

  const review = extra.review;
  if (review) {
    if ((review.comments || 0) > 0) {
      findings.push({
        id: "comments",
        severity: "check",
        title: "Comments in the document",
        detail: `${review.comments} comment(s) are present. Delete or resolve them before sending or filing (Review > Delete).`,
        paragraphs: [],
        fixable: false
      });
    }
    if ((review.trackedChanges || 0) > 0) {
      findings.push({
        id: "tracked",
        severity: "check",
        title: "Tracked changes not accepted",
        detail: `${review.trackedChanges} tracked change(s) are still pending. Accept or reject them before filing (Review > Accept).`,
        paragraphs: [],
        fixable: false
      });
    }
  }

  // --- Page setup (only where Word allows add-ins to read it) ---
  const ps = extra.pageSetups;
  if (ps && ps.length > 0) {
    const sizes = new Set(ps.map((s) => `${Math.round(s.pageWidth)}x${Math.round(s.pageHeight)}`));
    if (sizes.size > 1) {
      findings.push({
        id: "page-sizes",
        severity: "problem",
        title: "Different paper sizes in one document",
        detail: `The document's ${ps.length} sections use ${sizes.size} different paper sizes. Use the Page tab to apply one layout.`,
        paragraphs: [],
        fixable: true
      });
    }
    const first = ps[0];
    const name = paperName(first.pageWidth, first.pageHeight);
    if (name !== "A4") {
      findings.push({
        id: "paper",
        severity: "info",
        title: `Paper size is ${name}`,
        detail: "Many courts now require A4 paper (for example the Supreme Court and several High Courts). Check what your court requires; the Page tab can change it.",
        paragraphs: [],
        fixable: true
      });
    }
  }

  const severityOrder = { problem: 0, check: 1, info: 2 };
  findings.sort((a, b) => severityOrder[a.severity] - severityOrder[b.severity]);

  return {
    findings,
    stats: {
      paragraphs: paras.length,
      bodyParagraphs: bodyIdx.length,
      blankLines: paras.filter((p) => isBlankText(p.text)).length,
      tables: paras.filter((p) => p.tableNestingLevel > 0).length,
      typedNumbers: numbering.numberedCount
    }
  };
}

/**
 * @param {number} w
 * @param {number} h
 */
export function paperName(w, h) {
  const near = (/** @type {{w:number,h:number}} */ s) =>
    (Math.abs(w - s.w) < 3 && Math.abs(h - s.h) < 3) || (Math.abs(w - s.h) < 3 && Math.abs(h - s.w) < 3);
  if (near(A4)) return "A4";
  if (near(LEGAL)) return "Legal (8.5 x 14 in)";
  if (near(LETTER)) return "Letter (8.5 x 11 in)";
  return `${ptToCm(w)} x ${ptToCm(h)} cm`;
}
