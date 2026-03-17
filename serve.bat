@echo off
set PORT=3000

echo.
echo ========================================
echo   ChromaCraft Local Dev Server
echo ========================================
echo.

where python >nul 2>nul
if %ERRORLEVEL% EQU 0 (
    echo [INFO] Starting Python HTTP Server on port %PORT%...
    echo [INFO] Open http://localhost:%PORT% in your browser.
    python -m http.server %PORT%
    goto :EOF
)

where npx >nul 2>nul
if %ERRORLEVEL% EQU 0 (
    echo [INFO] Starting npx serve on port %PORT%...
    npx serve -l %PORT% .
    goto :EOF
)

echo [ERROR] No Python or Node.js found in PATH.
echo Please install Python or Node.js to use this serve script, 
echo or simply open index.html directly in your browser.
pause
