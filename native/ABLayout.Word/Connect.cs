/*
File: Connect.cs
Path: /native/ABLayout.Word/Connect.cs
Project: AB Layout (Advocate Benefit Layout)
Developed by PrajnaBytes International Private Limited and RatioJuris
Copyright (C) 2026 PrajnaBytes International Private Limited and RatioJuris
SPDX-License-Identifier: GPL-3.0-or-later
Additional terms under GPLv3 section 7 apply (attribution and names) - see NOTICE.

The COM add-in Word loads at start-up (registered per user under
HKCU\Software\Microsoft\Office\Word\Addins\ABLayout.Connect).
Provides the "AB Layout" ribbon tab and a docked task pane per window.
The GUIDs and ProgIDs below must never change.
*/

using System;
using System.Collections.Generic;
using System.Drawing;
using System.IO;
using System.Reflection;
using System.Runtime.InteropServices;
using System.Threading.Tasks;
using System.Windows.Forms;
using ABLayout.Word.Engine;
using ABLayout.Word.Office;
using Microsoft.Office.Core;
using W = Microsoft.Office.Interop.Word;

namespace ABLayout.Word
{
    [ComVisible(true)]
    [Guid("092F8839-CC6E-49D3-AE33-00BD57D4D9F1")]
    [ProgId("ABLayout.Connect")]
    [ClassInterface(ClassInterfaceType.AutoDispatch)] // ribbon callbacks are found through IDispatch
    public sealed class Connect : Extensibility.IDTExtensibility2, IRibbonExtensibility, ICustomTaskPaneConsumer
    {
        public const string TaskPaneProgId = "ABLayout.TaskPane";

        private W.Application _app;
        private ICTPFactory _ctpFactory;
        private IRibbonUI _ribbon;
        private readonly Dictionary<int, CustomTaskPane> _panes = new Dictionary<int, CustomTaskPane>();
        private Task<AbEngine> _engineTask;
        private AddInApi _api;
        private Control _ui;

        /// <summary>Runs code on Word's UI thread (Word objects and task panes must only be used there).</summary>
        internal T OnUiThread<T>(Func<T> work) => _ui != null && _ui.InvokeRequired ? (T)_ui.Invoke(work) : work();

        public static string InstallDirectory => Path.GetDirectoryName(new Uri(Assembly.GetExecutingAssembly().CodeBase).LocalPath);

        /* ===== IDTExtensibility2 ===== */

        public Connect()
        {
            Log.Write("Connect: created");
        }

        public void OnConnection(object application, Extensibility.ext_ConnectMode connectMode, object addInInst, ref Array custom)
        {
            Log.Write("OnConnection: start (" + connectMode + ")");
            try
            {
                _app = (W.Application)application;
                // Start loading the shared rules in the background so the pane opens quickly.
                _engineTask = Task.Run(() => new AbEngine(Path.Combine(InstallDirectory, "core")));
                _api = new AddInApi(this);
            }
            catch (Exception ex) { Log.Write("OnConnection: setup", ex); }

            try
            {
                // A window handle on Word's UI thread: automation calls arrive on other threads and are moved here.
                _ui = new Control();
                _ui.CreateControl();
            }
            catch (Exception ex) { Log.Write("OnConnection: UI thread handle", ex); _ui = null; }

            try
            {
                // Late-bound set: the typed COMAddIn.Object setter is unreliable with embedded interop types.
                addInInst.GetType().InvokeMember("Object", BindingFlags.SetProperty, null, addInInst, new object[] { _api });
            }
            catch (Exception ex) { Log.Write("OnConnection: automation object", ex); }
            Log.Write("OnConnection: AB Layout 4.0.0 loaded");
        }

        public void OnDisconnection(Extensibility.ext_DisconnectMode removeMode, ref Array custom)
        {
            foreach (var p in _panes.Values) { try { p.Delete(); } catch { } }
            _panes.Clear();
        }

        public void OnAddInsUpdate(ref Array custom) { }
        public void OnStartupComplete(ref Array custom) => Log.Write("OnStartupComplete");
        public void OnBeginShutdown(ref Array custom) { }

        /* ===== Services ===== */

        internal AbService CreateService()
        {
            AbEngine engine;
            try { engine = _engineTask.GetAwaiter().GetResult(); }
            catch (Exception ex) { throw new AbUserException("AB Layout could not load its rules: " + ex.Message + " Please reinstall AB Layout."); }
            return new AbService(_app, engine);
        }

        internal W.Application Application => _app;

        /* ===== Ribbon ===== */

        public string GetCustomUI(string ribbonId)
        {
            Log.Write("GetCustomUI: " + ribbonId);
            using (var s = Assembly.GetExecutingAssembly().GetManifestResourceStream("ABLayout.Ribbon.xml"))
            using (var r = new StreamReader(s)) return r.ReadToEnd();
        }

        public void OnRibbonLoad(IRibbonUI ribbon) => _ribbon = ribbon;

        public stdole.IPictureDisp GetImage(IRibbonControl control)
        {
            var name = control.Id == "abOpen" ? "ABLayout.icon-80.png" : "ABLayout.icon-32.png";
            using (var s = Assembly.GetExecutingAssembly().GetManifestResourceStream(name))
            using (var img = Image.FromStream(s))
                return PictureConverter.ToPicture(new Bitmap(img));
        }

        public bool GetPanePressed(IRibbonControl control)
        {
            var pane = CurrentPane(false);
            return pane != null && pane.Visible;
        }

        public void OnTogglePane(IRibbonControl control, bool pressed)
        {
            var pane = CurrentPane(true);
            if (pane != null) pane.Visible = pressed;
        }

        public void OnOpenTab(IRibbonControl control)
        {
            var pane = CurrentPane(true);
            if (pane == null) return;
            pane.Visible = true;
            var tab = control.Tag;
            if (pane.ContentControl is TaskPaneControl tp) tp.SelectTab(tab);
            _ribbon?.InvalidateControl("abOpen");
        }

        internal bool ShowPane(string tab)
        {
            var pane = CurrentPane(true);
            if (pane == null) return false;
            pane.Visible = true;
            if (pane.ContentControl is TaskPaneControl tp) tp.SelectTab(tab);
            _ribbon?.InvalidateControl("abOpen");
            try { _ribbon?.ActivateTab("abTab"); } catch { }
            return pane.Visible && pane.ContentControl is TaskPaneControl;
        }

        /* ===== Task panes (one per document window) ===== */

        public void CTPFactoryAvailable(ICTPFactory factory) => _ctpFactory = factory;

        private CustomTaskPane CurrentPane(bool create)
        {
            if (_ctpFactory == null || _app.Windows.Count == 0) return null;
            var window = _app.ActiveWindow;
            int key = window.Hwnd;
            if (_panes.TryGetValue(key, out var existing)) return existing;
            if (!create) return null;

            var pane = _ctpFactory.CreateCTP(TaskPaneProgId, "AB Layout", window);
            pane.DockPosition = MsoCTPDockPosition.msoCTPDockPositionRight;
            pane.Width = 380;
            pane.VisibleStateChange += p => _ribbon?.InvalidateControl("abOpen");
            if (pane.ContentControl is TaskPaneControl tp) tp.Initialize(this);
            _panes[key] = pane;
            return pane;
        }
    }

    /// <summary>Converts images for the ribbon (uses a protected helper of AxHost).</summary>
    internal sealed class PictureConverter : AxHost
    {
        private PictureConverter() : base(string.Empty) { }
        public static stdole.IPictureDisp ToPicture(Image image) => (stdole.IPictureDisp)GetIPictureDispFromPicture(image);
    }
}
