/*
File: rj-pb-classify.js
Path: /web/core/rj-pb-classify.js
Project: AB Layout (Advocate Benefit Layout)
Developed by PrajnaBytes International Private Limited and RatioJuris
Copyright (C) 2026 PrajnaBytes International Private Limited and RatioJuris
SPDX-License-Identifier: GPL-3.0-or-later
Additional terms under GPLv3 section 7 apply (attribution and names) - see NOTICE.

Decides what kind of paragraph each one is, so that cleaning never flattens
deliberate layout. Cause titles, "VERSUS", party blocks, signature blocks and
indented quotations are recognised by their existing layout (centring, right
alignment, tabs, extra indent) and are only lightly touched.
*/

import { fontProtection } from "./rj-pb-fonts.js";

const HEADING_STYLES = new Set([
  "Heading1", "Heading2", "Heading3", "Heading4", "Heading5",
  "Heading6", "Heading7", "Heading8", "Heading9", "Title", "Subtitle", "TocHeading"
]);
const TOC_STYLES = new Set(["Toc1", "Toc2", "Toc3", "Toc4", "Toc5", "Toc6", "Toc7", "Toc8", "Toc9"]);
const QUOTE_STYLES = new Set(["Quote", "IntenseQuote"]);

/** Paragraphs indented this much (points) beyond normal body text are treated as quotations. */
export const QUOTE_EXTRA_INDENT_PT = 28;

/** Lines shorter than this are treated as short lines (e.g. "Place: Delhi", "DEPONENT"). */
export const SHORT_LINE_CHARS = 40;

/** @param {string} text */
export function isBlankText(text) {
  return text.replace(/[\s\u00a0\u200b]/g, "") === "";
}

/**
 * The usual left indent of ordinary text in this document (normally 0).
 *
 * @param {import("./rj-pb-types.js").ParagraphSnapshot[]} paragraphs
 */
export function baselineLeftIndent(paragraphs) {
  /** @type {Map<number, number>} */
  const counts = new Map();
  for (const p of paragraphs) {
    if (p.tableNestingLevel > 0 || p.isListItem || isBlankText(p.text)) continue;
    const key = Math.round(p.leftIndent);
    counts.set(key, (counts.get(key) || 0) + 1);
  }
  let best = 0;
  let bestCount = -1;
  for (const [k, c] of counts) {
    if (c > bestCount || (c === bestCount && k < best)) {
      best = k;
      bestCount = c;
    }
  }
  return best;
}

/**
 * @param {import("./rj-pb-types.js").ParagraphSnapshot} p
 * @param {{ baselineLeft: number, protectedFonts?: string[] }} ctx
 * @returns {import("./rj-pb-types.js").Classification}
 */
export function classifyParagraph(p, ctx) {
  const protection = fontProtection(p, ctx.protectedFonts || []);
  const result = (/** @type {import("./rj-pb-types.js").ParagraphKind} */ kind) => ({
    kind,
    fontProtected: protection.protected,
    protectReason: protection.reason
  });

  if (isBlankText(p.text)) return result("empty");
  if (TOC_STYLES.has(p.styleBuiltIn)) return result("toc");
  if (p.tableNestingLevel > 0) return result("table");
  if (HEADING_STYLES.has(p.styleBuiltIn)) return result("heading");
  if (p.isListItem) return result("list");
  if (p.alignment === "Centered") return result("centered");
  if (p.alignment === "Right") return result("right");
  if (p.text.includes("\t")) return result("tabbed");
  if (QUOTE_STYLES.has(p.styleBuiltIn)) return result("quote");
  if (p.leftIndent - ctx.baselineLeft >= QUOTE_EXTRA_INDENT_PT) return result("quote");
  if (p.text.trim().length < SHORT_LINE_CHARS) return result("short");
  return result("body");
}

/**
 * @param {import("./rj-pb-types.js").ParagraphSnapshot[]} paragraphs
 * @param {string[]} [protectedFonts]
 */
export function classifyAll(paragraphs, protectedFonts = []) {
  const baselineLeft = baselineLeftIndent(paragraphs);
  return paragraphs.map((p) => classifyParagraph(p, { baselineLeft, protectedFonts }));
}

/** Plain-language names used in previews and reports. */
export const KIND_LABELS = {
  empty: "blank lines",
  toc: "table-of-contents lines",
  table: "lines inside tables",
  heading: "headings",
  list: "auto-numbered or bulleted items",
  centered: "centred lines (titles, VERSUS, etc.)",
  right: "right-aligned lines (party names, signatures)",
  tabbed: "lines laid out with tabs",
  quote: "indented quotations",
  short: "short lines (Place, Date, signatures)",
  body: "body paragraphs"
};
