$ErrorActionPreference = "Stop"

$ScriptDir = Split-Path -Parent $MyInvocation.MyCommand.Path
$SkillDir = Split-Path -Parent $ScriptDir
$ManifestPath = Join-Path $SkillDir "manifest.json"

try {
    $Manifest = Get-Content $ManifestPath -Raw -Encoding UTF8 | ConvertFrom-Json
} catch {
    @{ ok = $false; error = @{ code = "INVALID_PACKAGE"; message = "manifest.json is missing or invalid" } } | ConvertTo-Json -Compress
    exit 7
}

$PkgName = if ($Manifest.cli.npm_package) { [string]$Manifest.cli.npm_package } else { "@shiplens/cli" }

try {
    & npm.cmd install -g $PkgName | Out-Null
} catch {
    @{ ok = $false; error = @{ code = "INSTALL_FAILED"; message = $_.Exception.Message } } | ConvertTo-Json -Compress
    exit 1
}

$cmd = Get-Command "shiplens.cmd" -ErrorAction SilentlyContinue
$Binary = if ($cmd) { $cmd.Source } else { Join-Path $env:APPDATA "npm\shiplens.cmd" }

if (Test-Path $Binary -PathType Leaf) {
    $verOut = & $Binary --version
    $ver = ""
    if ($verOut -match 'v?(\d+\.\d+\.\d+)') { $ver = $Matches[1] }
    @{
        ok = $true
        installed = $true
        binary_path = $Binary
        version = $ver
        message = "Shiplens CLI installed successfully"
    } | ConvertTo-Json -Compress
    exit 0
} else {
    @{ ok = $false; error = @{ code = "BINARY_NOT_FOUND"; message = "Installation finished but binary not found in PATH" } } | ConvertTo-Json -Compress
    exit 1
}
