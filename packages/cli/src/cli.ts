#!/usr/bin/env node

import { Command } from 'commander'
import { spawn } from 'child_process'
import { createInterface } from 'readline'
import { join, dirname } from 'path'
import { fileURLToPath } from 'url'

const __dirname = dirname(fileURLToPath(import.meta.url))
const program = new Command()

program
  .name('vela')
  .description('Vela AI Agent – command line interface')
  .version('0.1.0')

// ─── start ───────────────────────────────────────────────
program
  .command('start')
  .description('Start the Vela agent server')
  .option('-p, --port <port>', 'Port to listen on', '3000')
  .option('--model <model>', 'Default AI model to use')
  .option('--backend <backend>', 'AI backend: anthropic | groq | local', 'anthropic')
  .action((options: { port: string; model?: string; backend?: string }) => {
    const env: NodeJS.ProcessEnv = {
      ...process.env,
      PORT: options.port,
      VELA_BACKEND: options.backend ?? 'anthropic',
    }
    if (options.model) env.DEFAULT_MODEL = options.model

    const serverPath = join(__dirname, '../../server/dist/index.js')
    const child = spawn('node', [serverPath], { env, stdio: 'inherit' })

    child.on('error', (err) => {
      console.error(`✗ Server konnte nicht gestartet werden: ${err.message}`)
      console.error('  Stelle sicher, dass "pnpm build" ausgeführt wurde.')
    })

    process.on('SIGINT',  () => { child.kill('SIGINT');  process.exit(0) })
    process.on('SIGTERM', () => { child.kill('SIGTERM'); process.exit(0) })
  })

// ─── chat ────────────────────────────────────────────────
program
  .command('chat')
  .description('Start an interactive chat session (requires server running)')
  .option('--server <url>', 'Server URL', 'http://localhost:3000')
  .action(async (options: { server: string }) => {
    const baseUrl = options.server

    // Health check
    try {
      const res = await fetch(`${baseUrl}/api/health`)
      if (!res.ok) throw new Error()
      const data = await res.json() as { backend: string }
      console.log(`\n✦ Vela Chat — Backend: ${data.backend}`)
      console.log('  Schreib deine Nachricht. "exit" zum Beenden.\n')
    } catch {
      console.error(`✗ Server nicht erreichbar: ${baseUrl}`)
      console.error('  Starte den Server mit: vela start')
      process.exit(1)
    }

    const rl = createInterface({ input: process.stdin, output: process.stdout })
    const history: Array<{ role: 'user' | 'assistant'; content: string }> = []

    const ask = () => {
      rl.question('Du: ', async (input) => {
        const msg = input.trim()
        if (!msg) { ask(); return }
        if (msg.toLowerCase() === 'exit') { console.log('\nBis bald!'); rl.close(); return }

        history.push({ role: 'user', content: msg })

        try {
          const res = await fetch(`${baseUrl}/api/chat`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ messages: history }),
          })
          const data = await res.json() as { text?: string; error?: string }

          if (data.error) {
            console.error(`\nFehler: ${data.error}\n`)
          } else {
            const reply = data.text ?? ''
            history.push({ role: 'assistant', content: reply })
            console.log(`\nVela: ${reply}\n`)
          }
        } catch {
          console.error('\nVerbindungsfehler — ist der Server noch aktiv?\n')
        }

        ask()
      })
    }

    ask()
  })

// ─── onboard ─────────────────────────────────────────────
program
  .command('onboard')
  .description('Run the Vela onboarding (requires server running)')
  .option('--server <url>', 'Server URL', 'http://localhost:3000')
  .action(async (options: { server: string }) => {
    const baseUrl = options.server

    try {
      const hwRes = await fetch(`${baseUrl}/api/onboarding/hardware`)
      const hw = await hwRes.json() as { ram_gb: number; has_gpu: boolean; recommended_backend: string }
      console.log(`\n✦ Hardware erkannt: ${hw.ram_gb}GB RAM | GPU: ${hw.has_gpu} | Empfehlung: ${hw.recommended_backend}`)
      console.log(`  Onboarding UI: ${baseUrl}\n`)
    } catch {
      console.error(`✗ Server nicht erreichbar: ${baseUrl}`)
    }
  })

// ─── skill ───────────────────────────────────────────────
program
  .command('skill')
  .description('Manage skills')

program
  .command('skill list')
  .description('List installed skills')
  .option('--server <url>', 'Server URL', 'http://localhost:3000')
  .action(async (options: { server: string }) => {
    try {
      const res = await fetch(`${options.server}/api/skills`)
      const data = await res.json() as { skills?: Array<{ name: string; description: string }> }
      if (!data.skills?.length) {
        console.log('Keine Skills installiert.')
        return
      }
      console.log('\nInstallierte Skills:')
      for (const skill of data.skills) {
        console.log(`  • ${skill.name} — ${skill.description}`)
      }
    } catch {
      console.error('Skills konnten nicht geladen werden.')
    }
  })

// ─── status ──────────────────────────────────────────────
program
  .command('status')
  .description('Show server and system status')
  .option('--server <url>', 'Server URL', 'http://localhost:3000')
  .action(async (options: { server: string }) => {
    try {
      const res  = await fetch(`${options.server}/api/status`)
      const data = await res.json() as {
        ok: boolean; backend: string;
        disk: { freeGb: number; usedPercent: number };
        ram:  { freeGb: number; usedPercent: number };
        alerts: string[]
      }
      console.log(`\n✦ Vela Status`)
      console.log(`  Backend:  ${data.backend}`)
      console.log(`  Disk:     ${data.disk.freeGb}GB frei (${data.disk.usedPercent}% voll)`)
      console.log(`  RAM:      ${data.ram.freeGb}GB frei (${data.ram.usedPercent}% belegt)`)
      if (data.alerts.length) {
        console.log(`\n  ⚠ Warnungen:`)
        for (const a of data.alerts) console.log(`    ${a}`)
      } else {
        console.log(`  Alles OK ✓`)
      }
    } catch {
      console.error('Server nicht erreichbar.')
    }
  })

program.parse()
