/*
File: rj-pb-layouts.js
Path: /web/core/rj-pb-layouts.js
Project: AB Layout (Advocate Benefit Layout)
Developed by PrajnaBytes International Private Limited and RatioJuris
Copyright (C) 2026 PrajnaBytes International Private Limited and RatioJuris
SPDX-License-Identifier: GPL-3.0-or-later
Additional terms under GPLv3 section 7 apply (attribution and names) - see NOTICE.

Page size and margin presets from /layouts/layouts.json (the original AB
Layout data). Validation rules are carried over from the 3.x engine.
*/

/**
 * @typedef {{ top: number, bottom: number, left: number, right: number }} Margins
 *
 * @typedef {Object} Preset
 * @property {string} label
 * @property {number} width
 * @property {number} height
 * @property {Margins} [margins]
 * @property {boolean} [multiPage]
 * @property {Margins} [firstPage]
 * @property {Margins} [otherPages]
 * @property {string} [note]
 *
 * @typedef {Object} LayoutEntry
 * @property {string} id
 * @property {string} name
 * @property {string} preset
 * @property {string} type
 *
 * @typedef {{ _meta?: any, presets: Record<string, Preset>, layouts: LayoutEntry[] }} LayoutStore
 *
 * @typedef {Preset & { id: string, name: string }} ResolvedLayout
 */

/** @param {unknown} v */
const isNumber = (v) => typeof v === "number" && !isNaN(v);

/** @param {any} m */
const validMargins = (m) => !!m && ["top", "bottom", "left", "right"].every((k) => isNumber(m[k]) && m[k] >= 0);

/**
 * @param {any} store
 * @returns {{ valid: boolean, error?: string }}
 */
export function validateStore(store) {
  if (!store || !store.layouts || !store.presets) return { valid: false, error: "Invalid schema: Missing layouts or presets" };
  for (const l of store.layouts) {
    if (!store.presets[l.preset]) return { valid: false, error: `Layout ${l.id} refers to missing preset ${l.preset}` };
  }
  return { valid: true };
}

/**
 * @param {any} layout
 * @returns {{ valid: boolean, error?: string }}
 */
export function validateLayout(layout) {
  if (!layout) return { valid: false, error: "Layout missing" };
  if (!isNumber(layout.width) || !isNumber(layout.height)) return { valid: false, error: "Invalid page size dimensions" };
  if (layout.multiPage) {
    if (!validMargins(layout.firstPage) || !validMargins(layout.otherPages)) return { valid: false, error: "Invalid multi-page margins" };
  } else if (!validMargins(layout.margins)) {
    return { valid: false, error: "Invalid margin definitions" };
  }
  return { valid: true };
}

/**
 * @param {LayoutStore} store
 * @param {string} id
 * @returns {ResolvedLayout | null}
 */
export function resolveLayout(store, id) {
  const item = store.layouts.find((l) => l.id === id);
  if (!item) return null;
  const preset = store.presets[item.preset];
  if (!preset) return null;
  return { ...preset, id: item.id, name: item.name };
}

/**
 * Margins for each section. A different first-page margin (e.g. space for the
 * stamp-paper heading of an affidavit) needs the first page to be its own
 * section; Word has no "first page only" margin otherwise.
 *
 * @param {ResolvedLayout} layout
 * @param {number} sectionCount
 * @returns {{ perSection: Margins[], notes: string[] }}
 */
export function planSectionMargins(layout, sectionCount) {
  /** @type {string[]} */
  const notes = [];
  if (!layout.multiPage) {
    return { perSection: Array.from({ length: sectionCount }, () => /** @type {Margins} */ (layout.margins)), notes };
  }
  const first = /** @type {Margins} */ (layout.firstPage);
  const other = /** @type {Margins} */ (layout.otherPages);
  if (sectionCount < 2) {
    notes.push(
      "The special first-page margin was NOT applied, because this document has only one section and Word would put it on every page. " +
      "To leave stamp-paper space on page 1 only: place the cursor at the end of page 1, choose Layout > Breaks > Next Page, then apply this layout again."
    );
    return { perSection: [other], notes };
  }
  return { perSection: [first, ...Array.from({ length: sectionCount - 1 }, () => other)], notes };
}
