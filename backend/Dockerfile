# ── Fase 1: compilar TypeScript ────────────────────────────────
FROM registry.access.redhat.com/ubi9/nodejs-20:latest AS builder

USER root
WORKDIR /app

COPY package*.json ./
RUN npm ci

COPY . .
RUN npm run build

# ── Fase 2: imagen final solo con lo necesario ─────────────────
FROM registry.access.redhat.com/ubi9/nodejs-20:latest

USER root
WORKDIR /app

COPY package*.json ./
RUN npm ci --omit=dev

COPY --from=builder /app/dist ./dist

EXPOSE 3000

CMD ["node", "dist/index.js"]
