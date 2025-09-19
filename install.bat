@echo off
echo ========================================
echo LM Studio Firefox Extension Installer
echo ========================================
echo.

echo Checking prerequisites...

:: Check if Firefox is installed
where firefox >nul 2>nul
if %errorlevel% neq 0 (
    echo ERROR: Firefox not found in PATH
    echo Please install Firefox or add it to your PATH
    pause
    exit /b 1
)

echo ✓ Firefox found

:: Check if LM Studio is running
echo Checking LM Studio connection...
curl -s http://localhost:1234/v1/models >nul 2>nul
if %errorlevel% neq 0 (
    echo WARNING: LM Studio not detected on localhost:1234
    echo Please start LM Studio and enable the local server
    echo.
    echo To start LM Studio server:
    echo 1. Open LM Studio
    echo 2. Go to "Local Server" tab
    echo 3. Click "Start Server"
    echo 4. Ensure port is set to 1234
    echo.
) else (
    echo ✓ LM Studio server detected
)

echo.
echo Installing extension in Firefox...
echo.
echo MANUAL INSTALLATION STEPS:
echo 1. Open Firefox
echo 2. Go to about:debugging
echo 3. Click "This Firefox"
echo 4. Click "Load Temporary Add-on"
echo 5. Navigate to: %cd%
echo 6. Select manifest.json
echo.

echo Opening Firefox debugging page...
start firefox about:debugging#/runtime/this-firefox

echo.
echo Installation complete!
echo The extension will appear in your Firefox toolbar once loaded.
echo.
pause
