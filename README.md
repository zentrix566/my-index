# Zentrix 个人索引

这是一个 Vue/Vite 个人索引站，围绕两条线索组织：**运维/AIOps 项目** 和 **我自己写的 Vue 项目**。首页给出精简概览，可分别进入「项目」和「Vue 项目」两个板块。

部署架构保持为静态站：Vue 构建为 `dist/` 后交给 Nginx 容器托管，`nginx.conf` 继续使用 SPA 回退到 `/index.html`，适合继续挂在既有内网域名下。

## 当前内容

- **项目**：AIOps MCP Analyzer、OpsAgentAI、CI/CD 流水线实践。
- **Vue 项目**（`/vue-apps`）：把自己写的小页面/小工具收拢成卡片索引，点卡片直接进入：
  - AIOps 智能运维控制台（`/aiops`）：告警筛选、根因分析、MCP 证据与 AI 助手演示。
  - 400 米间歇训练（`/interval-training`）：配速趋势图、评级、日历与导入导出。
  - 人生倒计时（`/countdown`）：按生日与性别估算 35 岁斩杀线、退休与预期寿命。
  - 疯狂的人（`/crazy-people`）：密闭空间发疯小人全自动演示，可当「上帝之手」制造混乱。
  - 世界杯点球大战（`/worldcup`）：拖拽调整角度力度，挑战 AI 守门员的点球游戏。
  - 江阴保卫战形势图（`/jiangyin`）：清军与义军交战路线互动地图，点箭头看事件。
  - 多米诺骨牌（`/domino`）：画一条路线生成骨牌，点推倒看连锁波沿曲线倒下。
  - 炉石传说成就查看器（`/hearthstone`）：按扩展包或职业浏览炉石成就，支持职业折叠总览、筛选、攻略展示、查看卡牌原画和一键复制推荐卡组代码。内置注册登录与「我的成就」模式，可保存个人完成进度、按版本/职业分组、筛选完成状态、统计完成度，以及查看「快完成」和「推荐冲刺」目标；进度更新会写入服务端操作日志。
- **关于**：说明站点定位和联系方式。

## 运行方式

安装依赖：

```bash
npm install
```

同时启动前端开发服务器和后端服务：

```bash
npm run dev
```

默认访问 Vite 输出的本地地址。

## 常用命令

构建生产环境前端产物：

```bash
npm run build
```

本地预览构建产物：

```bash
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
│   ├── components/       # 复用组件（项目卡片网格、Vue 项目卡片网格）
│   ├── crazy-people/     # 「疯狂的人」小游戏（组件/游戏逻辑/主循环）
│   ├── hearthstone-achievements/  # 炉石传说成就查看器（组件/数据/卡牌图片）
│   ├── data/             # 项目、训练与 Vue 项目索引数据
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

## 联系 / 作者

- GitHub: [@zentrix566](https://github.com/zentrix566)
- Email: zentrix566@gmail.com

## 许可证

本项目基于 [MIT 许可证](LICENSE) 开源。
