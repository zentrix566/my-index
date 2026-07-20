# Zentrix 个人索引

这是一个 Vue/Vite 个人索引站，围绕两条线索组织：**运维/AIOps 项目** 和 **我自己写的 Vue 项目**。首页给出精简概览，可分别进入「项目」和「Vue 项目」两个板块。

生产环境由 Node.js 服务同时提供 Vue 构建产物和后端 API，用户、登录状态与成就进度存储在 PostgreSQL；Kubernetes 采用单常驻副本、发布时临时扩容一个 Pod 的滚动更新策略。

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
  - 炉石传说成就查看器（`/hearthstone`）：按扩展包或职业浏览炉石成就，支持职业折叠总览、筛选、攻略展示、查看卡牌原画和一键复制推荐卡组代码。内置注册登录与「我的成就」模式，可保存个人完成进度、按版本/职业分组、筛选完成状态、统计完成度，并在统一的「冲刺推荐」中按剩余投入分档查看目标；进度更新会写入服务端操作日志。
- **关于**：说明站点定位和联系方式。

## 更新说明

### 2026-07-20

- 使用 UI/UX Pro Max 重构炉石子项目界面，统一为深色炉石风格，并优化首页概览、筛选器、成就卡片、登录注册页、进度编辑弹窗和移动端布局。
- 合并「快完成」与「推荐冲刺」为「冲刺推荐」，按 A～E 五档展示目标；版本、职业筛选会统一作用于列表和数量统计，避免有时显示全部、有时只显示选中项。
- 完善注册与登录异常处理，后端不可用或返回空响应时显示明确提示，避免前端出现 JSON 解析错误。
- 新增不依赖 PostgreSQL 的本地验证模式，账号和进度仅保存在当前进程内，方便快速测试注册、登录和进度更新。
- 注册、登录、登出和成就进度更新继续写入按日期拆分的应用日志 `logs/app-YYYY-MM-DD.log`；容器内默认位置为 `/app/logs/`。
- Kubernetes 部署改为 `RollingUpdate`，发布期间最多临时增加一个 Pod，并补充启动、就绪、存活探针和优雅停机，减少单常驻副本更新时的短暂 502。

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

不连接 PostgreSQL，使用进程内存测试注册、登录和成就进度：

```bash
npm run dev:local
```

本地模式没有预置测试账号，可直接在注册页面创建账号；服务停止后账号和进度会清空。

## 常用命令

构建生产环境前端产物：

```bash
npm run build
```

本地预览构建产物：

```bash
npm run preview
```

查看当天的注册、登录和进度更新日志：

```bash
Get-Content -Wait logs/app-$(Get-Date -Format yyyy-MM-dd).log
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
