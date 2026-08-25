# AGENTS.md

本文件供 AI 编程助手阅读，包含项目架构要点、目录地图和运维流程，无需反向探索代码即可上手。

## 项目概述

zentrix-index 是个人全栈站点（Vue 3 + Vite + Express），含炉石卡牌/成就/收藏、Todo、意志力追踪、黄粱一梦（AI）、地铁/历史时间线等功能。生产环境通过 GitHub Actions 构建 Docker 镜像部署到 K3s，推送 main 分支即自动部署。

## Git 规则（强制）

- **永远不要 `git push`**，没有权限。本地 commit 后告诉用户手动推送。
- **永远不要自动 commit**。只有用户在当前这一轮明确说"提交/commit"时才执行，上一轮说过不算。
- commit message 用中文，格式 `<类型>: <描述>`；作者 zentrix566。
- 不加任何 AI 联名作者信息。
- 临时脚本用 `.build-tmp-*` 前缀命名，已被 `.gitignore` 忽略。

## 文档与更新日志规范（统一思想）

更新日志文件 `src/data/changelog.js` 是面向用户的站点变更记录，所有条目遵循以下写作原则：

- **只写"功能新增"和"bug 修复"**：每条 changes 必须让用户一眼看出"多了什么能用的东西"或"修了什么影响使用的问题"。不要写内部实现、重构、依赖升级、代码整理这类用户无感知的内容。
- **省略过细的罗列**：不要在条目里逐一列出大量名称或数值。例如补丁更新卡牌时，写"X 张卡牌的卡面与数值已更新"即可，不要罗列全部卡名和逐项数值（如 1/1→2/2、4 费→5 费）；新增一批卡牌时写清版本与数量即可，不要逐一点名。
- **省略实现细节**：不写精确的覆盖率（如 924/948）、打包体积（如 5.2MB→7KB）、文件名示例、密钥来源、样式从哪个 css 迁到哪个 css、默认线路顺序等内部信息；但**用户可感知的安全/隐私要点保留**（如"密钥不暴露给前端""图片在本机生成不上传用户数据"）。
- **bug 修复要写清症状**：用"修复……的问题"句式描述用户遇到的现象（如"统计短暂显示 0""收藏被误清空"），而不是描述代码改了什么。
- **致谢保留**：用户或开源项目贡献者的致谢信息不要删。
- 条目按时间倒序排列；同一天涉及多个模块分别记录，同一天同一 category 只保留一条。title 用中文，category 取 `hearthstone`/`todo`/`willpower`/`site`/`other` 之一，route 指向相关页面。

这条原则同样适用于 README 的功能说明、commit message 之外的任何面向用户的变更说明。

## 目录地图

```
my-index/
├── src/                        # 前端 Vue 3 应用
│   ├── main.js                 # 入口
│   ├── App.vue                 # 根组件
│   ├── router/index.js         # 路由（全部懒加载 feature 页面）
│   ├── auth/useAuth.js         # 客户端登录状态
│   ├── components/             # 全站共享 UI 组件
│   ├── composables/            # 全站共享 composable（主题、反馈等）
│   ├── views/                  # 顶层页面（Home/Projects/About/Login/Settings/Admin 等）
│   ├── data/                   # 静态站点数据（changelog、友链、项目列表）
│   ├── styles/                 # 全局 CSS
│   └── features/               # 各功能模块（每个有独立 index.js 懒加载入口）
│       ├── hearthstone/        # ★ 最大模块：卡牌/成就/收藏/蛙生游戏/计算器
│       ├── todo/               # Todo/日程管理（6 个页面 + API）
│       ├── willpower/          # "抵御心魔"习惯追踪（7 个页面 + API）
│       ├── dream/              # 黄粱一梦 AI 模拟器（DeepSeek 代理）
│       ├── crazy-people/       # 浏览器小游戏
│       ├── history-timeline/   # 中国/世界历史时间线
│       ├── biography/          # 个人传记页
│       ├── subway/             # 地铁距离查询
│       ├── age-calculator/     # 年龄计算器
│       ├── aiops/              # AIOps 控制台
│       └── analytics/          # 统计页
├── server/                     # Express 后端
│   ├── index.js                # 主服务（路由、静态文件、OSS 反代、SPA 回退）
│   ├── auth.js                 # 注册/登录/JWT/bcrypt
│   ├── db.js                   # 数据层统一出口（auth-db + business-db）
│   ├── db/                     # 数据库连接（PG 生产 / SQLite 本地）
│   ├── routes/                 # API 路由（stats 等）
│   ├── migrations/             # PostgreSQL schema 迁移
│   ├── todo/                   # Todo 独立数据层 + 路由
│   ├── willpower/              # 意志力独立数据层 + 路由 + 成就引擎
│   ├── ai-advisor.js           # AI 建议服务端逻辑
│   ├── dream.js                # 黄粱一梦 DeepSeek 代理
│   ├── achievements-meta.js    # 启动时扫描成就 JSON 建 ID 索引
│   ├── mailer.js               # SMTP 邮件
│   ├── logger.js               # 文件日志（90 天轮转）
│   └── local-dev.mjs           # 本地开发用 SQLite 替代 PG
├── scripts/                    # 运维/数据脚本（约 50 个，见下方常用脚本）
├── k8s/                        # Kubernetes 部署清单
├── public/                     # Vite 静态资源（会打进 dist/）
│   └── hearthstone/            # 收藏 JSON（card-backs/hero-skins/coins）
├── tools/                      # 外部配套工具
│   ├── hs-cosmetics-collector/ # C# 采集器（读游戏内存导出收藏/成就）
│   ├── hs-cosmetics-viewer/    # 独立 HTML 导入预览器
│   └── firestone-collection-exporter/  # Firestone 收藏导出 CLI
├── data/                       # 本地 SQLite 数据库 + 备份
├── dist/                       # 构建产物
├── logs/                       # 运行时日志
├── .github/workflows/deploy.yml # CI/CD：push main → Docker 构建 → K3s 部署
├── vite.config.js              # Vite 配置 + 开发代理
├── Dockerfile                  # 多阶段构建（Node 20-slim）
└── package.json                # ESM，scripts 含约 20 个炉石相关命令
```

### hearthstone 模块结构

这是最复杂的功能，单独展开：

```
src/features/hearthstone/
├── index.js                    # 懒加载入口，导出 8 个页面路由
├── pages/                      # 页面组件
│   ├── HearthstoneAchievements.vue  # 成就主页（查看器+编辑器+分享）
│   ├── CardLookup.vue          # 卡牌查询（按名称/dbfId）
│   ├── DeckCodeViewer.vue      # 卡组代码解析
│   ├── HearthstoneCollection.vue   # 外观收藏（皮肤/硬币/卡背）
│   ├── FrogSuspectCard.vue     # 蛙生找茬游戏
│   ├── FrogReviewPage.vue      # 蛙生验收台
│   ├── EventCalculator.vue     # 活动计算器
│   └── TavernPassCalculator.vue # 酒馆战棋通行证计算器
├── components/                 # 约 20 个组件（成就卡、弹窗、筛选栏、卡图库等）
├── composables/                # 核心逻辑
│   ├── useCardDatabase.js      # ★ 共享卡牌库加载器（从 OSS 加载 cards-db.json）
│   ├── useFrogGame.js          # 蛙生游戏逻辑
│   ├── useAchievementCatalog.js # 成就目录加载/筛选
│   ├── useAchievementProgress.js # 进度状态管理
│   ├── useAchievementSprint.js  # 冲刺待办清单
│   ├── useAchievementBackup.js  # 导出/导入进度
│   ├── useAchievementGameImport.js # 从采集器 JSON 导入
│   └── useHearthstoneProfile.js # 固定成就 + 显示偏好
├── utils/                      # 工具函数
│   ├── cardImages.js           # ★ 卡牌图片路径 + CARD_IMAGE_VERSION 版本号
│   ├── achievementCardImages.js # 成就卡图路径
│   ├── deckstring.js           # 卡组代码 base64/varint 解码
│   ├── achievements.js         # 职业映射/搜索/分组
│   ├── achievementRecommendations.js # 规则推荐排序
│   ├── achievementShareImage.js # Canvas 分享图生成
│   ├── cosmetics.js            # 外观类型定义
│   ├── eventCalculator.js      # 活动计算器纯函数
│   └── xpCalculator.js         # 通行证 XP 计算
├── data/                       # 静态数据（import 进 JS 包）
│   ├── achievements/*.json     # 26 个版本的成就定义
│   ├── dbfid-cardnames.json    # dbfId→卡名（卡组解析用）
│   ├── deck-card-images.json   # 卡名→图片路径（约 6000 条）
│   ├── achievement-card-images.json # 成就关联卡图
│   ├── achievement-id-map.json # slug↔游戏内数字 ID
│   ├── expansions.js           # 版本索引
│   ├── version-name-map.js     # 跨系统版本名映射
│   ├── card-back-map.json      # 卡背映射（仅构建脚本用）
│   └── cosmetic-*.json         # 外观相关映射
├── api/                        # 前端 API 调用（progress.js, profile.js）
├── ai/                         # AI 建议组件（实验性）
└── styles/                     # 模块 CSS
```

## 全站公共架构规范

新增功能或修改现有页面前，先检查是否可以复用以下公共层；除非有明确的业务差异，不要在 feature 目录内重新实现一套相同逻辑。

### 公共层职责

| 公共能力 | 统一入口 | 约定 |
|---|---|---|
| 前端 HTTP / JSON 请求 | `src/api/http.js` | 统一处理同源 Cookie、JSON 解析、非 2xx 错误；feature API 只定义业务方法 |
| 日期与时间 | `src/utils/date.js` | 普通日期使用本地日历工具；Todo / Willpower 的自然日使用北京时间工具；不要在页面内重复手写 `padStart` 和 UTC+8 偏移 |
| 全站提示 | `src/composables/useToast.js` + `src/components/ToastHost.vue` | 成功、失败、信息提示统一使用 Toast；不要在页面内新增 `toastMsg` / `toastTimer` |
| Markdown 输出 | `src/components/MarkdownContent.vue` | 统一使用 `markdown-it` 且关闭原始 HTML；AI 报告、AI 对话输出优先复用该组件 |
| 项目入口卡片 | `src/components/ContentCard.vue` | 项目列表、个人工具列表复用同一结构；模块自己的业务卡片不强行套用 |
| 登录保护 | `src/router/index.js` 的 `meta.requiresAuth` | 需要登录的路由必须声明 `requiresAuth: true`，统一由 router guard 跳转登录页；页面内的鉴权代码只作为兼容兜底 |
| UI 语义变量 | `src/styles/main.css` | 优先使用 `--color-*`、`--radius-*`、`--shadow-*` 等语义变量；模块只覆盖品牌色和特殊交互色 |

### 复用与拆分规则

- 同一段逻辑在两个 feature 中出现时，先评估是否属于全站公共能力；属于公共能力就放到 `src/api/`、`src/components/`、`src/composables/` 或 `src/utils/`。
- API 文件只负责 URL、请求方法和业务参数转换，不重复实现响应解析、错误解析和 Cookie 处理。
- 日期工具必须明确时区语义。`formatDateKey()` 是浏览器本地日期，`formatBeijingDateKey()` 是业务自然日；不能为了减少函数数量而混用。
- Markdown 只能渲染可信的、经过安全配置的内容。外部数据或卡牌文本需要白名单过滤，不能直接把原始字符串交给 `v-html`。
- 公共组件负责结构、无障碍属性和基础交互；模块页面负责业务数据、模块主题和特殊布局。
- 新增模块样式时优先使用全局语义变量；如果必须新增变量，命名要表达用途，不要使用难以迁移的页面专属颜色值。
- 修改公共层后必须运行 `npm run check:syntax` 和 `npm run build`，并检查至少一个使用该公共层的实际页面。

## 炉石数据架构

所有炉石图片和数据托管在阿里云 OSS（bucket `my-hearthstone-20260723`，region `cn-beijing`），前端不直连 OSS，全部通过本站相对路径经 Express 反代。

### OSS 路径前缀与反代路由

| OSS 前缀 | 前端路径 | 服务端路由 | 缓存策略 | 用途 |
|---|---|---|---|---|
| `hearthstone-cards/` | `/hearthstone-cards/` | `handleOssProxy` | 1 年 immutable + 版本号 | 卡牌大图/缩略图 |
| `hearthstone-cosmetics/` | `/hearthstone-cosmetics/` | `handleOssProxy` | 1 年 immutable + 版本号 | 英雄皮肤/硬币/卡背图 |
| `hearthstone-data/` | `/hearthstone-data/` | 独立数据路由 | **5 分钟 + ETag，不做服务端缓存** | JSON 数据文件 |
| `site-assets/` | `/site-assets/` | `handleOssProxy` | 1 年 immutable | 站点静态资源 |

关键区别：**图片是不可变资源**（改图换版本号），**数据文件会变**（用短 TTL + ETag，不做服务端缓存）。两套路由的缓存策略不能混用。

### 卡牌数据库（唯一数据源）

- **`cards-db.json`** 是唯一的全量卡牌数据库（约 5.3 MB），由 `scripts/fetch-hs-cards.mjs` 从暴雪国服 API 拉取生成，本地路径 `public/hearthstone/cards-db.json`，线上托管在 OSS `hearthstone-data/cards-db.json`。
- 该文件**不打进 Docker 镜像**（`.dockerignore` 已排除），前端通过 `/hearthstone-data/cards-db.json` 运行时 fetch。
- 共享加载器：`src/features/hearthstone/composables/useCardDatabase.js`，提供：
  - `loadCardDatabase()` — 加载全量库（多页面共享同一次 fetch）
  - `getFrogMinions('standard'|'wild')` — 过滤蛙生游戏随从卡池
  - `loadCardDetailsByName()` — 按卡名索引查卡牌效果
- 标准轮换版本列表 `STANDARD_SETS` 在 `useCardDatabase.js` 顶部，每年轮换时更新。
- `dbfid-cardnames.json`（卡组代码解析用）和 `deck-card-images.json`（卡名→图片路径）是静态 import 进 JS 包的，不随补丁频繁变动。

### 已删除的派生文件（不要再创建）

以下文件曾存在但已废弃，功能统一由 cards-db.json 运行时派生：

- ~~`standard-minions.json`~~ / ~~`wild-minions.json`~~ — 蛙生卡池，改用 `getFrogMinions()`
- ~~`achievement-card-details.json`~~ — 成就卡详情，改用 `loadCardDetailsByName()`
- ~~`guide-table.json`~~ — 死代码
- ~~`scripts/generate-standard-minions.mjs`~~ — 不再需要生成派生文件

## 运维流程

### 更新卡牌数据（补丁改数值/新卡）

数据文件走 5 分钟缓存 + ETag，**不需要重新构建部署**：

```bash
# 1. （可选）先检查上游暴雪 API 是否相比本地有更新
node scripts/check-hs-card-updates.mjs
# 输出有变化的卡牌（费用/攻击/生命/描述）、新增卡、移除卡

# 2. 从暴雪 API 拉最新卡牌数据（仅数据，不下载图片，约 5 秒）
HS_DATA_ONLY=1 node scripts/fetch-hs-cards.mjs
# 会更新 public/hearthstone/cards-db.json 和两份 name 索引清单

# 3. 上传卡牌数据库到 OSS（hearthstone-data/ 前缀）
npm run upload:oss:data
```

上传后最多 5 分钟全量生效（用户强刷立即生效）。如果有新卡面图片，还需把 `cardImages.js` 里的 `CARD_IMAGE_VERSION` 改成当天日期并提交部署（图片用 immutable 缓存，必须改版本号才能刷新浏览器缓存）。

**首次全量拉取**（需要下载图片时）去掉 `HS_DATA_ONLY=1`，直接 `node scripts/fetch-hs-cards.mjs`。

### 更新卡牌图片（补丁改卡面，数值不变）

```bash
# 1. 把新大图放到任意目录，用临时脚本（.build-tmp-upload-*.cjs）上传到 OSS 对应 key
#    OSS key 格式：hearthstone-cards/<版本名>/full/<卡名>_<dbfId>.png
#    缩略图 crop/ 不动
# 2. 把 src/features/hearthstone/utils/cardImages.js 里的 CARD_IMAGE_VERSION 改成当天日期
# 3. 本地提交，让用户手动 push 触发部署
```

### 更新外观收藏（英雄皮肤/硬币/卡背）

相关脚本：`scripts/upload-hs-cosmetics-to-oss.mjs`、`scripts/upload-cosmetic-thumbnails.mjs`、`scripts/upload-hs-card-backs-to-oss.mjs`。缩略图由 `scripts/gen-cosmetic-thumbnails.py`（Pillow）生成 384px WebP。

## 常用脚本速查

| 命令 | 作用 |
|---|---|
| `npm run dev` | 启动 Vite + Express 开发服务器 |
| `npm run build` | 生产构建 |
| `npm run check:syntax` | 语法检查（server/scripts/src） |
| `node scripts/fetch-hs-cards.mjs` | 从暴雪 API 拉卡牌数据+图片 |
| `HS_DATA_ONLY=1 node scripts/fetch-hs-cards.mjs` | 仅更新卡牌数据，不下载图片 |
| `node scripts/check-hs-card-updates.mjs` | 对比暴雪 API 与本地数据差异 |
| `npm run upload:oss:data` | 上传 cards-db.json 到 OSS |
| `node scripts/upload-hs-cards-to-oss.mjs` | 上传卡牌图片到 OSS |
| `npm run upload:oss:cosmetics` | 上传外观图片到 OSS |
| `npm run refresh:hearthstone-cards` | 从 HearthstoneJSON 刷新 dbfId 索引 |

## 关键文件速查

| 文件 | 作用 |
|---|---|
| `server/index.js` | Express 服务端，OSS 反代路由 + 三级图片缓存在此 |
| `vite.config.js` | 开发代理（`/hearthstone-cards`、`/hearthstone-data` 等转到 OSS 或本地） |
| `src/.../utils/cardImages.js` | 卡牌图片路径查表 + `CARD_IMAGE_VERSION` + `withCardImgVersion()` |
| `src/.../composables/useCardDatabase.js` | 全站共享卡牌数据库加载器 |
| `scripts/fetch-hs-cards.mjs` | 从暴雪 API 拉卡牌数据和图片，生成 cards-db.json |
| `scripts/check-hs-card-updates.mjs` | 对比暴雪 API 与本地 cards-db.json 的数值差异 |
| `scripts/upload-hs-data-to-oss.mjs` | 上传 cards-db.json 到 OSS（`npm run upload:oss:data`） |
| `.env` | OSS 凭证等密钥（不入库，参考 `.env.example`） |
| `.github/workflows/deploy.yml` | CI/CD：push main → Docker 构建 → K3s 部署 |

## 服务端缓存机制

图片路由（`handleOssProxy`）有三级缓存：内存 LRU（800 条/128MB）→ 磁盘（`os.tmpdir()/zentrix-hs-cards/`，256MB）→ OSS 回源。缓存键是 `req.path`（不含 query string），所以图片的 `?v=` 版本号不会透传 OSS 也不会产生重复缓存。

数据路由（`/hearthstone-data/*`）**故意不做服务端缓存**，每次回源 OSS 并透传 ETag，确保数据更新后 5 分钟内生效。如果给数据路由加了服务端缓存，更新 OSS 文件后用户将无法及时拿到新数据——除非重启 Pod。
