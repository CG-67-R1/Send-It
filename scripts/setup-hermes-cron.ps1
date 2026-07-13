# Create Send-It Hermes cron jobs via CLI and start gateway scheduler.
# Usage: .\scripts\setup-hermes-cron.ps1
# Optional: -Deliver telegram|local  (default: telegram if configured, else local)

param(
  [string]$Deliver = ""
)

$ErrorActionPreference = "Stop"
$ScriptDir = Split-Path -Parent $MyInvocation.MyCommand.Path
$RepoRoot = Split-Path -Parent $ScriptDir
$HermesScripts = Join-Path $env:LOCALAPPDATA "hermes\scripts"
$SkillsDest = Join-Path $env:LOCALAPPDATA "hermes\skills\send-it"

function Test-HermesCli {
  if (-not (Get-Command hermes -ErrorAction SilentlyContinue)) {
    Write-Error "hermes CLI not found. Install Hermes Agent first."
  }
}

function Resolve-DeliverTarget {
  param([string]$Preferred)
  if ($Preferred) { return $Preferred }
  $config = Join-Path $env:LOCALAPPDATA "hermes\config.yaml"
  if (Test-Path $config) {
    $raw = Get-Content $config -Raw
    if ($raw -match "telegram:") { return "telegram" }
  }
  return "local"
}

function Remove-ExistingSendItJobs {
  $list = hermes cron list 2>&1 | Out-String
  if ($list -match "No scheduled jobs") { return }
  $ids = [regex]::Matches($list, "(?m)^\s*([a-f0-9]{12})\s+\[") | ForEach-Object { $_.Groups[1].Value }
  foreach ($id in $ids) {
    $block = [regex]::Match($list, "(?s)$id\s+\[active\].*?(?=\n\s+[a-f0-9]{12}\s+\[|\z)")
    if ($block.Success -and $block.Value -match "Send-It") {
      Write-Host "Removing existing job $id" -ForegroundColor DarkYellow
      hermes cron remove $id 2>&1 | Out-Null
    }
  }
}

Write-Host "Send-It Hermes cron setup" -ForegroundColor Cyan
Write-Host "Repo: $RepoRoot`n"
Test-HermesCli

& (Join-Path $ScriptDir "install-hermes-skills.ps1")
if (-not (Test-Path (Join-Path $SkillsDest "rr-app-expert\SKILL.md"))) {
  Write-Error "rr-app-expert skill missing after install"
}

$deliver = Resolve-DeliverTarget -Preferred $Deliver
Write-Host "Delivery target: $deliver" -ForegroundColor Green

New-Item -ItemType Directory -Force -Path $HermesScripts | Out-Null
Copy-Item -Path (Join-Path $ScriptDir "hermes-send-it-daily-gate.py") -Destination (Join-Path $HermesScripts "send-it-daily-gate.py") -Force
Write-Host "Copied daily gate script to $HermesScripts\send-it-daily-gate.py" -ForegroundColor Green

Remove-ExistingSendItJobs

Write-Host "Creating daily gate (weekdays 8:00, no-agent, zero Nous tokens on pass)..." -ForegroundColor Cyan
hermes cron create "0 8 * * 1-5" `
  --no-agent `
  --script send-it-daily-gate.py `
  --name "Send-It daily gate" `
  --deliver $deliver `
  --workdir $RepoRoot

$weeklyPrompt = @'
Run weekly-review mode. Full preflight, production health-check (API_URL=https://send-it-ke7r.onrender.com), screen audit, coding improvements scan. Write docs/reviews/RR_REVIEW_<today>.md. Compare to prior RR_REVIEW_*.md and GPT_REPO_PARITY_AUDIT_*.md. Report only - no commits. End with P0/P1/P2 counts and top 3 Cursor fixes.
'@

Write-Host "Creating weekly review (Mondays 9:00)..." -ForegroundColor Cyan
hermes cron create "0 9 * * 1" $weeklyPrompt `
  --name "Send-It weekly review" `
  --skill send-it/rr-app-expert `
  --skill send-it/mobile-review `
  --workdir $RepoRoot `
  --deliver $deliver

Write-Host "`nCron jobs:" -ForegroundColor Cyan
hermes cron list

$gw = hermes gateway status 2>&1 | Out-String
if ($gw -notmatch "Gateway process running") {
  Write-Host "`nGateway not running - installing scheduled task and starting..." -ForegroundColor Yellow
  hermes gateway install --start-now --start-on-login 2>&1
  hermes gateway status 2>&1
} else {
  Write-Host "`nGateway already running." -ForegroundColor Green
}

Write-Host "`nDone. Daily gate is script-only (silent on pass). Weekly review uses Nous credits." -ForegroundColor Green
$dailyPath = Join-Path $HermesScripts "send-it-daily-gate.py"
Write-Host "Test daily gate now: python $dailyPath" -ForegroundColor DarkGray
Write-Host 'Manual weekly run: hermes cron run WEEKLY_JOB_ID' -ForegroundColor DarkGray
