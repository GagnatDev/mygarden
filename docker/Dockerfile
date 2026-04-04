# syntax=docker/dockerfile:1

FROM node:24-alpine AS installer
WORKDIR /app
COPY package.json pnpm-workspace.yaml pnpm-lock.yaml ./
COPY backend/package.json ./backend/
COPY frontend/package.json ./frontend/
COPY tsconfig.base.json ./
RUN corepack enable && pnpm install --frozen-lockfile
COPY backend ./backend
COPY frontend ./frontend
RUN pnpm --filter backend run build
RUN pnpm --filter frontend run build

FROM node:24-alpine
WORKDIR /app
ENV NODE_ENV=production
# pnpm: backend/node_modules symlinks into root node_modules/.pnpm — copy both.
COPY --from=installer /app/node_modules ./node_modules
COPY --from=installer /app/backend/package.json ./backend/package.json
COPY --from=installer /app/backend/node_modules ./backend/node_modules
COPY --from=installer /app/backend/dist ./backend/dist
COPY --from=installer /app/frontend/dist ./public
WORKDIR /app/backend
EXPOSE 8080
CMD ["node", "dist/server.js"]
