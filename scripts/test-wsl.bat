@echo off
REM Windows batch script to run tests in WSL
REM This avoids Windows Chinese path encoding issues

setlocal enabledelayedexpansion

echo ========================================
echo  WSL Test Runner
echo ========================================
echo.

REM Get current directory
set "CURRENT_DIR=%CD%"

REM Convert Windows path to WSL path
REM E:\path becomes /mnt/e/path
set "WSL_PATH=%CURRENT_DIR:\=/%"
set "WSL_PATH=%WSL_PATH::=\:%"
set "WSL_PATH=%WSL_PATH:E:=/mnt/e%"
set "WSL_PATH=%WSL_PATH:F:=/mnt/f%"

echo Windows path: %CURRENT_DIR%
echo WSL path:      %WSL_PATH%
echo.

echo [1/2] Checking WSL availability...
wsl --version >nul 2>&1
if %errorlevel% neq 0 (
    echo [ERROR] WSL is not available
    echo.
    echo Please install WSL or use one of these alternatives:
    echo   1. Install Docker Desktop
    echo   2. Move project to path without Chinese characters
    echo.
    pause
    exit /b 1
)

echo [OK] WSL is available
echo.
echo [2/2] Running tests in WSL...
echo.

REM Run tests in WSL
wsl bash -c "cd '%WSL_PATH%' && npm test"

if %errorlevel% equ 0 (
    echo.
    echo ========================================
    echo  All tests passed!
    echo ========================================
    exit /b 0
) else (
    echo.
    echo ========================================
    echo  Tests failed
    echo ========================================
    pause
    exit /b 1
)
