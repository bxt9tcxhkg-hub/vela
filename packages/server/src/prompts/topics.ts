export type Topic = 'terminassistenz' | 'ernaehrung' | 'alltag'

export const TOPICS: Topic[] = ['terminassistenz', 'ernaehrung', 'alltag']

export interface TopicModule {
  key: Topic
  label: string
  systemContext: string
  starterSuggestions: string[]
  boundaries: string[]
}

export const TOPIC_MODULES: Record<Topic, TopicModule> = {
  terminassistenz: {
    key: 'terminassistenz',
    label: 'Terminassistenz',
    systemContext: 'Fokus: Termine planen, priorisieren, erinnern, Zeitblöcke strukturieren. Kurz, klar, handlungsorientiert.',
    starterSuggestions: [
      'Ich plane deine Woche in 15-Minuten-Schritten.',
      'Ich priorisiere deine offenen Termine nach Dringlichkeit.',
      'Ich erstelle eine konkrete Tagesstruktur mit Pufferzeiten.'
    ],
    boundaries: [
      'Keine verbindlichen Rechts-/Steuerberatungsaussagen.',
      'Keine Entscheidung ohne Nutzerfreigabe bei externen Aktionen.'
    ]
  },
  ernaehrung: {
    key: 'ernaehrung',
    label: 'Ernährung',
    systemContext: 'Fokus: alltagstaugliche Ernährungsplanung, Rezepte, Einkauf, einfache Gewohnheiten.',
    starterSuggestions: [
      'Ich baue dir einen 3-Tage-Plan mit wenig Kochaufwand.',
      'Ich mache aus dem Kühlschrankinhalt konkrete Mahlzeiten.',
      'Ich erstelle eine Einkaufsliste nach Budget und Zeit.'
    ],
    boundaries: [
      'Keine medizinischen Diagnosen.',
      'Keine Therapie- oder Medikamentenempfehlungen.'
    ]
  },
  alltag: {
    key: 'alltag',
    label: 'Alltag',
    systemContext: 'Fokus: Organisation, To-dos, Routinen, kleine Alltagsprobleme pragmatisch lösen.',
    starterSuggestions: [
      'Ich strukturiere deine To-dos in umsetzbare Schritte.',
      'Ich mache aus Chaos einen einfachen Wochenplan.',
      'Ich formuliere schnelle Entscheidungen mit Pro/Contra.'
    ],
    boundaries: [
      'Keine sicherheitskritischen Anleitungen.',
      'Keine professionellen Fachentscheidungen ohne Hinweis auf Grenzen.'
    ]
  }
}

export function isTopic(value: string): value is Topic {
  return TOPICS.includes(value as Topic)
}

export function detectTopicFromText(text: string): Topic | null {
  const lower = text.toLowerCase()

  if (/(termin|kalender|meeting|deadline|uhrzeit|planen|schedule|aufgabe erledigen|zeitplan)/.test(lower)) return 'terminassistenz'
  if (/(essen|ernähr|mahlzeit|rezept|kalorien|einkaufsliste|kochen)/.test(lower)) return 'ernaehrung'
  if (/(alltag|routine|to-?do|haushalt|organisation|struktur|organisier|tag planen)/.test(lower)) return 'alltag'

  return null
}
