@echo off
chcp 65001 >nul
powershell.exe -NoProfile -ExecutionPolicy Bypass -File "%~dp0CHECK_P0_ENV.ps1" -ProjectRoot "%~dp0."
pause
