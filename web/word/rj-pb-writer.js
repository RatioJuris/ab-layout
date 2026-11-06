/*
File: rj-pb-writer.js
Path: /web/word/rj-pb-writer.js
Project: AB Layout (Advocate Benefit Layout)
Developed by PrajnaBytes International Private Limited and RatioJuris
Copyright (C) 2026 PrajnaBytes International Private Limited and RatioJuris
SPDX-License-Identifier: GPL-3.0-or-later
Additional terms under GPLv3 section 7 apply (attribution and names) - see NOTICE.

Writes formatting to Word. Only the properties listed in FormatChange are
ever set; text is never inserted or replaced here. Blank-line removal is a
separate, opt-in step with its own safety check.
*/

import { unsafeToDeleteReason } from "../core/rj-pb-plan.js";

const APPLY_CHUNK = 100;
const OOXML_CHUNK = 20;

/**
 * @param {any} p  Word.Paragraph
 * @param {import("../core/rj-pb-types.js").FormatChange} set
 */
export function setParagraphFormat(p, set) {
  if (set.fontName !== undefined) p.font.name = set.fontName;
  if (set.fontSize !== undefined) p.font.size = set.fontSize;
  if (set.alignment !== undefined) p.alignment = set.alignment;
  if (set.lineSpacing !== undefined) p.lineSpacing = set.lineSpacing;
  if (set.spaceBefore !== undefined) p.spaceBefore = set.spaceBefore;
  if (set.spaceAfter !== undefined) p.spaceAfter = set.spaceAfter;
  if (set.firstLineIndent !== undefined) p.firstLineIndent = set.firstLineIndent;
  if (set.leftIndent !== undefined) p.leftIndent = set.leftIndent;
  if (set.rightIndent !== undefined) p.rightIndent = set.rightIndent;
}

/**
 * Applies changes in chunks. If a chunk fails (for example a locked content
 * control), its paragraphs are retried one by one so that one locked
 * paragraph does not stop the rest; failures are reported, not hidden.
 *
 * @param {any} context
 * @param {any[]} items  Word.Paragraph objects (same order as the snapshots).
 * @param {Array<{ index: number, set: import("../core/rj-pb-types.js").FormatChange }>} changes
 * @param {(done: number, total: number) => void} [onProgress]
 * @returns {Promise<{ applied: number[], failed: number[] }>}
 */
export async function applyChanges(context, items, changes, onProgress) {
  /** @type {number[]} */
  const applied = [];
  /** @type {number[]} */
  const failed = [];
  for (let start = 0; start < changes.length; start += APPLY_CHUNK) {
    const chunk = changes.slice(start, start + APPLY_CHUNK);
    try {
      for (const ch of chunk) setParagraphFormat(items[ch.index], ch.set);
      await context.sync();
      applied.push(...chunk.map((c) => c.index));
    } catch {
      for (const ch of chunk) {
        try {
          setParagraphFormat(items[ch.index], ch.set);
          await context.sync();
          applied.push(ch.index);
        } catch {
          failed.push(ch.index);
        }
      }
    }
    onProgress?.(Math.min(start + APPLY_CHUNK, changes.length), changes.length);
  }
  return { applied, failed };
}

/**
 * Deletes blank paragraphs only after checking each one's XML for pictures,
 * breaks, bookmarks, comments, fields and tracked changes.
 *
 * @param {any} context
 * @param {any[]} items
 * @param {number[]} candidates  Paragraph indexes (from blankLineCandidates).
 * @returns {Promise<{ removed: number[], kept: Array<{ index: number, reason: string }> }>}
 */
export async function removeBlankParagraphs(context, items, candidates) {
  /** @type {number[]} */
  const safe = [];
  /** @type {Array<{ index: number, reason: string }>} */
  const kept = [];
  for (let start = 0; start < candidates.length; start += OOXML_CHUNK) {
    const chunk = candidates.slice(start, start + OOXML_CHUNK);
    const xml = chunk.map((i) => items[i].getOoxml());
    await context.sync();
    chunk.forEach((i, k) => {
      const reason = unsafeToDeleteReason(xml[k].value);
      if (reason) kept.push({ index: i, reason });
      else safe.push(i);
    });
  }
  /** @type {number[]} */
  const removed = [];
  // Delete from the end so earlier indexes stay valid.
  for (const i of safe.slice().sort((a, b) => b - a)) {
    try {
      items[i].delete();
      await context.sync();
      removed.push(i);
    } catch {
      kept.push({ index: i, reason: "Word did not allow it" });
    }
  }
  removed.sort((a, b) => a - b);
  return { removed, kept };
}

/**
 * Selects a paragraph in Word so the user can see a finding.
 * @param {any} context
 * @param {number} index
 * @param {string} [expectedStart]  First characters of the paragraph, to make sure the document has not moved on.
 * @returns {Promise<boolean>}
 */
export async function selectParagraph(context, index, expectedStart) {
  const paragraphs = context.document.body.paragraphs;
  paragraphs.load("items/text");
  await context.sync();
  const p = paragraphs.items[index];
  if (!p) return false;
  if (expectedStart !== undefined && !p.text.startsWith(expectedStart)) return false;
  p.select();
  await context.sync();
  return true;
}
