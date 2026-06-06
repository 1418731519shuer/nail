$Root = Split-Path -Parent $MyInvocation.MyCommand.Path
$UserDir = Join-Path $Root "user-client"
$AdminDir = Join-Path $Root "admin-ops"

Write-Host "Starting user client API on http://localhost:4173"
if (-not (Test-Path (Join-Path $UserDir ".env"))) {
  Copy-Item (Join-Path $UserDir ".env.example") (Join-Path $UserDir ".env")
  Write-Host "Created user-client\\.env from .env.example. Please fill DEEPSEEK_API_KEY if needed."
}

$UserProcess = Start-Process -FilePath "node" -ArgumentList "server.js" -WorkingDirectory $UserDir -PassThru -WindowStyle Hidden

Write-Host "Starting admin ops UI on http://127.0.0.1:3000"
if (-not (Test-Path (Join-Path $AdminDir "node_modules"))) {
  Push-Location $AdminDir
  npm install
  Pop-Location
}

$AdminProcess = Start-Process -FilePath "npm" -ArgumentList "run dev -- --host 127.0.0.1" -WorkingDirectory $AdminDir -PassThru -WindowStyle Hidden

Write-Host ""
Write-Host "User client: http://localhost:4173"
Write-Host "Admin ops:   http://127.0.0.1:3000"
Write-Host "Process ids: user=$($UserProcess.Id), admin=$($AdminProcess.Id)"
