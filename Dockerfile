FROM node:20-alpine AS build

WORKDIR /app

COPY package*.json ./
RUN npm ci

COPY index.html vite.config.js ./
COPY favicon.svg ./
COPY public/ ./public/
COPY src/ ./src/

RUN npm run build

FROM node:20-alpine

LABEL maintainer="Zentrix"

WORKDIR /app

# 安装生产依赖（Express + 日志 + 地理定位）
COPY package*.json ./
RUN npm ci --omit=dev && npm cache clean --force

# 复制构建产物、服务端代码和成就数据
COPY --from=build /app/dist/ ./dist/
COPY server/ ./server/
COPY data/ ./data/

# 创建日志目录（将通过 K8s hostPath 挂载到宿主机）
RUN mkdir -p /app/logs

ENV NODE_ENV=production
ENV PORT=80
ENV LOG_DIR=/app/logs

EXPOSE 80

CMD ["node", "server/index.js"]
