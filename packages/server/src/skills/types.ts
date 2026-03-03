export interface SkillContext {
  query?: string | undefined
  params?: Record<string, unknown> | undefined
}

export interface SkillResult {
  success: boolean
  data?: unknown
  summary: string
  error?: string
}

export interface Skill {
  name: string
  description: string
  execute(ctx: SkillContext): Promise<SkillResult>
}
