/*
File: AbService.cs
Path: /native/ABLayout.Word/Office/AbService.cs
Project: AB Layout (Advocate Benefit Layout)
Developed by PrajnaBytes International Private Limited and RatioJuris
Copyright (C) 2026 PrajnaBytes International Private Limited and RatioJuris
SPDX-License-Identifier: GPL-3.0-or-later
Additional terms under GPLv3 section 7 apply (attribution and names) - see NOTICE.

The operations AB Layout offers, each a complete, checked workflow:
read -> decide (shared rules) -> change only after confirmation -> verify -> report.
Every change is recorded as ONE Word Undo step ("Undo AB Layout: ...").
Results are JSON objects so the task pane and the automation API (tests)
use exactly the same code.
*/

using System;
using System.Collections.Generic;
using System.Linq;
using System.Runtime.InteropServices;
using System.Text.RegularExpressions;
using ABLayout.Word.Engine;
using Newtonsoft.Json.Linq;
using W = Microsoft.Office.Interop.Word;

namespace ABLayout.Word.Office
{
    public sealed class AbService
    {
        private readonly W.Application _app;
        private readonly AbEngine _engine;

        public AbService(W.Application app, AbEngine engine)
        {
            _app = app;
            _engine = engine;
        }

        public AbEngine Engine => _engine;

        private W.Document Doc
        {
            get
            {
                if (_app.Documents.Count == 0) throw new AbUserException("Open a document first.");
                return _app.ActiveDocument;
            }
        }

        private static List<W.Paragraph> ParagraphList(W.Document doc)
        {
            var list = new List<W.Paragraph>();
            foreach (W.Paragraph p in doc.Paragraphs) list.Add(p);
            return list;
        }

        /// <summary>Runs a change as a single Undo entry with screen updating paused.</summary>
        private void Undoable(string name, Action action)
        {
            W.UndoRecord ur = null;
            try { ur = _app.UndoRecord; ur.StartCustomRecord(name); } catch { ur = null; }
            bool screen = _app.ScreenUpdating;
            _app.ScreenUpdating = false;
            try { action(); }
            finally
            {
                _app.ScreenUpdating = screen;
                try { ur?.EndCustomRecord(); } catch { }
            }
        }

        private static string Json(object o) => AbEngine.ToJson(o);

        /* ===== CHECK ===== */

        public JObject Inspect(IEnumerable<string> protectedFonts, Action<string> progress = null)
        {
            var doc = Doc;
            var snaps = WordReader.ReadParagraphs(doc, _engine, progress);
            var review = WordReader.ReadReviewInfo(doc);
            var pages = WordReader.ReadPageSetups(doc);
            var extra = new JObject
            {
                ["review"] = review,
                ["pageSetups"] = JArray.FromObject(pages),
                ["protectedFonts"] = new JArray(protectedFonts ?? Enumerable.Empty<string>())
            };
            var result = (JObject)_engine.CallJson("abDiagnose", Json(snaps), extra.ToString());
            result["review"] = review;
            result["pageSetups"] = JArray.FromObject(pages);
            result["textStarts"] = new JArray(snaps.Select(s => s.Text.Length > 40 ? s.Text.Substring(0, 40) : s.Text));
            result["fingerprint"] = _engine.Call("abFingerprint", Json(snaps.Select(s => s.Text)));
            return result;
        }

        /* ===== CLEAN ===== */

        public JObject PreviewClean(JObject profile, bool removeBlankLines, int keepBlankLines, Action<string> progress = null)
        {
            var snaps = WordReader.ReadParagraphs(Doc, _engine, progress);
            var plan = (JObject)_engine.CallJson("abPlan", Json(snaps), profile.ToString());
            var blanks = removeBlankLines ? (JArray)_engine.CallJson("abBlank", Json(snaps), keepBlankLines.ToString()) : new JArray();
            return new JObject
            {
                ["plan"] = plan,
                ["blankCandidates"] = blanks.Count,
                ["fingerprint"] = _engine.Call("abFingerprint", Json(snaps.Select(s => s.Text))),
                ["textStarts"] = new JArray(snaps.Select(s => s.Text.Length > 40 ? s.Text.Substring(0, 40) : s.Text))
            };
        }

        public JObject ApplyClean(JObject profile, bool removeBlankLines, int keepBlankLines, string expectedFingerprint, Action<string> progress = null)
        {
            var doc = Doc;
            var snaps = WordReader.ReadParagraphs(doc, _engine, progress);
            var before = snaps.Select(s => s.Text).ToList();
            if (_engine.Call("abFingerprint", Json(before)) != expectedFingerprint)
                return new JObject { ["stale"] = true };

            var plan = (JObject)_engine.CallJson("abPlan", Json(snaps), profile.ToString());
            var changes = (JArray)plan["changes"];
            var applied = new List<int>();
            var failed = new List<int>();
            var removed = new List<int>();
            var keptBlank = new JArray();

            Undoable("AB Layout: Clean Document", () =>
            {
                var items = ParagraphList(doc);
                int n = 0;
                foreach (JObject ch in changes)
                {
                    int idx = (int)ch["index"];
                    try
                    {
                        WordWriter.Apply(items[idx], (JObject)ch["set"]);
                        applied.Add(idx);
                    }
                    catch (COMException) { failed.Add(idx); }
                    if (progress != null && ++n % 100 == 0) progress($"Applying formatting ({n} of {changes.Count})...");
                }

                if (removeBlankLines)
                {
                    var candidates = ((JArray)_engine.CallJson("abBlank", Json(snaps), keepBlankLines.ToString())).Select(t => (int)t).ToList();
                    var safe = new List<int>();
                    foreach (var i in candidates)
                    {
                        string reason;
                        try { reason = _engine.Call("abUnsafe", items[i].Range.WordOpenXML); }
                        catch { reason = "could not be checked"; }
                        if (reason.Length > 0) keptBlank.Add(new JObject { ["index"] = i, ["reason"] = reason });
                        else safe.Add(i);
                    }
                    foreach (var i in safe.OrderByDescending(x => x))
                    {
                        try { items[i].Range.Delete(); removed.Add(i); }
                        catch (COMException) { keptBlank.Add(new JObject { ["index"] = i, ["reason"] = "Word did not allow it" }); }
                    }
                    removed.Sort();
                }
            });

            progress?.Invoke("Checking that no text changed...");
            var after = WordReader.ReadTexts(doc);
            var verification = _engine.CallJson("abCompare", Json(before), Json(after), Json(removed));

            var appliedSet = new HashSet<int>(applied);
            var removedSet = new HashSet<int>(removed);
            var entries = new JArray();
            int notRestorable = 0;
            foreach (JObject ch in changes)
            {
                int idx = (int)ch["index"];
                if (!appliedSet.Contains(idx)) continue;
                if ((bool)ch["mixedFontUnified"]) notRestorable++;
                if (removedSet.Contains(idx)) continue;
                entries.Add(new JObject { ["position"] = idx - removed.Count(r => r < idx), ["set"] = ch["previous"] });
            }

            return new JObject
            {
                ["stale"] = false,
                ["plan"] = plan,
                ["applied"] = applied.Count,
                ["failed"] = new JArray(failed),
                ["removed"] = new JArray(removed),
                ["keptBlank"] = keptBlank,
                ["verification"] = verification,
                ["restorePoint"] = new JObject
                {
                    ["fingerprint"] = _engine.Call("abFingerprint", Json(after)),
                    ["entries"] = entries,
                    ["notRestorable"] = notRestorable,
                    ["blankLinesRemoved"] = removed.Count
                }
            };
        }

        public JObject RestoreFormatting(JObject restorePoint)
        {
            var doc = Doc;
            var texts = WordReader.ReadTexts(doc);
            if (_engine.Call("abFingerprint", Json(texts)) != (string)restorePoint["fingerprint"])
                return new JObject { ["ok"] = false, ["reason"] = "changed" };
            int restored = 0, failed = 0;
            Undoable("AB Layout: Restore Formatting", () =>
            {
                var items = ParagraphList(doc);
                foreach (JObject e in (JArray)restorePoint["entries"])
                {
                    try { WordWriter.Apply(items[(int)e["position"]], (JObject)e["set"]); restored++; }
                    catch (COMException) { failed++; }
                }
            });
            return new JObject { ["ok"] = failed == 0, ["restored"] = restored, ["failed"] = failed };
        }

        /* ===== PAGE ===== */

        /// <summary>Bookmark that marks the stamp-paper spacer AB Layout puts in page 1's header.</summary>
        public const string StampBookmark = "ABLayoutStampSpace";

        /// <summary>
        /// Applies paper size and margins. For layouts with a different first page
        /// (affidavit on stamp paper), every page gets the normal margins and page 1
        /// gets a "different first page" header holding an empty spacer, which pushes
        /// page 1's text down. No section break is inserted and no text is touched.
        /// </summary>
        public JObject ApplyPageLayout(JObject layout)
        {
            var doc = Doc;
            var validation = _engine.CallJson("abValidateLayout", layout.ToString());
            if (!(bool)validation["valid"]) throw new AbUserException((string)validation["error"]);
            var before = WordReader.ReadPageSetups(doc);
            bool multiPage = layout["multiPage"]?.Value<bool>() == true;
            var margins = (JObject)(multiPage ? layout["otherPages"] : layout["margins"]);
            var notes = new JArray();
            var info = new JArray();
            JObject stamp = null;

            Undoable("AB Layout: Page Layout", () =>
            {
                foreach (W.Section s in doc.Sections)
                {
                    var ps = s.PageSetup;
                    ps.PageWidth = (float)(double)layout["width"];
                    ps.PageHeight = (float)(double)layout["height"];
                    ps.TopMargin = (float)(double)margins["top"];
                    ps.BottomMargin = (float)(double)margins["bottom"];
                    ps.LeftMargin = (float)(double)margins["left"];
                    ps.RightMargin = (float)(double)margins["right"];
                }
                var first = doc.Sections[1];
                if (multiPage)
                {
                    stamp = AddStampSpace(first, (double)layout["firstPage"]["top"], notes);
                    if (stamp != null)
                        info.Add($"Page 1 text now starts {_engine.Call("abPtToCm", layout["firstPage"]["top"].ToString())} cm from the top, leaving room for the stamp-paper heading. Other pages use normal margins."
                            + ((bool)stamp["footerCopied"] ? " Your footer was copied to page 1." : ""));
                }
                else if (RemoveStampSpace(first))
                {
                    info.Add("The stamp-paper space on page 1 was removed.");
                }
            });

            var beforeArr = JArray.FromObject(before);
            return new JObject
            {
                ["sections"] = doc.Sections.Count,
                ["notes"] = notes,
                ["info"] = info,
                ["before"] = beforeArr,
                ["restore"] = new JObject { ["sections"] = beforeArr, ["stamp"] = stamp }
            };
        }

        private static bool IsEmpty(W.HeaderFooter hf)
        {
            var r = hf.Range;
            return (r.Text ?? "").Trim('\r', '\n', ' ', '\a').Length == 0
                && r.InlineShapes.Count == 0 && r.Fields.Count == 0 && r.ShapeRange.Count == 0;
        }

        /// <summary>
        /// Invisible document variable recording page 1's state before AB Layout added the
        /// stamp-paper space ("diff=0|1;footer=0|1"), so removing it restores exactly that state.
        /// </summary>
        private const string StampStateVariable = "ABLayoutStampState";

        private static string GetVariable(W.Document doc, string name)
        {
            foreach (W.Variable v in doc.Variables) if (v.Name == name) return v.Value;
            return null;
        }

        private static void SetVariable(W.Document doc, string name, string value)
        {
            foreach (W.Variable v in doc.Variables) if (v.Name == name) { v.Value = value; return; }
            object val = value;
            doc.Variables.Add(name, ref val);
        }

        private static void DeleteVariable(W.Document doc, string name)
        {
            foreach (W.Variable v in doc.Variables) if (v.Name == name) { v.Delete(); return; }
        }

        private JObject AddStampSpace(W.Section section, double firstTop, JArray notes)
        {
            var doc = (W.Document)section.Range.Document;
            var ps = section.PageSetup;
            var header = section.Headers[W.WdHeaderFooterIndex.wdHeaderFooterFirstPage];
            bool ours = header.Range.Bookmarks.Exists(StampBookmark) && GetVariable(doc, StampStateVariable) != null;
            bool differentNow = ps.DifferentFirstPageHeaderFooter != 0;
            if (differentNow && !ours && !IsEmpty(header))
            {
                notes.Add("Page 1 already has its own header, so AB Layout did not add the stamp-paper space (to avoid changing that header). Margins were applied to all pages.");
                return null;
            }

            if (!ours)
            {
                bool footerCopied = false;
                if (!differentNow)
                {
                    ps.DifferentFirstPageHeaderFooter = -1;
                    var firstFooter = section.Footers[W.WdHeaderFooterIndex.wdHeaderFooterFirstPage];
                    var primaryFooter = section.Footers[W.WdHeaderFooterIndex.wdHeaderFooterPrimary];
                    if (IsEmpty(firstFooter) && !IsEmpty(primaryFooter))
                    {
                        firstFooter.Range.FormattedText = primaryFooter.Range.FormattedText;
                        footerCopied = true;
                    }
                }
                SetVariable(doc, StampStateVariable, $"diff={(differentNow ? 1 : 0)};footer={(footerCopied ? 1 : 0)}");
            }
            var state = GetVariable(doc, StampStateVariable) ?? "";

            // Header height = space before + one 12 pt line; Word moves page 1's text below it.
            var range = header.Range;
            range.Text = "";
            var p = header.Range.Paragraphs[1];
            p.SpaceAfter = 0;
            p.LineSpacingRule = W.WdLineSpacing.wdLineSpaceExactly;
            p.LineSpacing = 12;
            p.SpaceBefore = (float)Math.Max(0, firstTop - ps.HeaderDistance - 12);
            object bm = header.Range;
            header.Range.Bookmarks.Add(StampBookmark, ref bm);
            return new JObject { ["existedBefore"] = ours, ["footerCopied"] = state.Contains("footer=1") };
        }

        /// <summary>
        /// Removes AB Layout's stamp-paper spacer and puts page 1 back exactly as it was
        /// before AB Layout added it (different-first-page setting and footer).
        /// </summary>
        /// <returns>true if a spacer was found and removed.</returns>
        private static bool RemoveStampSpace(W.Section section)
        {
            var doc = (W.Document)section.Range.Document;
            var header = section.Headers[W.WdHeaderFooterIndex.wdHeaderFooterFirstPage];
            if (!header.Range.Bookmarks.Exists(StampBookmark)) return false;
            object name = StampBookmark;
            header.Range.Bookmarks.get_Item(ref name).Delete();
            header.Range.Text = "";
            var p = header.Range.Paragraphs[1];
            p.SpaceBefore = 0;
            p.LineSpacingRule = W.WdLineSpacing.wdLineSpaceSingle;

            var state = GetVariable(doc, StampStateVariable) ?? "";
            if (state.Contains("footer=1")) section.Footers[W.WdHeaderFooterIndex.wdHeaderFooterFirstPage].Range.Text = "";
            if (state.Contains("diff=0")) section.PageSetup.DifferentFirstPageHeaderFooter = 0;
            DeleteVariable(doc, StampStateVariable);
            return true;
        }

        /// <param name="restore">The "restore" object from ApplyPageLayout (or just its "before" array).</param>
        public JObject RestorePageLayout(JToken restore)
        {
            var doc = Doc;
            var before = restore is JArray arr ? arr : (JArray)restore["sections"];
            var stamp = restore is JObject o ? o["stamp"] as JObject : null;
            if (doc.Sections.Count != before.Count) return new JObject { ["ok"] = false };
            Undoable("AB Layout: Restore Page Layout", () =>
            {
                int i = 0;
                foreach (W.Section s in doc.Sections)
                {
                    var b = (JObject)before[i++];
                    var ps = s.PageSetup;
                    ps.PageWidth = (float)(double)b["pageWidth"];
                    ps.PageHeight = (float)(double)b["pageHeight"];
                    ps.TopMargin = (float)(double)b["topMargin"];
                    ps.BottomMargin = (float)(double)b["bottomMargin"];
                    ps.LeftMargin = (float)(double)b["leftMargin"];
                    ps.RightMargin = (float)(double)b["rightMargin"];
                }
                // Remove the stamp space this apply added (a space that was already there before is kept).
                if (stamp != null && !(bool)stamp["existedBefore"]) RemoveStampSpace(doc.Sections[1]);
            });
            return new JObject { ["ok"] = true };
        }

        /* ===== HINDI ===== */

        private static readonly Regex Token = new Regex("[^ ]+ *| +", RegexOptions.Compiled);

        /// <param name="direction">"toUnicode" or "toKruti"</param>
        /// <param name="scope">"selection" or "document"</param>
        public JObject Hindi(string direction, string scope, bool dryRun, string targetFont, Action<string> progress = null)
        {
            var doc = Doc;
            int selStart = 0, selEnd = int.MaxValue;
            if (scope == "selection")
            {
                var sel = _app.Selection;
                selStart = sel.Start;
                selEnd = sel.End;
            }
            var skipped = new JObject { ["mixed-font"] = 0, ["special"] = 0, ["not-exact"] = 0 };
            var samples = new JArray();
            int toConvert = 0, converted = 0, failed = 0, scanned = 0;

            var paragraphs = ParagraphList(doc);
            var work = new List<Tuple<int, int, string, string>>(); // start, end, output, original

            foreach (var p in paragraphs)
            {
                var pr = p.Range;
                int start = Math.Max(pr.Start, selStart);
                int end = Math.Min(pr.End - 1, selEnd); // exclude the paragraph mark
                if (end <= start) continue;
                scanned++;
                var text = doc.Range(start, end).Text ?? "";
                if (text.Length != end - start) text = WordReader.CleanText(text);
                if (text.Length != end - start) { skipped["special"] = (int)skipped["special"] + 1; continue; }

                var tokens = Token.Matches(text).Cast<Match>().Where(m => m.Value.Trim().Length > 0).ToList();
                if (tokens.Count == 0) continue;
                var words = tokens.Select(m => m.Value).ToList();
                var fonts = tokens.Select(m =>
                {
                    try { var n = doc.Range(start + m.Index, start + m.Index + m.Length).Font.Name; return string.IsNullOrEmpty(n) ? null : n; }
                    catch { return null; }
                }).ToList();
                var decisions = _engine.DecideWords(words, fonts, direction);
                for (int k = 0; k < tokens.Count; k++)
                {
                    var d = decisions[k];
                    var action = (string)d["action"];
                    if (action == "convert")
                    {
                        toConvert++;
                        var output = (string)d["output"];
                        if (samples.Count < 6) samples.Add(output.Trim());
                        work.Add(Tuple.Create(start + tokens[k].Index, start + tokens[k].Index + tokens[k].Length, output, tokens[k].Value));
                    }
                    else if (action == "skip")
                    {
                        var reason = (string)d["reason"];
                        skipped[reason] = (int)skipped[reason] + 1;
                    }
                }
                if (progress != null && scanned % 40 == 0) progress($"Paragraphs {scanned} of {paragraphs.Count}...");
            }

            if (!dryRun && work.Count > 0)
            {
                Undoable("AB Layout: Hindi conversion", () =>
                {
                    // From the end of the document backwards so earlier positions stay valid.
                    foreach (var w in work.OrderByDescending(x => x.Item1))
                    {
                        try
                        {
                            var r = doc.Range(w.Item1, w.Item2);
                            if (r.Text != w.Item4) { failed++; continue; }
                            r.Text = w.Item3;
                            r.Font.Name = targetFont;
                            converted++;
                        }
                        catch (COMException) { failed++; }
                    }
                });
            }

            return new JObject
            {
                ["toConvert"] = toConvert,
                ["converted"] = converted,
                ["failed"] = failed,
                ["skipped"] = skipped,
                ["samples"] = samples,
                ["paragraphsScanned"] = scanned
            };
        }

        /* ===== NAVIGATION ===== */

        public bool ShowParagraph(int index, string expectedStart)
        {
            var doc = Doc;
            int i = 0;
            foreach (W.Paragraph p in doc.Paragraphs)
            {
                if (i++ != index) continue;
                var text = WordReader.CleanText(p.Range.Text);
                if (expectedStart != null && !text.StartsWith(expectedStart)) return false;
                p.Range.Select();
                return true;
            }
            return false;
        }
    }

    /// <summary>An error whose message is already written for the advocate.</summary>
    public sealed class AbUserException : Exception
    {
        public AbUserException(string message) : base(message) { }
    }
}
