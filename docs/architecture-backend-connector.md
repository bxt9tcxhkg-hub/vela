# Backend-Konnektor Architektur (D-09)
**Version 1.0 | März 2026**

## Übersicht

Vela kommuniziert intern immer über eine einheitliche Schnittstelle — unabhängig davon, ob Ollama (lokal), Groq oder eine kommerzielle Cloud-API dahinter steckt. Der Backend-Konnektor ist die Abstraktionsschicht zwischen dem Chat-System und den KI-Anbietern.

```
┌─────────────────────────────────────────────────────────┐
│                    Vela Frontend (UI)                    │
└────────────────────────┬────────────────────────────────┘
                         │ POST /api/chat
┌────────────────────────▼────────────────────────────────┐
│              Chat Route (routes/chat.ts)                  │
│  - Prompt-Builder (Backbone + Level-Modul)               │
│  - Web-Search Skill (optional)                           │
│  - Kontext-Analyse (T-07)                                │
│  - Checkpoint-Check (T-08)                               │
│  - Storage-Warnung (T-04)                                │
└────────────────────────┬────────────────────────────────┘
                         │ VELA_BACKEND env var
              ┌──────────▼──────────┐
              │  Backend-Selektion  │
              └──┬──────────┬──────┘
                 │          │
    ┌────────────▼──┐  ┌────▼──────────────────┐
    │  Groq Adapter │  │  Anthropic SDK         │
    │  ai/groq.ts   │  │  (Anthropic() direkt)  │
    └───────┬───────┘  └────────────┬───────────┘
            │                       │
    ┌───────▼────────┐   ┌──────────▼──────────┐
    │ api.groq.com   │   │ api.anthropic.com    │
    │ (Llama, Gemma) │   │ (Claude)             │
    └────────────────┘   └─────────────────────┘

    Geplant: Ollama-Adapter (ai/ollama.ts)
    ┌─────────────────────┐
    │  Ollama Adapter      │
    │  ai/ollama.ts        │
    └──────────┬──────────┘
               │
    ┌──────────▼──────────┐
    │ 127.0.0.1:11434     │
    │ (llama3.1:8b, lokal)│
    └─────────────────────┘
```

---

## Adapter-Interface

Jeder Backend-Adapter implementiert dasselbe Interface:

```typescript
interface BackendAdapter {
  chat(
    messages: ChatMessage[],
    systemPrompt: string,
    options?: ChatOptions,
  ): Promise<string>
}

interface ChatMessage {
  role: 'user' | 'assistant'
  content: string
}

interface ChatOptions {
  model?: string
  maxTokens?: number
  temperature?: number
}
```

### Implementierte Adapter

| Adapter | Datei | Status |
|---|---|---|
| Anthropic Claude | `routes/chat.ts` (inline) | ✅ Aktiv |
| Groq (Llama/Gemma) | `ai/groq.ts` | ✅ Aktiv |
| OpenAI | `ai/openai.ts` | 🔶 Stub |
| Ollama (lokal) | `ai/ollama.ts` | ❌ Geplant |

---

## Backend-Auswahl

Das aktive Backend wird durch die Umgebungsvariable `VELA_BACKEND` gesteuert:

```
VELA_BACKEND=anthropic  → Anthropic Claude (Standard)
VELA_BACKEND=groq       → Groq (Llama, Gemma)
VELA_BACKEND=openai     → OpenAI GPT (Stub)
VELA_BACKEND=local      → Ollama (geplant)
```

Setzen via:
- **Onboarding**: Automatisch nach Hardware-Empfehlung
- **Settings UI**: `BackendSelector.tsx` mit 2-Schritt-Bestätigung (T-11)
- **API**: `POST /api/settings` mit `{ backend: "groq" }`
- **CLI**: `vela start --backend groq`

---

## Prompt-Flow

```
1. User-Nachricht kommt rein (POST /api/chat)
2. buildSystemPrompt() → Backbone + Level-Modul kombinieren
   - Variablen befüllen: {{prefs.*}}, {{backend.*}}
   - Checkpoint-Pfad einsetzen (T-08)
3. Web-Search (optional, wenn Muster erkannt)
4. Backend-Selektion: VELA_BACKEND
5. API-Call → Antwort-Text
6. Post-Processing:
   - Kontextfenster-Analyse (T-07) → Warnung wenn ≥70%
   - Checkpoint-Check (T-08) → Resume-Angebot
   - Storage-Warnung (T-04) → bei Disk/RAM-Problem
7. JSON-Response: { text, skillUsed, activity, contextStats }
```

---

## Sicherheitsschichten

| Schicht | Mechanismus |
|---|---|
| Prompt-Injection | System-Prompt ist unveränderlicher erster Block, User-Input nie im System-Layer |
| API-Key-Schutz | Keys nur in `.env` (lokal), nie in Responses, in Snapshots geschwärzt (T-09) |
| Localhost-Binding | Ollama nur auf `127.0.0.1:11434` (T-02) |
| Zonenkarte | Grün/Gelb/Rot definiert was der Agent darf (D-07) |
| Rate-Limit | Nutzerfreundliche Meldung statt API-Fehler (K-06) |

---

## Geplante Erweiterungen

- **`ai/ollama.ts`**: Vollständiger Ollama-Adapter mit Health-Check und Modell-Management
- **Streaming**: Server-Sent Events für Echtzeit-Antworten
- **Retry-Logic**: Automatischer Fallback Groq → lokal bei Fehler
- **Token-Zählung**: Exakte Tokenanzahl statt Schätzung (T-07)
