# Vela Topic V1 – Umsetzungsstatus

## 1) Absicherung
- [x] Backup-Tag: `backup/vela-pre-topic-v1-20260307-0430`
- [x] Branch: `feat/topic-v1-expansion`

## 2) MVP-Themen
- [x] Terminassistenz
- [x] Ernährung
- [x] Alltag

## 3) Datenmodell
- [x] `user_topics` ergänzt
- [x] `conversation_scope` ergänzt (pro user + channel)

## 4) Onboarding
- [x] Themenphase (`topics`) ergänzt
- [x] Endpoint: `GET /api/onboarding/topics`
- [x] Endpoint: `POST /api/onboarding/topics/select`
- [x] Starter-Vorschläge pro Thema in Response

## 5) Topic-Routing (V1)
- [x] Priorität: explicit > scope > intent > neutral question
- [x] Bei Unsicherheit neutrale Rückfrage

## 6) Themenmodule
- [x] eigener Systemkontext je Thema
- [x] 3 Starter-Vorschläge je Thema
- [x] klare Grenzen je Thema

## 7) Smoke-Test
- [x] Topic-Endpunkte inject-test: PASS
- [x] Scope set/get: PASS

## 8) Review + Iteration
- [x] Matrix 20 Fälle erstellt
- [x] Lauf 1: 18/20 PASS
- [x] Nachschärfung Router
- [x] Lauf 2: 20/20 PASS
- [x] Build: PASS

## Offen
- [ ] UI-Anbindung im Frontend (Themenauswahl + Topic-Switch sichtbar)
- [ ] E2E-Dialogtest mit echtem Clientfluss
