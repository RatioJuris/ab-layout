/*
File: rj-pb-profiles.js
Path: /web/core/rj-pb-profiles.js
Project: AB Layout (Advocate Benefit Layout)
Developed by PrajnaBytes International Private Limited and RatioJuris
Copyright (C) 2026 PrajnaBytes International Private Limited and RatioJuris
SPDX-License-Identifier: GPL-3.0-or-later
Additional terms under GPLv3 section 7 apply (attribution and names) - see NOTICE.

Formatting profiles. A profile is a convenience preset, never a guarantee of
compliance with any court's rules. Every value can be the word "match", which
means "use what most of this document already uses" - the most conservative
choice, because it only removes inconsistency without imposing a new style.

Units used in profiles (what advocates see in Word):
  fontSize, spaceBefore, spaceAfter: points
  lineSpacing: lines (1, 1.15, 1.5, 2)
  indents: centimetres
*/

export const MATCH = "match";

/**
 * @typedef {number | "match"} NumOrMatch
 *
 * @typedef {Object} BodySettings
 * @property {string} fontName            Font family or "match".
 * @property {NumOrMatch} fontSize
 * @property {"Justified" | "Left" | "match"} alignment
 * @property {NumOrMatch} lineSpacing
 * @property {NumOrMatch} spaceBefore
 * @property {NumOrMatch} spaceAfter
 * @property {NumOrMatch} firstLineIndentCm
 * @property {NumOrMatch} leftIndentCm
 * @property {NumOrMatch} rightIndentCm
 *
 * @typedef {Object} QuoteSettings
 * @property {boolean} enabled            When false, quotations get only the body font family.
 * @property {NumOrMatch} fontSize
 * @property {NumOrMatch} lineSpacing
 *
 * @typedef {Object} Profile
 * @property {string} id
 * @property {string} name
 * @property {string} description
 * @property {boolean} builtIn
 * @property {string} [source]            Citation for any rule the profile follows.
 * @property {BodySettings} body
 * @property {QuoteSettings} quotes
 * @property {boolean} headingsFont       Apply the body font family to headings.
 * @property {boolean} tablesFont         Apply body font family and size inside tables.
 * @property {string[]} protectedFonts    Extra fonts that must never be changed.
 */

const CONVENTION_NOTE =
  "A common convention, not an official rule. Check your court's current requirements and adjust if needed.";

/** @type {Profile[]} */
export const BUILT_IN_PROFILES = [
  {
    id: "match-document",
    name: "Make Consistent (match this document)",
    description:
      "Keeps your document's own style and only removes inconsistencies: every body paragraph gets the font, size, spacing and indent that most of the document already uses.",
    builtIn: true,
    body: {
      fontName: MATCH, fontSize: MATCH, alignment: MATCH, lineSpacing: MATCH,
      spaceBefore: MATCH, spaceAfter: MATCH, firstLineIndentCm: MATCH, leftIndentCm: MATCH, rightIndentCm: MATCH
    },
    quotes: { enabled: false, fontSize: MATCH, lineSpacing: MATCH },
    headingsFont: true,
    tablesFont: true,
    protectedFonts: []
  },
  {
    id: "sc-a4-2020",
    name: "Supreme Court A4 style (Circular 2020)",
    description:
      "Times New Roman 14, 1.5 line spacing; quotations and indented text 12 pt, single spacing. Use with the matching A4 page layout (4 cm left/right, 2 cm top/bottom).",
    source:
      "Supreme Court of India, F.No.01/Judl./2020 dated 05.03.2020 (A4 paper, Times New Roman 14, 1.5 spacing; quotations 12 pt single). Verify current requirements.",
    builtIn: true,
    body: {
      fontName: "Times New Roman", fontSize: 14, alignment: "Justified", lineSpacing: 1.5,
      spaceBefore: 0, spaceAfter: 6, firstLineIndentCm: MATCH, leftIndentCm: 0, rightIndentCm: 0
    },
    quotes: { enabled: true, fontSize: 12, lineSpacing: 1 },
    headingsFont: true,
    tablesFont: true,
    protectedFonts: []
  },
  {
    id: "double-14",
    name: "Double-spaced 14 pt",
    description:
      "Times New Roman 14 with double line spacing. Some High Courts ask for this (e.g. Allahabad High Court directions of October 2026 for English pleadings). Hindi in a Unicode font is left in its own font.",
    source:
      "Reported: Allahabad High Court, Sheo Kinkar Singh v. State of U.P., 2026 LiveLaw (AB) 900 - Times New Roman 14, double spacing, effective 12.11.2026. Verify current requirements.",
    builtIn: true,
    body: {
      fontName: "Times New Roman", fontSize: 14, alignment: "Justified", lineSpacing: 2,
      spaceBefore: 0, spaceAfter: 0, firstLineIndentCm: MATCH, leftIndentCm: 0, rightIndentCm: 0
    },
    quotes: { enabled: false, fontSize: MATCH, lineSpacing: MATCH },
    headingsFont: true,
    tablesFont: true,
    protectedFonts: []
  },
  {
    id: "petition",
    name: "Petition / Application",
    description: `Times New Roman 14, 1.5 spacing, justified, first-line indent 1.27 cm, 6 pt after each paragraph. ${CONVENTION_NOTE}`,
    builtIn: true,
    body: {
      fontName: "Times New Roman", fontSize: 14, alignment: "Justified", lineSpacing: 1.5,
      spaceBefore: 0, spaceAfter: 6, firstLineIndentCm: 1.27, leftIndentCm: 0, rightIndentCm: 0
    },
    quotes: { enabled: true, fontSize: 12, lineSpacing: 1 },
    headingsFont: true,
    tablesFont: true,
    protectedFonts: []
  },
  {
    id: "written-submission",
    name: "Written Submission",
    description: `Times New Roman 14, 1.5 spacing, justified, 6 pt after paragraphs, quotations 12 pt single-spaced. Keeps your existing indents. ${CONVENTION_NOTE}`,
    builtIn: true,
    body: {
      fontName: "Times New Roman", fontSize: 14, alignment: "Justified", lineSpacing: 1.5,
      spaceBefore: 0, spaceAfter: 6, firstLineIndentCm: MATCH, leftIndentCm: MATCH, rightIndentCm: MATCH
    },
    quotes: { enabled: true, fontSize: 12, lineSpacing: 1 },
    headingsFont: true,
    tablesFont: true,
    protectedFonts: []
  },
  {
    id: "affidavit",
    name: "Affidavit",
    description: `Times New Roman 14, 1.5 spacing, justified, first-line indent 1.27 cm. Deponent and verification lines that are centred or right-aligned are kept as they are. ${CONVENTION_NOTE}`,
    builtIn: true,
    body: {
      fontName: "Times New Roman", fontSize: 14, alignment: "Justified", lineSpacing: 1.5,
      spaceBefore: 0, spaceAfter: 6, firstLineIndentCm: 1.27, leftIndentCm: 0, rightIndentCm: 0
    },
    quotes: { enabled: false, fontSize: MATCH, lineSpacing: MATCH },
    headingsFont: true,
    tablesFont: true,
    protectedFonts: []
  },
  {
    id: "office-copy",
    name: "Office Copy (compact)",
    description:
      "Times New Roman 12, single spacing, 6 pt after paragraphs - saves paper for chamber files and client copies. Not meant for filing.",
    builtIn: true,
    body: {
      fontName: "Times New Roman", fontSize: 12, alignment: "Justified", lineSpacing: 1,
      spaceBefore: 0, spaceAfter: 6, firstLineIndentCm: MATCH, leftIndentCm: MATCH, rightIndentCm: MATCH
    },
    quotes: { enabled: true, fontSize: 11, lineSpacing: 1 },
    headingsFont: true,
    tablesFont: true,
    protectedFonts: []
  }
];

export const LIMITS = {
  fontSize: [6, 72],
  lineSpacing: [0.5, 5],
  space: [0, 120],
  indentCm: [-10, 20]
};

/**
 * @param {unknown} v
 * @param {[number, number]} range
 */
function okNumOrMatch(v, range) {
  if (v === MATCH) return true;
  return typeof v === "number" && Number.isFinite(v) && v >= range[0] && v <= range[1];
}

/**
 * Validates a profile (built-in or user-made, e.g. after import).
 * @param {any} p
 * @returns {{ valid: boolean, errors: string[] }}
 */
export function validateProfile(p) {
  /** @type {string[]} */
  const errors = [];
  if (!p || typeof p !== "object") return { valid: false, errors: ["Profile is empty."] };
  if (typeof p.id !== "string" || !p.id.trim()) errors.push("Profile has no id.");
  if (typeof p.name !== "string" || !p.name.trim()) errors.push("Please give the profile a name.");
  if (typeof p.name === "string" && p.name.length > 80) errors.push("Profile name is too long (80 characters max).");
  const b = p.body;
  if (!b || typeof b !== "object") {
    errors.push("Body settings are missing.");
  } else {
    if (typeof b.fontName !== "string" || !b.fontName.trim()) errors.push("Choose a font.");
    if (!okNumOrMatch(b.fontSize, /** @type {[number, number]} */ (LIMITS.fontSize))) errors.push("Font size must be between 6 and 72.");
    if (!["Justified", "Left", MATCH].includes(b.alignment)) errors.push("Alignment must be Justified, Left or Match.");
    if (!okNumOrMatch(b.lineSpacing, /** @type {[number, number]} */ (LIMITS.lineSpacing))) errors.push("Line spacing must be between 0.5 and 5 lines.");
    if (!okNumOrMatch(b.spaceBefore, /** @type {[number, number]} */ (LIMITS.space))) errors.push("Space before must be between 0 and 120 pt.");
    if (!okNumOrMatch(b.spaceAfter, /** @type {[number, number]} */ (LIMITS.space))) errors.push("Space after must be between 0 and 120 pt.");
    for (const k of ["firstLineIndentCm", "leftIndentCm", "rightIndentCm"]) {
      if (!okNumOrMatch(b[k], /** @type {[number, number]} */ (LIMITS.indentCm))) errors.push("Indents must be between -10 and 20 cm.");
    }
  }
  const q = p.quotes;
  if (!q || typeof q !== "object" || typeof q.enabled !== "boolean") {
    errors.push("Quotation settings are missing.");
  } else if (q.enabled) {
    if (!okNumOrMatch(q.fontSize, /** @type {[number, number]} */ (LIMITS.fontSize))) errors.push("Quotation font size must be between 6 and 72.");
    if (!okNumOrMatch(q.lineSpacing, /** @type {[number, number]} */ (LIMITS.lineSpacing))) errors.push("Quotation line spacing must be between 0.5 and 5.");
  }
  if (typeof p.headingsFont !== "boolean") errors.push("Heading setting is missing.");
  if (typeof p.tablesFont !== "boolean") errors.push("Table setting is missing.");
  if (!Array.isArray(p.protectedFonts) || p.protectedFonts.some((/** @type {unknown} */ f) => typeof f !== "string")) {
    errors.push("Protected fonts must be a list of font names.");
  }
  return { valid: errors.length === 0, errors: Array.from(new Set(errors)) };
}

/**
 * Deep copy that can be safely edited.
 * @param {Profile} p
 * @returns {Profile}
 */
export function cloneProfile(p) {
  return JSON.parse(JSON.stringify(p));
}

/**
 * Starts a new custom profile from an existing one.
 * @param {Profile} base
 * @param {string} name
 * @param {() => string} [makeId]
 * @returns {Profile}
 */
export function createCustomProfile(base, name, makeId = () => "custom-" + Date.now().toString(36)) {
  const p = cloneProfile(base);
  p.id = makeId();
  p.name = name;
  p.builtIn = false;
  p.description = `Custom profile based on "${base.name}".`;
  delete p.source;
  return p;
}

/**
 * @param {Profile[]} custom
 * @returns {Profile[]}
 */
export function allProfiles(custom) {
  return [...BUILT_IN_PROFILES, ...custom];
}

/**
 * Plain-language one-line summary of a profile's body settings.
 * @param {Profile} p
 */
export function describeProfile(p) {
  const b = p.body;
  /** @param {NumOrMatch | string} v @param {string} unit */
  const show = (v, unit) => (v === MATCH ? "as in document" : `${v}${unit}`);
  const font =
    b.fontName === MATCH && b.fontSize === MATCH
      ? "Font and size: as in document"
      : `Font: ${b.fontName === MATCH ? "as in document" : b.fontName}, ${b.fontSize === MATCH ? "size as in document" : `${b.fontSize} pt`}`;
  return [
    font,
    `Line spacing: ${show(b.lineSpacing, " lines")}`,
    `Alignment: ${b.alignment === MATCH ? "as in document" : b.alignment}`,
    `First-line indent: ${show(b.firstLineIndentCm, " cm")}`,
    `Space after paragraph: ${show(b.spaceAfter, " pt")}`
  ];
}
