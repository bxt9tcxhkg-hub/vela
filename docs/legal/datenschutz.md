# Datenschutzerklärung – Vela AI Agent
**Stand: März 2026 | Version 1.0**

> ⚠️ Dieses Dokument ist ein Entwurf. Vor dem Launch ist eine Prüfung durch einen IT-Rechtsanwalt erforderlich (S-05: EU AI Act Compliance).

---

## 1. Verantwortlicher

Vela wird als lokale Software auf dem Gerät des Nutzers betrieben.  
Für die Verarbeitung personenbezogener Daten ist der jeweilige Nutzer selbst verantwortlich (Art. 4 Nr. 7 DSGVO), sofern er Vela ausschließlich für persönliche oder familiäre Zwecke verwendet (Art. 2 Abs. 2c DSGVO — Haushaltsausnahme).

Bei kommerziellem Einsatz: Bitte eigene Datenschutzerklärung hinzufügen.

---

## 2. Welche Daten werden verarbeitet?

### 2.1 Lokaler Betrieb (Ollama)
- **Keine Daten verlassen das Gerät.**
- Konversationen werden nur im Arbeitsspeicher gehalten.
- Keine dauerhafte Speicherung ohne explizite Nutzeraktion.
- Keine Telemetrie, keine Analytics.

### 2.2 Groq-Backend (optional)
- Anfragen werden an Groqs Server gesendet: `api.groq.com`
- **Gesendete Daten:** Nur der Inhalt der aktuellen Anfrage (kein Name, keine Gerätedaten)
- **Speicherung durch Groq:** Laut Groq Privacy Policy werden Konversationen **nicht dauerhaft gespeichert**
- Zutreffende Datenschutzrichtlinie: [Groq Privacy Policy](https://groq.com/privacy-policy/)

### 2.3 Cloud-Backend (optional, z.B. Anthropic, OpenAI)
- Anfragen gehen an den jeweiligen Anbieter
- Deren Datenschutzrichtlinien gelten
- Vela speichert keine Konversationen dauerhaft
- Nutzer wird bei Wechsel auf Cloud aktiv aufgeklärt (T-11)

---

## 3. Cookies und lokale Speicherung

Vela verwendet `localStorage` für:
- `vela_onboarded` — ob das Onboarding abgeschlossen wurde (kein personenbezogenes Datum)
- `vela_trust` — gewählte Vertrauensstufe (kein personenbezogenes Datum)

Es werden **keine Tracking-Cookies** gesetzt.

---

## 4. Messenger-Integration (optional)

Bei Verbindung mit Telegram oder Discord:
- Bot-Token und Chat-ID werden lokal in der `.env`-Datei gespeichert
- Nachrichten werden über die jeweilige Plattform übertragen
- Es gelten die Datenschutzbedingungen von Telegram bzw. Discord

---

## 5. Weitergabe an Dritte

Vela gibt keine Daten an Dritte weiter.  
Ausnahme: Wenn der Nutzer ein externes Backend (Groq, Cloud) aktiviert — dann nur die Anfrageinhalte, nicht Nutzerdaten.

---

## 6. Rechte der betroffenen Person

Da Vela lokal betrieben wird und keine Server-Infrastruktur unterhält, liegen alle Daten auf dem Gerät des Nutzers. Der Nutzer kann jederzeit:
- Die `.vela/`-Verzeichnisse und `.env`-Datei löschen
- Das Programm deinstallieren
- Alle API-Keys aus den Einstellungen entfernen

---

## 7. Kontakt

Vela ist Open-Source-Software. Bei Fragen: [GitHub Issues](https://github.com/vela-ai/vela)
