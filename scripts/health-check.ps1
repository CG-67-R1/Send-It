# Hermes / local health check wrapper (Windows).
# Usage: .\scripts\health-check.ps1
# Env: API_URL, SKIP_TSC=1

$ErrorActionPreference = "Stop"
$ScriptDir = Split-Path -Parent $MyInvocation.MyCommand.Path
$RepoRoot = Split-Path -Parent $ScriptDir

Set-Location $RepoRoot
node "$ScriptDir\health-check.mjs" @args
exit $LASTEXITCODE
