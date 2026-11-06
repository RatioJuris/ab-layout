/*
File: rj-pb-units.js
Path: /web/core/rj-pb-units.js
Project: AB Layout (Advocate Benefit Layout)
Developed by PrajnaBytes International Private Limited and RatioJuris
Copyright (C) 2026 PrajnaBytes International Private Limited and RatioJuris
SPDX-License-Identifier: GPL-3.0-or-later
Additional terms under GPLv3 section 7 apply (attribution and names) - see NOTICE.

Unit conversion. Word stores lengths in twentieths of a point (twips), so all
targets are rounded to 0.05 pt to keep repeated runs idempotent.
*/

export const POINTS_PER_CM = 72 / 2.54;
export const POINTS_PER_LINE = 12;

/** Tolerance (points) below which two Word measurements are treated as equal. */
export const TOLERANCE_PT = 0.1;

/** @param {number} cm */
export function cmToPt(cm) {
  return roundToTwip(cm * POINTS_PER_CM);
}

/** @param {number} pt */
export function ptToCm(pt) {
  return Math.round((pt / POINTS_PER_CM) * 100) / 100;
}

/** @param {number} lines Word UI line spacing, e.g. 1.5 */
export function linesToPt(lines) {
  return roundToTwip(lines * POINTS_PER_LINE);
}

/** @param {number} pt */
export function ptToLines(pt) {
  return Math.round((pt / POINTS_PER_LINE) * 100) / 100;
}

/** Line spacing in words, e.g. 18 pt -> "1.5 lines", 12 pt -> "1 line". @param {number} pt */
export function linesLabel(pt) {
  const n = ptToLines(pt);
  return `${n} ${n === 1 ? "line" : "lines"}`;
}

/** @param {number} pt */
export function roundToTwip(pt) {
  return Math.round(pt * 20) / 20;
}

/**
 * @param {number | null | undefined} a
 * @param {number | null | undefined} b
 * @param {number} [tolerance]
 */
export function nearlyEqual(a, b, tolerance = TOLERANCE_PT) {
  if (typeof a !== "number" || typeof b !== "number") return false;
  if (!Number.isFinite(a) || !Number.isFinite(b)) return false;
  return Math.abs(a - b) <= tolerance;
}

/** @param {unknown} v */
export function isFiniteNumber(v) {
  return typeof v === "number" && Number.isFinite(v);
}
