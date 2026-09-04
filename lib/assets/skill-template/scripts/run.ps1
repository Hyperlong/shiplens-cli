$ErrorActionPreference = "Stop"

function Fail-Package([string]$Message) {
    @{ ok = $false; error = @{ code = "INVALID_PACKAGE"; message = $Message } } | ConvertTo-Json -Compress
    exit 7
}

$ScriptDir = Split-Path -Parent $MyInvocation.MyCommand.Path
$SkillDir = Split-Path -Parent $ScriptDir
$ManifestPath = Join-Path $SkillDir "manifest.json"

if (-not (Test-Path $ManifestPath -PathType Leaf)) { Fail-Package "manifest.json is missing" }
try {
    $Manifest = Get-Content $ManifestPath -Raw -Encoding UTF8 | ConvertFrom-Json
} catch {
    Fail-Package "manifest.json is invalid"
}

$SkillVersion = [string]$Manifest.version
$MinVersion = [string]$Manifest.cli.min_version
if (-not $SkillVersion) { Fail-Package "manifest version is empty" }
if (-not $MinVersion) { Fail-Package "manifest cli.min_version is empty" }

function Find-Binary {
    $cmd = Get-Command "shiplens.cmd" -ErrorAction SilentlyContinue
    if ($cmd) { return $cmd.Source }
    $cmd = Get-Command "shiplens" -ErrorAction SilentlyContinue
    if ($cmd) { return $cmd.Source }

    $npmGlobal = Join-Path $env:APPDATA "npm\shiplens.cmd"
    if (Test-Path $npmGlobal -PathType Leaf) { return $npmGlobal }

    return $null
}

function Compare-SemVer([string]$A, [string]$B) {
    $Pattern = '^(\d+)\.(\d+)\.(\d+)(?:-([0-9A-Za-z.-]+))?$'
    if ($A -notmatch $Pattern) { return -1 }
    $AMatch = [regex]::Match($A, $Pattern)
    if ($B -notmatch $Pattern) { return 1 }
    $BMatch = [regex]::Match($B, $Pattern)
    foreach ($Index in 1..3) {
        $ANumber = [int64]$AMatch.Groups[$Index].Value
        $BNumber = [int64]$BMatch.Groups[$Index].Value
        if ($ANumber -gt $BNumber) { return 1 }
        if ($ANumber -lt $BNumber) { return -1 }
    }
    return 0
}

$Binary = Find-Binary

function Test-Ready {
    if (-not $Binary) { return $false }
    try {
        $verOut = & $Binary --version
        $ver = ""
        if ($verOut -match 'v?(\d+\.\d+\.\d+)') {
            $ver = $Matches[1]
        }
        if (-not $ver) { return $false }
        return (Compare-SemVer $ver $MinVersion) -ge 0
    } catch {
        return $false
    }
}

if ($args.Count -gt 0 -and $args[0] -eq "status") {
    if (Test-Ready) {
        $verOut = & $Binary --version
        $ver = ""
        if ($verOut -match 'v?(\d+\.\d+\.\d+)') { $ver = $Matches[1] }
        @{
            ok = $true
            installed = $true
            binary_path = $Binary
            version = $ver
            skill = @{ current_version = $SkillVersion; min_cli_version = $MinVersion }
            next_action = "ready"
        } | ConvertTo-Json -Compress -Depth 4
    } else {
        @{
            ok = $true
            installed = $false
            skill = @{ current_version = $SkillVersion; min_cli_version = $MinVersion }
            next_action = "request_install_consent"
        } | ConvertTo-Json -Compress -Depth 4
    }
    exit 0
}

if ($args.Count -gt 0 -and $args[0] -eq "setup") {
    & (Join-Path $ScriptDir "setup.ps1") @($args | Select-Object -Skip 1)
    exit $LASTEXITCODE
}

if (-not (Test-Ready)) {
    @{ ok = $false; error = @{ code = "CLI_NOT_INSTALLED"; message = "Run scripts/setup.ps1 after user approves installation" } } | ConvertTo-Json -Compress
    exit 7
}

& $Binary @args
exit $LASTEXITCODE
