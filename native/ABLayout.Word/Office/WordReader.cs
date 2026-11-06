/*
File: WordReader.cs
Path: /native/ABLayout.Word/Office/WordReader.cs
Project: AB Layout (Advocate Benefit Layout)
Developed by PrajnaBytes International Private Limited and RatioJuris
Copyright (C) 2026 PrajnaBytes International Private Limited and RatioJuris
SPDX-License-Identifier: GPL-3.0-or-later
Additional terms under GPLv3 section 7 apply (attribution and names) - see NOTICE.

Reads the document into snapshots. Read-only: nothing here changes the
document. Values are converted to the same units and conventions the web
add-in receives from Office.js (points; line spacing where 12 = single).
*/

using System;
using System.Collections.Generic;
using System.Linq;
using ABLayout.Word.Engine;
using Newtonsoft.Json.Linq;
using W = Microsoft.Office.Interop.Word;

namespace ABLayout.Word.Office
{
    public static class WordReader
    {
        private const int Undefined = 9999999;

        /// <summary>Paragraph text without the paragraph mark / cell marker, as Office.js reports it.</summary>
        public static string CleanText(string raw)
        {
            if (string.IsNullOrEmpty(raw)) return "";
            var t = raw;
            if (t.EndsWith("\r\a")) t = t.Substring(0, t.Length - 2);
            else if (t.EndsWith("\r") || t.EndsWith("\a")) t = t.Substring(0, t.Length - 1);
            return t;
        }

        public static string AlignmentName(W.WdParagraphAlignment a)
        {
            switch (a)
            {
                case W.WdParagraphAlignment.wdAlignParagraphLeft: return "Left";
                case W.WdParagraphAlignment.wdAlignParagraphCenter: return "Centered";
                case W.WdParagraphAlignment.wdAlignParagraphRight: return "Right";
                case W.WdParagraphAlignment.wdAlignParagraphJustify:
                case W.WdParagraphAlignment.wdAlignParagraphDistribute:
                case W.WdParagraphAlignment.wdAlignParagraphJustifyHi:
                case W.WdParagraphAlignment.wdAlignParagraphJustifyMed:
                case W.WdParagraphAlignment.wdAlignParagraphJustifyLow:
                case W.WdParagraphAlignment.wdAlignParagraphThaiJustify:
                    return "Justified";
                default: return "Unknown";
            }
        }

        /// <summary>Line spacing in points where 12 = single, 18 = 1.5 lines, 24 = double.</summary>
        public static double LineSpacingPoints(W.WdLineSpacing rule, float value)
        {
            switch (rule)
            {
                case W.WdLineSpacing.wdLineSpaceSingle: return 12;
                case W.WdLineSpacing.wdLineSpace1pt5: return 18;
                case W.WdLineSpacing.wdLineSpaceDouble: return 24;
                default: return Math.Round(value * 20) / 20.0;
            }
        }

        public static string ColorHex(int wdColor)
        {
            if (wdColor == Undefined) return null; // mixed -> treated like "" (mixed) by the rules
            if (wdColor == unchecked((int)0xFF000000)) return "#000000"; // automatic
            int r = wdColor & 0xFF, g = (wdColor >> 8) & 0xFF, b = (wdColor >> 16) & 0xFF;
            return string.Format("#{0:X2}{1:X2}{2:X2}", r, g, b);
        }

        private static readonly Dictionary<W.WdBuiltinStyle, string> BuiltIns = new Dictionary<W.WdBuiltinStyle, string>
        {
            { W.WdBuiltinStyle.wdStyleNormal, "Normal" },
            { W.WdBuiltinStyle.wdStyleHeading1, "Heading1" }, { W.WdBuiltinStyle.wdStyleHeading2, "Heading2" },
            { W.WdBuiltinStyle.wdStyleHeading3, "Heading3" }, { W.WdBuiltinStyle.wdStyleHeading4, "Heading4" },
            { W.WdBuiltinStyle.wdStyleHeading5, "Heading5" }, { W.WdBuiltinStyle.wdStyleHeading6, "Heading6" },
            { W.WdBuiltinStyle.wdStyleHeading7, "Heading7" }, { W.WdBuiltinStyle.wdStyleHeading8, "Heading8" },
            { W.WdBuiltinStyle.wdStyleHeading9, "Heading9" },
            { W.WdBuiltinStyle.wdStyleTitle, "Title" }, { W.WdBuiltinStyle.wdStyleSubtitle, "Subtitle" },
            { W.WdBuiltinStyle.wdStyleTOC1, "Toc1" }, { W.WdBuiltinStyle.wdStyleTOC2, "Toc2" }, { W.WdBuiltinStyle.wdStyleTOC3, "Toc3" },
            { W.WdBuiltinStyle.wdStyleTOC4, "Toc4" }, { W.WdBuiltinStyle.wdStyleTOC5, "Toc5" }, { W.WdBuiltinStyle.wdStyleTOC6, "Toc6" },
            { W.WdBuiltinStyle.wdStyleTOC7, "Toc7" }, { W.WdBuiltinStyle.wdStyleTOC8, "Toc8" }, { W.WdBuiltinStyle.wdStyleTOC9, "Toc9" },
            { W.WdBuiltinStyle.wdStyleListParagraph, "ListParagraph" },
            { W.WdBuiltinStyle.wdStyleQuote, "Quote" }, { W.WdBuiltinStyle.wdStyleIntenseQuote, "IntenseQuote" }
        };

        /// <summary>Maps the document's localised style names to Office.js built-in style keys.</summary>
        public static Dictionary<string, string> BuiltInStyleNames(W.Document doc)
        {
            var map = new Dictionary<string, string>(StringComparer.OrdinalIgnoreCase);
            foreach (var kv in BuiltIns)
            {
                try
                {
                    object key = kv.Key;
                    var s = doc.Styles.get_Item(ref key);
                    if (!map.ContainsKey(s.NameLocal)) map[s.NameLocal] = kv.Value;
                }
                catch { /* style not available in this document */ }
            }
            return map;
        }

        /// <summary>Reads every paragraph of the main document story.</summary>
        public static List<ParagraphSnapshot> ReadParagraphs(W.Document doc, AbEngine engine, Action<string> progress = null)
        {
            var styleMap = BuiltInStyleNames(doc);
            var result = new List<ParagraphSnapshot>();
            int count = doc.Paragraphs.Count;
            int i = 0;
            foreach (W.Paragraph p in doc.Paragraphs)
            {
                if (progress != null && i % 200 == 0) progress($"Reading paragraphs ({i} of {count})...");
                var r = p.Range;
                var f = r.Font;
                string styleName = "";
                try { object st = p.get_Style(); styleName = ((W.Style)st).NameLocal; } catch { }
                bool inTable = false;
                try { object info = r.get_Information(W.WdInformation.wdWithInTable); inTable = info is bool b && b; } catch { }

                float size = f.Size;
                int highlight = (int)r.HighlightColorIndex;
                var snap = new ParagraphSnapshot
                {
                    Index = i,
                    Text = CleanText(r.Text),
                    Alignment = AlignmentName(p.Alignment),
                    FirstLineIndent = Round(p.FirstLineIndent),
                    LeftIndent = Round(p.LeftIndent),
                    RightIndent = Round(p.RightIndent),
                    LineSpacing = LineSpacingPoints(p.LineSpacingRule, p.LineSpacing),
                    SpaceBefore = Round(p.SpaceBefore),
                    SpaceAfter = Round(p.SpaceAfter),
                    StyleBuiltIn = styleMap.TryGetValue(styleName, out var key) ? key : "Other",
                    IsListItem = r.ListFormat.ListType != W.WdListType.wdListNoNumbering,
                    TableNestingLevel = inTable ? 1 : 0,
                    Font = new FontSnapshot
                    {
                        Name = string.IsNullOrEmpty(f.Name) ? null : f.Name,
                        Size = (size <= 0 || size >= Undefined) ? (double?)null : size,
                        Color = ColorHex((int)f.Color),
                        HighlightColor = highlight == 0 ? null : (highlight == Undefined ? "" : ((W.WdColorIndex)highlight).ToString())
                    }
                };
                result.Add(snap);
                i++;
            }

            // Paragraphs with several fonts: read every font used, so legacy-font text is never re-fonted.
            var mixed = result.Where(s => s.Font.Name == null && s.Text.Trim().Length > 0).ToList();
            int done = 0;
            foreach (var s in mixed)
            {
                if (progress != null && done % 20 == 0) progress($"Checking fonts in mixed paragraphs ({done} of {mixed.Count})...");
                try
                {
                    var xml = doc.Paragraphs[s.Index + 1].Range.WordOpenXML;
                    s.RunFonts = ((JArray)engine.CallJson("abFonts", xml)).Select(t => (string)t).ToList();
                }
                catch { /* leave null: the paragraph is then treated as protected */ }
                done++;
            }
            return result;
        }

        public static List<string> ReadTexts(W.Document doc)
        {
            var list = new List<string>();
            foreach (W.Paragraph p in doc.Paragraphs) list.Add(CleanText(p.Range.Text));
            return list;
        }

        public static List<PageSetupSnapshot> ReadPageSetups(W.Document doc)
        {
            var list = new List<PageSetupSnapshot>();
            foreach (W.Section s in doc.Sections)
            {
                var ps = s.PageSetup;
                list.Add(new PageSetupSnapshot
                {
                    PageWidth = ps.PageWidth, PageHeight = ps.PageHeight,
                    TopMargin = ps.TopMargin, BottomMargin = ps.BottomMargin,
                    LeftMargin = ps.LeftMargin, RightMargin = ps.RightMargin
                });
            }
            return list;
        }

        public static JObject ReadReviewInfo(W.Document doc)
        {
            int? comments = null, revisions = null;
            try { comments = doc.Comments.Count; } catch { }
            try { revisions = doc.Revisions.Count; } catch { }
            return new JObject { ["comments"] = comments, ["trackedChanges"] = revisions };
        }

        private static double Round(float v) => Math.Round(v * 20) / 20.0;
    }
}
