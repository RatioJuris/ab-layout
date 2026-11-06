/*
File: rj-pb-profile-store.js
Path: /web/ui/rj-pb-profile-store.js
Project: AB Layout (Advocate Benefit Layout)
Developed by PrajnaBytes International Private Limited and RatioJuris
Copyright (C) 2026 PrajnaBytes International Private Limited and RatioJuris
SPDX-License-Identifier: GPL-3.0-or-later
Additional terms under GPLv3 section 7 apply (attribution and names) - see NOTICE.

Custom profiles are saved in the browser storage of this computer only
(no account, no server). They contain settings, never document text.
*/

import { validateProfile } from "../core/rj-pb-profiles.js";

const KEY = "ab-layout.profiles.v1";
const SELECTED_KEY = "ab-layout.selectedProfile";

/**
 * @typedef {import("../core/rj-pb-profiles.js").Profile} Profile
 * @typedef {{ getItem(k: string): string | null, setItem(k: string, v: string): void }} StorageLike
 */

/** In-memory fallback when browser storage is blocked (e.g. strict privacy settings). */
function memoryStorage() {
  /** @type {Record<string, string>} */
  const data = {};
  return { getItem: (/** @type {string} */ k) => (k in data ? data[k] : null), setItem: (/** @type {string} */ k, /** @type {string} */ v) => { data[k] = v; } };
}

/**
 * @param {StorageLike | null} [storage]
 */
export function createProfileStore(storage) {
  /** @type {StorageLike} */
  let s;
  let persistent = true;
  try {
    s = storage || window.localStorage;
    s.setItem("ab-layout.test", "1");
  } catch {
    s = memoryStorage();
    persistent = false;
  }

  /** @returns {Profile[]} */
  function load() {
    try {
      const raw = s.getItem(KEY);
      if (!raw) return [];
      const list = JSON.parse(raw);
      return Array.isArray(list) ? list.filter((p) => validateProfile(p).valid && !p.builtIn) : [];
    } catch {
      return [];
    }
  }

  /** @param {Profile[]} list */
  function save(list) {
    s.setItem(KEY, JSON.stringify(list));
  }

  return {
    persistent,
    list: load,
    /** @param {Profile} p */
    upsert(p) {
      const v = validateProfile(p);
      if (!v.valid) return v;
      const list = load().filter((x) => x.id !== p.id);
      list.push({ ...p, builtIn: false });
      save(list);
      return v;
    },
    /** @param {string} id */
    remove(id) {
      save(load().filter((x) => x.id !== id));
    },
    exportText() {
      return JSON.stringify({ format: "ab-layout-profiles", version: 1, profiles: load() }, null, 2);
    },
    /**
     * @param {string} text
     * @returns {{ imported: number, rejected: number, error?: string }}
     */
    importText(text) {
      let data;
      try {
        data = JSON.parse(text);
      } catch {
        return { imported: 0, rejected: 0, error: "This text is not a valid AB Layout profile export." };
      }
      const incoming = Array.isArray(data?.profiles) ? data.profiles : [];
      if (data?.format !== "ab-layout-profiles" || incoming.length === 0) {
        return { imported: 0, rejected: 0, error: "No AB Layout profiles found in this text." };
      }
      const list = load();
      let imported = 0;
      let rejected = 0;
      for (const p of incoming) {
        const candidate = { ...p, builtIn: false };
        if (!validateProfile(candidate).valid) { rejected++; continue; }
        const i = list.findIndex((x) => x.id === candidate.id);
        if (i >= 0) list[i] = candidate;
        else list.push(candidate);
        imported++;
      }
      save(list);
      return { imported, rejected };
    },
    getSelected() {
      try { return s.getItem(SELECTED_KEY); } catch { return null; }
    },
    /** @param {string} id */
    setSelected(id) {
      try { s.setItem(SELECTED_KEY, id); } catch { /* not critical */ }
    }
  };
}
