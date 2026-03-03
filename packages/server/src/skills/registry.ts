import type { Skill } from './types.js'
import { webSearchSkill } from './web-search.js'
import { gmailSkill } from './gmail.js'

const skills = new Map<string, Skill>()

skills.set(webSearchSkill.name, webSearchSkill)
skills.set(gmailSkill.name, gmailSkill)

export function getSkill(name: string): Skill | undefined {
  return skills.get(name)
}

export function listSkills(): Skill[] {
  return Array.from(skills.values())
}
