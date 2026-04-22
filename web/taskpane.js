/*
AB Layout (Advocate Benefit Layout)
Version: 1.0.0

Description:
Production-ready layout engine for Microsoft Word Add-in.

Author:
Bee Isrg Rajan
*/

let isOfficeReady = false;

Office.onReady((info) => {
  if (info.host === Office.HostType.Word) {
    isOfficeReady = true;
    loadLayouts();
  } else {
    setStatus("Open inside Microsoft Word");
  }
});

const LAYOUTS_URL =
  "https://isrgrajan.github.io/ab-layout/layouts/layouts.json?v=1.0.1";

let dataStore = {};
let currentLayout = null;
let previousLayout = null;

/* ===== Utils ===== */

function setStatus(message) {
  const el = document.getElementById("status");
  if (el) el.innerText = message;
}

function toPoints(value, unit = "inch") {
  if (value === undefined || value === null) return 0;

  unit = (unit || "inch").toLowerCase().trim();

  if (unit === "cm") return value * 28.3465;

  // FORCE inch default
  return value * 72;
}

function resolveUnit(layout) {
  const unit = (layout?.unit || dataStore?._meta?.unit || "inch")
    .toLowerCase()
    .trim();

  if (unit === "cm") return "cm";
  return "inch"; // force everything else to inch
}

/* ===== Load Layouts ===== */

async function loadLayouts() {
  try {
    setStatus("Loading layouts...");

    const response = await fetch(LAYOUTS_URL);
    if (!response.ok) throw new Error("Failed to fetch layouts");

    dataStore = await response.json();

    populateLayouts();

    document.getElementById("applyBtn").disabled = false;

    setStatus("Ready");
  } catch (error) {
    console.error(error);
    setStatus("Failed to load layouts");
  }
}

/* ===== Populate UI ===== */

function populateLayouts() {
  const select = document.getElementById("courtSelect");
  select.innerHTML = "";

  (dataStore.layouts || []).forEach((layout, index) => {
    const option = document.createElement("option");
    option.value = index;
    option.textContent = layout.name;
    select.appendChild(option);
  });
}

/* ===== Layout Resolution ===== */

function getSelectedLayout() {
  const index = document.getElementById("courtSelect").value;

  const item = dataStore.layouts[index];
  if (!item) return null;

  const preset = dataStore.presets?.[item.preset];
  if (!preset) return null;

  return {
    id: item.id,
    name: item.name,
    ...preset
  };
}

/* ===== Apply Layout ===== */

async function applySelected() {
  if (!isOfficeReady) {
    setStatus("Open inside Microsoft Word");
    return;
  }

  const layout = getSelectedLayout();
  if (!layout) return;

  if (currentLayout && currentLayout.id === layout.id) {
    setStatus("Already applied");
    return;
  }

  const unit = resolveUnit(layout);

  try {
    await Word.run(async (context) => {
      const sections = context.document.sections;
      sections.load("items/pageSetup");

      await context.sync();

      if (!sections.items.length) return;

      /* Save previous */
      const first = sections.items[0].pageSetup;

      previousLayout = {
        width: first.pageWidth,
        height: first.pageHeight,
        top: first.topMargin,
        bottom: first.bottomMargin,
        left: first.leftMargin,
        right: first.rightMargin
      };

      sections.items.forEach((section, index) => {
        let margins = layout.margins;

        if (layout.multiPage) {
          margins = index === 0 ? layout.firstPage : layout.otherPages;
        }

        // SAFETY: ensure margins exist
        if (!margins) return;

        section.pageSetup.pageWidth = toPoints(layout.width, unit);
        section.pageSetup.pageHeight = toPoints(layout.height, unit);

        section.pageSetup.topMargin = toPoints(margins.top, unit);
        section.pageSetup.bottomMargin = toPoints(margins.bottom, unit);
        section.pageSetup.leftMargin = toPoints(margins.left, unit);
        section.pageSetup.rightMargin = toPoints(margins.right, unit);
      });

      await context.sync();
    });

    currentLayout = layout;
    setStatus("Applied: " + layout.name);

  } catch (error) {
    console.error(error);
    setStatus("Failed to apply layout");
  }
}

/* ===== Undo Layout ===== */

async function undoLayout() {
  if (!previousLayout) {
    setStatus("No previous layout");
    return;
  }

  try {
    await Word.run(async (context) => {
      const sections = context.document.sections;
      sections.load("items");

      await context.sync();

      sections.items.forEach((section) => {
        section.pageSetup.pageWidth = previousLayout.width;
        section.pageSetup.pageHeight = previousLayout.height;

        section.pageSetup.topMargin = previousLayout.top;
        section.pageSetup.bottomMargin = previousLayout.bottom;
        section.pageSetup.leftMargin = previousLayout.left;
        section.pageSetup.rightMargin = previousLayout.right;
      });

      await context.sync();
    });

    currentLayout = null;
    setStatus("Layout restored");

  } catch (error) {
    console.error(error);
    setStatus("Undo failed");
  }
}
