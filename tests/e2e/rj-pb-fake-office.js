// SPDX-License-Identifier: GPL-3.0-or-later
// Additional terms under GPLv3 section 7 apply (attribution and names) - see NOTICE.
// Developed by PrajnaBytes International Private Limited and RatioJuris
// Copyright (C) 2026 PrajnaBytes International Private Limited and RatioJuris

// Served instead of Microsoft's office.js during the browser UI test only.
// Provides Office/Word globals backed by the in-memory fake Word document.
(function () {
  var platform = window.__abPlatform || "PC";
  // Absolute URLs: this script is served under the office.js CDN address.
  var base = window.location.origin;
  var ready = Promise.all([import(base + "/tests/helpers/rj-pb-fake-word.js"), import(base + "/tests/helpers/rj-pb-fixtures.js")]).then(function (mods) {
    var fake = mods[0];
    var fx = mods[1];
    var inits = fx.mixedPetition();
    inits[11].ooxml = fx.MIXED_PARAGRAPH_OOXML;
    inits.push({ text: "Note ____ <img src=x onerror=\"window.__xss=1\">", alignment: "Left", font: { name: "Times New Roman", size: 14 } });
    inits.push({ text: "", words: [{ text: "Hindi: ", font: "Times New Roman" }, { text: "U;k;ky; ", font: "Kruti Dev 010" }, { text: "esa", font: "Kruti Dev 010" }] });
    var word = fake.createFakeWord(inits, { comments: 1 });
    var office = fake.fakeOffice(platform === "OfficeOnline" ? { WordApi: "1.9" } : { WordApi: "1.9", WordApiDesktop: "1.3" }, platform);
    window.__word = word;
    window.Word = { run: word.run };
    window.Office.context = office.context;
  });
  window.Office = {
    HostType: { Word: "Word" },
    context: null,
    onReady: function (cb) {
      return ready.then(function () {
        var info = { host: "Word", platform: platform };
        if (cb) cb(info);
        return info;
      });
    }
  };
})();
