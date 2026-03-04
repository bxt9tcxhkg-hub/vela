# Vela Server – Production Docker Image
FROM node:20-alpine AS base
RUN npm install -g pnpm@9

# Dependencies
FROM base AS deps
WORKDIR /app
COPY package.json pnpm-workspace.yaml pnpm-lock.yaml ./
COPY packages/core/package.json     ./packages/core/
COPY packages/server/package.json   ./packages/server/
RUN pnpm install --frozen-lockfile --prod=false

# Build
FROM deps AS builder
COPY . .
RUN pnpm --filter @vela/core build
RUN pnpm --filter @vela/server build

# Runtime
FROM node:20-alpine AS runner
WORKDIR /app

RUN addgroup -S vela && adduser -S vela -G vela

COPY --from=builder --chown=vela:vela /app/packages/core/dist   ./packages/core/dist
COPY --from=builder --chown=vela:vela /app/packages/core/package.json ./packages/core/
COPY --from=builder --chown=vela:vela /app/packages/server/dist  ./packages/server/dist
COPY --from=builder --chown=vela:vela /app/packages/server/package.json ./packages/server/
COPY --from=builder --chown=vela:vela /app/node_modules          ./node_modules
COPY --from=builder --chown=vela:vela /app/package.json ./

USER vela

ENV NODE_ENV=production
ENV PORT=3000
ENV VELA_DATA_DIR=/data

EXPOSE 3000

HEALTHCHECK --interval=30s --timeout=10s --start-period=5s --retries=3 \
  CMD wget -qO- http://localhost:3000/api/health || exit 1

CMD ["node", "packages/server/dist/index.js"]
