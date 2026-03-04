#!/usr/bin/env node

import { Command } from 'commander'

const program = new Command()

program
  .name('vela')
  .description('Vela AI Agent – command line interface')
  .version('0.1.0')

program
  .command('start')
  .description('Start the Vela agent server')
  .option('-p, --port <port>', 'Port to listen on', '3000')
  .option('--model <model>', 'Default AI model to use')
  .option('--backend <backend>', 'AI backend to use: anthropic | groq | cloud', 'anthropic')
  .action((options: { port: string; model?: string; backend?: string }) => {
    if (options.backend) {
      process.env.VELA_BACKEND = options.backend
    }
    console.log(`Starting Vela on port ${options.port} (backend: ${options.backend ?? 'anthropic'})...`)
    // TODO: start agent server
  })

program
  .command('chat')
  .description('Start an interactive chat session')
  .option('--backend <backend>', 'AI backend to use: anthropic | groq | cloud', 'anthropic')
  .action((options: { backend?: string }) => {
    if (options.backend) {
      process.env.VELA_BACKEND = options.backend
    }
    console.log(`Starting interactive chat (backend: ${options.backend ?? 'anthropic'})...`)
    // TODO: interactive chat loop
  })

program
  .command('onboard')
  .description('Run the Vela onboarding assistant')
  .action(() => {
    console.log('Starting onboarding...')
    const base = 'http://localhost:3000'
    console.log(`Hardware check: GET ${base}/api/onboarding/hardware`)
    console.log(`Onboarding chat: POST ${base}/api/onboarding/chat`)
  })

program
  .command('skill')
  .description('Manage skills')
  .command('list')
  .action(() => {
    console.log('Installed skills:')
    // TODO: list skills
  })

program.parse()
