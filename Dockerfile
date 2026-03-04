FROM node:20-slim AS base
ENV PNPM_HOME="/pnpm"
ENV PATH="$PNPM_HOME:$PATH"
RUN corepack enable

WORKDIR /app
COPY package.json pnpm-workspace.yaml pnpm-lock.yaml tsconfig.base.json ./
COPY packages/core/package.json    ./packages/core/
COPY packages/server/package.json  ./packages/server/
COPY packages/ui/package.json      ./packages/ui/

RUN pnpm install --frozen-lockfile

COPY packages/core   ./packages/core
COPY packages/server ./packages/server
COPY packages/ui     ./packages/ui

RUN pnpm --filter @vela/core build
RUN pnpm --filter @vela/server build
RUN pnpm --filter @vela/ui build

RUN apt-get update && apt-get install -y curl --no-install-recommends && rm -rf /var/lib/apt/lists/*

EXPOSE 3000
ENV NODE_ENV=production
HEALTHCHECK --interval=30s --timeout=5s --retries=3 \
  CMD curl -f http://localhost:3000/api/health || exit 1

CMD ["node", "packages/server/dist/index.js"]
