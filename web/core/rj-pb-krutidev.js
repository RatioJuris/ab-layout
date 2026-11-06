/*
File: rj-pb-krutidev.js
Path: /web/core/rj-pb-krutidev.js
Project: AB Layout (Advocate Benefit Layout)
Developed by PrajnaBytes International Private Limited and RatioJuris
Copyright (C) 2026 PrajnaBytes International Private Limited and RatioJuris
SPDX-License-Identifier: GPL-3.0-or-later
Additional terms under GPLv3 section 7 apply (attribution and names) - see NOTICE.

Kruti Dev 010 <-> Unicode Devanagari conversion.

Kruti Dev is a legacy font: Hindi typed in it is stored as Latin characters
(for example "U;k;ky;" displays as न्यायालय only while the Kruti Dev font is
applied). Converting means changing the stored characters, so callers must
only pass text that is actually formatted in Kruti Dev.

Kruti Dev -> Unicode: a JavaScript port of kru2uni (krutidev2unicode.py) by
Nehal J Wani and Raveesh Motlani, Copyright 2015 Language Technologies Research
Centre, IIIT Hyderabad, licensed under GPL-3.0
(https://github.com/ltrc/kru2uni). The mapping table and the reordering rules
are kept in the original order. One deliberate change: the original removes a
halant (्) that appears before a space; that step is omitted so that words
such as "श्रीमान्" are not altered.

Unicode -> Kruti Dev: written for AB Layout. Every result is verified by
converting it back with the kru2uni algorithm; if the round trip does not give
back exactly the original text, the word is reported as not convertible
instead of being guessed.
*/

/* ===== KRUTI DEV -> UNICODE (port of kru2uni) ===== */

/** @type {Array<[string, string]>} */
const K2U = [
  ["\u00f1", "\u0970"], ["Q+Z", "QZ+"], ["sas", "sa"], ["aa", "a"], [")Z", "\u0930\u094d\u0926\u094d\u0927"], ["ZZ", "Z"],
  ["\u2018", "\""], ["\u2019", "\""], ["\u201c", "'"], ["\u201d", "'"],
  ["\u00e5", "\u0966"], ["\u0192", "\u0967"], ["\u201e", "\u0968"], ["\u2026", "\u0969"], ["\u2020", "\u096a"],
  ["\u2021", "\u096b"], ["\u02c6", "\u096c"], ["\u2030", "\u096d"], ["\u0160", "\u096e"], ["\u2039", "\u096f"],
  ["\u00b6+", "\u095e\u094d"], ["d+", "\u0958"], ["[+k", "\u0959"], ["[+", "\u0959\u094d"], ["x+", "\u095a"],
  ["T+", "\u091c\u093c\u094d"], ["t+", "\u095b"], ["M+", "\u095c"], ["<+", "\u095d"], ["Q+", "\u095e"],
  [";+", "\u095f"], ["j+", "\u0931"], ["u+", "\u0929"],
  ["\u00d9k", "\u0924\u094d\u0924"], ["\u00d9", "\u0924\u094d\u0924\u094d"], ["\u00e4", "\u0915\u094d\u0924"],
  ["\u2013", "\u0926\u0943"], ["\u2014", "\u0915\u0943"], ["\u00e9", "\u0928\u094d\u0928"], ["\u2122", "\u0928\u094d\u0928\u094d"],
  ["=kk", "=k"], ["f=k", "f="],
  ["\u00e0", "\u0939\u094d\u0928"], ["\u00e1", "\u0939\u094d\u092f"], ["\u00e2", "\u0939\u0943"], ["\u00e3", "\u0939\u094d\u092e"],
  ["\u00baz", "\u0939\u094d\u0930"], ["\u00ba", "\u0939\u094d"], ["\u00ed", "\u0926\u094d\u0926"],
  ["{k", "\u0915\u094d\u0937"], ["{", "\u0915\u094d\u0937\u094d"], ["=", "\u0924\u094d\u0930"], ["\u00ab", "\u0924\u094d\u0930\u094d"],
  ["N\u00ee", "\u091b\u094d\u092f"], ["V\u00ee", "\u091f\u094d\u092f"], ["B\u00ee", "\u0920\u094d\u092f"], ["M\u00ee", "\u0921\u094d\u092f"],
  ["<\u00ee", "\u0922\u094d\u092f"], ["|", "\u0926\u094d\u092f"], ["K", "\u091c\u094d\u091e"], ["}", "\u0926\u094d\u0935"],
  ["J", "\u0936\u094d\u0930"], ["V\u00aa", "\u091f\u094d\u0930"], ["M\u00aa", "\u0921\u094d\u0930"], ["<\u00aa\u00aa", "\u0922\u094d\u0930"],
  ["N\u00aa", "\u091b\u094d\u0930"], ["\u00d8", "\u0915\u094d\u0930"], ["\u00dd", "\u092b\u094d\u0930"], ["nzZ", "\u0930\u094d\u0926\u094d\u0930"],
  ["\u00e6", "\u0926\u094d\u0930"], ["\u00e7", "\u092a\u094d\u0930"], ["\u00c1", "\u092a\u094d\u0930"], ["xz", "\u0917\u094d\u0930"],
  ["#", "\u0930\u0941"], [":", "\u0930\u0942"],
  ["v\u201a", "\u0911"], ["vks", "\u0913"], ["vkS", "\u0914"], ["vk", "\u0906"], ["v", "\u0905"],
  ["b\u00b1", "\u0908\u0902"], ["\u00c3", "\u0908"], ["bZ", "\u0908"], ["b", "\u0907"], ["m", "\u0909"], ["\u00c5", "\u090a"],
  [",s", "\u0910"], [",", "\u090f"], ["_", "\u090b"],
  ["\u00f4", "\u0915\u094d\u0915"], ["d", "\u0915"], ["Dk", "\u0915"], ["D", "\u0915\u094d"],
  ["[k", "\u0916"], ["[", "\u0916\u094d"], ["x", "\u0917"], ["Xk", "\u0917"], ["X", "\u0917\u094d"],
  ["\u00c4", "\u0918"], ["?k", "\u0918"], ["?", "\u0918\u094d"], ["\u00b3", "\u0919"],
  ["pkS", "\u091a\u0948"], ["p", "\u091a"], ["Pk", "\u091a"], ["P", "\u091a\u094d"], ["N", "\u091b"],
  ["t", "\u091c"], ["Tk", "\u091c"], ["T", "\u091c\u094d"], [">", "\u091d"], ["\u00f7", "\u091d\u094d"], ["\u00a5", "\u091e"],
  ["\u00ea", "\u091f\u094d\u091f"], ["\u00eb", "\u091f\u094d\u0920"], ["V", "\u091f"], ["B", "\u0920"],
  ["\u00ec", "\u0921\u094d\u0921"], ["\u00ef", "\u0921\u094d\u0922"], ["M+", "\u0921\u093c"], ["<+", "\u0922\u093c"],
  ["M", "\u0921"], ["<", "\u0922"], [".k", "\u0923"], [".", "\u0923\u094d"],
  ["r", "\u0924"], ["Rk", "\u0924"], ["R", "\u0924\u094d"], ["Fk", "\u0925"], ["F", "\u0925\u094d"],
  [")", "\u0926\u094d\u0927"], ["n", "\u0926"], ["/k", "\u0927"], ["/", "\u0927\u094d"], ["\u00cb", "\u0927\u094d"], ["\u00e8", "\u0927"],
  ["u", "\u0928"], ["Uk", "\u0928"], ["U", "\u0928\u094d"],
  ["i", "\u092a"], ["Ik", "\u092a"], ["I", "\u092a\u094d"], ["Q", "\u092b"], ["\u00b6", "\u092b\u094d"],
  ["c", "\u092c"], ["Ck", "\u092c"], ["C", "\u092c\u094d"], ["Hk", "\u092d"], ["H", "\u092d\u094d"],
  ["e", "\u092e"], ["Ek", "\u092e"], ["E", "\u092e\u094d"], [";", "\u092f"], ["\u00b8", "\u092f\u094d"], ["j", "\u0930"],
  ["y", "\u0932"], ["Yk", "\u0932"], ["Y", "\u0932\u094d"], ["G", "\u0933"], ["o", "\u0935"], ["Ok", "\u0935"], ["O", "\u0935\u094d"],
  ["'k", "\u0936"], ["'", "\u0936\u094d"], ["\"k", "\u0937"], ["\"", "\u0937\u094d"],
  ["l", "\u0938"], ["Lk", "\u0938"], ["L", "\u0938\u094d"], ["g", "\u0939"],
  ["\u00c8", "\u0940\u0902"], ["saz", "\u094d\u0930\u0947\u0902"], ["z", "\u094d\u0930"],
  ["\u00cc", "\u0926\u094d\u0926"], ["\u00cd", "\u091f\u094d\u091f"], ["\u00ce", "\u091f\u094d\u0920"], ["\u00cf", "\u0921\u094d\u0921"],
  ["\u00d1", "\u0915\u0943"], ["\u00d2", "\u092d"], ["\u00d3", "\u094d\u092f"], ["\u00d4", "\u0921\u094d\u0922"], ["\u00d6", "\u091d\u094d"],
  ["\u00d8", "\u0915\u094d\u0930"], ["\u00d9", "\u0924\u094d\u0924\u094d"], ["\u00dck", "\u0936"], ["\u00dc", "\u0936\u094d"],
  ["\u201a", "\u0949"], ["kas", "\u094b\u0902"], ["ks", "\u094b"], ["kS", "\u094c"], ["\u00a1k", "\u093e\u0901"],
  ["ak", "k\u0902"], ["k", "\u093e"], ["ah", "\u0940\u0902"], ["h", "\u0940"], ["aq", "\u0941\u0902"], ["q", "\u0941"],
  ["aw", "\u0942\u0902"], ["\u00a1w", "\u0942\u0901"], ["w", "\u0942"], ["`", "\u0943"], ["\u0300", "\u0943"],
  ["as", "\u0947\u0902"], ["\u00b1s", "s\u00b1"], ["s", "\u0947"], ["aS", "\u0948\u0902"], ["S", "\u0948"],
  ["a\u00aa", "\u094d\u0930\u0902"], ["\u00aa", "\u094d\u0930"], ["fa", "\u0902f"], ["a", "\u0902"], ["\u00a1", "\u0901"],
  ["%", ":"], ["W", "\u0945"], ["\u2022", "\u093d"], ["\u00b7", "\u093d"], ["\u2219", "\u093d"], ["\u00b7", "\u093d"],
  ["~j", "\u094d\u0930"], ["~", "\u094d"], ["\\", "?"], ["+", "\u093c"],
  ["^", "\u2018"], ["*", "\u2019"], ["\u00de", "\u201c"], ["\u00df", "\u201d"], ["(", ";"], ["\u00bc", "("], ["\u00bd", ")"],
  ["\u00bf", "{"], ["\u00c0", "}"], ["\u00be", "="], ["A", "\u0964"], ["-", "."], ["&", "-"], ["&", "\u00b5"], ["\u03bc", "-"],
  ["\u0152", "\u0970"], ["]", ","], ["~ ", "\u094d "], ["@", "/"], ["\u00ae", "\u0948\u0902"]
];

const UNICODE_VOWEL_SIGNS = new Set([
  "\u0905", "\u0906", "\u0907", "\u0908", "\u0909", "\u090a", "\u090f", "\u0910", "\u0913", "\u0914",
  "\u093e", "\u093f", "\u0940", "\u0941", "\u0942", "\u0943", "\u0947", "\u0948", "\u094b", "\u094c",
  "\u0902", "\u0903", "\u0901", "\u0945"
]);

const UNICODE_UNATTACHED_VOWEL_SIGNS = [
  "\u093e", "\u093f", "\u0940", "\u0941", "\u0942", "\u0943", "\u0947", "\u0948", "\u094b", "\u094c",
  "\u0902", "\u0903", "\u0901", "\u0945"
];

/** Single-character Kruti Dev consonants and vowel signs (used to tell a dash from दृ/कृ). */
const KRUTI_LETTER_CHARS = new Set([
  "d", "x", "\u00b3", "p", "N", "t", ">", "\u00a5", "V", "B", "M", "<", "r", "n", "u", "i", "Q", "c", "e", ";",
  "j", "y", "G", "\u0934", "o", "l", "g", "D", "[", "X", "?", "P", "T", "\u00f7", ".", "R", "F", "/", "\u00cb",
  "\u00e8", "U", "I", "\u00b6", "C", "H", "E", "\u00b8", "Z", "Y", "O", "'", "\u00dc", "\"", "L", "\u00ba",
  "k", "f", "h", "q", "w", "`", "s", "S", "a", "%", "\u00a1", "W"
]);

/** @param {string} s @param {string} from @param {string} to */
function replaceAll(s, from, to) {
  return s.split(from).join(to);
}

/**
 * Converts text typed in Kruti Dev 010 into Unicode Devanagari.
 * @param {string} input
 */
export function krutiToUnicode(input) {
  let t = input;

  t = replaceAll(t, " \u00aa", "\u00aa");
  t = replaceAll(t, " ~j", "~j");
  t = replaceAll(t, " z", "z");

  // A dash not followed by a Kruti letter is punctuation, not दृ / कृ.
  const chars = t.split("");
  for (let i = 0; i < chars.length - 1; i++) {
    if ((chars[i] === "\u2014" || chars[i] === "\u2013") && !KRUTI_LETTER_CHARS.has(chars[i + 1])) {
      chars[i] = "&";
    }
  }
  t = chars.join("");

  for (const [from, to] of K2U) t = replaceAll(t, from, to);

  t = replaceAll(t, "\u00b1", "Z\u0902");
  t = replaceAll(t, "\u00c6", "\u0930\u094df");

  /** @type {RegExpExecArray | null} */
  let m;
  while ((m = /f(.?)/.exec(t)) !== null) {
    t = replaceAll(t, "f" + m[1], m[1] + "\u093f");
  }

  t = replaceAll(t, "\u00c7", "fa");
  t = replaceAll(t, "\u00af", "fa");
  t = replaceAll(t, "\u00c9", "\u0930\u094dfa");

  while ((m = /fa(.?)/.exec(t)) !== null) {
    t = replaceAll(t, "fa" + m[1], m[1] + "\u093f\u0902");
  }

  t = replaceAll(t, "\u00ca", "\u0940Z");

  while ((m = /\u093f\u094d(.?)/.exec(t)) !== null) {
    t = replaceAll(t, "\u093f\u094d" + m[1], "\u094d" + m[1] + "\u093f");
  }

  t = replaceAll(t, "\u094dZ", "Z");

  // Reph (र्): Kruti types it after the syllable; Unicode needs it before.
  while ((m = /(.?)Z/.exec(t)) !== null) {
    let misplaced = m[1];
    let idx = t.indexOf(misplaced + "Z");
    while (idx > 0 && UNICODE_VOWEL_SIGNS.has(t[idx])) {
      idx -= 1;
      misplaced = t[idx] + misplaced;
    }
    t = replaceAll(t, misplaced + "Z", "\u0930\u094d" + misplaced);
  }

  for (const matra of UNICODE_UNATTACHED_VOWEL_SIGNS) {
    t = replaceAll(t, " " + matra, matra);
    t = replaceAll(t, "," + matra, matra + ",");
    t = replaceAll(t, "\u094d" + matra, matra);
  }

  t = replaceAll(t, "\u094d\u094d\u0930", "\u094d\u0930");
  t = replaceAll(t, "\u094d\u0930\u094d", "\u0930\u094d");
  t = replaceAll(t, "\u094d\u094d", "\u094d");

  return t;
}

/* ===== UNICODE -> KRUTI DEV ===== */

const HALANT = "\u094d";
const NUKTA = "\u093c";
const RA = "\u0930";
const I_MATRA = "\u093f";

/** Full forms of consonants. */
/** @type {Record<string, string>} */
const FULL = {
  "\u0915": "d", "\u0916": "[k", "\u0917": "x", "\u0918": "?k", "\u0919": "\u00b3", "\u091a": "p", "\u091b": "N",
  "\u091c": "t", "\u091d": ">", "\u091e": "\u00a5", "\u091f": "V", "\u0920": "B", "\u0921": "M", "\u0922": "<",
  "\u0923": ".k", "\u0924": "r", "\u0925": "Fk", "\u0926": "n", "\u0927": "/k", "\u0928": "u", "\u092a": "i",
  "\u092b": "Q", "\u092c": "c", "\u092d": "Hk", "\u092e": "e", "\u092f": ";", "\u0930": "j", "\u0932": "y",
  "\u0933": "G", "\u0935": "o", "\u0936": "'k", "\u0937": "\"k", "\u0938": "l", "\u0939": "g",
  "\u0958": "d+", "\u0959": "[+k", "\u095a": "x+", "\u095b": "t+", "\u095c": "M+", "\u095d": "<+", "\u095e": "Q+",
  "\u095f": ";+", "\u0929": "u+", "\u0931": "j+"
};

/** Half forms (consonant + halant before another consonant). Missing ones use full form + "~". */
/** @type {Record<string, string>} */
const HALF = {
  "\u0915": "D", "\u0916": "[", "\u0917": "X", "\u0918": "?", "\u091a": "P", "\u091c": "T", "\u091d": "\u00f7",
  "\u0923": ".", "\u0924": "R", "\u0925": "F", "\u0927": "/", "\u0928": "U", "\u092a": "I", "\u092b": "\u00b6",
  "\u092c": "C", "\u092d": "H", "\u092e": "E", "\u092f": "\u00b8", "\u0932": "Y", "\u0935": "O", "\u0936": "'",
  "\u0937": "\"", "\u0938": "L", "\u0939": "\u00ba", "\u0959": "[+", "\u095e": "\u00b6+", "\u095b": "T+"
};

/** Ligatures, longest first. Keys are Unicode sequences. */
const LIGATURES = /** @type {Array<[string, string]>} */ ([
  ["\u0915\u094d\u0937\u094d", "{"], ["\u0924\u094d\u0930\u094d", "\u00ab"], ["\u0924\u094d\u0924\u094d", "\u00d9"],
  ["\u0915\u094d\u0937", "{k"], ["\u0924\u094d\u0930", "="], ["\u091c\u094d\u091e", "K"], ["\u0936\u094d\u0930", "J"],
  ["\u0926\u094d\u092f", "|"], ["\u0926\u094d\u0935", "}"], ["\u0926\u094d\u0927", ")"], ["\u0926\u094d\u0926", "\u00ed"],
  ["\u0924\u094d\u0924", "\u00d9k"], ["\u0915\u094d\u0924", "\u00e4"], ["\u0928\u094d\u0928", "\u00e9"],
  ["\u0915\u094d\u0930", "\u00d8"], ["\u092a\u094d\u0930", "\u00e7"], ["\u0926\u094d\u0930", "\u00e6"],
  ["\u092b\u094d\u0930", "\u00dd"], ["\u0939\u094d\u0928", "\u00e0"], ["\u0939\u094d\u092f", "\u00e1"],
  ["\u0939\u094d\u092e", "\u00e3"], ["\u0939\u094d\u0930", "\u00baz"], ["\u091f\u094d\u091f", "\u00ea"],
  ["\u091f\u094d\u0920", "\u00eb"], ["\u0921\u094d\u0921", "\u00ec"], ["\u0921\u094d\u0922", "\u00ef"],
  ["\u0915\u094d\u0915", "\u00f4"], ["\u091f\u094d\u0930", "V\u00aa"], ["\u0921\u094d\u0930", "M\u00aa"],
  ["\u091b\u094d\u0930", "N\u00aa"]
]);

/** @type {Record<string, string>} */
const MATRA = {
  "\u093e": "k", "\u0940": "h", "\u0941": "q", "\u0942": "w", "\u0943": "`", "\u0947": "s", "\u0948": "S",
  "\u094b": "ks", "\u094c": "kS", "\u0902": "a", "\u0901": "\u00a1", "\u0903": "%", "\u0945": "W", "\u0949": "\u201a"
};

/** @type {Record<string, string>} */
const INDEPENDENT = {
  "\u0905": "v", "\u0906": "vk", "\u0907": "b", "\u0908": "bZ", "\u0909": "m", "\u090a": "\u00c5", "\u090f": ",",
  "\u0910": ",s", "\u0913": "vks", "\u0914": "vkS", "\u090b": "_", "\u0911": "v\u201a",
  "\u0966": "\u00e5", "\u0967": "\u0192", "\u0968": "\u201e", "\u0969": "\u2026", "\u096a": "\u2020",
  "\u096b": "\u2021", "\u096c": "\u02c6", "\u096d": "\u2030", "\u096e": "\u0160", "\u096f": "\u2039",
  "\u0964": "A", "\u0970": "\u0152", "\u093d": "\u00b7",
  ".": "-", "-": "&", ",": "]", "/": "@", ";": "(", "(": "\u00bc", ")": "\u00bd", "?": "\\", ":": "%",
  "\u2018": "^", "\u2019": "*", "\u201c": "\u00de", "\u201d": "\u00df", "=": "\u00be", "{": "\u00bf", "}": "\u00c0"
};

/** ASCII characters that mean something in Kruti Dev and therefore cannot be passed through unchanged. */
const KRUTI_SIGNIFICANT = new Set(
  K2U.flatMap(([from]) => from.split(""))
    .concat(["f", "Z", "\u00b1", "\u00c6", "\u00c7", "\u00af", "\u00c9", "\u00ca"])
    .filter((c) => c !== " ")
);

/** @param {string} ch */
function isConsonant(ch) {
  return Object.prototype.hasOwnProperty.call(FULL, ch);
}

/** @param {string} ch */
function isMatra(ch) {
  return Object.prototype.hasOwnProperty.call(MATRA, ch);
}

/**
 * Renders a consonant cluster such as "स्थ" or "प्र" (no vowel signs) in Kruti Dev.
 * @param {string} cluster
 */
function renderCluster(cluster) {
  let out = "";
  let i = 0;
  while (i < cluster.length) {
    const rest = cluster.slice(i);
    const lig = LIGATURES.find(([u]) => rest.startsWith(u) && !(rest.length > u.length && rest[u.length] === NUKTA));
    if (lig) {
      // A ligature followed by halant + र is written ligature + "z" (e.g. ह्र is already a ligature).
      out += lig[1];
      i += lig[0].length;
      continue;
    }
    let cons = cluster[i];
    let len = 1;
    if (cluster[i + 1] === NUKTA) {
      len = 2;
    }
    const base = cons;
    const consKey = len === 2 ? composeNukta(base) : base;
    const afterCons = cluster.slice(i + len);

    // Consonant + ्र (र as the last part of a conjunct) is written as full form + "z".
    if (afterCons.startsWith(HALANT + RA) && (afterCons.length === 2 || afterCons[2] !== HALANT)) {
      const full = FULL[consKey];
      if (full === undefined) return null;
      out += full + "z";
      i += len + 2;
      continue;
    }
    if (afterCons.startsWith(HALANT)) {
      const half = HALF[consKey];
      const full = FULL[consKey];
      if (half !== undefined && afterCons.length > 1) out += half;
      else if (full !== undefined) out += full + "~";
      else return null;
      i += len + 1;
      continue;
    }
    const full = FULL[consKey];
    if (full === undefined) return null;
    out += full;
    i += len;
  }
  return out;
}

/** @param {string} ch */
function composeNukta(ch) {
  /** @type {Record<string, string>} */
  const map = {
    "\u0915": "\u0958", "\u0916": "\u0959", "\u0917": "\u095a", "\u091c": "\u095b", "\u0921": "\u095c",
    "\u0922": "\u095d", "\u092b": "\u095e", "\u092f": "\u095f", "\u0928": "\u0929", "\u0930": "\u0931"
  };
  return map[ch] || ch + NUKTA;
}

/**
 * Converts Unicode Devanagari into Kruti Dev 010 characters without verification.
 * Returns null when the text contains something Kruti Dev cannot represent.
 * @param {string} input
 */
export function unicodeToKrutiRaw(input) {
  const s = input.normalize("NFC");
  let out = "";
  let i = 0;
  while (i < s.length) {
    const ch = s[i];

    // Reph: र् followed by a consonant.
    let reph = false;
    if (ch === RA && s[i + 1] === HALANT && s[i + 2] !== undefined && isConsonant(s[i + 2])) {
      reph = true;
      i += 2;
    }

    if (isConsonant(s[i])) {
      let j = i + 1;
      if (s[j] === NUKTA) j++;
      while (s[j] === HALANT && s[j + 1] !== undefined && isConsonant(s[j + 1])) {
        j += 2;
        if (s[j] === NUKTA) j++;
      }
      let cluster = s.slice(i, j);
      // Word-final explicit halant stays part of the cluster.
      if (s[j] === HALANT) {
        cluster += HALANT;
        j++;
      }
      let hasI = false;
      let matras = "";
      /** @type {string[]} */
      const tail = [];
      while (j < s.length && (s[j] === I_MATRA || isMatra(s[j]))) {
        if (s[j] === I_MATRA) hasI = true;
        else tail.push(s[j]);
        j++;
      }

      // रु / रू have their own glyphs.
      if (cluster === RA && !reph && !hasI && (tail[0] === "\u0941" || tail[0] === "\u0942")) {
        out += tail[0] === "\u0941" ? "#" : ":";
        tail.shift();
        for (const t of tail) out += MATRA[t];
        i = j;
        continue;
      }

      const body = renderCluster(cluster);
      if (body === null) return null;
      let anusvara = "";
      for (const t of tail) {
        if (t === "\u0902" || t === "\u0901") anusvara += MATRA[t];
        else matras += MATRA[t];
      }
      out += (hasI ? "f" : "") + body + matras + (reph ? "Z" : "") + anusvara;
      i = j;
      continue;
    }
    if (reph) return null;

    if (Object.prototype.hasOwnProperty.call(INDEPENDENT, ch)) {
      out += INDEPENDENT[ch];
      i++;
      continue;
    }
    if (isMatra(ch)) {
      // Vowel sign after an independent vowel, e.g. अं.
      out += MATRA[ch];
      i++;
      continue;
    }
    if (/[\u0900-\u097f]/.test(ch)) return null;
    if (KRUTI_SIGNIFICANT.has(ch)) return null;
    out += ch;
    i++;
  }
  return out;
}

/**
 * Converts Unicode Devanagari to Kruti Dev and verifies the result by
 * converting it back. Returns null if the text cannot be converted exactly.
 * @param {string} input
 */
export function unicodeToKruti(input) {
  const raw = unicodeToKrutiRaw(input);
  if (raw === null) return null;
  const back = krutiToUnicode(raw);
  return sameDevanagari(back, input) ? raw : null;
}

/** @param {string} a @param {string} b */
export function sameDevanagari(a, b) {
  return a.normalize("NFD") === b.normalize("NFD");
}

/* ===== DETECTION HELPERS ===== */

/** @param {string | null | undefined} fontName */
export function isKrutiDevFont(fontName) {
  return !!fontName && /kruti\s*dev/i.test(fontName);
}

/** @param {string} text */
export function containsDevanagari(text) {
  return /[\u0900-\u097f]/.test(text);
}

/**
 * Result of a Kruti -> Unicode conversion is only trusted if no Kruti
 * letters are left over (which would mean an unknown character).
 * @param {string} converted
 */
export function looksFullyConverted(converted) {
  return !/[A-Za-z\u00a1-\u00ff\u0152\u0160\u0192\u02c6\u2013\u2014\u201e\u2020-\u2022\u2026\u2030\u2039\u2122]/.test(converted);
}

/** Footnote marks, fields, pictures, manual line/page breaks: replacing text would destroy them. */
const SPECIAL_CONTENT = /[\u0001-\u0008\u000b\u000c\u000e-\u001f]/;

/**
 * @typedef {{ action: "convert", output: string } | { action: "ignore" } | { action: "skip", reason: "mixed-font" | "special" | "not-exact" }} WordDecision
 */

/**
 * Decides what to do with one word-sized range of the document.
 * Leading/trailing spaces are kept exactly as they are.
 *
 * @param {string} text
 * @param {string | null} fontName  null or "" when the word has more than one font.
 * @param {"toUnicode" | "toKruti"} direction
 * @returns {WordDecision}
 */
export function decideWord(text, fontName, direction) {
  const m = /^(\s*)([\s\S]*?)(\s*)$/.exec(text);
  const lead = m ? m[1] : "";
  const core = m ? m[2] : text;
  const trail = m ? m[3] : "";
  if (core === "") return { action: "ignore" };

  if (direction === "toUnicode") {
    if (!fontName) return /[A-Za-z]/.test(core) ? { action: "skip", reason: "mixed-font" } : { action: "ignore" };
    if (!isKrutiDevFont(fontName)) return { action: "ignore" };
    if (SPECIAL_CONTENT.test(core)) return { action: "skip", reason: "special" };
    const out = convertKrutiWord(core);
    if (out === null) return { action: "skip", reason: "not-exact" };
    if (out === core) return { action: "ignore" };
    return { action: "convert", output: lead + out + trail };
  }

  if (!containsDevanagari(core)) return { action: "ignore" };
  if (SPECIAL_CONTENT.test(core)) return { action: "skip", reason: "special" };
  const out = unicodeToKruti(core);
  if (out === null) return { action: "skip", reason: "not-exact" };
  return { action: "convert", output: lead + out + trail };
}

/**
 * Converts one word from Kruti Dev to Unicode, refusing anything uncertain.
 * @param {string} kruti
 * @returns {string | null}
 */
export function convertKrutiWord(kruti) {
  const out = krutiToUnicode(kruti);
  return looksFullyConverted(out) ? out : null;
}
