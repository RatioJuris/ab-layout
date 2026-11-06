/*
File: rj-pb-plan.js
Path: /web/core/rj-pb-plan.js
Project: AB Layout (Advocate Benefit Layout)
Developed by PrajnaBytes International Private Limited and RatioJuris
Copyright (C) 2026 PrajnaBytes International Private Limited and RatioJuris
SPDX-License-Identifier: GPL-3.0-or-later
Additional terms under GPLv3 section 7 apply (attribution and names) - see NOTICE.

Turns (document snapshot + profile) into an exact list of formatting changes.
The plan never contains text edits. Only properties whose value actually
differs are included, so applying the same profile twice changes nothing the
second time (idempotent).
*/

import { classifyAll, isBlankText } from "./rj-pb-classify.js";
import { MATCH } from "./rj-pb-profiles.js";
import { cmToPt, linesToPt, nearlyEqual, roundToTwip, isFiniteNumber } from "./rj-pb-units.js";

/**
 * @typedef {import("./rj-pb-types.js").ParagraphSnapshot} ParagraphSnapshot
 * @typedef {import("./rj-pb-types.js").Classification} Classification
 * @typedef {import("./rj-pb-types.js").PlannedParagraph} PlannedParagraph
 * @typedef {import("./rj-pb-types.js").FormatChange} FormatChange
 * @typedef {import("./rj-pb-profiles.js").Profile} Profile
 *
 * @typedef {Object} ResolvedTargets  All values in points except fontName/alignment.
 * @property {string | null} fontName
 * @property {number | null} fontSize
 * @property {string | null} alignment
 * @property {number | null} lineSpacing
 * @property {number | null} spaceBefore
 * @property {number | null} spaceAfter
 * @property {number | null} firstLineIndent
 * @property {number | null} leftIndent
 * @property {number | null} rightIndent
 * @property {number | null} quoteFontSize
 * @property {number | null} quoteLineSpacing
 *
 * @typedef {Object} FormattingPlan
 * @property {PlannedParagraph[]} changes
 * @property {ResolvedTargets} targets
 * @property {Classification[]} classes
 * @property {Record<string, number>} kindCounts
 * @property {Record<string, number>} changedKindCounts
 * @property {Array<{ index: number, reason: string }>} fontKept   Paragraphs whose font family was protected.
 * @property {number} mixedFontUnified
 * @property {number} totalParagraphs
 */

/**
 * Most common value of `pick` among the given paragraphs (ties: first seen).
 * @template T
 * @param {ParagraphSnapshot[]} paras
 * @param {(p: ParagraphSnapshot) => T | null | undefined} pick
 * @param {(v: T) => string} [key]
 * @returns {T | null}
 */
export function dominant(paras, pick, key = (v) => String(v)) {
  /** @type {Map<string, { value: T, count: number, first: number }>} */
  const counts = new Map();
  paras.forEach((p, i) => {
    const v = pick(p);
    if (v === null || v === undefined || v === "") return;
    if (typeof v === "number" && !Number.isFinite(v)) return;
    const k = key(v);
    const e = counts.get(k);
    if (e) e.count++;
    else counts.set(k, { value: v, count: 1, first: i });
  });
  /** @type {{ value: T, count: number, first: number } | null} */
  let best = null;
  for (const e of counts.values()) {
    if (!best || e.count > best.count || (e.count === best.count && e.first < best.first)) best = e;
  }
  return best ? best.value : null;
}

const round1 = (/** @type {number} */ n) => String(Math.round(n * 10) / 10);

/**
 * Converts profile values into concrete targets, resolving "match" from
 * the document's own body paragraphs.
 *
 * @param {Profile} profile
 * @param {ParagraphSnapshot[]} paras
 * @param {Classification[]} classes
 * @returns {ResolvedTargets}
 */
export function resolveTargets(profile, paras, classes) {
  const body = paras.filter((_, i) => classes[i].kind === "body");
  const bodyFontChangeable = paras.filter((_, i) => classes[i].kind === "body" && !classes[i].fontProtected);
  const quotes = paras.filter((_, i) => classes[i].kind === "quote");
  const b = profile.body;

  /**
   * @param {number | string} v
   * @param {(p: ParagraphSnapshot) => number | null} pick
   * @param {(n: number) => number} convert
   */
  const num = (v, pick, convert) => {
    if (v === MATCH) {
      const d = dominant(body, pick, round1);
      return d === null ? null : roundToTwip(d);
    }
    return typeof v === "number" ? convert(v) : null;
  };
  const id = (/** @type {number} */ n) => roundToTwip(n);

  const fontName =
    b.fontName === MATCH
      ? dominant(bodyFontChangeable, (p) => p.font.name)
      : b.fontName;
  const alignment =
    b.alignment === MATCH
      ? dominant(body, (p) => (p.alignment === "Left" || p.alignment === "Justified" ? p.alignment : null))
      : b.alignment;

  const q = profile.quotes;
  return {
    fontName,
    fontSize: num(b.fontSize, (p) => p.font.size, id),
    alignment,
    lineSpacing: num(b.lineSpacing, (p) => p.lineSpacing, linesToPt),
    spaceBefore: num(b.spaceBefore, (p) => p.spaceBefore, id),
    spaceAfter: num(b.spaceAfter, (p) => p.spaceAfter, id),
    firstLineIndent: num(b.firstLineIndentCm, (p) => p.firstLineIndent, cmToPt),
    leftIndent: num(b.leftIndentCm, (p) => p.leftIndent, cmToPt),
    rightIndent: num(b.rightIndentCm, (p) => p.rightIndent, cmToPt),
    quoteFontSize: q.enabled
      ? q.fontSize === MATCH
        ? (() => { const d = dominant(quotes, (p) => p.font.size, round1); return d === null ? null : roundToTwip(d); })()
        : roundToTwip(/** @type {number} */ (q.fontSize))
      : null,
    quoteLineSpacing: q.enabled
      ? q.lineSpacing === MATCH
        ? (() => { const d = dominant(quotes, (p) => p.lineSpacing, round1); return d === null ? null : roundToTwip(d); })()
        : linesToPt(/** @type {number} */ (q.lineSpacing))
      : null
  };
}

/** Which properties each kind of paragraph may receive. */
const ALLOWED = {
  empty: [],
  toc: [],
  table: ["fontName", "fontSize"],
  heading: ["fontName"],
  list: ["fontName", "fontSize", "lineSpacing", "spaceBefore", "spaceAfter"],
  centered: ["fontName"],
  right: ["fontName"],
  tabbed: ["fontName", "fontSize"],
  quote: ["fontName", "quoteFontSize", "quoteLineSpacing"],
  short: ["fontName", "fontSize"],
  body: ["fontName", "fontSize", "alignment", "lineSpacing", "spaceBefore", "spaceAfter", "firstLineIndent", "leftIndent", "rightIndent"]
};

/**
 * @param {ParagraphSnapshot[]} paras
 * @param {Profile} profile
 * @returns {FormattingPlan}
 */
export function buildFormattingPlan(paras, profile) {
  const classes = classifyAll(paras, profile.protectedFonts);
  const targets = resolveTargets(profile, paras, classes);

  /** @type {PlannedParagraph[]} */
  const changes = [];
  /** @type {Record<string, number>} */
  const kindCounts = {};
  /** @type {Record<string, number>} */
  const changedKindCounts = {};
  /** @type {Array<{ index: number, reason: string }>} */
  const fontKept = [];
  let mixedFontUnified = 0;

  paras.forEach((p, i) => {
    const c = classes[i];
    kindCounts[c.kind] = (kindCounts[c.kind] || 0) + 1;
    /** @type {string[]} */
    let allowed = ALLOWED[c.kind].slice();
    if (c.kind === "heading" && !profile.headingsFont) allowed = [];
    if (c.kind === "table" && !profile.tablesFont) allowed = [];

    /** @type {FormatChange} */
    const set = {};
    /** @type {FormatChange} */
    const previous = {};
    let unified = false;

    for (const prop of allowed) {
      if (prop === "fontName") {
        if (targets.fontName === null) continue;
        if (c.fontProtected) {
          if (p.font.name !== targets.fontName) fontKept.push({ index: i, reason: c.protectReason || "protected font" });
          continue;
        }
        if (p.font.name !== targets.fontName) {
          set.fontName = targets.fontName;
          previous.fontName = p.font.name ?? undefined;
          if (p.font.name === null) unified = true;
        }
        continue;
      }
      if (prop === "fontSize" || prop === "quoteFontSize") {
        const target = prop === "fontSize" ? targets.fontSize : targets.quoteFontSize;
        if (target === null) continue;
        if (!nearlyEqual(p.font.size, target)) {
          set.fontSize = target;
          if (isFiniteNumber(p.font.size)) previous.fontSize = /** @type {number} */ (p.font.size);
          else unified = true;
        }
        continue;
      }
      if (prop === "quoteLineSpacing") {
        if (targets.quoteLineSpacing === null) continue;
        if (!nearlyEqual(p.lineSpacing, targets.quoteLineSpacing)) {
          set.lineSpacing = targets.quoteLineSpacing;
          previous.lineSpacing = p.lineSpacing;
        }
        continue;
      }
      if (prop === "alignment") {
        if (targets.alignment === null) continue;
        if (p.alignment !== targets.alignment) {
          set.alignment = targets.alignment;
          previous.alignment = p.alignment;
        }
        continue;
      }
      const numericProp = /** @type {"lineSpacing" | "spaceBefore" | "spaceAfter" | "firstLineIndent" | "leftIndent" | "rightIndent"} */ (prop);
      const target = targets[numericProp];
      if (target === null) continue;
      if (!nearlyEqual(p[numericProp], target)) {
        set[numericProp] = target;
        previous[numericProp] = p[numericProp];
      }
    }

    if (Object.keys(set).length > 0) {
      if (unified) mixedFontUnified++;
      changes.push({ index: i, kind: c.kind, set, previous, mixedFontUnified: unified });
      changedKindCounts[c.kind] = (changedKindCounts[c.kind] || 0) + 1;
    }
  });

  return { changes, targets, classes, kindCounts, changedKindCounts, fontKept, mixedFontUnified, totalParagraphs: paras.length };
}

/**
 * Applies a plan to snapshots in memory (used by tests and to predict the
 * result of a second run).
 * @param {ParagraphSnapshot[]} paras
 * @param {PlannedParagraph[]} changes
 * @returns {ParagraphSnapshot[]}
 */
export function simulatePlan(paras, changes) {
  const out = paras.map((p) => ({ ...p, font: { ...p.font } }));
  for (const ch of changes) {
    const p = out[ch.index];
    const s = ch.set;
    if (s.fontName !== undefined) { p.font.name = s.fontName; p.runFonts = undefined; }
    if (s.fontSize !== undefined) p.font.size = s.fontSize;
    if (s.alignment !== undefined) p.alignment = s.alignment;
    for (const k of /** @type {const} */ (["lineSpacing", "spaceBefore", "spaceAfter", "firstLineIndent", "leftIndent", "rightIndent"])) {
      if (s[k] !== undefined) p[k] = /** @type {number} */ (s[k]);
    }
  }
  return out;
}

/**
 * Chooses which blank paragraphs could be removed: in every run of
 * consecutive blank body paragraphs, the first `keep` are kept. Blank lines
 * inside tables and the document's last paragraph are never candidates.
 * Each candidate must still pass the Word-side safety check (pictures,
 * page/section breaks, bookmarks, comments) before deletion.
 *
 * @param {ParagraphSnapshot[]} paras
 * @param {number} keep
 * @returns {number[]}
 */
export function blankLineCandidates(paras, keep) {
  /** @type {number[]} */
  const out = [];
  let run = 0;
  paras.forEach((p, i) => {
    const blank = p.tableNestingLevel === 0 && isBlankText(p.text) && !p.isListItem && !p.text.includes("\f");
    if (!blank) {
      run = 0;
      return;
    }
    run++;
    if (run > keep && i < paras.length - 1) out.push(i);
  });
  return out;
}

/**
 * Inspects a paragraph's Office Open XML and returns a reason why it must
 * not be deleted, or null if deleting it only removes an empty line.
 * @param {string} ooxml
 */
export function unsafeToDeleteReason(ooxml) {
  const doc = documentPart(ooxml);
  if (/<w:drawing\b|<w:pict\b|<w:object\b|<v:shape\b|<wp:anchor\b/.test(doc)) return "picture or shape";
  if (/<w:br\b[^>]*w:type="page"/.test(doc) || /<w:pageBreakBefore\b/.test(doc)) return "page break";
  const lastP = doc.lastIndexOf("</w:p>");
  const sect = doc.indexOf("<w:sectPr");
  if (sect >= 0 && lastP >= 0 && sect < lastP) return "section break";
  if (/<w:fldChar\b|<w:fldSimple\b|<w:instrText\b/.test(doc)) return "field";
  if (/<w:commentRangeStart\b|<w:commentReference\b/.test(doc)) return "comment";
  if (/<w:ins\b|<w:del\b/.test(doc)) return "tracked change";
  if (/<w:sdt\b/.test(doc)) return "content control";
  if (/<w:footnoteReference\b|<w:endnoteReference\b/.test(doc)) return "footnote";
  const bookmarks = doc.match(/<w:bookmarkStart\b[^>]*w:name="([^"]*)"/g) || [];
  if (bookmarks.some((b) => !/w:name="_GoBack"/.test(b))) return "bookmark";
  if (/<w:t\b[^>]*>[^<]*\S[^<]*<\/w:t>/.test(doc)) return "text";
  return null;
}

/** @param {string} ooxml */
function documentPart(ooxml) {
  const start = ooxml.indexOf('pkg:name="/word/document.xml"');
  if (start < 0) return ooxml;
  const end = ooxml.indexOf("</pkg:part>", start);
  return ooxml.slice(start, end < 0 ? undefined : end);
}
