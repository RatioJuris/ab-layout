/*
File: rj-pb-reader.js
Path: /web/word/rj-pb-reader.js
Project: AB Layout (Advocate Benefit Layout)
Developed by PrajnaBytes International Private Limited and RatioJuris
Copyright (C) 2026 PrajnaBytes International Private Limited and RatioJuris
SPDX-License-Identifier: GPL-3.0-or-later
Additional terms under GPLv3 section 7 apply (attribution and names) - see NOTICE.

Reads the document into plain snapshots. Read-only: nothing here changes the
document. Text is kept in memory only for the duration of the task.
*/

import { extractFontNamesFromOoxml } from "../core/rj-pb-fonts.js";
import { isBlankText } from "../core/rj-pb-classify.js";

export const PARAGRAPH_LOAD =
  "items/text,items/alignment,items/firstLineIndent,items/leftIndent,items/rightIndent," +
  "items/lineSpacing,items/spaceBefore,items/spaceAfter,items/styleBuiltIn,items/isListItem," +
  "items/tableNestingLevel,items/font/name,items/font/size,items/font/color,items/font/highlightColor";

/** Number of paragraph OOXML packages requested per round trip. */
const OOXML_CHUNK = 20;

/**
 * @param {any} p  Word.Paragraph with PARAGRAPH_LOAD properties loaded.
 * @param {number} index
 * @returns {import("../core/rj-pb-types.js").ParagraphSnapshot}
 */
export function toSnapshot(p, index) {
  const f = p.font || {};
  const size = typeof f.size === "number" && Number.isFinite(f.size) && f.size > 0 ? f.size : null;
  return {
    index,
    text: typeof p.text === "string" ? p.text : "",
    alignment: p.alignment,
    firstLineIndent: num(p.firstLineIndent),
    leftIndent: num(p.leftIndent),
    rightIndent: num(p.rightIndent),
    lineSpacing: num(p.lineSpacing),
    spaceBefore: num(p.spaceBefore),
    spaceAfter: num(p.spaceAfter),
    styleBuiltIn: String(p.styleBuiltIn || "Other"),
    isListItem: p.isListItem === true,
    tableNestingLevel: typeof p.tableNestingLevel === "number" ? p.tableNestingLevel : 0,
    font: {
      name: typeof f.name === "string" && f.name !== "" ? f.name : null,
      size,
      color: typeof f.color === "string" && f.color !== "" ? f.color : null,
      highlightColor: f.highlightColor === undefined ? null : f.highlightColor
    }
  };
}

/** @param {unknown} v */
function num(v) {
  return typeof v === "number" && Number.isFinite(v) ? v : 0;
}

/**
 * Reads every paragraph of the main document body.
 * Paragraphs with several fonts get their font names read from Office Open XML
 * so that legacy-font text inside them is never re-fonted.
 *
 * @param {any} context  Word.RequestContext
 * @param {{ onProgress?: (message: string) => void }} [options]
 * @returns {Promise<{ snapshots: import("../core/rj-pb-types.js").ParagraphSnapshot[], items: any[] }>}
 */
export async function readParagraphs(context, options = {}) {
  const paragraphs = context.document.body.paragraphs;
  paragraphs.load(PARAGRAPH_LOAD);
  await context.sync();

  const items = paragraphs.items;
  /** @type {import("../core/rj-pb-types.js").ParagraphSnapshot[]} */
  const snapshots = items.map((/** @type {any} */ p, /** @type {number} */ i) => toSnapshot(p, i));

  const mixed = snapshots.filter((s) => s.font.name === null && !isBlankText(s.text));
  for (let start = 0; start < mixed.length; start += OOXML_CHUNK) {
    const chunk = mixed.slice(start, start + OOXML_CHUNK);
    options.onProgress?.(`Checking fonts in mixed paragraphs (${Math.min(start + OOXML_CHUNK, mixed.length)} of ${mixed.length})...`);
    const results = chunk.map((s) => items[s.index].getOoxml());
    try {
      await context.sync();
      chunk.forEach((s, k) => {
        s.runFonts = extractFontNamesFromOoxml(results[k].value);
      });
    } catch {
      // Leave runFonts undefined: those paragraphs are then treated as protected.
    }
  }
  return { snapshots, items };
}

/**
 * Reads only paragraph texts (used to verify that nothing changed).
 * @param {any} context
 * @returns {Promise<string[]>}
 */
export async function readTexts(context) {
  const paragraphs = context.document.body.paragraphs;
  paragraphs.load("items/text");
  await context.sync();
  return paragraphs.items.map((/** @type {any} */ p) => p.text);
}

/**
 * @param {any} context
 * @param {import("./rj-pb-capabilities.js").Capabilities} caps
 * @returns {Promise<import("../core/rj-pb-types.js").ReviewInfo>}
 */
export async function readReviewInfo(context, caps) {
  /** @type {import("../core/rj-pb-types.js").ReviewInfo} */
  const info = { comments: null, trackedChanges: null };
  const body = context.document.body;
  /** @type {any} */
  let comments = null;
  /** @type {any} */
  let tracked = null;
  try {
    if (caps.comments) {
      comments = body.getComments();
      comments.load("items");
    }
    if (caps.trackedChanges) {
      tracked = body.getTrackedChanges();
      tracked.load("items");
    }
    if (comments || tracked) await context.sync();
    if (comments) info.comments = comments.items.length;
    if (tracked) info.trackedChanges = tracked.items.length;
  } catch {
    // Reported as "could not be checked".
  }
  return info;
}

/**
 * Paper size and margins of each section (desktop Word only).
 * @param {any} context
 * @param {import("./rj-pb-capabilities.js").Capabilities} caps
 * @returns {Promise<import("../core/rj-pb-types.js").PageSetupSnapshot[] | null>}
 */
export async function readPageSetups(context, caps) {
  if (!caps.pageSetup) return null;
  const sections = context.document.sections;
  sections.load("items");
  await context.sync();
  const setups = sections.items.map((/** @type {any} */ s) => {
    const ps = s.pageSetup;
    ps.load("pageWidth,pageHeight,topMargin,bottomMargin,leftMargin,rightMargin");
    return ps;
  });
  await context.sync();
  return setups.map((/** @type {any} */ ps) => ({
    pageWidth: ps.pageWidth,
    pageHeight: ps.pageHeight,
    topMargin: ps.topMargin,
    bottomMargin: ps.bottomMargin,
    leftMargin: ps.leftMargin,
    rightMargin: ps.rightMargin
  }));
}
