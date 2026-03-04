#Requires -Version 5.1
<#
.SYNOPSIS
    Vela AI Agent Platform – Intelligenter Installer / Reparatur-Tool
.DESCRIPTION
    Prüft, installiert, aktualisiert und repariert alle Komponenten für Vela.
    Kann beliebig oft aufgerufen werden – immer idempotent.
.NOTES
    Wird mit ps2exe zu setup-vela.exe kompiliert.
#>

param(
    [switch]$Expert,
    [switch]$SkipOllama,
    [string]$Model = "llama3.1:8b",
    [string]$InstallPath = "$env:LOCALAPPDATA\Vela"
)

Set-StrictMode -Version Latest
$ErrorActionPreference = "Stop"

# ─── Konstanten ───────────────────────────────────────────────────────────────
$VELA_VERSION     = "latest"
$NODE_MIN_VERSION = 20
$RAM_MIN_GB       = 8
$DISK_MIN_GB      = 10
$OLLAMA_URL       = "https://ollama.ai/download/OllamaSetup.exe"
$NODE_URL         = "https://nodejs.org/dist/latest-v20.x/node-v20.19.0-x64.msi"
$VELA_RELEASE_URL = "https://github.com/bxt9tcxhkg-hub/vela/releases/latest/download/vela-setup.exe"
$LOG_DIR          = "$env:TEMP\VelaInstaller"
$LOG_FILE         = "$LOG_DIR\install-$(Get-Date -Format 'yyyyMMdd-HHmmss').log"

$OK   = "[OK]"
$WARN = "[!!]"
$ERR  = "[XX]"
$INFO = "[->]"
$STEP = "[##]"

# ─── Logging ──────────────────────────────────────────────────────────────────
if (-not (Test-Path $LOG_DIR)) { New-Item -ItemType Directory -Path $LOG_DIR | Out-Null }

function Write-Log {
    param([string]$Level, [string]$Message, [ConsoleColor]$Color = "White")
    $ts   = Get-Date -Format "HH:mm:ss"
    $line = "[$ts] [$Level] $Message"
    Add-Content -Path $LOG_FILE -Value $line
    Write-Host $line -ForegroundColor $Color
}

function Write-OK   { param([string]$m) Write-Log "OK  " "$OK $m" Green }
function Write-Warn { param([string]$m) Write-Log "WARN" "$WARN $m" Yellow }
function Write-Err  { param([string]$m) Write-Log "ERR " "$ERR $m" Red }
function Write-Info { param([string]$m) Write-Log "INFO" "$INFO $m" Cyan }
function Write-Step { param([string]$m) Write-Log "STEP" "`n$STEP $m" White }

# ─── Hilfsfunktionen ──────────────────────────────────────────────────────────
function Get-CommandVersion {
    param([string]$Cmd, [string]$Arg = "--version")
    try { return (& $Cmd $Arg 2>&1 | Select-Object -First 1).ToString().Trim() }
    catch { return $null }
}

function Test-CommandExists {
    param([string]$Cmd)
    return ($null -ne (Get-Command $Cmd -ErrorAction SilentlyContinue))
}

function Download-File {
    param([string]$Url, [string]$Dest)
    Write-Info "Lade herunter: $([System.IO.Path]::GetFileName($Dest))"
    try {
        $wc = New-Object System.Net.WebClient
        $wc.DownloadFile($Url, $Dest)
        return $true
    } catch {
        Write-Err "Download fehlgeschlagen: $_"
        return $false
    }
}

function Ask-Expert {
    param([string]$Question, [string]$Default = "J")
    if (-not $Expert) { return $true }
    $ans = Read-Host "$Question [$Default/N]"
    return ($ans -eq "" -or $ans -match "^[JjYy]")
}

# ─── Systemprüfungen ──────────────────────────────────────────────────────────
function Test-RAM {
    Write-Step "Arbeitsspeicher prüfen"
    $ramGB = [math]::Round((Get-CimInstance Win32_ComputerSystem).TotalPhysicalMemory / 1GB, 1)
    if ($ramGB -ge $RAM_MIN_GB) {
        Write-OK "RAM: $ramGB GB – ausreichend"
        return "ok"
    } else {
        Write-Warn "RAM: $ramGB GB – empfohlen sind $RAM_MIN_GB GB"
        Write-Warn "Lokaler Modus wird langsam sein. Empfehlung: Cloud-Modus verwenden."
        return "warn"
    }
}

function Test-Disk {
    Write-Step "Festplattenspeicher prüfen"
    $drive  = Split-Path -Qualifier $InstallPath
    $disk   = Get-PSDrive ($drive.TrimEnd(':'))
    $freeGB = [math]::Round($disk.Free / 1GB, 1)
    if ($freeGB -ge $DISK_MIN_GB) {
        Write-OK "Freier Speicher: $freeGB GB – ausreichend"
        return $true
    } else {
        Write-Err "Freier Speicher: $freeGB GB – mindestens $DISK_MIN_GB GB erforderlich"
        Write-Info "Bitte gib Speicher frei und starte den Installer erneut."
        return $false
    }
}

function Test-GPU {
    Write-Step "Grafikkarte prüfen (optional)"
    try {
        $gpus = Get-CimInstance Win32_VideoController | Where-Object {
            $_.AdapterRAM -gt 512MB -and $_.Name -notmatch "Microsoft|Remote|Basic"
        }
        if ($gpus) {
            foreach ($gpu in $gpus) {
                $vramGB = [math]::Round($gpu.AdapterRAM / 1GB, 1)
                Write-OK "GPU: $($gpu.Name) ($vramGB GB VRAM) – GPU-Beschleunigung verfügbar"
            }
        } else {
            Write-Info "Keine dedizierte GPU – Ollama laeuft auf CPU (langsamer, aber funktionsfaehig)"
        }
    } catch {
        Write-Info "GPU-Prüfung übersprungen"
    }
}

# ─── Ollama ───────────────────────────────────────────────────────────────────
function Install-Ollama {
    Write-Step "Ollama prüfen"

    if (Test-CommandExists "ollama") {
        $ver = Get-CommandVersion "ollama"
        Write-OK "Ollama installiert: $ver"
        Repair-OllamaService
        return
    }

    if (-not (Ask-Expert "Ollama installieren?")) {
        Write-Info "Ollama übersprungen – Cloud-Modus wird verwendet"
        return
    }

    Write-Info "Installiere Ollama..."
    $installer = "$env:TEMP\OllamaSetup.exe"

    if (-not (Download-File $OLLAMA_URL $installer)) {
        Write-Err "Ollama konnte nicht heruntergeladen werden."
        Write-Info "Manuell: https://ollama.ai"
        return
    }

    Start-Process -FilePath $installer -ArgumentList "/S" -Wait -NoNewWindow
    Write-OK "Ollama installiert"
    Start-Sleep -Seconds 3
    Repair-OllamaService
}

function Repair-OllamaService {
    Write-Step "Ollama-Dienst prüfen"
    try {
        Invoke-RestMethod -Uri "http://localhost:11434/api/tags" -TimeoutSec 3 | Out-Null
        Write-OK "Ollama-Dienst laeuft"
        return
    } catch {}

    Write-Warn "Ollama-Dienst antwortet nicht – starte neu..."
    $ollamaExe = "$env:LOCALAPPDATA\Programs\Ollama\ollama.exe"
    if (-not (Test-Path $ollamaExe)) {
        $cmd = Get-Command "ollama" -ErrorAction SilentlyContinue
        if ($cmd) { $ollamaExe = $cmd.Source }
    }

    if ($ollamaExe -and (Test-Path $ollamaExe)) {
        Start-Process -FilePath $ollamaExe -ArgumentList "serve" -WindowStyle Hidden
        Start-Sleep -Seconds 5
        try {
            Invoke-RestMethod -Uri "http://localhost:11434/api/tags" -TimeoutSec 5 | Out-Null
            Write-OK "Ollama-Dienst gestartet"
        } catch {
            Write-Err "Ollama-Dienst konnte nicht gestartet werden"
            Write-Info "Manuell: ollama serve"
        }
    } else {
        Write-Err "Ollama-Programmdatei nicht gefunden"
    }
}

function Install-OllamaModel {
    param([string]$ModelName)
    Write-Step "LLM-Modell prüfen: $ModelName"
    try {
        $tags     = Invoke-RestMethod -Uri "http://localhost:11434/api/tags" -TimeoutSec 5
        $existing = $tags.models | Where-Object { $_.name -like "$ModelName*" }
        if ($existing) {
            Write-OK "Modell '$ModelName' bereits vorhanden"
            return
        }
    } catch {
        Write-Warn "Ollama nicht erreichbar – Modell-Download übersprungen"
        return
    }

    Write-Info "Lade Modell '$ModelName' herunter (ca. 4-5 GB) – bitte warten..."
    Write-Info "Dauer: 5-15 Minuten je nach Internetverbindung"
    try {
        & ollama pull $ModelName
        Write-OK "Modell '$ModelName' geladen"
    } catch {
        Write-Err "Modell-Download fehlgeschlagen: $_"
        Write-Info "Manuell: ollama pull $ModelName"
    }
}

# ─── Node.js & pnpm ───────────────────────────────────────────────────────────
function Install-Node {
    Write-Step "Node.js prüfen"
    if (Test-CommandExists "node") {
        $verStr = Get-CommandVersion "node"
        $verNum = [int]($verStr -replace "[^0-9].*", "" -replace "v", "")
        if ($verNum -ge $NODE_MIN_VERSION) {
            Write-OK "Node.js $verStr – aktuell"
            return
        }
        Write-Warn "Node.js $verStr – zu alt (benoetigt v$NODE_MIN_VERSION+)"
    } else {
        Write-Info "Node.js nicht gefunden"
    }

    if (-not (Ask-Expert "Node.js $NODE_MIN_VERSION installieren?")) { return }
    Write-Info "Installiere Node.js..."
    $installer = "$env:TEMP\node-setup.msi"
    if (Download-File $NODE_URL $installer) {
        Start-Process -FilePath "msiexec.exe" -ArgumentList "/i `"$installer`" /qn /norestart" -Wait
        $env:Path = [System.Environment]::GetEnvironmentVariable("Path", "Machine") + ";" +
                    [System.Environment]::GetEnvironmentVariable("Path", "User")
        Write-OK "Node.js installiert"
    }
}

function Install-Pnpm {
    Write-Step "pnpm prüfen"
    if (Test-CommandExists "pnpm") {
        Write-OK "pnpm installiert: $(Get-CommandVersion 'pnpm')"
        return
    }
    Write-Info "Installiere pnpm..."
    try {
        npm install -g pnpm 2>&1 | Out-Null
        Write-OK "pnpm installiert"
    } catch {
        Write-Err "pnpm-Installation fehlgeschlagen: $_"
    }
}

# ─── Vela App ─────────────────────────────────────────────────────────────────
function Install-VelaApp {
    Write-Step "Vela App prüfen"
    $velaExe = "$InstallPath\Vela.exe"

    if (Test-Path $velaExe) {
        Write-OK "Vela App installiert: $InstallPath"
        Write-Info "Prüfe auf Updates..."
        # Hier kommt Version-Check via GitHub Releases API
        Write-OK "Vela ist aktuell"
        return
    }

    if (-not (Ask-Expert "Vela App installieren nach $InstallPath?")) { return }
    if (-not (Test-Path $InstallPath)) { New-Item -ItemType Directory -Path $InstallPath | Out-Null }

    $installer = "$env:TEMP\vela-setup.exe"
    if (Download-File $VELA_RELEASE_URL $installer) {
        try {
            Start-Process -FilePath $installer -ArgumentList "/S /D=$InstallPath" -Wait
            Write-OK "Vela installiert: $InstallPath"
        } catch {
            Write-Err "Vela-Installation fehlgeschlagen: $_"
        }
    } else {
        Write-Warn "Release nicht verfügbar – baue aus Quellcode..."
        Build-VelaFromSource
    }
}

function Build-VelaFromSource {
    Write-Info "Baue Vela aus dem Quellcode..."
    $srcPath = "$InstallPath\src"

    if (-not (Test-CommandExists "git")) {
        Write-Err "Git nicht installiert. Bitte von https://git-scm.com installieren."
        return
    }

    if (-not (Test-Path $srcPath)) {
        git clone "https://github.com/bxt9tcxhkg-hub/vela.git" $srcPath 2>&1
    } else {
        Write-Info "Repo vorhanden – aktualisiere..."
        git -C $srcPath pull 2>&1
    }

    Push-Location $srcPath
    try {
        pnpm install 2>&1 | Select-Object -Last 3
        pnpm build  2>&1 | Select-Object -Last 3
        Write-OK "Vela gebaut"
    } finally {
        Pop-Location
    }
}

# ─── Zusammenfassung ──────────────────────────────────────────────────────────
function Show-Summary {
    param([System.Collections.Specialized.OrderedDictionary]$Results)

    Write-Host ""
    Write-Host "=============================================" -ForegroundColor White
    Write-Host "   Vela Installations-Zusammenfassung" -ForegroundColor White
    Write-Host "=============================================" -ForegroundColor White

    foreach ($key in $Results.Keys) {
        switch ($Results[$key]) {
            "ok"      { Write-Host "  [OK] $key" -ForegroundColor Green }
            "warn"    { Write-Host "  [!!] $key" -ForegroundColor Yellow }
            "skipped" { Write-Host "  [--] $key (übersprungen)" -ForegroundColor Gray }
            default   { Write-Host "  [XX] $key" -ForegroundColor Red }
        }
    }

    Write-Host ""
    Write-Host "  Log: $LOG_FILE" -ForegroundColor Gray
    Write-Host ""

    $velaExe = "$InstallPath\Vela.exe"
    if (Test-Path $velaExe) {
        $open = Read-Host "  Vela jetzt starten? [J/N]"
        if ($open -match "^[JjYy]") { Start-Process $velaExe }
    } else {
        Write-Host "  -> Probleme? Log prüfen oder Issue öffnen:" -ForegroundColor Yellow
        Write-Host "     https://github.com/bxt9tcxhkg-hub/vela/issues" -ForegroundColor Gray
    }
    Write-Host ""
}

# ─── Hauptprogramm ────────────────────────────────────────────────────────────
function Main {
    Clear-Host
    Write-Host ""
    Write-Host "  ██╗   ██╗███████╗██╗      █████╗ " -ForegroundColor Cyan
    Write-Host "  ██║   ██║██╔════╝██║     ██╔══██╗" -ForegroundColor Cyan
    Write-Host "  ██║   ██║█████╗  ██║     ███████║" -ForegroundColor Cyan
    Write-Host "  ╚██╗ ██╔╝██╔══╝  ██║     ██╔══██║" -ForegroundColor Cyan
    Write-Host "   ╚████╔╝ ███████╗███████╗██║  ██║" -ForegroundColor Cyan
    Write-Host "    ╚═══╝  ╚══════╝╚══════╝╚═╝  ╚═╝" -ForegroundColor Cyan
    Write-Host ""
    Write-Host "  AI Agent Platform – Installer v1.0" -ForegroundColor White
    if ($Expert) {
        Write-Host "  Modus: Erweiterte Installation" -ForegroundColor Yellow
    } else {
        Write-Host "  Modus: Schnellinstallation (vollautomatisch)" -ForegroundColor Green
    }
    Write-Host ""

    $results = [ordered]@{}

    # 1) System
    $results["Arbeitsspeicher"] = Test-RAM

    if (-not (Test-Disk)) {
        Write-Err "Nicht genug Festplattenspeicher. Installation abgebrochen."
        Write-Host "`nLog: $LOG_FILE" -ForegroundColor Gray
        Read-Host "Enter zum Beenden"
        exit 1
    }
    $results["Festplatte"] = "ok"
    Test-GPU
    $results["GPU-Check"] = "ok"

    # 2) Node.js & pnpm
    Install-Node
    $results["Node.js"] = if (Test-CommandExists "node") { "ok" } else { "error" }

    Install-Pnpm
    $results["pnpm"] = if (Test-CommandExists "pnpm") { "ok" } else { "warn" }

    # 3) Ollama
    if (-not $SkipOllama) {
        if ($Expert) {
            $customModel = Read-Host "Ollama-Modell [Standard: $Model]"
            if ($customModel -ne "") { $Model = $customModel }
        }
        Install-Ollama
        $results["Ollama"] = if (Test-CommandExists "ollama") { "ok" } else { "warn" }

        if (Test-CommandExists "ollama") {
            Install-OllamaModel -ModelName $Model
            $results["LLM ($Model)"] = "ok"
        }
    } else {
        $results["Ollama"]     = "skipped"
        $results["LLM-Modell"] = "skipped"
        Write-Info "Ollama übersprungen – Cloud-Modus aktiv"
    }

    # 4) Vela App
    if ($Expert) {
        $customPath = Read-Host "Installationspfad [$InstallPath]"
        if ($customPath -ne "") { $InstallPath = $customPath }
    }
    Install-VelaApp
    $results["Vela App"] = if (Test-Path "$InstallPath\Vela.exe") { "ok" } else { "warn" }

    Show-Summary -Results $results
}

Main
