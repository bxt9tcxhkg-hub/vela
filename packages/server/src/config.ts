import 'dotenv/config'

export const config = {
  port: parseInt(process.env.PORT ?? '3000', 10),
  host: process.env.HOST ?? '127.0.0.1',
  anthropicApiKey: process.env.ANTHROPIC_API_KEY ?? '',
  openaiApiKey: process.env.OPENAI_API_KEY ?? '',
  defaultModel: process.env.DEFAULT_MODEL ?? 'claude-haiku-4-5-20251001',
  nodeEnv: process.env.NODE_ENV ?? 'development',
} as const
