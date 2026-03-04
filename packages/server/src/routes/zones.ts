import type { FastifyInstance } from 'fastify'
import { ZONE_MAP, getZonesByColor } from '../utils/zones.js'

export async function zoneRoutes(fastify: FastifyInstance): Promise<void> {
  // GET /api/zones — komplette Zonenkarte
  fastify.get('/api/zones', async (_req, reply) => {
    const body = JSON.stringify({
      green: getZonesByColor('green'),
      yellow: getZonesByColor('yellow'),
      red: getZonesByColor('red'),
    })
    return reply
      .header('Content-Type', 'application/json')
      .header('Content-Length', Buffer.byteLength(body))
      .send(body)
  })
}
