// web-search Skill – Websuche via DuckDuckGo (kein API-Key)
import type { SkillManifest } from '../../packages/core/src/types/index.js'

export interface WebSearchInput {
  query:      string
  maxResults?: number
}

export interface WebSearchResult {
  title:   string
  url:     string
  snippet: string
}

export interface WebSearchOutput {
  success: boolean
  query:   string
  results: WebSearchResult[]
  summary: string
  error?:  string
}

// DuckDuckGo Instant Answer API (kostenlos, kein Key)
const DDG_API = 'https://api.duckduckgo.com/'

export async function execute(input: WebSearchInput): Promise<WebSearchOutput> {
  const { query, maxResults = 5 } = input

  try {
    const url    = `${DDG_API}?q=${encodeURIComponent(query)}&format=json&no_html=1&skip_disambig=1`
    const res    = await fetch(url, { signal: AbortSignal.timeout(8000) })
    const data   = await res.json() as {
      AbstractText?: string
      AbstractURL?:  string
      RelatedTopics?: Array<{ Text?: string; FirstURL?: string; Result?: string }>
    }

    const results: WebSearchResult[] = []

    // Haupt-Antwort
    if (data.AbstractText) {
      results.push({
        title:   query,
        url:     data.AbstractURL ?? '',
        snippet: data.AbstractText,
      })
    }

    // Verwandte Themen
    for (const topic of (data.RelatedTopics ?? []).slice(0, maxResults - results.length)) {
      if (topic.Text && topic.FirstURL) {
        results.push({
          title:   topic.Text.split(' - ')[0] ?? topic.Text,
          url:     topic.FirstURL,
          snippet: topic.Text,
        })
      }
    }

    const summary = results.length > 0
      ? results.map(r => r.snippet).join('\n\n')
      : 'Keine direkte Antwort gefunden'

    return { success: true, query, results, summary }
  } catch (err) {
    return {
      success: false,
      query,
      results: [],
      summary: 'Suche fehlgeschlagen',
      error:   String(err),
    }
  }
}

export const manifest: Partial<SkillManifest> = {
  name:        'web-search',
  version:     '1.0.0',
  description: 'Websuche via DuckDuckGo (kein API-Key erforderlich)',
}
