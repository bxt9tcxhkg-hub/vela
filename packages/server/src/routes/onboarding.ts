// Onboarding-Chat-Route – KI führt Nutzer durch Ersteinrichtung
import type { FastifyInstance } from 'fastify'
import { z } from 'zod'
import { isOllamaAvailable, chatOllama } from '../ai/ollama.js'
import { chatGemini } from '../ai/gemini.js'
import Anthropic from '@anthropic-ai/sdk'
import OpenAI from 'openai'

const OnboardingChatSchema = z.object({
  messages: z.array(z.object({
    role:    z.enum(['user', 'assistant']),
    content: z.string(),
  })),
  mode:       z.enum(['local', 'cloud']).default('local'),
  trustLevel: z.enum(['cautious', 'balanced', 'autonomous']).default('balanced'),
  provider:   z.string().optional(),  // cloud provider wenn mode=cloud
  os:         z.string().optional(),
})

function buildOnboardingSystemPrompt(mode: string, trustLevel: string, os?: string): string {
  const modeLabel = mode === 'local' ? 'Lokal (kein Internet erforderlich)' : 'Cloud-verbunden'
  const trustLabel = trustLevel === 'cautious' ? 'Vorsichtig' : trustLevel === 'balanced' ? 'Ausgewogen' : 'Autonom'
  return `Du bist der Einrichtungsassistent von Vela — einer persönlichen KI-Agenten-Plattform.
Deine Aufgabe ist es, den Nutzer in einem freundlichen, kurzen Dialog durch die Ersteinrichtung zu führen.

Regeln:
- Stelle immer nur eine Frage auf einmal
- Halte Antworten kurz und verständlich (kein Tech-Jargon)
- Passe deine Empfehlungen an das an, was der Nutzer dir sagt
- Erkläre kurz warum du eine Empfehlung gibst
- Sprache: Deutsch (Standard), Englisch wenn der Nutzer auf Englisch schreibt
- Wenn du Skills empfiehlst, nenne sie beim Namen: web-search, file-manager, email-reader, email-sender
- Schließe das Onboarding ab wenn du das Gefühl hast, genug zu wissen — mit "Alles bereit! [ONBOARDING_COMPLETE]"

Aktueller Kontext:
- Gewählter Modus: ${modeLabel}
- Gewähltes Trust-Level: ${trustLabel}
- Betriebssystem: ${os ?? 'Unbekannt'}

Starte mit einer freundlichen Begrüßung und frage nach dem Hauptanwendungsfall des Nutzers.`
}

export async function onboardingRoutes(fastify: FastifyInstance): Promise<void> {

  // Prüft ob ein LLM verfügbar ist und welcher
  fastify.get('/api/onboarding/status', async (_req, reply) => {
    const ollamaOk = await isOllamaAvailable()
    const hasCloud = !!(
      process.env.ANTHROPIC_API_KEY ||
      process.env.OPENAI_API_KEY ||
      process.env.GEMINI_API_KEY
    )
    return reply.send({
      llmAvailable: ollamaOk || hasCloud,
      ollama:       ollamaOk,
      cloud:        hasCloud,
    })
  })

  fastify.post('/api/onboarding/chat', async (request, reply) => {
    const body = OnboardingChatSchema.parse(request.body)
    const systemPrompt = buildOnboardingSystemPrompt(body.mode, body.trustLevel, body.os)

    // Provider-Auswahl: Lokal → Ollama, Cloud → konfigurierten Provider
    const provider = body.provider ?? (body.mode === 'local' ? 'ollama' : 'claude')
    let text = ''

    try {
      if (provider === 'ollama' || body.mode === 'local') {
        const available = await isOllamaAvailable()
        if (!available) {
          // Graceful fallback: statischer Text
          return reply.send({
            text: 'Herzlich willkommen bei Vela! 👋 Da Ollama gerade nicht erreichbar ist, kannst du direkt loslegen — deine Einstellungen wurden gespeichert. Womit kann ich dir helfen?',
            fallback: true,
            complete: false,
          })
        }
        const model = process.env.OLLAMA_MODEL ?? 'llama3.1:8b'
        text = await chatOllama(body.messages, model, systemPrompt)
      }

      else if (provider === 'claude' || provider === 'anthropic') {
        const apiKey = process.env.ANTHROPIC_API_KEY ?? ''
        if (!apiKey) throw new Error('no-key')
        const client = new Anthropic({ apiKey })
        const response = await client.messages.create({
          model:      process.env.DEFAULT_MODEL ?? 'claude-haiku-4-5-20251001',
          max_tokens: 512,
          system:     systemPrompt,
          messages:   body.messages,
        })
        text = response.content
          .filter(b => b.type === 'text')
          .map(b => (b as { type: 'text'; text: string }).text)
          .join('')
      }

      else if (provider === 'openai' || provider === 'gpt') {
        const apiKey = process.env.OPENAI_API_KEY ?? ''
        if (!apiKey) throw new Error('no-key')
        const client = new OpenAI({ apiKey })
        const response = await client.chat.completions.create({
          model: 'gpt-4o-mini',
          messages: [{ role: 'system', content: systemPrompt }, ...body.messages],
          max_tokens: 512,
        })
        text = response.choices[0]?.message?.content ?? ''
      }

      else if (provider === 'gemini' || provider === 'google') {
        const apiKey = process.env.GEMINI_API_KEY ?? ''
        if (!apiKey) throw new Error('no-key')
        text = await chatGemini(body.messages, apiKey, undefined, systemPrompt)
      }

      else {
        return reply.code(400).send({ error: `Unbekannter Provider: ${provider}` })
      }

    } catch (err) {
      // Graceful fallback bei Fehler
      console.error('[Onboarding] LLM-Fehler:', err)
      return reply.send({
        text: 'Willkommen bei Vela! Deine Einstellungen wurden gespeichert. Du kannst jetzt direkt loslegen.',
        fallback: true,
        complete: false,
      })
    }

    const complete = text.includes('[ONBOARDING_COMPLETE]')
    const cleanText = text.replace('[ONBOARDING_COMPLETE]', '').trim()

    return reply.send({ text: cleanText, fallback: false, complete })
  })
}
