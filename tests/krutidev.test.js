// SPDX-License-Identifier: GPL-3.0-or-later
// Additional terms under GPLv3 section 7 apply (attribution and names) - see NOTICE.
// Developed by PrajnaBytes International Private Limited and RatioJuris
// Copyright (C) 2026 PrajnaBytes International Private Limited and RatioJuris

import { test } from "node:test";
import assert from "node:assert/strict";
import {
  krutiToUnicode,
  unicodeToKruti,
  unicodeToKrutiRaw,
  convertKrutiWord,
  isKrutiDevFont,
  containsDevanagari
} from "../web/core/rj-pb-krutidev.js";

// Kruti Dev 010 spellings as typed on the standard Kruti layout.
const KNOWN = [
  ["U;k;ky;", "न्यायालय"],
  ["Hkkjr", "भारत"],
  ["dk;Z", "कार्य"],
  ["fLFkfr", "स्थिति"],
  ["çkFkhZ", "प्रार्थी"],
  ["ekuuh;", "माननीय"],
  ["mPp", "उच्च"],
  ["vkosnu", "आवेदन"],
  ["'kiFk&i=", "शपथ-पत्र"],
  ["/kkjk", "धारा"],
  ["fnukad", "दिनांक"],
  ["vf/kfu;e", "अधिनियम"],
  ["Jheku~", "श्रीमान्"],
  ["U;k;", "न्याय"],
  ["izkFkZuk", "प्रार्थना"],
  ["{ks=", "क्षेत्र"],
  ["fu.kZ;", "निर्णय"],
  ["ç'u", "प्रश्न"],
  ["lafo/kku", "संविधान"],
  ["drZO;", "कर्तव्य"],
  ["mÙkj", "उत्तर"],
  ["vkSj", "और"],
  ["gS", "है"],
  ["gSaA", "हैं।"],
  ["¼1½", "(1)"],
  ["ƒå", "१०"]
];

test("Kruti Dev -> Unicode: known legal vocabulary", () => {
  for (const [kruti, unicode] of KNOWN) {
    assert.equal(krutiToUnicode(kruti), unicode, `"${kruti}" should become ${unicode}`);
  }
});

const CORPUS = (
  "न्यायालय उच्च सर्वोच्च माननीय याचिका याचिकाकर्ता प्रतिवादी वादी अपीलार्थी प्रत्यर्थी " +
  "शपथ-पत्र शपथकर्ता सत्यापन प्रार्थना अनुतोष आदेश निर्णय डिक्री अधिनियम धारा उपधारा नियम " +
  "संविधान अनुच्छेद भारतीय दण्ड संहिता न्याय सुरक्षा नागरिक प्रक्रिया साक्ष्य अधिवक्ता " +
  "वकालतनामा जमानत प्रथम सूचना रिपोर्ट थाना पुलिस अभियुक्त गवाह साक्षी दस्तावेज़ " +
  "संपत्ति भूमि खसरा खतौनी रजिस्ट्री विक्रय पत्र किरायेदार मकान मालिक बेदखली " +
  "दिनांक स्थान हस्ताक्षर उपरोक्त निम्नलिखित संलग्न अनुलग्नक प्रति सत्य सही ज्ञान विश्वास " +
  "श्रीमान् श्रीमती पुत्र पत्नी निवासी जिला तहसील ग्राम राज्य उत्तर प्रदेश मध्य राजस्थान बिहार " +
  "क्षेत्राधिकार कर्तव्य कार्यवाही प्रश्न द्वारा उद्देश्य विद्वान् ट्रस्ट ड्राफ्ट " +
  "हैं। है, कि और या में से को पर (१) (२) १२३ धारा-३०२ फ़ैसला ज़मानत हिंदी अंग्रेज़ी ऋण " +
  "चाहिए आइए ईश्वर ऊपर ऐसा ओर औरत कृपया दृष्टि हृदय शुद्ध बुद्धि पद्धति गृह कर्मों धर्मों आर्थिक"
).split(/\s+/);

test("Unicode -> Kruti Dev -> Unicode round trip is exact for legal vocabulary", () => {
  const failed = [];
  for (const word of CORPUS) {
    const kruti = unicodeToKruti(word);
    if (kruti === null) failed.push(`${word} (raw: ${unicodeToKrutiRaw(word)} -> ${krutiToUnicode(unicodeToKrutiRaw(word) || "")})`);
  }
  assert.deepEqual(failed, [], "words that did not round-trip");
});

test("Unicode -> Kruti Dev gives the conventional spellings", () => {
  assert.equal(unicodeToKruti("न्यायालय"), "U;k;ky;");
  assert.equal(unicodeToKruti("स्थिति"), "fLFkfr");
  assert.equal(unicodeToKruti("कार्य"), "dk;Z");
  assert.equal(unicodeToKruti("भारत"), "Hkkjr");
});

test("Unicode -> Kruti Dev refuses text it cannot represent", () => {
  assert.equal(unicodeToKruti("Section"), null, "English letters have other meanings in Kruti Dev");
  assert.equal(unicodeToKruti("धारा \"क\""), null, "straight quotes are letters in Kruti Dev");
});

test("Kruti Dev word conversion refuses leftovers it does not understand", () => {
  assert.equal(convertKrutiWord("U;k;ky;"), "न्यायालय");
  assert.equal(convertKrutiWord("\u00ff"), null);
});

test("spaces and digits pass through both directions", () => {
  assert.equal(krutiToUnicode("/kkjk 302"), "धारा 302");
  assert.equal(unicodeToKruti("धारा 302"), "/kkjk 302");
});

test("font and script detection", () => {
  assert.equal(isKrutiDevFont("Kruti Dev 010"), true);
  assert.equal(isKrutiDevFont("KrutiDev 040 Wide"), true);
  assert.equal(isKrutiDevFont("Times New Roman"), false);
  assert.equal(isKrutiDevFont(null), false);
  assert.equal(containsDevanagari("धारा 302"), true);
  assert.equal(containsDevanagari("Section 302"), false);
});
