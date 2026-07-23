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

# 卡牌图 OSS 基地址：构建时经 docker build-arg 传入（Vite 在 build 时把 import.meta.env.VITE_* 编译进产物）。
# 必须在此处声明 ARG 并以 ENV 注入，否则 vite build 读不到 VITE_OSS_BASE，线上图片会回退失败。
ARG VITE_OSS_BASE
ENV VITE_OSS_BASE=$VITE_OSS_BASE

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
# 成就定义 JSON：运行时 achievements-meta.js 需要扫描它来写中文名/版本/职业。
# 线上镜像没有 src/，必须显式复制到 server/achievements-data/（meta 的第 2 候选路径）。
COPY src/hearthstone-achievements/data/achievements ./server/achievements-data/
# 硬核模式过滤用的核心版本 ID 列表（ai-advisor.js 在生产镜像里的第 1 候选路径）。
COPY src/hearthstone-achievements/data/core-expansion-ids.js ./server/achievements-data/

RUN mkdir -p /app/logs /app/data

ENV NODE_ENV=production
ENV PORT=80
ENV LOG_DIR=/app/logs

EXPOSE 80
CMD ["node", "server/index.js"]
