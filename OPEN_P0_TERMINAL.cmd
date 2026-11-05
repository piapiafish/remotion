@echo off
chcp 65001 >nul
cd /d "%~dp0"
powershell.exe -NoExit -NoProfile -ExecutionPolicy Bypass -File "%~dp0OPEN_P0_TERMINAL.ps1" -ProjectRoot "%~dp0."
