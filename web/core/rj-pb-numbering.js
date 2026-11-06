/*
File: rj-pb-numbering.js
Path: /web/core/rj-pb-numbering.js
Project: AB Layout (Advocate Benefit Layout)
Developed by PrajnaBytes International Private Limited and RatioJuris
Copyright (C) 2026 PrajnaBytes International Private Limited and RatioJuris
SPDX-License-Identifier: GPL-3.0-or-later
Additional terms under GPLv3 section 7 apply (attribution and names) - see NOTICE.

Checks hand-typed paragraph numbers ("1.", "2.", "3)") for gaps, repeats and
wrong order. AB Layout only reports these: renumbering automatically could
break references such as "as stated in para 5" in replies and affidavits.
*/

/**
 * Number typed at the start of a paragraph, e.g. "12. That the ..." -> 12.
 * Dates ("12.05.2020"), amounts ("1.5 lakh") and section numbers are ignored.
 * @param {string} text
 * @returns {number | null}
 */
export function typedParagraphNumber(text) {
  const m = /^\s*(\d{1,3})\s?[.)](?![\d.])\s*\S/.exec(text);
  if (!m) return null;
  const n = Number(m[1]);
  return n >= 1 ? n : null;
}

/**
 * @typedef {Object} NumberingIssue
 * @property {"gap" | "repeat" | "order"} type
 * @property {number} index        Paragraph index where the problem is seen.
 * @property {number} found
 * @property {number} expected
 * @property {string} message
 */

/**
 * @param {Array<{ index: number, text: string }>} paragraphs  Candidate paragraphs (not in tables / auto lists).
 * @returns {{ issues: NumberingIssue[], numberedCount: number, sequences: number }}
 */
export function checkTypedNumbering(paragraphs) {
  /** @type {NumberingIssue[]} */
  const issues = [];
  let prev = 0;
  let sequences = 0;
  let numberedCount = 0;

  for (const p of paragraphs) {
    const n = typedParagraphNumber(p.text);
    if (n === null) continue;
    numberedCount++;

    if (n === 1) {
      sequences++;
      prev = 1;
      continue;
    }
    if (prev === 0) {
      // Sequence starting part-way (e.g. a document that begins at para 4).
      sequences++;
      prev = n;
      continue;
    }
    const expected = prev + 1;
    if (n === expected) {
      prev = n;
    } else if (n === prev) {
      issues.push({ type: "repeat", index: p.index, found: n, expected, message: `Number ${n} is used twice (expected ${expected}).` });
    } else if (n > expected) {
      const missing = n - 1 === expected ? `${expected}` : `${expected}-${n - 1}`;
      issues.push({ type: "gap", index: p.index, found: n, expected, message: `Jumps from ${prev} to ${n}; ${missing} missing.` });
      prev = n;
    } else {
      issues.push({ type: "order", index: p.index, found: n, expected, message: `Number ${n} appears after ${prev}.` });
      prev = n;
    }
  }
  return { issues, numberedCount, sequences };
}
