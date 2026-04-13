# ---------------------------------------------------------------------------
# Dockerfile — Guildtide Server (T-1901, T-1902, T-1903)
# Multi-stage build for minimal production image
# ---------------------------------------------------------------------------

# ---- Stage 1: Build -------------------------------------------------------
FROM node:20-alpine AS builder

WORKDIR /app

# Copy workspace root package files
COPY package.json package-lock.json ./

# Copy shared library
COPY shared/ ./shared/

# Copy server
COPY server/ ./server/

# Install dependencies
RUN cd shared && npm install
RUN cd server && npm install

# Generate Prisma client
RUN cd server && npx prisma generate

# Build
RUN cd server && npm run build

# ---- Stage 2: Production --------------------------------------------------
FROM node:20-alpine AS production

WORKDIR /app

# Security: run as non-root
RUN addgroup -g 1001 -S guildtide && \
    adduser -S guildtide -u 1001 -G guildtide

# Copy built artifacts
COPY --from=builder /app/server/dist ./dist
COPY --from=builder /app/server/node_modules ./node_modules
COPY --from=builder /app/server/package.json ./
COPY --from=builder /app/server/prisma ./prisma
COPY --from=builder /app/shared ./shared

# Environment defaults
ENV NODE_ENV=production
ENV PORT=4000

# T-1903: Health check
HEALTHCHECK --interval=30s --timeout=10s --start-period=15s --retries=3 \
  CMD wget --no-verbose --tries=1 --spider http://localhost:4000/api/health || exit 1

EXPOSE 4000

USER guildtide

CMD ["node", "dist/index.js"]
