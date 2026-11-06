@echo off
rem AB Layout (Advocate Benefit Layout) - double-click to remove the Word add-in for this Windows user.
rem Developed by PrajnaBytes International Private Limited and RatioJuris
rem SPDX-License-Identifier: GPL-3.0-or-later
powershell -NoProfile -ExecutionPolicy Bypass -File "%~dp0uninstall.ps1"
echo.
pause
