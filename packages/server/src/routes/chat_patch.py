import re

with open('chat.ts', 'r') as f:
    content = f.read()

# Add groq import after anthropic import
content = content.replace(
    "import Anthropic from '@anthropic-ai/sdk'\n",
    "import Anthropic from '@anthropic-ai/sdk'\nimport { chatGroq } from '../ai/groq.js'\n"
)

# Replace the response generation block
old_block = """    const response = await client.messages.create({
      model: process.env.DEFAULT_MODEL ?? 'claude-haiku-4-5-20251001',
      max_tokens: 1024,
      system: activeSystemPrompt,
      messages: body.messages,
    })

    const text = response.content
      .filter((b) => b.type === 'text')
      .map((b) => (b as { type: 'text'; text: string }).text)
      .join('')"""

new_block = """    const activeBackend = process.env.VELA_BACKEND ?? 'anthropic'
    let text: string

    if (activeBackend === 'groq') {
      text = await chatGroq(body.messages, activeSystemPrompt)
    } else {
      const response = await client.messages.create({
        model: process.env.DEFAULT_MODEL ?? 'claude-haiku-4-5-20251001',
        max_tokens: 1024,
        system: activeSystemPrompt,
        messages: body.messages,
      })
      text = response.content
        .filter((b) => b.type === 'text')
        .map((b) => (b as { type: 'text'; text: string }).text)
        .join('')
    }"""

content = content.replace(old_block, new_block)

with open('chat.ts', 'w') as f:
    f.write(content)

print("Done")
