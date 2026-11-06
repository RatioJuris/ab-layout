/*
File: AddInApi.cs
Path: /native/ABLayout.Word/AddInApi.cs
Project: AB Layout (Advocate Benefit Layout)
Developed by PrajnaBytes International Private Limited and RatioJuris
Copyright (C) 2026 PrajnaBytes International Private Limited and RatioJuris
SPDX-License-Identifier: GPL-3.0-or-later
Additional terms under GPLv3 section 7 apply (attribution and names) - see NOTICE.

Automation interface (Application.COMAddIns("ABLayout.Connect").Object).
Used by the automated tests to drive the installed add-in inside real Word.
Every method returns JSON; errors are returned as {"error": "..."}.
*/

using System;
using System.IO;
using System.Linq;
using System.Runtime.InteropServices;
using ABLayout.Word.Office;
using Newtonsoft.Json.Linq;

namespace ABLayout.Word
{
    [ComVisible(true)]
    [Guid("EE7D7DDB-1737-478E-B079-DA9B24590356")]
    [ClassInterface(ClassInterfaceType.AutoDispatch)]
    public sealed class AddInApi
    {
        private readonly Connect _connect;

        internal AddInApi(Connect connect) { _connect = connect; }

        private string Run(Func<JToken> f)
        {
            try { return _connect.OnUiThread(f).ToString(Newtonsoft.Json.Formatting.None); }
            catch (Exception ex) { return new JObject { ["error"] = ex.Message }.ToString(Newtonsoft.Json.Formatting.None); }
        }

        private JObject Profile(string id)
        {
            var store = new ProfileStore();
            var all = store.AllProfiles(_connect.CreateService().Engine);
            return all.FirstOrDefault(p => (string)p["id"] == id) ?? throw new AbUserException("Unknown profile " + id);
        }

        public string Version() => "4.0.0";

        /// <summary>Opens the task pane on the active window (used by the installation test).</summary>
        public string ShowPane(string tab) => Run(() => new JObject { ["shown"] = _connect.ShowPane(tab) });

        /// <summary>Clicks / ticks / selects a control in the open pane by its visible text (UI automation).</summary>
        public string PaneAct(string text) => Run(() => new JObject { ["done"] = _connect.PaneAct(text) });

        public string Inspect() => Run(() => _connect.CreateService().Inspect(Enumerable.Empty<string>()));

        public string Preview(string profileId, bool removeBlankLines, int keep) =>
            Run(() => _connect.CreateService().PreviewClean(Profile(profileId), removeBlankLines, keep));

        public string Apply(string profileId, bool removeBlankLines, int keep, string fingerprint) =>
            Run(() => _connect.CreateService().ApplyClean(Profile(profileId), removeBlankLines, keep, fingerprint));

        public string Restore(string restorePointJson) =>
            Run(() => _connect.CreateService().RestoreFormatting(JObject.Parse(restorePointJson)));

        public string ApplyPageLayout(string layoutId) => Run(() =>
        {
            var svc = _connect.CreateService();
            var store = File.ReadAllText(Path.Combine(Connect.InstallDirectory, "layouts.json"));
            var layout = svc.Engine.CallJson("abResolveLayout", store, layoutId);
            if (layout.Type == JTokenType.Null) throw new AbUserException("Unknown layout " + layoutId);
            return svc.ApplyPageLayout((JObject)layout);
        });

        public string Hindi(string direction, string scope, bool dryRun, string font) =>
            Run(() => _connect.CreateService().Hindi(direction, scope, dryRun, font));
    }
}
