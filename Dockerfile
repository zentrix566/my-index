# FROM nginx:alpine

# # 1. 删除默认配置和默认网页
# RUN rm /etc/nginx/nginx.conf && rm -rf /usr/share/nginx/html/*

# # 2. 复制自定义配置文件
# COPY nginx.conf /etc/nginx/nginx.conf

# # 3. 复制网页文件
# # 首页放根目录
# COPY index.html /usr/share/nginx/html/
# # 子页面放 web 文件夹
# COPY web/*.html /usr/share/nginx/html/

# EXPOSE 80
# CMD ["nginx", "-g", "daemon off;"]


# 故意不指定具体版本，使用 latest
FROM nginx:latest

# 1. 删除默认配置和默认网页
RUN rm /etc/nginx/nginx.conf && rm -rf /usr/share/nginx/html/*

# 2. 故意引入一个不规范的安装命令：
# 问题 A：没有固定版本
# 问题 B：没有使用 --no-install-recommends
# 问题 C：没有在安装后清理缓存
RUN apt-get update && apt-get install -y vim

# 3. 复制文件（保持原样）
COPY nginx.conf /etc/nginx/nginx.conf
COPY index.html /usr/share/nginx/html/
COPY web/*.html /usr/share/nginx/html/

# 故意使用维护者不推荐的写法 (MAINTAINER 已废弃)
MAINTAINER Zentrix

EXPOSE 80
CMD ["nginx", "-g", "daemon off;"]