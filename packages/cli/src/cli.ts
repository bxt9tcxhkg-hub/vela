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
  .action((options: { port: string; model?: string }) => {
    console.log(`Starting Vela on port ${options.port}...`)
    // TODO: start agent server
  })

program
  .command('chat')
  .description('Start an interactive chat session')
  .action(() => {
    console.log('Starting interactive chat...')
    // TODO: interactive chat loop
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
