<#
File: install.ps1
Path: /native/installer/install.ps1
Project: AB Layout (Advocate Benefit Layout)
Developed by PrajnaBytes International Private Limited and RatioJuris
Copyright (C) 2026 PrajnaBytes International Private Limited and RatioJuris
SPDX-License-Identifier: GPL-3.0-or-later
Additional terms under GPLv3 section 7 apply (attribution and names) - see NOTICE.

Installs the AB Layout native Word add-in for the current Windows user.
No administrator rights are needed: files go to %LOCALAPPDATA%\Programs\AB Layout
and registration is written under HKEY_CURRENT_USER only.
#>

$ErrorActionPreference = 'Stop'
$source = $PSScriptRoot
$target = Join-Path $env:LOCALAPPDATA 'Programs\AB Layout'

Write-Host ''
Write-Host 'AB Layout (Advocate Benefit Layout) - Word add-in installer' -ForegroundColor Cyan
Write-Host 'Developed by PrajnaBytes International Private Limited and RatioJuris'
Write-Host ''

if (-not (Test-Path (Join-Path $source 'ABLayout.Word.dll'))) {
    throw 'ABLayout.Word.dll was not found next to this installer. Please extract the whole ZIP file first.'
}

if (Get-Process WINWORD -ErrorAction SilentlyContinue) {
    Write-Host 'Microsoft Word is open. Please save your work and close Word, then press Enter.' -ForegroundColor Yellow
    Read-Host | Out-Null
    if (Get-Process WINWORD -ErrorAction SilentlyContinue) { throw 'Word is still running. Close Word and run the installer again.' }
}

# .NET Framework 4.8 is part of Windows 10 (May 2019 update) and Windows 11.
$release = (Get-ItemProperty 'HKLM:\SOFTWARE\Microsoft\NET Framework Setup\NDP\v4\Full' -ErrorAction SilentlyContinue).Release
if (-not $release -or $release -lt 528040) {
    throw '.NET Framework 4.8 is required. Install it from https://dotnet.microsoft.com/download/dotnet-framework/net48 and run this installer again.'
}

Write-Host "Copying files to $target ..."
New-Item -ItemType Directory -Force -Path $target | Out-Null
Copy-Item -Path (Join-Path $source '*') -Destination $target -Recurse -Force -Exclude 'install.*','uninstall.cmd'
Copy-Item -Path (Join-Path $source 'uninstall.ps1') -Destination $target -Force
# Files downloaded from the internet are marked as blocked; .NET refuses to load blocked DLLs.
Get-ChildItem -Path $target -Recurse -File | Unblock-File

$dll = Join-Path $target 'ABLayout.Word.dll'
$assemblyName = [System.Reflection.AssemblyName]::GetAssemblyName($dll).FullName
# Same format RegAsm writes (spaces are NOT escaped; an escaped %20 makes Word fail to load the add-in).
$codeBase = 'file:///' + $dll.Replace('\', '/')

# 64-bit Word reads Software\Classes\CLSID; 32-bit Word on 64-bit Windows reads the
# redirected Software\Classes\WOW6432Node\CLSID. Register in both so either works.
$clsidRoots = @('HKCU:\Software\Classes\CLSID')
if ([Environment]::Is64BitOperatingSystem) { $clsidRoots += 'HKCU:\Software\Classes\WOW6432Node\CLSID' }

function Register-ComClass([string]$clsid, [string]$progId, [string]$className) {
    $classes = 'HKCU:\Software\Classes'
    New-Item -Path "$classes\$progId\CLSID" -Force | Out-Null
    Set-ItemProperty -Path "$classes\$progId" -Name '(default)' -Value $progId
    Set-ItemProperty -Path "$classes\$progId\CLSID" -Name '(default)' -Value "{$clsid}"
    foreach ($root in $clsidRoots) { Register-ClsidKey "$root\{$clsid}" $progId $className }
}

function Register-ClsidKey([string]$ck, [string]$progId, [string]$className) {
    foreach ($k in @("$ck\InprocServer32", "$ck\InprocServer32\4.0.0.0")) {
        New-Item -Path $k -Force | Out-Null
        if ($k -like '*InprocServer32') { Set-ItemProperty -Path $k -Name '(default)' -Value 'mscoree.dll'; Set-ItemProperty -Path $k -Name 'ThreadingModel' -Value 'Both' }
        Set-ItemProperty -Path $k -Name 'Class' -Value $className
        Set-ItemProperty -Path $k -Name 'Assembly' -Value $assemblyName
        Set-ItemProperty -Path $k -Name 'RuntimeVersion' -Value 'v4.0.30319'
        Set-ItemProperty -Path $k -Name 'CodeBase' -Value $codeBase
    }
    Set-ItemProperty -Path $ck -Name '(default)' -Value $className
    New-Item -Path "$ck\ProgId" -Force | Out-Null
    Set-ItemProperty -Path "$ck\ProgId" -Name '(default)' -Value $progId
    New-Item -Path "$ck\Implemented Categories\{62C8FE65-4EBB-45e7-B440-6E39B2CDBF29}" -Force | Out-Null
}

Write-Host 'Registering the add-in for this user ...'
Register-ComClass '092F8839-CC6E-49D3-AE33-00BD57D4D9F1' 'ABLayout.Connect' 'ABLayout.Word.Connect'
Register-ComClass 'DE4D7DDE-E8FA-4184-ACA5-DB4F54928BFA' 'ABLayout.TaskPane' 'ABLayout.Word.TaskPaneControl'
foreach ($root in $clsidRoots) { New-Item -Path "$root\{DE4D7DDE-E8FA-4184-ACA5-DB4F54928BFA}\Control" -Force | Out-Null }

$addin = 'HKCU:\Software\Microsoft\Office\Word\Addins\ABLayout.Connect'
New-Item -Path $addin -Force | Out-Null
Set-ItemProperty -Path $addin -Name 'FriendlyName' -Value 'AB Layout'
Set-ItemProperty -Path $addin -Name 'Description' -Value 'Advocate Benefit Layout - check and clean legal documents, Kruti Dev / Unicode, paper and margins. Developed by PrajnaBytes International Private Limited and RatioJuris.'
New-ItemProperty -Path $addin -Name 'LoadBehavior' -Value 3 -PropertyType DWord -Force | Out-Null

# If Word disabled AB Layout after an earlier problem, remove ONLY AB Layout's entry
# from Word's "Disabled Items" list (other add-ins' entries are left untouched).
foreach ($ver in @('16.0', '15.0')) {
    $disabled = "HKCU:\Software\Microsoft\Office\$ver\Word\Resiliency\DisabledItems"
    if (-not (Test-Path $disabled)) { continue }
    $props = (Get-ItemProperty $disabled).PSObject.Properties | Where-Object { $_.Name -notlike 'PS*' }
    foreach ($p in $props) {
        $text = [System.Text.Encoding]::Unicode.GetString([byte[]]$p.Value)
        if ($text -match 'ablayout') { Remove-ItemProperty -Path $disabled -Name $p.Name }
    }
}

Write-Host ''
Write-Host 'AB Layout is installed.' -ForegroundColor Green
Write-Host 'Open Word: you will find the "AB Layout" tab on the ribbon. It works offline.'
Write-Host 'If the tab does not appear: File > Options > Add-ins > Manage: Disabled Items > Go, enable AB Layout.'
Write-Host "To remove it later, run: $target\uninstall.ps1"
Write-Host ''
