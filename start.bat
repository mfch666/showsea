@echo off
setlocal EnableExtensions
cd /d "%~dp0"

if not exist "src\server.js" (
  echo [ERROR] Cannot find src\server.js in this folder.
  echo Put start.bat in the project root beside the src folder.
  goto :end
)

set "NODE=node"
where node >nul 2>&1
if not errorlevel 1 goto :nodeok
if exist "C:\Program Files\nodejs\node.exe" set "NODE=C:\Program Files\nodejs\node.exe" & goto :nodeok

rem Locate WorkBuddy managed node without a backslash-dot literal in any for-loop path
set "BASE=%USERPROFILE%"
for /f "delims=" %%w in ('dir /b /ad "%BASE%" 2^>nul ^| findstr ".workbuddy"') do (
  set "WB=%BASE%\%%w\binaries\node\versions"
)
if defined WB (
  for /f "delims=" %%d in ('dir /b /ad "%WB%" 2^>nul') do (
    if exist "%WB%\%%d\node.exe" set "NODE=%WB%\%%d\node.exe" & goto :nodeok
  )
)

echo [ERROR] node.exe not found in PATH or common locations.
echo Install Node.js from https://nodejs.org or add it to PATH.
goto :end

:nodeok
set "URL=http://localhost:3000/"
if not "%~1"=="" set "URL=http://localhost:3000/?repo=%~1"

echo ============================================
echo  GitHub Showcase - starting local server
echo  Using node: %NODE%
echo  Open:  %URL%
echo  Close this window or press Ctrl+C to stop.
echo ============================================
echo.

start "" cmd /c "ping -n 4 127.0.0.1 >nul & start "" "%URL%""

"%NODE%" src/server.js

:end
echo.
echo [done] Press any key to close this window.
pause >nul
