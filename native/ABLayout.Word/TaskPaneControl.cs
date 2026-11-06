/*
File: TaskPaneControl.cs
Path: /native/ABLayout.Word/TaskPaneControl.cs
Project: AB Layout (Advocate Benefit Layout)
Developed by PrajnaBytes International Private Limited and RatioJuris
Copyright (C) 2026 PrajnaBytes International Private Limited and RatioJuris
SPDX-License-Identifier: GPL-3.0-or-later
Additional terms under GPLv3 section 7 apply (attribution and names) - see NOTICE.

The AB Layout task pane (docked inside Word). Same tabs and wording as the
web add-in: Check, Clean, Hindi, Page, Profiles. The footer attribution is
required by the additional terms in NOTICE (GPLv3 section 7(b)).
*/

using System;
using System.Collections.Generic;
using System.Drawing;
using System.IO;
using System.Linq;
using System.Runtime.InteropServices;
using System.Windows.Forms;
using ABLayout.Word.Office;
using Newtonsoft.Json.Linq;

namespace ABLayout.Word
{
    [ComVisible(true)]
    [Guid("DE4D7DDE-E8FA-4184-ACA5-DB4F54928BFA")]
    [ProgId("ABLayout.TaskPane")]
    [ClassInterface(ClassInterfaceType.AutoDispatch)]
    public partial class TaskPaneControl : UserControl
    {
        public const string Attribution = "Developed by PrajnaBytes International Private Limited and RatioJuris";

        private static readonly Color Navy = Color.FromArgb(11, 46, 107);
        private static readonly Color Blue = Color.FromArgb(15, 91, 184);
        private static readonly Color Muted = Color.FromArgb(95, 99, 104);
        private static readonly Color Problem = Color.FromArgb(180, 35, 24);
        private static readonly Color CheckCol = Color.FromArgb(154, 91, 0);
        private static readonly Color Info = Color.FromArgb(71, 84, 103);
        private static readonly Color Success = Color.FromArgb(18, 115, 58);
        private static readonly Color Card = Color.FromArgb(246, 248, 251);

        private Connect _connect;
        private readonly ProfileStore _store = new ProfileStore();
        private readonly TabControl _tabs = new TabControl();
        private readonly Dictionary<string, TabPage> _pages = new Dictionary<string, TabPage>();

        public TaskPaneControl()
        {
            AutoScaleMode = AutoScaleMode.Font;
            Font = new Font("Segoe UI", 9f);
            BackColor = Color.White;
            BuildShell();
        }

        internal void Initialize(Connect connect)
        {
            _connect = connect;
            BuildCheck();
            BuildClean();
            BuildHindi();
            BuildPage();
            BuildProfiles();
        }

        public void SelectTab(string tag)
        {
            if (tag != null && _pages.TryGetValue(tag, out var p)) _tabs.SelectedTab = p;
        }

        /* ===================== layout helpers ===================== */

        private void BuildShell()
        {
            var header = new Panel { Dock = DockStyle.Top, Height = 48, BackColor = Color.White, Padding = new Padding(8, 6, 8, 0) };
            var logo = new PictureBox { Size = new Size(32, 32), Location = new Point(8, 8), SizeMode = PictureBoxSizeMode.Zoom };
            try
            {
                using (var s = typeof(TaskPaneControl).Assembly.GetManifestResourceStream("ABLayout.icon-80.png"))
                    logo.Image = Image.FromStream(s);
            }
            catch { }
            var title = new Label { Text = "AB Layout", Font = new Font("Segoe UI Semibold", 12f), AutoSize = true, Location = new Point(46, 4), ForeColor = Navy };
            var sub = new Label { Text = "Advocate Benefit Layout", ForeColor = Muted, AutoSize = true, Location = new Point(47, 26) };
            header.Controls.AddRange(new Control[] { logo, title, sub });

            var footer = new Panel { Dock = DockStyle.Bottom, Height = 46, Padding = new Padding(8, 4, 8, 4), BackColor = Color.White };
            var attribution = new Label
            {
                Text = "AB Layout v4.0.0 \u00b7 " + Attribution,
                Dock = DockStyle.Top, Height = 30, ForeColor = Color.FromArgb(31, 31, 31),
                Font = new Font("Segoe UI Semibold", 8f), Name = "rjpbAttribution"
            };
            var meta = new Label { Text = "Works offline \u00b7 Your document never leaves Word \u00b7 GPL-3.0", Dock = DockStyle.Top, ForeColor = Muted, Font = new Font("Segoe UI", 7.5f) };
            footer.Controls.Add(meta);
            footer.Controls.Add(attribution);

            _tabs.Dock = DockStyle.Fill;
            foreach (var t in new[] { "Check", "Clean", "Hindi", "Page", "Profiles" })
            {
                var page = new TabPage(t) { BackColor = Color.White, Padding = new Padding(0) };
                _tabs.TabPages.Add(page);
                _pages[t.ToLowerInvariant()] = page;
            }
            Controls.Add(_tabs);
            Controls.Add(footer);
            Controls.Add(header);
        }

        private FlowLayoutPanel Stack(TabPage page)
        {
            var stack = new FlowLayoutPanel
            {
                Dock = DockStyle.Fill, FlowDirection = FlowDirection.TopDown, WrapContents = false,
                AutoScroll = true, Padding = new Padding(8, 8, 8, 8), BackColor = Color.White
            };
            stack.Resize += (s, e) => FitWidths(stack);
            stack.ControlAdded += (s, e) => FitWidths(stack);
            page.Controls.Add(stack);
            return stack;
        }

        private static void FitWidths(FlowLayoutPanel stack)
        {
            int w = Math.Max(120, stack.ClientSize.Width - stack.Padding.Horizontal - SystemInformation.VerticalScrollBarWidth);
            foreach (Control c in stack.Controls)
            {
                if (c is Label l && l.AutoSize) l.MaximumSize = new Size(w, 0);
                else if (c is FlowLayoutPanel f && f.AutoSize) { f.MaximumSize = new Size(w, 0); f.MinimumSize = new Size(w, 0); FitInner(f, w - f.Padding.Horizontal); }
                else c.Width = w;
            }
        }

        private static void FitInner(FlowLayoutPanel f, int w)
        {
            foreach (Control c in f.Controls)
                if (c is Label l && l.AutoSize) l.MaximumSize = new Size(w, 0);
        }

        private static Label Lbl(string text, Color? color = null, bool bold = false, float size = 9f)
        {
            return new Label
            {
                Text = text, AutoSize = true, ForeColor = color ?? Color.FromArgb(31, 31, 31),
                Font = new Font(bold ? "Segoe UI Semibold" : "Segoe UI", size), Margin = new Padding(0, 2, 0, 4)
            };
        }

        private static Button PrimaryButton(string text)
        {
            var b = new Button
            {
                Text = text, Height = 34, BackColor = Blue, ForeColor = Color.White, FlatStyle = FlatStyle.Flat,
                Font = new Font("Segoe UI Semibold", 9f), Margin = new Padding(0, 6, 0, 4), Cursor = Cursors.Hand
            };
            b.FlatAppearance.BorderSize = 0;
            return b;
        }

        private static Button SecondaryButton(string text)
        {
            var b = new Button { Text = text, Height = 32, FlatStyle = FlatStyle.Flat, Margin = new Padding(0, 4, 0, 4), BackColor = Color.FromArgb(243, 243, 243) };
            b.FlatAppearance.BorderColor = Color.FromArgb(217, 221, 227);
            return b;
        }

        private static FlowLayoutPanel CardPanel(Color accent)
        {
            var card = new FlowLayoutPanel
            {
                FlowDirection = FlowDirection.TopDown, WrapContents = false, AutoSize = true, AutoSizeMode = AutoSizeMode.GrowAndShrink,
                BackColor = Card, Padding = new Padding(10, 6, 8, 6), Margin = new Padding(0, 4, 0, 6)
            };
            card.Paint += (s, e) => { using (var b = new SolidBrush(accent)) e.Graphics.FillRectangle(b, 0, 0, 4, card.Height); };
            return card;
        }

        private void SetStatus(Label label, string text, Color? color = null)
        {
            label.Text = text;
            label.ForeColor = color ?? Muted;
            label.Refresh();
            try { _connect.Application.StatusBar = "AB Layout: " + text; } catch { }
        }

        /// <summary>Runs an action with a wait cursor; errors become plain-language messages.</summary>
        private void Busy(Label status, Button[] buttons, Action action)
        {
            foreach (var b in buttons) b.Enabled = false;
            Cursor = Cursors.WaitCursor;
            try { action(); }
            catch (AbUserException ex) { SetStatus(status, ex.Message, Problem); }
            catch (COMException ex) { SetStatus(status, FriendlyCom(ex), Problem); }
            catch (Exception ex) { SetStatus(status, "Something went wrong: " + ex.Message + " Save your document and try again.", Problem); }
            finally
            {
                Cursor = Cursors.Default;
                foreach (var b in buttons) b.Enabled = true;
                try { _connect.Application.StatusBar = ""; } catch { }
            }
        }

        private static string FriendlyCom(COMException ex)
        {
            var m = ex.Message ?? "";
            if (m.IndexOf("protect", StringComparison.OrdinalIgnoreCase) >= 0 || m.IndexOf("read-only", StringComparison.OrdinalIgnoreCase) >= 0)
                return "Word did not allow the change. The document may be read-only or protected. Click 'Enable Editing', save, and try again.";
            return "Word reported a problem (" + m + "). Save your document and try again.";
        }

        private AbService Service => _connect.CreateService();

        /* ===================== CHECK ===================== */

        private List<string> _textStarts = new List<string>();

        private void BuildCheck()
        {
            var s = Stack(_pages["check"]);
            s.Controls.Add(Lbl("Look for formatting problems and things to fix before printing or filing. Nothing in your document is changed."));
            var btn = PrimaryButton("Check Document");
            var status = Lbl("", Muted);
            var results = new FlowLayoutPanel { FlowDirection = FlowDirection.TopDown, WrapContents = false, AutoSize = true, AutoSizeMode = AutoSizeMode.GrowAndShrink, Margin = new Padding(0) };
            s.Controls.Add(btn);
            s.Controls.Add(status);
            s.Controls.Add(results);

            btn.Click += (o, e) => Busy(status, new[] { btn }, () =>
            {
                SetStatus(status, "Reading your document...");
                var r = Service.Inspect(CurrentProfile()?["protectedFonts"]?.Select(t => (string)t), m => SetStatus(status, m));
                _textStarts = ((JArray)r["textStarts"]).Select(t => (string)t).ToList();
                results.SuspendLayout();
                results.Controls.Clear();
                var st = (JObject)r["stats"];
                results.Controls.Add(Lbl($"{st["paragraphs"]} paragraphs ({st["bodyParagraphs"]} body, {st["blankLines"]} blank, {st["tables"]} in tables).", Muted));
                var findings = (JArray)r["findings"];
                if (findings.Count == 0) results.Controls.Add(Lbl("No problems found. Formatting looks consistent.", Success, true));
                foreach (JObject f in findings) results.Controls.Add(FindingCard(f, status));
                results.ResumeLayout();
                FitWidths(s);
                SetStatus(status, $"Check complete: {findings.Count} item(s) to look at.", Success);
            });
        }

        private Control FindingCard(JObject f, Label status)
        {
            var sev = (string)f["severity"];
            var color = sev == "problem" ? Problem : sev == "check" ? CheckCol : Info;
            var card = CardPanel(color);
            var label = sev == "problem" ? "FIX" : sev == "check" ? "CHECK" : "NOTE";
            card.Controls.Add(Lbl(label + "  " + (string)f["title"], color, true));
            card.Controls.Add(Lbl((string)f["detail"]));
            if (f["fixable"]?.Value<bool>() == true) card.Controls.Add(Lbl("Clean Document can fix this.", Muted));
            var paras = ((JArray)f["paragraphs"]).Select(t => (int)t).ToList();
            if (paras.Count > 0)
            {
                int cursor = 0;
                var link = new LinkLabel { Text = paras.Count > 1 ? $"Show (1 of {paras.Count})" : "Show", AutoSize = true, Margin = new Padding(0, 2, 0, 2) };
                link.LinkClicked += (o, e) =>
                {
                    var idx = paras[cursor];
                    cursor = (cursor + 1) % paras.Count;
                    if (paras.Count > 1) link.Text = $"Show next ({cursor + 1} of {paras.Count})";
                    try
                    {
                        if (!Service.ShowParagraph(idx, idx < _textStarts.Count ? _textStarts[idx] : null))
                            SetStatus(status, "The document has changed since the check. Please run Check Document again.", Problem);
                    }
                    catch (Exception ex) { SetStatus(status, ex.Message, Problem); }
                };
                card.Controls.Add(link);
            }
            return card;
        }

        /* ===================== CLEAN ===================== */

        private ComboBox _profileCombo;
        private Label _profileInfo;
        private JObject _preview;
        private JObject _previewProfile;
        private JObject _restorePoint;

        private List<JObject> AllProfiles() => _store.AllProfiles(Service.Engine);

        private JObject CurrentProfile()
        {
            if (_profileCombo == null || _profileCombo.SelectedItem == null) return null;
            return ((ProfileItem)_profileCombo.SelectedItem).Profile;
        }

        private sealed class ProfileItem
        {
            public JObject Profile;
            public override string ToString() => (string)Profile["name"];
        }

        private void FillProfiles(string selectId = null)
        {
            var all = AllProfiles();
            foreach (var combo in new[] { _profileCombo, _baseCombo })
            {
                if (combo == null) continue;
                var keep = selectId ?? ((combo.SelectedItem as ProfileItem)?.Profile["id"]?.ToString());
                combo.Items.Clear();
                foreach (var p in all) combo.Items.Add(new ProfileItem { Profile = p });
                var match = combo.Items.Cast<ProfileItem>().FirstOrDefault(i => (string)i.Profile["id"] == keep);
                combo.SelectedItem = match ?? combo.Items[0];
            }
        }

        private void BuildClean()
        {
            var s = Stack(_pages["clean"]);
            s.Controls.Add(Lbl("Make the formatting consistent. Words are never changed. Titles, VERSUS, party and signature lines, tables and Hindi text are only lightly touched."));
            s.Controls.Add(Lbl("Formatting profile", Muted, true));
            _profileCombo = new ComboBox { DropDownStyle = ComboBoxStyle.DropDownList, Margin = new Padding(0, 0, 0, 4) };
            s.Controls.Add(_profileCombo);
            _profileInfo = Lbl("", Color.FromArgb(31, 31, 31), false, 8.5f);
            s.Controls.Add(_profileInfo);

            var blank = new CheckBox { Text = "Remove extra blank lines (keep 1 in each group)", AutoSize = true, Margin = new Padding(0, 6, 0, 0) };
            s.Controls.Add(blank);
            s.Controls.Add(Lbl("Caution: blank lines left for signatures or stamps are also reduced.", CheckCol, false, 8f));

            var previewBtn = PrimaryButton("Preview Changes");
            var status = Lbl("", Muted);
            var preview = Lbl("", Color.FromArgb(31, 31, 31));
            var applyBtn = PrimaryButton("Apply These Changes");
            var result = Lbl("", Color.FromArgb(31, 31, 31));
            var restoreBtn = SecondaryButton("Restore Previous Formatting");
            applyBtn.Visible = false;
            restoreBtn.Visible = false;
            s.Controls.AddRange(new Control[] { previewBtn, status, preview, applyBtn, result, restoreBtn });
            s.Controls.Add(Lbl("Each Apply is one step in Word's Undo (Ctrl+Z). Saving first is always safest.", Muted, false, 8f));

            Action invalidate = () => { _preview = null; applyBtn.Visible = false; preview.Text = ""; };
            _profileCombo.SelectedIndexChanged += (o, e) =>
            {
                var p = CurrentProfile();
                if (p == null) return;
                var lines = ((JArray)Service.Engine.CallJson("abDescribe", p.ToString())).Select(t => "\u2022 " + (string)t);
                _profileInfo.Text = (string)p["description"] + "\n" + string.Join("\n", lines) + (p["source"] != null ? "\nSource: " + (string)p["source"] : "");
                invalidate();
            };
            blank.CheckedChanged += (o, e) => invalidate();
            FillProfiles();

            Action runPreview = () =>
            {
                SetStatus(status, "Reading your document...");
                _previewProfile = (JObject)CurrentProfile().DeepClone();
                _preview = Service.PreviewClean(_previewProfile, blank.Checked, 1, m => SetStatus(status, m));
                var plan = (JObject)_preview["plan"];
                int blanks = (int)_preview["blankCandidates"];
                preview.Text = PreviewText(plan, blanks);
                bool work = ((JArray)plan["changes"]).Count > 0 || blanks > 0;
                applyBtn.Visible = work;
                result.Text = "";
                SetStatus(status, work ? "Review the changes below, then press Apply." : "Nothing needs to change.", work ? Muted : Success);
                FitWidths(s);
            };

            previewBtn.Click += (o, e) => Busy(status, new[] { previewBtn, applyBtn }, runPreview);

            applyBtn.Click += (o, e) => Busy(status, new[] { previewBtn, applyBtn, restoreBtn }, () =>
            {
                if (_preview == null) return;
                SetStatus(status, "Applying...");
                var r = Service.ApplyClean(_previewProfile, blank.Checked, 1, (string)_preview["fingerprint"], m => SetStatus(status, m));
                if ((bool)r["stale"])
                {
                    SetStatus(status, "The document changed after the preview, so nothing was applied. Here is a fresh preview.", Problem);
                    runPreview();
                    return;
                }
                _preview = null;
                applyBtn.Visible = false;
                preview.Text = "";
                var v = (JObject)r["verification"];
                var failed = ((JArray)r["failed"]).Count;
                var removed = ((JArray)r["removed"]).Count;
                var kept = ((JArray)r["keptBlank"]).Count;
                result.Text = "Done\n\u2022 " + (int)r["applied"] + " paragraph(s) reformatted."
                    + (failed > 0 ? $"\n\u2022 {failed} paragraph(s) could not be changed (locked or protected)." : "")
                    + (removed > 0 ? $"\n\u2022 {removed} extra blank line(s) removed." : "")
                    + (kept > 0 ? $"\n\u2022 {kept} blank line(s) kept because they hold something." : "")
                    + "\n\n" + (string)v["message"]
                    + "\n\nOne press of Undo (Ctrl+Z) reverses all of this.";
                result.ForeColor = (bool)v["ok"] ? Success : Problem;
                _restorePoint = (JObject)r["restorePoint"];
                restoreBtn.Visible = ((JArray)_restorePoint["entries"]).Count > 0;
                SetStatus(status, (bool)v["ok"] ? "Formatting applied." : "Formatting applied - please read the warning below.", (bool)v["ok"] ? Success : Problem);
                FitWidths(s);
            });

            restoreBtn.Click += (o, e) => Busy(status, new[] { previewBtn, restoreBtn }, () =>
            {
                if (_restorePoint == null) return;
                var r = Service.RestoreFormatting(_restorePoint);
                if (r["reason"]?.ToString() == "changed")
                    SetStatus(status, "The document was edited after applying, so Restore is no longer safe. Use Word's Undo (Ctrl+Z) instead.", Problem);
                else
                    SetStatus(status, $"Previous formatting restored on {r["restored"]} paragraph(s)."
                        + ((int)_restorePoint["notRestorable"] > 0 ? $" {_restorePoint["notRestorable"]} paragraph(s) had mixed fonts that cannot be brought back - use Undo for those." : ""), Success);
                _restorePoint = null;
                restoreBtn.Visible = false;
            });
        }

        private string PreviewText(JObject plan, int blanks)
        {
            var labels = (JObject)Service.Engine.CallJson("abKindLabels");
            var t = (JObject)plan["targets"];
            var changes = (JArray)plan["changes"];
            var lines = new List<string>();
            lines.Add(changes.Count == 0 ? "Nothing to change" : $"{changes.Count} of {plan["totalParagraphs"]} paragraphs will be reformatted");
            var target = new List<string>();
            if (t["fontName"]?.Type == JTokenType.String) target.Add($"Font: {t["fontName"]}" + (t["fontSize"]?.Type != JTokenType.Null ? $", {t["fontSize"]} pt" : ""));
            if (t["lineSpacing"]?.Type != JTokenType.Null) target.Add("Line spacing: " + Service.Engine.Call("abLinesLabel", t["lineSpacing"].ToString()));
            if (t["alignment"]?.Type == JTokenType.String) target.Add($"Alignment: {t["alignment"]}");
            if (t["firstLineIndent"]?.Type != JTokenType.Null) target.Add("First-line indent: " + Service.Engine.Call("abPtToCm", t["firstLineIndent"].ToString()) + " cm");
            if (target.Count > 0) lines.Add("Target: " + string.Join(" | ", target));
            foreach (var kv in ((JObject)plan["changedKindCounts"]).Properties().OrderByDescending(p => (int)p.Value))
                lines.Add($"\u2022 {Capital((string)labels[kv.Name])}: {kv.Value}");

            var notes = new List<string>();
            var kept = (JArray)plan["fontKept"];
            if (kept.Count > 0)
                notes.Add($"{kept.Count} paragraph(s) keep their own font ({string.Join("; ", kept.Select(k => (string)k["reason"]).Distinct().Take(3))}).");
            if ((int)plan["mixedFontUnified"] > 0)
                notes.Add($"{plan["mixedFontUnified"]} paragraph(s) mix fonts or sizes and will become uniform. Bold, italics and underline are kept.");
            var counts = (JObject)plan["kindCounts"];
            var layoutKept = new[] { "centered", "right", "tabbed", "heading", "short" }.Where(k => counts[k] != null).Select(k => $"{labels[k]}: {counts[k]}").ToList();
            if (layoutKept.Count > 0) notes.Add("Layout kept (font only): " + string.Join(", ", layoutKept) + ".");
            if (counts["table"] != null) notes.Add($"Lines inside tables ({counts["table"]}): font only, table layout untouched.");
            if (blanks > 0) notes.Add($"Up to {blanks} extra blank line(s) will be removed (each is checked first).");
            if (notes.Count > 0) { lines.Add(""); lines.Add("Please note"); lines.AddRange(notes.Select(n => "\u2022 " + n)); }
            return string.Join("\n", lines);
        }

        private static string Capital(string s) => string.IsNullOrEmpty(s) ? s : char.ToUpper(s[0]) + s.Substring(1);

        /* ===================== HINDI ===================== */

        private static readonly string[] UnicodeFonts = { "Mangal", "Nirmala UI", "Kokila", "Aparajita", "Utsaah" };
        private static readonly string[] KrutiFonts = { "Kruti Dev 010", "Kruti Dev 040 Wide", "Kruti Dev 011" };

        private void BuildHindi()
        {
            var s = Stack(_pages["hindi"]);
            s.Controls.Add(Lbl("Convert Hindi between the old Kruti Dev font and Unicode. Only Hindi words are converted; English text, bold and italics stay as they are."));
            var toUnicode = new RadioButton { Text = "Kruti Dev \u2192 Unicode", Checked = true, AutoSize = true };
            var toKruti = new RadioButton { Text = "Unicode \u2192 Kruti Dev", AutoSize = true };
            var dirBox = new FlowLayoutPanel { FlowDirection = FlowDirection.TopDown, AutoSize = true, Margin = new Padding(0, 4, 0, 4) };
            dirBox.Controls.AddRange(new Control[] { toUnicode, toKruti });
            var selection = new RadioButton { Text = "Selected text", Checked = true, AutoSize = true };
            var whole = new RadioButton { Text = "Whole document", AutoSize = true };
            var scopeBox = new FlowLayoutPanel { FlowDirection = FlowDirection.TopDown, AutoSize = true, Margin = new Padding(0, 4, 0, 4) };
            scopeBox.Controls.AddRange(new Control[] { selection, whole });
            s.Controls.Add(Lbl("Convert", Muted, true));
            s.Controls.Add(dirBox);
            s.Controls.Add(Lbl("Which text", Muted, true));
            s.Controls.Add(scopeBox);
            s.Controls.Add(Lbl("Font for converted text", Muted, true));
            var font = new ComboBox { DropDownStyle = ComboBoxStyle.DropDownList };
            s.Controls.Add(font);
            var fontNote = Lbl("", Muted, false, 8f);
            s.Controls.Add(fontNote);
            var previewBtn = PrimaryButton("Preview Conversion");
            var status = Lbl("", Muted);
            var preview = Lbl("");
            preview.Font = new Font("Nirmala UI", 10f);
            var convertBtn = PrimaryButton("Convert Now");
            convertBtn.Visible = false;
            s.Controls.AddRange(new Control[] { previewBtn, status, preview, convertBtn });
            s.Controls.Add(Lbl("This changes the letters stored in the document. Save a copy first. One press of Undo (Ctrl+Z) reverses the whole conversion.", Muted, false, 8f));

            Action refreshFonts = () =>
            {
                font.Items.Clear();
                font.Items.AddRange(toUnicode.Checked ? UnicodeFonts : KrutiFonts);
                font.SelectedIndex = 0;
                fontNote.Text = toUnicode.Checked
                    ? "Mangal and Nirmala UI come with Windows."
                    : "Kruti Dev must be installed on every computer that opens the document.";
                preview.Text = "";
                convertBtn.Visible = false;
            };
            refreshFonts();
            toUnicode.CheckedChanged += (o, e) => refreshFonts();
            selection.CheckedChanged += (o, e) => { preview.Text = ""; convertBtn.Visible = false; };

            Func<string> dir = () => toUnicode.Checked ? "toUnicode" : "toKruti";
            Func<string> scope = () => selection.Checked ? "selection" : "document";

            previewBtn.Click += (o, e) => Busy(status, new[] { previewBtn, convertBtn }, () =>
            {
                SetStatus(status, "Looking for text to convert...");
                var r = Service.Hindi(dir(), scope(), true, (string)font.SelectedItem, m => SetStatus(status, m));
                preview.Text = HindiText(r, true, dir());
                convertBtn.Visible = (int)r["toConvert"] > 0;
                SetStatus(status, (int)r["toConvert"] > 0 ? "Check the sample, then press Convert Now."
                    : scope() == "selection" ? "Nothing to convert in the selection. Select the text first, or choose Whole document." : "Nothing to convert.");
                FitWidths(s);
            });

            convertBtn.Click += (o, e) => Busy(status, new[] { previewBtn, convertBtn }, () =>
            {
                SetStatus(status, "Converting...");
                var r = Service.Hindi(dir(), scope(), false, (string)font.SelectedItem, m => SetStatus(status, m));
                convertBtn.Visible = false;
                preview.Text = HindiText(r, false, dir());
                SetStatus(status, "Conversion finished. Please read through the converted text.", (int)r["failed"] > 0 ? Problem : Success);
                FitWidths(s);
            });
        }

        private static string HindiText(JObject r, bool dryRun, string direction)
        {
            var what = direction == "toUnicode" ? "Kruti Dev word(s)" : "Hindi word(s)";
            int count = dryRun ? (int)r["toConvert"] : (int)r["converted"];
            var lines = new List<string>
            {
                dryRun ? (count == 0 ? $"No {(direction == "toUnicode" ? "Kruti Dev text" : "Unicode Hindi text")} found in {r["paragraphsScanned"]} paragraph(s)." : $"{count} {what} will be converted.")
                       : $"{count} {what} converted."
            };
            var samples = ((JArray)r["samples"]).Select(t => (string)t).ToList();
            if (samples.Count > 0 && direction == "toUnicode") lines.Add("Sample result: " + string.Join("  ", samples));
            var sk = (JObject)r["skipped"];
            if ((int)sk["not-exact"] > 0) lines.Add($"\u2022 {sk["not-exact"]} word(s) could not be converted exactly and were left as they are.");
            if ((int)sk["mixed-font"] > 0) lines.Add($"\u2022 {sk["mixed-font"]} word(s) mix two fonts and were left as they are.");
            if ((int)sk["special"] > 0) lines.Add($"\u2022 {sk["special"]} word(s)/paragraph(s) contain a footnote mark, field or line break and were left as they are.");
            if (!dryRun && (int)r["failed"] > 0) lines.Add($"\u2022 {r["failed"]} word(s) could not be changed (locked or protected).");
            return string.Join("\n", lines);
        }

        /* ===================== PAGE ===================== */

        private void BuildPage()
        {
            var s = Stack(_pages["page"]);
            s.Controls.Add(Lbl("Paper size and margins."));
            s.Controls.Add(Lbl("Page layout", Muted, true));
            var combo = new ComboBox { DropDownStyle = ComboBoxStyle.DropDownList };
            s.Controls.Add(combo);
            var info = Lbl("", Color.FromArgb(31, 31, 31), false, 8.5f);
            s.Controls.Add(info);
            var applyBtn = PrimaryButton("Apply Page Layout");
            var status = Lbl("", Muted);
            var restoreBtn = SecondaryButton("Restore Previous Page Layout");
            restoreBtn.Visible = false;
            s.Controls.AddRange(new Control[] { applyBtn, status, restoreBtn });
            s.Controls.Add(Lbl("Presets are conveniences, not official rules. Check your court's current requirements.", Muted, false, 8f));

            string storeJson;
            try { storeJson = File.ReadAllText(Path.Combine(Connect.InstallDirectory, "layouts.json")); }
            catch { SetStatus(status, "Page layouts could not be loaded. Please reinstall AB Layout.", Problem); applyBtn.Enabled = false; return; }
            var store = JObject.Parse(storeJson);
            foreach (JObject l in (JArray)store["layouts"]) combo.Items.Add(new LayoutItem { Id = (string)l["id"], Name = (string)l["name"] });
            JArray before = null;

            Func<JObject> layout = () => (JObject)Service.Engine.CallJson("abResolveLayout", storeJson, ((LayoutItem)combo.SelectedItem).Id);
            combo.SelectedIndexChanged += (o, e) =>
            {
                var l = layout();
                var m = (JObject)(l["multiPage"]?.Value<bool>() == true ? l["otherPages"] : l["margins"]);
                Func<JToken, string> cm = v => Service.Engine.Call("abPtToCm", v.ToString()) + " cm";
                info.Text = $"Paper: {cm(l["width"])} x {cm(l["height"])}\nMargins: top {cm(m["top"])}, bottom {cm(m["bottom"])}, left {cm(m["left"])}, right {cm(m["right"])}"
                    + (l["multiPage"]?.Value<bool>() == true ? $"\nFirst page top margin: {cm(l["firstPage"]["top"])} (space for stamp paper)" : "")
                    + (l["note"] != null ? "\n" + (string)l["note"] : "");
            };
            combo.SelectedIndex = 0;

            applyBtn.Click += (o, e) => Busy(status, new[] { applyBtn, restoreBtn }, () =>
            {
                var l = layout();
                var r = Service.ApplyPageLayout(l);
                before = (JArray)r["before"];
                restoreBtn.Visible = true;
                var notes = ((JArray)r["notes"]).Select(t => (string)t).ToList();
                SetStatus(status, $"Applied \"{l["name"]}\" to {r["sections"]} section(s)." + (notes.Count > 0 ? " " + string.Join(" ", notes) : ""), notes.Count > 0 ? CheckCol : Success);
            });
            restoreBtn.Click += (o, e) => Busy(status, new[] { applyBtn, restoreBtn }, () =>
            {
                if (before == null) return;
                var r = Service.RestorePageLayout(before);
                SetStatus(status, (bool)r["ok"] ? "Previous paper size and margins restored." : "Sections were added or removed since, so the old layout cannot be restored safely. Use Undo.", (bool)r["ok"] ? Success : Problem);
                before = null;
                restoreBtn.Visible = false;
            });
        }

        private sealed class LayoutItem
        {
            public string Id, Name;
            public override string ToString() => Name;
        }

        /* ===================== PROFILES ===================== */

        private ComboBox _baseCombo;

        private void BuildProfiles()
        {
            var s = Stack(_pages["profiles"]);
            s.Controls.Add(Lbl($"Create your own profile. It is saved on this computer ({_store.FilePath})."));
            s.Controls.Add(Lbl("Start from", Muted, true));
            _baseCombo = new ComboBox { DropDownStyle = ComboBoxStyle.DropDownList };
            s.Controls.Add(_baseCombo);

            var fields = new Dictionary<string, TextBox>();
            Func<string, string, TextBox> field = (label, key) =>
            {
                s.Controls.Add(Lbl(label, Muted, true));
                var tb = new TextBox();
                s.Controls.Add(tb);
                fields[key] = tb;
                return tb;
            };
            field("Profile name", "name");
            field("Font (or 'match')", "fontName");
            field("Size in pt (or 'match')", "fontSize");
            field("Line spacing in lines, e.g. 1.5 (or 'match')", "lineSpacing");
            s.Controls.Add(Lbl("Alignment", Muted, true));
            var align = new ComboBox { DropDownStyle = ComboBoxStyle.DropDownList };
            align.Items.AddRange(new object[] { "Justified", "Left", "match" });
            s.Controls.Add(align);
            field("First-line indent in cm (or 'match')", "firstLineIndentCm");
            field("Space before in pt (or 'match')", "spaceBefore");
            field("Space after in pt (or 'match')", "spaceAfter");
            field("Left indent in cm (or 'match')", "leftIndentCm");
            field("Right indent in cm (or 'match')", "rightIndentCm");
            var quotes = new CheckBox { Text = "Format indented quotations separately", AutoSize = true };
            s.Controls.Add(quotes);
            field("Quotation size in pt", "qSize");
            field("Quotation line spacing", "qLine");
            var headings = new CheckBox { Text = "Use the same font for headings", AutoSize = true };
            var tables = new CheckBox { Text = "Use the same font inside tables", AutoSize = true };
            s.Controls.Add(headings);
            s.Controls.Add(tables);
            field("Never change these fonts (comma separated)", "protected");
            var saveBtn = PrimaryButton("Save Profile");
            var status = Lbl("", Muted);
            s.Controls.Add(saveBtn);
            s.Controls.Add(status);
            var list = new FlowLayoutPanel { FlowDirection = FlowDirection.TopDown, AutoSize = true, WrapContents = false };
            s.Controls.Add(list);
            var exportBtn = SecondaryButton("Export My Profiles to a File...");
            var importBtn = SecondaryButton("Import Profiles from a File...");
            s.Controls.Add(exportBtn);
            s.Controls.Add(importBtn);
            s.Controls.Add(Lbl("Exported files also work in the web version of AB Layout.", Muted, false, 8f));

            Func<JToken, string> show = v => v == null || v.Type == JTokenType.Null ? "" : v.ToString();
            Action<JObject> fill = p =>
            {
                var b = (JObject)p["body"];
                fields["name"].Text = (bool)p["builtIn"] ? "My " + (string)p["name"] : (string)p["name"];
                fields["fontName"].Text = show(b["fontName"]);
                fields["fontSize"].Text = show(b["fontSize"]);
                fields["lineSpacing"].Text = show(b["lineSpacing"]);
                align.SelectedItem = (string)b["alignment"];
                fields["firstLineIndentCm"].Text = show(b["firstLineIndentCm"]);
                fields["spaceBefore"].Text = show(b["spaceBefore"]);
                fields["spaceAfter"].Text = show(b["spaceAfter"]);
                fields["leftIndentCm"].Text = show(b["leftIndentCm"]);
                fields["rightIndentCm"].Text = show(b["rightIndentCm"]);
                quotes.Checked = (bool)p["quotes"]["enabled"];
                fields["qSize"].Text = show(p["quotes"]["fontSize"]);
                fields["qLine"].Text = show(p["quotes"]["lineSpacing"]);
                headings.Checked = (bool)p["headingsFont"];
                tables.Checked = (bool)p["tablesFont"];
                fields["protected"].Text = string.Join(", ", ((JArray)p["protectedFonts"]).Select(t => (string)t));
            };

            Action renderList = null;
            renderList = () =>
            {
                list.Controls.Clear();
                var custom = _store.Custom();
                list.Controls.Add(Lbl(custom.Count == 0 ? "You have no custom profiles yet." : "My profiles", Muted, custom.Count > 0));
                foreach (var p in custom)
                {
                    var row = new FlowLayoutPanel { AutoSize = true, FlowDirection = FlowDirection.LeftToRight, WrapContents = false, Margin = new Padding(0) };
                    var del = new Button { Text = "Delete", AutoSize = true, FlatStyle = FlatStyle.Flat };
                    var id = (string)p["id"];
                    del.Click += (o, e) => { _store.Remove(id); FillProfiles(); renderList(); };
                    row.Controls.Add(new Label { Text = (string)p["name"], AutoSize = true, Margin = new Padding(0, 6, 8, 0) });
                    row.Controls.Add(del);
                    list.Controls.Add(row);
                }
            };

            _baseCombo.SelectedIndexChanged += (o, e) => { if (_baseCombo.SelectedItem is ProfileItem pi) fill(pi.Profile); };
            FillProfiles();
            renderList();

            Func<string, JToken> val = text =>
            {
                var t = (text ?? "").Trim().ToLowerInvariant();
                if (t == "match") return "match";
                double d;
                return double.TryParse(t.Replace(",", "."), System.Globalization.NumberStyles.Float, System.Globalization.CultureInfo.InvariantCulture, out d) ? (JToken)d : JValue.CreateNull();
            };

            saveBtn.Click += (o, e) => Busy(status, new[] { saveBtn }, () =>
            {
                var basis = ((ProfileItem)_baseCombo.SelectedItem).Profile;
                var name = fields["name"].Text.Trim();
                var p = (bool)basis["builtIn"]
                    ? (JObject)Service.Engine.CallJson("abCreateCustom", basis.ToString(), name)
                    : (JObject)basis.DeepClone();
                p["name"] = name;
                var font = fields["fontName"].Text.Trim();
                p["body"] = new JObject
                {
                    ["fontName"] = font.ToLowerInvariant() == "match" ? "match" : font,
                    ["fontSize"] = val(fields["fontSize"].Text),
                    ["alignment"] = (string)align.SelectedItem,
                    ["lineSpacing"] = val(fields["lineSpacing"].Text),
                    ["spaceBefore"] = val(fields["spaceBefore"].Text),
                    ["spaceAfter"] = val(fields["spaceAfter"].Text),
                    ["firstLineIndentCm"] = val(fields["firstLineIndentCm"].Text),
                    ["leftIndentCm"] = val(fields["leftIndentCm"].Text),
                    ["rightIndentCm"] = val(fields["rightIndentCm"].Text)
                };
                var qs = val(fields["qSize"].Text);
                var ql = val(fields["qLine"].Text);
                p["quotes"] = new JObject
                {
                    ["enabled"] = quotes.Checked,
                    ["fontSize"] = qs.Type == JTokenType.Null ? "match" : qs,
                    ["lineSpacing"] = ql.Type == JTokenType.Null ? "match" : ql
                };
                p["headingsFont"] = headings.Checked;
                p["tablesFont"] = tables.Checked;
                p["protectedFonts"] = new JArray(fields["protected"].Text.Split(',').Select(x => x.Trim()).Where(x => x.Length > 0));
                var errors = _store.Upsert(p, Service.Engine);
                if (errors.Count > 0) { SetStatus(status, string.Join(" ", errors), Problem); return; }
                FillProfiles((string)p["id"]);
                renderList();
                SetStatus(status, $"Saved \"{name}\". It is now selected in the Clean tab.", Success);
            });

            exportBtn.Click += (o, e) =>
            {
                using (var dlg = new SaveFileDialog { Filter = "AB Layout profiles (*.json)|*.json", FileName = "ab-layout-profiles.json" })
                    if (dlg.ShowDialog() == DialogResult.OK) { File.WriteAllText(dlg.FileName, _store.ExportText()); SetStatus(status, "Profiles exported.", Success); }
            };
            importBtn.Click += (o, e) => Busy(status, new[] { importBtn }, () =>
            {
                using (var dlg = new OpenFileDialog { Filter = "AB Layout profiles (*.json)|*.json|All files|*.*" })
                {
                    if (dlg.ShowDialog() != DialogResult.OK) return;
                    var r = _store.Import(File.ReadAllText(dlg.FileName), Service.Engine);
                    if (r.Item3 != null) { SetStatus(status, r.Item3, Problem); return; }
                    FillProfiles();
                    renderList();
                    SetStatus(status, $"Imported {r.Item1} profile(s)." + (r.Item2 > 0 ? $" {r.Item2} were invalid and skipped." : ""), Success);
                }
            });
        }
    }
}
