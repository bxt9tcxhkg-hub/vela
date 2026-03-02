import Fastify from 'fastify'
import cors from '@fastify/cors'
import { config } from './config.js'
import { chatRoutes } from './routes/chat.js'

const fastify = Fastify({
  logger: config.nodeEnv === 'development',
})

await fastify.register(cors, {
  origin: ['http://localhost:5173', 'http://localhost:5174'],
  methods: ['GET', 'POST'],
})

await fastify.register(chatRoutes)

try {
  await fastify.listen({ port: config.port, host: config.host })
  console.log(`✦ Vela server running on http://${config.host}:${config.port}`)
} catch (err) {
  fastify.log.error(err)
  process.exit(1)
}
