@echo off
chcp 65001>nul
cd /d "%~dp0"
echo Installing original studio dependencies...
call npm ci
if errorlevel 1 goto failed
echo Installing Python Playwright...
python -m pip install playwright
if errorlevel 1 goto failed
echo Installing Remotion compositor...
pushd remotion-compositor
call npm install
if errorlevel 1 (popd & goto failed)
popd
call npm run agent:doctor
pause
exit /b 0
:failed
echo Dependency installation failed. Check internet access, Python, npm and Node 22.
pause
exit /b 1
