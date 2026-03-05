# Discord Interactions Setup

Dieses Dokument erklärt, wie der Discord-Inbound-Trigger für Vela konfiguriert wird.

## Voraussetzungen

- Discord Developer Account: <https://discord.com/developers/applications>
- Vela-Server läuft und ist öffentlich erreichbar (z.B. via Reverse-Proxy oder ngrok)

## Schritt 1: Discord Application erstellen

1. Gehe zu <https://discord.com/developers/applications>
2. Klicke auf **New Application** → Name eingeben (z.B. "Vela")
3. Unter **General Information** die **Application ID** notieren

## Schritt 2: Bot einrichten

1. Links auf **Bot** klicken
2. **Reset Token** → Token kopieren und sicher speichern
3. Unter **Privileged Gateway Intents**: aktiviere `MESSAGE CONTENT INTENT` falls nötig

## Schritt 3: Interactions Endpoint URL eintragen

1. Links auf **General Information**
2. Scrolle zu **Interactions Endpoint URL**
3. Trage ein:
   ```
   https://deine-domain.example.com/api/channels/discord/interactions
   ```
4. Discord sendet einen Ping (type=1) — Vela antwortet automatisch mit `{ type: 1 }` zur Verifikation
5. Klicke **Save Changes**

## Schritt 4: Slash Command registrieren (optional)

Damit Nutzer `/vela <text>` eingeben können:

```bash
# Einmalig ausführen (ersetze APP_ID und BOT_TOKEN)
curl -X POST \
  https://discord.com/api/v10/applications/<APP_ID>/commands \
  -H "Authorization: Bot <BOT_TOKEN>" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "vela",
    "type": 1,
    "description": "Stelle Vela eine Frage",
    "options": [{
      "name": "frage",
      "description": "Deine Frage an Vela",
      "type": 3,
      "required": true
    }]
  }'
```

## Schritt 5: Bot zum Server einladen

1. Links auf **OAuth2 → URL Generator**
2. Scopes: `bot`, `applications.commands`
3. Bot Permissions: `Send Messages`, `Use Slash Commands`
4. Generierte URL öffnen → Server auswählen → Autorisieren

## Funktionsweise

```
Nutzer gibt /vela <text> ein
        ↓
Discord sendet POST /api/channels/discord/interactions
        ↓
Vela routet durch /api/chat
        ↓
Antwort innerhalb 3 Sekunden zurück an Discord
```

## Lokale Entwicklung mit ngrok

```bash
ngrok http 3000
# Kopiere die HTTPS-URL und trage sie als Interactions Endpoint URL ein
```
