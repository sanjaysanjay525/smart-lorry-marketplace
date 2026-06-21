FROM node:20-slim AS base
WORKDIR /app
RUN apt-get update -y && apt-get install -y openssl && rm -rf /var/lib/apt/lists/*

FROM base AS deps
COPY package.json package-lock.json* ./
COPY packages/shared/package.json packages/shared/package.json
COPY services/api/package.json services/api/package.json
RUN npm install --workspaces=false --include-workspace-root=false 2>/dev/null || npm install

FROM base AS build
COPY . .
RUN npm install
RUN npm run build:shared
RUN npm run build --workspace=services/api
RUN npm run prisma:generate --workspace=services/api

FROM base AS runtime
ENV NODE_ENV=production
COPY --from=build /app/node_modules ./node_modules
COPY --from=build /app/packages/shared/dist ./packages/shared/dist
COPY --from=build /app/packages/shared/package.json ./packages/shared/package.json
COPY --from=build /app/services/api/dist ./services/api/dist
COPY --from=build /app/services/api/package.json ./services/api/package.json
COPY --from=build /app/services/api/prisma ./services/api/prisma
COPY --from=build /app/node_modules/.prisma ./node_modules/.prisma

WORKDIR /app/services/api
EXPOSE 4000
CMD ["node", "dist/index.js"]
