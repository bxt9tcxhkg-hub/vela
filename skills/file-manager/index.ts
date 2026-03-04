// file-manager Skill – Dateizugriff in erlaubten Verzeichnissen
import { readdir, readFile, writeFile, stat } from 'node:fs/promises'
import { join, resolve, homedir } from 'node:path'

const ALLOWED_BASES = [
  resolve(homedir(), 'Documents'),
  resolve(homedir(), 'Desktop'),
  resolve(homedir(), 'Downloads'),
]

function isAllowedPath(p: string): boolean {
  const resolved = resolve(p.replace('~', homedir()))
  return ALLOWED_BASES.some(base => resolved.startsWith(base))
}

export type FileAction = 'list' | 'read' | 'write' | 'search'

export interface FileInput {
  action:   FileAction
  path:     string
  content?: string
  query?:   string
}

export interface FileOutput {
  success: boolean
  action:  FileAction
  path:    string
  result?: string | string[]
  error?:  string
}

export async function execute(input: FileInput): Promise<FileOutput> {
  const p = input.path.replace('~', homedir())

  if (!isAllowedPath(p)) {
    return {
      success: false,
      action:  input.action,
      path:    input.path,
      error:   `Zugriff verweigert. Erlaubte Verzeichnisse: Dokumente, Desktop, Downloads`,
    }
  }

  try {
    switch (input.action) {
      case 'list': {
        const entries = await readdir(p, { withFileTypes: true })
        const names   = entries.map(e => (e.isDirectory() ? `📁 ${e.name}/` : `📄 ${e.name}`))
        return { success: true, action: 'list', path: p, result: names }
      }
      case 'read': {
        const text = await readFile(p, 'utf-8')
        return { success: true, action: 'read', path: p, result: text }
      }
      case 'write': {
        if (!input.content) throw new Error('Kein Inhalt zum Schreiben angegeben')
        await writeFile(p, input.content, 'utf-8')
        return { success: true, action: 'write', path: p, result: `Gespeichert: ${p}` }
      }
      case 'search': {
        if (!input.query) throw new Error('Kein Suchbegriff angegeben')
        const entries = await readdir(p)
        const matches = entries.filter(e => e.toLowerCase().includes(input.query!.toLowerCase()))
        return { success: true, action: 'search', path: p, result: matches }
      }
    }
  } catch (err) {
    return { success: false, action: input.action, path: p, error: String(err) }
  }
}
