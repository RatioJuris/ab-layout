/*
File: rj-pb-capabilities.js
Path: /web/word/rj-pb-capabilities.js
Project: AB Layout (Advocate Benefit Layout)
Developed by PrajnaBytes International Private Limited and RatioJuris
Copyright (C) 2026 PrajnaBytes International Private Limited and RatioJuris
SPDX-License-Identifier: GPL-3.0-or-later
Additional terms under GPLv3 section 7 apply (attribution and names) - see NOTICE.

Feature detection through Office requirement sets (never by guessing the
browser or operating system).
*/

/**
 * @typedef {Object} Capabilities
 * @property {boolean} core           WordApi 1.3: reading/formatting paragraphs, lists, tables, word ranges.
 * @property {boolean} comments       WordApi 1.4: counting comments.
 * @property {boolean} trackedChanges WordApi 1.6: counting tracked changes.
 * @property {boolean} pageSetup      WordApiDesktop 1.3: reading/changing paper size and margins (desktop only).
 * @property {string} platform        "PC", "Mac", "OfficeOnline", ... (for display only).
 * @property {string} platformLabel
 * @property {string} version
 */

/**
 * @param {any} office  The global `Office` object (injected for testing).
 * @returns {Capabilities}
 */
export function detectCapabilities(office) {
  const req = office && office.context && office.context.requirements;
  const has = (/** @type {string} */ set, /** @type {string} */ v) => {
    try {
      return !!req && typeof req.isSetSupported === "function" && req.isSetSupported(set, v) === true;
    } catch {
      return false;
    }
  };
  const diag = (office && office.context && office.context.diagnostics) || {};
  const platform = String(diag.platform || "Unknown");
  return {
    core: has("WordApi", "1.3"),
    comments: has("WordApi", "1.4"),
    trackedChanges: has("WordApi", "1.6"),
    pageSetup: has("WordApiDesktop", "1.3"),
    platform,
    platformLabel: platformLabel(platform),
    version: String(diag.version || "")
  };
}

/** @param {string} platform */
export function platformLabel(platform) {
  switch (platform) {
    case "PC": return "Word for Windows";
    case "Mac": return "Word for Mac";
    case "OfficeOnline": return "Word for the web";
    case "iOS": return "Word for iPad";
    case "Android": return "Word for Android";
    case "Universal": return "Word (Universal)";
    default: return "Word";
  }
}

/** Plain-language explanations for features that are not available. */
export const UNAVAILABLE = {
  core:
    "This version of Word is too old for AB Layout. It needs Word 2019 or later, Microsoft 365, or Word for the web.",
  pageSetup:
    "Word does not let add-ins change paper size or margins here (this works only in recent Word for Windows or Mac). Use Layout > Size and Layout > Margins in Word instead.",
  comments: "This version of Word does not let add-ins count comments.",
  trackedChanges: "This version of Word does not let add-ins count tracked changes."
};
