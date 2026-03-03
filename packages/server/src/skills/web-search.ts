import type { Skill, SkillContext, SkillResult } from './types.js'

interface DuckDuckGoResponse {
  AbstractText?: string
  Answer?: string
  RelatedTopics?: Array<{ Text?: string } | { Topics: Array<{ Text: string }> }>
}

export const webSearchSkill: Skill = {
  name: 'web-search',
  description: 'Sucht im Web nach aktuellen Informationen',
  async execute(ctx: SkillContext): Promise<SkillResult> {
    const query = ctx.query ?? ''
    if (!query) return { success: false, summary: 'Kein Suchbegriff angegeben' }

    const url = `https://api.duckduckgo.com/?q=${encodeURIComponent(query)}&format=json&no_html=1&skip_disambig=1`
    const res = await fetch(url)
    const data = await res.json() as DuckDuckGoResponse

    const summary = data.AbstractText || data.Answer || 'Keine direkte Antwort gefunden'
    const related = data.RelatedTopics?.slice(0, 3).map(t => 'Text' in t ? t.Text : '').filter(Boolean) ?? []

    return {
      success: true,
      summary: summary + (related.length ? '\n\nVerwandte Themen:\n' + related.join('\n') : ''),
      data: { abstract: data.AbstractText, answer: data.Answer, related }
    }
  }
}
