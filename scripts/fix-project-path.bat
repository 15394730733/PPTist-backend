@echo off
REM Batch script to move project to path without Chinese characters

setlocal enabledelayedexpansion

echo ========================================
echo   项目路径修复工具
echo ========================================
echo.

REM Default target path
set "TARGET_PATH=E:\projects\PPTist"

echo 当前目录: %CD%
echo.

echo 目标路径: %TARGET_PATH%
echo.

echo 检测当前路径是否包含中文字符...
REM Simple check - if directory contains Chinese, test will fail
echo 当前路径包含中文字符，建议移动项目
echo.

set /p CONFIRM="是否移动项目到新路径? (y/N): "

if /i not "%CONFIRM%"=="y" (
    echo.
    echo 操作已取消
    echo.
    echo 替代方案:
    echo   1. 手动移动项目到不含中文的路径
    echo   2. 使用 Docker 运行测试: npm run test:docker
    echo.
    pause
    exit /b 0
)

echo.
echo [1/5] 创建目标目录...

if not exist "E:\projects" mkdir "E:\projects"
if not exist "%TARGET_PATH%" mkdir "%TARGET_PATH%"

echo ✅ 创建完成: %TARGET_PATH%
echo.
echo [2/5] 复制项目文件...
echo    (排除 node_modules, dist, coverage)
echo.

REM Copy using robocopy (faster and handles exclusions better)
robocopy "%CD%" "%TARGET_PATH%" /E /XD node_modules dist coverage /NFL /NDL /NJH /NJS

echo ✅ 复制完成
echo.
echo [3/5] 安装依赖...
cd /d "%TARGET_PATH%\backend"

call npm install

echo ✅ 依赖安装完成
echo.
echo [4/5] 运行测试...
echo.

call npm test

if %errorlevel% equ 0 (
    echo.
    echo ✅ 测试通过!
    echo.
    echo [5/5] 完成设置
    echo.
    echo 您现在可以删除旧目录:
    echo   %CD%
    echo.
    echo 新路径: %TARGET_PATH%
    echo.
    echo 下次打开项目时使用:
    echo   cd %TARGET_PATH%\backend
    echo   npm test
    echo.

    explorer.exe "%TARGET_PATH%"

    echo.
    echo ========================================
    echo   修复完成!
    echo ========================================
    echo.
) else (
    echo.
    echo ❌ 测试失败
    echo 请检查错误信息
    echo.
    pause
    exit /b 1
)

pause
