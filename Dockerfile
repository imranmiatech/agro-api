# syntax=docker/dockerfile:1

# ==============================================================================
# Stage 1: Install all dependencies, generate Prisma client, and build NestJS
# ==============================================================================
FROM node:22-alpine AS builder

WORKDIR /app

COPY package.json package-lock.json ./
RUN npm ci

COPY prisma ./prisma
COPY prisma.config.ts tsconfig.json tsconfig.build.json nest-cli.json ./
COPY src ./src

# prisma.config.ts validates DATABASE_URL at load time; dummy value is only used for client generation
RUN DATABASE_URL="postgresql://dummy:dummy@localhost:5432/dummy" ./node_modules/.bin/prisma generate

# Build NestJS (compiles src/ and src/generated/prisma/ into dist/)
RUN npm run build

# ==============================================================================
# Stage 2: Production runtime dependencies (+ version-matched Prisma CLI)
# ==============================================================================
FROM node:22-alpine AS prod-deps

WORKDIR /app

COPY package.json package-lock.json ./
RUN npm ci --omit=dev && \
    npm install --no-save prisma@7.10.1 && \
    npm cache clean --force

# ==============================================================================
# Stage 3: Minimal production runtime image
# ==============================================================================
FROM node:22-alpine AS runner

WORKDIR /app

ENV NODE_ENV=production
ENV PORT=3000

COPY --from=prod-deps --chown=node:node /app/node_modules ./node_modules
COPY --from=builder --chown=node:node /app/dist ./dist
COPY --from=builder --chown=node:node /app/prisma ./prisma
COPY --from=builder --chown=node:node /app/prisma.config.ts ./prisma.config.ts
COPY --chown=node:node package.json ./

# Ensure persistent upload directories exist and are writable by non-root `node` user
RUN mkdir -p /app/uploads/logos && chown -R node:node /app/uploads

USER node

EXPOSE 3000

HEALTHCHECK --interval=30s --timeout=5s --start-period=20s --retries=3 \
  CMD wget -qO- "http://127.0.0.1:${PORT:-3000}/api/v1/health" || exit 1

# Apply pending Prisma migrations on startup, then hand off PID 1 to Node
CMD ["sh", "-c", "./node_modules/.bin/prisma migrate deploy && exec node dist/main.js"]
