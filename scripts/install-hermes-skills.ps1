# Copy Send-It Hermes skills from repo into %LOCALAPPDATA%\hermes\skills\send-it\
# Usage: .\scripts\install-hermes-skills.ps1

$ErrorActionPreference = "Stop"
$ScriptDir = Split-Path -Parent $MyInvocation.MyCommand.Path
$RepoRoot = Split-Path -Parent $ScriptDir
$Source = Join-Path $RepoRoot "docs\hermes\skills\send-it"
$Dest = Join-Path $env:LOCALAPPDATA "hermes\skills\send-it"

if (-not (Test-Path $Source)) {
  Write-Error "Source not found: $Source"
}

New-Item -ItemType Directory -Force -Path $Dest | Out-Null
Copy-Item -Path (Join-Path $Source "*") -Destination $Dest -Recurse -Force

Write-Host "Installed Hermes skills to $Dest"
Get-ChildItem $Dest -Directory | ForEach-Object { Write-Host "  - send-it/$($_.Name)" }
