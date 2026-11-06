/*
File: render-icons.mjs
Path: /scripts/render-icons.mjs
Project: AB Layout (Advocate Benefit Layout)
Developed by PrajnaBytes International Private Limited and RatioJuris
Copyright (C) 2026 PrajnaBytes International Private Limited and RatioJuris
SPDX-License-Identifier: GPL-3.0-or-later
Additional terms under GPLv3 section 7 apply (attribution and names) - see NOTICE.

Renders the SVG master icons to the PNG sizes Office requires (Office manifests
do not accept SVG) and builds favicon.ico. Run with: npm run icons

- assets/icon-small.svg  -> 16, 32 px (simplified artwork for tiny sizes)
- assets/icon.svg        -> 64, 80, 128, 512 px (and 48 px inside favicon.ico)
*/

import { readFileSync, writeFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";
import { Resvg } from "@resvg/resvg-js";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const assets = join(root, "assets");

const small = readFileSync(join(assets, "icon-small.svg"), "utf8");
const full = readFileSync(join(assets, "icon.svg"), "utf8");

/**
 * [size, artwork, write a PNG file?]. Files are written only for sizes something uses
 * (manifest: 16/32/64/80; native add-in: 32/80; website/README: 128/512).
 * 48 px is rendered only for favicon.ico.
 * @type {Array<[number, string, boolean]>}
 */
const targets = [
  [16, small, true], [32, small, true], [48, full, false],
  [64, full, true], [80, full, true], [128, full, true], [512, full, true]
];

/** @type {Map<number, Buffer>} */
const rendered = new Map();
for (const [size, svg, writeFile] of targets) {
  const png = new Resvg(svg, { fitTo: { mode: "width", value: size } }).render().asPng();
  rendered.set(size, png);
  if (writeFile) {
    writeFileSync(join(assets, `icon-${size}.png`), png);
    console.log(`assets/icon-${size}.png  ${png.length} bytes`);
  }
}

// favicon.ico with embedded PNG images (supported by all current browsers).
const icoSizes = [16, 32, 48];
const header = Buffer.alloc(6);
header.writeUInt16LE(0, 0);
header.writeUInt16LE(1, 2);
header.writeUInt16LE(icoSizes.length, 4);
const entries = [];
const images = [];
let offset = 6 + 16 * icoSizes.length;
for (const size of icoSizes) {
  const png = /** @type {Buffer} */ (rendered.get(size));
  const e = Buffer.alloc(16);
  e.writeUInt8(size, 0);
  e.writeUInt8(size, 1);
  e.writeUInt8(0, 2);
  e.writeUInt8(0, 3);
  e.writeUInt16LE(1, 4);
  e.writeUInt16LE(32, 6);
  e.writeUInt32LE(png.length, 8);
  e.writeUInt32LE(offset, 12);
  offset += png.length;
  entries.push(e);
  images.push(png);
}
writeFileSync(join(root, "favicon.ico"), Buffer.concat([header, ...entries, ...images]));
console.log("favicon.ico written");
