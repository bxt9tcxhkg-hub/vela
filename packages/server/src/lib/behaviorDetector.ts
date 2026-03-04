// Detects recurring behavioral patterns from user messages

interface Signal {
  key: string
  label: string
  value: string
  patterns: RegExp[]
}

const SIGNALS: Signal[] = [
  {
    key: 'lang_german',
    label: 'Antworte immer auf Deutsch',
    value: 'Antworte immer auf Deutsch, egal in welcher Sprache ich schreibe.',
    patterns: [/antworte? (immer |bitte )?(auf |in )deutsch/i, /bitte auf deutsch/i, /nur (auf )?deutsch/i],
  },
  {
    key: 'lang_english',
    label: 'Always respond in English',
    value: 'Always respond in English regardless of the language I write in.',
    patterns: [/answer in english/i, /respond in english/i, /please (use |speak )?english/i],
  },
  {
    key: 'concise',
    label: 'Antworte kürzer und prägnanter',
    value: 'Halte deine Antworten kurz und auf das Wesentliche beschränkt. Kein Fülltext.',
    patterns: [/k[üu]rzer/i, /weniger text/i, /fass dich kurz/i, /nicht so lang/i, /zu lang/i, /be (more )?concise/i, /shorter/i],
  },
  {
    key: 'bullet_points',
    label: 'Antworte immer mit Aufzählungen',
    value: 'Strukturiere Antworten bevorzugt als Aufzählungslisten.',
    patterns: [/aufz[äa]hlung/i, /stichpunkte?/i, /bullet points?/i, /liste (bitte|immer)/i, /als liste/i],
  },
  {
    key: 'formal',
    label: 'Sprich mich formell an (Sie)',
    value: 'Spreche mich immer formell mit "Sie" an.',
    patterns: [/sie mich (bitte )?ansprechen/i, /formell/i, /sieze? mich/i, /mit sie/i],
  },
  {
    key: 'casual',
    label: 'Sprich mich locker an (du)',
    value: 'Sprich mich immer mit "du" an, locker und direkt.',
    patterns: [/duze? mich/i, /mit du/i, /locker(er)?/i, /informell/i],
  },
  {
    key: 'code_first',
    label: 'Zeige zuerst immer den Code',
    value: 'Zeige bei Code-Anfragen immer zuerst den vollständigen Code, Erklärungen danach.',
    patterns: [/erst den code/i, /code zuerst/i, /show (me )?the code first/i, /code before/i],
  },
  {
    key: 'no_disclaimer',
    label: 'Keine Disclaimers oder Warnhinweise',
    value: 'Verzichte auf Disclaimers, Warnhinweise und Einschränkungsformulierungen.',
    patterns: [/kein(e)? (disclaimer|warnung|hinweis)/i, /ohne warnung/i, /no disclaimer/i, /skip the disclaimer/i],
  },
  {
    key: 'step_by_step',
    label: 'Erkläre Schritt für Schritt',
    value: 'Erkläre komplexe Dinge immer Schritt für Schritt.',
    patterns: [/schritt (f[üu]r schritt|f[üu]r schritt)/i, /step by step/i, /einzelne schritte/i, /schritt erkl/i],
  },
  {
    key: 'emoji_off',
    label: 'Keine Emojis in Antworten',
    value: 'Verwende keine Emojis in deinen Antworten.',
    patterns: [/keine emojis?/i, /ohne emojis?/i, /no emojis?/i, /lass die emojis/i],
  },
]

export function detectSignals(userMessage: string): Signal[] {
  return SIGNALS.filter(s => s.patterns.some(p => p.test(userMessage)))
}
