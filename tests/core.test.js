// SPDX-License-Identifier: GPL-3.0-or-later
// Additional terms under GPLv3 section 7 apply (attribution and names) - see NOTICE.
// Developed by PrajnaBytes International Private Limited and RatioJuris
// Copyright (C) 2026 PrajnaBytes International Private Limited and RatioJuris

import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { cmToPt, linesToPt, ptToCm, nearlyEqual } from "../web/core/rj-pb-units.js";
import { classifyFontName, fontProtection, extractFontNamesFromOoxml, containsIndianOrUrduScript } from "../web/core/rj-pb-fonts.js";
import { classifyAll } from "../web/core/rj-pb-classify.js";
import { BUILT_IN_PROFILES, validateProfile, createCustomProfile, MATCH } from "../web/core/rj-pb-profiles.js";
import { buildFormattingPlan, simulatePlan, blankLineCandidates, unsafeToDeleteReason } from "../web/core/rj-pb-plan.js";
import { typedParagraphNumber, checkTypedNumbering } from "../web/core/rj-pb-numbering.js";
import { compareParagraphTexts, fingerprint } from "../web/core/rj-pb-verify.js";
import { runDiagnostics, paperName } from "../web/core/rj-pb-diagnostics.js";
import { validateStore, validateLayout, resolveLayout, planSectionMargins } from "../web/core/rj-pb-layouts.js";
import { toSnapshot } from "../web/word/rj-pb-reader.js";
import { mixedPetition, MIXED_PARAGRAPH_OOXML } from "./helpers/rj-pb-fixtures.js";

/** Snapshots of the fixture as the reader would produce them. */
function petitionSnapshots() {
  const snaps = mixedPetition().map((init, i) =>
    toSnapshot(
      {
        alignment: "Left", firstLineIndent: 0, leftIndent: 0, rightIndent: 0, lineSpacing: 12, spaceBefore: 0, spaceAfter: 0,
        styleBuiltIn: "Normal", isListItem: false, tableNestingLevel: 0,
        ...init,
        font: { name: "Times New Roman", size: 12, color: "#000000", highlightColor: null, ...(init.font || {}) }
      },
      i
    )
  );
  snaps[11].runFonts = extractFontNamesFromOoxml(MIXED_PARAGRAPH_OOXML);
  return snaps;
}

const byId = (/** @type {string} */ id) => /** @type {import("../web/core/rj-pb-profiles.js").Profile} */ (BUILT_IN_PROFILES.find((p) => p.id === id));

/* ---------- units ---------- */

test("unit conversions round to Word's 1/20 pt", () => {
  assert.equal(cmToPt(1.27), 36);
  assert.equal(cmToPt(4), 113.4);
  assert.equal(linesToPt(1.5), 18);
  assert.equal(ptToCm(36), 1.27);
  assert.ok(nearlyEqual(18.04, 18));
  assert.ok(!nearlyEqual(18.5, 18));
  assert.ok(!nearlyEqual(null, 18));
});

/* ---------- font safety ---------- */

test("legacy Indian-language and symbol fonts are protected", () => {
  for (const f of ["Kruti Dev 010", "KrutiDev 040 Wide", "DevLys 010", "Chanakya", "Walkman-Chanakya-905", "Shree-Dev-0714", "SutonnyMJ", "AnmolLipi", "Wingdings", "Symbol"]) {
    assert.equal(classifyFontName(f).protected, true, f);
  }
  for (const f of ["Times New Roman", "Arial", "Calibri", "Mangal", "Nirmala UI", "Georgia"]) {
    assert.equal(classifyFontName(f).protected, false, f);
  }
  assert.equal(classifyFontName("My Firm Font", ["my firm font"]).kind, "user");
});

test("Unicode Hindi/Urdu text keeps its own font", () => {
  assert.ok(containsIndianOrUrduScript("धारा 302"));
  assert.ok(containsIndianOrUrduScript("عدالت"));
  assert.ok(!containsIndianOrUrduScript("Section 302"));
});

test("font names are read only from the document and styles parts", () => {
  assert.deepEqual(extractFontNamesFromOoxml(MIXED_PARAGRAPH_OOXML), ["Book Antiqua", "Times New Roman"]);
});

test("a mixed paragraph whose fonts could not be read is protected", () => {
  const s = petitionSnapshots()[11];
  delete s.runFonts;
  assert.equal(fontProtection(s).protected, true);
});

/* ---------- classification ---------- */

test("cause title, VERSUS, party and signature lines are recognised", () => {
  const snaps = petitionSnapshots();
  const kinds = classifyAll(snaps).map((c) => c.kind);
  assert.equal(kinds[0], "centered");
  assert.equal(kinds[3], "tabbed");
  assert.equal(kinds[4], "centered");
  assert.equal(kinds[9], "body");
  assert.equal(kinds[12], "quote");
  assert.equal(kinds[16], "table");
  assert.equal(kinds[18], "list");
  assert.equal(kinds[19], "short");
  assert.equal(kinds[21], "right");
  assert.equal(kinds[2], "empty");
});

/* ---------- profiles ---------- */

test("all built-in profiles are valid", () => {
  for (const p of BUILT_IN_PROFILES) assert.deepEqual(validateProfile(p), { valid: true, errors: [] }, p.id);
});

test("invalid custom profiles are rejected with plain messages", () => {
  const p = createCustomProfile(byId("petition"), "");
  p.body.fontSize = 200;
  p.body.lineSpacing = /** @type {any} */ ("double");
  const v = validateProfile(p);
  assert.equal(v.valid, false);
  assert.ok(v.errors.includes("Please give the profile a name."));
  assert.ok(v.errors.includes("Font size must be between 6 and 72."));
  assert.ok(v.errors.some((e) => e.startsWith("Line spacing")));
});

/* ---------- Scenario 1: existing legal document ---------- */

test("Scenario 1: body paragraphs are normalised; layout lines keep their layout", () => {
  const snaps = petitionSnapshots();
  const plan = buildFormattingPlan(snaps, byId("petition"));
  const after = simulatePlan(snaps, plan.changes);
  for (const i of [9, 10, 11, 13]) {
    assert.equal(after[i].font.name, "Times New Roman", `para ${i} font`);
    assert.equal(after[i].font.size, 14, `para ${i} size`);
    assert.equal(after[i].alignment, "Justified");
    assert.equal(after[i].lineSpacing, 18);
    assert.equal(after[i].firstLineIndent, 36);
  }
  // Cause title: font family only; size and centring kept.
  assert.equal(after[0].alignment, "Centered");
  assert.equal(after[0].font.size, 16);
  assert.equal(after[0].font.name, "Times New Roman");
  // Party line with tabs, right-aligned signature: alignment kept.
  assert.equal(after[3].alignment, "Left");
  assert.equal(after[21].alignment, "Right");
  // Quotation keeps its indents; list keeps numbering indents.
  assert.equal(after[12].leftIndent, 72);
  assert.equal(after[12].font.size, 12, "quotation 12 pt per profile");
  assert.equal(after[18].leftIndent, 36);
  assert.equal(after[18].firstLineIndent, -18);
  // Kruti Dev and Unicode Hindi keep their fonts.
  assert.equal(after[14].font.name, "Kruti Dev 010");
  assert.equal(after[15].font.name, "Mangal");
  assert.ok(plan.fontKept.some((f) => f.index === 14 && /Kruti Dev/.test(f.reason)));
  // Table: font only.
  assert.equal(after[16].font.name, "Times New Roman");
  assert.equal(after[16].alignment, "Left");
});

/* ---------- Scenario 2: repeated formatting ---------- */

test("Scenario 2: applying the same profile twice changes nothing the second time", () => {
  for (const profile of BUILT_IN_PROFILES) {
    const snaps = petitionSnapshots();
    const first = buildFormattingPlan(snaps, profile);
    const after = simulatePlan(snaps, first.changes);
    const second = buildFormattingPlan(after, profile);
    assert.equal(second.changes.length, 0, `${profile.id}: ${JSON.stringify(second.changes.slice(0, 2))}`);
  }
});

/* ---------- Scenario 3: custom profile ---------- */

test("Scenario 3: custom profile settings are honoured exactly", () => {
  const p = createCustomProfile(byId("petition"), "My chamber style");
  p.body = { ...p.body, fontName: "Georgia", fontSize: 13, alignment: "Left", lineSpacing: 2, spaceAfter: 12, firstLineIndentCm: 2 };
  p.quotes.enabled = false;
  const snaps = petitionSnapshots();
  const after = simulatePlan(snaps, buildFormattingPlan(snaps, p).changes);
  const b = after[9];
  assert.equal(b.font.name, "Georgia");
  assert.equal(b.font.size, 13);
  assert.equal(b.alignment, "Left");
  assert.equal(b.lineSpacing, 24);
  assert.equal(b.spaceAfter, 12);
  assert.equal(b.firstLineIndent, cmToPt(2));
  assert.equal(after[12].font.size, 14, "quotes not separately formatted when disabled");
});

test("'Make Consistent' uses the document's own majority values", () => {
  const snaps = petitionSnapshots();
  const plan = buildFormattingPlan(snaps, byId("match-document"));
  assert.equal(plan.targets.fontName, "Times New Roman");
  assert.equal(plan.targets.fontSize, 14);
  assert.equal(plan.targets.lineSpacing, 18);
  assert.equal(plan.targets.alignment, "Justified");
  const after = simulatePlan(snaps, plan.changes);
  assert.equal(after[10].font.name, "Times New Roman");
  assert.equal(after[10].lineSpacing, 18);
});

/* ---------- Scenario 5: document preservation ---------- */

test("Scenario 5: a formatting plan never contains text", () => {
  const snaps = petitionSnapshots();
  for (const profile of BUILT_IN_PROFILES) {
    const plan = buildFormattingPlan(snaps, profile);
    for (const c of plan.changes) {
      for (const key of Object.keys(c.set)) {
        assert.ok(["fontName", "fontSize", "alignment", "lineSpacing", "spaceBefore", "spaceAfter", "firstLineIndent", "leftIndent", "rightIndent"].includes(key), key);
      }
    }
    const after = simulatePlan(snaps, plan.changes);
    assert.deepEqual(after.map((p) => p.text), snaps.map((p) => p.text), "texts, order, dates, names, citations unchanged");
  }
});

/* ---------- blank lines ---------- */

test("blank-line candidates keep the first line of each group and never the last paragraph", () => {
  const snaps = petitionSnapshots();
  assert.deepEqual(blankLineCandidates(snaps, 1), [7, 8]);
  assert.deepEqual(blankLineCandidates(snaps, 2), [8]);
});

test("blank lines holding pictures, breaks or bookmarks are never deleted", () => {
  const wrap = (/** @type {string} */ inner) => `<pkg:part pkg:name="/word/document.xml"><w:body><w:p>${inner}</w:p><w:sectPr/></w:body></pkg:part>`;
  assert.equal(unsafeToDeleteReason(wrap("")), null);
  assert.equal(unsafeToDeleteReason(wrap('<w:bookmarkStart w:name="_GoBack"/>')), null);
  assert.equal(unsafeToDeleteReason(wrap("<w:r><w:drawing/></w:r>")), "picture or shape");
  assert.equal(unsafeToDeleteReason(wrap('<w:r><w:br w:type="page"/></w:r>')), "page break");
  assert.equal(unsafeToDeleteReason(`<pkg:part pkg:name="/word/document.xml"><w:p><w:pPr><w:sectPr/></w:pPr></w:p></pkg:part>`), "section break");
  assert.equal(unsafeToDeleteReason(wrap('<w:bookmarkStart w:name="Para5"/>')), "bookmark");
  assert.equal(unsafeToDeleteReason(wrap("<w:commentRangeStart/>")), "comment");
});

/* ---------- numbering ---------- */

test("typed paragraph numbers are found; dates and amounts are not", () => {
  assert.equal(typedParagraphNumber("1. That the petitioner"), 1);
  assert.equal(typedParagraphNumber("12) That"), 12);
  assert.equal(typedParagraphNumber("12.05.2020 - order passed"), null);
  assert.equal(typedParagraphNumber("1.5 lakh was paid"), null);
  assert.equal(typedParagraphNumber("Section 302"), null);
});

test("numbering gaps and repeats are reported, not fixed", () => {
  const r = checkTypedNumbering(
    ["1. a", "2. b", "4. c", "4. d", "5. e", "1. prayer a", "2. prayer b"].map((text, index) => ({ index, text }))
  );
  assert.equal(r.sequences, 2);
  assert.deepEqual(r.issues.map((i) => i.type), ["gap", "repeat"]);
  assert.match(r.issues[0].message, /3 missing/);
});

/* ---------- diagnostics ---------- */

test("Check Document reports real problems in the mixed petition", () => {
  const { findings } = runDiagnostics(petitionSnapshots(), {
    review: { comments: 2, trackedChanges: 0 },
    pageSetups: [{ pageWidth: 612, pageHeight: 1008, topMargin: 72, bottomMargin: 72, leftMargin: 72, rightMargin: 72 }]
  });
  const ids = findings.map((f) => f.id);
  for (const id of ["font-name", "font-size", "line-spacing", "alignment", "typed-numbering", "legacy-font", "blanks", "blank-lines", "comments", "paper"]) {
    assert.ok(ids.includes(id), `expected finding ${id}; got ${ids.join(",")}`);
  }
  assert.ok(!ids.includes("tracked"));
  const numbering = /** @type {import("../web/core/rj-pb-types.js").Finding} */ (findings.find((f) => f.id === "typed-numbering"));
  assert.match(numbering.detail, /3 missing/);
  assert.deepEqual(numbering.paragraphs, [11]);
  assert.equal(findings[0].severity, "problem", "problems listed first");
});

test("a clean document has no formatting findings", () => {
  const snaps = petitionSnapshots();
  const after = simulatePlan(snaps, buildFormattingPlan(snaps, BUILT_IN_PROFILES[3]).changes);
  const ids = runDiagnostics(after).findings.map((f) => f.id);
  for (const id of ["font-name", "font-size", "line-spacing", "alignment", "first-indent"]) assert.ok(!ids.includes(id), id);
});

test("paper names", () => {
  assert.equal(paperName(595.3, 841.9), "A4");
  assert.equal(paperName(612, 1008), "Legal (8.5 x 14 in)");
});

/* ---------- verification ---------- */

test("text verification detects any change and allows deliberate blank removal", () => {
  const before = ["a", "", "", "b"];
  assert.equal(compareParagraphTexts(before, ["a", "", "", "b"]).ok, true);
  assert.equal(compareParagraphTexts(before, ["a", "", "", "B"]).ok, false);
  assert.equal(compareParagraphTexts(before, ["a", "", "b"]).ok, false);
  assert.equal(compareParagraphTexts(before, ["a", "", "b"], [2]).ok, true);
  assert.notEqual(fingerprint(["a", "b"]), fingerprint(["a", "c"]));
  assert.notEqual(fingerprint(["ab"]), fingerprint(["a", "b"]));
});

/* ---------- page layouts (the original layouts.json) ---------- */

test("layouts.json is valid JSON and every layout validates", () => {
  const store = JSON.parse(readFileSync(new URL("../layouts/layouts.json", import.meta.url), "utf8"));
  assert.deepEqual(validateStore(store), { valid: true });
  for (const l of store.layouts) assert.deepEqual(validateLayout(resolveLayout(store, l.id)), { valid: true }, l.id);
  for (const id of ["hc_standard", "hc_new", "district_standard", "district_new", "affidavit"]) {
    assert.ok(resolveLayout(store, id), `original layout ${id} preserved`);
  }
});

test("stamp-paper first-page margin is not spread over every page", () => {
  const store = JSON.parse(readFileSync(new URL("../layouts/layouts.json", import.meta.url), "utf8"));
  const aff = /** @type {any} */ (resolveLayout(store, "affidavit"));
  const one = planSectionMargins(aff, 1);
  assert.equal(one.perSection[0].top, 72);
  assert.equal(one.notes.length, 1);
  const three = planSectionMargins(aff, 3);
  assert.deepEqual(three.perSection.map((m) => m.top), [468, 72, 72]);
});

test("match keyword is accepted in profile values", () => {
  const p = createCustomProfile(byId("petition"), "x");
  p.body.fontSize = MATCH;
  assert.equal(validateProfile(p).valid, true);
});
