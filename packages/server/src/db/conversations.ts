// Conversations Repository – CRUD für Gespräche und Nachrichten
import { db } from './database.js'

export interface ConversationRow {
  id:          string
  created_at:  string
  updated_at:  string
  title:       string | null
  mode:        string
  trust_level: string
}

export interface MessageRow {
  id:              string
  conversation_id: string
  role:            'user' | 'assistant' | 'system'
  content:         string
  skill_used:      string | null
  provider:        string | null
  created_at:      string
}

// ── Conversations ─────────────────────────────────────────────────────────────
const insertConv = db.prepare<[string, string | null, string, string]>(`
  INSERT INTO conversations (id, title, mode, trust_level) VALUES (?, ?, ?, ?)
`)
const getConv = db.prepare<[string], ConversationRow>(`
  SELECT * FROM conversations WHERE id = ?
`)
const listConvs = db.prepare<[], ConversationRow>(`
  SELECT * FROM conversations ORDER BY updated_at DESC LIMIT 50
`)
const touchConv = db.prepare<[string]>(`
  UPDATE conversations SET updated_at = datetime('now') WHERE id = ?
`)

export function createConversation(
  id: string,
  opts: { title?: string; mode?: string; trustLevel?: string } = {}
): ConversationRow {
  insertConv.run(id, opts.title ?? null, opts.mode ?? 'local', opts.trustLevel ?? 'balanced')
  return getConv.get(id)!
}

export function getConversation(id: string): ConversationRow | undefined {
  return getConv.get(id)
}

export function listConversations(): ConversationRow[] {
  return listConvs.all()
}

// ── Messages ──────────────────────────────────────────────────────────────────
const insertMsg = db.prepare<[string, string, string, string, string | null, string | null]>(`
  INSERT INTO messages (id, conversation_id, role, content, skill_used, provider)
  VALUES (?, ?, ?, ?, ?, ?)
`)
const getMessages = db.prepare<[string], MessageRow>(`
  SELECT * FROM messages WHERE conversation_id = ? ORDER BY created_at ASC
`)

export function addMessage(
  id:             string,
  conversationId: string,
  role:           'user' | 'assistant' | 'system',
  content:        string,
  skillUsed?:     string,
  provider?:      string,
): MessageRow {
  // Auto-create conversation if not exists
  if (!getConv.get(conversationId)) {
    insertConv.run(conversationId, null, 'local', 'balanced')
  }
  insertMsg.run(id, conversationId, role, content, skillUsed ?? null, provider ?? null)
  touchConv.run(conversationId)
  return { id, conversation_id: conversationId, role, content, skill_used: skillUsed ?? null, provider: provider ?? null, created_at: new Date().toISOString() }
}

export function getConversationMessages(conversationId: string): MessageRow[] {
  return getMessages.all(conversationId)
}
