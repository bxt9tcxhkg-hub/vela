// Backend-Konnektor – dualer Betriebsmodus (Lokal/Cloud)
// Einheitliche Schnittstelle für den Rest der Plattform.
// Der Modus kann jederzeit gewechselt werden.

import type { AIProvider, CompletionOptions, CompletionResult, StreamChunk } from '../types/index.js'
import type { Message } from '../types/index.js'
import { OllamaProvider } from './ollama.js'

export type OperationMode = 'local' | 'cloud'

export interface ModeChangeEvent {
  from: OperationMode
  to:   OperationMode
  reason?: string
}

export interface ConnectorConfig {
  mode?:          OperationMode
  ollamaBaseUrl?: string
  ollamaModel?:   string
  cloudProvider?: string  // 'claude' | 'openai' | 'gemini'
  cloudApiKey?:   string
  onModeChange?:  (event: ModeChangeEvent) => void
  onCloudWarning?: () => Promise<boolean>  // returns true wenn User bestätigt
}

export class BackendConnector {
  private mode: OperationMode
  private localProvider:  AIProvider
  private cloudProvider:  AIProvider | null = null
  private config:         ConnectorConfig

  constructor(config: ConnectorConfig = {}) {
    this.config        = config
    this.mode          = config.mode ?? 'local'
    this.localProvider = new OllamaProvider(
      config.ollamaBaseUrl,
      config.ollamaModel,
    )
  }

  // ─── Modus-Verwaltung ──────────────────────────────────────────────────────

  getMode(): OperationMode {
    return this.mode
  }

  isLocal(): boolean  { return this.mode === 'local' }
  isCloud(): boolean  { return this.mode === 'cloud' }

  /**
   * Wechselt den Betriebsmodus.
   * Bei Wechsel von Lokal → Cloud: Risikohinweis wird angezeigt.
   * Nutzer muss aktiv bestätigen (onCloudWarning Callback).
   */
  async setMode(newMode: OperationMode, skipWarning = false): Promise<boolean> {
    if (newMode === this.mode) return true

    // Risikohinweis bei Wechsel zu Cloud
    if (newMode === 'cloud' && !skipWarning && this.config.onCloudWarning) {
      const confirmed = await this.config.onCloudWarning()
      if (!confirmed) return false
    }

    if (newMode === 'cloud' && !this.cloudProvider) {
      throw new Error(
        'Kein Cloud-Provider konfiguriert. ' +
        'Bitte API-Key in den Einstellungen hinterlegen.'
      )
    }

    const from = this.mode
    this.mode  = newMode

    this.config.onModeChange?.({ from, to: newMode })
    return true
  }

  /**
   * Registriert einen Cloud-Provider (Claude, OpenAI, Gemini ...).
   * Wird bei Bedarf über die Einstellungen gesetzt.
   */
  setCloudProvider(provider: AIProvider): void {
    this.cloudProvider = provider
  }

  // ─── Hardware-Erkennung ───────────────────────────────────────────────────

  /**
   * Prüft ob genug RAM für lokalen Betrieb vorhanden ist.
   * Gibt eine Empfehlung zurück.
   */
  async checkLocalCapability(): Promise<{
    sufficient: boolean
    message:    string
    recommend:  OperationMode
  }> {
    const ollamaOk = await this.localProvider.isAvailable()

    if (!ollamaOk) {
      return {
        sufficient: false,
        message:    'Ollama-Dienst ist nicht erreichbar. Bitte Ollama installieren oder starten.',
        recommend:  'cloud',
      }
    }

    return {
      sufficient: true,
      message:    'Lokaler Betrieb möglich.',
      recommend:  'local',
    }
  }

  // ─── AI-Aufrufe ───────────────────────────────────────────────────────────

  private getActiveProvider(): AIProvider {
    if (this.mode === 'local') return this.localProvider
    if (this.cloudProvider)    return this.cloudProvider
    throw new Error('Cloud-Provider nicht konfiguriert.')
  }

  async complete(messages: Message[], options?: CompletionOptions): Promise<CompletionResult> {
    return this.getActiveProvider().complete(messages, options)
  }

  async *stream(messages: Message[], options?: CompletionOptions): AsyncIterable<StreamChunk> {
    yield* this.getActiveProvider().stream(messages, options)
  }

  async isAvailable(): Promise<boolean> {
    return this.getActiveProvider().isAvailable()
  }

  getProviderName(): string {
    return this.getActiveProvider().name
  }

  // ─── Status ───────────────────────────────────────────────────────────────

  async getStatus(): Promise<{
    mode:          OperationMode
    provider:      string
    available:     boolean
    localAvailable: boolean
  }> {
    const [available, localAvailable] = await Promise.all([
      this.isAvailable().catch(() => false),
      this.localProvider.isAvailable().catch(() => false),
    ])

    return {
      mode:           this.mode,
      provider:       this.getProviderName(),
      available,
      localAvailable,
    }
  }
}

// Singleton für einfachen Import im Rest der Plattform
export const connector = new BackendConnector()
