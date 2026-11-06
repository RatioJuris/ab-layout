/*
File: RealWordTests.cs
Path: /native/ABLayout.Word.Tests/RealWordTests.cs
Project: AB Layout (Advocate Benefit Layout)
Developed by PrajnaBytes International Private Limited and RatioJuris
Copyright (C) 2026 PrajnaBytes International Private Limited and RatioJuris
SPDX-License-Identifier: GPL-3.0-or-later
Additional terms under GPLv3 section 7 apply (attribution and names) - see NOTICE.

Runs AB Layout's operations against REAL Microsoft Word (a hidden instance
started for the tests). Each test builds a synthetic petition (fictitious
names), runs an operation and reads the result back from Word.
Documents are closed without saving.
*/

using System;
using System.IO;
using System.Linq;
using ABLayout.Word.Engine;
using ABLayout.Word.Office;
using Newtonsoft.Json.Linq;
using Xunit;
using W = Microsoft.Office.Interop.Word;

namespace ABLayout.Word.Tests
{
    public sealed class WordFixture : IDisposable
    {
        public W.Application App { get; }
        public AbEngine Engine { get; }

        public WordFixture()
        {
            App = (W.Application)Activator.CreateInstance(Type.GetTypeFromProgID("Word.Application"));
            App.Visible = false;
            App.DisplayAlerts = W.WdAlertLevel.wdAlertsNone;
            try
            {
                Engine = new AbEngine(Path.Combine(Connect.InstallDirectory, "core"));
            }
            catch
            {
                Dispose(); // never leave a hidden Word running
                throw;
            }
        }

        public void Dispose()
        {
            try
            {
                object no = false;
                // Only quit if this instance holds no other documents.
                if (App.Documents.Count == 0) App.Quit(ref no);
            }
            catch { }
        }
    }

    [CollectionDefinition("word")]
    public sealed class WordCollection : ICollectionFixture<WordFixture> { }

    [Collection("word")]
    public sealed class RealWordTests
    {
        private readonly WordFixture _w;
        public RealWordTests(WordFixture w) { _w = w; }

        private static JObject Profile(AbEngine engine, string id) =>
            ((JArray)engine.CallJson("abProfiles")).OfType<JObject>().First(p => (string)p["id"] == id);

        /// <summary>Builds the synthetic mixed-format petition. Paragraph numbers below are 0-based indexes.</summary>
        private W.Document Petition()
        {
            var doc = _w.App.Documents.Add();
            var lines = new[]
            {
                /* 0 */ "IN THE HIGH COURT OF JUDICATURE AT ALLAHABAD",
                /* 1 */ "WRIT PETITION (CIVIL) NO. ______ OF 2026",
                /* 2 */ "",
                /* 3 */ "Ram Kumar Sharma, R/o Village Rampur, District Kanpur\t...Petitioner",
                /* 4 */ "VERSUS",
                /* 5 */ "State of Uttar Pradesh through Principal Secretary\t...Respondent",
                /* 6 */ "",
                /* 7 */ "",
                /* 8 */ "",
                /* 9 */ "1. That the petitioner is a law-abiding citizen and is filing the present petition under Article 226 of the Constitution of India on 12.05.2026.",
                /* 10 */ "2. That the respondent issued an order dated 01.04.2026 under Section 4 of the U.P. Land Revenue Act, 1901 without hearing the petitioner.",
                /* 11 */ "4. That the impugned order is arbitrary and violates the principles of natural justice as held in Maneka Gandhi v. Union of India, (1978) 1 SCC 248.",
                /* 12 */ "\"Audi alteram partem is a highly effective tool devised by the courts to ensure fairness in administrative action.\"",
                /* 13 */ ";kfpdkdrkZ dh vksj ls fuosnu",
                /* 14 */ "Place: Allahabad",
                /* 15 */ "Through Counsel",
                /* 16 */ ""
            };
            doc.Content.Text = string.Join("\r", lines);
            var p = doc.Paragraphs.Cast<W.Paragraph>().ToArray();
            foreach (var para in p)
            {
                para.Range.Font.Name = "Times New Roman";
                para.Range.Font.Size = 14;
                para.Alignment = W.WdParagraphAlignment.wdAlignParagraphLeft;
                para.SpaceAfter = 0; para.SpaceBefore = 0;
                para.LineSpacingRule = W.WdLineSpacing.wdLineSpace1pt5;
            }
            p[0].Alignment = W.WdParagraphAlignment.wdAlignParagraphCenter; p[0].Range.Font.Name = "Arial"; p[0].Range.Font.Size = 16; p[0].Range.Font.Bold = 1;
            p[1].Alignment = W.WdParagraphAlignment.wdAlignParagraphCenter;
            p[4].Alignment = W.WdParagraphAlignment.wdAlignParagraphCenter;
            foreach (var i in new[] { 9, 11 }) { p[i].Alignment = W.WdParagraphAlignment.wdAlignParagraphJustify; p[i].FirstLineIndent = 36; p[i].SpaceAfter = 6; }
            p[10].Range.Font.Name = "Calibri"; p[10].Range.Font.Size = 11; p[10].LineSpacingRule = W.WdLineSpacing.wdLineSpaceDouble;
            // Paragraph 11: mixed fonts (Book Antiqua inside), with a bold case name.
            var r11 = p[11].Range;
            var start = r11.Start + r11.Text.IndexOf("impugned", StringComparison.Ordinal);
            doc.Range(start, start + 8).Font.Name = "Book Antiqua";
            var mg = r11.Start + r11.Text.IndexOf("Maneka Gandhi", StringComparison.Ordinal);
            doc.Range(mg, mg + 13).Font.Bold = 1;
            p[12].LeftIndent = 72; p[12].RightIndent = 36; p[12].Alignment = W.WdParagraphAlignment.wdAlignParagraphJustify;
            p[13].Range.Font.Name = "Kruti Dev 010"; p[13].Alignment = W.WdParagraphAlignment.wdAlignParagraphJustify;
            p[15].Alignment = W.WdParagraphAlignment.wdAlignParagraphRight;
            doc.UndoClear();
            return doc;
        }

        private static void Close(W.Document doc)
        {
            object no = W.WdSaveOptions.wdDoNotSaveChanges;
            doc.Close(ref no);
        }

        private static W.Paragraph Para(W.Document doc, int index) => doc.Paragraphs[index + 1];

        [Fact]
        public void Check_Document_reports_real_problems_and_changes_nothing()
        {
            var doc = Petition();
            try
            {
                doc.Sections[1].PageSetup.PageWidth = 612;   // legal size, as in many old templates
                doc.Sections[1].PageSetup.PageHeight = 1008;
                var before = WordReader.ReadTexts(doc);
                var r = new AbService(_w.App, _w.Engine).Inspect(Enumerable.Empty<string>());
                var ids = ((JArray)r["findings"]).Select(f => (string)f["id"]).ToList();
                Assert.Contains("font-name", ids);
                Assert.Contains("font-size", ids);
                Assert.Contains("line-spacing", ids);
                Assert.Contains("typed-numbering", ids);
                Assert.Contains("legacy-font", ids);
                Assert.Contains("blanks", ids);
                Assert.Contains("paper", ids);
                Assert.Contains("Legal", (string)((JArray)r["findings"]).First(f => (string)f["id"] == "paper")["title"]);
                var numbering = ((JArray)r["findings"]).First(f => (string)f["id"] == "typed-numbering");
                Assert.Contains("3 missing", (string)numbering["detail"]);
                Assert.Equal(before, WordReader.ReadTexts(doc));
                Assert.Equal("Calibri", Para(doc, 10).Range.Font.Name); // formatting untouched too
            }
            finally { Close(doc); }
        }

        [Fact]
        public void Clean_Document_formats_body_keeps_layout_and_verifies_text_in_real_Word()
        {
            var doc = Petition();
            try
            {
                var svc = new AbService(_w.App, _w.Engine);
                var texts = WordReader.ReadTexts(doc);
                var petition = Profile(_w.Engine, "petition");
                var preview = svc.PreviewClean(petition, false, 1);
                Assert.True(((JArray)preview["plan"]["changes"]).Count > 0);

                var r = svc.ApplyClean(petition, false, 1, (string)preview["fingerprint"]);
                Assert.False((bool)r["stale"]);
                Assert.True((bool)r["verification"]["ok"], (string)r["verification"]["message"]);
                Assert.Empty((JArray)r["failed"]);
                Assert.Equal(texts, WordReader.ReadTexts(doc));

                // Body paragraphs normalised (read back from Word itself).
                foreach (var i in new[] { 9, 10, 11 })
                {
                    var p = Para(doc, i);
                    Assert.Equal("Times New Roman", p.Range.Font.Name);
                    Assert.Equal(14f, p.Range.Font.Size);
                    Assert.Equal(W.WdParagraphAlignment.wdAlignParagraphJustify, p.Alignment);
                    Assert.Equal(W.WdLineSpacing.wdLineSpace1pt5, p.LineSpacingRule);
                    Assert.Equal(36f, p.FirstLineIndent, 1);
                    Assert.Equal(6f, p.SpaceAfter, 1);
                }
                // Bold case name kept inside the unified paragraph.
                var p11 = Para(doc, 11).Range;
                var mg = p11.Start + p11.Text.IndexOf("Maneka Gandhi", StringComparison.Ordinal);
                Assert.Equal(-1, doc.Range(mg, mg + 13).Font.Bold);
                // Layout kept.
                Assert.Equal(W.WdParagraphAlignment.wdAlignParagraphCenter, Para(doc, 0).Alignment);
                Assert.Equal(16f, Para(doc, 0).Range.Font.Size);
                Assert.Equal(W.WdParagraphAlignment.wdAlignParagraphCenter, Para(doc, 4).Alignment);
                Assert.Equal(W.WdParagraphAlignment.wdAlignParagraphRight, Para(doc, 15).Alignment);
                Assert.Equal(72f, Para(doc, 12).LeftIndent, 1);
                Assert.Equal(12f, Para(doc, 12).Range.Font.Size); // quotation 12 pt
                // Kruti Dev text kept in its font.
                Assert.Equal("Kruti Dev 010", Para(doc, 13).Range.Font.Name);

                // Idempotent in real Word: a second preview finds nothing.
                var again = svc.PreviewClean(petition, false, 1);
                Assert.Empty((JArray)again["plan"]["changes"]);
            }
            finally { Close(doc); }
        }

        [Fact]
        public void Clean_keeps_body_aligned_with_a_template_that_indents_every_paragraph()
        {
            var doc = Petition();
            try
            {
                // Some advocates' templates indent every paragraph (here 0.63 cm).
                foreach (W.Paragraph p in doc.Paragraphs) p.LeftIndent = 18f;
                var svc = new AbService(_w.App, _w.Engine);
                var petition = Profile(_w.Engine, "petition");
                var r = svc.ApplyClean(petition, false, 1, (string)svc.PreviewClean(petition, false, 1)["fingerprint"]);
                Assert.True((bool)r["verification"]["ok"]);
                foreach (var i in new[] { 9, 10, 11 }) Assert.Equal(18f, Para(doc, i).LeftIndent, 1);
                Assert.Equal(18f, Para(doc, 14).LeftIndent, 1); // "Place:" line, untouched, still aligned with body
            }
            finally { Close(doc); }
        }

        [Fact]
        public void One_Undo_reverses_the_whole_Clean_Document()
        {
            var doc = Petition();
            try
            {
                var svc = new AbService(_w.App, _w.Engine);
                var petition = Profile(_w.Engine, "petition");
                var preview = svc.PreviewClean(petition, false, 1);
                svc.ApplyClean(petition, false, 1, (string)preview["fingerprint"]);
                Assert.Equal("Times New Roman", Para(doc, 10).Range.Font.Name);

                object times = 1;
                Assert.True(doc.Undo(ref times));
                Assert.Equal("Calibri", Para(doc, 10).Range.Font.Name);
                Assert.Equal(11f, Para(doc, 10).Range.Font.Size);
                Assert.Equal(W.WdLineSpacing.wdLineSpaceDouble, Para(doc, 10).LineSpacingRule);
                Assert.Equal(W.WdParagraphAlignment.wdAlignParagraphLeft, Para(doc, 10).Alignment);
                Assert.Equal(0f, Para(doc, 10).FirstLineIndent, 1);
            }
            finally { Close(doc); }
        }

        [Fact]
        public void Restore_puts_back_previous_formatting_and_refuses_after_edits()
        {
            var doc = Petition();
            try
            {
                var svc = new AbService(_w.App, _w.Engine);
                var petition = Profile(_w.Engine, "petition");
                var r = svc.ApplyClean(petition, false, 1, (string)svc.PreviewClean(petition, false, 1)["fingerprint"]);
                var restored = svc.RestoreFormatting((JObject)r["restorePoint"]);
                Assert.True((bool)restored["ok"]);
                Assert.Equal("Calibri", Para(doc, 10).Range.Font.Name);
                Assert.Equal(W.WdLineSpacing.wdLineSpaceDouble, Para(doc, 10).LineSpacingRule);

                var r2 = svc.ApplyClean(petition, false, 1, (string)svc.PreviewClean(petition, false, 1)["fingerprint"]);
                Para(doc, 9).Range.InsertBefore("Edited. ");
                var refused = svc.RestoreFormatting((JObject)r2["restorePoint"]);
                Assert.Equal("changed", (string)refused["reason"]);
            }
            finally { Close(doc); }
        }

        [Fact]
        public void Nothing_is_applied_when_the_document_changed_after_preview()
        {
            var doc = Petition();
            try
            {
                var svc = new AbService(_w.App, _w.Engine);
                var petition = Profile(_w.Engine, "petition");
                var preview = svc.PreviewClean(petition, false, 1);
                Para(doc, 9).Range.InsertBefore("Amended: ");
                var r = svc.ApplyClean(petition, false, 1, (string)preview["fingerprint"]);
                Assert.True((bool)r["stale"]);
                Assert.Equal("Calibri", Para(doc, 10).Range.Font.Name);
            }
            finally { Close(doc); }
        }

        [Fact]
        public void Extra_blank_lines_are_removed_safely_and_text_check_accounts_for_them()
        {
            var doc = Petition();
            try
            {
                var svc = new AbService(_w.App, _w.Engine);
                var petition = Profile(_w.Engine, "petition");
                int before = doc.Paragraphs.Count;
                var preview = svc.PreviewClean(petition, true, 1);
                Assert.Equal(2, (int)preview["blankCandidates"]);
                var r = svc.ApplyClean(petition, true, 1, (string)preview["fingerprint"]);
                Assert.Equal(2, ((JArray)r["removed"]).Count);
                Assert.True((bool)r["verification"]["ok"], (string)r["verification"]["message"]);
                Assert.Equal(before - 2, doc.Paragraphs.Count);
            }
            finally { Close(doc); }
        }

        [Fact]
        public void Page_layout_sets_A4_margins_in_real_Word_and_restores_them()
        {
            var doc = Petition();
            try
            {
                var svc = new AbService(_w.App, _w.Engine);
                var store = File.ReadAllText(Path.Combine(Connect.InstallDirectory, "layouts.json"));
                var sc = (JObject)_w.Engine.CallJson("abResolveLayout", store, "sc_a4_2020");
                var origLeft = doc.Sections[1].PageSetup.LeftMargin;
                var r = svc.ApplyPageLayout(sc);
                var ps = doc.Sections[1].PageSetup;
                Assert.Equal(595.3f, ps.PageWidth, 0);
                Assert.Equal(841.9f, ps.PageHeight, 0);
                Assert.Equal(113.4f, ps.LeftMargin, 0);
                Assert.Equal(56.7f, ps.TopMargin, 0);
                var back = svc.RestorePageLayout((JArray)r["before"]);
                Assert.True((bool)back["ok"]);
                Assert.Equal(origLeft, doc.Sections[1].PageSetup.LeftMargin, 1);
            }
            finally { Close(doc); }
        }

        /// <summary>Distance (points) from the top of the page to the start of the given page's text.</summary>
        private static float TopOfTextOnPage(W.Document doc, int page)
        {
            object what = W.WdGoToItem.wdGoToPage, which = W.WdGoToDirection.wdGoToAbsolute, count = page, missing = Type.Missing;
            var r = doc.Range(0, 0).GoTo(ref what, ref which, ref count, ref missing);
            object pos = r.get_Information(W.WdInformation.wdVerticalPositionRelativeToPage);
            return Convert.ToSingle(pos);
        }

        private W.Document LongAffidavit()
        {
            var doc = _w.App.Documents.Add();
            var para = "That the deponent states that the contents of the accompanying application are true and correct to the best of knowledge and belief and nothing material has been concealed therefrom.";
            doc.Content.Text = string.Join("\r", Enumerable.Range(1, 120).Select(i => $"{i}. {para}"));
            // Page numbers in the footer, as in most affidavits.
            var footer = doc.Sections[1].Footers[W.WdHeaderFooterIndex.wdHeaderFooterPrimary];
            object align = W.WdPageNumberAlignment.wdAlignPageNumberCenter, firstPage = true;
            footer.PageNumbers.Add(ref align, ref firstPage);
            doc.UndoClear();
            return doc;
        }

        [Fact]
        public void Affidavit_layout_leaves_stamp_space_on_page_1_only_without_section_breaks()
        {
            var doc = LongAffidavit();
            try
            {
                Assert.Equal(1, doc.Sections.Count);
                Assert.True(doc.ComputeStatistics(W.WdStatistic.wdStatisticPages) > 5);
                var texts = WordReader.ReadTexts(doc);
                var svc = new AbService(_w.App, _w.Engine);
                var store = File.ReadAllText(Path.Combine(Connect.InstallDirectory, "layouts.json"));
                var affidavit = (JObject)_w.Engine.CallJson("abResolveLayout", store, "affidavit");

                var r = svc.ApplyPageLayout(affidavit);
                Assert.Empty((JArray)r["notes"]);
                Assert.Single((JArray)r["info"]);
                Assert.Equal(1, doc.Sections.Count);                 // no section break inserted
                Assert.Equal(texts, WordReader.ReadTexts(doc));       // no text changed
                Assert.Equal(72f, doc.Sections[1].PageSetup.TopMargin, 0);
                Assert.InRange(TopOfTextOnPage(doc, 1), 460f, 480f);  // 468 pt = 16.5 cm stamp space
                Assert.InRange(TopOfTextOnPage(doc, 2), 70f, 80f);    // normal margin from page 2
                var firstFooter = doc.Sections[1].Footers[W.WdHeaderFooterIndex.wdHeaderFooterFirstPage];
                Assert.True(firstFooter.Range.Fields.Count > 0, "page number kept on page 1");

                // Applying again does not stack a second spacer.
                svc.ApplyPageLayout(affidavit);
                Assert.InRange(TopOfTextOnPage(doc, 1), 460f, 480f);

                // Switching to a normal layout removes the stamp space.
                var a4 = (JObject)_w.Engine.CallJson("abResolveLayout", store, "hc_new");
                var r2 = svc.ApplyPageLayout(a4);
                Assert.Contains("removed", (string)((JArray)r2["info"])[0]);
                Assert.InRange(TopOfTextOnPage(doc, 1), 70f, 80f);
                Assert.Equal(0, doc.Sections[1].PageSetup.DifferentFirstPageHeaderFooter); // page 1 fully reverted (a letterhead header would show again)

                // Restore puts back the page as it was before the affidavit layout.
                var r3 = svc.ApplyPageLayout(affidavit);
                Assert.InRange(TopOfTextOnPage(doc, 1), 460f, 480f);
                var back = svc.RestorePageLayout(r3["restore"]);
                Assert.True((bool)back["ok"]);
                Assert.InRange(TopOfTextOnPage(doc, 1), 70f, 80f);
                Assert.Equal(0, doc.Sections[1].PageSetup.DifferentFirstPageHeaderFooter); // as before
                Assert.Equal(texts, WordReader.ReadTexts(doc));
            }
            finally { Close(doc); }
        }

        [Fact]
        public void One_Undo_reverses_the_affidavit_layout()
        {
            var doc = LongAffidavit();
            try
            {
                var svc = new AbService(_w.App, _w.Engine);
                var store = File.ReadAllText(Path.Combine(Connect.InstallDirectory, "layouts.json"));
                svc.ApplyPageLayout((JObject)_w.Engine.CallJson("abResolveLayout", store, "affidavit"));
                Assert.InRange(TopOfTextOnPage(doc, 1), 460f, 480f);
                object once = 1;
                doc.Undo(ref once);
                Assert.InRange(TopOfTextOnPage(doc, 1), 60f, 80f);
                Assert.Equal(0, doc.Sections[1].PageSetup.DifferentFirstPageHeaderFooter);
            }
            finally { Close(doc); }
        }

        [Fact]
        public void Kruti_Dev_converts_only_Kruti_words_and_keeps_English_and_bold()
        {
            var doc = _w.App.Documents.Add();
            try
            {
                doc.Content.Text = "Petition U;k;ky; esa Section 302";
                var all = doc.Paragraphs[1].Range;
                all.Font.Name = "Times New Roman";
                var k = all.Start + all.Text.IndexOf("U;k;ky;", StringComparison.Ordinal);
                var kr = doc.Range(k, k + "U;k;ky; esa".Length);
                kr.Font.Name = "Kruti Dev 010";
                doc.Range(k, k + 7).Font.Bold = 1;

                var svc = new AbService(_w.App, _w.Engine);
                var dry = svc.Hindi("toUnicode", "document", true, "Mangal");
                Assert.Equal(2, (int)dry["toConvert"]);
                Assert.Equal("Petition U;k;ky; esa Section 302", WordReader.CleanText(doc.Paragraphs[1].Range.Text));

                var r = svc.Hindi("toUnicode", "document", false, "Mangal");
                Assert.Equal(2, (int)r["converted"]);
                var text = WordReader.CleanText(doc.Paragraphs[1].Range.Text);
                Assert.Equal("Petition न्यायालय में Section 302", text);
                var start = doc.Paragraphs[1].Range.Start;
                Assert.Equal("Times New Roman", doc.Range(start, start + 8).Font.Name);
                var u = start + text.IndexOf("न्यायालय", StringComparison.Ordinal);
                Assert.Equal("Mangal", doc.Range(u, u + 8).Font.Name);
                Assert.Equal(-1, doc.Range(u, u + 8).Font.Bold);

                // One Undo reverses the whole conversion.
                object once = 1;
                doc.Undo(ref once);
                Assert.Equal("Petition U;k;ky; esa Section 302", WordReader.CleanText(doc.Paragraphs[1].Range.Text));

                // And back again: Unicode -> Kruti Dev.
                svc.Hindi("toUnicode", "document", false, "Mangal");
                var back = svc.Hindi("toKruti", "document", false, "Kruti Dev 010");
                Assert.Equal(2, (int)back["converted"]);
                Assert.Equal("Petition U;k;ky; esa Section 302", WordReader.CleanText(doc.Paragraphs[1].Range.Text));
            }
            finally { Close(doc); }
        }

        [Fact]
        public void Show_selects_the_paragraph()
        {
            var doc = Petition();
            try
            {
                var svc = new AbService(_w.App, _w.Engine);
                Assert.True(svc.ShowParagraph(11, "4. That the impugned"));
                Assert.Equal(Para(doc, 11).Range.Start, _w.App.Selection.Start);
                Assert.False(svc.ShowParagraph(11, "something else"));
            }
            finally { Close(doc); }
        }
    }
}
