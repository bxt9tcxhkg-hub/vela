# TODO: Port Auto-Discovery

## Ziel
Vela und OpenClaw können parallel laufen ohne Port-Konflikte.

## Lösung: Option C — Port Auto-Discovery

**Server (`packages/server/src/config.ts`):**
- Versucht Port 3000 → belegt → 3001 → 3002 → erster freier Port
- Schreibt genutzten Port in eine Datei (z.B. `~/.vela/port`)

**Electron (`packages/desktop/src/main.ts`):**
- Liest Port aus `~/.vela/port` nach Server-Start
- Öffnet Browser-Fenster mit korrektem Port
- IPC: UI fragt Port ab, nicht hardcoded

**Implementierung wenn bereit:**
1. `config.ts`: `findAvailablePort(startPort = 3000)`
2. `main.ts`: Port-Datei lesen + an UI weitergeben
3. UI: Server-URL dynamisch (nicht hardcoded `localhost:3000`)
