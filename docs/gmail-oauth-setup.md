# Gmail OAuth einrichten

Damit Vela deine E-Mails lesen und senden kann, benötigst du Google OAuth Credentials.
Das dauert ca. 10 Minuten.

---

## Schritt 1 – Google Cloud Projekt erstellen

1. Gehe zu [https://console.cloud.google.com](https://console.cloud.google.com)
2. Klick oben links auf **Projekt auswählen** → **Neues Projekt**
3. Name: `Vela` → **Erstellen**

---

## Schritt 2 – Gmail API aktivieren

1. Gehe zu **APIs & Dienste → Bibliothek**
2. Suche nach `Gmail API`
3. Klick auf **Aktivieren**

---

## Schritt 3 – OAuth Consent Screen konfigurieren

1. Gehe zu **APIs & Dienste → OAuth-Zustimmungsbildschirm**
2. Nutzertyp: **Extern** → **Erstellen**
3. App-Name: `Vela` | Support-E-Mail: deine Gmail-Adresse
4. Klick durch bis **Speichern**
5. Unter **Testnutzer**: deine eigene Gmail-Adresse hinzufügen

---

## Schritt 4 – OAuth Client-ID erstellen

1. Gehe zu **APIs & Dienste → Anmeldedaten**
2. Klick **+ Anmeldedaten erstellen → OAuth-Client-ID**
3. Anwendungstyp: **Desktop-App**
4. Name: `Vela Desktop`
5. Klick **Erstellen**
6. **Client-ID** und **Client-Secret** kopieren

---

## Schritt 5 – Refresh Token holen

Führe diesen Befehl aus (ersetze `CLIENT_ID` und `CLIENT_SECRET`):

```bash
# Schritt 5a: Authorization URL aufrufen
curl "https://accounts.google.com/o/oauth2/auth?client_id=CLIENT_ID&redirect_uri=urn:ietf:wg:oauth:2.0:oob&scope=https://www.googleapis.com/auth/gmail.modify&response_type=code"
```

Öffne die URL im Browser → Anmelden → Code kopieren.

```bash
# Schritt 5b: Refresh Token holen
curl -X POST https://oauth2.googleapis.com/token \
  -d "client_id=CLIENT_ID" \
  -d "client_secret=CLIENT_SECRET" \
  -d "code=DEIN_CODE" \
  -d "redirect_uri=urn:ietf:wg:oauth:2.0:oob" \
  -d "grant_type=authorization_code"
```

Das `refresh_token` aus der Antwort kopieren.

---

## Schritt 6 – In Vela eintragen

In `packages/server/.env`:

```env
GOOGLE_CLIENT_ID=123456789-abc.apps.googleusercontent.com
GOOGLE_CLIENT_SECRET=GOCSPX-...
GOOGLE_REFRESH_TOKEN=1//0g...
```

Oder in den Vela-Einstellungen unter **Gmail-Verbindung**.

---

## Fertig!

Vela kann jetzt:
- ✅ Ungelesene E-Mails abrufen
- ✅ E-Mails in deinem Namen senden
- ✅ Nach E-Mails suchen

> **Hinweis:** Deine Credentials verlassen nie das Gerät — alle Anfragen laufen lokal über den Vela-Server.
