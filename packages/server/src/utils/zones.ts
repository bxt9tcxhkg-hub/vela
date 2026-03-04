/**
 * D-07: Einstellungs-Zonenkarte (Grün / Gelb / Rot)
 * Definiert welche Aktionen Vela autonom ausführen darf,
 * welche Nutzerbestätigung brauchen, und welche gesperrt sind.
 */

export type Zone = 'green' | 'yellow' | 'red'

export interface ZoneEntry {
  id: string
  description: string
  zone: Zone
  requiresConfirmation: boolean
  agentCanExecute: boolean
  examples: string[]
}

export const ZONE_MAP: ZoneEntry[] = [
  // ─── GRÜN: Agent handelt selbstständig ───────────────────────────────────
  {
    id: 'text-generation',
    description: 'Texte formulieren, übersetzen, zusammenfassen',
    zone: 'green',
    requiresConfirmation: false,
    agentCanExecute: true,
    examples: ['E-Mail verfassen (Entwurf)', 'Text übersetzen', 'Zusammenfassung erstellen'],
  },
  {
    id: 'information',
    description: 'Informationen erklären und recherchieren',
    zone: 'green',
    requiresConfirmation: false,
    agentCanExecute: true,
    examples: ['Fragen beantworten', 'Web-Suche', 'Konzepte erklären'],
  },
  {
    id: 'recommendations',
    description: 'Vorschläge und Empfehlungen machen',
    zone: 'green',
    requiresConfirmation: false,
    agentCanExecute: true,
    examples: ['Produktempfehlung', 'Entscheidungshilfe', 'Optionen vergleichen'],
  },
  {
    id: 'vela-display',
    description: 'Anzeigeeinstellungen in Vela anpassen',
    zone: 'green',
    requiresConfirmation: false,
    agentCanExecute: true,
    examples: ['Theme wechseln', 'Schriftgröße', 'Sprache der UI'],
  },

  // ─── GELB: Agent schlägt vor, Nutzer bestätigt ───────────────────────────
  {
    id: 'file-operations',
    description: 'Dateien erstellen, umbenennen oder verschieben',
    zone: 'yellow',
    requiresConfirmation: true,
    agentCanExecute: true,
    examples: ['Datei anlegen', 'Ordner umbenennen', 'Dokument verschieben'],
  },
  {
    id: 'email-send',
    description: 'E-Mails senden',
    zone: 'yellow',
    requiresConfirmation: true,
    agentCanExecute: true,
    examples: ['E-Mail absenden', 'Antwort senden', 'Weiterleiten'],
  },
  {
    id: 'vela-settings-non-security',
    description: 'Vela-Einstellungen (nicht sicherheitsrelevant)',
    zone: 'yellow',
    requiresConfirmation: true,
    agentCanExecute: true,
    examples: ['Vela-Name ändern', 'Ton-Einstellung', 'Zweck-Einstellung'],
  },
  {
    id: 'skill-activation',
    description: 'Externe Dienste oder Skills aktivieren',
    zone: 'yellow',
    requiresConfirmation: true,
    agentCanExecute: true,
    examples: ['Gmail verbinden', 'Kalender-Skill aktivieren', 'Wetter-Skill'],
  },
  {
    id: 'multistep-tasks',
    description: 'Aufgaben mit mehr als einem Schritt oder länger als 2 Minuten',
    zone: 'yellow',
    requiresConfirmation: true,
    agentCanExecute: true,
    examples: ['Daten analysieren und berichten', 'Mehrere Dateien umbenennen'],
  },

  // ─── ROT: Agent weist hin, handelt NIEMALS selbst ─────────────────────────
  {
    id: 'backend-mode-switch',
    description: 'Betriebsmodus ändern (Lokal ↔ Cloud)',
    zone: 'red',
    requiresConfirmation: false,
    agentCanExecute: false,
    examples: ['Auf Cloud wechseln', 'Zurück zu lokal', 'Groq aktivieren'],
  },
  {
    id: 'privacy-settings',
    description: 'Datenschutzeinstellungen jeder Art',
    zone: 'red',
    requiresConfirmation: false,
    agentCanExecute: false,
    examples: ['Datenfreigabe', 'Logging aktivieren', 'Telemetrie'],
  },
  {
    id: 'security-config',
    description: 'Sicherheitskonfigurationen von Vela oder Ollama',
    zone: 'red',
    requiresConfirmation: false,
    agentCanExecute: false,
    examples: ['CORS-Einstellungen', 'Ollama ORIGINS', 'Ollama Host-Binding'],
  },
  {
    id: 'system-files',
    description: 'Systemdateien oder Installationsverzeichnisse',
    zone: 'red',
    requiresConfirmation: false,
    agentCanExecute: false,
    examples: ['Program Files', 'System32', 'Ollama-Installation'],
  },
  {
    id: 'credentials',
    description: 'API-Schlüssel, Tokens oder Zugangsdaten',
    zone: 'red',
    requiresConfirmation: false,
    agentCanExecute: false,
    examples: ['ANTHROPIC_API_KEY lesen', 'GROQ_API_KEY ausgeben', 'OAuth-Token'],
  },
  {
    id: 'network-firewall',
    description: 'Firewall-Regeln oder Netzwerkeinstellungen',
    zone: 'red',
    requiresConfirmation: false,
    agentCanExecute: false,
    examples: ['Firewall-Regel', 'Port öffnen', 'Netzwerkbindung ändern'],
  },
  {
    id: 'system-prompt',
    description: 'System-Prompt oder Agenten-Identität ändern',
    zone: 'red',
    requiresConfirmation: false,
    agentCanExecute: false,
    examples: ['Prompt überschreiben', 'Rolle ändern', 'Sicherheitsgrenzen entfernen'],
  },
]

export function getZone(actionId: string): ZoneEntry | undefined {
  return ZONE_MAP.find((z) => z.id === actionId)
}

export function getZonesByColor(zone: Zone): ZoneEntry[] {
  return ZONE_MAP.filter((z) => z.zone === zone)
}

export function isRedZone(actionId: string): boolean {
  return getZone(actionId)?.zone === 'red'
}

export const RED_ZONE_RESPONSE =
  'Das ist eine sicherheitsrelevante Einstellung — ich kann dich dorthin führen, aber du musst die Änderung selbst vornehmen. Soll ich dir zeigen wo?'
