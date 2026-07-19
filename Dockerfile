FROM node:20-alpine AS build

WORKDIR /app

COPY package*.json ./
RUN npm ci

COPY index.html vite.config.js ./
COPY favicon.svg ./
COPY public/ ./public/
COPY src/ ./src/

RUN npm run build

# 运行时改用 Debian(slim/glibc)，确保 better-sqlite3 预编译原生模块可用
FROM node:20-slim

LABEL maintainer="Zentrix"

WORKDIR /app

# 安装生产依赖（Express + better-sqlite3 等）
COPY package*.json ./
RUN npm ci --omit=dev && npm cache clean --force

# 复制构建产物、服务端代码和种子数据
COPY --from=build /app/dist/ ./dist/
COPY server/ ./server/

# 创建数据与日志目录（运行时通过 K8s hostPath 挂载持久化，镜像内仅占位）
RUN mkdir -p /app/logs /app/data

ENV NODE_ENV=production
ENV PORT=80
ENV LOG_DIR=/app/logs

EXPOSE 80

CMD ["node", "server/index.js"]
