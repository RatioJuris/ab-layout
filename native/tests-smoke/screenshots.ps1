<#
File: screenshots.ps1
Path: /native/tests-smoke/screenshots.ps1
Project: AB Layout (Advocate Benefit Layout)
Developed by PrajnaBytes International Private Limited and RatioJuris
Copyright (C) 2026 PrajnaBytes International Private Limited and RatioJuris
SPDX-License-Identifier: GPL-3.0-or-later
Additional terms under GPLv3 section 7 apply (attribution and names) - see NOTICE.

Produces the README / website screenshots of the INSTALLED add-in using
synthetic documents (fictitious names). Captures only the Word window
(PrintWindow), never the rest of the screen. Documents are closed unsaved.
Usage: powershell -ExecutionPolicy Bypass -File native\tests-smoke\screenshots.ps1 -Out docs\screenshots
#>
param([string]$Out = 'docs\screenshots')
$ErrorActionPreference = 'Stop'
Add-Type -AssemblyName System.Drawing
Add-Type @'
using System; using System.Runtime.InteropServices;
public static class WinCap {
  [DllImport("user32.dll")] public static extern bool PrintWindow(IntPtr h, IntPtr hdc, uint flags);
  [DllImport("user32.dll")] public static extern bool GetWindowRect(IntPtr h, out RECT r);
  [DllImport("user32.dll")] public static extern bool MoveWindow(IntPtr h, int x, int y, int w, int hgt, bool repaint);
  [DllImport("user32.dll")] public static extern bool ShowWindow(IntPtr h, int cmd);
  public struct RECT { public int Left, Top, Right, Bottom; } }
'@
New-Item -ItemType Directory -Force -Path $Out | Out-Null
$Out = (Resolve-Path $Out).Path

function Capture($word, [string]$name) {
    Start-Sleep -Milliseconds 1500
    $h = [IntPtr]$word.ActiveWindow.Hwnd
    $r = New-Object WinCap+RECT
    [WinCap]::GetWindowRect($h, [ref]$r) | Out-Null
    $bmp = New-Object System.Drawing.Bitmap ($r.Right - $r.Left), ($r.Bottom - $r.Top)
    $g = [System.Drawing.Graphics]::FromImage($bmp)
    $hdc = $g.GetHdc(); [WinCap]::PrintWindow($h, $hdc, 2) | Out-Null; $g.ReleaseHdc($hdc)
    $file = Join-Path $Out $name
    $bmp.Save($file, [System.Drawing.Imaging.ImageFormat]::Png)
    $g.Dispose(); $bmp.Dispose()
    "saved $file"
}

function Petition($word) {
    $doc = $word.Documents.Add()
    $lines = @(
        'IN THE HIGH COURT OF JUDICATURE AT ALLAHABAD',
        'WRIT PETITION (CIVIL) NO. ______ OF 2026',
        "Ram Kumar Sharma, S/o Shri Mohan Lal, R/o Village Rampur, District Kanpur`t...Petitioner",
        'VERSUS',
        "State of Uttar Pradesh through Principal Secretary, Revenue`t...Respondent",
        'PETITION UNDER ARTICLE 226 OF THE CONSTITUTION OF INDIA',
        '1. That the petitioner is a law-abiding citizen and a permanent resident of Village Rampur, District Kanpur, and is filing the present petition on 12.05.2026.',
        '2. That the respondent issued an order dated 01.04.2026 under Section 4 of the U.P. Land Revenue Act, 1901 without giving any opportunity of hearing to the petitioner.',
        '4. That the impugned order is arbitrary and violates the principles of natural justice as held in Maneka Gandhi v. Union of India, (1978) 1 SCC 248.',
        '5. That the petitioner has no other equally efficacious alternative remedy and is therefore approaching this Hon''ble Court.',
        ';kfpdkdrkZ dh vksj ls fouez fuosnu fd;k tkrk gS fd vkns''k fujLr fd;k tk,A',
        'Place: Allahabad',
        'Date: dd/mm/yyyy',
        'Through Counsel'
    )
    $doc.Content.Text = $lines -join "`r"
    foreach ($p in $doc.Paragraphs) { $p.Range.Font.Name = 'Times New Roman'; $p.Range.Font.Size = 14; $p.SpaceAfter = 6 }
    foreach ($i in 1, 2, 4, 6) { $doc.Paragraphs($i).Alignment = 1; $doc.Paragraphs($i).Range.Font.Bold = 1 }
    $doc.Paragraphs(1).Range.Font.Name = 'Arial'; $doc.Paragraphs(1).Range.Font.Size = 15
    $doc.Paragraphs(7).Alignment = 3; $doc.Paragraphs(7).FirstLineIndent = 36; $doc.Paragraphs(7).LineSpacingRule = 1
    $doc.Paragraphs(8).Range.Font.Name = 'Calibri'; $doc.Paragraphs(8).Range.Font.Size = 11; $doc.Paragraphs(8).LineSpacingRule = 2
    $doc.Paragraphs(9).Range.Font.Name = 'Cambria'; $doc.Paragraphs(9).Range.HighlightColorIndex = 7
    $doc.Paragraphs(10).Alignment = 3; $doc.Paragraphs(10).LineSpacingRule = 1
    $doc.Paragraphs(11).Range.Font.Name = 'Kruti Dev 010'; $doc.Paragraphs(11).Range.Font.Size = 16
    $doc.Paragraphs(14).Alignment = 2
    return $doc
}

$word = New-Object -ComObject Word.Application
$docs = @()
try {
    $word.Visible = $true
    $word.WindowState = 0
    $addin = $word.COMAddIns.Item('ABLayout.Connect')
    if ($null -eq $addin.Object) { throw 'AB Layout did not load at start-up.' }
    $api = $addin.Object

    # Window size for all screenshots.
    $doc = Petition $word; $docs += $doc
    $h = [IntPtr]$word.ActiveWindow.Hwnd
    [WinCap]::ShowWindow($h, 1) | Out-Null
    [WinCap]::MoveWindow($h, 40, 40, 1680, 1000, $true) | Out-Null
    $word.ActiveWindow.View.Zoom.Percentage = 100

    # 1. Check Document
    $api.ShowPane('check') | Out-Null
    $api.PaneAct('Check Document') | Out-Null
    Capture $word 'check-document.png'

    # 2. Clean Document preview
    $api.ShowPane('clean') | Out-Null
    $api.PaneAct('Petition / Application') | Out-Null
    $api.PaneAct('Preview Changes') | Out-Null
    Capture $word 'clean-preview.png'
    $api.PaneAct('Apply These Changes') | Out-Null
    Capture $word 'clean-applied.png'

    # 3. Kruti Dev -> Unicode
    $api.ShowPane('hindi') | Out-Null
    $api.PaneAct('Whole document') | Out-Null
    $api.PaneAct('Preview Conversion') | Out-Null
    $api.PaneAct('Convert Now') | Out-Null
    Capture $word 'kruti-unicode.png'

    # 4. Affidavit on stamp paper (long document, several pages side by side)
    $aff = $word.Documents.Add(); $docs += $aff
    $para = 'That the deponent states that the contents of the accompanying application are true and correct to the best of knowledge and belief and nothing material has been concealed therefrom.'
    $aff.Content.Text = (1..60 | ForEach-Object { "$_. $para" }) -join "`r"
    $aff.Sections(1).Footers(1).PageNumbers.Add(1, $true) | Out-Null
    $h2 = [IntPtr]$word.ActiveWindow.Hwnd
    [WinCap]::ShowWindow($h2, 1) | Out-Null
    [WinCap]::MoveWindow($h2, 40, 40, 1680, 1000, $true) | Out-Null
    $api.ShowPane('page') | Out-Null
    $api.PaneAct('Notary / Affidavit') | Out-Null
    $api.PaneAct('Apply Page Layout') | Out-Null
    $word.ActiveWindow.View.Zoom.PageColumns = 3
    $word.ActiveWindow.View.Zoom.PageRows = 1
    $word.Selection.HomeKey(6) | Out-Null
    Capture $word 'affidavit-stamp-paper.png'
}
finally {
    foreach ($d in $docs) { try { $d.Close([ref]0) } catch {} }
    if ($word.Documents.Count -eq 0) { $word.Quit([ref]0) }
}
