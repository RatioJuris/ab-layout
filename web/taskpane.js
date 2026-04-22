Office.onReady(() => {
  loadLayouts();
});

const LAYOUTS_URL =
"https://isrgrajan.github.io/ab-layout/layouts/layouts.json?v=1";

let states = [];
let currentLayout = null;
let previousLayout = null;

function setStatus(msg) {
  document.getElementById("status").innerText = msg;
}

async function loadLayouts() {
  try {
    setStatus("Loading layouts...");

    const res = await fetch(LAYOUTS_URL);
    const data = await res.json();

    states = data.states || [];

    const stateSelect = document.getElementById("stateSelect");
    stateSelect.innerHTML = "";

    states.forEach((s, i) => {
      const opt = document.createElement("option");
      opt.value = i;
      opt.textContent = s.name;
      stateSelect.appendChild(opt);
    });

    stateSelect.onchange = loadCourts;

    loadCourts();
    setStatus("Ready ✅");

  } catch (e) {
    console.error(e);
    setStatus("❌ Failed to load layouts");
  }
}

function loadCourts() {
  const stateIndex = document.getElementById("stateSelect").value;
  const courtSelect = document.getElementById("courtSelect");

  courtSelect.innerHTML = "";

  if (!states[stateIndex]) return;

  const courts = states[stateIndex].courts || [];

  courts.forEach((c, i) => {
    const opt = document.createElement("option");
    opt.value = i;
    opt.textContent = c.name;
    courtSelect.appendChild(opt);
  });
}

async function applySelected() {
  const stateIndex = document.getElementById("stateSelect").value;
  const courtIndex = document.getElementById("courtSelect").value;

  if (!states[stateIndex]) return;

  const layout = states[stateIndex].courts[courtIndex];

  if (!layout) return;

  if (currentLayout && currentLayout.id === layout.id) {
    setStatus("Already applied ✔");
    return;
  }

  await Word.run(async (context) => {

    const sections = context.document.sections;
    sections.load("items/pageSetup");

    await context.sync();

    if (sections.items.length === 0) return;

    const first = sections.items[0].pageSetup;

    previousLayout = {
      width: first.pageWidth / 72,
      height: first.pageHeight / 72,
      margins: {
        top: first.topMargin / 72,
        bottom: first.bottomMargin / 72,
        left: first.leftMargin / 72,
        right: first.rightMargin / 72
      }
    };

    sections.items.forEach(sec => {
      sec.pageSetup.pageWidth = layout.width * 72;
      sec.pageSetup.pageHeight = layout.height * 72;

      sec.pageSetup.topMargin = layout.margins.top * 72;
      sec.pageSetup.bottomMargin = layout.margins.bottom * 72;
      sec.pageSetup.leftMargin = layout.margins.left * 72;
      sec.pageSetup.rightMargin = layout.margins.right * 72;
    });

    await context.sync();
  });

  currentLayout = layout;
  setStatus("✅ Applied: " + layout.name);
}

async function undoLayout() {
  if (!previousLayout) {
    setStatus("⚠ No previous layout");
    return;
  }

  await Word.run(async (context) => {

    const sections = context.document.sections;
    sections.load("items");

    await context.sync();

    sections.items.forEach(sec => {
      sec.pageSetup.pageWidth = previousLayout.width * 72;
      sec.pageSetup.pageHeight = previousLayout.height * 72;

      sec.pageSetup.topMargin = previousLayout.margins.top * 72;
      sec.pageSetup.bottomMargin = previousLayout.margins.bottom * 72;
      sec.pageSetup.leftMargin = previousLayout.margins.left * 72;
      sec.pageSetup.rightMargin = previousLayout.margins.right * 72;
    });

    await context.sync();
  });

  currentLayout = null;
  setStatus("↩ Layout restored");
}
