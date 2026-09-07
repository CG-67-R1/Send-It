# Start the headlines API on port 3001 for the Android emulator (10.0.2.2:3001).
# Usage (from repo root): .\scripts\start-local-api.ps1

$ErrorActionPreference = "Stop"
$ScriptDir = Split-Path -Parent $MyInvocation.MyCommand.Path
$RepoRoot = Split-Path -Parent $ScriptDir
$ApiDir = Join-Path $RepoRoot "api"

if (-not (Test-Path (Join-Path $ApiDir "package.json"))) {
  throw "api/package.json not found at $ApiDir"
}

Set-Location $ApiDir
if (-not (Test-Path "node_modules")) {
  npm install
  if ($LASTEXITCODE -ne 0) { exit $LASTEXITCODE }
}

Write-Host "Starting API at http://localhost:3001 (emulator: http://10.0.2.2:3001)"
npm start
exit $LASTEXITCODE
