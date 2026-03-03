# syntax=docker/dockerfile:1
FROM node:20-slim AS base
ENV PNPM_HOME="/pnpm"
ENV PATH="$PNPM_HOME:$PATH"
RUN corepack enable

WORKDIR /app
COPY package.json pnpm-workspace.yaml pnpm-lock.yaml tsconfig.base.json ./
COPY packages/server/package.json ./packages/server/
COPY packages/ui/package.json ./packages/ui/

# Install deps
FROM base AS deps
RUN --mount=type=cache,id=pnpm,target=/pnpm/store pnpm install --frozen-lockfile

# Build UI
FROM deps AS ui-build
COPY packages/ui ./packages/ui
RUN pnpm --filter @vela/ui build

# Build Server
FROM deps AS server-build
COPY packages/server ./packages/server
RUN pnpm --filter @vela/server build

# Production image
FROM node:20-slim AS production
ENV PNPM_HOME="/pnpm"
ENV PATH="$PNPM_HOME:$PATH"
RUN corepack enable

WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY --from=deps /app/packages/server/node_modules ./packages/server/node_modules
COPY --from=server-build /app/packages/server/dist ./packages/server/dist
COPY --from=server-build /app/packages/server/package.json ./packages/server/package.json
COPY --from=ui-build /app/packages/ui/dist ./packages/ui/dist
COPY packages/server/package.json ./packages/server/

# Serve static UI files via server
EXPOSE 3000
ENV NODE_ENV=production
CMD ["node", "packages/server/dist/index.js"]
