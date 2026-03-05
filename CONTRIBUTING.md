# Contributing to Vela

Thank you for your interest in contributing! Vela is an open-source project and we welcome contributions of all kinds.

## Getting Started

### Prerequisites
- Node.js >= 20
- pnpm >= 9 (`npm install -g pnpm`)

### Development Setup

```bash
git clone https://github.com/msoyucok/vela.git
cd vela
pnpm install
pnpm dev
```

## Project Structure

See [`docs/github-structure.md`](docs/github-structure.md) for a detailed breakdown.

## Making Changes

1. Fork the repository
2. Create a feature branch: `git checkout -b feature/your-feature-name`
3. Make your changes
4. Write or update tests
5. Run the full test suite: `pnpm test`
6. Submit a pull request

## Code Style

- TypeScript strict mode is enforced
- ESLint + Prettier are configured (run `pnpm lint` to check)
- No `any` types without justification

## Skill Contributions

To contribute a skill to the official library:
1. Create a directory under `skills/your-skill-name/`
2. Write a `manifest.yaml` following the schema in `docs/architecture.md`
3. Include a `README.md` for your skill
4. Skills undergo a security review before merging

## Security Vulnerabilities

Please do **not** open public issues for security vulnerabilities.
Email: security@vela.ai

## License

By contributing, you agree that your contributions will be licensed under the Apache 2.0 License.
