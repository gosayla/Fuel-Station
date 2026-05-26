FROM node:20-alpine AS builder
WORKDIR /app
RUN npm install -g pnpm
COPY pnpm-workspace.yaml pnpm-lock.yaml package.json tsconfig.base.json ./
COPY packages/ ./packages/
COPY apps/backend/ ./apps/backend/
RUN pnpm install --frozen-lockfile
RUN pnpm --filter backend build
RUN pnpm --filter backend deploy --prod /deploy

FROM node:20-alpine
WORKDIR /app
COPY --from=builder /deploy .
EXPOSE 3000
CMD ["node", "dist/main"]
