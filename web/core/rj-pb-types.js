/*
File: rj-pb-types.js
Path: /web/core/rj-pb-types.js
Project: AB Layout (Advocate Benefit Layout)
Developed by PrajnaBytes International Private Limited and RatioJuris
Copyright (C) 2026 PrajnaBytes International Private Limited and RatioJuris
SPDX-License-Identifier: GPL-3.0-or-later
Additional terms under GPLv3 section 7 apply (attribution and names) - see NOTICE.

Shared JSDoc type definitions. This file has no runtime behaviour; it exists so
that `npm run typecheck` can verify the plain-JavaScript modules.
*/

/**
 * @typedef {"Left" | "Centered" | "Right" | "Justified" | "Mixed" | "Unknown"} Alignment
 */

/**
 * Plain, Office-independent copy of the formatting of one body paragraph.
 * Font values are `null` when Word reports them as mixed within the paragraph.
 *
 * @typedef {Object} ParagraphSnapshot
 * @property {number} index                Position in document.body.paragraphs.
 * @property {string} text
 * @property {Alignment | string} alignment
 * @property {number} firstLineIndent      Points (negative = hanging indent).
 * @property {number} leftIndent           Points.
 * @property {number} rightIndent          Points.
 * @property {number} lineSpacing          Points; Word UI "lines" = value / 12.
 * @property {number} spaceBefore          Points.
 * @property {number} spaceAfter           Points.
 * @property {string} styleBuiltIn
 * @property {boolean} isListItem
 * @property {number} tableNestingLevel
 * @property {FontSnapshot} font
 * @property {string[]} [runFonts]         Font names found inside the paragraph (only collected when the font is mixed).
 */

/**
 * @typedef {Object} FontSnapshot
 * @property {string | null} name
 * @property {number | null} size
 * @property {string | null} color
 * @property {string | null} highlightColor  `null` = none, `""` = mixed, otherwise a colour.
 */

/**
 * @typedef {"empty" | "toc" | "table" | "heading" | "list" | "centered" | "right" | "tabbed" | "quote" | "short" | "body"} ParagraphKind
 */

/**
 * @typedef {Object} Classification
 * @property {ParagraphKind} kind
 * @property {boolean} fontProtected   true when the font family must not be changed.
 * @property {string | null} protectReason
 */

/**
 * Formatting properties AB Layout is allowed to set. Nothing else is ever written.
 *
 * @typedef {Object} FormatChange
 * @property {string} [fontName]
 * @property {number} [fontSize]
 * @property {string} [alignment]
 * @property {number} [lineSpacing]
 * @property {number} [spaceBefore]
 * @property {number} [spaceAfter]
 * @property {number} [firstLineIndent]
 * @property {number} [leftIndent]
 * @property {number} [rightIndent]
 */

/**
 * @typedef {Object} PlannedParagraph
 * @property {number} index
 * @property {ParagraphKind} kind
 * @property {FormatChange} set        Only properties whose value actually differs.
 * @property {FormatChange} previous   Original values of the properties in `set`.
 * @property {boolean} mixedFontUnified  true when a paragraph with several fonts/sizes is made uniform.
 */

/**
 * @typedef {"problem" | "check" | "info"} Severity
 */

/**
 * @typedef {Object} Finding
 * @property {string} id
 * @property {Severity} severity
 * @property {string} title
 * @property {string} detail
 * @property {number[]} paragraphs   Paragraph indexes the user can jump to.
 * @property {boolean} [fixable]      true when "Clean Document" addresses it.
 */

/**
 * @typedef {Object} PageSetupSnapshot
 * @property {number} pageWidth
 * @property {number} pageHeight
 * @property {number} topMargin
 * @property {number} bottomMargin
 * @property {number} leftMargin
 * @property {number} rightMargin
 */

/**
 * @typedef {Object} ReviewInfo
 * @property {number | null} comments        null = could not be checked in this version of Word.
 * @property {number | null} trackedChanges  null = could not be checked in this version of Word.
 */

export {};
