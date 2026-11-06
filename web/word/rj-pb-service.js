/*
File: rj-pb-service.js
Path: /web/word/rj-pb-service.js
Project: AB Layout (Advocate Benefit Layout)
Developed by PrajnaBytes International Private Limited and RatioJuris
Copyright (C) 2026 PrajnaBytes International Private Limited and RatioJuris
SPDX-License-Identifier: GPL-3.0-or-later
Additional terms under GPLv3 section 7 apply (attribution and names) - see NOTICE.

The operations the task pane offers, each one a complete, checked workflow:
read -> decide -> (only after the user confirmed) change -> verify -> report.
`run` is Word.run in production and a fake in tests.
*/

import { buildFormattingPlan, blankLineCandidates } from "../core/rj-pb-plan.js";
import { runDiagnostics } from "../core/rj-pb-diagnostics.js";
import { compareParagraphTexts, fingerprint } from "../core/rj-pb-verify.js";
import { planSectionMargins } from "../core/rj-pb-layouts.js";
import { readParagraphs, readTexts, readReviewInfo, readPageSetups } from "./rj-pb-reader.js";
import { applyChanges, removeBlankParagraphs, selectParagraph } from "./rj-pb-writer.js";
import { runHindiConversion } from "./rj-pb-hindi.js";

/**
 * @typedef {import("./rj-pb-capabilities.js").Capabilities} Capabilities
 * @typedef {import("../core/rj-pb-profiles.js").Profile} Profile
 * @typedef {(fn: (context: any) => Promise<any>) => Promise<any>} RunFn
 *
 * @typedef {Object} CleanOptions
 * @property {boolean} removeBlankLines
 * @property {number} keepBlankLines
 *
 * @typedef {Object} RestorePoint
 * @property {string} fingerprint        Text fingerprint right after applying.
 * @property {Array<{ position: number, set: import("../core/rj-pb-types.js").FormatChange }>} entries
 * @property {number} notRestorable      Paragraphs whose mixed fonts/sizes cannot be brought back.
 * @property {number} blankLinesRemoved  Removed blank lines are not brought back by Restore.
 */

/**
 * @param {{ run: RunFn, caps: Capabilities }} deps
 */
export function createService({ run, caps }) {
  return {
    /** Check Document: read-only. */
    async inspect(/** @type {string[]} */ protectedFonts = [], /** @type {(m: string) => void} */ onProgress = () => {}) {
      return run(async (context) => {
        onProgress("Reading paragraphs...");
        const { snapshots } = await readParagraphs(context, { onProgress });
        onProgress("Checking review marks and page setup...");
        const review = await readReviewInfo(context, caps);
        let pageSetups = null;
        try {
          pageSetups = await readPageSetups(context, caps);
        } catch {
          pageSetups = null;
        }
        const result = runDiagnostics(snapshots, { review, pageSetups, protectedFonts });
        return {
          ...result,
          review,
          pageSetups,
          textStarts: snapshots.map((s) => s.text.slice(0, 40)),
          fingerprint: fingerprint(snapshots.map((s) => s.text))
        };
      });
    },

    /** Preview of Clean Document: read-only. */
    async previewClean(/** @type {Profile} */ profile, /** @type {CleanOptions} */ options, /** @type {(m: string) => void} */ onProgress = () => {}) {
      return run(async (context) => {
        const { snapshots } = await readParagraphs(context, { onProgress });
        const plan = buildFormattingPlan(snapshots, profile);
        const blanks = options.removeBlankLines ? blankLineCandidates(snapshots, options.keepBlankLines) : [];
        return {
          plan,
          blankCandidates: blanks.length,
          fingerprint: fingerprint(snapshots.map((s) => s.text)),
          textStarts: snapshots.map((s) => s.text.slice(0, 40))
        };
      });
    },

    /**
     * Apply Clean Document. Re-reads the document first; if it changed since
     * the preview, nothing is applied and `stale` is returned.
     */
    async applyClean(
      /** @type {Profile} */ profile,
      /** @type {CleanOptions} */ options,
      /** @type {string} */ expectedFingerprint,
      /** @type {(m: string) => void} */ onProgress = () => {}
    ) {
      return run(async (context) => {
        const { snapshots, items } = await readParagraphs(context, { onProgress });
        const before = snapshots.map((s) => s.text);
        if (fingerprint(before) !== expectedFingerprint) return { stale: true };

        const plan = buildFormattingPlan(snapshots, profile);
        onProgress("Applying formatting...");
        const { applied, failed } = await applyChanges(context, items, plan.changes, (d, t) =>
          onProgress(`Applying formatting (${d} of ${t})...`)
        );

        /** @type {number[]} */
        let removed = [];
        /** @type {Array<{ index: number, reason: string }>} */
        let keptBlank = [];
        if (options.removeBlankLines) {
          onProgress("Checking blank lines...");
          const candidates = blankLineCandidates(snapshots, options.keepBlankLines);
          const r = await removeBlankParagraphs(context, items, candidates);
          removed = r.removed;
          keptBlank = r.kept;
        }

        onProgress("Checking that no text changed...");
        const after = await readTexts(context);
        const verification = compareParagraphTexts(before, after, removed);

        const appliedSet = new Set(applied);
        const removedSet = new Set(removed);
        const shift = (/** @type {number} */ i) => i - removed.filter((r) => r < i).length;
        /** @type {RestorePoint} */
        const restorePoint = {
          fingerprint: fingerprint(after),
          entries: plan.changes
            .filter((c) => appliedSet.has(c.index) && !removedSet.has(c.index))
            .map((c) => ({ position: shift(c.index), set: c.previous })),
          notRestorable: plan.changes.filter((c) => c.mixedFontUnified && appliedSet.has(c.index)).length,
          blankLinesRemoved: removed.length
        };

        return { stale: false, plan, applied: applied.length, failed, removed, keptBlank, verification, restorePoint };
      });
    },

    /** Puts back the formatting changed by the last Apply, if the document is unchanged since. */
    async restoreFormatting(/** @type {RestorePoint} */ point) {
      return run(async (context) => {
        const paragraphs = context.document.body.paragraphs;
        paragraphs.load("items/text");
        await context.sync();
        const texts = paragraphs.items.map((/** @type {any} */ p) => p.text);
        if (fingerprint(texts) !== point.fingerprint) return { ok: false, reason: "changed" };
        const { applied, failed } = await applyChanges(
          context,
          paragraphs.items,
          point.entries.map((e) => ({ index: e.position, set: e.set }))
        );
        return { ok: failed.length === 0, restored: applied.length, failed: failed.length };
      });
    },

    /** Paper size and margins (desktop Word only). */
    async applyPageLayout(/** @type {import("../core/rj-pb-layouts.js").ResolvedLayout} */ layout) {
      if (!caps.pageSetup) return { supported: false };
      return run(async (context) => {
        const before = await readPageSetups(context, caps);
        const sections = context.document.sections;
        sections.load("items");
        await context.sync();
        const { perSection, notes } = planSectionMargins(layout, sections.items.length);
        sections.items.forEach((/** @type {any} */ s, /** @type {number} */ i) => {
          const m = perSection[Math.min(i, perSection.length - 1)];
          const ps = s.pageSetup;
          ps.pageWidth = layout.width;
          ps.pageHeight = layout.height;
          ps.topMargin = m.top;
          ps.bottomMargin = m.bottom;
          ps.leftMargin = m.left;
          ps.rightMargin = m.right;
        });
        await context.sync();
        return { supported: true, sections: sections.items.length, notes, before };
      });
    },

    /** Puts back each section's own previous paper size and margins. */
    async restorePageLayout(/** @type {import("../core/rj-pb-types.js").PageSetupSnapshot[]} */ before) {
      if (!caps.pageSetup) return { supported: false };
      return run(async (context) => {
        const sections = context.document.sections;
        sections.load("items");
        await context.sync();
        if (sections.items.length !== before.length) return { supported: true, ok: false };
        sections.items.forEach((/** @type {any} */ s, /** @type {number} */ i) => {
          const ps = s.pageSetup;
          const b = before[i];
          ps.pageWidth = b.pageWidth;
          ps.pageHeight = b.pageHeight;
          ps.topMargin = b.topMargin;
          ps.bottomMargin = b.bottomMargin;
          ps.leftMargin = b.leftMargin;
          ps.rightMargin = b.rightMargin;
        });
        await context.sync();
        return { supported: true, ok: true };
      });
    },

    /** Hindi font conversion; dryRun=true for the preview. */
    async hindi(/** @type {Parameters<typeof runHindiConversion>[1]} */ options) {
      return run((context) => runHindiConversion(context, options));
    },

    async showParagraph(/** @type {number} */ index, /** @type {string} */ textStart) {
      return run((context) => selectParagraph(context, index, textStart));
    }
  };
}
