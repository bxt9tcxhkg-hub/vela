// Conversations API – Gesprächsverlauf lesen
import type { FastifyInstance } from 'fastify'
import { listConversations, getConversationMessages } from '../db/conversations.js'

export async function conversationRoutes(fastify: FastifyInstance): Promise<void> {

  // Alle Gespräche auflisten
  fastify.get('/api/conversations', async (_req, reply) => {
    const convs = listConversations()
    return reply.code(200).send(convs)
  })

  // Nachrichten eines Gesprächs
  fastify.get<{ Params: { id: string } }>('/api/conversations/:id/messages', async (request, reply) => {
    const messages = getConversationMessages(request.params.id)
    return reply.code(200).send(messages)
  })
}
