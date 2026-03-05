import { permissionManager } from '@vela/core'
import { SQLitePermissionStore } from './db/permission_store.js'
import { conversationRoutes } from './routes/conversations.js'
import Fastify from 'fastify'
import cors from '@fastify/cors'
import { join, dirname } from 'path'
import { fileURLToPath } from 'url'
import { config } from './config.js'
import { chatRoutes } from './routes/chat.js'
import { settingsRoutes } from './routes/settings.js'
import { skillRoutes } from './routes/skills.js'
import { feedbackRoutes } from './routes/feedback.js'
import { expertRoutes } from './routes/expert.js'
import { templateRoutes } from './routes/templates.js'
import { schedulerRoutes } from './routes/scheduler.js'
import { documentRoutes } from './routes/documents.js'
import { workflowRoutes } from './routes/workflows.js'
import { memoryRoutes } from './routes/memory.js'
import { preferencesRoutes } from './routes/preferences.js'
import { ttsRoutes } from './routes/tts.js'
import { authRoutes } from './routes/auth.js'
import { subAgentRoutes } from './routes/subagents.js'
import { channelRoutes } from './routes/channels.js'
import { oidcRoutes } from './routes/oidc.js'
import { workspaceRoutes } from './routes/workspaces.js'
import { emailTriggerRoutes } from './routes/email-trigger.js'

import { marketplaceRoutes } from './routes/marketplace.js'
import { oauthRoutes } from './routes/oauth.js'
import { onboardingRoutes } from './routes/onboarding.js'

// Permission-Persistenz: SQLite-Store VOR allem anderen initialisieren
// Lädt bereits erteilte Grants aus der Datenbank – Nutzer muss nicht neu bestätigen
permissionManager.setStore(new SQLitePermissionStore())

const fastify = Fastify({
  logger: config.nodeEnv === 'development',
})

await fastify.register(cors, {
  origin: true,
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
})

await fastify.register(chatRoutes)
await fastify.register(conversationRoutes)
await fastify.register(settingsRoutes)
await fastify.register(skillRoutes)
await fastify.register(onboardingRoutes)
await fastify.register(oauthRoutes)
await fastify.register(marketplaceRoutes)
await fastify.register(feedbackRoutes)
  await fastify.register(expertRoutes)
  await fastify.register(templateRoutes)
  await fastify.register(schedulerRoutes)
  await fastify.register(documentRoutes)
  await fastify.register(workflowRoutes)
  await fastify.register(memoryRoutes)
  await fastify.register(preferencesRoutes)
  await fastify.register(ttsRoutes)
  await fastify.register(authRoutes)
  await fastify.register(subAgentRoutes)
  await fastify.register(channelRoutes)
  await fastify.register(oidcRoutes)
  await fastify.register(workspaceRoutes)
  await fastify.register(emailTriggerRoutes)


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
