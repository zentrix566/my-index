# 构建阶段
# 必须用 glibc 镜像（slim），不能用 alpine(musl)：better-sqlite3 等原生模块无 musl 预编译。
FROM node:20-slim AS build
WORKDIR /app

# 安装原生模块编译工具（node-gyp 需要 python3 + make + g++）。
# 关键：CI 构建机通常无法访问 GitHub，而 better-sqlite3 的预编译二进制托管在 GitHub，
# 直接下载会失败并回退源码编译；slim 默认没有编译工具 → npm ci 失败。
# 这里装上编译工具，并强制 --build-from-source 跳过 GitHub 下载，确保稳定可构建。
RUN apt-get update && apt-get install -y --no-install-recommends python3 make g++ \
    && rm -rf /var/lib/apt/lists/*
ENV npm_config_build_from_source=true

COPY package*.json ./
RUN npm ci

COPY index.html vite.config.js ./
COPY favicon.svg ./
COPY public/ ./public/
COPY src/ ./src/

RUN npm run build

# 运行时（同样需要编译 better-sqlite3 原生模块）
FROM node:20-slim
LABEL maintainer="Zentrix"
WORKDIR /app

RUN apt-get update && apt-get install -y --no-install-recommends python3 make g++ \
    && rm -rf /var/lib/apt/lists/*
ENV npm_config_build_from_source=true

COPY package*.json ./
RUN npm ci --omit=dev && npm cache clean --force

COPY --from=build /app/dist/ ./dist/
COPY server/ ./server/

RUN mkdir -p /app/logs /app/data

ENV NODE_ENV=production
ENV PORT=80
ENV LOG_DIR=/app/logs

EXPOSE 80
CMD ["node", "server/index.js"]
