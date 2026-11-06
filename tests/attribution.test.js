// SPDX-License-Identifier: GPL-3.0-or-later
// Additional terms under GPLv3 section 7 apply (attribution and names) - see NOTICE.
// Developed by PrajnaBytes International Private Limited and RatioJuris
// Copyright (C) 2026 PrajnaBytes International Private Limited and RatioJuris

// Guards the attribution required by the additional terms in NOTICE.

import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync, readdirSync, statSync } from "node:fs";
import { join, dirname, relative } from "node:path";
import { fileURLToPath } from "node:url";
import { ATTRIBUTION, attributionLine } from "../web/core/rj-pb-attribution.js";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const DEVELOPED_BY = "Developed by PrajnaBytes International Private Limited and RatioJuris";

/** @param {string} dir @returns {string[]} */
function walk(dir) {
  return readdirSync(dir).flatMap((name) => {
    const p = join(dir, name);
    return statSync(p).isDirectory() ? walk(p) : [p];
  });
}

const sourceFiles = [...walk(join(root, "web")), ...walk(join(root, "site")), ...walk(join(root, "scripts")), ...walk(join(root, "tests")), join(root, "index.html")]
  .filter((f) => /\.(js|mjs|html|css)$/.test(f));

test("every source file carries the developer attribution, licence and section 7 pointer", () => {
  const missing = sourceFiles.filter((f) => {
    const c = readFileSync(f, "utf8");
    return !c.includes(DEVELOPED_BY) || !c.includes("GPL-3.0-or-later") || !c.includes("GPLv3 section 7");
  });
  assert.deepEqual(missing.map((f) => relative(root, f)), []);
});

test("core and Word modules use the rj-pb- file name prefix", () => {
  const dirs = ["web/core", "web/word", "web/ui"].map((d) => join(root, d));
  const bad = dirs
    .flatMap((d) => { try { return walk(d); } catch { return []; } })
    .filter((f) => f.endsWith(".js") && !/[\\/]rj-pb-[^\\/]+\.js$/.test(f));
  assert.deepEqual(bad.map((f) => relative(root, f)), []);
});

test("NOTICE states the GPLv3 section 7 additional terms", () => {
  const notice = readFileSync(join(root, "NOTICE"), "utf8");
  assert.match(notice, /PrajnaBytes International Private Limited and RatioJuris/);
  assert.match(notice, /section 7\(b\)/);
  assert.match(notice, /section 7\(c\)/);
  assert.match(notice, /section 7\(e\)/);
});

test("LICENSE is the GNU GPL version 3", () => {
  const license = readFileSync(join(root, "LICENSE"), "utf8");
  assert.match(license, /GNU GENERAL PUBLIC LICENSE\s+Version 3, 29 June 2007/);
});

test("task pane shows the attribution footer", () => {
  const html = readFileSync(join(root, "web", "taskpane.html"), "utf8");
  assert.match(html, /id="rj-pb-attribution"/);
  assert.ok(html.includes(DEVELOPED_BY), "static fallback text present");
  assert.equal(attributionLine().includes(ATTRIBUTION.developedBy), true);
  assert.equal(ATTRIBUTION.developedBy, DEVELOPED_BY);
});

test("manifest names both developers as provider", () => {
  const manifest = readFileSync(join(root, "manifest.xml"), "utf8");
  assert.match(manifest, /<ProviderName>PrajnaBytes International Private Limited and RatioJuris<\/ProviderName>/);
});
