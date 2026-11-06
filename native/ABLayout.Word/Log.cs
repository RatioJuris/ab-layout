/*
File: Log.cs
Path: /native/ABLayout.Word/Log.cs
Project: AB Layout (Advocate Benefit Layout)
Developed by PrajnaBytes International Private Limited and RatioJuris
Copyright (C) 2026 PrajnaBytes International Private Limited and RatioJuris
SPDX-License-Identifier: GPL-3.0-or-later
Additional terms under GPLv3 section 7 apply (attribution and names) - see NOTICE.

Minimal diagnostic log at %LOCALAPPDATA%\AB Layout\ab-layout.log for start-up
problems. Never contains document text. Kept small (truncated at 256 KB).
*/

using System;
using System.IO;

namespace ABLayout.Word
{
    internal static class Log
    {
        private static readonly string File = Path.Combine(Environment.GetFolderPath(Environment.SpecialFolder.LocalApplicationData), "AB Layout", "ab-layout.log");

        public static void Write(string where, Exception ex = null)
        {
            try
            {
                Directory.CreateDirectory(Path.GetDirectoryName(File));
                if (System.IO.File.Exists(File) && new FileInfo(File).Length > 256 * 1024) System.IO.File.Delete(File);
                var line = $"{DateTime.Now:yyyy-MM-dd HH:mm:ss} {where}" + (ex == null ? "" : $": {ex.GetType().Name}: {ex.Message}");
                System.IO.File.AppendAllText(File, line + Environment.NewLine);
            }
            catch { /* logging must never break Word */ }
        }
    }
}
