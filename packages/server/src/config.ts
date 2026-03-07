import 'dotenv/config'

export const config = {
  port: parseInt(process.env.PORT ?? '3000', 10),
  host: process.env.HOST ?? '127.0.0.1',
  anthropicApiKey: process.env.ANTHROPIC_API_KEY ?? '',
  openaiApiKey: process.env.OPENAI_API_KEY ?? '',
  defaultModel: process.env.DEFAULT_MODEL ?? 'claude-haiku-4-5-20251001',
  nodeEnv: process.env.NODE_ENV ?? 'development',
  groqApiKey: process.env.GROQ_API_KEY ?? '',
  velaBackend: process.env.VELA_BACKEND ?? 'local',
  geminiApiKey: process.env.GEMINI_API_KEY ?? '',
  openaiBaseUrl: process.env.VELA_OPENAI_BASE_URL ?? 'https://api.openai.com/v1',
  prefLevel: process.env.VELA_PREF_LEVEL ?? 'laie',
  prefLanguage: process.env.VELA_PREF_LANGUAGE ?? 'Deutsch',
  prefTone: process.env.VELA_PREF_TONE ?? 'einfach',
  prefPurpose: process.env.VELA_PREF_PURPOSE ?? 'alltag',
  prefName: process.env.VELA_PREF_NAME ?? '',
} as const
