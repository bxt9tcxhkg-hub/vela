// Text-to-Speech – Vela spricht zurück (OpenAI TTS oder Web Speech Fallback)
import type { FastifyInstance } from 'fastify'

export async function ttsRoutes(fastify: FastifyInstance): Promise<void> {

  fastify.post<{ Body: { text: string; voice?: string; model?: string } }>(
    '/api/tts',
    async (req, reply) => {
      const { text, voice = 'alloy', model = 'tts-1' } = req.body

      const apiKey = process.env.OPENAI_API_KEY
      if (!apiKey) {
        return reply.code(400).send({ error: 'Kein OpenAI API-Key — bitte in .env setzen.' })
      }

      const res = await fetch('https://api.openai.com/v1/audio/speech', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${apiKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ model, input: text.slice(0, 4096), voice, response_format: 'mp3' }),
      })

      if (!res.ok) {
        const err = await res.text()
        return reply.code(res.status).send({ error: err })
      }

      const buffer = Buffer.from(await res.arrayBuffer())
      reply.header('Content-Type', 'audio/mpeg')
      reply.header('Content-Length', buffer.length.toString())
      return reply.send(buffer)
    }
  )
}
