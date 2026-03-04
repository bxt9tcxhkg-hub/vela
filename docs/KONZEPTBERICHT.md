# Vela AI Agent Platform — Konzeptbericht
**Version 1.0 | März 2026 | Für technische Übergabe**

---

## 1. Was ist Vela?

Vela ist eine **persönliche KI-Agenten-Plattform**, die auf dem eigenen Computer des Nutzers läuft. Im Gegensatz zu ChatGPT oder anderen Cloud-Diensten bleibt alles lokal — keine Daten werden ohne Zustimmung des Nutzers an externe Server gesendet.

**Kernversprechen:**
- Datenschutz by Default — lokaler Betrieb mit Ollama (kein Internet nötig)
- Kostenlos nutzbar — Groq-Dienst als kostenlose Cloud-Alternative
- Für Laien gemacht — kein technisches Wissen erforderlich
- Offen für Entwickler — vollständige Anpassbarkeit über API und CLI

---

## 2. Systemarchitektur

```
Vela Frontend (React/Vite)
OnboardingPage · ChatPage · SettingsPage · Activity
         |
         | HTTP (localhost:3000)
         v
Vela Server (Fastify / Node.js)
Routes: /api/chat, /api/onboarding, /api/settings,
        /api/status, /api/zones, /api/messenger, /api/skills
         |
    +---------+-----------+
    v         v           v
 Ollama    Groq       Anthropic
(lokal)  (Gratis)    (Claude)
```

**Technologie-Stack:**

- Frontend: React 18, TypeScript, Vite, Tailwind CSS
- Backend: Node.js, Fastify, TypeScript
- Build: pnpm Workspaces, Turborepo
- KI lokal: Ollama (llama3.1:8b)
- KI Cloud kostenlos: Groq API (Llama, Gemma)
- KI Cloud kostenpflichtig: Anthropic Claude, OpenAI (Stub)

---

## 3. Implementierte Features

### 3.1 Onboarding-System (5 Phasen)

| Phase | Inhalt |
|---|---|
| 0 | Identität & Injection-Schutz |
| 1 | Begrüßung (feste Formel) |
| 2 | Hardware-Prüfung + Backend-Empfehlung + Datenschutz-Aufklärung |
| 3 | Präferenzen: Zweck, Sprache, Ton, KI-Level, Name |
| 4 | Zusammenfassung + 3 Grundregeln + JSON-Übergabe an Haupt-Agent |

Die Hardware-Erkennung (RAM, GPU, Disk) läuft automatisch und empfiehlt das passende Backend.

### 3.2 Adaptive KI-Persönlichkeit (3 Level)

| Level | Zielgruppe | Verhalten |
|---|---|---|
| Laie | Keine KI-Erfahrung | Alles erklären, einfache Sprache, viel nachfragen |
| Power-User | Digital erfahren | Direkt, effizient, kurze Bestätigungen |
| Entwickler | Technisch versiert | Vollständig, technisch korrekt, Fehler ungefiltert |

### 3.3 Sicherheitssystem (Grün / Gelb / Rot Zonen)

- Grün (4 Aktionen): Agent handelt selbstständig (Texte, Recherche, Empfehlungen)
- Gelb (5 Aktionen): Agent schlägt vor, Nutzer bestätigt (Dateien, E-Mails, Einstellungen)
- Rot (6 Aktionen): Agent weist hin, handelt NIE selbst (API-Keys, Firewall, System-Prompt)

### 3.4 Multi-Backend-System

```
VELA_BACKEND=anthropic  → Claude (Standard)
VELA_BACKEND=groq       → Llama/Gemma kostenlos
VELA_BACKEND=local      → Ollama (vollständig lokal)
```

Automatischer Fallback: Wenn bevorzugtes Backend nicht erreichbar → nächstes verfügbares.

### 3.5 Skills-System
- Web-Suche: automatisch aktiviert bei passenden Anfragen
- Gmail: E-Mails lesen/vorbereiten (OAuth konfiguriert)

### 3.6 Messenger-Integration
Vela kann über Telegram und Discord bedient werden:
- Geführter Wizard für Token/Webhook-Eingabe
- Validierung gegen API vor dem Speichern
- Test-Nachricht-Funktion

### 3.7 Monitoring & Sicherheit

| Feature | Beschreibung |
|---|---|
| Kontext-Indikator | Warnung bei 70% Auslastung des KI-Kontextfensters |
| Checkpoint-System | Aufgaben werden gespeichert, können fortgesetzt werden |
| Speicher-Monitor | Warnung bei Disk >85% / RAM >85% |
| Config-Snapshots | Tägliche .env-Sicherung (API-Keys geschwärzt), 7 Tage |
| Ollama localhost | Nur auf 127.0.0.1 gebunden — nicht im Netzwerk sichtbar |

---

## 4. Sicherheitsarchitektur

- System-Prompt unveränderlich, User-Input NIE im System-Layer
- API-Keys lokal in .env (in .gitignore, nie im Code)
- Config-Snapshots: Keys vor dem Speichern geschwärzt
- Ollama: 127.0.0.1 gebunden, Auto-Update deaktiviert
- Server: HOST=127.0.0.1 (nur lokal erreichbar)
- CORS: Nur localhost:5173/5174 in Development

---

## 5. API-Endpunkte (Übersicht)

| Methode | Pfad | Funktion |
|---|---|---|
| GET | /api/health | Server-Status + Backend-Verfügbarkeit |
| POST | /api/chat | Chat mit dem Haupt-Agenten |
| POST | /api/onboarding/chat | Onboarding-Assistent |
| GET | /api/onboarding/hardware | Hardware-Erkennung |
| GET | /api/settings | Einstellungen lesen |
| POST | /api/settings | Einstellungen speichern |
| GET | /api/status | System-Status (Disk, RAM, Backend, Checkpoint) |
| GET | /api/zones | Sicherheitszonenkarte |
| GET | /api/messenger/status | Messenger-Verbindungsstatus |
| POST | /api/messenger/telegram/connect | Telegram verbinden |
| POST | /api/messenger/discord/connect | Discord verbinden |

---

## 6. Verzeichnisstruktur

```
vela/
├── packages/
│   ├── server/          # Fastify Backend
│   │   └── src/
│   │       ├── ai/          # Adapter: Anthropic, Groq, Ollama + Registry
│   │       ├── prompts/     # Backbone + Level-Module + Builder
│   │       ├── routes/      # API-Endpunkte
│   │       └── utils/       # Hardware, Checkpoint, Zones, Monitoring
│   ├── ui/              # React Frontend
│   │   └── src/
│   │       ├── pages/       # Chat, Onboarding, Settings, Activity
│   │       └── components/  # BackendSelector, MessengerWizard
│   └── cli/             # Kommandozeilen-Interface
├── docs/
│   ├── architecture-backend-connector.md
│   ├── legal/datenschutz.md + agb.md
│   └── KONZEPTBERICHT.md
├── Vela-Setup.ps1       # Windows-Installer (mit .exe via Build-Installer.ps1)
└── Build-Installer.ps1  # ps2exe Packaging
```

---

## 7. Vor dem Testbetrieb — Checkliste

### Zwingend:
- [ ] API-Key hinterlegen (mind. einer):
  - GROQ_API_KEY=gsk_... (kostenlos: console.groq.com)
  - ANTHROPIC_API_KEY=sk-ant-... (kostenpflichtig)
  - Oder: Ollama lokal + --backend local
- [ ] pnpm install
- [ ] pnpm build

### Empfohlen:
- [ ] mkdir .vela (für Checkpoints und Snapshots)
- [ ] node packages/server/dist/index.js
- [ ] Browser: http://localhost:3000

### Für Produktion (vor Launch):
- [ ] EU AI Act Compliance-Prüfung (IT-Rechtsanwalt)
- [ ] DSGVO-Erklärung finalisieren
- [ ] AGB finalisieren
- [ ] Code-Signing-Zertifikat für Installer
- [ ] OpenAI-Adapter implementieren

---

## 8. Bekannte Einschränkungen

| Punkt | Status |
|---|---|
| OpenAI-Adapter | Stub, nicht implementiert |
| Token-Zählung | Schätzung (~4 Zeichen = 1 Token) |
| Streaming | Noch nicht (blockierender API-Call) |
| Mobile / iPhone | Phase 3-4 geplant |
| EU AI Act | Externer Spezialist benötigt |

---

## 9. Schnellstart für den Entwickler

```bash
# 1. Abhängigkeiten
pnpm install

# 2. Bauen
pnpm build

# 3. API-Key (Groq kostenlos)
echo "GROQ_API_KEY=dein_key" >> packages/server/.env

# 4. Starten
node packages/server/dist/index.js

# 5. Öffnen
# http://localhost:3000

# CLI:
node packages/cli/dist/cli.js start --backend groq
node packages/cli/dist/cli.js chat
node packages/cli/dist/cli.js status
```

---

*Vela AI Agent Platform v1.0 | Intern | März 2026*
