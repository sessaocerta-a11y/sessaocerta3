# =========================================================================
# Dockerfile para Hospedagem de Produção do Sessão Certa
# Suporta suporte multi-stage para imagem mínima e rápida
# =========================================================================

# Estágio 1: Build
FROM node:20-alpine AS builder

WORKDIR /app

COPY package.json ./
RUN npm install

COPY . .
RUN npm run build

# Estágio 2: Runner de Produção
FROM node:20-alpine AS runner

WORKDIR /app
ENV NODE_ENV=production
ENV PORT=3000

COPY package.json ./
RUN npm install --only=production

COPY --from=builder /app/dist ./dist

EXPOSE 3000

CMD ["node", "dist/server.cjs"]
