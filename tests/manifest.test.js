// SPDX-License-Identifier: GPL-3.0-or-later
// Additional terms under GPLv3 section 7 apply (attribution and names) - see NOTICE.
// Developed by PrajnaBytes International Private Limited and RatioJuris
// Copyright (C) 2026 PrajnaBytes International Private Limited and RatioJuris

// Guards the hosting contract with GitHub Pages: every URL in the manifest must
// point to a file that exists in this repository (3.1.1 pointed its icons at a
// non-existent assets/icons/ folder), and the add-in Id must never change.

import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync, existsSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const manifest = readFileSync(join(root, "manifest.xml"), "utf8");
const BASE = "https://ratiojuris.github.io/ab-layout/";

test("every hosted URL in the manifest exists in the repository", () => {
  const urls = Array.from(manifest.matchAll(/DefaultValue="(https:\/\/ratiojuris\.github\.io\/ab-layout\/[^"]+)"/g)).map((m) => m[1]);
  assert.ok(urls.length >= 6);
  const missing = urls.filter((u) => !existsSync(join(root, u.slice(BASE.length).split("?")[0])));
  assert.deepEqual(missing, []);
});

test("add-in identity and entry URL are unchanged", () => {
  assert.match(manifest, /<Id>8b7c2d3a-6f9a-4b7c-9d2e-1a2b3c4d5e6f<\/Id>/);
  assert.match(manifest, /<DisplayName DefaultValue="AB Layout"\/>/);
  assert.match(manifest, /<SourceLocation DefaultValue="https:\/\/ratiojuris\.github\.io\/ab-layout\/web\/taskpane\.html"\/>/);
});

test("manifest makes no court-compliance claim", () => {
  assert.doesNotMatch(manifest, /compliant|standards/i);
});

test("task pane loads only local scripts besides office.js", () => {
  const html = readFileSync(join(root, "web", "taskpane.html"), "utf8");
  const external = Array.from(html.matchAll(/src="(https?:[^"]+)"/g)).map((m) => m[1]);
  assert.deepEqual(external, ["https://appsforoffice.microsoft.com/lib/1/hosted/office.js"]);
});
