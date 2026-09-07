# syntax=docker/dockerfile:1

FROM node:26-alpine AS base
WORKDIR /app
RUN npm install -g pnpm@10.30.3

# ---- dipendenze complete: servono i devDependencies (typescript, prisma, tsc-alias) per la build ----
FROM base AS deps
WORKDIR /app/api
COPY api/package.json api/pnpm-lock.yaml ./
RUN --mount=type=cache,target=/root/.local/share/pnpm/store \
    pnpm install --frozen-lockfile

# ---- solo dipendenze di produzione, gira in parallelo allo stage "build" ----
FROM base AS prod-deps
WORKDIR /app/api
COPY api/package.json api/pnpm-lock.yaml ./
RUN --mount=type=cache,target=/root/.local/share/pnpm/store \
    pnpm install --frozen-lockfile --prod

# ---- deps di messaging: è JS puro, non si compila, gli serve solo il suo node_modules ----
FROM base AS messaging-deps
WORKDIR /app/messaging
COPY messaging/package.json messaging/pnpm-lock.yaml ./
RUN --mount=type=cache,target=/root/.local/share/pnpm/store \
    pnpm install --frozen-lockfile --prod

# ---- compila TypeScript ----
FROM base AS build
WORKDIR /app/api
COPY --from=deps /app/api/node_modules ./node_modules
COPY messaging /app/messaging
COPY api ./
RUN pnpm run build

# ---- immagine finale ----
FROM base AS runner
WORKDIR /app
ENV NODE_ENV=production
COPY --from=prod-deps      --chown=node:node /app/api/node_modules       ./node_modules
COPY --from=build          --chown=node:node /app/api/dist               ./dist
COPY --from=messaging-deps --chown=node:node /app/messaging/node_modules ./messaging/node_modules
COPY --chown=node:node messaging/*.js ./messaging/
COPY --chown=node:node protos ./protos
USER node
EXPOSE 3002 50051
CMD ["node", "dist/index.js"]
