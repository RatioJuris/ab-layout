/*
File: rj-pb-errors.js
Path: /web/word/rj-pb-errors.js
Project: AB Layout (Advocate Benefit Layout)
Developed by PrajnaBytes International Private Limited and RatioJuris
Copyright (C) 2026 PrajnaBytes International Private Limited and RatioJuris
SPDX-License-Identifier: GPL-3.0-or-later
Additional terms under GPLv3 section 7 apply (attribution and names) - see NOTICE.

Turns Office errors into messages an advocate can act on. Error details are
logged without any document text.
*/

/**
 * @param {unknown} err
 * @returns {{ title: string, action: string, code: string }}
 */
export function friendlyError(err) {
  const e = /** @type {any} */ (err) || {};
  const code = String(e.code || e.name || "Unknown");
  const msg = String(e.message || "");

  if (code === "AccessDenied" || /read-?only|protected|locked/i.test(msg)) {
    return {
      code,
      title: "Word did not allow the change.",
      action:
        "The document may be read-only, protected, or open in Reading View. Click 'Enable Editing' or 'Edit Document', save, and try again. Locked parts of a form cannot be changed."
    };
  }
  if (code === "RequestPayloadSizeLimitExceeded" || code === "ResponsePayloadSizeLimitExceeded") {
    return {
      code,
      title: "The document is too large to process in one go.",
      action: "Select a part of the document (for example 50 pages) and use the selection option, or use Word for Windows."
    };
  }
  if (code === "ItemNotFound" || code === "InvalidObjectPath") {
    return {
      code,
      title: "The document changed while AB Layout was working.",
      action: "Please wait until you have stopped typing, then run Check Document again."
    };
  }
  if (code === "ApiNotFound" || code === "NotImplemented") {
    return {
      code,
      title: "This version of Word does not support this action.",
      action: "Update Office, or try Word for the web."
    };
  }
  if (code === "InvalidArgument") {
    return {
      code,
      title: "Word rejected one of the settings.",
      action: "Check the profile values (for example a font name that is not installed) and try again."
    };
  }
  if (/Failed to fetch|NetworkError|network/i.test(msg)) {
    return {
      code: "Network",
      title: "AB Layout could not load a file it needs.",
      action: "Check your internet connection and reopen the AB Layout panel."
    };
  }
  return {
    code,
    title: "Word reported an unexpected problem.",
    action: "Save your document, close and reopen the AB Layout panel, then try again. Your document text has not been sent anywhere."
  };
}

/**
 * Console logging that never includes document content.
 * @param {string} where
 * @param {unknown} err
 */
export function logError(where, err) {
  const e = /** @type {any} */ (err) || {};
  const debug = e.debugInfo ? { code: e.debugInfo.code, errorLocation: e.debugInfo.errorLocation } : undefined;
  console.error(`[AB Layout] ${where}:`, e.code || e.name || "Error", debug || "");
}
