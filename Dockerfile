# Stage 1: Install dependencies
FROM node:20-alpine AS deps
RUN apk add --no-cache libc6-compat
WORKDIR /app

COPY package.json package-lock.json* ./
RUN npm ci

# Stage 2: Rebuild the source code
FROM node:20-alpine AS builder
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY . .

# Generate Prisma clients for both schemas
RUN npx prisma generate --schema=./prisma/system/schema.prisma
RUN npx prisma generate --schema=./prisma/entities/schema.prisma

# Build the Next.js app in standalone mode
ENV NEXT_TELEMETRY_DISABLED 1
RUN npm run build

# Stage 3: Production image
FROM node:20-alpine AS runner
WORKDIR /app

ENV NODE_ENV production
ENV NEXT_TELEMETRY_DISABLED 1

# We use root for now to avoid permission issues with mounted volumes on Proxmox
# RUN addgroup --system --gid 1001 nodejs
# RUN adduser --system --uid 1001 nextjs
# USER nextjs

COPY --from=builder /app/public ./public
COPY --from=builder /app/.next/standalone ./
COPY --from=builder /app/.next/static ./.next/static

# IMPORTANT: Copy the generated prisma clients and their engines
# These are often missed by Next.js standalone tracing when using multiple clients
COPY --from=builder /app/node_modules/.prisma ./node_modules/.prisma
COPY --from=builder /app/node_modules/@prisma/client ./node_modules/@prisma/client

EXPOSE 5002
ENV PORT 5002
ENV HOSTNAME 0.0.0.0

CMD ["node", "server.js"]
