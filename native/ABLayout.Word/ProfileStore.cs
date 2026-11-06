/*
File: ProfileStore.cs
Path: /native/ABLayout.Word/ProfileStore.cs
Project: AB Layout (Advocate Benefit Layout)
Developed by PrajnaBytes International Private Limited and RatioJuris
Copyright (C) 2026 PrajnaBytes International Private Limited and RatioJuris
SPDX-License-Identifier: GPL-3.0-or-later
Additional terms under GPLv3 section 7 apply (attribution and names) - see NOTICE.

Custom profiles saved in %APPDATA%\AB Layout\profiles.json, in the same
format as the web add-in's "Share profiles" export, so profiles can be moved
between the two versions. Settings only - never document text.
*/

using System;
using System.Collections.Generic;
using System.IO;
using System.Linq;
using ABLayout.Word.Engine;
using Newtonsoft.Json.Linq;

namespace ABLayout.Word
{
    public sealed class ProfileStore
    {
        private readonly string _file;

        public ProfileStore(string file = null)
        {
            _file = file ?? Path.Combine(Environment.GetFolderPath(Environment.SpecialFolder.ApplicationData), "AB Layout", "profiles.json");
        }

        public string FilePath => _file;

        public List<JObject> Custom()
        {
            try
            {
                if (!File.Exists(_file)) return new List<JObject>();
                var data = JObject.Parse(File.ReadAllText(_file));
                return ((JArray)data["profiles"] ?? new JArray()).OfType<JObject>().ToList();
            }
            catch { return new List<JObject>(); }
        }

        public List<JObject> AllProfiles(AbEngine engine)
        {
            var builtIn = ((JArray)engine.CallJson("abProfiles")).OfType<JObject>().ToList();
            return builtIn.Concat(Custom()).ToList();
        }

        private void Save(List<JObject> list)
        {
            Directory.CreateDirectory(Path.GetDirectoryName(_file));
            var data = new JObject { ["format"] = "ab-layout-profiles", ["version"] = 1, ["profiles"] = new JArray(list) };
            File.WriteAllText(_file, data.ToString());
        }

        /// <returns>Validation errors (empty when saved).</returns>
        public List<string> Upsert(JObject profile, AbEngine engine)
        {
            profile["builtIn"] = false;
            var v = engine.CallJson("abValidateProfile", profile.ToString());
            if (!(bool)v["valid"]) return ((JArray)v["errors"]).Select(e => (string)e).ToList();
            var list = Custom().Where(p => (string)p["id"] != (string)profile["id"]).ToList();
            list.Add(profile);
            Save(list);
            return new List<string>();
        }

        public void Remove(string id) => Save(Custom().Where(p => (string)p["id"] != id).ToList());

        public string ExportText() =>
            new JObject { ["format"] = "ab-layout-profiles", ["version"] = 1, ["profiles"] = new JArray(Custom()) }.ToString();

        /// <returns>(imported, rejected, error)</returns>
        public Tuple<int, int, string> Import(string text, AbEngine engine)
        {
            JObject data;
            try { data = JObject.Parse(text); }
            catch { return Tuple.Create(0, 0, "This file is not an AB Layout profile export."); }
            if ((string)data["format"] != "ab-layout-profiles" || !(data["profiles"] is JArray incoming) || incoming.Count == 0)
                return Tuple.Create(0, 0, "No AB Layout profiles found in this file.");
            var list = Custom();
            int ok = 0, bad = 0;
            foreach (var p in incoming.OfType<JObject>())
            {
                p["builtIn"] = false;
                if (!(bool)engine.CallJson("abValidateProfile", p.ToString())["valid"]) { bad++; continue; }
                list.RemoveAll(x => (string)x["id"] == (string)p["id"]);
                list.Add(p);
                ok++;
            }
            Save(list);
            return Tuple.Create(ok, bad, (string)null);
        }
    }
}
