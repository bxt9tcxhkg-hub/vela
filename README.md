# VELA — AI Agent Platform

> Privatsphäre zuerst. Lokal oder kostenlose Cloud. Für jeden verständlich, für Experten offen.

---

## Was ist Vela?

Vela ist ein persönlicher KI-Assistent für Windows — vollständig lokal lauffähig, ohne Abo, ohne Cloud-Pflicht. Wer möchte, kann kostenlose Cloud-Backends (Groq, Gemini) nutzen. Wer tiefer will, kann jeden OpenAI-kompatiblen Endpunkt einbinden.

---

## Schnellstart

### Voraussetzungen
- Node.js 22+
- pnpm (`npm install -g pnpm`)

### 1. Abhängigkeiten & Build

```bash
pnpm install
pnpm build
mkdir .vela
```

### 2. API-Key setzen (einer reicht — beide kostenlos)

```bash
# Option A: Google Gemini — kostenlos, kein Credit Card
# Key holen: https://aistudio.google.com/apikey
echo "GEMINI_API_KEY=AIzaSy..." >> packages/server/.env

# Option B: Groq — kostenlos, sehr schnell
# Key holen: https://console.groq.com
echo "GROQ_API_KEY=gsk_..." >> packages/server/.env

# Option C: Vollständig lokal (kein Internet)
# Ollama installieren: https://ollama.ai  dann:  ollama pull llama3.1:8b
echo "VELA_BACKEND=local" >> packages/server/.env
```

### 3. Starten

```bash
node packages/server/dist/index.js
# Browser: http://localhost:3000
```

---

## Backends

| Backend | Kosten | Datenschutz | Auth |
|---|---|---|---|
| Ollama (lokal) | Kostenlos | 100% lokal | Kein Key |
| Groq | Kostenlos | Cloud (USA) | API-Key |
| Google Gemini | Kostenlos | Cloud (Google) | API-Key |
| Anthropic Claude | Kostenpflichtig | Cloud | API-Key |
| OpenAI / Kompatibel | Variabel | Lokal oder Cloud | Optional |

### Experten: Eigener OpenAI-kompatibler Endpunkt

```bash
# LM Studio
VELA_OPENAI_BASE_URL=http://localhost:1234/v1

# OpenRouter
VELA_OPENAI_BASE_URL=https://openrouter.ai/api/v1
OPENAI_API_KEY=sk-or-...

# lokale llama.cpp
VELA_OPENAI_BASE_URL=http://localhost:8080/v1
```

---

## Projektstruktur

```
vela/
├── packages/
│   ├── server/          # Fastify REST-API
│   │   └── src/
│   │       ├── ai/      # 5 Backend-Adapter (Anthropic, Groq, Gemini, Ollama, OpenAI)
│   │       ├── prompts/ # Backbone + Level-System (Laie / Power-User / Entwickler)
│   │       ├── routes/  # API-Endpunkte
│   │       └── utils/   # Context, Checkpoint, Zones, Storage, Snapshots
│   ├── ui/              # React 18 Frontend (Vite + Tailwind)
│   └── cli/             # Kommandozeile
├── docs/                # Konzeptbericht, Architektur, Legal
└── Vela-Setup.ps1       # Windows-Installer (PowerShell)
```

---

## CLI

```bash
node packages/cli/dist/cli.js start --backend gemini   # Server starten
node packages/cli/dist/cli.js chat                      # Im Terminal chatten
node packages/cli/dist/cli.js status                    # System-Status
node packages/cli/dist/cli.js onboard                   # Onboarding neu
node packages/cli/dist/cli.js skill list                # Skills anzeigen
```

---

## API-Endpunkte

| Methode | Pfad | Beschreibung |
|---|---|---|
| GET | `/api/health` | Status + Backend-Info |
| POST | `/api/chat` | Chat blockierend (mit Token-Zählung) |
| POST | `/api/chat/stream` | Chat Streaming — Server-Sent Events |
| GET | `/api/onboarding/hardware` | Hardware-Erkennung (RAM, GPU, Disk) |
| POST | `/api/onboarding/chat` | Onboarding-Assistent (5 Phasen) |
| GET/POST | `/api/settings` | Einstellungen lesen / speichern |
| GET | `/api/zones` | Sicherheitszonenkarte (16 Einträge) |
| GET | `/api/status` | System-Status (Disk, RAM, Checkpoint) |

### Streaming-Beispiel

```bash
curl -N -X POST http://localhost:3000/api/chat/stream \
  -H "Content-Type: application/json" \
  -d '{"messages":[{"role":"user","content":"Hallo!"}]}'
```

---

## Sicherheit

- Ollama bindet nur auf `127.0.0.1` — kein Zugriff von außen
- API-Keys niemals im Git (`.env` in `.gitignore`)
- Config-Snapshots schwärzen alle Keys automatisch
- Zonenkarte: Grün (autonom) / Gelb (bestätigen) / Rot (niemals selbst handeln)
- Prompt-Injection-Schutz: System-Prompt ist unveränderlich

---

## Windows-Installer

```powershell
# Als Administrator:
.\Vela-Setup.ps1

# Optional: EXE bauen
.\Build-Installer.ps1
```

---

## Dokumentation

- [`docs/Vela_Konzeptbericht_v1.1.docx`](docs/Vela_Konzeptbericht_v1.1.docx) — vollständige Projektdokumentation
- [`docs/architecture-backend-connector.md`](docs/architecture-backend-connector.md) — Adapter-Architektur
- [`docs/legal/datenschutz.md`](docs/legal/datenschutz.md) — DSGVO-Entwurf
- [`docs/legal/agb.md`](docs/legal/agb.md) — AGB-Entwurf

---

## Vor dem öffentlichen Launch

- [ ] EU AI Act Compliance (IT-Rechtsspezialist)
- [ ] DSGVO & AGB finalisieren (Jurist)
- [ ] Code-Signing-Zertifikat für Windows-Installer

---

*Vela v1.1 · März 2026 · Intern*
