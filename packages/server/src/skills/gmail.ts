import type { Skill, SkillContext, SkillResult } from './types.js'

// Gmail OAuth skill - requires GOOGLE_CLIENT_ID + GOOGLE_CLIENT_SECRET + GOOGLE_REFRESH_TOKEN in .env

export const gmailSkill: Skill = {
  name: 'gmail',
  description: 'Liest und sendet E-Mails via Gmail',
  async execute(ctx: SkillContext): Promise<SkillResult> {
    const clientId = process.env.GOOGLE_CLIENT_ID
    const clientSecret = process.env.GOOGLE_CLIENT_SECRET
    const refreshToken = process.env.GOOGLE_REFRESH_TOKEN

    if (!clientId || !clientSecret || !refreshToken) {
      return {
        success: false,
        summary: 'Gmail nicht konfiguriert. Bitte Google OAuth in den Einstellungen einrichten.',
        error: 'missing_credentials'
      }
    }

    const action = (ctx.params?.action as string) ?? 'list'

    if (action === 'list') {
      // Get access token via refresh token
      const tokenRes = await fetch('https://oauth2.googleapis.com/token', {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: new URLSearchParams({
          client_id: clientId,
          client_secret: clientSecret,
          refresh_token: refreshToken,
          grant_type: 'refresh_token'
        })
      })
      const tokenData = await tokenRes.json() as { access_token?: string; error?: string }
      if (!tokenData.access_token) {
        return { success: false, summary: 'Gmail-Authentifizierung fehlgeschlagen', error: tokenData.error ?? undefined }
      }

      // Fetch emails
      const mailRes = await fetch(
        'https://gmail.googleapis.com/gmail/v1/users/me/messages?maxResults=5&q=is:unread',
        { headers: { Authorization: `Bearer ${tokenData.access_token}` } }
      )
      const mailData = await mailRes.json() as { messages?: Array<{ id: string }>; resultSizeEstimate?: number }

      const count = mailData.resultSizeEstimate ?? 0
      return {
        success: true,
        summary: `${count} ungelesene E-Mail(s) gefunden`,
        data: { messages: mailData.messages ?? [], count }
      }
    }

    if (action === 'send') {
      const to = ctx.params?.to as string
      const subject = ctx.params?.subject as string
      const body = ctx.params?.body as string

      if (!to || !subject || !body) {
        return { success: false, summary: 'Fehlende Parameter: to, subject, body' }
      }

      // Would implement send here
      return { success: true, summary: `E-Mail an ${to} würde gesendet (Demo-Modus)` }
    }

    return { success: false, summary: `Unbekannte Aktion: ${action}` }
  }
}
