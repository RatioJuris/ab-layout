/*
File: rj-pb-attribution.js
Path: /web/core/rj-pb-attribution.js
Project: AB Layout (Advocate Benefit Layout)
Developed by PrajnaBytes International Private Limited and RatioJuris
Copyright (C) 2026 PrajnaBytes International Private Limited and RatioJuris
SPDX-License-Identifier: GPL-3.0-or-later
Additional terms under GPLv3 section 7 apply (attribution and names) - see NOTICE.

Author attribution shown to users (the "Appropriate Legal Notices" of GPLv3).
Under the additional terms in NOTICE (GPLv3 section 7(b)), this attribution
must be preserved in all copies and in modified versions, and the add-in's
interface must continue to display it.
*/

export const ATTRIBUTION = Object.freeze({
  product: "AB Layout",
  productFull: "Advocate Benefit Layout",
  developers: "PrajnaBytes International Private Limited and RatioJuris",
  developedBy: "Developed by PrajnaBytes International Private Limited and RatioJuris",
  copyright: "Copyright (C) 2026 PrajnaBytes International Private Limited and RatioJuris",
  license: "GPL-3.0-or-later",
  licenseText: "Free software under the GNU General Public License v3 or later. Comes with ABSOLUTELY NO WARRANTY.",
  sourceUrl: "https://github.com/RatioJuris/ab-layout",
  version: "4.0.0"
});

/** The single line the task pane footer must show. */
export function attributionLine() {
  return `${ATTRIBUTION.product} v${ATTRIBUTION.version} \u00b7 ${ATTRIBUTION.developedBy}`;
}
