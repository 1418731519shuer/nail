# 一键启动（Windows）：首次自动初始化，后续直接启动
$Root  = Split-Path -Parent $MyInvocation.MyCommand.Path
$Admin = Join-Path $Root "admin-ops"
$Db    = Join-Path $Admin "styles.db"

if (-not (Test-Path $Db)) {
    Write-Host "⚙️  首次运行，初始化数据（约 1-2 分钟）..." -ForegroundColor Cyan

    # 安装 npm 依赖
    Write-Host "→ 安装 npm 依赖..."
    Push-Location $Admin; npm install --silent; Pop-Location

    # 生成所有数据
    bash (Join-Path $Root "user-client/scripts/run_all.sh")

    Write-Host "✅ 初始化完成！" -ForegroundColor Green
}

# API Key 提示
$KeyFile = Join-Path $Root "user-client/deepseek-key.txt"
$KeyVal  = (Get-Content $KeyFile -ErrorAction SilentlyContinue) -replace '\s',''
if ($KeyVal -eq "在此填写你的DeepSeekAPIKey" -or [string]::IsNullOrEmpty($KeyVal)) {
    Write-Host "⚠️  AI 功能需要 DeepSeek API Key，请填写 user-client/deepseek-key.txt" -ForegroundColor Yellow
}

# 启动
Write-Host "🚀 启动运营端..." -ForegroundColor Green
Set-Location $Admin
npm run dev:full
