# Build and install the debug APK on a running Android emulator.
# Usage (from repo root or android-app): .\android-app\scripts\run-on-emulator.ps1
# Requires: ANDROID_HOME, a booted AVD (adb device), Studio JBR or JAVA_HOME.

$ErrorActionPreference = "Stop"

$ScriptDir = Split-Path -Parent $MyInvocation.MyCommand.Path
$AndroidApp = Split-Path -Parent $ScriptDir

$jbr = "C:\Program Files\Android\Android Studio\jbr"
if (-not $env:JAVA_HOME -or -not (Test-Path (Join-Path $env:JAVA_HOME "bin\java.exe"))) {
  if (Test-Path (Join-Path $jbr "bin\java.exe")) {
    $env:JAVA_HOME = $jbr
  }
}
if (-not $env:JAVA_HOME -or -not (Test-Path (Join-Path $env:JAVA_HOME "bin\java.exe"))) {
  throw "JAVA_HOME is not set and Studio JBR was not found at $jbr"
}
$javaBin = Join-Path $env:JAVA_HOME "bin"
if ($env:Path -notlike "*$javaBin*") {
  $env:Path = "$javaBin;$env:Path"
}
# CMake/NdkLocator spawn a JVM that does not inherit org.gradle.jvmargs (JDK 24+).
if (-not $env:JAVA_TOOL_OPTIONS) {
  $env:JAVA_TOOL_OPTIONS = "--enable-native-access=ALL-UNNAMED"
}
# Ninja on Windows still hits MAX_PATH; Cursor sandboxes can put Gradle caches in a long Temp path.
$env:GRADLE_USER_HOME = Join-Path $env:USERPROFILE ".gradle"

$sdk = $env:ANDROID_HOME
if (-not $sdk) { $sdk = $env:ANDROID_SDK_ROOT }
if (-not $sdk) { $sdk = Join-Path $env:LOCALAPPDATA "Android\Sdk" }
$adb = Join-Path $sdk "platform-tools\adb.exe"
if (-not (Test-Path $adb)) { throw "adb not found at $adb. Set ANDROID_HOME." }

$devices = & $adb devices | Select-String -Pattern "emulator-\d+\s+device"
if (-not $devices) {
  throw "No running emulator. Start Pixel_10_Pro (or any AVD) in Android Studio Device Manager, then retry."
}

Write-Host "Waiting for emulator package manager..."
$serial = (($devices | Select-Object -First 1).ToString() -split "\s+")[0]
$deadline = (Get-Date).AddMinutes(3)
$pkg = ""
do {
  $pkg = (& $adb -s $serial shell service check package 2>$null | Out-String).Trim()
  $boot = (& $adb -s $serial shell getprop sys.boot_completed 2>$null | Out-String).Trim()
  if ($pkg -eq "Service package: found" -and $boot -eq "1") { break }
  Start-Sleep -Seconds 4
} while ((Get-Date) -lt $deadline)
if ($pkg -ne "Service package: found") {
  throw "Emulator is online but the package manager is not ready (adb install would fail). Cold-boot the AVD in Device Manager (Wipe Data / Cold Boot) and retry."
}

Set-Location $AndroidApp
if (-not (Test-Path "node_modules")) {
  npm install
  if ($LASTEXITCODE -ne 0) { exit $LASTEXITCODE }
}

Write-Host "JAVA_HOME=$env:JAVA_HOME"
Write-Host "Installing debug build on:"
$devices | ForEach-Object { Write-Host "  $_" }
npx expo run:android
exit $LASTEXITCODE
