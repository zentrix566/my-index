# Zentrix 个人索引

这是一个 Vue/Vite 个人索引站，围绕两条线索组织：**工作项目** 和 **个人项目**。首页给出精简概览，可分别进入"工作项目"和"个人项目"两个板块。

生产环境由 Node.js 服务同时提供 Vue 构建产物和后端 API，账号体系与业务数据采用「认证库 / 业务库」分离设计（均为 PostgreSQL）；Kubernetes 采用单常驻副本、发布时临时扩容一个 Pod 的滚动更新策略。

## 当前内容

- **炉石成就追踪增强**：支持本地规则型冲刺推荐、AI 建议核心/全部版本范围切换、个人中心成就图合成分享，以及按职业浏览时使用硬核模式纳入全部版本。
- **炉石卡牌图库与检索数据**：基于暴雪国服官方 API 全量重建卡牌图（按「卡名_卡id」命名消除同名歧义，全图 png / 缩略图 jpg 按真实格式上传云端），生成 id 索引卡牌库 `cards-db.json` 作为卡片检索数据源；并将权威第三方卡牌库 HearthstoneJSON（zhCN 可收藏卡，含标准 dbfId/id 字段）落地为 `hearthstonejson-zhCN-cards.json` 作为查卡主体数据源，配套命令行查卡工具。成就搜索（含待完成清单）现已跨全版本（含硬核与更多版本）。
- **账户与个人中心（统一账号）**：炉石与抵御心魔共用同一套注册登录体系，一处注册全站通用；支持邮箱激活、设置或修改密码、邮件找回密码，并可查看最近成就动态、成就仪表盘、显示偏好和数据备份。
- **站点后台（owner 专属）**：访问 `/admin` 可查看已注册用户使用各模块（炉石 / 抵御心魔）的情况，含注册与最近活跃时间、按模块彩色标签筛选、从未使用用户统计；模块使用记录在访问对应接口时自动埋点，只记录首次与最近一次访问时间。
- **抵御心魔**：记录每日抵御心魔（扛住/破防）与正能量状态，支持计时挑战、日历回看、AI 复盘分析（今天/上周/本月/指定天/时间段）、成就系统与个性化配置（心魔与正能量种类可拖拽排序、归档）。
- **工作项目**：AIOps MCP Analyzer、CI/CD 流水线实践、项目上云与数据迁移。
- **个人项目**（`/vue-apps`）：把自己写的小页面/小工具收拢成卡片索引，点卡片直接进入：
  - AIOps 智能运维控制台（`/aiops`）：告警筛选、根因分析、MCP 证据与 AI 助手演示。
  - 400 米间歇训练（`/interval-training`）：配速趋势图、评级、日历与导入导出。
  - 人生倒计时（`/countdown`）：按生日与性别估算 35 岁斩杀线、退休与预期寿命。
  - 疯狂的人（`/crazy-people`）：密闭空间发疯小人全自动演示，可当「上帝之手」制造混乱。
  - 世界杯点球大战（`/worldcup`）：拖拽调整角度力度，挑战 AI 守门员的点球游戏。
  - 江阴保卫战形势图（`/jiangyin`）：清军与义军交战路线互动地图，点箭头看事件。
  - 多米诺骨牌（`/domino`）：画一条路线生成骨牌，点推倒看连锁波沿曲线倒下。
  - 炉石传说成就查看器（`/hearthstone`）：按扩展包或职业浏览炉石成就，支持进度保存、最多 10 项置顶追踪、成就分享卡片（已完成/进行中/置顶合集三种模式）、Excel/JSON 导入导出、卡组代码解析与关联卡牌原画查看。
  - 抵御心魔（`/willpower`）：记录每日抵御心魔与正能量，含日历回看、AI 分析与个人中心数据看板，心魔与正能量种类支持自定义、拖拽排序与归档。
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

不连接 PostgreSQL，使用本地 SQLite 测试注册、登录和成就进度：

```bash
npm run dev:local
```

本地模式没有预置测试账号，可直接在注册页面创建账号；认证数据持久保存在 `data/auth.local.db`，业务进度在 `data/app.local.db`，心魔数据在 `data/willpower.local.db`。

## 常用命令

运行语法检查、自动化测试和生产构建：

```bash
npm run check
```

构建生产环境前端产物：

```bash
npm run build
```

本地预览构建产物：

```bash
npm run preview
```

从暴雪国服官方 API 全量拉取卡牌、生成 id 索引卡牌库与图片清单（需本地有外网）：

```bash
node scripts/fetch-hs-cards.mjs
```

从 HearthstoneJSON 下载「可收藏卡牌总库」到本地作为主体卡牌数据源（默认 latest + zhCN，建议 `--version` 锁定补丁号以保证可复现）：

```bash
node scripts/fetch-hsjson-cards.mjs
```

在已落地的 HearthstoneJSON 卡牌库里按 dbfId / 名称 / 版本 / 职业 / 类型 / 稀有度 查卡：

```bash
node scripts/hsjson-query.mjs --dbf 2539
```

将本地卡牌图批量上传到阿里云 OSS（增量；设 `OSS_SKIP_EXISTING=0` 强制覆盖削弱卡旧图）：

```bash
node scripts/upload-hs-cards-to-oss.mjs
```

查看当天的注册、登录和进度更新日志：

```bash
Get-Content -Wait logs/app-$(Get-Date -Format yyyy-MM-dd).log
```

## Docker

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
│   ├── data/             # 项目、训练与 Vue 项目索引数据
│   ├── features/         # 各子项目功能模块（炉石、小游戏、训练与数据看板等）
│   │   └── hearthstone/data/   # 炉石成就 JSON、卡牌清单（cards-db.json / deck-card-images.json / achievement-card-images.json）、HearthstoneJSON 主体卡库 hearthstonejson-zhCN-cards.json 与版本名映射 version-name-map.js
│   ├── router/           # Vue Router
│   ├── styles/           # 全局样式
│   ├── views/            # 页面
│   ├── App.vue
│   └── main.js
├── scripts/             # 数据/资源维护脚本（炉石卡牌抓取、HearthstoneJSON 下载与查卡、OSS 上传、官方端点与数据来源集中模块等）
├── index.html            # Vite 入口
├── vite.config.js
├── Dockerfile            # 多阶段构建镜像
└── README.md
```

## 联系 / 作者

- GitHub: [@zentrix566](https://github.com/zentrix566)

## 许可证

本项目基于 [MIT 许可证](LICENSE) 开源。
