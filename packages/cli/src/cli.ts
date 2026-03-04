#!/usr/bin/env node
// Vela CLI – Terminal-Interface für Vela
// Verwendung:
//   vela chat               → Interaktiver Chat (Ollama lokal)
//   vela chat --provider claude  → Chat mit Claude
//   vela status             → Systemstatus
//   vela models             → Verfügbare Ollama-Modelle auflisten

import { createInterface } from 'readline'
import { parseArgs } from 'node:util'

const SERVER_URL = process.env.VELA_SERVER ?? 'http://localhost:3000'
const OLLAMA_URL = process.env.OLLAMA_BASE_URL ?? 'http://localhost:11434'

// ─── Farben ───────────────────────────────────────────────────────────────────
const c = {
  reset:  '\x1b[0m',
  bold:   '\x1b[1m',
  cyan:   '\x1b[36m',
  green:  '\x1b[32m',
  yellow: '\x1b[33m',
  red:    '\x1b[31m',
  gray:   '\x1b[90m',
  blue:   '\x1b[34m',
}

function print(text: string) { process.stdout.write(text) }
function println(text = '') { process.stdout.write(text + '\n') }

function printBanner() {
  println()
  println(`${c.cyan}${c.bold}  ██╗   ██╗███████╗██╗      █████╗ ${c.reset}`)
  println(`${c.cyan}${c.bold}  ██║   ██║██╔════╝██║     ██╔══██╗${c.reset}`)
  println(`${c.cyan}${c.bold}  ██║   ██║█████╗  ██║     ███████║${c.reset}`)
  println(`${c.cyan}${c.bold}  ╚██╗ ██╔╝██╔══╝  ██║     ██╔══██║${c.reset}`)
  println(`${c.cyan}${c.bold}   ╚████╔╝ ███████╗███████╗██║  ██║${c.reset}`)
  println(`${c.cyan}${c.bold}    ╚═══╝  ╚══════╝╚══════╝╚═╝  ╚═╝${c.reset}`)
  println()
  println(`  ${c.gray}AI Agent Platform – CLI${c.reset}`)
  println()
}

// ─── Server-Prüfung ───────────────────────────────────────────────────────────
async function checkServer(): Promise<boolean> {
  try {
    const res = await fetch(`${SERVER_URL}/api/health`, { signal: AbortSignal.timeout(3000) })
    return res.ok
  } catch {
    return false
  }
}

// ─── Ollama-Prüfung ───────────────────────────────────────────────────────────
async function checkOllama(): Promise<{ available: boolean; models: string[] }> {
  try {
    const res  = await fetch(`${OLLAMA_URL}/api/tags`, { signal: AbortSignal.timeout(3000) })
    const data = await res.json() as { models: Array<{ name: string }> }
    return { available: true, models: data.models.map(m => m.name) }
  } catch {
    return { available: false, models: [] }
  }
}

// ─── Status-Befehl ────────────────────────────────────────────────────────────
async function cmdStatus() {
  println(`${c.bold}System-Status${c.reset}`)
  println('─'.repeat(40))

  const serverOk = await checkServer()
  println(`  Vela Server:   ${serverOk ? c.green + '✓ Läuft' : c.red + '✗ Nicht erreichbar'} ${c.reset}(${SERVER_URL})`)

  const ollama = await checkOllama()
  println(`  Ollama:        ${ollama.available ? c.green + '✓ Läuft' : c.yellow + '⚠ Nicht erreichbar'} ${c.reset}`)

  if (ollama.available && ollama.models.length > 0) {
    println(`  Modelle:       ${ollama.models.join(', ')}`)
  }

  println()
}

// ─── Models-Befehl ────────────────────────────────────────────────────────────
async function cmdModels() {
  println(`${c.bold}Verfügbare Ollama-Modelle${c.reset}`)
  println('─'.repeat(40))
  const ollama = await checkOllama()
  if (!ollama.available) {
    println(`  ${c.yellow}⚠ Ollama nicht erreichbar. Starten mit: ollama serve${c.reset}`)
    return
  }
  if (ollama.models.length === 0) {
    println(`  ${c.gray}Keine Modelle installiert. Installieren mit: ollama pull llama3.1:8b${c.reset}`)
    return
  }
  for (const m of ollama.models) {
    println(`  ${c.green}•${c.reset} ${m}`)
  }
  println()
}

// ─── Chat-Befehl ─────────────────────────────────────────────────────────────
async function cmdChat(provider: string) {
  printBanner()

  const serverOk = await checkServer()
  if (!serverOk) {
    println(`${c.red}✗ Vela Server nicht erreichbar (${SERVER_URL})${c.reset}`)
    println(`${c.gray}  Starten mit: cd packages/server && pnpm dev${c.reset}`)
    process.exit(1)
  }

  println(`${c.gray}Provider: ${provider} · Tippe "exit" oder Ctrl+C zum Beenden${c.reset}`)
  println(`${c.gray}${'─'.repeat(50)}${c.reset}`)
  println()

  const history: Array<{ role: 'user' | 'assistant'; content: string }> = []

  const rl = createInterface({
    input:  process.stdin,
    output: process.stdout,
  })

  function prompt() {
    rl.question(`${c.cyan}Du${c.reset} › `, async (input) => {
      const trimmed = input.trim()
      if (!trimmed) { prompt(); return }
      if (trimmed.toLowerCase() === 'exit' || trimmed.toLowerCase() === 'quit') {
        println(`\n${c.gray}Tschüss!${c.reset}`)
        rl.close()
        return
      }

      history.push({ role: 'user', content: trimmed })

      print(`\n${c.blue}Vela${c.reset} › `)

      try {
        const res = await fetch(`${SERVER_URL}/api/chat`, {
          method:  'POST',
          headers: { 'Content-Type': 'application/json' },
          body:    JSON.stringify({ messages: history, provider }),
          signal:  AbortSignal.timeout(120_000),
        })

        if (!res.ok) {
          const err = await res.json() as { error?: string }
          println(`\n${c.red}Fehler: ${err.error ?? res.statusText}${c.reset}`)
          history.pop()
          prompt()
          return
        }

        const data = await res.json() as { text: string; skillUsed?: string }
        println(data.text)

        if (data.skillUsed) {
          println(`${c.gray}  [Skill: ${data.skillUsed}]${c.reset}`)
        }

        history.push({ role: 'assistant', content: data.text })
        println()
        prompt()
      } catch (err) {
        println(`\n${c.red}Verbindungsfehler: ${err}${c.reset}`)
        history.pop()
        prompt()
      }
    })
  }

  prompt()
}

// ─── Help ─────────────────────────────────────────────────────────────────────
function printHelp() {
  printBanner()
  println(`${c.bold}Verwendung${c.reset}`)
  println('─'.repeat(40))
  println(`  ${c.cyan}vela chat${c.reset}                    Interaktiver Chat (Ollama lokal)`)
  println(`  ${c.cyan}vela chat --provider claude${c.reset}   Chat mit Claude (API Key erforderlich)`)
  println(`  ${c.cyan}vela chat --provider openai${c.reset}   Chat mit GPT-4o`)
  println(`  ${c.cyan}vela chat --provider gemini${c.reset}   Chat mit Google Gemini`)
  println(`  ${c.cyan}vela status${c.reset}                  System- und Verbindungsstatus`)
  println(`  ${c.cyan}vela models${c.reset}                  Installierte Ollama-Modelle auflisten`)
  println()
  println(`${c.bold}Umgebungsvariablen${c.reset}`)
  println('─'.repeat(40))
  println(`  ${c.yellow}VELA_SERVER${c.reset}       Server-URL (Standard: http://localhost:3000)`)
  println(`  ${c.yellow}OLLAMA_BASE_URL${c.reset}   Ollama-URL (Standard: http://localhost:11434)`)
  println()
}

// ─── Main ─────────────────────────────────────────────────────────────────────
async function main() {
  const args = process.argv.slice(2)
  const cmd  = args[0]

  const { values } = parseArgs({
    args,
    options: {
      provider: { type: 'string', default: 'ollama' },
      model:    { type: 'string', default: 'llama3.1:8b' },
      help:     { type: 'boolean', short: 'h', default: false },
    },
    allowPositionals: true,
    strict: false,
  })

  if (values.help || !cmd || cmd === 'help') {
    printHelp()
    return
  }

  switch (cmd) {
    case 'chat':
      await cmdChat(values.provider as string)
      break
    case 'status':
      await cmdStatus()
      break
    case 'models':
      await cmdModels()
      break
    default:
      println(`${c.red}Unbekannter Befehl: ${cmd}${c.reset}`)
      printHelp()
      process.exit(1)
  }
}

main().catch(err => {
  console.error(err)
  process.exit(1)
})
