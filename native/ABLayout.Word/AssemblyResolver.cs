/*
File: AssemblyResolver.cs
Path: /native/ABLayout.Word/AssemblyResolver.cs
Project: AB Layout (Advocate Benefit Layout)
Developed by PrajnaBytes International Private Limited and RatioJuris
Copyright (C) 2026 PrajnaBytes International Private Limited and RatioJuris
SPDX-License-Identifier: GPL-3.0-or-later
Additional terms under GPLv3 section 7 apply (attribution and names) - see NOTICE.

Word loads COM add-ins with WINWORD.EXE's folder as the application base,
so .NET would not find AB Layout's own libraries (Jint, Newtonsoft.Json...)
next to ABLayout.Word.dll. This resolver, installed by a module initializer
before any other AB Layout code runs, loads them from the add-in's folder.
*/

using System;
using System.IO;
using System.Reflection;

namespace System.Runtime.CompilerServices
{
    [AttributeUsage(AttributeTargets.Method, Inherited = false)]
    internal sealed class ModuleInitializerAttribute : Attribute { }
}

namespace ABLayout.Word
{
    internal static class AssemblyResolver
    {
        private static bool _installed;

        [System.Runtime.CompilerServices.ModuleInitializer]
        internal static void Install()
        {
            if (_installed) return;
            _installed = true;
            AppDomain.CurrentDomain.AssemblyResolve += Resolve;
        }

        private static Assembly Resolve(object sender, ResolveEventArgs args)
        {
            try
            {
                var dir = Path.GetDirectoryName(new Uri(typeof(AssemblyResolver).Assembly.CodeBase).LocalPath);
                var file = Path.Combine(dir, new AssemblyName(args.Name).Name + ".dll");
                return File.Exists(file) ? Assembly.LoadFrom(file) : null;
            }
            catch
            {
                return null;
            }
        }
    }
}
