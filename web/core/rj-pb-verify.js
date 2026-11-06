/*
File: rj-pb-verify.js
Path: /web/core/rj-pb-verify.js
Project: AB Layout (Advocate Benefit Layout)
Developed by PrajnaBytes International Private Limited and RatioJuris
Copyright (C) 2026 PrajnaBytes International Private Limited and RatioJuris
SPDX-License-Identifier: GPL-3.0-or-later
Additional terms under GPLv3 section 7 apply (attribution and names) - see NOTICE.

Proof that formatting did not change the words of the document: the text of
every paragraph is compared before and after. Text stays in memory only.
*/

/**
 * @param {string[]} before
 * @param {string[]} after
 * @param {number[]} [removedBlankIndexes]  Blank paragraphs that were deliberately removed (indexes in `before`).
 * @returns {{ ok: boolean, compared: number, changedIndexes: number[], countBefore: number, countAfter: number, message: string }}
 */
export function compareParagraphTexts(before, after, removedBlankIndexes = []) {
  const removed = new Set(removedBlankIndexes);
  const expected = before.filter((_, i) => !removed.has(i));
  /** @type {number[]} */
  const changedIndexes = [];
  const n = Math.min(expected.length, after.length);
  for (let i = 0; i < n; i++) {
    if (expected[i] !== after[i]) changedIndexes.push(i);
  }
  const countOk = expected.length === after.length;
  const ok = countOk && changedIndexes.length === 0;
  let message;
  if (ok) {
    message = `Text check passed: all ${after.length} paragraphs have exactly the same words and order as before.`;
  } else if (!countOk) {
    message = `Text check warning: expected ${expected.length} paragraphs but found ${after.length}. The document may have been edited while AB Layout was working. Please review it, or use Undo.`;
  } else {
    message = `Text check warning: ${changedIndexes.length} paragraph(s) read back differently. Please review them, or use Undo.`;
  }
  return { ok, compared: n, changedIndexes, countBefore: before.length, countAfter: after.length, message };
}

/**
 * Small, fast fingerprint used to detect that the document changed between
 * preview and apply. Not a security hash.
 * @param {string[]} texts
 */
export function fingerprint(texts) {
  let h = 0x811c9dc5;
  for (const t of texts) {
    for (let i = 0; i < t.length; i++) {
      h ^= t.charCodeAt(i);
      h = Math.imul(h, 0x01000193);
    }
    h ^= 0x2029;
    h = Math.imul(h, 0x01000193);
  }
  return `${texts.length}:${(h >>> 0).toString(16)}`;
}
