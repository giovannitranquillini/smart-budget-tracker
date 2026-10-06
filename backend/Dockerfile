# syntax=docker/dockerfile:1

FROM node:26-alpine AS base
WORKDIR /app
RUN npm install -g pnpm@10.30.3

# ---- dipendenze complete: servono i devDependencies (typescript, prisma, tsc-alias) per la build ----
FROM base AS deps
COPY package.json pnpm-lock.yaml ./
RUN --mount=type=cache,target=/root/.local/share/pnpm/store \
    pnpm install --frozen-lockfile

# ---- solo dipendenze di produzione, gira in parallelo allo stage "build" ----
FROM base AS prod-deps
COPY package.json pnpm-lock.yaml ./
RUN --mount=type=cache,target=/root/.local/share/pnpm/store \
    pnpm install --frozen-lockfile --prod

# ---- genera il client Prisma e compila TypeScript ----
FROM base AS build
COPY --from=deps /app/node_modules ./node_modules
COPY package.json tsconfig.json prisma.config.ts ./
COPY src ./src
RUN pnpm run prisma:generate
RUN pnpm run build

# ---- immagine finale ----
FROM base AS runner
ENV NODE_ENV=production
COPY --from=prod-deps --chown=node:node /app/node_modules ./node_modules
COPY --from=build --chown=node:node /app/dist ./dist
RUN mkdir -p /audio_files && chown node:node /audio_files
USER node
EXPOSE 3001
CMD ["node", "dist/src/api/index.js"]
