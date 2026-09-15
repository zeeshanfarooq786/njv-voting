@echo off
cd /d "%~dp0frontend"
start "NJV Election" cmd /c "npm run dev"
timeout /t 4 /nobreak >nul
set CHROME=
if exist "%ProgramFiles%\Google\Chrome\Application\chrome.exe" set CHROME=%ProgramFiles%\Google\Chrome\Application\chrome.exe
if exist "%ProgramFiles(x86)%\Google\Chrome\Application\chrome.exe" set CHROME=%ProgramFiles(x86)%\Google\Chrome\Application\chrome.exe
if exist "%ProgramFiles%\Microsoft\Edge\Application\msedge.exe" if "%CHROME%"=="" set CHROME=%ProgramFiles%\Microsoft\Edge\Application\msedge.exe
if "%CHROME%"=="" (
  start http://localhost:5173/
) else (
  start "" "%CHROME%" --autoplay-policy=no-user-gesture-required --new-window http://localhost:5173/
)
