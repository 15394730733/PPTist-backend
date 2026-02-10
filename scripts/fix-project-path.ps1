# PowerShell script to move project to a path without Chinese characters
# This fixes the Vitest Windows Chinese path encoding issue

param(
    [string]$TargetPath = "E:\projects\PPTist"
)

$ErrorActionPreference = "Stop"

Write-Host "========================================" -ForegroundColor Cyan
Write-Host "  项目路径修复工具" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""

# Get current directory
$CurrentPath = $PWD.Path
Write-Host "当前目录: $CurrentPath" -ForegroundColor Yellow
Write-Host ""

# Check if current path contains Chinese characters
$ContainsChinese = $CurrentPath -match '[\u4e00-\u9fa5]'

if (-not $ContainsChinese) {
    Write-Host "✅ 当前路径不包含中文字符" -ForegroundColor Green
    Write-Host ""
    Write-Host "您可以直接运行测试:" -ForegroundColor Yellow
    Write-Host "  npm test" -ForegroundColor Cyan
    exit 0
}

Write-Host "⚠️  当前路径包含中文字符，这将导致 Vitest 测试失败" -ForegroundColor Red
Write-Host ""
Write-Host "目标路径: $TargetPath" -ForegroundColor Yellow
Write-Host ""

# Confirm
$Confirm = Read-Host "是否移动项目到新路径? (y/N)"

if ($Confirm -ne "y" -and $Confirm -ne "Y") {
    Write-Host ""
    Write-Host "操作已取消" -ForegroundColor Yellow
    Write-Host ""
    Write-Host "替代方案:" -ForegroundColor Cyan
    Write-Host "  1. 手动移动项目到不含中文的路径" -ForegroundColor White
    Write-Host "  2. 使用 Docker 运行测试: npm run test:docker" -ForegroundColor White
    exit 0
}

Write-Host ""
Write-Host "[1/5] 创建目标目录..." -ForegroundColor Cyan
New-Item -ItemType Directory -Force -Path $TargetPath | Out-Null
Write-Host "✅ 创建完成: $TargetPath" -ForegroundColor Green

Write-Host ""
Write-Host "[2/5] 复制项目文件..." -ForegroundColor Cyan
Write-Host "   (排除 node_modules, dist, coverage)" -ForegroundColor Gray

# Copy files excluding node_modules, dist, coverage
$Exclude = @('node_modules', 'node_modules/*', 'dist', 'dist/*', 'coverage', 'coverage/*')
Get-ChildItem -Path $CurrentPath -Recurse -Exclude $Exclude | ForEach-Object {
    $DestPath = $_.FullName.Replace($CurrentPath, $TargetPath)
    $DestDir = Split-Path $DestPath -Parent

    if (-not (Test-Path $DestDir)) {
        New-Item -ItemType Directory -Force -Path $DestDir | Out-Null
    }

    if (-not $_.PSIsContainer) {
        Copy-Item $_.FullName -Destination $DestPath -Force
    }
}

Write-Host "✅ 复制完成" -ForegroundColor Green

Write-Host ""
Write-Host "[3/5] 安装依赖..." -ForegroundColor Cyan
Set-Location $TargetPath\backend
npm install
Write-Host "✅ 依赖安装完成" -ForegroundColor Green

Write-Host ""
Write-Host "[4/5] 运行测试..." -ForegroundColor Cyan
npm test

if ($LASTEXITCODE -eq 0) {
    Write-Host ""
    Write-Host "✅ 测试通过!" -ForegroundColor Green
    Write-Host ""
    Write-Host "[5/5] 清理旧目录..." -ForegroundColor Yellow
    Write-Host "您现在可以删除旧目录:" -ForegroundColor White
    Write-Host "  $CurrentPath" -ForegroundColor Gray
    Write-Host ""
    Write-Host "按任意键打开新目录..."
    $null = $Host.UI.RawUI.ReadKey("NoEcho,IncludeKeyDown")

    # Open new directory in Explorer
    explorer.exe $TargetPath

    Write-Host ""
    Write-Host "========================================" -ForegroundColor Green
    Write-Host "  修复完成!" -ForegroundColor Green
    Write-Host "========================================" -ForegroundColor Green
    Write-Host ""
    Write-Host "新路径: $TargetPath" -ForegroundColor Cyan
    Write-Host ""
    Write-Host "下次打开项目时使用:" -ForegroundColor Yellow
    Write-Host "  cd $TargetPath\backend" -ForegroundColor Cyan
    Write-Host "  npm test" -ForegroundColor Cyan
} else {
    Write-Host ""
    Write-Host "❌ 测试失败" -ForegroundColor Red
    Write-Host "请检查错误信息" -ForegroundColor Yellow
    exit 1
}
