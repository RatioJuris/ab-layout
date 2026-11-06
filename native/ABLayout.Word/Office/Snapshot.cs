/*
File: Snapshot.cs
Path: /native/ABLayout.Word/Office/Snapshot.cs
Project: AB Layout (Advocate Benefit Layout)
Developed by PrajnaBytes International Private Limited and RatioJuris
Copyright (C) 2026 PrajnaBytes International Private Limited and RatioJuris
SPDX-License-Identifier: GPL-3.0-or-later
Additional terms under GPLv3 section 7 apply (attribution and names) - see NOTICE.

Plain data passed to the shared rules. Property names match ParagraphSnapshot
in web/core/rj-pb-types.js exactly.
*/

using System.Collections.Generic;
using Newtonsoft.Json;

namespace ABLayout.Word.Office
{
    public sealed class FontSnapshot
    {
        [JsonProperty("name")] public string Name;
        [JsonProperty("size")] public double? Size;
        [JsonProperty("color")] public string Color;
        [JsonProperty("highlightColor")] public string HighlightColor;
    }

    public sealed class ParagraphSnapshot
    {
        [JsonProperty("index")] public int Index;
        [JsonProperty("text")] public string Text;
        [JsonProperty("alignment")] public string Alignment;
        [JsonProperty("firstLineIndent")] public double FirstLineIndent;
        [JsonProperty("leftIndent")] public double LeftIndent;
        [JsonProperty("rightIndent")] public double RightIndent;
        [JsonProperty("lineSpacing")] public double LineSpacing;
        [JsonProperty("spaceBefore")] public double SpaceBefore;
        [JsonProperty("spaceAfter")] public double SpaceAfter;
        [JsonProperty("styleBuiltIn")] public string StyleBuiltIn;
        [JsonProperty("isListItem")] public bool IsListItem;
        [JsonProperty("tableNestingLevel")] public int TableNestingLevel;
        [JsonProperty("font")] public FontSnapshot Font;
        [JsonProperty("runFonts", NullValueHandling = NullValueHandling.Ignore)] public List<string> RunFonts;
    }

    public sealed class PageSetupSnapshot
    {
        [JsonProperty("pageWidth")] public double PageWidth;
        [JsonProperty("pageHeight")] public double PageHeight;
        [JsonProperty("topMargin")] public double TopMargin;
        [JsonProperty("bottomMargin")] public double BottomMargin;
        [JsonProperty("leftMargin")] public double LeftMargin;
        [JsonProperty("rightMargin")] public double RightMargin;
    }
}
