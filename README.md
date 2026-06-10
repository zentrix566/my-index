# Zentrix 个人索引

这是一个 Vue/Vite 个人索引站，用来整理 AIOps 项目、间歇训练数据、工具实验和未来网页计划。

部署架构保持为静态站：Vue 构建为 `dist/` 后交给 Nginx 容器托管，`nginx.conf` 继续使用 SPA 回退到 `/index.html`，适合继续挂在既有内网域名下。

## 当前内容

- **项目**：AIOps MCP Analyzer、OpsAgentAI、CI/CD 流水线实践。
- **训练数据**：`/interval-training`，从 `zentrix566.github.io` 的间歇训练数据迁移而来，配速趋势图支持多日期对比并显示横纵坐标网格线。
- **实验室**：预留工具集合和另一个网页入口。
- **关于**：说明站点定位和联系方式。

## 本地开发

```bash
npm install
npm run dev
```

默认访问 Vite 输出的本地地址。

## 构建

```bash
npm run build
npm run preview
```

## Docker / Nginx

```bash
docker build -t my-index .
docker run -d -p 8080:80 my-index
```

访问 http://localhost:8080。

## 目录结构

```text
.
├── src/
│   ├── components/       # 复用组件
│   ├── data/             # 项目和训练数据
│   ├── router/           # Vue Router
│   ├── styles/           # 全局样式
│   ├── views/            # 页面
│   ├── App.vue
│   └── main.js
├── index.html            # Vite 入口
├── vite.config.js
├── nginx.conf            # Nginx 配置
├── Dockerfile            # 多阶段构建镜像
└── README.md
```

## 联系方式

- GitHub: [@zentrix566](https://github.com/zentrix566)
- Email: zentrix566@gmail.com
