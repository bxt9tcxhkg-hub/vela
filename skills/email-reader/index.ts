// email-reader Skill – E-Mails lesen via Gmail OAuth
// Benötigt: GOOGLE_CLIENT_ID, GOOGLE_CLIENT_SECRET, GOOGLE_REFRESH_TOKEN

export interface EmailReaderInput {
  maxResults?: number
  onlyUnread?: boolean
  query?:      string    // Gmail-Suchsyntax, z.B. "from:boss@example.com"
}

export interface EmailSummary {
  id:      string
  from:    string
  subject: string
  date:    string
  snippet: string
}

export interface EmailReaderOutput {
  success: boolean
  emails:  EmailSummary[]
  count:   number
  error?:  string
}

async function getAccessToken(): Promise<string> {
  const res = await fetch('https://oauth2.googleapis.com/token', {
    method:  'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body:    new URLSearchParams({
      client_id:     process.env.GOOGLE_CLIENT_ID     ?? '',
      client_secret: process.env.GOOGLE_CLIENT_SECRET ?? '',
      refresh_token: process.env.GOOGLE_REFRESH_TOKEN ?? '',
      grant_type:    'refresh_token',
    }),
  })
  const data = await res.json() as { access_token?: string; error?: string }
  if (!data.access_token) throw new Error(`OAuth fehlgeschlagen: ${data.error}`)
  return data.access_token
}

async function getMessageDetail(id: string, token: string): Promise<EmailSummary> {
  const res  = await fetch(
    `https://gmail.googleapis.com/gmail/v1/users/me/messages/${id}?format=metadata&metadataHeaders=From&metadataHeaders=Subject&metadataHeaders=Date`,
    { headers: { Authorization: `Bearer ${token}` } },
  )
  const msg  = await res.json() as {
    id: string
    snippet: string
    payload: { headers: Array<{ name: string; value: string }> }
  }

  const headers = msg.payload?.headers ?? []
  const get     = (name: string) => headers.find(h => h.name === name)?.value ?? ''

  return {
    id:      msg.id,
    from:    get('From'),
    subject: get('Subject'),
    date:    get('Date'),
    snippet: msg.snippet ?? '',
  }
}

export async function execute(input: EmailReaderInput = {}): Promise<EmailReaderOutput> {
  const creds = [
    process.env.GOOGLE_CLIENT_ID,
    process.env.GOOGLE_CLIENT_SECRET,
    process.env.GOOGLE_REFRESH_TOKEN,
  ]
  if (creds.some(c => !c)) {
    return {
      success: false,
      emails:  [],
      count:   0,
      error:   'Gmail nicht konfiguriert. Bitte OAuth-Credentials in den Einstellungen hinterlegen.',
    }
  }

  try {
    const token      = await getAccessToken()
    const maxResults = input.maxResults ?? 10
    const q          = [
      input.onlyUnread !== false ? 'is:unread' : '',
      input.query ?? '',
    ].filter(Boolean).join(' ')

    const listRes  = await fetch(
      `https://gmail.googleapis.com/gmail/v1/users/me/messages?maxResults=${maxResults}&q=${encodeURIComponent(q)}`,
      { headers: { Authorization: `Bearer ${token}` } },
    )
    const listData = await listRes.json() as { messages?: Array<{ id: string }>; resultSizeEstimate?: number }
    const messages = listData.messages ?? []

    const emails = await Promise.all(
      messages.slice(0, 10).map(m => getMessageDetail(m.id, token))
    )

    return { success: true, emails, count: listData.resultSizeEstimate ?? emails.length }
  } catch (err) {
    return { success: false, emails: [], count: 0, error: String(err) }
  }
}
