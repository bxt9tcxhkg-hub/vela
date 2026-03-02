FROM node:20-alpine AS builder

RUN corepack enable && corepack prepare pnpm@9.1.0 --activate

WORKDIR /app
COPY pnpm-workspace.yaml package.json pnpm-lock.yaml* ./
COPY packages/core/package.json ./packages/core/
COPY packages/ui/package.json ./packages/ui/
COPY packages/cli/package.json ./packages/cli/

RUN pnpm install --frozen-lockfile

COPY . .
RUN pnpm build

# Production image
FROM node:20-alpine AS runner

RUN corepack enable && corepack prepare pnpm@9.1.0 --activate

WORKDIR /app
ENV NODE_ENV=production

COPY --from=builder /app/packages/core/dist ./packages/core/dist
COPY --from=builder /app/packages/core/package.json ./packages/core/
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/package.json ./

RUN addgroup -g 1001 -S vela && adduser -S vela -u 1001
USER vela

EXPOSE 3000

CMD ["node", "packages/core/dist/index.js"]
