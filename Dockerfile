# ---- STAGE 1: Builder ----
FROM node:20-slim AS builder

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
FROM node:20-slim AS runtime

WORKDIR /app

ENV NODE_ENV=production

# Install wget for healthcheck, git for updates, sqlite3 CLI for WAL setup
RUN apt-get update && apt-get install -y --no-install-recommends wget git sqlite3 openssh && rm -rf /var/lib/apt/lists/*

# Copy production dependencies only (fast, deterministic)
COPY package.json package-lock.json ./
RUN npm ci --omit=dev && npm install multer@^2.2.0 --no-save 2>&1 | tail -5

# Copy built artifacts from builder stage
COPY --from=builder /app/dist/ ./dist/
COPY --from=builder /app/node_modules/.prisma/ ./node_modules/.prisma/
COPY --from=builder /app/node_modules/@prisma/ ./node_modules/@prisma/

# Copy prisma schema (needed for runtime seed logic and future migrations)
COPY prisma/schema.prisma ./prisma/
COPY prisma/seed.sql ./prisma/

# Regenerate Prisma client in runtime stage with correct binary targets
RUN npx prisma generate

# Copy entrypoint script (convert CRLF to LF for Linux compatibility)
COPY entrypoint.sh /app/entrypoint.sh
RUN sed -i 's/\r$//' /app/entrypoint.sh && chmod +x /app/entrypoint.sh

# Create directories that the app expects at runtime
RUN mkdir -p /app/prisma /app/uploads/drawings /app/uploads/csv

EXPOSE 3000

HEALTHCHECK --interval=30s --timeout=10s --retries=3 --start-period=40s \
  CMD wget --spider -q http://localhost:3000/api/data || exit 1

ENTRYPOINT ["/app/entrypoint.sh"]
CMD ["node", "dist/server.cjs"]
