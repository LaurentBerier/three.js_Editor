@echo off
REM Start the three.js editor's local dev server.
REM Usage:
REM   start-editor.bat           -> port 8081 (default)
REM   start-editor.bat 8082      -> custom port
REM   set PORT=9000 ^&^& start-editor.bat -> via env var
setlocal
cd /d "%~dp0"
if not "%~1"=="" set PORT=%~1
if not defined PORT set PORT=8081
echo.
echo  three.js editor -- http://localhost:%PORT%/editor/
echo  Ctrl+C to stop.
echo.
python serve.py
if errorlevel 1 (
    echo.
    echo  Server exited with errorlevel %errorlevel%.
    pause
)
endlocal
