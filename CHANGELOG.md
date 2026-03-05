# Changelog

Alle nennenswerten Änderungen an Vela werden hier dokumentiert.

Format: [Keep a Changelog](https://keepachangelog.com/de/1.0.0/)
Versionierung: [Semantic Versioning](https://semver.org/)

---

## [0.2.0] – 2026-03-06

### Neu
- **OIDC / SSO Login** — OpenID Connect Support (Google, Azure AD, Okta)
  - Routes: `/api/auth/oidc/login`, `/api/auth/oidc/callback`, `/api/auth/oidc/config`
  - Setup-Guide: `docs/oidc-setup.md`
- **Workspace-Isolation** — Isolierte Arbeitsbereiche pro User
  - Vollständige REST-API: Create, List, Detail, Member-Management
  - Owner-Rollen-Guard auf allen Mutationen
- **Email Inbound Trigger** — IMAP-Polling → Vela Chat
  - Manuelle und automatische Abfrage (alle 5 Minuten)
  - `email_trigger_log` DB-Tabelle
- **Discord Inbound Trigger** — Interactions Endpoint für Slash Commands
  - `POST /api/channels/discord/interactions`
  - Setup-Guide: `docs/discord-interactions-setup.md`
- **Low-Spec Setup** — Vela auf schwacher Hardware (ab 4 GB RAM)
  - `docker-compose.low-spec.yml` mit 512 MB Memory-Limit
  - Empfehlungen für Ollama-Modelle nach RAM
  - `docs/low-spec-setup.md`
- **`.env.example`** — vollständige Vorlage für alle Umgebungsvariablen

### Verbessert
- Webhook-Trigger leitet Nachrichten jetzt wirklich an Vela-Chat weiter (war TODO)
- Email-Pattern im Planner erweitert (`lies meine Mails`, `schick eine Mail` werden erkannt)
- Installer: RAM-Mindestanforderung von 8 GB → 4 GB gesenkt

### Tests & Qualität
- 31 Unit-Tests (AuditLogger, GuardrailEngine, AgentPlanner, SkillRuntime, BackendConnector)
- MD Guard: pre-commit hook + CI-Job — blockiert Platzhalter automatisch
- ESLint-Config für UI-Package, Lint jetzt blocking in CI
- TypeCheck PASS für alle Packages

---

## [0.1.0] – 2026-03-04

### Neu
- **Windows-Installer** (`scripts/install.ps1`) — idempotenter PowerShell-Installer, ps2exe-ready
  - Prüft RAM, Disk, GPU · installiert Ollama, Node.js, pnpm, Vela automatisch
  - Schnellmodus (vollautomatisch) und Expertmodus (manuelle Kontrolle)
  - Log-File + Zusammenfassung nach jedem Lauf
- **Dualer Betriebsmodus** (Lokal / Cloud)
  - Ollama-Provider (`packages/core/src/ai/ollama.ts`) — kein API-Key, läuft komplett offline
  - Backend-Connector (`packages/core/src/ai/connector.ts`) — jederzeit wechselbar
  - Cloud-Risikowarnung bei jedem Wechsel nach Cloud
- **Onboarding-Flow** (3 Schritte)
  - Moduswahl mit Hardware-Feedback (RAM-Check, Ollama-Status)
  - Cloud-Risikohinweis mit Bestätigungs-Checkbox
  - Trust-Level-Auswahl (Vorsichtig / Ausgewogen / Autonom)
  - Assistent-Intro mit konfiguriertem Modus
- **Permission-System** — schrittweise Skill-Freischaltung
  - Minimale Rechte bei Erstinstallation
  - `PermissionDialog` mit Risk-Badge (Low / Medium / High)
  - Widerrufbar in den Einstellungen
- **AI-Provider**: Claude, GPT-4o, **Gemini** (neu), Ollama
- **Skills**
  - `web-search` — DuckDuckGo Instant API, kein Key erforderlich
  - `file-manager` — Dateizugriff in Dokumente/Desktop/Downloads
  - `email-reader` — Gmail OAuth, ungelesene Mails, Suchfilter
  - `email-sender` — Gmail OAuth, RFC2822, base64url
- **CLI** (`packages/cli`)
  - `vela chat [--provider ollama|claude|openai|gemini]`
  - `vela status` — Server + Ollama Verbindungsstatus
  - `vela models` — installierte Ollama-Modelle
- **SettingsPage** — Betriebsmodus-Umschalter mit Cloud-Warnung
- **Electron Desktop**
  - Startet Vela-Server automatisch als Child-Process
  - IPC-Bridge: `getServerStatus`, `getOllamaStatus`, `getVersion`, `openExternal`
  - Auto-Updater via GitHub Releases
- **Release-Pipeline** — GitHub Actions Matrix-Build (Windows / macOS / Linux)

### Technisch
- `workspace:*` → `file:../core` für npm/Codex-Kompatibilität
- `.npmrc` mit `prefer-workspace-packages=true`
- CI-Workflow mit pnpm-Cache

---

## [Unreleased]

### Geplant
- Gemini in CLI (`vela chat --provider gemini`)
- Gmail OAuth Setup-Wizard in der UI
- macOS Code-Signing
- Mehrsprachigkeit (EN/DE)
- Skill-Marketplace
