# Provider Policy – Local/Groq First

## Ziel
Vela startet standardmäßig mit lokalem Backend (Ollama) oder Groq. Cloud-Provider wie Anthropic/OpenAI bleiben optional.

## Verbindliche Defaults
- `VELA_BACKEND=local` (Default)
- Fallback-Reihenfolge: `local -> groq -> gemini -> openai -> anthropic`

## Betroffene Stellen
- `packages/server/src/ai/registry.ts`
- `packages/server/src/config.ts`
- `packages/server/src/routes/settings.ts`

## Test-Checkliste
1. `getAdapter()` gibt `ollama` zurück
2. `/api/settings` liefert `backend=local`
3. unknown backend fällt auf `ollama`, nicht `anthropic`
4. `pnpm --filter @vela/server build` = PASS

## Testlauf (2026-03-07)
- P1 default adapter: PASS (`getAdapter()=ollama`)
- P2 explicit groq: PASS (`getAdapter('groq')=groq`)
- P3 unknown fallback local: PASS (`getAdapter('unknown')=ollama`)
- P4 available unknown not anthropic: PASS (`getAvailableAdapter('unknown')=ollama`)
- P5 settings backend default local: PASS (`/api/settings -> backend=local`)
- Build: PASS (`pnpm --filter @vela/server build`)
