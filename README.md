<div align="center">

<!-- LOGO PLACEHOLDER: Replace with actual logo -->
<img src="docs/assets/vela-logo.png" alt="Vela Logo" width="120" height="120" />

# Vela

**Your personal AI agent. Private by design. Powerful by choice.**

[![License: Apache 2.0](https://img.shields.io/badge/License-Apache_2.0-blue.svg)](LICENSE)
[![Build](https://img.shields.io/github/actions/workflow/status/msoyucok/vela/ci.yml?branch=main&label=build)](https://github.com/msoyucok/vela/actions)
[![Version](https://img.shields.io/github/v/release/msoyucok/vela?label=version)](https://github.com/msoyucok/vela/releases)
[![Roadmap: Phase 1 Active](https://img.shields.io/badge/Roadmap-Phase%201%20Active-green)](https://github.com/msoyucok/vela/projects)
[![PRs Welcome](https://img.shields.io/badge/PRs-welcome-brightgreen.svg)](CONTRIBUTING.md)

</div>

---

## What is Vela?

Vela is an open-source, self-hosted personal AI agent that works for both everyday users and developers.

It runs on your machine. Your data never leaves unless you say so. It supports Claude, GPT-4o, Gemini, and local models via Ollama — all from one interface.

For non-technical users, Vela is a friendly chat interface that handles real tasks (searching the web, managing files, drafting emails) with human-in-the-loop confirmation for anything sensitive.

For developers and power users, Vela is a fully programmable agent runtime with a custom skill system, live audit logs, model switching, and a CLI — all sandboxed and auditable.

---

## Features

### Simple Mode — For Everyone
- **Natural language interface** — just type what you need
- **Safe by default** — Vela asks before doing anything sensitive
- **Curated skills** — web search, file management, calendar, email, and more
- **Transparent** — see exactly what Vela did, always
- **One-click install** — download the desktop app, done

### Expert Mode — For Power Users & Developers
- **Custom skills** — write your own in TypeScript, define in YAML
- **Model selector** — switch between Claude, GPT-4o, Gemini, or local models on the fly
- **Live audit log** — every action logged, timestamped, and verifiable
- **CLI interface** — run Vela headlessly, script it, integrate it
- **Docker deployment** — multi-user, server-side, PostgreSQL-backed
- **Full reasoning trace** — see what Vela planned before it acted

### Security Architecture
- **Sandboxed skill execution** — skills run in isolated V8 contexts with no access to the host system beyond declared permissions
- **Prompt injection defense** — pattern matching + LLM-based secondary check, built into the core
- **Guardrail engine** — policy-based action approval that cannot be bypassed by prompts
- **Immutable audit log** — append-only, HMAC-chained, tamper-evident

---

## Quick Start

### Option 1: Desktop App (Recommended for most users)

1. Download the installer for your platform from [Releases](https://github.com/msoyucok/vela/releases)
   - **Windows**: `Vela-Setup-x.y.z.exe`
   - **macOS**: `Vela-x.y.z.dmg`
   - **Linux**: `Vela-x.y.z.AppImage` or `.deb`

2. Run the installer and launch Vela

3. Add your AI provider API key (or configure Ollama for local-only mode)

4. Start chatting

No Docker, no terminal, no configuration required.

---

### Option 2: Docker (Pro / Self-Hosted Server)

```bash
# Clone the repository
git clone https://github.com/msoyucok/vela.git
cd vela

# Copy the example environment file
cp docker/.env.example docker/.env

# Edit docker/.env to add your AI provider keys
nano docker/.env

# Start the stack
docker compose -f docker/docker-compose.yml up -d

# Vela is now available at http://localhost:3000
```

**Requirements:** Docker 24+, Docker Compose v2

---

### Option 3: Development Setup

```bash
# Prerequisites: Node.js 20+, pnpm 9+
git clone https://github.com/msoyucok/vela.git
cd vela

# Install dependencies
pnpm install

# Start all packages in development mode
pnpm dev

# Or start individual packages
pnpm --filter @vela/core dev
pnpm --filter @vela/ui dev
pnpm --filter @vela/desktop dev
```

See [CONTRIBUTING.md](CONTRIBUTING.md) for full development setup instructions.

---

## Supported AI Providers

| Provider | Models | Local / Cloud |
|---|---|---|
| Anthropic | Claude 3.5 Sonnet, Claude 3 Haiku | Cloud |
| OpenAI | GPT-4o, GPT-4o-mini | Cloud |
| Google | Gemini 1.5 Pro, Gemini 1.5 Flash | Cloud |
| Ollama | Llama 3, Mistral, Phi-3, and more | **Local (no API key)** |

Mix and match — use local models for sensitive tasks, cloud models for heavy lifting.

---

## Skill System

Skills are the building blocks of Vela. Each skill is defined by a YAML manifest and implemented in TypeScript.

```yaml
# skills/web-search/skill.yaml
name: web-search
version: 1.0.0
description: Search the web and return summarized results
permissions:
  - network:read
inputs:
  - name: query
    type: string
    required: true
```

**Official skills** (security-reviewed, included by default):
- `web-search` — Search and summarize web results
- `file-manager` — Read, write, organize files (with confirmation)
- `calendar` — Read and create calendar events
- `email-reader` — Read and draft emails (send requires confirmation)
- `code-runner` — Execute code snippets in an isolated sandbox

Install community skills or write your own — see the [Skill Authoring Guide](skills/README.md).

---

## Roadmap

### Phase 1 — Foundation 🟢 Active
- [x] Project structure & monorepo setup
- [ ] Core agent engine (planner, memory, router)
- [ ] AI provider adapter (Claude, OpenAI, Gemini, Ollama)
- [ ] Guardrail engine + sandbox
- [ ] Web UI (Simple Mode + Expert Mode)
- [ ] Electron desktop app (Windows, macOS, Linux)
- [ ] Official skill library (5 core skills)
- [ ] Audit log (SQLite)
- [ ] CLI interface

### Phase 2 — Growth 🔵 Planned
- [ ] Skill marketplace (browse, install, rate)
- [ ] OAuth2 / multi-user support
- [ ] Docker Pro mode with PostgreSQL
- [ ] Skill authoring UI (no-code YAML editor)
- [ ] Mobile companion app (iOS / Android)
- [ ] Automated skill security scanning

### Phase 3 — Enterprise 🔵 Planned
- [ ] RBAC & team workspaces
- [ ] SSO / SAML
- [ ] SIEM export for audit logs
- [ ] SOC 2 alignment documentation
- [ ] White-label deployments

---

## Architecture

Vela is built as a TypeScript monorepo with clear separation between the agent engine, UI, desktop shell, and CLI.

```
vela/
├── packages/core/      # Agent Engine, Guardrails, Skill Runtime, AI Providers
├── packages/ui/        # React Web Dashboard
├── packages/desktop/   # Electron Desktop App
├── packages/cli/       # Command-Line Interface
└── skills/             # Official Skill Library
```

See [docs/architecture.md](docs/architecture.md) for full component diagrams and security architecture documentation.

---

## Contributing

Contributions are welcome. Vela is built in the open and grows with its community.

- **Bug reports** → [Open an issue](https://github.com/msoyucok/vela/issues/new?template=bug_report.md)
- **Feature requests** → [Open an issue](https://github.com/msoyucok/vela/issues/new?template=feature_request.md)
- **Submit a skill** → [Skill submission template](https://github.com/msoyucok/vela/issues/new?template=skill_submission.md)
- **Code contributions** → Read [CONTRIBUTING.md](CONTRIBUTING.md) first

### Development Philosophy
- Security is not optional — every PR touching the agent engine or skill runtime requires a guardrail review
- No feature ships without tests
- Breaking changes require a migration path

---

## Security

Found a vulnerability? Please do **not** open a public issue.

Report security vulnerabilities via [SECURITY.md](SECURITY.md) or email the maintainers directly.

---

## License

The Vela core (packages/core, packages/ui, packages/desktop, packages/cli, skills/) is licensed under the **Apache 2.0 License** — see [LICENSE](LICENSE).

Premium features (`packages/pro`) are proprietary and available under a separate commercial license.

---

<div align="center">

Built with care by [@msoyucok](https://github.com/msoyucok) and contributors.

**[Website](https://github.com/msoyucok/vela)** · **[Docs](docs/)** · **[Releases](https://github.com/msoyucok/vela/releases)** · **[Discord](https://discord.gg/vela)**

</div>
