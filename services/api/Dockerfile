FROM node:20-alpine AS base
WORKDIR /app

COPY package.json package-lock.json* ./
COPY packages/shared/package.json ./packages/shared/
COPY services/api/package.json ./services/api/

RUN npm install --workspace=@slm/shared --workspace=@slm/api

COPY packages/shared ./packages/shared
COPY services/api ./services/api

RUN npm run build --workspace=@slm/shared
RUN npm run db:generate --workspace=@slm/api
RUN npm run build --workspace=@slm/api

WORKDIR /app/services/api
EXPOSE 3001
CMD ["node", "dist/index.js"]
