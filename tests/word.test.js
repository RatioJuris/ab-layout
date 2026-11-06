// SPDX-License-Identifier: GPL-3.0-or-later
// Additional terms under GPLv3 section 7 apply (attribution and names) - see NOTICE.
// Developed by PrajnaBytes International Private Limited and RatioJuris
// Copyright (C) 2026 PrajnaBytes International Private Limited and RatioJuris

// Word integration logic tested against an in-memory fake of the Word API.
// These tests check AB Layout's own logic (ordering, safety checks, error
// handling). They are NOT proof of behaviour inside real Word.

import { test } from "node:test";
import assert from "node:assert/strict";
import { createFakeWord, fakeOffice } from "./helpers/rj-pb-fake-word.js";
import { mixedPetition, MIXED_PARAGRAPH_OOXML } from "./helpers/rj-pb-fixtures.js";
import { createService } from "../web/word/rj-pb-service.js";
import { detectCapabilities, platformLabel } from "../web/word/rj-pb-capabilities.js";
import { friendlyError } from "../web/word/rj-pb-errors.js";
import { BUILT_IN_PROFILES } from "../web/core/rj-pb-profiles.js";
import { createProfileStore } from "../web/ui/rj-pb-profile-store.js";
import { createCustomProfile } from "../web/core/rj-pb-profiles.js";

const DESKTOP = fakeOffice({ WordApi: "1.9", WordApiDesktop: "1.3" }, "PC");
const WEB = fakeOffice({ WordApi: "1.9" }, "OfficeOnline");
const petition = /** @type {import("../web/core/rj-pb-profiles.js").Profile} */ (BUILT_IN_PROFILES.find((p) => p.id === "petition"));
const opts = { removeBlankLines: false, keepBlankLines: 1 };

function setup(options = {}) {
  const inits = mixedPetition();
  inits[11].ooxml = MIXED_PARAGRAPH_OOXML;
  const word = createFakeWord(inits, options);
  const caps = detectCapabilities(/** @type {any} */ (options).web ? WEB : DESKTOP);
  const service = createService({ run: word.run, caps });
  return { word, service, caps };
}

/* ---------- capabilities (Scenario 4) ---------- */

test("capabilities come from requirement sets, not from the browser", () => {
  const d = detectCapabilities(DESKTOP);
  assert.deepEqual([d.core, d.comments, d.trackedChanges, d.pageSetup], [true, true, true, true]);
  const w = detectCapabilities(WEB);
  assert.deepEqual([w.core, w.pageSetup], [true, false]);
  assert.equal(w.platformLabel, "Word for the web");
  const old = detectCapabilities(fakeOffice({ WordApi: "1.2" }));
  assert.equal(old.core, false);
  assert.equal(detectCapabilities(undefined).core, false);
  assert.equal(platformLabel("PC"), "Word for Windows");
});

test("Scenario 4: page layout reports 'not supported' in Word for the web instead of failing silently", async () => {
  const { service } = setup({ web: true });
  const r = await service.applyPageLayout(/** @type {any} */ ({ id: "x", name: "x", width: 595, height: 842, margins: { top: 72, bottom: 72, left: 72, right: 72 } }));
  assert.deepEqual(r, { supported: false });
  const check = await service.inspect();
  assert.equal(check.pageSetups, null, "paper size reported as not checkable");
});

/* ---------- inspect ---------- */

test("Check Document is read-only", async () => {
  const { word, service } = setup({ comments: 1 });
  const before = word.paragraphs().map((p) => [p.text, p.alignment, p.font.name, p.font.size]);
  const r = await service.inspect();
  assert.ok(r.findings.length > 5);
  assert.ok(r.findings.some((/** @type {any} */ f) => f.id === "comments"));
  assert.deepEqual(word.paragraphs().map((p) => [p.text, p.alignment, p.font.name, p.font.size]), before);
  assert.equal(word.log.textWrites, 0);
});

/* ---------- apply / verify / idempotency / restore ---------- */

test("Apply formats the document, verifies the text, and a second run changes nothing", async () => {
  const { word, service } = setup();
  const texts = word.paragraphs().map((p) => p.text);
  const preview = await service.previewClean(petition, opts);
  assert.ok(preview.plan.changes.length > 0);

  const r = await service.applyClean(petition, opts, preview.fingerprint);
  assert.equal(r.stale, false);
  assert.equal(r.verification.ok, true, r.verification.message);
  assert.deepEqual(r.failed, []);
  assert.deepEqual(word.paragraphs().map((p) => p.text), texts, "Scenario 5: text and order unchanged");
  assert.equal(word.log.textWrites, 0);
  assert.equal(word.paragraphs()[10].font.name, "Times New Roman");
  assert.equal(word.paragraphs()[0].alignment, "Centered");
  assert.equal(word.paragraphs()[14].font.name, "Kruti Dev 010");

  const second = await service.previewClean(petition, opts);
  assert.equal(second.plan.changes.length, 0, "Scenario 2 in the Word layer");
});

test("nothing is applied if the document changed after the preview", async () => {
  const { word, service } = setup();
  const preview = await service.previewClean(petition, opts);
  word.edit(9, "1. That the petitioner has amended this paragraph.");
  const r = await service.applyClean(petition, opts, preview.fingerprint);
  assert.equal(r.stale, true);
  assert.equal(word.paragraphs()[10].font.name, "Calibri", "untouched");
});

test("Restore puts back the previous formatting; refuses after the document is edited", async () => {
  const { word, service } = setup();
  const preview = await service.previewClean(petition, opts);
  const r = await service.applyClean(petition, opts, preview.fingerprint);
  assert.equal(r.restorePoint.notRestorable, 1, "the mixed-font paragraph is flagged");

  const restored = await service.restoreFormatting(r.restorePoint);
  assert.equal(restored.ok, true);
  const p10 = word.paragraphs()[10];
  assert.deepEqual([p10.font.name, p10.font.size, p10.alignment, p10.lineSpacing], ["Calibri", 11, "Left", 24]);

  const again = await service.applyClean(petition, opts, (await service.previewClean(petition, opts)).fingerprint);
  word.edit(9, "1. Edited after applying.");
  const refused = await service.restoreFormatting(again.restorePoint);
  assert.deepEqual(refused, { ok: false, reason: "changed" });
});

/* ---------- Scenario 6: errors ---------- */

test("a locked paragraph is reported while the rest is still formatted", async () => {
  const inits = mixedPetition();
  inits[10].locked = true;
  const word = createFakeWord(inits);
  const service = createService({ run: word.run, caps: detectCapabilities(DESKTOP) });
  const preview = await service.previewClean(petition, opts);
  const r = await service.applyClean(petition, opts, preview.fingerprint);
  assert.deepEqual(r.failed, [10]);
  assert.equal(word.paragraphs()[9].font.size, 14, "neighbours still formatted");
  assert.equal(word.paragraphs()[10].font.name, "Calibri");
  assert.equal(r.verification.ok, true);
});

test("Scenario 6: an Office failure surfaces as an error with an actionable message", async () => {
  const word = createFakeWord(mixedPetition(), { failAllSyncs: true });
  const service = createService({ run: word.run, caps: detectCapabilities(DESKTOP) });
  await assert.rejects(service.inspect(), (err) => {
    const f = friendlyError(err);
    assert.match(f.title, /unexpected problem/);
    assert.match(f.action, /try again/);
    return true;
  });
});

test("error messages are specific and never generic codes", () => {
  assert.match(friendlyError({ code: "AccessDenied" }).action, /Enable Editing/);
  assert.match(friendlyError({ code: "RequestPayloadSizeLimitExceeded" }).title, /too large/);
  assert.match(friendlyError({ code: "ItemNotFound" }).title, /changed/);
  assert.match(friendlyError(new TypeError("Failed to fetch")).title, /could not load/);
  assert.match(friendlyError(null).title, /unexpected/);
});

/* ---------- blank lines ---------- */

test("extra blank lines are removed only when safe, and verification accounts for them", async () => {
  const inits = mixedPetition();
  inits[8].ooxml = '<pkg:part pkg:name="/word/document.xml"><w:p><w:r><w:drawing/></w:r></w:p></pkg:part>';
  const word = createFakeWord(inits);
  const service = createService({ run: word.run, caps: detectCapabilities(DESKTOP) });
  const o = { removeBlankLines: true, keepBlankLines: 1 };
  const preview = await service.previewClean(petition, o);
  assert.equal(preview.blankCandidates, 2);
  const r = await service.applyClean(petition, o, preview.fingerprint);
  assert.deepEqual(r.removed, [7]);
  assert.deepEqual(r.keptBlank, [{ index: 8, reason: "picture or shape" }]);
  assert.equal(r.verification.ok, true, r.verification.message);
  assert.equal(word.paragraphs().length, inits.length - 1);
});

/* ---------- Hindi conversion in the document ---------- */

test("Kruti Dev -> Unicode converts only Kruti Dev words; English is untouched", async () => {
  const word = createFakeWord([
    { text: "", words: [{ text: "Petition ", font: "Times New Roman" }, { text: "U;k;ky; ", font: "Kruti Dev 010" }, { text: "esa", font: "Kruti Dev 010" }] }
  ]);
  const service = createService({ run: word.run, caps: detectCapabilities(DESKTOP) });
  const preview = await service.hindi({ direction: "toUnicode", scope: "document", dryRun: true, targetFont: "Mangal" });
  assert.equal(preview.toConvert, 2);
  assert.equal(word.paragraphs()[0].text, "Petition U;k;ky; esa", "preview changes nothing");

  const r = await service.hindi({ direction: "toUnicode", scope: "document", dryRun: false, targetFont: "Mangal" });
  assert.equal(r.converted, 2);
  assert.equal(word.paragraphs()[0].text, "Petition न्यायालय में");
  const words = word.paragraphs()[0]._state.words;
  assert.deepEqual(words.map((/** @type {any} */ w) => w.font), ["Times New Roman", "Mangal", "Mangal"]);
});

test("Unicode -> Kruti Dev skips words it cannot convert exactly", async () => {
  const word = createFakeWord([{ text: "धारा 302 Section न्यायालय", font: { name: "Mangal" } }]);
  const service = createService({ run: word.run, caps: detectCapabilities(DESKTOP) });
  const r = await service.hindi({ direction: "toKruti", scope: "document", dryRun: false, targetFont: "Kruti Dev 010" });
  assert.equal(r.converted, 2);
  assert.equal(word.paragraphs()[0].text, "/kkjk 302 Section U;k;ky;");
});

test("words with footnote marks or fields are never retyped", async () => {
  const word = createFakeWord([{ text: "", words: [{ text: "U;k;ky;\u0002 ", font: "Kruti Dev 010" }] }]);
  const service = createService({ run: word.run, caps: detectCapabilities(DESKTOP) });
  const r = await service.hindi({ direction: "toUnicode", scope: "document", dryRun: false, targetFont: "Mangal" });
  assert.equal(r.converted, 0);
  assert.equal(r.skipped.special, 1);
});

/* ---------- page layout (desktop) ---------- */

test("page layout applies per section and restores each section's own values", async () => {
  const sections = [
    { pageWidth: 612, pageHeight: 1008, topMargin: 108, bottomMargin: 108, leftMargin: 36, rightMargin: 122.4 },
    { pageWidth: 612, pageHeight: 792, topMargin: 50, bottomMargin: 50, leftMargin: 50, rightMargin: 50 }
  ];
  const word = createFakeWord(mixedPetition(), { sections });
  const service = createService({ run: word.run, caps: detectCapabilities(DESKTOP) });
  const layout = /** @type {any} */ ({ id: "a4", name: "A4", width: 595.27, height: 841.89, margins: { top: 56.7, bottom: 56.7, left: 113.4, right: 113.4 } });
  const r = await service.applyPageLayout(layout);
  assert.equal(r.sections, 2);
  assert.equal(word.sections[1].pageSetup.leftMargin, 113.4);
  const back = await service.restorePageLayout(r.before);
  assert.equal(back.ok, true);
  assert.equal(word.sections[0].pageSetup.rightMargin, 122.4);
  assert.equal(word.sections[1].pageSetup.pageHeight, 792);
});

/* ---------- profile storage ---------- */

test("custom profiles are saved locally, validated on import, and exportable", () => {
  /** @type {Record<string, string>} */
  const mem = {};
  const storage = { getItem: (/** @type {string} */ k) => mem[k] ?? null, setItem: (/** @type {string} */ k, /** @type {string} */ v) => { mem[k] = v; } };
  const s = createProfileStore(storage);
  const p = createCustomProfile(/** @type {any} */ (petition), "Chamber", () => "custom-1");
  assert.equal(s.upsert(p).valid, true);
  assert.equal(s.list().length, 1);
  const text = s.exportText();
  assert.ok(!/petitioner|Ram Kumar/.test(text), "exports settings only");

  const other = createProfileStore({ getItem: () => null, setItem: () => {} });
  assert.equal(other.importText("not json").error !== undefined, true);
  /** @type {Map<string, string>} */
  const m2 = new Map();
  const s2 = createProfileStore({ getItem: (k) => m2.get(k) ?? null, setItem: (k, v) => { m2.set(k, v); } });
  const bad = JSON.parse(text);
  bad.profiles.push({ id: "x", name: "", body: {} });
  const r = s2.importText(JSON.stringify(bad));
  assert.deepEqual([r.imported, r.rejected], [1, 1]);
  s.remove("custom-1");
  assert.equal(s.list().length, 0);
});
