/*
File: rj-pb-fonts.js
Path: /web/core/rj-pb-fonts.js
Project: AB Layout (Advocate Benefit Layout)
Developed by PrajnaBytes International Private Limited and RatioJuris
Copyright (C) 2026 PrajnaBytes International Private Limited and RatioJuris
SPDX-License-Identifier: GPL-3.0-or-later
Additional terms under GPLv3 section 7 apply (attribution and names) - see NOTICE.

Font safety rules.

Legacy (non-Unicode) Indian-language fonts such as Kruti Dev store Hindi as
ordinary Latin letters that only look like Devanagari in that font. Changing
the font turns the text into gibberish, so such text is never re-fonted.
The same applies to symbol fonts (Wingdings tick marks, Symbol characters).
Unicode Indian-language and Urdu text is also left in its own font because
Latin fonts like Times New Roman cannot display those scripts properly.

The lists below are deliberately broad and are matched case-insensitively.
Users can add more names in a custom profile ("protectedFonts").
*/

/** Legacy (non-Unicode) Indian-language font families commonly seen in court documents. */
const LEGACY_INDIC_PATTERNS = [
  /kruti\s*dev/i,
  /\bdevlys/i,
  /chanakya/i,
  /walkman/i,
  /\bshusha/i,
  /\bshivaji/i,
  /\bagra\b/i,
  /\baps[-\s]?dv/i,
  /\bkrishna\b/i,
  /\bkundli/i,
  /\bakruti/i,
  /\bshree[-\s]?(dev|lipi|guj|pun|tam|tel|kan|mal|ben|ori)/i,
  /\bsurekh/i,
  /\bdv[-\s]?ttsurekh/i,
  /\bbaraha\b(?!.*unicode)/i,
  /\bbrh\b/i,
  /\bnudi\b(?!.*unicode)/i,
  /\bbamini/i,
  /\btsc[u_]/i,
  /\btab[-_\s]/i,
  /\btam[-_\s]/i,
  /\bvanavil/i,
  /\bml[-_]tt/i,
  /\bkarthika\b/i,
  /\bsutonny/i,
  /\bbijoy/i,
  /\banmol\s*lipi/i,
  /\bgurbani\s*akhar/i,
  /\bjoy\b/i,
  /\basees\b/i,
  /\bterafont/i,
  /\bgopika/i,
  /\bharshal/i,
  /\banu\s*script/i,
  /\bismdev/i,
  /\bpriya\b/i
];

const SYMBOL_FONTS = [
  "symbol",
  "wingdings",
  "wingdings 2",
  "wingdings 3",
  "webdings",
  "marlett",
  "mt extra",
  "zapf dingbats",
  "segoe ui symbol"
];

/**
 * @param {string | null | undefined} name
 * @param {string[]} [extraProtected]  Additional font names from the user's profile.
 * @returns {{ protected: boolean, kind: "legacy-indic" | "symbol" | "user" | null }}
 */
export function classifyFontName(name, extraProtected = []) {
  if (!name) return { protected: false, kind: null };
  const trimmed = name.trim();
  const lower = trimmed.toLowerCase();

  if (extraProtected.some((f) => f.trim().toLowerCase() === lower)) {
    return { protected: true, kind: "user" };
  }
  if (SYMBOL_FONTS.includes(lower)) {
    return { protected: true, kind: "symbol" };
  }
  if (LEGACY_INDIC_PATTERNS.some((re) => re.test(trimmed))) {
    return { protected: true, kind: "legacy-indic" };
  }
  return { protected: false, kind: null };
}

/** Devanagari through Sinhala (all major Indian scripts) plus Arabic script (Urdu). */
const NON_LATIN_SCRIPT = /[\u0900-\u0DFF\u0600-\u06FF\u0750-\u077F]/;

/** Characters Word uses for symbol-font glyphs (private-use area). */
const SYMBOL_PRIVATE_USE = /[\uF020-\uF0FF]/;

/** @param {string} text */
export function containsIndianOrUrduScript(text) {
  return NON_LATIN_SCRIPT.test(text);
}

/** @param {string} text */
export function containsSymbolCharacters(text) {
  return SYMBOL_PRIVATE_USE.test(text);
}

/**
 * Extracts explicit font names from a paragraph's Office Open XML package.
 * Only the document and styles parts are scanned (font tables and themes list
 * fonts that are not necessarily used).
 *
 * @param {string} ooxml
 * @returns {string[]}
 */
export function extractFontNamesFromOoxml(ooxml) {
  if (!ooxml) return [];
  const parts = selectParts(ooxml, ["/word/document.xml", "/word/styles.xml"]);
  const names = new Set();
  const attr = /w:(?:ascii|hAnsi|cs|eastAsia|font)="([^"]+)"/g;
  let m;
  while ((m = attr.exec(parts)) !== null) {
    names.add(decodeXmlEntities(m[1]));
  }
  return Array.from(names).sort();
}

/**
 * @param {string} ooxml
 * @param {string[]} partNames
 */
function selectParts(ooxml, partNames) {
  if (!ooxml.includes("<pkg:part")) return ooxml;
  let out = "";
  for (const name of partNames) {
    const start = ooxml.indexOf(`pkg:name="${name}"`);
    if (start < 0) continue;
    const end = ooxml.indexOf("</pkg:part>", start);
    out += ooxml.slice(start, end < 0 ? undefined : end);
  }
  return out;
}

/** @param {string} s */
function decodeXmlEntities(s) {
  return s
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&apos;/g, "'")
    .replace(/&amp;/g, "&");
}

/**
 * Decides whether a paragraph's font family may be changed.
 *
 * @param {import("./rj-pb-types.js").ParagraphSnapshot} p
 * @param {string[]} [extraProtected]
 * @returns {{ protected: boolean, reason: string | null }}
 */
export function fontProtection(p, extraProtected = []) {
  const own = classifyFontName(p.font.name, extraProtected);
  if (own.protected) return { protected: true, reason: reasonFor(own.kind, p.font.name) };

  for (const name of p.runFonts || []) {
    const c = classifyFontName(name, extraProtected);
    if (c.protected) return { protected: true, reason: reasonFor(c.kind, name) };
  }
  if (containsIndianOrUrduScript(p.text)) {
    return { protected: true, reason: "Indian-language or Urdu text" };
  }
  if (containsSymbolCharacters(p.text)) {
    return { protected: true, reason: "symbols (e.g. tick marks)" };
  }
  // A mixed-font paragraph whose fonts could not be read is treated as unsafe.
  if (p.font.name === null && p.runFonts === undefined) {
    return { protected: true, reason: "fonts could not be checked" };
  }
  return { protected: false, reason: null };
}

/**
 * @param {"legacy-indic" | "symbol" | "user" | null} kind
 * @param {string | null} name
 */
function reasonFor(kind, name) {
  if (kind === "legacy-indic") return `legacy Indian-language font (${name})`;
  if (kind === "symbol") return `symbol font (${name})`;
  return `protected font (${name})`;
}
