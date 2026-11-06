/*
File: taskpane.js
Path: /web/taskpane.js
Project: AB Layout (Advocate Benefit Layout)
Version: 4.0.0
Developed by PrajnaBytes International Private Limited and RatioJuris
Copyright (C) 2026 PrajnaBytes International Private Limited and RatioJuris
SPDX-License-Identifier: GPL-3.0-or-later
Additional terms under GPLv3 section 7 apply (attribution and names) - see NOTICE.

Task pane controller: connects the buttons to the document operations in
web/word/rj-pb-service.js. Contains UI state only; no formatting logic.
*/

import { ATTRIBUTION, attributionLine } from "./core/rj-pb-attribution.js";
import { BUILT_IN_PROFILES, MATCH, allProfiles, cloneProfile, createCustomProfile, validateProfile } from "./core/rj-pb-profiles.js";
import { validateStore, validateLayout, resolveLayout } from "./core/rj-pb-layouts.js";
import { detectCapabilities, UNAVAILABLE } from "./word/rj-pb-capabilities.js";
import { createService } from "./word/rj-pb-service.js";
import { friendlyError, logError } from "./word/rj-pb-errors.js";
import { UNICODE_HINDI_FONTS, KRUTI_FONTS } from "./word/rj-pb-hindi.js";
import { byId, el, replaceChildren, setStatus, initTabs, busy } from "./ui/rj-pb-dom.js";
import { createProfileStore } from "./ui/rj-pb-profile-store.js";
import { findingItem, profileInfo, previewView, resultView, hindiView, layoutInfo } from "./ui/rj-pb-render.js";

/* global Office, Word */

const LAYOUTS_URL = "../layouts/layouts.json?v=" + ATTRIBUTION.version;

/** @type {any} */
const OfficeApi = /** @type {any} */ (globalThis).Office;
/** @type {any} */
const WordApi = () => /** @type {any} */ (globalThis).Word;

const store = createProfileStore();

const state = {
  /** @type {ReturnType<typeof createService> | null} */
  service: null,
  /** @type {import("./word/rj-pb-capabilities.js").Capabilities | null} */
  caps: null,
  /** @type {string[]} */
  inspectTextStarts: [],
  /** @type {{ fingerprint: string, profile: import("./core/rj-pb-profiles.js").Profile, options: { removeBlankLines: boolean, keepBlankLines: number }, textStarts: string[] } | null} */
  preview: null,
  /** @type {import("./word/rj-pb-service.js").RestorePoint | null} */
  restorePoint: null,
  /** @type {import("./core/rj-pb-layouts.js").LayoutStore | null} */
  layouts: null,
  /** @type {import("./core/rj-pb-types.js").PageSetupSnapshot[] | null} */
  pageBefore: null
};

/* ===== START ===== */

byId("rj-pb-attribution").textContent = attributionLine();

if (!OfficeApi || typeof OfficeApi.onReady !== "function") {
  showBanner("Open this page inside Microsoft Word (Insert > Add-ins) to use AB Layout.");
} else {
  OfficeApi.onReady((/** @type {any} */ info) => {
    if (info.host !== OfficeApi.HostType.Word) {
      showBanner("AB Layout works only inside Microsoft Word.");
      byId("platform").textContent = "Not in Word";
      return;
    }
    start();
  });
}

function start() {
  const caps = detectCapabilities(OfficeApi);
  state.caps = caps;
  byId("platform").textContent = caps.platformLabel;
  initTabs();
  if (!caps.core) {
    showBanner(UNAVAILABLE.core);
    return;
  }
  state.service = createService({ run: (fn) => WordApi().run(fn), caps });

  initCheck();
  initClean();
  initHindi();
  initPage();
  initProfiles();
  if (!store.persistent) {
    showBanner("Custom profiles cannot be saved on this computer (browser storage is blocked). They will last until the panel is closed.");
  }
}

/** @param {string} message */
function showBanner(message) {
  const b = byId("banner");
  b.textContent = message;
  b.hidden = false;
}

/**
 * @param {string} statusId
 * @param {string} where
 * @param {unknown} err
 */
function reportError(statusId, where, err) {
  logError(where, err);
  const f = friendlyError(err);
  setStatus(statusId, `${f.title} ${f.action}`, "error");
}

function service() {
  return /** @type {ReturnType<typeof createService>} */ (state.service);
}

/* ===== CHECK ===== */

function initCheck() {
  const btn = /** @type {HTMLButtonElement} */ (byId("inspectBtn"));
  btn.disabled = false;
  btn.addEventListener("click", () =>
    busy([btn], async () => {
      try {
        setStatus("checkStatus", "Reading your document...");
        const r = await service().inspect(currentProfile().protectedFonts, (m) => setStatus("checkStatus", m));
        state.inspectTextStarts = r.textStarts;
        const s = r.stats;
        const summary = byId("checkSummary");
        replaceChildren(summary, [
          `${s.paragraphs} paragraphs (${s.bodyParagraphs} body, ${s.blankLines} blank, ${s.tables} in tables).`,
          r.review.comments === null && r.review.trackedChanges === null
            ? el("div", { class: "muted small" }, ["Comments and tracked changes could not be checked in this version of Word."])
            : null,
          r.pageSetups === null ? el("div", { class: "muted small" }, ["Paper size could not be checked here (Word for the web does not allow it)."]) : null
        ]);
        summary.hidden = false;
        const list = byId("findings");
        replaceChildren(
          list,
          r.findings.length === 0
            ? [el("li", { class: "finding info" }, [el("span", { class: "title" }, ["No problems found."]), el("p", null, ["Formatting looks consistent."])])]
            : r.findings.map((/** @type {import("./core/rj-pb-types.js").Finding} */ f) => findingItem(f, (i) => showParagraph(i, state.inspectTextStarts, "checkStatus")))
        );
        setStatus("checkStatus", `Check complete: ${r.findings.length} item(s) to look at.`, "success");
      } catch (err) {
        reportError("checkStatus", "inspect", err);
      }
    })
  );
}

/**
 * @param {number} index
 * @param {string[]} textStarts
 * @param {string} statusId
 */
async function showParagraph(index, textStarts, statusId) {
  try {
    const ok = await service().showParagraph(index, textStarts[index] ?? "");
    if (!ok) setStatus(statusId, "The document has changed since the check. Please run Check Document again.", "error");
  } catch (err) {
    reportError(statusId, "select", err);
  }
}

/* ===== CLEAN ===== */

function currentProfile() {
  const select = /** @type {HTMLSelectElement} */ (byId("profileSelect"));
  const all = allProfiles(store.list());
  return all.find((p) => p.id === select.value) || BUILT_IN_PROFILES[0];
}

function cleanOptions() {
  return {
    removeBlankLines: /** @type {HTMLInputElement} */ (byId("optBlank")).checked,
    keepBlankLines: Number(/** @type {HTMLSelectElement} */ (byId("optKeep")).value) || 1
  };
}

function fillProfileSelects(selectId = store.getSelected() || BUILT_IN_PROFILES[0].id) {
  const all = allProfiles(store.list());
  for (const id of ["profileSelect", "baseSelect"]) {
    const sel = /** @type {HTMLSelectElement} */ (byId(id));
    const keep = id === "baseSelect" ? sel.value : selectId;
    replaceChildren(sel, [
      el("optgroup", { label: "Built-in" }, BUILT_IN_PROFILES.map((p) => el("option", { value: p.id }, [p.name]))),
      store.list().length ? el("optgroup", { label: "My profiles" }, store.list().map((p) => el("option", { value: p.id }, [p.name]))) : null
    ]);
    sel.value = all.some((p) => p.id === keep) ? keep : BUILT_IN_PROFILES[0].id;
  }
  replaceChildren(byId("profileInfo"), profileInfo(currentProfile()));
}

function invalidatePreview() {
  state.preview = null;
  byId("preview").hidden = true;
  byId("applyBtn").hidden = true;
}

function initClean() {
  fillProfileSelects();
  const previewBtn = /** @type {HTMLButtonElement} */ (byId("previewBtn"));
  const applyBtn = /** @type {HTMLButtonElement} */ (byId("applyBtn"));
  const restoreBtn = /** @type {HTMLButtonElement} */ (byId("restoreBtn"));
  previewBtn.disabled = false;

  byId("profileSelect").addEventListener("change", () => {
    store.setSelected(currentProfile().id);
    replaceChildren(byId("profileInfo"), profileInfo(currentProfile()));
    invalidatePreview();
  });
  byId("optBlank").addEventListener("change", invalidatePreview);
  byId("optKeep").addEventListener("change", invalidatePreview);

  const runPreview = async () => {
    const profile = cloneProfile(currentProfile());
    const options = cleanOptions();
    setStatus("cleanStatus", "Reading your document...");
    byId("result").hidden = true;
    const r = await service().previewClean(profile, options, (m) => setStatus("cleanStatus", m));
    state.preview = { fingerprint: r.fingerprint, profile, options, textStarts: r.textStarts };
    const box = byId("preview");
    replaceChildren(box, previewView(r.plan, r.blankCandidates));
    box.hidden = false;
    const hasWork = r.plan.changes.length > 0 || r.blankCandidates > 0;
    applyBtn.hidden = !hasWork;
    setStatus("cleanStatus", hasWork ? "Review the changes above, then press Apply." : "Nothing needs to change.", hasWork ? "info" : "success");
  };

  previewBtn.addEventListener("click", () =>
    busy([previewBtn, applyBtn], async () => {
      try {
        await runPreview();
      } catch (err) {
        reportError("cleanStatus", "preview", err);
      }
    })
  );

  applyBtn.addEventListener("click", () =>
    busy([previewBtn, applyBtn, restoreBtn], async () => {
      const p = state.preview;
      if (!p) return;
      try {
        setStatus("cleanStatus", "Applying...");
        const r = await service().applyClean(p.profile, p.options, p.fingerprint, (m) => setStatus("cleanStatus", m));
        if (r.stale) {
          setStatus("cleanStatus", "The document changed after the preview, so nothing was applied. Here is a fresh preview.", "error");
          await runPreview();
          return;
        }
        applyBtn.hidden = true;
        byId("preview").hidden = true;
        state.preview = null;
        const box = byId("result");
        replaceChildren(box, resultView(r));
        box.hidden = false;
        state.restorePoint = r.restorePoint;
        restoreBtn.hidden = r.restorePoint.entries.length === 0;
        setStatus("cleanStatus", r.verification.ok ? "Formatting applied." : "Formatting applied - please read the warning below.", r.verification.ok ? "success" : "error");
      } catch (err) {
        reportError("cleanStatus", "apply", err);
      }
    })
  );

  restoreBtn.addEventListener("click", () =>
    busy([previewBtn, restoreBtn], async () => {
      const rp = state.restorePoint;
      if (!rp) return;
      try {
        const r = await service().restoreFormatting(rp);
        if (!r.ok && r.reason === "changed") {
          setStatus("cleanStatus", "The document was edited after applying, so Restore is no longer safe. Use Word's Undo (Ctrl+Z) instead.", "error");
        } else {
          setStatus(
            "cleanStatus",
            `Previous formatting restored on ${r.restored} paragraph(s).` +
              (rp.notRestorable ? ` ${rp.notRestorable} paragraph(s) had mixed fonts that cannot be brought back.` : "") +
              (rp.blankLinesRemoved ? " Removed blank lines are not brought back; use Undo for those." : ""),
            r.failed ? "error" : "success"
          );
        }
        state.restorePoint = null;
        restoreBtn.hidden = true;
      } catch (err) {
        reportError("cleanStatus", "restore", err);
      }
    })
  );
}

/* ===== HINDI ===== */

function hindiDirection() {
  const r = /** @type {HTMLInputElement | null} */ (document.querySelector('input[name="hindiDir"]:checked'));
  return /** @type {"toUnicode" | "toKruti"} */ (r ? r.value : "toUnicode");
}

function hindiScope() {
  const r = /** @type {HTMLInputElement | null} */ (document.querySelector('input[name="hindiScope"]:checked'));
  return /** @type {"selection" | "document"} */ (r ? r.value : "selection");
}

function initHindi() {
  const previewBtn = /** @type {HTMLButtonElement} */ (byId("hindiPreviewBtn"));
  const applyBtn = /** @type {HTMLButtonElement} */ (byId("hindiApplyBtn"));
  const fontSel = /** @type {HTMLSelectElement} */ (byId("hindiFont"));
  previewBtn.disabled = false;

  const refreshFonts = () => {
    const toUnicode = hindiDirection() === "toUnicode";
    const fonts = toUnicode ? UNICODE_HINDI_FONTS : KRUTI_FONTS;
    replaceChildren(fontSel, fonts.map((f) => el("option", { value: f }, [f])));
    byId("hindiFontNote").textContent = toUnicode
      ? "Mangal and Nirmala UI come with Windows and work in Word for the web."
      : "Kruti Dev must be installed on every computer that opens the document, otherwise the Hindi shows as English letters.";
  };
  const invalidate = () => {
    byId("hindiPreview").hidden = true;
    applyBtn.hidden = true;
  };
  refreshFonts();
  document.querySelectorAll('input[name="hindiDir"]').forEach((r) => r.addEventListener("change", () => { refreshFonts(); invalidate(); }));
  document.querySelectorAll('input[name="hindiScope"]').forEach((r) => r.addEventListener("change", invalidate));
  fontSel.addEventListener("change", invalidate);

  previewBtn.addEventListener("click", () =>
    busy([previewBtn, applyBtn], async () => {
      try {
        byId("hindiResult").hidden = true;
        setStatus("hindiStatus", "Looking for text to convert...");
        const direction = hindiDirection();
        const r = await service().hindi({
          direction,
          scope: hindiScope(),
          dryRun: true,
          targetFont: fontSel.value,
          onProgress: (m) => setStatus("hindiStatus", m)
        });
        const box = byId("hindiPreview");
        replaceChildren(box, hindiView(r, true, direction));
        box.hidden = false;
        applyBtn.hidden = r.toConvert === 0;
        setStatus(
          "hindiStatus",
          r.toConvert > 0
            ? "Check the sample, then press Convert Now."
            : hindiScope() === "selection"
              ? "Nothing to convert in the selection. Select the text first, or choose Whole document."
              : "Nothing to convert.",
          "info"
        );
      } catch (err) {
        reportError("hindiStatus", "hindi-preview", err);
      }
    })
  );

  applyBtn.addEventListener("click", () =>
    busy([previewBtn, applyBtn], async () => {
      try {
        setStatus("hindiStatus", "Converting...");
        const direction = hindiDirection();
        const r = await service().hindi({
          direction,
          scope: hindiScope(),
          dryRun: false,
          targetFont: fontSel.value,
          onProgress: (m) => setStatus("hindiStatus", m)
        });
        applyBtn.hidden = true;
        byId("hindiPreview").hidden = true;
        const box = byId("hindiResult");
        replaceChildren(box, hindiView(r, false, direction));
        box.hidden = false;
        setStatus("hindiStatus", "Conversion finished. Please read through the converted text.", r.failed ? "error" : "success");
      } catch (err) {
        reportError("hindiStatus", "hindi-convert", err);
      }
    })
  );
}

/* ===== PAGE ===== */

async function initPage() {
  const applyBtn = /** @type {HTMLButtonElement} */ (byId("pageApplyBtn"));
  const restoreBtn = /** @type {HTMLButtonElement} */ (byId("pageRestoreBtn"));
  const select = /** @type {HTMLSelectElement} */ (byId("layoutSelect"));
  const caps = /** @type {import("./word/rj-pb-capabilities.js").Capabilities} */ (state.caps);

  if (!caps.pageSetup) {
    const n = byId("pageUnsupported");
    n.textContent = UNAVAILABLE.pageSetup;
    n.hidden = false;
  }

  try {
    const res = await fetch(LAYOUTS_URL, { cache: "no-cache" });
    if (!res.ok) throw new Error("Failed to fetch layouts");
    const data = await res.json();
    const v = validateStore(data);
    if (!v.valid) throw new Error(v.error);
    state.layouts = data;
  } catch (err) {
    logError("layouts", err);
    setStatus("pageStatus", "Page layouts could not be loaded. Check your internet connection and reopen the panel.", "error");
    return;
  }

  const layouts = /** @type {import("./core/rj-pb-layouts.js").LayoutStore} */ (state.layouts);
  replaceChildren(select, layouts.layouts.map((l) => el("option", { value: l.id }, [l.name])));
  const show = () => {
    const l = resolveLayout(layouts, select.value);
    replaceChildren(byId("layoutInfo"), l ? layoutInfo(l) : []);
  };
  select.addEventListener("change", show);
  show();
  applyBtn.disabled = !caps.pageSetup;

  applyBtn.addEventListener("click", () =>
    busy([applyBtn, restoreBtn], async () => {
      const layout = resolveLayout(layouts, select.value);
      const check = validateLayout(layout);
      if (!layout || !check.valid) {
        setStatus("pageStatus", check.error || "Layout missing", "error");
        return;
      }
      try {
        const r = await service().applyPageLayout(layout);
        if (!r.supported) {
          setStatus("pageStatus", UNAVAILABLE.pageSetup, "error");
          return;
        }
        state.pageBefore = r.before;
        restoreBtn.hidden = false;
        setStatus(
          "pageStatus",
          `Applied "${layout.name}" to ${r.sections} section(s).` + (r.notes.length ? " " + r.notes.join(" ") : ""),
          r.notes.length ? "error" : "success"
        );
      } catch (err) {
        reportError("pageStatus", "page", err);
      }
    })
  );

  restoreBtn.addEventListener("click", () =>
    busy([applyBtn, restoreBtn], async () => {
      if (!state.pageBefore) return;
      try {
        const r = await service().restorePageLayout(state.pageBefore);
        if (r.ok) setStatus("pageStatus", "Previous paper size and margins restored.", "success");
        else setStatus("pageStatus", "Sections were added or removed since, so the old layout cannot be restored safely. Use Undo.", "error");
        state.pageBefore = null;
        restoreBtn.hidden = true;
      } catch (err) {
        reportError("pageStatus", "page-restore", err);
      }
    })
  );
}

/* ===== PROFILES ===== */

/** @param {string} id */
function input(id) {
  return /** @type {HTMLInputElement} */ (byId(id));
}

/** @param {number | string} v */
function showValue(v) {
  return v === MATCH ? "match" : String(v);
}

/**
 * @param {string} raw
 * @returns {number | "match" | null}
 */
function parseValue(raw) {
  const t = raw.trim().toLowerCase();
  if (t === "match" || t === "") return t === "" ? null : MATCH;
  const n = Number(t.replace(",", "."));
  return Number.isFinite(n) ? n : null;
}

/** @param {import("./core/rj-pb-profiles.js").Profile} p */
function fillForm(p) {
  const b = p.body;
  input("pfName").value = p.builtIn ? `My ${p.name}` : p.name;
  input("pfFont").value = b.fontName;
  input("pfSize").value = showValue(b.fontSize);
  input("pfLine").value = showValue(b.lineSpacing);
  /** @type {HTMLSelectElement} */ (byId("pfAlign")).value = b.alignment;
  input("pfFirst").value = showValue(b.firstLineIndentCm);
  input("pfBefore").value = showValue(b.spaceBefore);
  input("pfAfter").value = showValue(b.spaceAfter);
  input("pfLeft").value = showValue(b.leftIndentCm);
  input("pfRight").value = showValue(b.rightIndentCm);
  input("pfQuotes").checked = p.quotes.enabled;
  input("pfQSize").value = showValue(p.quotes.fontSize);
  input("pfQLine").value = showValue(p.quotes.lineSpacing);
  input("pfHeadings").checked = p.headingsFont;
  input("pfTables").checked = p.tablesFont;
  input("pfProtected").value = p.protectedFonts.join(", ");
  replaceChildren(byId("profileErrors"), []);
}

function renderCustomList() {
  const list = store.list();
  replaceChildren(
    byId("customList"),
    list.length === 0
      ? [el("p", { class: "muted small" }, ["You have no custom profiles yet."])]
      : [
          el("strong", null, ["My profiles"]),
          ...list.map((p) => {
            const del = el("button", { class: "secondary", type: "button", "aria-label": `Delete profile ${p.name}` }, ["Delete"]);
            del.addEventListener("click", () => {
              store.remove(p.id);
              fillProfileSelects(currentProfile().id === p.id ? BUILT_IN_PROFILES[0].id : currentProfile().id);
              renderCustomList();
              invalidatePreview();
            });
            return el("div", { class: "custom-item" }, [el("span", null, [p.name]), del]);
          })
        ]
  );
}

function initProfiles() {
  const base = /** @type {HTMLSelectElement} */ (byId("baseSelect"));
  const baseProfile = () => allProfiles(store.list()).find((p) => p.id === base.value) || BUILT_IN_PROFILES[0];
  fillForm(baseProfile());
  renderCustomList();
  base.addEventListener("change", () => fillForm(baseProfile()));

  byId("profileForm").addEventListener("submit", (ev) => {
    ev.preventDefault();
    const from = baseProfile();
    const p = from.builtIn ? createCustomProfile(from, input("pfName").value.trim()) : cloneProfile(from);
    p.name = input("pfName").value.trim();
    const font = input("pfFont").value.trim();
    p.body = {
      fontName: font.toLowerCase() === "match" ? MATCH : font,
      fontSize: /** @type {any} */ (parseValue(input("pfSize").value)),
      alignment: /** @type {any} */ (/** @type {HTMLSelectElement} */ (byId("pfAlign")).value),
      lineSpacing: /** @type {any} */ (parseValue(input("pfLine").value)),
      spaceBefore: /** @type {any} */ (parseValue(input("pfBefore").value)),
      spaceAfter: /** @type {any} */ (parseValue(input("pfAfter").value)),
      firstLineIndentCm: /** @type {any} */ (parseValue(input("pfFirst").value)),
      leftIndentCm: /** @type {any} */ (parseValue(input("pfLeft").value)),
      rightIndentCm: /** @type {any} */ (parseValue(input("pfRight").value))
    };
    p.quotes = {
      enabled: input("pfQuotes").checked,
      fontSize: /** @type {any} */ (parseValue(input("pfQSize").value) ?? MATCH),
      lineSpacing: /** @type {any} */ (parseValue(input("pfQLine").value) ?? MATCH)
    };
    p.headingsFont = input("pfHeadings").checked;
    p.tablesFont = input("pfTables").checked;
    p.protectedFonts = input("pfProtected").value.split(",").map((s) => s.trim()).filter(Boolean);

    const v = validateProfile(p);
    if (!v.valid) {
      replaceChildren(byId("profileErrors"), [el("ul", null, v.errors.map((e) => el("li", null, [e])))]);
      return;
    }
    store.upsert(p);
    store.setSelected(p.id);
    fillProfileSelects(p.id);
    base.value = p.id;
    renderCustomList();
    invalidatePreview();
    replaceChildren(byId("profileErrors"), [el("p", { class: "ok" }, [`Saved "${p.name}". It is now selected in the Clean tab.`])]);
  });

  byId("exportBtn").addEventListener("click", () => {
    /** @type {HTMLTextAreaElement} */ (byId("shareText")).value = store.exportText();
    setStatus("shareStatus", store.list().length ? "Copy all of this text (Ctrl+A, Ctrl+C)." : "You have no custom profiles to share yet.");
  });
  byId("importBtn").addEventListener("click", () => {
    const r = store.importText(/** @type {HTMLTextAreaElement} */ (byId("shareText")).value);
    if (r.error) {
      setStatus("shareStatus", r.error, "error");
      return;
    }
    fillProfileSelects(currentProfile().id);
    renderCustomList();
    setStatus("shareStatus", `Imported ${r.imported} profile(s).${r.rejected ? ` ${r.rejected} were invalid and skipped.` : ""}`, "success");
  });
}
