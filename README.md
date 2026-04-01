# 云原生作品集

个人作品集网站，展示我的云原生 & DevOps 项目实践。

## 项目介绍

基于 Nginx 的静态网站，容器化部署，展示我的技术项目与经验。

### 已开放项目

- **OpsAgentAI** - 基于 RAG 架构与 Dify 编排的 DevOps 故障智能自愈平台
- **企业级 CI/CD 平台** - 覆盖传统到云原生的标准化持续交付流水线

## 技术栈

- **前端**: HTML, CSS, JavaScript
- **Web 服务器**: Nginx
- **容器化**: Docker
- **CI/CD**: GitHub Actions
- **部署**: 支持容器化部署到 Kubernetes

## 本地运行

```bash
# 构建镜像
docker build -t my-index .

# 运行容器
docker run -d -p 8080:80 my-index
```

访问 http://localhost:8080 即可查看。

## 目录结构

```
.
├── css/           # 样式文件
├── js/            # JavaScript 文件
├── projects/      # 项目详情页面
├── index.html     # 首页
├── nginx.conf     # Nginx 配置
├── Dockerfile     # Docker 镜像构建
└── README.md      # 说明文档
```

## 联系方式

- GitHub: [@zentrix566](https://github.com/zentrix566)
- Email: zentrix566@gmail.com

欢迎交流云原生、DevOps、AI 运维相关话题！
