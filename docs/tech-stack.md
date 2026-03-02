# Vela – Tech Stack

> Recommended stack for a 2-person team building a self-hosted, cross-platform AI agent platform with a clear open-source/proprietary split.

---

## Overview Table

| Layer | Choice | Alternatives Rejected |
|---|---|---|
| Frontend | React + TypeScript + Vite + Tailwind | Vue, Svelte, Angular |
| Backend / Agent Engine | Node.js + TypeScript + Fastify | Python/FastAPI, Bun, Deno |
| Database | SQLite → PostgreSQL (optional) | MySQL, MongoDB, PocketBase |
| AI Layer | Custom provider adapter | LangChain, LlamaIndex |
| Skill Definition | YAML + JS/TS execution | Python scripts, JSON-only |
| Desktop App | Electron | Tauri, NW.js |
| Auth | Local auth first → OAuth2 | Clerk, Auth0, Supabase Auth |
| Packaging | electron-builder | Forge, Squirrel |
| Testing | Vitest + Playwright | Jest, Cypress, Puppeteer |
| Monorepo | pnpm workspaces + Turborepo | Nx, Lerna, Yarn workspaces |

---

## Frontend: React + TypeScript + Vite + Tailwind

### Why
React has the largest ecosystem, best TypeScript support, and the widest contributor pool — crucial when the project eventually needs outside contributors. Vite provides near-instant HMR and a modern build pipeline without configuration overhead. Tailwind enables rapid UI iteration without fighting CSS specificity, and its utility-first approach pairs naturally with component-based React development.

### Rejected Alternatives
| Alternative | Reason Rejected |
|---|---|
| **Vue 3** | Smaller ecosystem; fewer AI/agent-related component libraries |
| **Svelte / SvelteKit** | Excellent DX but lower contributor familiarity; less mature for desktop embedding in Electron |
| **Angular** | Too opinionated and verbose for a 2-person team; significant boilerplate overhead |
| **Next.js** | SSR overhead unnecessary for a desktop-first, self-hosted app; complicates Electron integration |

---

## Backend / Agent Engine: Node.js + TypeScript + Fastify

### Why
Sharing TypeScript across frontend and backend eliminates context switching for a small team. Node.js runs natively inside Electron's main process, meaning zero IPC serialization overhead between the desktop shell and the agent engine. Fastify is significantly faster than Express, has first-class TypeScript support, and a clean plugin architecture perfect for a modular skill system.

### Rejected Alternatives
| Alternative | Reason Rejected |
|---|---|
| **Python / FastAPI** | Would split the codebase into two languages; harder to bundle in Electron; slower cold start |
| **Bun** | Promising but immature ecosystem; Electron compatibility unverified at scale |
| **Deno** | npm compatibility layer adds friction; limited community tooling for agent workloads |
| **Express.js** | No TypeScript-first design; 3–4x slower than Fastify under load |

---

## Database: SQLite → PostgreSQL

### Why
SQLite requires zero infrastructure — it ships as a single file alongside the Electron app. This is the only viable default for non-technical users who just downloaded an installer. The schema is designed from day one for PostgreSQL compatibility, so the migration path is a connection-string change, not a rewrite. PostgreSQL is offered as an opt-in for power users and Docker Pro deployments.

### Rejected Alternatives
| Alternative | Reason Rejected |
|---|---|
| **MongoDB** | Document model is a poor fit for structured agent history and audit logs; harder to query relationally |
| **MySQL** | No meaningful advantage over PostgreSQL; weaker JSON support |
| **PocketBase** | Ships its own Go runtime; too opinionated; limits schema flexibility |
| **Supabase (hosted)** | Violates self-hosted-first principle; introduces cloud dependency |

---

## AI Layer: Custom Provider Adapter

### Why
A thin custom abstraction (< 500 lines) gives us full control over streaming, error handling, retry logic, cost tracking, and model metadata — without importing a 50 MB dependency tree. LangChain introduced breaking changes in every major version and abstracts in the wrong direction for an agent runtime that needs deterministic, auditable behavior.

### Provider Support (Phase 1)
- Anthropic Claude (claude-3-5-sonnet, claude-3-haiku)
- OpenAI GPT-4o / GPT-4o-mini
- Google Gemini 1.5 Pro / Flash
- Ollama (local models: Llama 3, Mistral, Phi-3)

### Interface Design
```typescript
interface AIProvider {
  complete(messages: Message[], options: CompletionOptions): Promise<CompletionResult>;
  stream(messages: Message[], options: CompletionOptions): AsyncIterable<StreamChunk>;
  models(): Promise<ModelInfo[]>;
}
```

### Rejected Alternatives
| Alternative | Reason Rejected |
|---|---|
| **LangChain** | 50MB+ bundle; frequent breaking changes; over-abstracted; poor streaming control |
| **LlamaIndex** | Python-first; TypeScript port lags behind; less control over execution flow |
| **Vercel AI SDK** | Opinionated toward Next.js/streaming UI; overkill for our use case |
| **Raw SDK per provider** | No adapter layer → duplicated retry/error logic x4 providers |

---

## Skills: YAML Definition + JS/TS Execution

### Why
YAML is human-readable and writeable by non-developers — a core requirement for Vela's "accessible to laypeople" goal. The YAML manifest declares metadata, inputs, outputs, permissions, and guardrail requirements. Actual logic is implemented in TypeScript executed in a sandboxed VM context. This separates skill *description* (shareable, indexable, safe to display) from skill *implementation* (executed securely).

### Skill Manifest Example
```yaml
name: web-search
version: 1.0.0
description: Search the web and return summarized results
permissions:
  - network:read
inputs:
  - name: query
    type: string
    required: true
guardrails:
  confirm_before_execute: false
  max_tokens_output: 2000
```

---

## Desktop App: Electron

### Why
Electron provides a single codebase that produces native installers for Windows, macOS, and Linux. Non-technical users get a double-click install experience. Electron's main process runs Node.js, meaning the agent engine runs in-process without any network hop — critical for privacy and latency. The web UI (React) is reused as the Electron renderer.

### Rejected Alternatives
| Alternative | Reason Rejected |
|---|---|
| **Tauri** | Requires Rust expertise; harder to bundle Node.js agent engine natively |
| **NW.js** | Less maintained; weaker tooling ecosystem |
| **PWA only** | No access to local filesystem, processes, or system notifications without OS integration |

### Pro Mode: Docker
Power users and enterprise deployments use Docker Compose. The same Node.js backend runs as a container; the UI is served as a web app. This enables multi-user setups, server deployments, and integration with existing infrastructure.

---

## Auth: Local Auth First → OAuth2

### Why
Phase 1 targets single-user self-hosted installs. A lightweight local auth (bcrypt password hash + JWT stored in SQLite) is sufficient and requires no external dependencies. OAuth2 (GitHub, Google) is added in Phase 2 for team/multi-user scenarios without changing the auth interface.

### Rejected Alternatives
| Alternative | Reason Rejected |
|---|---|
| **Clerk** | Cloud dependency; violates self-hosted principle |
| **Auth0** | Same; also cost concern at scale |
| **Supabase Auth** | Pulls in too much infrastructure for Phase 1 |
| **Passport.js** | Overly complex for single-user local auth; adds dependency weight |

---

## Packaging: electron-builder

### Why
electron-builder is the de-facto standard for Electron app distribution. It produces: `.exe` (NSIS installer) for Windows, `.dmg` + `.pkg` for macOS, `.AppImage` + `.deb` + `.rpm` for Linux. Auto-update support via `electron-updater` is built in. Code signing for macOS/Windows is supported out of the box.

---

## Testing: Vitest + Playwright

### Why
Vitest is Vite-native — zero configuration in our stack, runs in the same TypeScript environment as the source. It is 2–5x faster than Jest for our module graph. Playwright provides reliable cross-browser E2E testing and has a dedicated Electron testing mode, covering both the web dashboard and the desktop app in one framework.

### Rejected Alternatives
| Alternative | Reason Rejected |
|---|---|
| **Jest** | Slower; requires separate babel/ts-jest config; redundant with Vitest in a Vite project |
| **Cypress** | No native Electron support; heavier resource footprint |
| **Puppeteer** | Chrome-only; less ergonomic API than Playwright |

---

## Monorepo: pnpm workspaces + Turborepo

### Why
pnpm's symlink-based node_modules gives significantly faster installs and less disk usage than npm or yarn — important for CI speed. Turborepo adds intelligent task caching (build, test, lint) across packages, keeping CI times short as the monorepo grows. The combination is the current industry standard for TypeScript monorepos.

---

*Last updated: 2026-03-02*
