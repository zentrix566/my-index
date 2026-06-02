# 云原生作品集

个人作品集网站，展示我的云原生、DevOps 与 AI 运维项目实践。

## 项目介绍

这是一个纯静态作品集网站，当前使用 HTML、CSS、JavaScript 编写，并通过 Nginx 容器提供访问。

当前代码量不大，直接维护静态 HTML 仍然可行；如果项目数量继续增加，建议迁移到 Vue/Vite 或 Astro 这类静态站框架，用数据文件或 Markdown 管理项目内容，减少重复 HTML。

### 已开放项目

- **OpsAgentAI** - 基于 RAG 架构与 Dify 编排的 DevOps 故障智能自愈平台
- **企业级 CI/CD 平台** - 覆盖传统到云原生的标准化持续交付流水线
- **AIOps MCP Analyzer** - 基于 MCP 工具补查、规则分析与 DeepSeek 归因的轻量级 Linux 运维诊断应用

## 技术栈

- **前端**: HTML, CSS, JavaScript
- **Web 服务器**: Nginx
- **容器化**: Docker
- **CI/CD**: GitHub Actions
- **部署**: 支持 Nginx 容器部署到 Kubernetes/K3s，也可以直接托管到 GitHub Pages、Cloudflare Pages 或 Vercel

## 本地运行

### 直接打开

这是静态站，开发调试时可以直接打开 `index.html`。

### 本地静态服务

```bash
python -m http.server 5179
```

访问 http://localhost:5179 即可查看。

### Docker / Nginx

```bash
# 构建镜像
docker build -t my-index .

# 运行容器
docker run -d -p 8080:80 my-index
```

访问 http://localhost:8080 即可查看。

## 部署方式建议

当前项目是纯静态页面，部署方式可以按目标选择：

- **最省心**：GitHub Pages、Cloudflare Pages、Vercel。适合个人主页，推送代码后自动发布，不需要镜像仓库和服务器运维。
- **保留工程实践展示**：Docker + Nginx + K3s。适合展示容器化和 CI/CD 能力，但对个人主页来说链路偏重。
- **内容继续增长时**：迁移到 Vue/Vite + Nginx。Vue 负责组件化和项目数据管理，构建后的 `dist/` 仍然由 Nginx 提供静态访问。

如果后续迁移 Vue/Vite，推荐结构：

```text
src/
├── data/projects.json
├── components/
│   ├── NavBar.vue
│   ├── FooterBar.vue
│   └── ProjectCard.vue
└── views/
    ├── HomeView.vue
    └── ProjectDetailView.vue
```

## 目录结构

```
.
├── css/           # 样式文件
├── js/            # JavaScript 文件
├── projects/      # 项目详情页面
│   ├── opsagentai.html
│   ├── cicd-architecture.html
│   └── aiops-mcp-analyzer.html
├── index.html     # 首页
├── nginx.conf     # Nginx 配置
├── Dockerfile     # Docker 镜像构建
└── README.md      # 说明文档
```

## 联系方式

- GitHub: [@zentrix566](https://github.com/zentrix566)
- Email: zentrix566@gmail.com

欢迎交流云原生、DevOps、AI 运维相关话题！
