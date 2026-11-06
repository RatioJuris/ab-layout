/*
File: AbEngine.cs
Path: /native/ABLayout.Word/Engine/AbEngine.cs
Project: AB Layout (Advocate Benefit Layout)
Developed by PrajnaBytes International Private Limited and RatioJuris
Copyright (C) 2026 PrajnaBytes International Private Limited and RatioJuris
SPDX-License-Identifier: GPL-3.0-or-later
Additional terms under GPLv3 section 7 apply (attribution and names) - see NOTICE.

Runs the shared AB Layout rules (web/core/rj-pb-*.js, the same files the web
add-in uses) inside the Jint JavaScript engine, so the native and web
versions always make identical decisions. Data crosses the boundary as JSON.
Jint is not thread-safe: every call is serialised with a lock.
*/

using System;
using System.Collections.Generic;
using System.IO;
using Jint;
using Newtonsoft.Json;
using Newtonsoft.Json.Linq;

namespace ABLayout.Word.Engine
{
    public sealed class AbEngine
    {
        private readonly Jint.Engine _js;
        private readonly object _gate = new object();
        private readonly Dictionary<string, JObject> _wordCache = new Dictionary<string, JObject>();

        private static readonly string[] Modules =
        {
            "units", "fonts", "classify", "profiles", "plan", "numbering", "verify", "diagnostics", "krutidev", "layouts", "attribution"
        };

        private const string Bridge = @"
function abDiagnose(s, e) { return JSON.stringify(M_diagnostics.runDiagnostics(JSON.parse(s), JSON.parse(e))); }
function abPlan(s, p) {
  const plan = M_plan.buildFormattingPlan(JSON.parse(s), JSON.parse(p));
  return JSON.stringify({ changes: plan.changes, targets: plan.targets, kindCounts: plan.kindCounts,
    changedKindCounts: plan.changedKindCounts, fontKept: plan.fontKept, mixedFontUnified: plan.mixedFontUnified,
    totalParagraphs: plan.totalParagraphs });
}
function abBlank(s, keep) { return JSON.stringify(M_plan.blankLineCandidates(JSON.parse(s), Number(keep))); }
function abUnsafe(xml) { return M_plan.unsafeToDeleteReason(xml) || ''; }
function abFonts(xml) { return JSON.stringify(M_fonts.extractFontNamesFromOoxml(xml)); }
function abCompare(b, a, r) { return JSON.stringify(M_verify.compareParagraphTexts(JSON.parse(b), JSON.parse(a), JSON.parse(r))); }
function abFingerprint(t) { return M_verify.fingerprint(JSON.parse(t)); }
function abProfiles() { return JSON.stringify(M_profiles.BUILT_IN_PROFILES); }
function abValidateProfile(p) { return JSON.stringify(M_profiles.validateProfile(JSON.parse(p))); }
function abDescribe(p) { return JSON.stringify(M_profiles.describeProfile(JSON.parse(p))); }
function abCreateCustom(base, name) { return JSON.stringify(M_profiles.createCustomProfile(JSON.parse(base), name)); }
function abKindLabels() { return JSON.stringify(M_classify.KIND_LABELS); }
function abDecideWords(words, fonts, dir) {
  const w = JSON.parse(words), f = JSON.parse(fonts);
  return JSON.stringify(w.map((t, i) => M_krutidev.decideWord(t, f[i], dir)));
}
function abValidateStore(s) { return JSON.stringify(M_layouts.validateStore(JSON.parse(s))); }
function abResolveLayout(s, id) { return JSON.stringify(M_layouts.resolveLayout(JSON.parse(s), id)); }
function abValidateLayout(l) { return JSON.stringify(M_layouts.validateLayout(JSON.parse(l))); }
function abPlanMargins(l, n) { return JSON.stringify(M_layouts.planSectionMargins(JSON.parse(l), Number(n))); }
function abLinesLabel(pt) { return M_units.linesLabel(Number(pt)); }
function abPtToCm(pt) { return String(M_units.ptToCm(Number(pt))); }
function abAttribution() { return JSON.stringify(M_attribution.ATTRIBUTION); }
";

        public AbEngine(string coreDirectory)
        {
            if (!Directory.Exists(coreDirectory))
                throw new DirectoryNotFoundException("AB Layout rules folder not found: " + coreDirectory);

            _js = new Jint.Engine(o => o.EnableModules(coreDirectory).LimitRecursion(4000));
            foreach (var m in Modules)
            {
                var ns = _js.Modules.Import("./rj-pb-" + m + ".js");
                _js.SetValue("M_" + m, ns);
            }
            _js.Execute(Bridge);
        }

        /// <summary>Calls a bridge function with string arguments and returns its string result.</summary>
        public string Call(string function, params string[] args)
        {
            lock (_gate)
            {
                var names = new string[args.Length];
                for (int i = 0; i < args.Length; i++)
                {
                    names[i] = "__a" + i;
                    _js.SetValue(names[i], args[i]);
                }
                return _js.Evaluate(function + "(" + string.Join(",", names) + ")").AsString();
            }
        }

        public JToken CallJson(string function, params string[] args) => JToken.Parse(Call(function, args));

        public static string ToJson(object value) => JsonConvert.SerializeObject(value, Formatting.None);

        /// <summary>
        /// Decides conversion for many words at once. Results are cached per distinct
        /// (word, font, direction): legal documents repeat words heavily.
        /// </summary>
        public JObject[] DecideWords(IList<string> words, IList<string> fonts, string direction)
        {
            var result = new JObject[words.Count];
            var missingIdx = new List<int>();
            var missingWords = new List<string>();
            var missingFonts = new List<string>();
            lock (_gate)
            {
                for (int i = 0; i < words.Count; i++)
                {
                    var key = direction + "\u0001" + (fonts[i] ?? "") + "\u0001" + words[i];
                    if (_wordCache.TryGetValue(key, out var cached)) result[i] = cached;
                    else { missingIdx.Add(i); missingWords.Add(words[i]); missingFonts.Add(fonts[i]); }
                }
            }
            if (missingIdx.Count > 0)
            {
                var decided = (JArray)CallJson("abDecideWords", ToJson(missingWords), ToJson(missingFonts), direction);
                lock (_gate)
                {
                    for (int k = 0; k < missingIdx.Count; k++)
                    {
                        var d = (JObject)decided[k];
                        var i = missingIdx[k];
                        result[i] = d;
                        _wordCache[direction + "\u0001" + (fonts[i] ?? "") + "\u0001" + words[i]] = d;
                    }
                }
            }
            return result;
        }
    }
}
