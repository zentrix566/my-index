# Zentrix 个人索引

这是一个 Vue/Vite 个人索引站，围绕两条线索组织：**工作项目** 和 **个人作品**。首页给出精简概览，工作实践、互动页面与实用工具统一收录在项目索引中。

生产环境由 Node.js 服务同时提供 Vue 构建产物和后端 API，账号体系与业务数据采用「认证库 / 业务库」分离设计（均为 PostgreSQL）；Kubernetes 采用单常驻副本、发布时临时扩容一个 Pod 的滚动更新策略。

## 当前内容

- **炉石成就追踪增强**：支持本地规则型冲刺推荐、AI 建议核心/全部版本范围切换、个人中心成就图合成分享，以及按职业浏览时使用硬核模式纳入全部版本；按职业浏览与我的成就已取消版本分组（跨版本平铺总览，版本按发布时间从新到旧），"我的成就 - 按职业"与"待完成清单"采用一致的分组（一次性成就 / 累计-次数 / 累计-点数，组内剩余从低到高、已完成排在组尾，分组默认收起可展开），硬核模式与三个视图切换同排显示并对全部视图生效。支持导入采集器导出的 `achievements.json` 一键同步游戏内成就进度（经 `achievement-id-map.json` 将游戏数字 ID 映射为站内成就，预览确认后合并，只推进不回退）。
- **炉石外观收藏**：集中管理英雄皮肤、幸运币和卡背，支持按职业浏览、名称搜索、独立进度、已拥有优先及未拥有黑白显示；登录后收藏状态持久化到独立明细表，外观图片使用英文目录存储于 OSS，并提供下载、客户端提取、清单检查与增量上传脚本。收藏分页支持首页、末页与跳至指定页，每页显示个数可按外观类型分别设置并自动记忆，暂缺图片的外观可标记隐藏避免裂图；列表使用 WebP 缩略图并采用占位加淡入的加载方式，图片加载超时自动兜底防永久转圈，详情弹窗仍显示原图。收藏采集工具（`tools/hs-cosmetics-collector/`，C# Windows 图形界面程序）读取游戏内存生成 `cosmetics.json` 与 `achievements.json`，网站端选择文件即可预览并导入已拥有外观与成就进度，导入时自动剔除目录重建后遗留的旧 ID；导入后发现标记有误时，可用「批量设为未拥有」一键清空当前类型的已拥有项并带二次确认，便于重新采集导入。收藏页与卡牌查询页的大体量目录数据（皮肤/幸运币/卡背/卡牌库，合计约 6.3MB）放在 `public/hearthstone/` 按需加载并被浏览器长效缓存，页面脚本体积缩减 95% 以上，发版不会让用户重复下载未变化的数据。采集器下载包文件名带版本号（`hs-cosmetics-collector-vX.Y.Z.zip`），可用 `tools/hs-cosmetics-collector/build-release.ps1` 一键构建并生成带版本号的发布包与 SHA256（本机无 .NET SDK 时脚本自动下载 Roslyn 编译器，构建后请将生成的 zip 提交到仓库以更新下载）。
- **炉石卡牌图库与检索数据**：基于暴雪国服官方 API 全量重建卡牌图（按「卡名_卡id」命名消除同名歧义，全图 png / 缩略图 jpg 按真实格式上传云端），生成 `cards-db.json` 供图片上传和未来卡片检索使用；卡组代码解析统一读取由 HearthstoneJSON 最新 zhCN 全量库生成的 `dbfid-cardnames.json`，覆盖可收藏卡、衍生卡、英雄与历史卡牌。成就搜索（含待完成清单）现已跨全版本（含硬核与更多版本），并支持按成就内容匹配（阶段描述、关联卡牌）而不只是标题。
- **全局账号中心（统一账号）**：炉石与抵御心魔共用同一套注册登录体系，主导航及项目内部均保留登录入口；登录后可从任意页面进入账号中心或退出。账号中心集中管理邮箱、密码和全站偏好，并按模块进入炉石档案与心魔档案。
- **全站主题**：主站、账号页面、炉石和抵御心魔统一使用白天/黑夜主题，顶部主题开关会同步所有模块的显示模式。
- **项目快捷导航**：顶部工作项目下拉可直达三个工作项目，个人项目下拉可进入炉石、抵御心魔或定位到完整个人项目列表。
- **站点后台（owner 专属）**：访问 `/admin` 可通过标签页查看用户与模块使用情况和访问统计，含注册与最近活跃时间、按模块筛选和从未使用用户统计；访问统计进入页面时加载一次、展示最近 20 条记录，并支持按需手动刷新；模块使用记录只保存首次与最近一次访问时间。
- **抵御心魔**：记录每日抵御心魔（扛住/破防）与正能量状态，支持计时挑战、日历回看、AI 复盘分析（今天/上周/本月/指定天/时间段）、成就系统与个性化配置（心魔与正能量种类可拖拽排序、归档）。
- **日程管理（Todo）**：轻量任务管理，任务支持待办、进行中、已延期、等待中、已完成、已取消六态切换，复用全站统一登录；任务按「今日待办 / 今日已完成」视图组织，新增、修改或删除后导航角标实时刷新；支持自定义分组（默认 工作/学习/生活，可增删，并记住上次新建任务使用的分组）、优先级、日历月/周视图（周视图默认、周一为起始、含热力统计，任务按状态稳定排序）与日程 AI 分析（今日/本周/本月，由 DeepSeek 生成）；今日已完成支持一键导出分享图片；数据独立存于 `data/todo.local.db`（生产为独立 PostgreSQL 库 `zentrix_todo`），与主站账号体系完全隔离。
- **工作项目**：AIOps MCP Analyzer、CI/CD 流水线实践、项目上云与数据迁移。
- **个人作品**（`/projects`）：与工作项目共用项目索引，把自己写的小页面和工具收拢成卡片，点卡片直接进入：
  - AIOps 智能运维控制台（`/aiops`）：告警筛选、根因分析、MCP 证据与 AI 助手演示。
  - 人生倒计时（`/countdown`）：按生日与性别估算 35 岁斩杀线、退休与预期寿命。
  - 年龄计算器（`/age-calculator`）：按出生年份与特定年份计算年龄，支持公元前、跨纪元和停止输入后自动计算。
  - 疯狂的人（`/crazy-people`）：密闭空间发疯小人全自动演示，可当「上帝之手」制造混乱。
  - 多米诺骨牌（`/domino`）：画一条路线生成骨牌，点推倒看连锁波沿曲线倒下。
  - 炉石传说成就查看器（`/hearthstone`）：按扩展包或职业浏览炉石成就，支持进度保存、最多 10 项置顶追踪、成就分享卡片（已完成/进行中/置顶合集三种模式）、Excel/JSON 导入导出、卡组代码解析与关联卡牌原画查看。
  - 战令经验计算器（`/hearthstone/xp`）：按当前等级、每日任务、对战时长、周任务与战令加成模拟每日经验，支持目标等级预计完成日期与按月进度日历（周任务计入周一，可判断版本内能否达成）。
  - 活动计算器（`/hearthstone/event`）：按活动时间、每日/周任务点数、满级目标与当前已有点数推算预计满级日期与还需游玩时长；以进度日历为首屏，支持把日历与累计曲线一键导出为图片。
  - 抵御心魔（`/willpower`）：记录每日抵御心魔与正能量，含日历回看、AI 分析与个人中心数据看板，心魔与正能量种类支持自定义、拖拽排序与归档。
  - 日程管理（`/todo`）：轻量待办与日程，含今日待办/已完成视图、自定义分组（默认 工作/学习/生活，可增删）、优先级、日历月/周视图（周视图默认、周一为起始）与日程 AI 分析、今日已完成图片导出。
  - 黄粱一梦（`/dream`）：输入当前年龄、期望寿命与人生野心，由 DeepSeek 流式生成按时间线铺陈的人间大梦；API Key 仅存服务端，前端经 `/api/dream` 代理调用，绝不暴露密钥。
  - 蛙生模拟器（`/hearthstone/frog`）：三张随从中有一张被蛙生悄悄动了手脚，玩家需揪出假牌；混淆类型可勾选（默认法力值、攻击、生命做 ±1 微调），卡图走 OSS 反向代理；默认只收录标准模式随从，打开「狂野模式」开关后狂野模式的可收藏随从也并入卡池；另设「卡牌修改验收台」（`/hearthstone/frog/review`）对照原始卡与修改后卡、可显示补丁边界。
- **全站更新日志**（`/changelog`）：主站、炉石、抵御心魔、日程管理与其他工具共用一份日志数据，可按模块筛选。
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

运行语法检查和生产构建：

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

为外观原图（英雄皮肤、幸运币、卡背）生成列表用的 WebP 缩略图，输出到各类型下的 `384/` 子目录（需先安装 Pillow：`pip install Pillow`）：

```bash
python scripts/gen-cosmetic-thumbnails.py
```

将上一步生成的外观缩略图上传到阿里云 OSS（对象键 `hearthstone-cosmetics/.../384/*.webp`，公共读 + 长缓存）：

```bash
node scripts/upload-cosmetic-thumbnails.mjs
```

查看当天的注册、登录和进度更新日志：

```bash
Get-Content -Wait logs/app-$(Get-Date -Format yyyy-MM-dd).log
```

从 wiki.ifindhs.com 下载全部卡背原图到本地（供人工核对图片质量）：

```bash
node scripts/download-card-backs-wiki.mjs
```

生成卡背对照画廊 HTML（每张图标注 ID、名称与图片到位情况，方便人工核对）：

```bash
node scripts/gen-card-back-gallery.mjs
```

## 炉石收藏与成就采集工具（Windows）

`tools/hs-cosmetics-collector/` 是一个 C# Windows 图形界面程序（WinForms），趁游戏运行时读取《炉石传说》内存，一键导出 `cosmetics.json`（已拥有的卡背/幸运币/英雄皮肤）与 `achievements.json`（成就逐条进度），供网站「炉石收藏」与「炉石成就」页面导入。

- **使用**：启动炉石 → 双击 `HsCosmeticsCollector.exe` → 等顶部两个状态灯变绿 → 点「开始采集」→ 按摘要提示把两个 JSON 在网站导入（成就导入只推进进度、不回退已有勾选）。
- **运行环境**：电脑系统为 Windows，需 **.NET Framework 4.8**（Windows 10 / 11 一般已自带，无需额外安装）。
- **缺少运行库时**：若双击 `hs-cosmetics-collector.exe` 报错「找不到 .NET Framework」或「需要 .NET Framework 4.8」，请前往微软官网下载并安装 .NET Framework 4.8 运行时：
  - 下载地址：<https://dotnet.microsoft.com/download/dotnet-framework/net48>
- **杀毒误报**：程序需读取游戏内存，未签名的小工具可能被杀软启发式误判，加白名单即可；下载后可按发布说明核对 SHA256。exe 已嵌入图标、完整版本信息与 manifest 以降低误报概率。
- **成就 ID 映射**：游戏内成就数字 ID 与站内成就的对应表由 `node scripts/build-achievement-id-map.mjs --hs-data <hs-achievement-data.json 路径>` 生成（`src/features/hearthstone/data/achievement-id-map.json`）。
- **重新构建发布包**（可选，开发者用）：运行 `tools/hs-cosmetics-collector/build-release.ps1` 生成带版本号的 `hs-cosmetics-collector-vX.Y.Z.zip` 并输出 SHA256；本机没有 .NET SDK 时脚本会自动下载 Roslyn 编译器编译。构建后请将生成的 zip 提交到仓库以更新下载。

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
├── scripts/             # 数据/资源维护脚本（炉石卡牌抓取、dbfId 索引刷新与查询、OSS 上传、卡背下载与核对、外观采集验证等）
├── tools/               # 炉石外观采集工具（C# Windows 程序）与导入器查看器（Node 服务 + HTML 模板）
├── public/              # Vite 静态资源（采集工具下载包、卡牌查询用的 cards-db.json）
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
