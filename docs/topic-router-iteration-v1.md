# Topic Router Iteration – V1

## Ziel
Fehlklassifikationen systematisch sammeln und Routing/Prompts nachschärfen.

## Log-Format (pro Dialog)
- `timestamp`
- `user_text`
- `explicit_topic`
- `detected_topic`
- `stored_scope_topic`
- `final_topic`
- `result`: `ok | misclassified | neutral_needed`
- `note`

## Nachschärf-Regeln
1. **False Positive** (falsch zugewiesen): Regex enger machen oder auf neutralen Fallback gehen.
2. **False Negative** (nicht erkannt): fehlende Schlüsselbegriffe pro Thema ergänzen.
3. **Mehrdeutig** (z. B. Termin + Einkauf): Priorität nur bei expliziter Auswahl, sonst neutrale Rückfrage.

## Erste Testmatrix (manuell)
- Terminassistenz: 10 Sätze
- Ernährung: 10 Sätze
- Alltag: 10 Sätze
- Ambiguous/Mixed: 10 Sätze
- Neutral/Unklar: 10 Sätze

Abbruchkriterium V1.1:
- >= 90% korrekte Topic-Zuordnung bei klaren Sätzen
- 100% neutraler Fallback bei unklaren Sätzen
