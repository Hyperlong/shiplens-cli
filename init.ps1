# Shiplens CLI — Automated Installer & Initializer (Windows)
# Copyright (c) 2026 Shiplens Team. Licensed under Apache-2.0.

$ErrorActionPreference = "Stop"

[Net.ServicePointManager]::SecurityProtocol = [Net.SecurityProtocolType]::Tls12

$Version = "v2.0.0"
$OwnerRepo = "Hyperlong/shiplens-cli"

# Detect architecture
$Is64Bit = [Environment]::Is64BitOperatingSystem
if (-not $Is64Bit) {
    Write-Error "Error: Shiplens CLI requires a 64-bit operating system."
    exit 1
}

$Arch = "windows-amd64"
$ExpectedHash = "c06bfa12d54a58985e7327dc0c8a60c0e58cf8502083554af448b83a98f36932"

if ($env:PROCESSOR_ARCHITECTURE -eq "ARM64") {
    $Arch = "windows-arm64"
    $ExpectedHash = "7a6492b119d6002f22732409a4dd1c2125af62b6979c62ef1f811bce6ac6f9c8"
}

$InstallDir = Join-Path $env:LOCALAPPDATA "Shiplens\bin"
$BinaryPath = Join-Path $InstallDir "shiplens.exe"

$NeedDownload = $true
if (Test-Path $BinaryPath -PathType Leaf) {
    try {
        $CurrentHash = (Get-FileHash -Algorithm SHA256 $BinaryPath).Hash.ToLowerInvariant()
        if ($CurrentHash -eq $ExpectedHash) {
            $NeedDownload = $false
        }
    } catch {}
}

if ($NeedDownload) {
    if (-not (Test-Path $InstallDir)) {
        New-Item -ItemType Directory -Force -Path $InstallDir | Out-Null
    }

    $DownloadUrl = "https://github.com/$OwnerRepo/releases/download/$Version/shiplens-$Arch.exe"
    $TempFile = Join-Path ([IO.Path]::GetTempPath()) ("shiplens-install-" + [Guid]::NewGuid().ToString("N") + ".exe")

    Write-Host "[Shiplens] Downloading native runtime ($Arch)..." -ForegroundColor Cyan
    try {
        Invoke-WebRequest -UseBasicParsing -Uri $DownloadUrl -OutFile $TempFile
    } catch {
        Write-Error "[Shiplens] Failed to download binary from $DownloadUrl. Please check your network connection."
        exit 1
    }

    $DownloadedHash = (Get-FileHash -Algorithm SHA256 $TempFile).Hash.ToLowerInvariant()
    if ($DownloadedHash -ne $ExpectedHash) {
        Remove-Item -Force $TempFile -ErrorAction SilentlyContinue
        Write-Error "[Shiplens] Integrity verification failed (checksum mismatch)."
        exit 1
    }

    Move-Item -Force $TempFile $BinaryPath
    Write-Host "[Shiplens] Installed successfully to $BinaryPath" -ForegroundColor Green
}

# Ensure PATH is registered for current process
if ($env:PATH -notlike "*$InstallDir*") {
    $env:PATH = "$InstallDir;" + $env:PATH
}

# Ensure PATH is permanently registered for User scope without UAC prompt
try {
    $UserPath = [Environment]::GetEnvironmentVariable("Path", "User")
    if ($UserPath -notlike "*$InstallDir*") {
        $NewPath = "$InstallDir;" + $UserPath
        [Environment]::SetEnvironmentVariable("Path", $NewPath, "User")
    }
} catch {}

# Execute initialization in the current working project directory
& "$BinaryPath" init --json @args
