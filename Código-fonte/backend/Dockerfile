# syntax=docker/dockerfile:1.7

# Imagem de PRODUÇÃO — multi-stage, sem hot reload/bind mount (para desenvolvimento
# ver Dockerfile.dev). Base node:20-bookworm-slim em todos os estágios, não alpine:
# bcrypt (dependência nativa) e o motor de query do Prisma têm atrito conhecido com
# musl libc/OpenSSL do alpine (exigem pacotes extra via apk e ainda assim têm mais
# chance de quebrar numa atualização de imagem-base) — bookworm-slim já é a base do
# Dockerfile.dev, então build e runtime ficam com a mesma libc, evitando a classe de
# bug "funciona local, quebra no build de produção".

# ---- deps: só instala dependências, isolado numa camada cacheável ----
FROM node:20-bookworm-slim AS deps
WORKDIR /app
# Copia só os manifests antes do restante do código — o cache desta camada só é
# invalidado quando package.json/package-lock.json mudam, não a cada commit.
COPY package.json package-lock.json ./
RUN npm ci

# ---- build: gera o client do Prisma e compila o Nest ----
FROM node:20-bookworm-slim AS build
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY package.json package-lock.json tsconfig.json tsconfig.build.json nest-cli.json ./
COPY prisma ./prisma
COPY src ./src
RUN npx prisma generate
RUN npm run build
# Recria node_modules só com dependências de produção (remove typescript, jest,
# eslint, a CLI do prisma etc.) antes de copiar pro estágio final — migrations em
# produção rodam via job de CI/CD com checkout completo, não de dentro da imagem
# (ver docs/deploy.md), então a CLI do prisma não precisa sobreviver aqui.
RUN npm prune --omit=dev

# ---- runtime: imagem final, só o necessário pra rodar ----
FROM node:20-bookworm-slim AS runtime
WORKDIR /app
ENV NODE_ENV=production

# Imagens oficiais do Node já vêm com um usuário "node" (uid 1000) não-root criado
# de propósito pra isso — não precisa criar um novo.
COPY --from=build --chown=node:node /app/node_modules ./node_modules
COPY --from=build --chown=node:node /app/dist ./dist
COPY --from=build --chown=node:node /app/package.json ./package.json

USER node

EXPOSE 3000

# GET /health (HealthController) confere conectividade com o Postgres e devolve
# 503 se falhar — isso conta como unhealthy pro orquestrador reiniciar o container
# ou tirá-lo de rotação. Usa `node -e` em vez de curl/wget pra não precisar
# instalar nada extra na imagem (bookworm-slim não vem com nenhum dos dois).
HEALTHCHECK --interval=30s --timeout=5s --start-period=15s --retries=3 \
  CMD node -e "require('http').get({host:'localhost',port:process.env.PORT||3000,path:'/health',timeout:4000},r=>process.exit(r.statusCode===200?0:1)).on('error',()=>process.exit(1))"

CMD ["node", "dist/main.js"]
