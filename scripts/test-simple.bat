@echo off
REM Windows batch script to run tests with path encoding fix
REM This script sets environment variables and runs tests

setlocal enabledelayedexpansion

echo ========================================
echo  Test Runner for Windows
echo ========================================
echo.

REM Set environment variables to fix path encoding
set NODE_OPTIONS=--max-old-space-size=4096
set VITE_USE_WS=0

REM Check if Docker is available
docker --version >nul 2>&1
if %errorlevel% equ 0 (
    echo [1/3] Docker is available
    echo [2/3] Running tests in Docker container...
    echo.

    docker-compose -f docker-compose.test.yml up --build --abort-on-container-exit
    if %errorlevel% equ 0 (
        echo.
        echo ========================================
        echo  All tests passed!
        echo ========================================
        exit /b 0
    ) else (
        echo.
        echo ========================================
        echo  Tests failed in Docker
        echo ========================================
        exit /b 1
    )
) else (
    echo [WARNING] Docker not found
    echo.
    echo Since the project path contains Chinese characters,
    echo we need to use an alternative method.
    echo.
    echo Please choose:
    echo   1. Install Docker Desktop (Recommended)
    echo   2. Move project to a path without Chinese characters
    echo   3. Use WSL (Windows Subsystem for Linux)
    echo.
    echo Current directory: %CD%
    echo.

    pause
    exit /b 1
)
