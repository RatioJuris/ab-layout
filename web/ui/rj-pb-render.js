/*
File: rj-pb-render.js
Path: /web/ui/rj-pb-render.js
Project: AB Layout (Advocate Benefit Layout)
Developed by PrajnaBytes International Private Limited and RatioJuris
Copyright (C) 2026 PrajnaBytes International Private Limited and RatioJuris
SPDX-License-Identifier: GPL-3.0-or-later
Additional terms under GPLv3 section 7 apply (attribution and names) - see NOTICE.

Builds the result views shown in the task pane, in plain language.
*/

import { el } from "./rj-pb-dom.js";
import { KIND_LABELS } from "../core/rj-pb-classify.js";
import { describeProfile } from "../core/rj-pb-profiles.js";
import { ptToCm, linesLabel } from "../core/rj-pb-units.js";

const SEVERITY_LABEL = { problem: "Fix", check: "Check", info: "Note" };

/** @param {string} s */
const capitalise = (s) => s.charAt(0).toUpperCase() + s.slice(1);

/**
 * @param {import("../core/rj-pb-types.js").Finding} f
 * @param {(index: number) => void} onShow
 */
export function findingItem(f, onShow) {
  let cursor = 0;
  const showBtn =
    f.paragraphs.length > 0
      ? el("button", { class: "link", type: "button" }, [f.paragraphs.length > 1 ? `Show (1 of ${f.paragraphs.length})` : "Show"])
      : null;
  if (showBtn) {
    showBtn.addEventListener("click", () => {
      const index = f.paragraphs[cursor];
      cursor = (cursor + 1) % f.paragraphs.length;
      if (f.paragraphs.length > 1) showBtn.textContent = `Show next (${cursor + 1} of ${f.paragraphs.length})`;
      onShow(index);
    });
  }
  return el("li", { class: `finding ${f.severity}` }, [
    el("span", { class: "tag" }, [SEVERITY_LABEL[f.severity]]),
    el("span", { class: "title" }, [f.title]),
    el("p", null, [f.detail]),
    f.fixable ? el("p", { class: "muted" }, ["Clean Document can fix this."]) : null,
    showBtn
  ]);
}

/**
 * @param {import("../core/rj-pb-profiles.js").Profile} p
 */
export function profileInfo(p) {
  return [
    el("div", null, [p.description]),
    el("ul", null, describeProfile(p).map((line) => el("li", null, [line]))),
    p.source ? el("div", { class: "muted small" }, ["Source: " + p.source]) : null
  ];
}

/**
 * @param {import("../core/rj-pb-plan.js").FormattingPlan} plan
 * @param {number} blankCandidates
 */
export function previewView(plan, blankCandidates) {
  const t = plan.targets;
  /** @type {string[]} */
  const targetLines = [];
  if (t.fontName) targetLines.push(`Font: ${t.fontName}${t.fontSize ? `, ${t.fontSize} pt` : ""}`);
  if (t.lineSpacing !== null) targetLines.push(`Line spacing: ${linesLabel(t.lineSpacing)}`);
  if (t.alignment) targetLines.push(`Alignment: ${t.alignment}`);
  if (t.firstLineIndent !== null) targetLines.push(`First-line indent: ${ptToCm(t.firstLineIndent)} cm`);
  if (t.spaceAfter !== null) targetLines.push(`Space after paragraphs: ${t.spaceAfter} pt`);
  if (t.quoteFontSize !== null) targetLines.push(`Quotations: ${t.quoteFontSize} pt, ${t.quoteLineSpacing !== null ? linesLabel(t.quoteLineSpacing) : "spacing kept"}`);

  const changed = plan.changes.length;
  const kinds = Object.entries(plan.changedKindCounts)
    .sort((a, b) => b[1] - a[1])
    .map(([k, n]) => el("li", null, [`${capitalise(KIND_LABELS[/** @type {keyof typeof KIND_LABELS} */ (k)])}: ${n}`]));

  /** @type {Array<Node | string | null>} */
  const notes = [];
  if (plan.fontKept.length > 0) {
    const reasons = Array.from(new Set(plan.fontKept.map((f) => f.reason))).slice(0, 3).join("; ");
    notes.push(el("li", null, [`${plan.fontKept.length} paragraph(s) keep their own font (${reasons}).`]));
  }
  if (plan.mixedFontUnified > 0) {
    notes.push(el("li", null, [`${plan.mixedFontUnified} paragraph(s) currently mix fonts or sizes and will become uniform. Bold, italics and underline are kept. "Restore" cannot bring back the old mix - keep a saved copy if it matters.`]));
  }
  const untouched = ["centered", "right", "tabbed", "heading", "short"]
    .filter((k) => plan.kindCounts[k])
    .map((k) => `${KIND_LABELS[/** @type {keyof typeof KIND_LABELS} */ (k)]}: ${plan.kindCounts[k]}`);
  if (untouched.length > 0) notes.push(el("li", null, [`Layout kept (font only): ${untouched.join(", ")}.`]));
  if (plan.kindCounts.table) notes.push(el("li", null, [`Lines inside tables (${plan.kindCounts.table}): font only, table layout untouched.`]));
  if (blankCandidates > 0) notes.push(el("li", null, [`Up to ${blankCandidates} extra blank line(s) will be removed (each is checked first; lines holding pictures, breaks or bookmarks are kept).`]));

  return [
    el("h3", null, [changed === 0 ? "Nothing to change" : `${changed} of ${plan.totalParagraphs} paragraphs will be reformatted`]),
    changed === 0 && blankCandidates === 0 ? el("p", null, ["The document already matches this profile."]) : null,
    targetLines.length ? el("div", { class: "muted small" }, ["Target: " + targetLines.join(" | ")]) : null,
    kinds.length ? el("ul", null, kinds) : null,
    notes.length ? el("div", null, [el("strong", null, ["Please note"]), el("ul", null, notes)]) : null
  ];
}

/**
 * @param {any} r  Result of service.applyClean
 */
export function resultView(r) {
  const v = r.verification;
  return [
    el("h3", null, ["Done"]),
    el("ul", null, [
      el("li", null, [`${r.applied} paragraph(s) reformatted.`]),
      r.failed.length ? el("li", { class: "bad" }, [`${r.failed.length} paragraph(s) could not be changed (locked or protected). Use Check Document to find them.`]) : null,
      r.removed.length ? el("li", null, [`${r.removed.length} extra blank line(s) removed.`]) : null,
      r.keptBlank.length ? el("li", null, [`${r.keptBlank.length} blank line(s) kept because they hold something (${Array.from(new Set(r.keptBlank.map((/** @type {any} */ k) => k.reason))).join(", ")}).`]) : null
    ]),
    el("p", { class: v.ok ? "ok" : "bad" }, [v.message]),
    el("p", { class: "muted small" }, ["Please look through the document and save it when you are happy."])
  ];
}

/**
 * @param {import("../word/rj-pb-hindi.js").HindiReport} r
 * @param {boolean} dryRun
 * @param {"toUnicode" | "toKruti"} direction
 */
export function hindiView(r, dryRun, direction) {
  const skipped = r.skipped["mixed-font"] + r.skipped.special + r.skipped["not-exact"];
  /** @type {Node[]} */
  const skipLines = [];
  if (r.skipped["not-exact"]) skipLines.push(el("li", null, [`${r.skipped["not-exact"]} word(s) could not be converted exactly and were left as they are.`]));
  if (r.skipped["mixed-font"]) skipLines.push(el("li", null, [`${r.skipped["mixed-font"]} word(s) mix two fonts and were left as they are.`]));
  if (r.skipped.special) skipLines.push(el("li", null, [`${r.skipped.special} word(s) contain a footnote mark, field or line break and were left as they are.`]));

  const count = dryRun ? r.toConvert : r.converted;
  const what = direction === "toUnicode" ? "Kruti Dev word(s)" : "Hindi word(s)";
  return [
    el("h3", null, [
      dryRun
        ? count === 0
          ? `No ${direction === "toUnicode" ? "Kruti Dev text" : "Unicode Hindi text"} found in ${r.paragraphsScanned} paragraph(s).`
          : `${count} ${what} will be converted.`
        : `${count} ${what} converted.`
    ]),
    r.samples.length && direction === "toUnicode"
      ? el("div", null, [el("span", { class: "muted small" }, ["Sample result: "]), el("span", { class: "samples" }, [r.samples.join("  ")])])
      : null,
    skipLines.length ? el("ul", null, skipLines) : null,
    !dryRun && r.failed ? el("p", { class: "bad" }, [`${r.failed} word(s) could not be changed (locked or protected).`]) : null,
    !dryRun && skipped === 0 && r.failed === 0 ? el("p", { class: "ok" }, ["All found words were converted."]) : null
  ];
}

/**
 * @param {import("../core/rj-pb-layouts.js").ResolvedLayout} l
 */
export function layoutInfo(l) {
  const m = l.multiPage ? l.otherPages : l.margins;
  const cm = (/** @type {number} */ pt) => `${ptToCm(pt)} cm`;
  return [
    el("div", null, [`Paper: ${cm(l.width)} x ${cm(l.height)}`]),
    m ? el("div", null, [`Margins: top ${cm(m.top)}, bottom ${cm(m.bottom)}, left ${cm(m.left)}, right ${cm(m.right)}`]) : null,
    l.multiPage && l.firstPage ? el("div", null, [`First page top margin: ${cm(l.firstPage.top)} (space for stamp paper)`]) : null,
    l.note ? el("div", { class: "muted small" }, [l.note]) : null
  ];
}
