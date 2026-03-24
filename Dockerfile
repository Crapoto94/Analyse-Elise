# Stage 1: Install dependencies
FROM node:20-alpine AS deps
RUN apk add --no-cache libc6-compat
WORKDIR /app

COPY package.json package-lock.json* ./
COPY prisma ./prisma/
RUN npm ci

# Stage 2: Rebuild the source code
FROM node:20-alpine AS builder
RUN apk add --no-cache libc6-compat
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY . .

# Generate Prisma Client
RUN npx prisma generate

# Build the Next.js app in standalone mode
ENV NEXT_TELEMETRY_DISABLED 1
RUN npm run build

# Stage 3: Production image
FROM node:20-alpine AS runner
WORKDIR /app

# Install runtime dependencies
RUN apk add --no-cache libc6-compat openssl curl

ENV NODE_ENV production
ENV NEXT_TELEMETRY_DISABLED 1

# Copy standalone build
COPY --from=builder /app/public ./public
COPY --from=builder /app/.next/standalone ./
COPY --from=builder /app/.next/static ./.next/static

# Copy the Prisma schema required for migrations
COPY --from=builder /app/prisma ./prisma

# IMPORTANT: For Next.js standalone to find Prisma, we must copy both the client AND the generated engines
# into the standalone node_modules folder.
COPY --from=builder /app/node_modules/.prisma ./node_modules/.prisma
COPY --from=builder /app/node_modules/@prisma/client ./node_modules/@prisma/client

# Install only the Prisma CLI for db push at startup
RUN npm install prisma@6.19.2 --no-save

EXPOSE 5004
ENV PORT 5004
ENV HOSTNAME 0.0.0.0

CMD sh -c "node_modules/.bin/prisma db push --accept-data-loss --skip-generate && node server.js"
