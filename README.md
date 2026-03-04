<div align="center">
  <h1>⟡ Vela</h1>
  <p><strong>Open-source, selbst-gehostete KI-Agenten-Plattform</strong></p>
  <p><em>„So einfach wie möglich für Laien, so erweiterbar wie möglich für Experten."</em></p>

  <p>
    <a href="https://github.com/bxt9tcxhkg-hub/vela/releases"><img src="https://img.shields.io/github/v/release/bxt9tcxhkg-hub/vela?style=flat-square&color=5b7cf6" alt="Release"></a>
    <a href="https://github.com/bxt9tcxhkg-hub/vela/actions"><img src="https://img.shields.io/github/actions/workflow/status/bxt9tcxhkg-hub/vela/ci.yml?style=flat-square" alt="CI"></a>
    <a href="LICENSE"><img src="https://img.shields.io/github/license/bxt9tcxhkg-hub/vela?style=flat-square" alt="License"></a>
  </p>
</div>

---

## Was ist Vela?

Vela ist ein KI-Assistent, der **komplett auf deinem Gerät läuft** — ohne Cloud-Zwang, ohne API-Key, ohne dass deine Daten das Haus verlassen. Wer möchte, kann jederzeit auf Cloud-Modelle (Claude, GPT-4o, Gemini) wechseln.

**Leitbild: Trust as a Product** — Vertrauen entsteht durch hunderte kleine Designentscheidungen.

---

## Schnellstart (Windows)

### Option A – Installer (empfohlen)

```powershell
# PowerShell als Administrator
.\scripts\install.ps1
```

Der Installer prüft und installiert automatisch: Ollama, Node.js, pnpm und Vela.

### Option B – Manuell

```bash
# Voraussetzungen: Node.js 20+, pnpm, Ollama
git clone https://github.com/bxt9tcxhkg-hub/vela.git
cd vela
pnpm install
pnpm build

# Vela starten
cd packages/server && pnpm dev   # Backend (Port 3000)
cd packages/ui     && pnpm dev   # Frontend (Port 5173)
```

### Option C – CLI

```bash
pnpm --filter @vela/cli build
vela chat              # Lokaler Chat mit Ollama
vela status            # Systemstatus
vela models            # Installierte Modelle
```

---

## Betriebsmodi

| Modus | Beschreibung | Benötigt |
|-------|-------------|---------|
| 🔒 **Lokal** | Ollama läuft auf deinem Gerät — keine Daten nach außen | Ollama + llama3.1:8b (~5 GB) |
| ☁️ **Cloud** | Claude, GPT-4o oder Gemini — mehr Leistung | API-Key des jeweiligen Anbieters |

Der Modus ist jederzeit in den Einstellungen änderbar.

---

## Features

- **Sandboxed Skill Execution** — Skills laufen isoliert, kein unkontrollierter Zugriff
- **Guardrail Engine** — Policy-basiert, Prompt-Injection-Defense
- **Immutable Audit Log** — HMAC-verkettete Einträge, manipulationssicher
- **Permission-System** — Minimale Rechte bei Start, schrittweise Erweiterung
- **Progressive Complexity** — Simple Mode für Laien, Expert Mode für Entwickler
- **Kein Vendor Lock-in** — wechsle jederzeit den AI-Provider

### Verfügbare Skills

| Skill | Beschreibung | API-Key? |
|-------|-------------|----------|
| `web-search` | DuckDuckGo-Suche | Nein |
| `file-manager` | Dateien lesen/schreiben/suchen | Nein |
| `email-reader` | Gmail-Posteingang lesen | Gmail OAuth |
| `email-sender` | E-Mails senden | Gmail OAuth |

---

## Projektstruktur

```
vela/
├── packages/
│   ├── core/        # Agent Engine, Guardrails, Skill Runtime, AI Provider
│   ├── ui/          # React Web Dashboard
│   ├── desktop/     # Electron Desktop App
│   ├── server/      # Fastify Backend (REST API)
│   └── cli/         # Command-Line Interface
├── skills/          # Offizielle Skill-Bibliothek
├── scripts/         # Windows-Installer (install.ps1)
└── docs/            # Architektur, Tech-Stack, SWOT
```

---

## AI-Provider konfigurieren

Erstelle `packages/server/.env` basierend auf `.env.example`:

```env
# Ollama (Standard – kein Key nötig)
OLLAMA_BASE_URL=http://localhost:11434
OLLAMA_MODEL=llama3.1:8b

# Cloud-Provider (optional)
ANTHROPIC_API_KEY=sk-ant-...
OPENAI_API_KEY=sk-...
GEMINI_API_KEY=AIza...

# Gmail (optional)
GOOGLE_CLIENT_ID=...
GOOGLE_CLIENT_SECRET=...
GOOGLE_REFRESH_TOKEN=...
```

---


## Docker (Self-Hosted)

```bash
# 1. Repo klonen
git clone https://github.com/bxt9tcxhkg-hub/vela.git && cd vela

# 2. Konfiguration
cp .env.docker .env
nano .env   # API-Keys eintragen

# 3. Starten
docker compose -f docker/docker-compose.yml up -d

# Mit integriertem Ollama (kein lokales Ollama nötig)
docker compose -f docker/docker-compose.yml --profile with-ollama up -d
```

Vela läuft dann auf `http://localhost:3000`

## Eigene Skills schreiben

```typescript
// skills/mein-skill/index.ts
export async function execute(input: { query: string }) {
  return { success: true, result: `Ergebnis für: ${input.query}` }
}
```

```yaml
# skills/mein-skill/manifest.yaml
name: mein-skill
version: 1.0.0
permissions: [network:read]
inputs:
  - name: query
    type: string
    required: true
guardrails:
  confirmBeforeExecute: false
  riskLevel: low
```

---

## Release bauen

```bash
# Windows
cd packages/desktop && pnpm dist:win

# macOS
cd packages/desktop && pnpm dist:mac

# Alle Plattformen + GitHub Release
pnpm release   # erfordert GH_TOKEN
```

Oder: Push eines Git-Tags löst den CI-Pipeline aus:

```bash
git tag v0.1.0 && git push --tags
```

---

## Mitwirken

Beiträge willkommen! Siehe [CONTRIBUTING.md](CONTRIBUTING.md).

---

## Lizenz

[Apache 2.0](LICENSE) — kostenlos nutzbar, auch kommerziell.
