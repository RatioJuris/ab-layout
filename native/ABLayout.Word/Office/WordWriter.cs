/*
File: WordWriter.cs
Path: /native/ABLayout.Word/Office/WordWriter.cs
Project: AB Layout (Advocate Benefit Layout)
Developed by PrajnaBytes International Private Limited and RatioJuris
Copyright (C) 2026 PrajnaBytes International Private Limited and RatioJuris
SPDX-License-Identifier: GPL-3.0-or-later
Additional terms under GPLv3 section 7 apply (attribution and names) - see NOTICE.

Writes formatting to Word. Only the properties of a FormatChange are ever
set; text is never inserted or replaced here.
*/

using System;
using Newtonsoft.Json.Linq;
using W = Microsoft.Office.Interop.Word;

namespace ABLayout.Word.Office
{
    public static class WordWriter
    {
        public static W.WdParagraphAlignment ParseAlignment(string a)
        {
            switch (a)
            {
                case "Centered": return W.WdParagraphAlignment.wdAlignParagraphCenter;
                case "Right": return W.WdParagraphAlignment.wdAlignParagraphRight;
                case "Justified": return W.WdParagraphAlignment.wdAlignParagraphJustify;
                default: return W.WdParagraphAlignment.wdAlignParagraphLeft;
            }
        }

        /// <summary>Sets line spacing so Word's dialog shows Single / 1.5 lines / Double / Multiple.</summary>
        public static void SetLineSpacing(W.Paragraph p, double points)
        {
            if (Math.Abs(points - 12) < 0.01) p.LineSpacingRule = W.WdLineSpacing.wdLineSpaceSingle;
            else if (Math.Abs(points - 18) < 0.01) p.LineSpacingRule = W.WdLineSpacing.wdLineSpace1pt5;
            else if (Math.Abs(points - 24) < 0.01) p.LineSpacingRule = W.WdLineSpacing.wdLineSpaceDouble;
            else
            {
                p.LineSpacingRule = W.WdLineSpacing.wdLineSpaceMultiple;
                p.LineSpacing = (float)points;
            }
        }

        /// <param name="set">A FormatChange object from the shared rules.</param>
        public static void Apply(W.Paragraph p, JObject set)
        {
            if (set["fontName"] != null) p.Range.Font.Name = (string)set["fontName"];
            if (set["fontSize"] != null) p.Range.Font.Size = (float)(double)set["fontSize"];
            if (set["alignment"] != null) p.Alignment = ParseAlignment((string)set["alignment"]);
            if (set["lineSpacing"] != null) SetLineSpacing(p, (double)set["lineSpacing"]);
            if (set["spaceBefore"] != null) p.SpaceBefore = (float)(double)set["spaceBefore"];
            if (set["spaceAfter"] != null) p.SpaceAfter = (float)(double)set["spaceAfter"];
            if (set["firstLineIndent"] != null) p.FirstLineIndent = (float)(double)set["firstLineIndent"];
            if (set["leftIndent"] != null) p.LeftIndent = (float)(double)set["leftIndent"];
            if (set["rightIndent"] != null) p.RightIndent = (float)(double)set["rightIndent"];
        }
    }
}
