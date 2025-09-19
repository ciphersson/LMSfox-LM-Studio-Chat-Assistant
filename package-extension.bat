@echo off
echo ========================================
echo LM Studio Firefox Extension Packager
echo ========================================
echo.

:: Check if we're in the right directory
if not exist "manifest.json" (
    echo ERROR: manifest.json not found
    echo Please run this script from the extension directory
    pause
    exit /b 1
)

echo Creating distribution package...

:: Create dist directory
if not exist "dist" mkdir dist

:: Remove old packages
if exist "dist\*.xpi" del "dist\*.xpi"
if exist "dist\*.zip" del "dist\*.zip"

:: Create file list for packaging
echo Creating file list...
set FILES=manifest.json popup.html chat.html options.html background.js content.js content.css

:: Check if all required files exist
for %%f in (%FILES%) do (
    if not exist "%%f" (
        echo WARNING: %%f not found
    ) else (
        echo ✓ %%f
    )
)

:: Check directories
for %%d in (styles scripts icons) do (
    if not exist "%%d" (
        echo WARNING: %%d directory not found
    ) else (
        echo ✓ %%d/
    )
)

echo.
echo Packaging extension...

:: Use PowerShell to create zip file
powershell -Command "& {
    $compress = @{
        Path = 'manifest.json', 'popup.html', 'chat.html', 'options.html', 'background.js', 'content.js', 'content.css', 'styles', 'scripts', 'icons'
        CompressionLevel = 'Optimal'
        DestinationPath = 'dist\lm-studio-extension.zip'
    }
    Compress-Archive @compress -Force
}"

if %errorlevel% neq 0 (
    echo ERROR: Failed to create package
    pause
    exit /b 1
)

:: Rename to .xpi for Firefox
copy "dist\lm-studio-extension.zip" "dist\lm-studio-extension.xpi" >nul

echo.
echo ✅ Package created successfully!
echo.
echo Files created:
echo   📦 dist\lm-studio-extension.zip
echo   🦊 dist\lm-studio-extension.xpi
echo.
echo Installation options:
echo   1. Developer mode: Load manifest.json in about:debugging
echo   2. Package install: Drag .xpi file to Firefox
echo.
echo Next steps:
echo   1. Test the extension in Firefox
echo   2. Share the .xpi file for distribution
echo.
pause
