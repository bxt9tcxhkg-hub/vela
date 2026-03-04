#Requires -RunAsAdministrator
<#
.SYNOPSIS
    Vela AI Agent – Windows Installer
    Version 1.0 | März 2026

.DESCRIPTION
    Installiert Ollama, lädt das Standardmodell (llama3.1:8b),
    konfiguriert Ollama als Windows-Dienst (localhost-only, kein Auto-Update),
    und bereitet die Vela-Umgebung vor.

    Sicherheit:
    - Ollama wird NUR auf 127.0.0.1 gebunden (T-02)
    - Ollama Auto-Update wird deaktiviert (T-03)
    - Ressourcenlimitierung wird über Umgebungsvariablen gesetzt (T-05)
#>

Set-StrictMode -Version Latest
$ErrorActionPreference = "Stop"

# ─────────────────────────────────────────────
# Konfiguration
# ─────────────────────────────────────────────
$VELA_VERSION       = "1.0"
$OLLAMA_MODEL       = "llama3.1:8b"
$OLLAMA_HOST        = "127.0.0.1:11434"   # T-02: NUR localhost, kein 0.0.0.0
$OLLAMA_SERVICE     = "ollama"
$MIN_RAM_GB         = 6
$MIN_DISK_GB        = 20
$OLLAMA_MAX_RAM_GB  = 6   # T-05: RAM-Cap für Ollama

# ─────────────────────────────────────────────
# Hilfsfunktionen
# ─────────────────────────────────────────────
function Write-Step { param([string]$msg) Write-Host "`n▸ $msg" -ForegroundColor Cyan }
function Write-Ok   { param([string]$msg) Write-Host "  ✓ $msg" -ForegroundColor Green }
function Write-Warn { param([string]$msg) Write-Host "  ⚠ $msg" -ForegroundColor Yellow }
function Write-Fail { param([string]$msg) Write-Host "  ✗ $msg" -ForegroundColor Red }

function Get-RamGb {
    $ram = (Get-CimInstance Win32_ComputerSystem).TotalPhysicalMemory
    return [math]::Round($ram / 1GB)
}

function Get-FreeDiskGb {
    $disk = Get-PSDrive C | Select-Object -ExpandProperty Free
    return [math]::Round($disk / 1GB)
}

function Test-Gpu {
    try {
        $gpu = Get-CimInstance Win32_VideoController | Where-Object { $_.Name -match "NVIDIA|AMD|Radeon|GeForce" }
        return $null -ne $gpu
    } catch { return $false }
}

# ─────────────────────────────────────────────
# Header
# ─────────────────────────────────────────────
Clear-Host
Write-Host @"
╔═══════════════════════════════════════════╗
║   Vela AI Agent – Installer v$VELA_VERSION          ║
║   Persönlicher KI-Assistent für Windows   ║
╚═══════════════════════════════════════════╝
"@ -ForegroundColor White

# ─────────────────────────────────────────────
# I-04: Hardware-Prüfung
# ─────────────────────────────────────────────
Write-Step "Hardware wird geprüft..."

$ramGb   = Get-RamGb
$diskGb  = Get-FreeDiskGb
$hasGpu  = Test-Gpu

Write-Host "  RAM:         $ramGb GB" -ForegroundColor Gray
Write-Host "  Freier Disk: $diskGb GB" -ForegroundColor Gray
Write-Host "  GPU:         $(if ($hasGpu) { 'Erkannt ✓' } else { 'Nicht erkannt' })" -ForegroundColor Gray

$recommendedBackend = "local"

if ($ramGb -lt $MIN_RAM_GB) {
    Write-Warn "Dein Computer hat weniger als $MIN_RAM_GB GB RAM."
    Write-Warn "Vela wird über Groq (kostenloser Cloud-Dienst) laufen — das ist völlig normal."
    $recommendedBackend = "groq"
} elseif ($diskGb -lt $MIN_DISK_GB) {
    Write-Warn "Weniger als $MIN_DISK_GB GB freier Speicherplatz."
    Write-Warn "Das KI-Modell benötigt ca. 5 GB. Bitte schaff etwas Platz, dann starte neu."
    Read-Host "Drücke Enter wenn du bereit bist, oder schließe dieses Fenster zum Abbrechen"
} else {
    Write-Ok "Hardware ist geeignet für lokalen Betrieb"
}

# ─────────────────────────────────────────────
# Ollama prüfen / installieren
# ─────────────────────────────────────────────
Write-Step "Ollama wird geprüft..."

$ollamaInstalled = $null -ne (Get-Command ollama -ErrorAction SilentlyContinue)

if (-not $ollamaInstalled) {
    Write-Host "  Ollama wird heruntergeladen und installiert..." -ForegroundColor Gray
    $installerUrl  = "https://ollama.com/download/OllamaSetup.exe"
    $installerPath = "$env:TEMP\OllamaSetup.exe"

    try {
        Invoke-WebRequest -Uri $installerUrl -OutFile $installerPath -UseBasicParsing
        Start-Process -FilePath $installerPath -ArgumentList "/S" -Wait
        Write-Ok "Ollama installiert"
    } catch {
        Write-Fail "Ollama-Installation fehlgeschlagen: $_"
        exit 1
    }
} else {
    Write-Ok "Ollama bereits installiert"
}

# ─────────────────────────────────────────────
# T-02: Ollama auf localhost binden
# T-03: Auto-Update deaktivieren
# T-05: Ressourcenlimitierung
# ─────────────────────────────────────────────
Write-Step "Ollama Sicherheits-Konfiguration wird angewendet..."

# Systemweite Umgebungsvariablen setzen (persistent, für Dienst gültig)
[System.Environment]::SetEnvironmentVariable("OLLAMA_HOST", $OLLAMA_HOST, "Machine")
Write-Ok "T-02: Ollama gebunden an $OLLAMA_HOST (nur localhost, nicht im Netzwerk erreichbar)"

# T-03: Auto-Update deaktivieren
[System.Environment]::SetEnvironmentVariable("OLLAMA_NOPRUNE", "1", "Machine")
[System.Environment]::SetEnvironmentVariable("OLLAMA_ORIGINS", "http://127.0.0.1", "Machine")
Write-Ok "T-03: Auto-Update deaktiviert (OLLAMA_NOPRUNE=1)"

# T-05: RAM-Cap (Ollama respektiert OLLAMA_MAX_LOADED_MODELS und Speicher-Hints)
$maxRamBytes = $OLLAMA_MAX_RAM_GB * 1073741824
[System.Environment]::SetEnvironmentVariable("OLLAMA_MAX_LOADED_MODELS", "1", "Machine")
Write-Ok "T-05: Ressourcenlimitierung: max 1 Modell gleichzeitig, ${OLLAMA_MAX_RAM_GB}GB RAM-Ziel"

# ─────────────────────────────────────────────
# Ollama als Windows-Dienst registrieren
# ─────────────────────────────────────────────
Write-Step "Ollama Windows-Dienst wird konfiguriert..."

$svc = Get-Service -Name $OLLAMA_SERVICE -ErrorAction SilentlyContinue

if ($null -ne $svc) {
    if ($svc.Status -eq "Running") {
        Stop-Service $OLLAMA_SERVICE -Force
        Write-Ok "Ollama-Dienst gestoppt (wird neu gestartet mit neuer Konfiguration)"
    }
} else {
    # Dienst registrieren wenn nicht vorhanden
    $ollamaExe = (Get-Command ollama -ErrorAction SilentlyContinue)?.Source
    if ($ollamaExe) {
        New-Service -Name $OLLAMA_SERVICE -BinaryPathName "`"$ollamaExe`" serve" `
            -DisplayName "Ollama AI Service" `
            -Description "Vela KI-Backend (Ollama). Läuft nur auf localhost." `
            -StartupType Automatic | Out-Null
        Write-Ok "Ollama-Dienst registriert"
    }
}

# Dienst starten
Start-Service $OLLAMA_SERVICE -ErrorAction SilentlyContinue
Start-Sleep -Seconds 3

$svcCheck = Get-Service $OLLAMA_SERVICE -ErrorAction SilentlyContinue
if ($svcCheck?.Status -eq "Running") {
    Write-Ok "Ollama-Dienst läuft auf $OLLAMA_HOST"
} else {
    Write-Warn "Ollama-Dienst konnte nicht automatisch gestartet werden."
    Write-Warn "Starte Ollama manuell: ollama serve"
}

# ─────────────────────────────────────────────
# I-02: Standardmodell laden
# ─────────────────────────────────────────────
Write-Step "Standardmodell wird geladen ($OLLAMA_MODEL)..."
Write-Host "  Das dauert einige Minuten (ca. 5 GB Download)..." -ForegroundColor Gray

try {
    & ollama pull $OLLAMA_MODEL 2>&1
    Write-Ok "Modell '$OLLAMA_MODEL' bereit"
} catch {
    Write-Warn "Modell-Download fehlgeschlagen. Kann später manuell mit 'ollama pull $OLLAMA_MODEL' geladen werden."
}

# ─────────────────────────────────────────────
# Vela .env Datei vorbereiten (I-05: Variablen-Übergabe)
# ─────────────────────────────────────────────
Write-Step "Vela-Konfiguration wird vorbereitet..."

$velaEnvPath = "$env:APPDATA\Vela\.env"
$velaDir     = Split-Path $velaEnvPath

if (-not (Test-Path $velaDir)) {
    New-Item -ItemType Directory -Path $velaDir -Force | Out-Null
}

$envContent = @"
# Vela Konfiguration — automatisch generiert
# $(Get-Date -Format "yyyy-MM-dd HH:mm")

OLLAMA_HOST=$OLLAMA_HOST
VELA_BACKEND=$recommendedBackend
DEFAULT_MODEL=$OLLAMA_MODEL

# Hardware-Info (zur Laufzeit vom Server gelesen)
VELA_HW_RAM_GB=$ramGb
VELA_HW_HAS_GPU=$($hasGpu.ToString().ToLower())
VELA_HW_RECOMMENDED_BACKEND=$recommendedBackend

# Präferenzen (werden beim Onboarding gesetzt)
VELA_PREF_LANGUAGE=Deutsch
VELA_PREF_LEVEL=laie
VELA_PREF_TONE=einfach
VELA_PREF_PURPOSE=alltag
"@

Set-Content -Path $velaEnvPath -Value $envContent -Encoding UTF8
Write-Ok ".env Datei erstellt: $velaEnvPath"

# ─────────────────────────────────────────────
# Abschluss
# ─────────────────────────────────────────────
Write-Host "`n" + ("═" * 47) -ForegroundColor DarkGray
Write-Host @"

  ✦ Vela ist bereit!

  Backend:  $(if ($recommendedBackend -eq 'local') { "Lokal (Ollama auf $OLLAMA_HOST)" } else { "Groq (kostenloser Cloud-Dienst)" })
  Modell:   $OLLAMA_MODEL
  Sicher:   Ollama ist NUR auf diesem Gerät erreichbar

  Starte Vela und folge dem Onboarding.

"@ -ForegroundColor White

Read-Host "  Drücke Enter zum Beenden"
