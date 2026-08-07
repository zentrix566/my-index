# Zentrix 个人索引

这是一个 Vue/Vite 个人索引站，围绕两条线索组织：**工作项目** 和 **个人作品**。首页给出精简概览，工作实践、互动页面与实用工具统一收录在项目索引中。

生产环境由 Node.js 服务同时提供 Vue 构建产物和后端 API，账号体系与业务数据采用「认证库 / 业务库」分离设计（均为 PostgreSQL）；Kubernetes 采用单常驻副本、发布时临时扩容一个 Pod 的滚动更新策略。

## 当前内容

- **炉石成就追踪增强**：支持本地规则型冲刺推荐、AI 建议核心/全部版本范围切换、个人中心成就图合成分享，以及按职业浏览时使用硬核模式纳入全部版本；按职业浏览与我的成就已取消版本分组（跨版本平铺总览，版本按发布时间从新到旧），"我的成就 - 按职业"与"待完成清单"采用一致的分组（一次性成就 / 累计-次数 / 累计-点数，组内剩余从低到高、已完成排在组尾，分组默认收起可展开），硬核模式与三个视图切换同排显示并对全部视图生效。
- **炉石卡牌图库与检索数据**：基于暴雪国服官方 API 全量重建卡牌图（按「卡名_卡id」命名消除同名歧义，全图 png / 缩略图 jpg 按真实格式上传云端），生成 `cards-db.json` 供图片上传和未来卡片检索使用；卡组代码解析统一读取由 HearthstoneJSON 最新 zhCN 全量库生成的 `dbfid-cardnames.json`，覆盖可收藏卡、衍生卡、英雄与历史卡牌。成就搜索（含待完成清单）现已跨全版本（含硬核与更多版本），并支持按成就内容匹配（阶段描述、关联卡牌）而不只是标题。
- **账户与个人中心（统一账号）**：炉石与抵御心魔共用同一套注册登录体系，一处注册全站通用；支持邮箱激活、设置或修改密码、邮件找回密码，并可查看最近成就动态、成就仪表盘、显示偏好和数据备份。
- **站点后台（owner 专属）**：访问 `/admin` 可通过标签页查看用户与模块使用情况和访问统计，含注册与最近活跃时间、按模块筛选和从未使用用户统计；模块使用记录只保存首次与最近一次访问时间。
- **抵御心魔**：记录每日抵御心魔（扛住/破防）与正能量状态，支持计时挑战、日历回看、AI 复盘分析（今天/上周/本月/指定天/时间段）、成就系统与个性化配置（心魔与正能量种类可拖拽排序、归档）。
- **工作项目**：AIOps MCP Analyzer、CI/CD 流水线实践、项目上云与数据迁移。
- **个人作品**（`/projects`）：与工作项目共用项目索引，把自己写的小页面和工具收拢成卡片，点卡片直接进入：
  - AIOps 智能运维控制台（`/aiops`）：告警筛选、根因分析、MCP 证据与 AI 助手演示。
  - 400 米间歇训练（`/interval-training`）：配速趋势图、评级、日历与导入导出。
  - 人生倒计时（`/countdown`）：按生日与性别估算 35 岁斩杀线、退休与预期寿命。
  - 疯狂的人（`/crazy-people`）：密闭空间发疯小人全自动演示，可当「上帝之手」制造混乱。
  - 世界杯点球大战（`/worldcup`）：拖拽调整角度力度，挑战 AI 守门员的点球游戏。
  - 江阴保卫战形势图（`/jiangyin`）：清军与义军交战路线互动地图，点箭头看事件。
  - 多米诺骨牌（`/domino`）：画一条路线生成骨牌，点推倒看连锁波沿曲线倒下。
  - 炉石传说成就查看器（`/hearthstone`）：按扩展包或职业浏览炉石成就，支持进度保存、最多 10 项置顶追踪、成就分享卡片（已完成/进行中/置顶合集三种模式）、Excel/JSON 导入导出、卡组代码解析与关联卡牌原画查看。
  - 战令经验计算器（`/hearthstone/xp`）：按当前等级、每日任务、对战时长、周任务与战令加成模拟每日经验，支持目标等级预计完成日期与按月进度日历（周任务计入周一，可判断版本内能否达成）。
  - 抵御心魔（`/willpower`）：记录每日抵御心魔与正能量，含日历回看、AI 分析与个人中心数据看板，心魔与正能量种类支持自定义、拖拽排序与归档。
- **全站更新日志**（`/changelog`）：主站、炉石与抵御心魔共用一份日志数据，可按模块筛选。
- **关于**：说明站点定位，并提供 GitHub 主页、项目源码和邮箱联系方式。

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

从 HearthstoneJSON 最新 zhCN 全量库刷新卡组解析使用的唯一 dbfId 索引：

```bash
npm run refresh:hearthstone-cards
```

在卡组解析索引里按 dbfId、名称或稀有度查卡：

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
│   ├── data/             # 项目、个人作品、友情链接与全站更新日志数据
│   ├── features/         # 各子项目功能模块（炉石、小游戏、训练与数据看板等）
│   │   └── hearthstone/data/   # 炉石成就 JSON、卡组 dbfId 索引、卡牌及图片清单与版本名映射
│   ├── router/           # Vue Router
│   ├── styles/           # 全局样式
│   ├── views/            # 页面
│   ├── App.vue
│   └── main.js
├── scripts/             # 数据/资源维护脚本（炉石卡牌抓取、dbfId 索引刷新与查询、OSS 上传、官方端点与数据来源说明等）
├── index.html            # Vite 入口
├── vite.config.js
├── Dockerfile            # 多阶段构建镜像
└── README.md
```

## 联系 / 作者

- GitHub: [@zentrix566](https://github.com/zentrix566)
- 项目源码: [zentrix566/my-index](https://github.com/zentrix566/my-index)
- 邮箱: [1987247500@qq.com](mailto:1987247500@qq.com)

## 许可证

本项目基于 [MIT 许可证](LICENSE) 开源。
