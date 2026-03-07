import Fastify from 'fastify'
import cors from '@fastify/cors'
import { join, dirname } from 'path'
import { fileURLToPath } from 'url'
import { config } from './config.js'
import { chatRoutes } from './routes/chat.js'
import { settingsRoutes } from './routes/settings.js'
import { skillRoutes } from './routes/skills.js'
import { onboardingRoutes } from './routes/onboarding.js'
import { zoneRoutes } from './routes/zones.js'
import { messengerRoutes } from './routes/messenger.js'
import { statusRoutes } from './routes/status.js'
import { authRoutes } from './routes/auth.js'
import { oidcRoutes } from './routes/oidc.js'
import { workspaceRoutes } from './routes/workspaces.js'
import { emailTriggerRoutes } from './routes/email-trigger.js'
import { topicRoutes } from './routes/topics.js'
import { initSnapshotSchedule } from './utils/config-snapshot.js'

const fastify = Fastify({
  logger: config.nodeEnv === 'development',
})

await fastify.register(cors, {
  origin: process.env.NODE_ENV === 'production' ? true : ['http://localhost:5173', 'http://localhost:5174'],
  methods: ['GET', 'POST', 'DELETE'],
})

await fastify.register(chatRoutes)
await fastify.register(settingsRoutes)
await fastify.register(skillRoutes)
await fastify.register(onboardingRoutes)
await fastify.register(zoneRoutes)
await fastify.register(messengerRoutes)
await fastify.register(statusRoutes)
await fastify.register(authRoutes)
await fastify.register(oidcRoutes)
await fastify.register(workspaceRoutes)
await fastify.register(emailTriggerRoutes)
await fastify.register(topicRoutes)

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
  initSnapshotSchedule()
} catch (err) {
  fastify.log.error(err)
  process.exit(1)
}
