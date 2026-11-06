<#
File: uninstall.ps1
Path: /native/installer/uninstall.ps1
Project: AB Layout (Advocate Benefit Layout)
Developed by PrajnaBytes International Private Limited and RatioJuris
Copyright (C) 2026 PrajnaBytes International Private Limited and RatioJuris
SPDX-License-Identifier: GPL-3.0-or-later
Additional terms under GPLv3 section 7 apply (attribution and names) - see NOTICE.

Removes the AB Layout native Word add-in for the current user.
Your custom profiles in %APPDATA%\AB Layout are kept.
#>

$ErrorActionPreference = 'Continue'
if (Get-Process WINWORD -ErrorAction SilentlyContinue) {
    Write-Host 'Please close Microsoft Word, then press Enter.' -ForegroundColor Yellow
    Read-Host | Out-Null
}

Remove-Item 'HKCU:\Software\Microsoft\Office\Word\Addins\ABLayout.Connect' -Recurse -Force -ErrorAction SilentlyContinue
foreach ($id in @('ABLayout.Connect', 'ABLayout.TaskPane')) {
    Remove-Item "HKCU:\Software\Classes\$id" -Recurse -Force -ErrorAction SilentlyContinue
}
foreach ($clsid in @('092F8839-CC6E-49D3-AE33-00BD57D4D9F1', 'DE4D7DDE-E8FA-4184-ACA5-DB4F54928BFA')) {
    Remove-Item "HKCU:\Software\Classes\CLSID\{$clsid}" -Recurse -Force -ErrorAction SilentlyContinue
    Remove-Item "HKCU:\Software\Classes\WOW6432Node\CLSID\{$clsid}" -Recurse -Force -ErrorAction SilentlyContinue
}

$target = Join-Path $env:LOCALAPPDATA 'Programs\AB Layout'
Remove-Item $target -Recurse -Force -ErrorAction SilentlyContinue

Write-Host 'AB Layout has been removed. Your custom profiles were kept.' -ForegroundColor Green
