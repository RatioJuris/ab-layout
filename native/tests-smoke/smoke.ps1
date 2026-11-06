<#
File: smoke.ps1
Path: /native/tests-smoke/smoke.ps1
Project: AB Layout (Advocate Benefit Layout)
Developed by PrajnaBytes International Private Limited and RatioJuris
Copyright (C) 2026 PrajnaBytes International Private Limited and RatioJuris
SPDX-License-Identifier: GPL-3.0-or-later
Additional terms under GPLv3 section 7 apply (attribution and names) - see NOTICE.

Installation smoke test: starts Word (visible), checks that the INSTALLED
AB Layout add-in loaded, opens its task pane, runs Check Document through it,
saves a screenshot, and closes the test document without saving.
Usage: powershell -ExecutionPolicy Bypass -File native\tests-smoke\smoke.ps1 [-Screenshot path.png]
#>
# -Screenshot is opt-in. It uses PrintWindow, which renders only the Word window itself.
param([string]$Screenshot = "")
$ErrorActionPreference = 'Stop'
Add-Type -AssemblyName System.Drawing, System.Windows.Forms
Add-Type @'
using System; using System.Runtime.InteropServices;
public static class Win { [DllImport("user32.dll")] public static extern bool SetForegroundWindow(IntPtr h);
  [DllImport("user32.dll")] public static extern bool PrintWindow(IntPtr h, IntPtr hdc, uint flags);
  [DllImport("user32.dll")] public static extern bool GetWindowRect(IntPtr h, out RECT r);
  [DllImport("user32.dll")] public static extern bool ShowWindow(IntPtr h, int cmd);
  public struct RECT { public int Left, Top, Right, Bottom; } }
'@

$word = New-Object -ComObject Word.Application
$doc = $null
try {
    $word.Visible = $true
    $addin = $null
    foreach ($a in $word.COMAddIns) { if ($a.ProgId -eq 'ABLayout.Connect') { $addin = $a } }
    if (-not $addin) { throw 'AB Layout is not registered in Word.' }
    # Word may skip loading add-ins when started by automation; load it explicitly if needed.
    if (-not $addin.Connect -or $null -eq $addin.Object) { $addin.Connect = $false; $addin.Connect = $true }
    if ($null -eq $addin.Object) { throw 'AB Layout loaded but did not provide its automation object.' }
    "Add-in loaded: $($addin.Connect)  ($($addin.Description))"

    $doc = $word.Documents.Add()
    $doc.Content.Text = "IN THE HIGH COURT OF JUDICATURE AT ALLAHABAD`rVERSUS`r1. That the petitioner is a law-abiding citizen and is filing the present petition under Article 226.`r2. That the respondent issued an order without hearing the petitioner and the order is arbitrary.`r4. That the impugned order violates natural justice.`r;kfpdkdrkZ dh vksj ls fuosnu"
    $doc.Paragraphs(1).Alignment = 1; $doc.Paragraphs(2).Alignment = 1
    $doc.Paragraphs(4).Range.Font.Name = 'Calibri'; $doc.Paragraphs(4).Range.Font.Size = 11
    $doc.Paragraphs(6).Range.Font.Name = 'Kruti Dev 010'

    $api = $addin.Object
    "Version: " + $api.Version()
    "ShowPane: " + $api.ShowPane('check')
    $inspect = $api.Inspect() | ConvertFrom-Json
    if ($inspect.error) { throw "Inspect failed: $($inspect.error)" }
    "Findings: " + (($inspect.findings | ForEach-Object { $_.id }) -join ', ')

    $preview = $api.Preview('petition', $false, 1) | ConvertFrom-Json
    if ($preview.error) { throw "Preview failed: $($preview.error)" }
    $applied = $api.Apply('petition', $false, 1, $preview.fingerprint) | ConvertFrom-Json
    if ($applied.error) { throw "Apply failed: $($applied.error)" }
    "Clean Document: $($applied.applied) paragraph(s) reformatted; " + $applied.verification.message
    "Paragraph 4 font now: " + $doc.Paragraphs(4).Range.Font.Name + " " + $doc.Paragraphs(4).Range.Font.Size
    "Kruti Dev paragraph font kept: " + $doc.Paragraphs(6).Range.Font.Name
    "ShowPane (Clean tab): " + $api.ShowPane('clean')

    if (-not $Screenshot) { 'Smoke test passed.'; return }
    Start-Sleep -Seconds 2
    $h = [IntPtr]$word.ActiveWindow.Hwnd
    [Win]::ShowWindow($h, 3) | Out-Null   # maximise
    Start-Sleep -Seconds 2
    $r = New-Object Win+RECT
    [Win]::GetWindowRect($h, [ref]$r) | Out-Null
    $w = $r.Right - $r.Left; $hgt = $r.Bottom - $r.Top
    $bmp = New-Object System.Drawing.Bitmap $w, $hgt
    $g = [System.Drawing.Graphics]::FromImage($bmp)
    # PrintWindow renders only Word's own window (never other applications on screen).
    $hdc = $g.GetHdc(); [Win]::PrintWindow($h, $hdc, 2) | Out-Null; $g.ReleaseHdc($hdc)
    $bmp.Save($Screenshot, [System.Drawing.Imaging.ImageFormat]::Png)
    "Screenshot: $Screenshot"
}
finally {
    if ($doc) { $doc.Close([ref]0) }
    if ($word.Documents.Count -eq 0) { $word.Quit([ref]0) }
    [System.Runtime.InteropServices.Marshal]::ReleaseComObject($word) | Out-Null
}
