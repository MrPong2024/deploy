# Dockerfile for Auto Deploy Server
FROM node:20-alpine AS base

# 1. Install dependencies
FROM base AS deps
RUN apk add --no-cache libc6-compat
WORKDIR /app

COPY package.json yarn.lock* package-lock.json* pnpm-lock.yaml* ./
RUN npm cache clean --force && rm -f package-lock.json
RUN \
  if [ -f yarn.lock ]; then yarn --frozen-lockfile; \
  elif [ -f pnpm-lock.yaml ]; then corepack enable pnpm && pnpm i --frozen-lockfile; \
  else npm install; \
  fi

# 2. Rebuild the source code
FROM base AS builder
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY . .

# บังคับใช้ Prisma 6.1.0 ในช่วง Build
RUN npx prisma@6.1.0 generate

ENV NEXT_TELEMETRY_DISABLED 1
RUN \
  if [ -f yarn.lock ]; then yarn run build; \
  elif [ -f package-lock.json ]; then npm run build; \
  elif [ -f pnpm-lock.yaml ]; then corepack enable pnpm && pnpm run build; \
  else echo "Lockfile not found." && exit 1; \
  fi

# 3. Production image
FROM base AS runner
WORKDIR /app

# Install SSH client tools and git for deployment functionality
RUN apk add --no-cache openssh-client sshpass git

ENV NODE_ENV production
ENV NEXT_TELEMETRY_DISABLED 1

RUN addgroup --system --gid 1001 nodejs
RUN adduser --system --uid 1001 nextjs

# Create SSH directory and known_hosts file with proper permissions
RUN mkdir -p /home/nextjs/.ssh && \
    touch /home/nextjs/.ssh/known_hosts && \
    chown -R nextjs:nodejs /home/nextjs/.ssh && \
    chmod 700 /home/nextjs/.ssh && \
    chmod 600 /home/nextjs/.ssh/known_hosts

COPY --from=builder /app/public ./public
RUN mkdir .next && chown nextjs:nodejs .next

# Copy standalone build
COPY --from=builder --chown=nextjs:nodejs /app/.next/standalone ./
COPY --from=builder --chown=nextjs:nodejs /app/.next/static ./.next/static

# Copy Prisma files for Runtime
COPY --from=builder --chown=nextjs:nodejs /app/prisma ./prisma
COPY --from=builder --chown=nextjs:nodejs /app/node_modules/@prisma ./node_modules/@prisma
COPY --from=builder --chown=nextjs:nodejs /app/node_modules/.prisma ./node_modules/.prisma

# Create and set permissions for temp directory
RUN mkdir -p /app/temp && chown -R nextjs:nodejs /app/temp

USER nextjs
EXPOSE 3000
ENV PORT 3000
ENV HOSTNAME "0.0.0.0"

# ใช้ Command จาก docker-compose.yml แทนเพื่อให้ทำ Migrate ได้
CMD ["node", "server.js"]