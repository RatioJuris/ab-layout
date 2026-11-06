/*
File: rj-pb-hindi.js
Path: /web/word/rj-pb-hindi.js
Project: AB Layout (Advocate Benefit Layout)
Developed by PrajnaBytes International Private Limited and RatioJuris
Copyright (C) 2026 PrajnaBytes International Private Limited and RatioJuris
SPDX-License-Identifier: GPL-3.0-or-later
Additional terms under GPLv3 section 7 apply (attribution and names) - see NOTICE.

Kruti Dev <-> Unicode conversion inside Word. Works word by word so that
English text, bold/italic, footnote marks and fields are left alone:
- Kruti Dev -> Unicode converts only words whose font is Kruti Dev.
- Unicode -> Kruti Dev converts only words containing Devanagari, and only
  when the result converts back to exactly the same text.
Unlike formatting, this changes the stored characters, so it is a separate,
user-started action with a preview first.
*/

import { decideWord } from "../core/rj-pb-krutidev.js";

/** Paragraphs processed per round trip with Word. */
const PARAGRAPH_CHUNK = 40;

/**
 * @typedef {"toUnicode" | "toKruti"} Direction
 * @typedef {"selection" | "document"} Scope
 *
 * @typedef {Object} HindiReport
 * @property {number} toConvert
 * @property {number} converted
 * @property {number} failed
 * @property {{ "mixed-font": number, special: number, "not-exact": number }} skipped
 * @property {string[]} samples       Up to 6 converted words (result side, readable Hindi or Kruti codes).
 * @property {number} paragraphsScanned
 */

/**
 * Collects the paragraph content ranges to work on (never including the
 * paragraph mark, so paragraphs can never be merged).
 * @param {any} context
 * @param {Scope} scope
 */
async function contentRanges(context, scope) {
  const doc = context.document;
  const base = scope === "selection" ? doc.getSelection() : doc.body.getRange("Whole");
  const paragraphs = base.paragraphs;
  paragraphs.load("items");
  await context.sync();
  const ranges = paragraphs.items.map((/** @type {any} */ p) => {
    const content = p.getRange("Content");
    return scope === "selection" ? content.intersectWithOrNullObject(base) : content;
  });
  ranges.forEach((/** @type {any} */ r) => r.load("isNullObject"));
  await context.sync();
  return ranges.filter((/** @type {any} */ r) => !r.isNullObject);
}

/**
 * Scans (dryRun) or converts the chosen text.
 *
 * @param {any} context
 * @param {{ direction: Direction, scope: Scope, dryRun: boolean, targetFont: string, onProgress?: (msg: string) => void }} options
 * @returns {Promise<HindiReport>}
 */
export async function runHindiConversion(context, options) {
  /** @type {HindiReport} */
  const report = {
    toConvert: 0,
    converted: 0,
    failed: 0,
    skipped: { "mixed-font": 0, special: 0, "not-exact": 0 },
    samples: [],
    paragraphsScanned: 0
  };
  const ranges = await contentRanges(context, options.scope);
  report.paragraphsScanned = ranges.length;

  for (let start = 0; start < ranges.length; start += PARAGRAPH_CHUNK) {
    const chunk = ranges.slice(start, start + PARAGRAPH_CHUNK);
    const wordCollections = chunk.map((/** @type {any} */ r) => {
      const words = r.getTextRanges([" "], false);
      words.load("items/text,items/font/name");
      return words;
    });
    await context.sync();

    /** @type {Array<{ range: any, output: string }>} */
    const todo = [];
    for (const coll of wordCollections) {
      for (const w of coll.items) {
        const d = decideWord(w.text, w.font.name || null, options.direction);
        if (d.action === "convert") {
          todo.push({ range: w, output: d.output });
          if (report.samples.length < 6) report.samples.push(d.output.trim());
        } else if (d.action === "skip") {
          report.skipped[d.reason]++;
        }
      }
    }
    report.toConvert += todo.length;

    if (!options.dryRun && todo.length > 0) {
      try {
        for (const t of todo) applyWord(t.range, t.output, options.targetFont);
        await context.sync();
        report.converted += todo.length;
      } catch {
        for (const t of todo) {
          try {
            applyWord(t.range, t.output, options.targetFont);
            await context.sync();
            report.converted++;
          } catch {
            report.failed++;
          }
        }
      }
    }
    options.onProgress?.(`Paragraphs ${Math.min(start + PARAGRAPH_CHUNK, ranges.length)} of ${ranges.length}...`);
  }
  return report;
}

/**
 * @param {any} range
 * @param {string} output
 * @param {string} font
 */
function applyWord(range, output, font) {
  const inserted = range.insertText(output, "Replace");
  inserted.font.name = font;
}

/** Unicode fonts offered for converted Hindi (all ship with Windows). */
export const UNICODE_HINDI_FONTS = ["Mangal", "Nirmala UI", "Kokila", "Aparajita", "Utsaah"];

/** Kruti Dev fonts offered for Unicode -> Kruti Dev (must be installed on the PC). */
export const KRUTI_FONTS = ["Kruti Dev 010", "Kruti Dev 040 Wide", "Kruti Dev 011"];
