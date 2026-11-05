@echo off
chcp 65001>nul
cd /d "%~dp0"
echo Installing original studio dependencies...
call npm ci
if errorlevel 1 goto failed
echo Installing Python Playwright...
python -m pip install -r services\render-worker\requirements.txt
if errorlevel 1 goto failed
python -m playwright install chromium
if errorlevel 1 goto failed
echo Installing Remotion compositor...
pushd remotion-compositor
call npm ci
if errorlevel 1 (popd & goto failed)
popd
call npm run agent:doctor
if errorlevel 1 goto failed
pause
exit /b 0
:failed
echo Dependency installation failed. Check internet access, Python, npm and Node 22.
pause
exit /b 1
