# 多阶段构建：最终运行阶段
# 使用 alpine 版本减小镜像体积，锁定具体版本
FROM nginx:1.25-alpine

# 维护者信息
LABEL maintainer="Zentrix"

# 删除默认配置和默认网页，准备放入自定义内容
RUN rm /etc/nginx/nginx.conf && rm -rf /usr/share/nginx/html/*

# 复制自定义配置和静态文件到容器中
COPY nginx.conf /etc/nginx/nginx.conf
COPY index.html /usr/share/nginx/html/
COPY favicon.svg /usr/share/nginx/html/
COPY css/ /usr/share/nginx/html/css/
COPY js/ /usr/share/nginx/html/js/
COPY projects/ /usr/share/nginx/html/projects/

# 声明容器运行时监听的端口
EXPOSE 80

# 启动 nginx 并在前台运行（守护进程关闭）
CMD ["nginx", "-g", "daemon off;"]