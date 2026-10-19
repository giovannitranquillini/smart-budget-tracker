# syntax=docker/dockerfile:1

FROM node:26-alpine AS base
WORKDIR /app
RUN npm install -g pnpm@10.30.3

# ---- full dependencies: devDependencies (typescript, prisma, tsc-alias) are needed for the build ----
FROM base AS deps
COPY package.json pnpm-lock.yaml ./
RUN --mount=type=cache,target=/root/.local/share/pnpm/store \
    pnpm install --frozen-lockfile

# ---- production dependencies only, runs in parallel with the "build" stage ----
FROM base AS prod-deps
COPY package.json pnpm-lock.yaml ./
RUN --mount=type=cache,target=/root/.local/share/pnpm/store \
    pnpm install --frozen-lockfile --prod

# ---- messaging deps: plain JS, nothing to compile, it only needs its own node_modules ----
FROM base AS messaging-deps
WORKDIR /app/messaging
COPY messaging/package.json messaging/pnpm-lock.yaml ./
RUN --mount=type=cache,target=/root/.local/share/pnpm/store \
    pnpm install --frozen-lockfile --prod

# ---- compile TypeScript ----
FROM base AS build
COPY --from=deps /app/node_modules ./node_modules
COPY package.json tsconfig.json ./
COPY messaging ./messaging
COPY api ./api
RUN pnpm run build

# ---- final image ----
FROM base AS runner
WORKDIR /app
ENV NODE_ENV=production
COPY --from=prod-deps      --chown=node:node /app/node_modules           ./node_modules
COPY --from=build          --chown=node:node /app/dist                   ./dist
COPY --from=messaging-deps --chown=node:node /app/messaging/node_modules ./messaging/node_modules
COPY --chown=node:node messaging/*.js ./messaging/
USER node
CMD ["node", "dist/index.js"]
