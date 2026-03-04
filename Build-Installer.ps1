#Requires -RunAsAdministrator
<#
.SYNOPSIS
    Vela Installer – .exe Packaging Script (I-06)
    Konvertiert Vela-Setup.ps1 zu einer signierten .exe mit ps2exe.

.DESCRIPTION
    Benötigt: ps2exe (Install-Module ps2exe -Scope CurrentUser)
    Ausgabe:  dist/VelaSetup.exe

.USAGE
    .\Build-Installer.ps1
    .\Build-Installer.ps1 -Sign          # Code-Signing mit Zertifikat
    .\Build-Installer.ps1 -Version 1.2   # Versionsnummer setzen
#>

param(
    [string]$Version = "1.0",
    [switch]$Sign,
    [string]$CertThumbprint = ""
)

$ErrorActionPreference = "Stop"
$ScriptDir = Split-Path -Parent $MyInvocation.MyCommand.Path

function Write-Step { param([string]$msg) Write-Host "`n▸ $msg" -ForegroundColor Cyan }
function Write-Ok   { param([string]$msg) Write-Host "  ✓ $msg" -ForegroundColor Green }
function Write-Fail { param([string]$msg) Write-Host "  ✗ $msg" -ForegroundColor Red; exit 1 }

# ─────────────────────────────────────────────
# Voraussetzungen prüfen
# ─────────────────────────────────────────────
Write-Step "Voraussetzungen werden geprüft..."

if (-not (Get-Module -ListAvailable -Name ps2exe)) {
    Write-Host "  ps2exe nicht gefunden. Installiere jetzt..." -ForegroundColor Yellow
    try {
        Install-Module ps2exe -Scope CurrentUser -Force -ErrorAction Stop
        Write-Ok "ps2exe installiert"
    } catch {
        Write-Fail "ps2exe konnte nicht installiert werden: $_`n  Manuell: Install-Module ps2exe -Scope CurrentUser"
    }
} else {
    Write-Ok "ps2exe verfügbar"
}

# ─────────────────────────────────────────────
# Ausgabeverzeichnis vorbereiten
# ─────────────────────────────────────────────
Write-Step "Ausgabeverzeichnis wird vorbereitet..."

$distDir = Join-Path $ScriptDir "dist"
if (-not (Test-Path $distDir)) {
    New-Item -ItemType Directory -Path $distDir -Force | Out-Null
}
Write-Ok "dist/ bereit"

# ─────────────────────────────────────────────
# Icon (optional, fallback wenn nicht vorhanden)
# ─────────────────────────────────────────────
$iconPath = Join-Path $ScriptDir "assets\vela.ico"
$iconArg  = if (Test-Path $iconPath) { $iconPath } else { $null }

# ─────────────────────────────────────────────
# ps2exe: Kompilierung
# ─────────────────────────────────────────────
Write-Step "Installer wird kompiliert (ps2exe)..."

$inputScript  = Join-Path $ScriptDir "Vela-Setup.ps1"
$outputExe    = Join-Path $distDir "VelaSetup.exe"

$ps2exeParams = @{
    InputFile       = $inputScript
    OutputFile      = $outputExe
    Title           = "Vela AI Agent Setup"
    Description     = "Vela AI Agent – Persönlicher KI-Assistent für Windows"
    Company         = "Vela"
    Version         = $Version
    RequireAdmin    = $true
    NoConsole       = $false
    NoOutput        = $false
}

if ($iconArg) {
    $ps2exeParams['IconFile'] = $iconArg
}

try {
    Invoke-ps2exe @ps2exeParams
    Write-Ok "Kompiliert: $outputExe"
} catch {
    Write-Fail "Kompilierung fehlgeschlagen: $_"
}

# ─────────────────────────────────────────────
# Code-Signing (optional)
# ─────────────────────────────────────────────
if ($Sign) {
    Write-Step "Code-Signing wird angewendet..."

    $cert = if ($CertThumbprint) {
        Get-ChildItem Cert:\CurrentUser\My | Where-Object { $_.Thumbprint -eq $CertThumbprint }
    } else {
        Get-ChildItem Cert:\CurrentUser\My -CodeSigningCert | Select-Object -First 1
    }

    if ($null -eq $cert) {
        Write-Host "  ⚠ Kein Code-Signing-Zertifikat gefunden. Ohne Signatur fortfahren." -ForegroundColor Yellow
    } else {
        Set-AuthenticodeSignature -FilePath $outputExe -Certificate $cert -TimestampServer "http://timestamp.digicert.com" | Out-Null
        Write-Ok "Signiert mit: $($cert.Subject)"
    }
}

# ─────────────────────────────────────────────
# Prüfung
# ─────────────────────────────────────────────
Write-Step "Ausgabe wird geprüft..."

$size = [math]::Round((Get-Item $outputExe).Length / 1MB, 2)
Write-Ok "VelaSetup.exe ($size MB)"

if ($Sign) {
    $sig = Get-AuthenticodeSignature $outputExe
    if ($sig.Status -eq "Valid") {
        Write-Ok "Signatur: Gültig ✓"
    } else {
        Write-Host "  ⚠ Signatur: $($sig.Status)" -ForegroundColor Yellow
    }
}

Write-Host "`n  Fertig! → $outputExe`n" -ForegroundColor White
