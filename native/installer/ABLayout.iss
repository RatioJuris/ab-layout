; File: ABLayout.iss
; Path: /native/installer/ABLayout.iss
; Project: AB Layout (Advocate Benefit Layout)
; Developed by PrajnaBytes International Private Limited and RatioJuris
; Copyright (C) 2026 PrajnaBytes International Private Limited and RatioJuris
; SPDX-License-Identifier: GPL-3.0-or-later
; Additional terms under GPLv3 section 7 apply (attribution and names) - see NOTICE.
;
; Windows installer (ABLayout-Setup.exe), built with Inno Setup 6 (https://jrsoftware.org/isinfo.php).
; Installs for the current user only: no administrator password, files in
; %LOCALAPPDATA%\Programs\AB Layout, registration under HKEY_CURRENT_USER.
; The AppId and the COM GUIDs below must never change.
;
; Build:  ISCC.exe /DStage=<staged files folder> /DVersion=4.0.0 /DOutDir=<dir> ABLayout.iss
; (native\build.ps1 does this automatically when Inno Setup is installed.)

#ifndef Version
  #define Version "4.0.0"
#endif
#ifndef Stage
  #error Stage (folder with the built add-in files) must be defined
#endif
#ifndef OutDir
  #define OutDir "."
#endif

#define Publisher "PrajnaBytes International Private Limited and RatioJuris"
#define ConnectClsid "{{092F8839-CC6E-49D3-AE33-00BD57D4D9F1}"
#define PaneClsid "{{DE4D7DDE-E8FA-4184-ACA5-DB4F54928BFA}"
#define AssemblyName "ABLayout.Word, Version=" + Version + ".0, Culture=neutral, PublicKeyToken=null"

[Setup]
AppId={{D3901BB2-E1FF-4C74-BF2E-7BCFF657C9A4}
AppName=AB Layout
AppVerName=AB Layout {#Version} (Advocate Benefit Layout)
AppVersion={#Version}
AppPublisher={#Publisher}
AppPublisherURL=https://ratiojuris.github.io/ab-layout/
AppSupportURL=https://github.com/RatioJuris/ab-layout/issues
AppUpdatesURL=https://github.com/RatioJuris/ab-layout/releases/latest
AppCopyright=Copyright (C) 2026 {#Publisher}
VersionInfoVersion={#Version}.0
VersionInfoCompany={#Publisher}
VersionInfoDescription=AB Layout (Advocate Benefit Layout) Word add-in setup
VersionInfoProductName=AB Layout
PrivilegesRequired=lowest
PrivilegesRequiredOverridesAllowed=
DefaultDirName={localappdata}\Programs\AB Layout
DisableDirPage=yes
DisableProgramGroupPage=yes
DisableReadyPage=no
InfoBeforeFile={#Stage}\NOTICE
SetupIconFile=..\..\favicon.ico
UninstallDisplayIcon={app}\ABLayout.ico
UninstallDisplayName=AB Layout (Advocate Benefit Layout) for Microsoft Word
OutputDir={#OutDir}
OutputBaseFilename=ABLayout-Setup
Compression=lzma2/max
SolidCompression=yes
WizardStyle=modern
CloseApplications=no
MinVersion=10.0

[Languages]
Name: "english"; MessagesFile: "compiler:Default.isl"

[Messages]
WelcomeLabel2=This will install AB Layout {#Version} for Microsoft Word on your computer.%n%nAB Layout checks and cleans the formatting of legal documents, converts Hindi between Kruti Dev and Unicode, and sets paper and margins. It works offline and never changes the words of your documents when formatting.%n%nDeveloped by {#Publisher}.
FinishedLabel=AB Layout is installed.%n%nOpen Microsoft Word and click the "AB Layout" tab on the ribbon.

[Files]
Source: "{#Stage}\*"; DestDir: "{app}"; Excludes: "install.cmd,install.ps1,uninstall.cmd"; Flags: recursesubdirs ignoreversion
Source: "..\..\favicon.ico"; DestDir: "{app}"; DestName: "ABLayout.ico"; Flags: ignoreversion

[Registry]
; ---- 64-bit registry view (64-bit Word) ----
; COM registration of the add-in (ABLayout.Connect)
Root: HKCU64; Check: IsWin64; Subkey: "Software\Classes\ABLayout.Connect"; ValueType: string; ValueName: ""; ValueData: "ABLayout.Connect"; Flags: uninsdeletekey
Root: HKCU64; Check: IsWin64; Subkey: "Software\Classes\ABLayout.Connect\CLSID"; ValueType: string; ValueName: ""; ValueData: "{#ConnectClsid}"
Root: HKCU64; Check: IsWin64; Subkey: "Software\Classes\CLSID\{#ConnectClsid}"; ValueType: string; ValueName: ""; ValueData: "ABLayout.Word.Connect"; Flags: uninsdeletekey
Root: HKCU64; Check: IsWin64; Subkey: "Software\Classes\CLSID\{#ConnectClsid}\ProgId"; ValueType: string; ValueName: ""; ValueData: "ABLayout.Connect"
Root: HKCU64; Check: IsWin64; Subkey: "Software\Classes\CLSID\{#ConnectClsid}\Implemented Categories\{{62C8FE65-4EBB-45e7-B440-6E39B2CDBF29}"; Flags: createvalueifdoesntexist
Root: HKCU64; Check: IsWin64; Subkey: "Software\Classes\CLSID\{#ConnectClsid}\InprocServer32"; ValueType: string; ValueName: ""; ValueData: "mscoree.dll"
Root: HKCU64; Check: IsWin64; Subkey: "Software\Classes\CLSID\{#ConnectClsid}\InprocServer32"; ValueType: string; ValueName: "ThreadingModel"; ValueData: "Both"
Root: HKCU64; Check: IsWin64; Subkey: "Software\Classes\CLSID\{#ConnectClsid}\InprocServer32"; ValueType: string; ValueName: "Class"; ValueData: "ABLayout.Word.Connect"
Root: HKCU64; Check: IsWin64; Subkey: "Software\Classes\CLSID\{#ConnectClsid}\InprocServer32"; ValueType: string; ValueName: "Assembly"; ValueData: "{#AssemblyName}"
Root: HKCU64; Check: IsWin64; Subkey: "Software\Classes\CLSID\{#ConnectClsid}\InprocServer32"; ValueType: string; ValueName: "RuntimeVersion"; ValueData: "v4.0.30319"
Root: HKCU64; Check: IsWin64; Subkey: "Software\Classes\CLSID\{#ConnectClsid}\InprocServer32"; ValueType: string; ValueName: "CodeBase"; ValueData: "{code:CodeBase}"
Root: HKCU64; Check: IsWin64; Subkey: "Software\Classes\CLSID\{#ConnectClsid}\InprocServer32\{#Version}.0"; ValueType: string; ValueName: "Class"; ValueData: "ABLayout.Word.Connect"
Root: HKCU64; Check: IsWin64; Subkey: "Software\Classes\CLSID\{#ConnectClsid}\InprocServer32\{#Version}.0"; ValueType: string; ValueName: "Assembly"; ValueData: "{#AssemblyName}"
Root: HKCU64; Check: IsWin64; Subkey: "Software\Classes\CLSID\{#ConnectClsid}\InprocServer32\{#Version}.0"; ValueType: string; ValueName: "RuntimeVersion"; ValueData: "v4.0.30319"
Root: HKCU64; Check: IsWin64; Subkey: "Software\Classes\CLSID\{#ConnectClsid}\InprocServer32\{#Version}.0"; ValueType: string; ValueName: "CodeBase"; ValueData: "{code:CodeBase}"

; COM registration of the task pane control (ABLayout.TaskPane)
Root: HKCU64; Check: IsWin64; Subkey: "Software\Classes\ABLayout.TaskPane"; ValueType: string; ValueName: ""; ValueData: "ABLayout.TaskPane"; Flags: uninsdeletekey
Root: HKCU64; Check: IsWin64; Subkey: "Software\Classes\ABLayout.TaskPane\CLSID"; ValueType: string; ValueName: ""; ValueData: "{#PaneClsid}"
Root: HKCU64; Check: IsWin64; Subkey: "Software\Classes\CLSID\{#PaneClsid}"; ValueType: string; ValueName: ""; ValueData: "ABLayout.Word.TaskPaneControl"; Flags: uninsdeletekey
Root: HKCU64; Check: IsWin64; Subkey: "Software\Classes\CLSID\{#PaneClsid}\ProgId"; ValueType: string; ValueName: ""; ValueData: "ABLayout.TaskPane"
Root: HKCU64; Check: IsWin64; Subkey: "Software\Classes\CLSID\{#PaneClsid}\Control"; Flags: createvalueifdoesntexist
Root: HKCU64; Check: IsWin64; Subkey: "Software\Classes\CLSID\{#PaneClsid}\Implemented Categories\{{62C8FE65-4EBB-45e7-B440-6E39B2CDBF29}"; Flags: createvalueifdoesntexist
Root: HKCU64; Check: IsWin64; Subkey: "Software\Classes\CLSID\{#PaneClsid}\InprocServer32"; ValueType: string; ValueName: ""; ValueData: "mscoree.dll"
Root: HKCU64; Check: IsWin64; Subkey: "Software\Classes\CLSID\{#PaneClsid}\InprocServer32"; ValueType: string; ValueName: "ThreadingModel"; ValueData: "Both"
Root: HKCU64; Check: IsWin64; Subkey: "Software\Classes\CLSID\{#PaneClsid}\InprocServer32"; ValueType: string; ValueName: "Class"; ValueData: "ABLayout.Word.TaskPaneControl"
Root: HKCU64; Check: IsWin64; Subkey: "Software\Classes\CLSID\{#PaneClsid}\InprocServer32"; ValueType: string; ValueName: "Assembly"; ValueData: "{#AssemblyName}"
Root: HKCU64; Check: IsWin64; Subkey: "Software\Classes\CLSID\{#PaneClsid}\InprocServer32"; ValueType: string; ValueName: "RuntimeVersion"; ValueData: "v4.0.30319"
Root: HKCU64; Check: IsWin64; Subkey: "Software\Classes\CLSID\{#PaneClsid}\InprocServer32"; ValueType: string; ValueName: "CodeBase"; ValueData: "{code:CodeBase}"
Root: HKCU64; Check: IsWin64; Subkey: "Software\Classes\CLSID\{#PaneClsid}\InprocServer32\{#Version}.0"; ValueType: string; ValueName: "Class"; ValueData: "ABLayout.Word.TaskPaneControl"
Root: HKCU64; Check: IsWin64; Subkey: "Software\Classes\CLSID\{#PaneClsid}\InprocServer32\{#Version}.0"; ValueType: string; ValueName: "Assembly"; ValueData: "{#AssemblyName}"
Root: HKCU64; Check: IsWin64; Subkey: "Software\Classes\CLSID\{#PaneClsid}\InprocServer32\{#Version}.0"; ValueType: string; ValueName: "RuntimeVersion"; ValueData: "v4.0.30319"
Root: HKCU64; Check: IsWin64; Subkey: "Software\Classes\CLSID\{#PaneClsid}\InprocServer32\{#Version}.0"; ValueType: string; ValueName: "CodeBase"; ValueData: "{code:CodeBase}"

; ---- 32-bit registry view (32-bit Word; Windows redirects CLSID keys) ----
; COM registration of the add-in (ABLayout.Connect)
Root: HKCU32; Subkey: "Software\Classes\ABLayout.Connect"; ValueType: string; ValueName: ""; ValueData: "ABLayout.Connect"; Flags: uninsdeletekey
Root: HKCU32; Subkey: "Software\Classes\ABLayout.Connect\CLSID"; ValueType: string; ValueName: ""; ValueData: "{#ConnectClsid}"
Root: HKCU32; Subkey: "Software\Classes\CLSID\{#ConnectClsid}"; ValueType: string; ValueName: ""; ValueData: "ABLayout.Word.Connect"; Flags: uninsdeletekey
Root: HKCU32; Subkey: "Software\Classes\CLSID\{#ConnectClsid}\ProgId"; ValueType: string; ValueName: ""; ValueData: "ABLayout.Connect"
Root: HKCU32; Subkey: "Software\Classes\CLSID\{#ConnectClsid}\Implemented Categories\{{62C8FE65-4EBB-45e7-B440-6E39B2CDBF29}"; Flags: createvalueifdoesntexist
Root: HKCU32; Subkey: "Software\Classes\CLSID\{#ConnectClsid}\InprocServer32"; ValueType: string; ValueName: ""; ValueData: "mscoree.dll"
Root: HKCU32; Subkey: "Software\Classes\CLSID\{#ConnectClsid}\InprocServer32"; ValueType: string; ValueName: "ThreadingModel"; ValueData: "Both"
Root: HKCU32; Subkey: "Software\Classes\CLSID\{#ConnectClsid}\InprocServer32"; ValueType: string; ValueName: "Class"; ValueData: "ABLayout.Word.Connect"
Root: HKCU32; Subkey: "Software\Classes\CLSID\{#ConnectClsid}\InprocServer32"; ValueType: string; ValueName: "Assembly"; ValueData: "{#AssemblyName}"
Root: HKCU32; Subkey: "Software\Classes\CLSID\{#ConnectClsid}\InprocServer32"; ValueType: string; ValueName: "RuntimeVersion"; ValueData: "v4.0.30319"
Root: HKCU32; Subkey: "Software\Classes\CLSID\{#ConnectClsid}\InprocServer32"; ValueType: string; ValueName: "CodeBase"; ValueData: "{code:CodeBase}"
Root: HKCU32; Subkey: "Software\Classes\CLSID\{#ConnectClsid}\InprocServer32\{#Version}.0"; ValueType: string; ValueName: "Class"; ValueData: "ABLayout.Word.Connect"
Root: HKCU32; Subkey: "Software\Classes\CLSID\{#ConnectClsid}\InprocServer32\{#Version}.0"; ValueType: string; ValueName: "Assembly"; ValueData: "{#AssemblyName}"
Root: HKCU32; Subkey: "Software\Classes\CLSID\{#ConnectClsid}\InprocServer32\{#Version}.0"; ValueType: string; ValueName: "RuntimeVersion"; ValueData: "v4.0.30319"
Root: HKCU32; Subkey: "Software\Classes\CLSID\{#ConnectClsid}\InprocServer32\{#Version}.0"; ValueType: string; ValueName: "CodeBase"; ValueData: "{code:CodeBase}"

; COM registration of the task pane control (ABLayout.TaskPane)
Root: HKCU32; Subkey: "Software\Classes\ABLayout.TaskPane"; ValueType: string; ValueName: ""; ValueData: "ABLayout.TaskPane"; Flags: uninsdeletekey
Root: HKCU32; Subkey: "Software\Classes\ABLayout.TaskPane\CLSID"; ValueType: string; ValueName: ""; ValueData: "{#PaneClsid}"
Root: HKCU32; Subkey: "Software\Classes\CLSID\{#PaneClsid}"; ValueType: string; ValueName: ""; ValueData: "ABLayout.Word.TaskPaneControl"; Flags: uninsdeletekey
Root: HKCU32; Subkey: "Software\Classes\CLSID\{#PaneClsid}\ProgId"; ValueType: string; ValueName: ""; ValueData: "ABLayout.TaskPane"
Root: HKCU32; Subkey: "Software\Classes\CLSID\{#PaneClsid}\Control"; Flags: createvalueifdoesntexist
Root: HKCU32; Subkey: "Software\Classes\CLSID\{#PaneClsid}\Implemented Categories\{{62C8FE65-4EBB-45e7-B440-6E39B2CDBF29}"; Flags: createvalueifdoesntexist
Root: HKCU32; Subkey: "Software\Classes\CLSID\{#PaneClsid}\InprocServer32"; ValueType: string; ValueName: ""; ValueData: "mscoree.dll"
Root: HKCU32; Subkey: "Software\Classes\CLSID\{#PaneClsid}\InprocServer32"; ValueType: string; ValueName: "ThreadingModel"; ValueData: "Both"
Root: HKCU32; Subkey: "Software\Classes\CLSID\{#PaneClsid}\InprocServer32"; ValueType: string; ValueName: "Class"; ValueData: "ABLayout.Word.TaskPaneControl"
Root: HKCU32; Subkey: "Software\Classes\CLSID\{#PaneClsid}\InprocServer32"; ValueType: string; ValueName: "Assembly"; ValueData: "{#AssemblyName}"
Root: HKCU32; Subkey: "Software\Classes\CLSID\{#PaneClsid}\InprocServer32"; ValueType: string; ValueName: "RuntimeVersion"; ValueData: "v4.0.30319"
Root: HKCU32; Subkey: "Software\Classes\CLSID\{#PaneClsid}\InprocServer32"; ValueType: string; ValueName: "CodeBase"; ValueData: "{code:CodeBase}"
Root: HKCU32; Subkey: "Software\Classes\CLSID\{#PaneClsid}\InprocServer32\{#Version}.0"; ValueType: string; ValueName: "Class"; ValueData: "ABLayout.Word.TaskPaneControl"
Root: HKCU32; Subkey: "Software\Classes\CLSID\{#PaneClsid}\InprocServer32\{#Version}.0"; ValueType: string; ValueName: "Assembly"; ValueData: "{#AssemblyName}"
Root: HKCU32; Subkey: "Software\Classes\CLSID\{#PaneClsid}\InprocServer32\{#Version}.0"; ValueType: string; ValueName: "RuntimeVersion"; ValueData: "v4.0.30319"
Root: HKCU32; Subkey: "Software\Classes\CLSID\{#PaneClsid}\InprocServer32\{#Version}.0"; ValueType: string; ValueName: "CodeBase"; ValueData: "{code:CodeBase}"

; Tell Word to load AB Layout at start-up
Root: HKCU; Subkey: "Software\Microsoft\Office\Word\Addins\ABLayout.Connect"; ValueType: string; ValueName: "FriendlyName"; ValueData: "AB Layout"; Flags: uninsdeletekey
Root: HKCU; Subkey: "Software\Microsoft\Office\Word\Addins\ABLayout.Connect"; ValueType: string; ValueName: "Description"; ValueData: "Advocate Benefit Layout - check and clean legal documents, Kruti Dev / Unicode, paper and margins. Developed by {#Publisher}."
Root: HKCU; Subkey: "Software\Microsoft\Office\Word\Addins\ABLayout.Connect"; ValueType: dword; ValueName: "LoadBehavior"; ValueData: "3"

[Code]
function CodeBase(Param: String): String;
var
  S: String;
begin
  { Same format RegAsm writes: forward slashes, spaces NOT escaped. }
  S := ExpandConstant('{app}\ABLayout.Word.dll');
  StringChangeEx(S, '\', '/', True);
  Result := 'file:///' + S;
end;

function WordIsRunning(): Boolean;
begin
  Result := FindWindowByClassName('OpusApp') <> 0;
end;

function DotNet48Installed(): Boolean;
var
  Release: Cardinal;
begin
  Result := RegQueryDWordValue(HKLM, 'SOFTWARE\Microsoft\NET Framework Setup\NDP\v4\Full', 'Release', Release) and (Release >= 528040);
end;

function InitializeSetup(): Boolean;
begin
  Result := True;
  if not DotNet48Installed() then
  begin
    MsgBox('AB Layout needs .NET Framework 4.8, which is part of Windows 10 and 11.' + #13#10 +
      'Please install it from https://dotnet.microsoft.com/download/dotnet-framework/net48 and run this setup again.', mbError, MB_OK);
    Result := False;
    exit;
  end;
  while WordIsRunning() do
  begin
    if MsgBox('Microsoft Word is open. Please save your work and close Word, then click OK.' + #13#10 +
      'Click Cancel to stop the installation.', mbInformation, MB_OKCANCEL) = IDCANCEL then
    begin
      Result := False;
      exit;
    end;
  end;
end;

function InitializeUninstall(): Boolean;
begin
  Result := True;
  while FindWindowByClassName('OpusApp') <> 0 do
  begin
    if MsgBox('Please close Microsoft Word, then click OK.', mbInformation, MB_OKCANCEL) = IDCANCEL then
    begin
      Result := False;
      exit;
    end;
  end;
end;

{ If Word disabled AB Layout after an earlier problem, remove ONLY AB Layout's entry
  from Word's "Disabled Items" list. }
procedure ClearDisabledEntry(Key: String);
var
  Names: TArrayOfString;
  I: Integer;
  Data: AnsiString;
begin
  if RegGetValueNames(HKCU, Key, Names) then
    for I := 0 to GetArrayLength(Names) - 1 do
      if RegQueryBinaryValue(HKCU, Key, Names[I], Data) then
        if Pos('a'#0'b'#0'l'#0'a'#0'y'#0'o'#0'u'#0't'#0, Lowercase(Data)) > 0 then
          RegDeleteValue(HKCU, Key, Names[I]);
end;

procedure CurStepChanged(CurStep: TSetupStep);
begin
  if CurStep = ssPostInstall then
  begin
    ClearDisabledEntry('Software\Microsoft\Office\16.0\Word\Resiliency\DisabledItems');
    ClearDisabledEntry('Software\Microsoft\Office\15.0\Word\Resiliency\DisabledItems');
  end;
end;
