# ---- STAGE 1: Builder ----
FROM node:20-alpine AS builder

WORKDIR /app

COPY package.json package-lock.json ./
RUN npm ci

COPY prisma/ ./prisma/
RUN npx prisma generate

COPY tsconfig.json ./
COPY server.ts ./
COPY vite.config.ts ./
COPY index.html ./
COPY src/ ./src/
COPY assets/ ./assets/

RUN npm run build

# ---- STAGE 2: Runtime ----
FROM node:20-alpine AS runtime

WORKDIR /app

ENV NODE_ENV=production

# Install wget for healthcheck, git for updates, sqlite3 CLI for WAL setup
RUN apk add --no-cache wget git sqlite

# Copy production dependencies only (fast, deterministic)
COPY package.json package-lock.json ./
RUN npm ci --omit=dev

# Copy built artifacts from builder stage
COPY --from=builder /app/dist/ ./dist/
COPY --from=builder /app/node_modules/.prisma/ ./node_modules/.prisma/
COPY --from=builder /app/node_modules/@prisma/ ./node_modules/@prisma/

# Copy prisma schema (needed for runtime seed logic and future migrations)
COPY prisma/schema.prisma ./prisma/
COPY prisma/seed.sql ./prisma/

# Copy entrypoint script
COPY entrypoint.sh /app/entrypoint.sh
RUN chmod +x /app/entrypoint.sh

# Create directories that the app expects at runtime
RUN mkdir -p /app/prisma /app/uploads/drawings /app/uploads/csv

EXPOSE 3000

HEALTHCHECK --interval=30s --timeout=10s --retries=3 --start-period=40s \
  CMD wget --spider -q http://localhost:3000/api/data || exit 1

ENTRYPOINT ["/app/entrypoint.sh"]
CMD ["node", "dist/server.cjs"]
