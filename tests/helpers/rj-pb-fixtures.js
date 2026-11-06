// SPDX-License-Identifier: GPL-3.0-or-later
// Additional terms under GPLv3 section 7 apply (attribution and names) - see NOTICE.
// Developed by PrajnaBytes International Private Limited and RatioJuris
// Copyright (C) 2026 PrajnaBytes International Private Limited and RatioJuris

// A synthetic writ petition with the kind of mixed formatting that comes from
// copying between old documents. All names and facts are fictitious.

/** @returns {import("./rj-pb-fake-word.js").FakeParagraphInit[]} */
export function mixedPetition() {
  const TNR = (/** @type {number} */ size) => ({ name: "Times New Roman", size });
  return [
    { text: "IN THE HIGH COURT OF JUDICATURE AT ALLAHABAD", alignment: "Centered", font: { name: "Arial", size: 16 } },
    { text: "WRIT PETITION (CIVIL) NO. ______ OF 2026", alignment: "Centered", font: TNR(14) },
    { text: "", alignment: "Left" },
    { text: "Ram Kumar Sharma, S/o Shri Mohan Lal, R/o Village Rampur, District Kanpur\t...Petitioner", alignment: "Left", font: TNR(14) },
    { text: "VERSUS", alignment: "Centered", font: TNR(14) },
    { text: "State of Uttar Pradesh through Principal Secretary\t...Respondent", alignment: "Left", font: TNR(14) },
    { text: "", alignment: "Left" },
    { text: "", alignment: "Left" },
    { text: "", alignment: "Left" },
    { text: "1. That the petitioner is a law-abiding citizen and is filing the present petition under Article 226 of the Constitution of India on 12.05.2026.", alignment: "Justified", lineSpacing: 18, spaceAfter: 6, firstLineIndent: 36, font: TNR(14) },
    { text: "2. That the respondent issued an order dated 01.04.2026 under Section 4 of the U.P. Land Revenue Act, 1901 without hearing the petitioner.", alignment: "Left", lineSpacing: 24, spaceAfter: 0, firstLineIndent: 0, font: { name: "Calibri", size: 11 } },
    { text: "4. That the impugned order is arbitrary and violates the principles of natural justice as held in Maneka Gandhi v. Union of India, (1978) 1 SCC 248.", alignment: "Justified", lineSpacing: 18, spaceAfter: 6, firstLineIndent: 36, font: { name: null, size: null } },
    { text: "\"Audi alteram partem is a highly effective tool devised by the courts to ensure fairness in administrative action.\"", alignment: "Justified", leftIndent: 72, rightIndent: 36, lineSpacing: 18, font: TNR(14) },
    { text: "5. That the petitioner has no other alternative remedy and is therefore approaching this Hon'ble Court.", alignment: "Justified", lineSpacing: 18, spaceAfter: 6, firstLineIndent: 36, font: TNR(14), words: undefined },
    { text: ";kfpdkdrkZ dh vksj ls fuosnu", alignment: "Justified", lineSpacing: 18, font: { name: "Kruti Dev 010", size: 14 } },
    { text: "याचिकाकर्ता की ओर से निवेदन किया जाता है कि आदेश निरस्त किया जाए।", alignment: "Justified", lineSpacing: 18, font: { name: "Mangal", size: 14 } },
    { text: "Annexure P-1", tableNestingLevel: 1, font: { name: "Arial", size: 10 } },
    { text: "Copy of the order dated 01.04.2026", tableNestingLevel: 1, font: { name: "Arial", size: 10 } },
    { text: "quash the impugned order dated 01.04.2026;", isListItem: true, leftIndent: 36, firstLineIndent: -18, font: TNR(12) },
    { text: "Place: Allahabad", alignment: "Left", font: TNR(14) },
    { text: "Date: dd/mm/yyyy", alignment: "Left", font: TNR(14) },
    { text: "Through Counsel", alignment: "Right", font: TNR(14) },
    { text: "", alignment: "Left" }
  ];
}

/** Font names typed in a mixed paragraph's XML (paragraph 11 above). */
export const MIXED_PARAGRAPH_OOXML =
  '<pkg:package><pkg:part pkg:name="/word/document.xml"><w:p><w:r><w:rPr><w:rFonts w:ascii="Times New Roman" w:hAnsi="Times New Roman"/></w:rPr><w:t>4. That</w:t></w:r><w:r><w:rPr><w:rFonts w:ascii="Book Antiqua" w:hAnsi="Book Antiqua"/></w:rPr><w:t> the impugned</w:t></w:r></w:p></pkg:part>' +
  '<pkg:part pkg:name="/word/fontTable.xml"><w:font w:name="Kruti Dev 010"/></pkg:part></pkg:package>';
