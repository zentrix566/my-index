# AGENTS.md

本文件供 AI 编程助手阅读，包含项目架构要点和运维流程，无需反向探索代码即可上手。

## 项目概述

zentrix-index 是个人全栈站点（Vue 3 + Vite + Express），含炉石卡牌/成就/收藏等功能。生产环境通过 GitHub Actions 构建 Docker 镜像部署到 K3s，推送 main 分支即自动部署。

## Git 规则（强制）

- **永远不要 `git push`**，没有权限。本地 commit 后告诉用户手动推送。
- **永远不要自动 commit**。只有用户在当前这一轮明确说"提交/commit"时才执行，上一轮说过不算。
- commit message 用中文，格式 `<类型>: <描述>`；作者 zentrix566。
- 不加任何 AI 联名作者信息。
- 临时脚本用 `.build-tmp-*` 前缀命名，已被 `.gitignore` 忽略。

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
# 1. 从暴雪 API 拉最新卡牌数据和图片（需外网）
node scripts/fetch-hs-cards.mjs

# 2. 上传更新后的卡牌大图到 OSS（如有卡面变动）
node scripts/upload-hs-cards-to-oss.mjs
# 设 OSS_SKIP_EXISTING=0 可强制覆盖已有图片

# 3. 上传卡牌数据库到 OSS（hearthstone-data/ 前缀）
npm run upload:oss:data
```

上传后最多 5 分钟全量生效（用户强刷立即生效）。如果有新卡面图片，还需把 `cardImages.js` 里的 `CARD_IMAGE_VERSION` 改成当天日期并提交部署（图片用 immutable 缓存，必须改版本号才能刷新浏览器缓存）。

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

## 关键文件速查

| 文件 | 作用 |
|---|---|
| `server/index.js` | Express 服务端，OSS 反代路由 + 三级图片缓存在此 |
| `vite.config.js` | 开发代理（`/hearthstone-cards`、`/hearthstone-data` 等转到 OSS 或本地） |
| `src/.../utils/cardImages.js` | 卡牌图片路径查表 + `CARD_IMAGE_VERSION` + `withCardImgVersion()` |
| `src/.../composables/useCardDatabase.js` | 全站共享卡牌数据库加载器 |
| `scripts/fetch-hs-cards.mjs` | 从暴雪 API 拉卡牌数据和图片，生成 cards-db.json |
| `scripts/upload-hs-cards-to-oss.mjs` | 批量上传卡牌图片到 OSS |
| `scripts/upload-hs-data-to-oss.mjs` | 上传 cards-db.json 到 OSS（`npm run upload:oss:data`） |
| `.env` | OSS 凭证等密钥（不入库，参考 `.env.example`） |
| `.github/workflows/deploy.yml` | CI/CD：push main → Docker 构建 → K3s 部署 |

## 服务端缓存机制

图片路由（`handleOssProxy`）有三级缓存：内存 LRU（800 条/128MB）→ 磁盘（`os.tmpdir()/zentrix-hs-cards/`，256MB）→ OSS 回源。缓存键是 `req.path`（不含 query string），所以图片的 `?v=` 版本号不会透传 OSS 也不会产生重复缓存。

数据路由（`/hearthstone-data/*`）**故意不做服务端缓存**，每次回源 OSS 并透传 ETag，确保数据更新后 5 分钟内生效。如果给数据路由加了服务端缓存，更新 OSS 文件后用户将无法及时拿到新数据——除非重启 Pod。
