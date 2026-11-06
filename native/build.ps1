<#
File: build.ps1
Path: /native/build.ps1
Project: AB Layout (Advocate Benefit Layout)
Developed by PrajnaBytes International Private Limited and RatioJuris
Copyright (C) 2026 PrajnaBytes International Private Limited and RatioJuris
SPDX-License-Identifier: GPL-3.0-or-later
Additional terms under GPLv3 section 7 apply (attribution and names) - see NOTICE.

Builds the native Word add-in and packages it as
native\dist\ABLayout-Word-Windows.zip (folder inside: ABLayout-Word-Windows-<version>)
Usage:  powershell -ExecutionPolicy Bypass -File native\build.ps1 [-Test]
#>

param(
    [switch]$Test,
    # Thumbprint of a code-signing certificate in Cert:\CurrentUser\My. Word's
    # "Require Application Add-ins to be signed by Trusted Publisher" setting
    # only loads AB Layout if ABLayout.Word.dll is signed by a trusted publisher.
    [string]$SignThumbprint = ''
)
$ErrorActionPreference = 'Stop'
$root = $PSScriptRoot
$version = '4.0.0'

$dotnet = (Get-Command dotnet -ErrorAction SilentlyContinue).Source
$local = Join-Path $env:LOCALAPPDATA 'Microsoft\dotnet-sdk\dotnet.exe'
if (Test-Path $local) { $dotnet = $local }
if (-not $dotnet) { throw 'The .NET SDK is required to build (https://dotnet.microsoft.com/download).' }

& $dotnet build (Join-Path $root 'ABLayout.Word\ABLayout.Word.csproj') -c Release
if ($LASTEXITCODE -ne 0) { throw 'Build failed.' }

if ($Test) {
    & $dotnet test (Join-Path $root 'ABLayout.Word.Tests\ABLayout.Word.Tests.csproj') -c Release
    if ($LASTEXITCODE -ne 0) { throw 'Tests failed.' }
}

$bin = Join-Path $root 'ABLayout.Word\bin\Release\net48'
$name = "ABLayout-Word-Windows-$version"
$stage = Join-Path $root "dist\$name"
Remove-Item $stage -Recurse -Force -ErrorAction SilentlyContinue
New-Item -ItemType Directory -Force -Path $stage | Out-Null
Copy-Item (Join-Path $bin '*') $stage -Recurse -Exclude '*.pdb'
Copy-Item (Join-Path $root 'installer\*') $stage
Copy-Item (Join-Path $root 'README-INSTALL.txt') $stage
Copy-Item (Join-Path $root 'THIRD-PARTY-NOTICES.txt') $stage

if ($SignThumbprint) {
    $cert = Get-ChildItem Cert:\CurrentUser\My -CodeSigningCert | Where-Object Thumbprint -eq $SignThumbprint
    if (-not $cert) { throw "Code-signing certificate $SignThumbprint not found in Cert:\CurrentUser\My." }
    $dllToSign = Join-Path $stage 'ABLayout.Word.dll'
    $sig = Set-AuthenticodeSignature -FilePath $dllToSign -Certificate $cert -HashAlgorithm SHA256 -TimestampServer 'http://timestamp.digicert.com'
    if ($sig.Status -ne 'Valid') { throw "Signing failed: $($sig.Status) $($sig.StatusMessage)" }
    Write-Host "Signed ABLayout.Word.dll ($($cert.Subject))"
}

# Stable file name so https://github.com/RatioJuris/ab-layout/releases/latest/download/ABLayout-Word-Windows.zip always works.
$zip = Join-Path $root "dist\ABLayout-Word-Windows.zip"
Remove-Item $zip -Force -ErrorAction SilentlyContinue
# Entry names are written with "/" (standard ZIP); Windows PowerShell would otherwise use "\".
Add-Type -AssemblyName System.IO.Compression, System.IO.Compression.FileSystem
$stream = [System.IO.File]::Open($zip, [System.IO.FileMode]::Create)
$archive = New-Object System.IO.Compression.ZipArchive($stream, [System.IO.Compression.ZipArchiveMode]::Create)
try {
    foreach ($file in Get-ChildItem $stage -Recurse -File) {
        $entry = ($name + '/' + $file.FullName.Substring($stage.Length + 1)).Replace('\', '/')
        [System.IO.Compression.ZipFileExtensions]::CreateEntryFromFile($archive, $file.FullName, $entry, [System.IO.Compression.CompressionLevel]::Optimal) | Out-Null
    }
} finally { $archive.Dispose(); $stream.Dispose() }
Write-Host "Package: $zip" -ForegroundColor Green

# Windows installer (ABLayout-Setup.exe) when Inno Setup 6 is available.
$iscc = @(
    (Join-Path $env:LOCALAPPDATA 'Programs\Inno Setup 6\ISCC.exe'),
    (Join-Path ${env:ProgramFiles(x86)} 'Inno Setup 6\ISCC.exe'),
    (Join-Path $env:ProgramFiles 'Inno Setup 6\ISCC.exe')
) | Where-Object { Test-Path $_ } | Select-Object -First 1
if ($iscc) {
    $outDir = Join-Path $root 'dist'
    & $iscc /Q "/DStage=$stage" "/DVersion=$version" "/DOutDir=$outDir" (Join-Path $root 'installer\ABLayout.iss')
    if ($LASTEXITCODE -ne 0) { throw 'Installer build failed.' }
    $setup = Join-Path $outDir 'ABLayout-Setup.exe'
    if ($SignThumbprint) {
        $sig = Set-AuthenticodeSignature -FilePath $setup -Certificate $cert -HashAlgorithm SHA256 -TimestampServer 'http://timestamp.digicert.com'
        if ($sig.Status -ne 'Valid') { throw "Signing the installer failed: $($sig.Status)" }
    }
    Write-Host "Installer: $setup" -ForegroundColor Green
} else {
    Write-Host 'Inno Setup 6 not found - skipped ABLayout-Setup.exe (https://jrsoftware.org/isdl.php).' -ForegroundColor Yellow
}
