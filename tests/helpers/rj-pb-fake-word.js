// SPDX-License-Identifier: GPL-3.0-or-later
// Additional terms under GPLv3 section 7 apply (attribution and names) - see NOTICE.
// Developed by PrajnaBytes International Private Limited and RatioJuris
// Copyright (C) 2026 PrajnaBytes International Private Limited and RatioJuris

// A small in-memory imitation of the Word JavaScript API, for unit tests only.
// Like the real API, property writes are queued and only take effect on
// context.sync(); writing to a "locked" paragraph makes sync() throw.
// Passing these tests does NOT prove behaviour in real Word.

const FORMAT_PROPS = ["alignment", "firstLineIndent", "leftIndent", "rightIndent", "lineSpacing", "spaceBefore", "spaceAfter"];
const FONT_PROPS = ["name", "size", "color", "highlightColor"];

/**
 * @typedef {Object} FakeParagraphInit
 * @property {string} text
 * @property {string} [alignment]
 * @property {number} [firstLineIndent]
 * @property {number} [leftIndent]
 * @property {number} [rightIndent]
 * @property {number} [lineSpacing]
 * @property {number} [spaceBefore]
 * @property {number} [spaceAfter]
 * @property {string} [styleBuiltIn]
 * @property {boolean} [isListItem]
 * @property {number} [tableNestingLevel]
 * @property {{ name?: string | null, size?: number | null, color?: string, highlightColor?: string | null }} [font]
 * @property {string} [ooxml]
 * @property {boolean} [locked]
 * @property {Array<{ text: string, font: string }>} [words]
 */

export function createFakeWord(/** @type {FakeParagraphInit[]} */ inits, /** @type {any} */ options = {}) {
  /** @type {Array<() => void>} */
  let pending = [];
  let pendingLockedWrite = false;
  const log = { syncs: 0, textWrites: 0, deletes: 0, selected: /** @type {number | null} */ (null) };

  /** @type {any[]} */
  let paragraphs = [];

  const makeParagraph = (/** @type {FakeParagraphInit} */ init) => {
    const state = {
      alignment: "Left", firstLineIndent: 0, leftIndent: 0, rightIndent: 0, lineSpacing: 12, spaceBefore: 0, spaceAfter: 0,
      ...init
    };
    const fontState = { name: "Times New Roman", size: 12, color: "#000000", highlightColor: null, ...(init.font || {}) };
    /** @type {any} */
    const p = {
      get text() { return state.words ? state.words.map((w) => w.text).join("") : state.text; },
      get styleBuiltIn() { return state.styleBuiltIn || "Normal"; },
      get isListItem() { return !!state.isListItem; },
      get tableNestingLevel() { return state.tableNestingLevel || 0; },
      load() { return p; },
      getOoxml() {
        return { value: state.ooxml ?? `<pkg:package><pkg:part pkg:name="/word/document.xml"><w:document><w:body><w:p><w:r><w:t>${p.text}</w:t></w:r></w:p><w:sectPr/></w:body></w:document></pkg:part></pkg:package>` };
      },
      delete() {
        if (state.locked) pendingLockedWrite = true;
        pending.push(() => { paragraphs = paragraphs.filter((x) => x !== p); log.deletes++; });
      },
      select() { pending.push(() => { log.selected = paragraphs.indexOf(p); }); },
      getRange() { return makeContentRange(p, state); },
      _state: state,
      _font: fontState
    };
    for (const k of FORMAT_PROPS) {
      Object.defineProperty(p, k, {
        get: () => /** @type {any} */ (state)[k],
        set: (v) => {
          if (state.locked) pendingLockedWrite = true;
          pending.push(() => { /** @type {any} */ (state)[k] = v; });
        }
      });
    }
    const font = {};
    for (const k of FONT_PROPS) {
      Object.defineProperty(font, k, {
        get: () => /** @type {any} */ (fontState)[k],
        set: (v) => {
          if (state.locked) pendingLockedWrite = true;
          pending.push(() => { /** @type {any} */ (fontState)[k] = v; });
        }
      });
    }
    p.font = font;
    return p;
  };

  /** Range covering a paragraph's content; splits into word ranges like getTextRanges([" "], false). */
  const makeContentRange = (/** @type {any} */ p, /** @type {any} */ state) => ({
    isNullObject: false,
    load() {},
    intersectWithOrNullObject() { return this; },
    getTextRanges() {
      if (!state.words) {
        state.words = (state.text.match(/[^ ]+ *| +/g) || []).map((/** @type {string} */ t) => ({ text: t, font: p._font.name }));
      }
      const items = state.words.map((/** @type {{ text: string, font: string }} */ w) => {
        const r = {
          get text() { return w.text; },
          font: { get name() { return w.font; } },
          insertText(/** @type {string} */ out) {
            const inserted = { font: { set name(/** @type {string} */ v) { pending.push(() => { w.font = v; }); } } };
            pending.push(() => { w.text = out; log.textWrites++; });
            return inserted;
          }
        };
        return r;
      });
      return { items, load() {} };
    }
  });

  paragraphs = inits.map(makeParagraph);

  const collection = () => ({ get items() { return paragraphs.slice(); }, load() {} });

  const sections = (options.sections || [{ pageWidth: 612, pageHeight: 1008, topMargin: 72, bottomMargin: 72, leftMargin: 72, rightMargin: 72 }]).map(
    (/** @type {any} */ s) => {
      const ps = { ...s, load() {} };
      return { pageSetup: ps };
    }
  );

  const context = {
    document: {
      body: {
        get paragraphs() { return collection(); },
        getComments() { return { items: new Array(options.comments || 0).fill({}), load() {} }; },
        getTrackedChanges() { return { items: new Array(options.trackedChanges || 0).fill({}), load() {} }; },
        getRange() { return { get paragraphs() { return collection(); } }; }
      },
      sections: { get items() { return sections; }, load() {} },
      getSelection() { return { get paragraphs() { return collection(); } }; }
    },
    async sync() {
      log.syncs++;
      const work = pending;
      const locked = pendingLockedWrite;
      pending = [];
      pendingLockedWrite = false;
      if (locked) {
        const e = new Error("The content is locked.");
        /** @type {any} */ (e).code = "AccessDenied";
        throw e;
      }
      if (options.failAllSyncs) {
        const e = new Error("GeneralException");
        /** @type {any} */ (e).code = "GeneralException";
        throw e;
      }
      for (const w of work) w();
    }
  };

  return {
    context,
    log,
    run: (/** @type {(ctx: any) => Promise<any>} */ fn) => fn(context),
    paragraphs: () => paragraphs,
    sections,
    /** Simulates the user typing into paragraph i. */
    edit(/** @type {number} */ i, /** @type {string} */ text) { paragraphs[i]._state.text = text; paragraphs[i]._state.words = undefined; }
  };
}

/** A fake `Office` global for capability detection. */
export function fakeOffice(/** @type {Record<string, string>} */ supported, platform = "PC") {
  return {
    context: {
      requirements: {
        isSetSupported: (/** @type {string} */ name, /** @type {string} */ v) => {
          const max = supported[name];
          return max !== undefined && Number(v) <= Number(max);
        }
      },
      diagnostics: { platform, version: "16.0" }
    }
  };
}
