/*
File: rj-pb-dom.js
Path: /web/ui/rj-pb-dom.js
Project: AB Layout (Advocate Benefit Layout)
Developed by PrajnaBytes International Private Limited and RatioJuris
Copyright (C) 2026 PrajnaBytes International Private Limited and RatioJuris
SPDX-License-Identifier: GPL-3.0-or-later
Additional terms under GPLv3 section 7 apply (attribution and names) - see NOTICE.

Small DOM helpers. All text is inserted with textContent (never innerHTML),
so document content can never be interpreted as markup.
*/

/**
 * @template {HTMLElement} T
 * @param {string} id
 * @returns {T}
 */
export function byId(id) {
  const e = document.getElementById(id);
  if (!e) throw new Error(`Missing element #${id}`);
  return /** @type {T} */ (e);
}

/**
 * Creates an element. Children may be strings (inserted as text) or nodes.
 * @param {string} tag
 * @param {Record<string, string> | null} [attrs]
 * @param {Array<Node | string | null | undefined | false>} [children]
 */
export function el(tag, attrs, children = []) {
  const e = document.createElement(tag);
  if (attrs) for (const [k, v] of Object.entries(attrs)) e.setAttribute(k, v);
  for (const c of children) {
    if (c === null || c === undefined || c === false) continue;
    e.appendChild(typeof c === "string" ? document.createTextNode(c) : c);
  }
  return e;
}

/**
 * @param {HTMLElement} node
 * @param {Array<Node | string | null | undefined | false>} children
 */
export function replaceChildren(node, children) {
  while (node.firstChild) node.removeChild(node.firstChild);
  for (const c of children) {
    if (c === null || c === undefined || c === false) continue;
    node.appendChild(typeof c === "string" ? document.createTextNode(c) : c);
  }
}

/**
 * @param {string} id
 * @param {string} message
 * @param {"info" | "success" | "error"} [type]
 */
export function setStatus(id, message, type = "info") {
  const e = byId(id);
  e.textContent = message;
  e.className = "status" + (type === "info" ? "" : " " + type);
}

/**
 * Accessible tabs (arrow keys, Home/End).
 * @param {(tabId: string) => void} [onChange]
 */
export function initTabs(onChange) {
  const tabs = /** @type {HTMLButtonElement[]} */ (Array.from(document.querySelectorAll('[role="tab"]')));
  const select = (/** @type {HTMLButtonElement} */ tab, focus = true) => {
    for (const t of tabs) {
      const on = t === tab;
      t.setAttribute("aria-selected", String(on));
      t.tabIndex = on ? 0 : -1;
      const panel = byId(/** @type {string} */ (t.getAttribute("aria-controls")));
      panel.hidden = !on;
    }
    if (focus) tab.focus();
    onChange?.(tab.id);
  };
  tabs.forEach((t, i) => {
    t.addEventListener("click", () => select(t));
    t.addEventListener("keydown", (ev) => {
      let next = -1;
      if (ev.key === "ArrowRight") next = (i + 1) % tabs.length;
      else if (ev.key === "ArrowLeft") next = (i - 1 + tabs.length) % tabs.length;
      else if (ev.key === "Home") next = 0;
      else if (ev.key === "End") next = tabs.length - 1;
      if (next >= 0) {
        ev.preventDefault();
        select(tabs[next]);
      }
    });
  });
  return { select: (/** @type {string} */ id) => select(byId(id), false) };
}

/**
 * Runs an async action with its button disabled and errors reported.
 * @param {HTMLButtonElement[]} buttons
 * @param {() => Promise<void>} action
 */
export async function busy(buttons, action) {
  const prev = buttons.map((b) => b.disabled);
  buttons.forEach((b) => (b.disabled = true));
  document.body.setAttribute("aria-busy", "true");
  try {
    await action();
  } finally {
    buttons.forEach((b, i) => (b.disabled = prev[i]));
    document.body.removeAttribute("aria-busy");
  }
}
