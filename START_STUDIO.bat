@echo off
chcp 65001>nul
cd /d "%~dp0"
echo [3D Promo Studio] Starting the original visual editor...
if not exist node_modules (
 echo Missing root node_modules. Run SETUP_WINDOWS.bat first.
 pause
 exit /b 1
)
call npm run dev
pause
