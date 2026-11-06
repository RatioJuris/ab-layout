/*
File: rj-pb-site.js
Path: /site/rj-pb-site.js
Project: AB Layout (Advocate Benefit Layout) - project website
Developed by PrajnaBytes International Private Limited and RatioJuris
Copyright (C) 2026 PrajnaBytes International Private Limited and RatioJuris
SPDX-License-Identifier: GPL-3.0-or-later
Additional terms under GPLv3 section 7 apply (attribution and names) - see NOTICE.

Website behaviour. The live converter uses the same tested module as the
add-in and runs entirely in the visitor's browser - nothing is uploaded.
*/

import { krutiToUnicode, unicodeToKruti, looksFullyConverted } from "../web/core/rj-pb-krutidev.js";

const $ = (/** @type {string} */ sel) => /** @type {HTMLElement} */ (document.querySelector(sel));
const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

/* ===== THEME ===== */

const themeBtn = /** @type {HTMLButtonElement} */ ($("#themeBtn"));
function setTheme(/** @type {string} */ t) {
  document.documentElement.setAttribute("data-theme", t);
  themeBtn.setAttribute("aria-label", t === "dark" ? "Switch to light theme" : "Switch to dark theme");
  themeBtn.textContent = t === "dark" ? "\u2600" : "\u263E";
}
setTheme(localStorage.getItem("theme") || "light");
themeBtn.addEventListener("click", () => {
  const next = document.documentElement.getAttribute("data-theme") === "dark" ? "light" : "dark";
  localStorage.setItem("theme", next);
  setTheme(next);
});

/* ===== HERO BEFORE / AFTER ===== */

const stage = $("#stage");
const btnBefore = /** @type {HTMLButtonElement} */ ($("#btnBefore"));
const btnAfter = /** @type {HTMLButtonElement} */ ($("#btnAfter"));
let auto = !reduceMotion;
function show(/** @type {boolean} */ clean) {
  stage.classList.toggle("clean", clean);
  btnBefore.setAttribute("aria-pressed", String(!clean));
  btnAfter.setAttribute("aria-pressed", String(clean));
}
btnBefore.addEventListener("click", () => { auto = false; show(false); });
btnAfter.addEventListener("click", () => { auto = false; show(true); });
show(reduceMotion);
if (auto) {
  setInterval(() => { if (auto) show(!stage.classList.contains("clean")); }, 3200);
}

/* ===== INSTALL (manifest download) ===== */

document.querySelectorAll("[data-download-manifest]").forEach((el) =>
  el.addEventListener("click", async (ev) => {
    ev.preventDefault();
    try {
      const res = await fetch("manifest.xml", { cache: "no-store" });
      if (!res.ok) throw new Error(String(res.status));
      const url = URL.createObjectURL(await res.blob());
      const a = document.createElement("a");
      a.href = url;
      a.download = "manifest.xml";
      a.click();
      URL.revokeObjectURL(url);
    } catch {
      window.location.href = "manifest.xml";
    }
  })
);

/* ===== PAGE LAYOUTS (from the add-in's own data file) ===== */

(async function loadLayouts() {
  const box = $("#layouts");
  try {
    const res = await fetch("layouts/layouts.json", { cache: "no-cache" });
    if (!res.ok) throw new Error("fetch");
    const data = await res.json();
    $("#version").textContent = "Version " + (data._meta?.version || "");
    box.textContent = "";
    for (const l of data.layouts || []) {
      const p = data.presets[l.preset];
      if (!p) continue;
      const m = p.multiPage ? p.otherPages : p.margins;
      const w = 34;
      const h = Math.round((w * p.height) / p.width);
      const card = document.createElement("div");
      card.className = "layout-card";
      const paper = document.createElement("div");
      paper.className = "paper";
      paper.style.height = h + "px";
      const inner = document.createElement("i");
      const s = w / p.width;
      inner.style.left = m.left * s + "px";
      inner.style.right = m.right * s + "px";
      inner.style.top = (p.multiPage ? p.firstPage.top : m.top) * s + "px";
      inner.style.bottom = m.bottom * s + "px";
      paper.appendChild(inner);
      const text = document.createElement("div");
      const name = document.createElement("b");
      name.textContent = l.name;
      const size = document.createElement("small");
      const cm = (/** @type {number} */ pt) => (pt / 28.3465).toFixed(1);
      size.textContent = `${cm(p.width)} \u00d7 ${cm(p.height)} cm`;
      text.append(name, size);
      card.append(paper, text);
      box.appendChild(card);
    }
  } catch {
    box.textContent = "Page layouts could not be loaded.";
  }
})();

/* ===== GITHUB STATS ===== */

(async function repo() {
  try {
    const r = await fetch("https://api.github.com/repos/RatioJuris/ab-layout");
    const j = await r.json();
    if (typeof j.stargazers_count === "number") {
      $("#repoStats").textContent = `\u2605 ${j.stargazers_count} on GitHub \u00b7 updated ${new Date(j.pushed_at).toLocaleDateString("en-IN")}`;
    }
  } catch {
    /* optional */
  }
})();

/* ===== LIVE CONVERTER ===== */

const input = /** @type {HTMLTextAreaElement} */ ($("#convIn"));
const output = /** @type {HTMLOutputElement} */ ($("#convOut"));
const inLabel = $("#convInLabel");
const outLabel = $("#convOutLabel");
const msg = $("#convMsg");
let toUnicode = true;

const SAMPLE_KRUTI = "ekuuh; U;k;ky; ds le{k ;kfpdk lknj izLrqr gSA";
const SAMPLE_UNICODE = "माननीय न्यायालय के समक्ष याचिका सादर प्रस्तुत है।";

function convert() {
  const text = input.value;
  let skipped = 0;
  const out = text
    .split(/(\s+)/)
    .map((tok) => {
      if (!tok.trim()) return tok;
      if (toUnicode) {
        const u = krutiToUnicode(tok);
        if (!looksFullyConverted(u)) { skipped++; return tok; }
        return u;
      }
      if (!/[\u0900-\u097f]/.test(tok)) { skipped++; return tok; }
      const k = unicodeToKruti(tok);
      if (k === null) { skipped++; return tok; }
      return k;
    })
    .join("");
  output.value = out;
  output.textContent = out;
  msg.textContent = skipped
    ? `${skipped} word(s) left unchanged because they could not be converted exactly.`
    : text.trim() ? "Converted in your browser \u2014 nothing was uploaded." : "";
}

function setDirection(/** @type {boolean} */ u) {
  toUnicode = u;
  inLabel.textContent = u ? "Kruti Dev text" : "Unicode Hindi";
  outLabel.textContent = u ? "Unicode Hindi" : "Kruti Dev characters";
  input.classList.toggle("kruti", u);
  output.classList.toggle("kruti", !u);
  input.setAttribute("lang", u ? "en" : "hi");
  output.setAttribute("lang", u ? "hi" : "en");
  convert();
}

$("#swapBtn").addEventListener("click", () => {
  const current = output.value;
  input.value = current || (toUnicode ? SAMPLE_UNICODE : SAMPLE_KRUTI);
  setDirection(!toUnicode);
});
$("#sampleBtn").addEventListener("click", () => {
  input.value = toUnicode ? SAMPLE_KRUTI : SAMPLE_UNICODE;
  convert();
});
$("#copyBtn").addEventListener("click", async () => {
  try {
    await navigator.clipboard.writeText(output.value);
    msg.textContent = "Copied.";
  } catch {
    msg.textContent = "Select the result and press Ctrl+C to copy.";
  }
});
input.addEventListener("input", convert);
input.value = SAMPLE_KRUTI;
setDirection(true);

/* ===== REVEAL ON SCROLL ===== */

if (!reduceMotion && "IntersectionObserver" in window) {
  const io = new IntersectionObserver(
    (entries) => entries.forEach((e) => { if (e.isIntersecting) { e.target.classList.add("in"); io.unobserve(e.target); } }),
    { threshold: 0.12 }
  );
  document.querySelectorAll(".reveal").forEach((el) => io.observe(el));
} else {
  document.querySelectorAll(".reveal").forEach((el) => el.classList.add("in"));
}

$("#year").textContent = String(new Date().getFullYear());
