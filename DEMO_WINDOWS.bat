@echo off
chcp 65001>nul
cd /d "%~dp0"
call npm run agent:plan -- --brief "一款让日常工作更智能、更高效的产品" --media assets/demo.mp4 --shots 3
if errorlevel 1 goto failed
call npm run agent:validate
if errorlevel 1 goto failed
call npm run agent:render -- --storyboard work/storyboard.json --out output
if errorlevel 1 goto failed
echo Output video: %~dp0output\final.mp4
pause
exit /b 0
:failed
echo Demo stopped due to an error. Check output\render-report.json
pause
exit /b 1
