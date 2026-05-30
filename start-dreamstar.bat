@echo off
setlocal

cd /d "%~dp0"

set ELECTRON_MIRROR=https://npmmirror.com/mirrors/electron/

where node >nul 2>nul
if errorlevel 1 (
  echo Node.js was not found. Please install Node.js first.
  pause
  exit /b 1
)

where npm >nul 2>nul
if errorlevel 1 (
  echo npm was not found. Please install Node.js with npm first.
  pause
  exit /b 1
)

if not exist "node_modules" (
  echo Installing dependencies...
  call npm install
  if errorlevel 1 (
    echo npm install failed.
    pause
    exit /b 1
  )
)

if not exist "node_modules\electron\path.txt" (
  goto install_electron_binary
)

if not exist "node_modules\electron\dist\electron.exe" (
  goto install_electron_binary
)

goto start_app

:install_electron_binary
  echo Installing Electron binary...
  call npx install-electron --no
  if errorlevel 1 (
    echo Electron binary install failed.
    echo You can retry with: npx install-electron --no
    pause
    exit /b 1
  )

:start_app

echo Starting DreamStar Server Manager...
call npm run dev

if errorlevel 1 (
  echo DreamStar Server Manager exited with an error.
  pause
  exit /b 1
)

endlocal
