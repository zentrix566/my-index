# 使用官方 nginx 镜像作为基础镜像
FROM nginx:latest

# 维护者信息
LABEL maintainer="Zentrix"

# 1. 删除默认配置和默认网页，准备放入自定义内容
RUN rm /etc/nginx/nginx.conf && rm -rf /usr/share/nginx/html/*

# 2. 安装 vim 编辑器用于调试
# --no-install-recommends: 不安装推荐的额外依赖，减小镜像体积
# 清理缓存: 删除 apt 缓存减小镜像体积
RUN apt-get update && apt-get install -y --no-install-recommends vim \
    && apt-get clean \
    && rm -rf /var/lib/apt/lists/*

# 3. 复制自定义配置和静态文件到容器中
COPY nginx.conf /etc/nginx/nginx.conf
COPY index.html /usr/share/nginx/html/
COPY favicon.svg /usr/share/nginx/html/
COPY web/*.html /usr/share/nginx/html/

# 声明容器运行时监听的端口
EXPOSE 80

# 启动 nginx 并在前台运行（守护进程关闭）
CMD ["nginx", "-g", "daemon off;"]