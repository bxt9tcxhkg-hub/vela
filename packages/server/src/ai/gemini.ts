// Gemini Provider – Google Generative AI
import { GoogleGenerativeAI } from '@google/generative-ai'

export interface GeminiMessage {
  role: 'user' | 'assistant'
  content: string
}

export async function chatGemini(
  messages: GeminiMessage[],
  apiKey: string,
  model = 'gemini-1.5-flash',
  systemPrompt?: string,
): Promise<string> {
  const genAI = new GoogleGenerativeAI(apiKey)
  const modelParams = systemPrompt
    ? { model, systemInstruction: systemPrompt }
    : { model }
  const gModel = genAI.getGenerativeModel(modelParams)

  // Gemini braucht alternierend user/model Rollen
  // Letztes user-Message separat als aktuelle Anfrage
  const history = messages.slice(0, -1).map(m => ({
    role:  m.role === 'assistant' ? 'model' : 'user',
    parts: [{ text: m.content }],
  }))

  const lastMsg = messages[messages.length - 1]?.content ?? ''

  const chat  = gModel.startChat({ history })
  const res   = await chat.sendMessage(lastMsg)
  return res.response.text()
}
