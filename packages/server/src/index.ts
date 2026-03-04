import Fastify from 'fastify'
import cors from '@fastify/cors'
import { join, dirname } from 'path'
import { fileURLToPath } from 'url'
import { config } from './config.js'
import { chatRoutes } from './routes/chat.js'
import { settingsRoutes } from './routes/settings.js'
import { skillRoutes } from './routes/skills.js'
import { onboardingRoutes } from './routes/onboarding.js'

const fastify = Fastify({
  logger: config.nodeEnv === 'development',
})

await fastify.register(cors, {
  origin: process.env.NODE_ENV === 'production' ? true : ['http://localhost:5173', 'http://localhost:5174'],
  methods: ['GET', 'POST'],
})

await fastify.register(chatRoutes)
await fastify.register(settingsRoutes)
await fastify.register(skillRoutes)
await fastify.register(onboardingRoutes)

// Serve UI static files in production
if (process.env.NODE_ENV === 'production') {
  const uiDist = join(dirname(fileURLToPath(import.meta.url)), '../../ui/dist')
  const fastifyStatic = (await import('@fastify/static')).default
  await fastify.register(fastifyStatic, {
    root: uiDist,
    prefix: '/',
    wildcard: false,
    decorateReply: true,
  })
  // SPA fallback
  fastify.setNotFoundHandler(async (_req, reply) => {
    return reply.sendFile('index.html')
  })
}

try {
  await fastify.listen({ port: config.port, host: config.host })
  console.log(`✦ Vela server running on http://${config.host}:${config.port}`)
} catch (err) {
  fastify.log.error(err)
  process.exit(1)
}
