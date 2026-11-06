/*
File: make-local-manifest.mjs
Path: /scripts/make-local-manifest.mjs
Project: AB Layout (Advocate Benefit Layout)
Developed by PrajnaBytes International Private Limited and RatioJuris
Copyright (C) 2026 PrajnaBytes International Private Limited and RatioJuris
SPDX-License-Identifier: GPL-3.0-or-later
Additional terms under GPLv3 section 7 apply (attribution and names) - see NOTICE.

Writes manifest.local.xml pointing at https://localhost:3000 for sideloading a
development copy into Word (use together with: npm run serve -- --https).
The production manifest.xml is never modified.
*/

import { readFileSync, writeFileSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const port = Number((process.argv.find((a) => a.startsWith("--port=")) || "--port=3000").split("=")[1]);
const prod = readFileSync(join(root, "manifest.xml"), "utf8");

const local = prod
  .replaceAll("https://ratiojuris.github.io/ab-layout/", `https://localhost:${port}/`)
  .replace("<AppDomain>https://ratiojuris.github.io</AppDomain>", `<AppDomain>https://localhost:${port}</AppDomain>`)
  // A different Id so the development copy can sit next to the installed one.
  .replace("<Id>8b7c2d3a-6f9a-4b7c-9d2e-1a2b3c4d5e6f</Id>", "<Id>3f1b7c52-0a8e-4d55-9c4e-6a1d2b3c4d5f</Id>")
  .replace('<DisplayName DefaultValue="AB Layout"/>', '<DisplayName DefaultValue="AB Layout (Dev)"/>');

writeFileSync(join(root, "manifest.local.xml"), local);
console.log(`manifest.local.xml written for https://localhost:${port}/`);
