# Install all dependencies (api + app). Run from repo root.
# Requires Node.js: https://nodejs.org/

$ErrorActionPreference = "Stop"
$root = Split-Path -Parent (Split-Path -Parent $PSScriptRoot)
if (-not (Test-Path $root)) { $root = (Get-Location).Path }

Write-Host "Installing dependencies from: $root" -ForegroundColor Cyan

$api = Join-Path $root "api"
$app = Join-Path $root "app"

if (Test-Path (Join-Path $api "package.json")) {
  Write-Host "`n--- api ---" -ForegroundColor Yellow
  Set-Location $api
  npm install
  if ($LASTEXITCODE -ne 0) { exit $LASTEXITCODE }
} else {
  Write-Host "api/package.json not found, skipping api." -ForegroundColor Gray
}

if (Test-Path (Join-Path $app "package.json")) {
  Write-Host "`n--- app ---" -ForegroundColor Yellow
  Set-Location $app
  npm install
  if ($LASTEXITCODE -ne 0) { exit $LASTEXITCODE }
} else {
  Write-Host "app/package.json not found, skipping app." -ForegroundColor Gray
}

Write-Host "`nDone. You can run: cd api && npm start" -ForegroundColor Green
