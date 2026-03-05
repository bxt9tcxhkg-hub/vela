# Vela auf schwacher Hardware

Vela läuft auch auf älteren oder schwächeren PCs — mit dem richtigen Setup.

## Systemanforderungen

| | Minimum (Cloud-Modus) | Empfohlen (Lokal) |
|---|---|---|
| RAM | 4 GB | 16 GB |
| CPU | 2 Kerne | 4+ Kerne |
| Disk | 2 GB | 20 GB |
| GPU | nicht nötig | NVIDIA 8 GB VRAM |
| Internet | Ja (für Cloud) | Optional |

## Empfehlung für schwache Hardware: Cloud-Modus

Statt Ollama lokal laufen zu lassen, nutzt Vela einen Cloud-Provider.
Der Vela-Server selbst braucht nur ~200–400 MB RAM.

**Günstigste/sparsamste Modelle:**
- **Claude Haiku** — schnellstes Anthropic-Modell, sehr günstig (~$0.25/M Tokens)
- **GPT-4o mini** — OpenAI, günstig und schnell
- **Gemini Flash** — Google, gratis-Tier verfügbar

## Quickstart (Cloud-Modus, Docker)

```bash
# 1. Repo klonen
git clone https://github.com/dein-repo/vela
cd vela

# 2. .env anlegen
cp .env.example .env
# .env öffnen und API-Key eintragen (mind. einen):
# ANTHROPIC_API_KEY=sk-ant-...
# oder OPENAI_API_KEY=sk-...
# oder GEMINI_API_KEY=...

# 3. Low-Spec-Container starten (512 MB RAM-Limit)
docker compose -f docker-compose.low-spec.yml up -d

# 4. Browser öffnen
# http://localhost:3000
```

## Quickstart (ohne Docker, direkt)

```bash
# Node.js 20+ vorausgesetzt
npm install -g pnpm
git clone https://github.com/dein-repo/vela && cd vela
pnpm install
cp .env.example .env   # API-Key eintragen
pnpm --filter @vela/server start
```

Server läuft auf Port 3000, braucht ~200 MB RAM.

## Ollama auf schwacher Hardware (ohne GPU)

Falls du trotzdem lokal laufen willst:

```bash
# Kleinstes Modell: qwen2.5:0.5b (nur ~400 MB RAM)
ollama pull qwen2.5:0.5b

# In Vela Einstellungen → Lokales Modell → qwen2.5:0.5b eintragen
```

**Modell-Empfehlungen nach RAM:**
| RAM | Modell | Qualität |
|---|---|---|
| 4 GB | `qwen2.5:0.5b` | Basis |
| 6 GB | `qwen2.5:1.5b` | Gut |
| 8 GB | `qwen2.5:3b` | Sehr gut |
| 16 GB | `qwen2.5:7b` | Excellent |

## Troubleshooting

**Server startet langsam:** Normal bei wenig RAM — bis zu 30s Startzeit möglich.

**"Out of memory":** `docker compose -f docker-compose.low-spec.yml down` → `.env` prüfen → Cloud-Key gesetzt?

**Ollama zu langsam:** Auf Cloud-Modus wechseln (Einstellungen → Betriebsmodus).
