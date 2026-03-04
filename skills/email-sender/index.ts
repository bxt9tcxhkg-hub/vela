// email-sender Skill – E-Mails senden via Gmail OAuth
// Benötigt: GOOGLE_CLIENT_ID, GOOGLE_CLIENT_SECRET, GOOGLE_REFRESH_TOKEN

export interface EmailSenderInput {
  to:       string
  subject:  string
  body:     string
  cc?:      string
  bcc?:     string
}

export interface EmailSenderOutput {
  success:   boolean
  messageId?: string
  error?:    string
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

function buildRawEmail(input: EmailSenderInput): string {
  const lines = [
    `To: ${input.to}`,
    `Subject: ${input.subject}`,
    `Content-Type: text/plain; charset=utf-8`,
    `MIME-Version: 1.0`,
  ]
  if (input.cc)  lines.push(`Cc: ${input.cc}`)
  if (input.bcc) lines.push(`Bcc: ${input.bcc}`)
  lines.push('', input.body)

  return Buffer.from(lines.join('\r\n'))
    .toString('base64')
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=+$/, '')
}

export async function execute(input: EmailSenderInput): Promise<EmailSenderOutput> {
  if (!input.to || !input.subject || !input.body) {
    return { success: false, error: 'Empfänger, Betreff und Inhalt sind erforderlich.' }
  }

  const creds = [
    process.env.GOOGLE_CLIENT_ID,
    process.env.GOOGLE_CLIENT_SECRET,
    process.env.GOOGLE_REFRESH_TOKEN,
  ]
  if (creds.some(c => !c)) {
    return { success: false, error: 'Gmail nicht konfiguriert. Bitte OAuth-Credentials in den Einstellungen hinterlegen.' }
  }

  try {
    const token   = await getAccessToken()
    const raw     = buildRawEmail(input)
    const sendRes = await fetch(
      'https://gmail.googleapis.com/gmail/v1/users/me/messages/send',
      {
        method:  'POST',
        headers: {
          Authorization:  `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ raw }),
      },
    )
    const data = await sendRes.json() as { id?: string; error?: { message: string } }
    if (!sendRes.ok) {
      return { success: false, error: data.error?.message ?? 'Unbekannter Fehler' }
    }
    return { success: true, messageId: data.id }
  } catch (err) {
    return { success: false, error: String(err) }
  }
}
