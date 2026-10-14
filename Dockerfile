FROM node:22-alpine AS dependencies

WORKDIR /app

COPY package*.json ./
RUN npm ci

FROM dependencies AS builder

COPY prisma ./prisma
COPY prisma.config.ts ./
RUN npm run prisma:generate

COPY . .
RUN npm run build
RUN npm prune --omit=dev

FROM node:22-alpine AS runner

WORKDIR /app

ENV NODE_ENV=production

# psql/pg_restore for the optional demo seed in scripts/start.sh
RUN apk add --no-cache postgresql-client

COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/dist ./dist
COPY --from=builder /app/prisma ./prisma
COPY --from=builder /app/prisma.config.ts ./prisma.config.ts
COPY package*.json ./
COPY demo ./demo
COPY scripts/start.sh ./scripts/start.sh

EXPOSE 3000

CMD ["sh", "scripts/start.sh"]
