// SPDX-License-Identifier: GPL-3.0-or-later
// Additional terms under GPLv3 section 7 apply (attribution and names) - see NOTICE.
// Developed by PrajnaBytes International Private Limited and RatioJuris
// Copyright (C) 2026 PrajnaBytes International Private Limited and RatioJuris

// Browser UI test: loads the real web/taskpane.html in Microsoft Edge
// (the engine behind Word's WebView2), replaces office.js with an in-memory
// fake Word document, and clicks through every tab.
// Run: npm run test:ui   (needs Microsoft Edge or set EDGE_PATH)
// This proves the task pane's own code works; it is not a test inside Word.

import { test, before, after } from "node:test";
import assert from "node:assert/strict";
import { existsSync, readFileSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import puppeteer from "puppeteer-core";

const root = join(dirname(fileURLToPath(import.meta.url)), "..", "..");
const EDGE = [
  process.env.EDGE_PATH,
  "C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe",
  "C:\\Program Files\\Microsoft\\Edge\\Application\\msedge.exe",
  "/usr/bin/microsoft-edge",
  "/Applications/Microsoft Edge.app/Contents/MacOS/Microsoft Edge"
].find((p) => p && existsSync(p));

const PORT = 3917;
/** @type {import("node:http").Server} */
let server;
/** @type {import("puppeteer-core").Browser} */
let browser;

before(async () => {
  process.argv.push(`--port=${PORT}`);
  ({ server } = /** @type {any} */ (await import("../../scripts/serve.mjs")));
  if (!EDGE) return;
  browser = await puppeteer.launch({ executablePath: EDGE, headless: true, args: ["--no-first-run"] });
});

after(async () => {
  await browser?.close();
  server?.close();
});

/**
 * @param {"PC" | "OfficeOnline"} platform
 */
async function openPane(platform) {
  const page = await browser.newPage();
  await page.setViewport({ width: 340, height: 900 });
  /** @type {string[]} */
  const errors = [];
  page.on("pageerror", (e) => errors.push(String(e)));
  page.on("console", (m) => { if (m.type() === "error") errors.push(m.text()); });
  await page.evaluateOnNewDocument((p) => { /** @type {any} */ (window).__abPlatform = p; }, platform);
  await page.setRequestInterception(true);
  const fakeOffice = readFileSync(join(root, "tests", "e2e", "rj-pb-fake-office.js"), "utf8");
  page.on("request", (req) => {
    if (req.url().startsWith("https://appsforoffice.microsoft.com/")) {
      req.respond({ status: 200, contentType: "text/javascript", body: fakeOffice });
    } else req.continue();
  });
  await page.goto(`http://localhost:${PORT}/web/taskpane.html`, { waitUntil: "networkidle0" });
  return { page, errors };
}

/** @param {import("puppeteer-core").Page} page @param {string} sel */
const text = (page, sel) => page.$eval(sel, (e) => (e.textContent || "").trim());

/** @param {import("puppeteer-core").Page} page @param {string} id */
async function waitStatus(page, id, re) {
  await page.waitForFunction((i, src) => new RegExp(src).test(document.getElementById(i)?.textContent || ""), { timeout: 10000 }, id, re.source);
}

test("task pane works end to end in Edge (desktop Word capabilities)", { skip: !EDGE && "Microsoft Edge not found" }, async () => {
  const { page, errors } = await openPane("PC");

  assert.equal(await text(page, "#platform"), "Word for Windows");
  assert.match(await text(page, "#rj-pb-attribution"), /Developed by PrajnaBytes International Private Limited and RatioJuris/);

  // CHECK
  await page.click("#inspectBtn");
  await waitStatus(page, "checkStatus", /Check complete/);
  const titles = await page.$$eval(".finding .title", (els) => els.map((e) => e.textContent));
  assert.ok(titles.includes("Paragraph numbers may be wrong"), titles.join(" | "));
  assert.ok(titles.includes("Comments in the document"));
  assert.equal(await page.evaluate(() => /** @type {any} */ (window).__xss), undefined, "document text is never run as HTML");
  // "Show" selects the paragraph in Word.
  const showIndex = await page.$$eval(".finding", (els) => els.findIndex((e) => /Paragraph numbers/.test(e.textContent || "")));
  const buttons = await page.$$(".finding");
  await (await buttons[showIndex].$("button.link"))?.click();
  await page.waitForFunction(() => /** @type {any} */ (window).__word.log.selected === 11);

  // CLEAN
  await page.click("#tab-clean");
  await page.select("#profileSelect", "petition");
  await page.click("#previewBtn");
  await page.waitForSelector("#preview:not([hidden])");
  assert.match(await text(page, "#preview"), /paragraphs will be reformatted/);
  assert.match(await text(page, "#preview"), /keep their own font/);
  await page.click("#applyBtn");
  await page.waitForSelector("#result:not([hidden])");
  assert.match(await text(page, "#result"), /Text check passed/);
  assert.equal(await page.evaluate(() => /** @type {any} */ (window).__word.paragraphs()[10].font.name), "Times New Roman");
  await page.click("#restoreBtn");
  await waitStatus(page, "cleanStatus", /restored/);
  assert.equal(await page.evaluate(() => /** @type {any} */ (window).__word.paragraphs()[10].font.name), "Calibri");

  // HINDI
  await page.click("#tab-hindi");
  await page.click('input[name="hindiScope"][value="document"]');
  await page.click("#hindiPreviewBtn");
  await page.waitForSelector("#hindiPreview:not([hidden])");
  assert.match(await text(page, "#hindiPreview"), /Kruti Dev word\(s\) will be converted/);
  await page.click("#hindiApplyBtn");
  await page.waitForSelector("#hindiResult:not([hidden])");
  const hindi = await page.evaluate(() => /** @type {any} */ (window).__word.paragraphs().map((/** @type {any} */ p) => p.text));
  assert.ok(hindi.includes("Hindi: न्यायालय में"), hindi.slice(-2).join(" | "));

  // PAGE
  await page.click("#tab-page");
  await page.waitForFunction(() => document.querySelectorAll("#layoutSelect option").length >= 6);
  assert.equal(await page.$eval("#pageUnsupported", (e) => /** @type {HTMLElement} */ (e).hidden), true);
  await page.click("#pageApplyBtn");
  await waitStatus(page, "pageStatus", /Applied/);

  // PROFILES
  await page.click("#tab-profiles");
  await page.$eval("#pfName", (e) => { /** @type {HTMLInputElement} */ (e).value = ""; });
  await page.type("#pfName", "Chamber 13pt");
  await page.$eval("#pfSize", (e) => { /** @type {HTMLInputElement} */ (e).value = "13"; });
  await page.click('#profileForm button[type="submit"]');
  await page.waitForFunction(() => /Saved/.test(document.getElementById("profileErrors")?.textContent || ""));
  const selected = await page.$eval("#profileSelect", (e) => /** @type {HTMLSelectElement} */ (e).selectedOptions[0].textContent);
  assert.equal(selected, "Chamber 13pt");

  // Invalid profile shows plain errors.
  await page.$eval("#pfSize", (e) => { /** @type {HTMLInputElement} */ (e).value = "500"; });
  await page.click('#profileForm button[type="submit"]');
  await page.waitForFunction(() => /between 6 and 72/.test(document.getElementById("profileErrors")?.textContent || ""));

  // Keyboard navigation between tabs.
  await page.focus("#tab-profiles");
  await page.keyboard.press("Home");
  assert.equal(await page.$eval("#tab-check", (e) => e.getAttribute("aria-selected")), "true");
  await page.keyboard.press("ArrowRight");
  assert.equal(await page.$eval("#panel-clean", (e) => /** @type {HTMLElement} */ (e).hidden), false);

  assert.deepEqual(errors, []);
  await page.close();
});

test("Word for the web: page layout is disabled with an explanation", { skip: !EDGE && "Microsoft Edge not found" }, async () => {
  const { page, errors } = await openPane("OfficeOnline");
  assert.equal(await text(page, "#platform"), "Word for the web");
  await page.click("#tab-page");
  await page.waitForFunction(() => document.querySelectorAll("#layoutSelect option").length >= 6);
  assert.equal(await page.$eval("#pageUnsupported", (e) => /** @type {HTMLElement} */ (e).hidden), false);
  assert.match(await text(page, "#pageUnsupported"), /Layout > Margins/);
  assert.equal(await page.$eval("#pageApplyBtn", (e) => /** @type {HTMLButtonElement} */ (e).disabled), true);

  await page.click("#tab-check");
  await page.click("#inspectBtn");
  await waitStatus(page, "checkStatus", /Check complete/);
  assert.match(await text(page, "#checkSummary"), /Paper size could not be checked/);
  assert.deepEqual(errors, []);
  await page.close();
});
