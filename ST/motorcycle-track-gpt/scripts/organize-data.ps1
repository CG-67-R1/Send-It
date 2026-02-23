# PowerShell script to help organize TRackDayAI-data files
param([string]$DataPath = "TRackDayAI-data", [switch]$DryRun = $false)
Write-Host "Motorcycle Track Day GPT - Data Organization Script" -ForegroundColor Cyan
$destinations = @{"suspension" = "knowledge-base\suspension"; "chassis" = "knowledge-base\chassis"; "riding-techniques" = "knowledge-base\riding-techniques"; "track-analysis" = "knowledge-base\track-analysis"; "bike-specs" = "knowledge-base\bike-specs"; "equipment" = "knowledge-base\equipment"}
$keywords = @{"suspension" = @("suspension", "shock", "fork", "damping", "spring", "rebound", "compression", "preload", "ohlins", "racetech", "k-tech"); "chassis" = @("chassis", "geometry", "rake", "trail", "wheelbase", "ride height", "setup", "handling"); "riding-techniques" = @("riding", "technique", "coaching", "cornering", "braking", "body position", "line", "track coach"); "track-analysis" = @("track", "mallala", "phillip island", "circuit", "corner", "lap"); "bike-specs" = @("spec", "specification", "bike", "motorcycle", "model", "year", "r6", "r1", "zx4"); "equipment" = @("tyre", "tire", "wear", "product", "equipment", "brand")}
if (-not (Test-Path $DataPath)) { Write-Host "Error: Data path not found!" -ForegroundColor Red; exit 1 }
$files = Get-ChildItem -Path $DataPath -File
Write-Host "Found $($files.Count) files to analyze" -ForegroundColor Yellow
$suggestions = @()
foreach ($file in $files) {
    Write-Host "Analyzing: $($file.Name)" -ForegroundColor Gray
    try { $content = Get-Content -Path $file.FullName -TotalCount 50 -ErrorAction SilentlyContinue | Out-String; $contentLower = $content.ToLower() } catch { Write-Host "  Warning: Could not read file" -ForegroundColor Yellow; continue }
    $scores = @{}
    foreach ($category in $keywords.Keys) {
        $score = 0
        foreach ($keyword in $keywords[$category]) {
            if ($contentLower -match $keyword) { $score += ([regex]::Matches($contentLower, $keyword)).Count }
        }
        $scores[$category] = $score
    }
    $bestCategory = ($scores.GetEnumerator() | Sort-Object Value -Descending | Select-Object -First 1).Key
    $bestScore = $scores[$bestCategory]
    if ($bestScore -eq 0) { $bestCategory = "equipment"; Write-Host "  No clear category match - suggesting equipment" -ForegroundColor Yellow } else { Write-Host "  Suggested category: $bestCategory (score: $bestScore)" -ForegroundColor Green }
    $suggestions += [PSCustomObject]@{File = $file.Name; Category = $bestCategory; Destination = $destinations[$bestCategory]; Score = $bestScore}
}
Write-Host ""; Write-Host "=" * 60 -ForegroundColor Cyan; Write-Host "SUGGESTED FILE ORGANIZATION" -ForegroundColor Cyan; Write-Host "=" * 60 -ForegroundColor Cyan; Write-Host ""
$grouped = $suggestions | Group-Object -Property Category
foreach ($group in $grouped) {
    Write-Host "Category: $($group.Name)" -ForegroundColor Magenta
    Write-Host "Destination: $($destinations[$group.Name])" -ForegroundColor Gray; Write-Host ""
    foreach ($item in $group.Group) {
        Write-Host "  - $($item.File)" -ForegroundColor White
        if ($item.Score -gt 0) { Write-Host "    (confidence: $($item.Score) keyword matches)" -ForegroundColor DarkGray }
    }
    Write-Host ""
}
Write-Host "=" * 60 -ForegroundColor Cyan; Write-Host "ACTION PLAN" -ForegroundColor Cyan; Write-Host "=" * 60 -ForegroundColor Cyan; Write-Host ""
if ($DryRun) {
    Write-Host "DRY RUN MODE - No files will be moved" -ForegroundColor Yellow
    Write-Host "To actually move files, run: .\scripts\organize-data.ps1" -ForegroundColor Yellow
} else {
    $response = Read-Host "Move files to suggested locations? (Y/N)"
    if ($response -eq "Y" -or $response -eq "y") {
        Write-Host "Moving files..." -ForegroundColor Green
        foreach ($suggestion in $suggestions) {
            $sourceFile = Join-Path $DataPath $suggestion.File
            $destDir = $suggestion.Destination
            if (-not (Test-Path $destDir)) { New-Item -ItemType Directory -Path $destDir -Force | Out-Null }
            $destFile = Join-Path $destDir $suggestion.File
            try { Copy-Item -Path $sourceFile -Destination $destFile -Force; Write-Host "  Copied: $($suggestion.File) -> $destDir" -ForegroundColor Green } catch { Write-Host "  Error copying $($suggestion.File): $_" -ForegroundColor Red }
        }
        Write-Host "Files organized! Original files remain in TRackDayAI-data" -ForegroundColor Green
    } else { Write-Host "Operation cancelled." -ForegroundColor Yellow }
}
