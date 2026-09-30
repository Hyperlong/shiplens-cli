# Shiplens CLI — Automated Installer & Initializer (Windows)
# Copyright (c) 2026 Shiplens Team. Licensed under Apache-2.0.

$ErrorActionPreference = "Stop"

[Net.ServicePointManager]::SecurityProtocol = [Net.SecurityProtocolType]::Tls12

$Version = "v2.3.0"
$OwnerRepo = "Hyperlong/shiplens-cli"

# Detect architecture
$Is64Bit = [Environment]::Is64BitOperatingSystem
if (-not $Is64Bit) {
    Write-Error "Error: Shiplens CLI requires a 64-bit operating system."
    exit 1
}

$Arch = "windows-amd64"
$ExpectedHash = "62f78ebf437906ba4c9ce48cfbbbb0c235d6135dec5f590c7a226590edc55792"

if ($env:PROCESSOR_ARCHITECTURE -eq "ARM64") {
    $Arch = "windows-arm64"
    $ExpectedHash = "dd489831c49487635cbee05f19e70b2a5dacd700b65ad01c129092a5dc679cac"
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