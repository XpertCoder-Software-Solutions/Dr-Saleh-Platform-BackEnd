FROM node:22-alpine AS dependencies

WORKDIR /app

COPY package*.json ./
RUN npm ci

FROM dependencies AS builder

ENV DATABASE_URL=postgresql://postgres:postgres@postgres:5432/dr_saleh_platform?schema=public

COPY prisma ./prisma
RUN npm run prisma:generate

COPY . .
RUN npm run build
RUN npm prune --omit=dev

FROM node:22-alpine AS runner

WORKDIR /app

ENV NODE_ENV=production

COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/dist ./dist
COPY --from=builder /app/prisma ./prisma
COPY package*.json ./

EXPOSE 3000

CMD ["node", "dist/main.js"]
