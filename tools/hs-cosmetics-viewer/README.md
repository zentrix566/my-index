# 炉石外观收藏 · 采集器 + 网站导入器

一套**给网站用户自助使用**的工具链：用户自己开炉石 → 跑采集器出文件 → 上传到网站看收藏。
不需要开发者介入，也不依赖主站登录态。

## 两部分

### 1) 采集器（桌面程序，Windows）
`tools/hs-cosmetics-collector/` → 构建产物打包在
**`tools/hs-cosmetics-collector/dist/hs-cosmetics-collector.zip`**。

- 趁《炉石传说》运行期间，通过 Firestone 的 UnitySpy 内存库读取你**已拥有**的
  卡背 / 幸运币 / 英雄皮肤 / 成就，输出 2 个 JSON：
  `cosmetics.json`（卡背 `ids`=cardBackId、硬币 `ids`=dbfId、皮肤 `ids`=cardId 如 `HERO_01`，合并于一文件）、
  `achievements.json`（含 `items` 逐条明细：每个成就的 `id` / `status` / `statusText` / `progress` / `isComplete`）。
- 用法见压缩包内 `README.txt`：保持 `lib/` 与 exe 同级，开炉石后双击 exe 即可，
  文件会生成在 exe 同目录。
- 已验证：仓库外（解压到任意目录）双击即可运行并正确输出。

### 2) 网站导入器（纯静态网页，免服务器）
`tools/hs-cosmetics-viewer/dist-importer/index.html`（由
`build-importer.mjs` 把本地目录注入模板生成，**单文件、自包含**）。

- 用户上传上面 2 个 JSON，浏览器本地解析并渲染：按职业分组的皮肤、
  卡背/硬币网格（已拥有高亮）、成就进度条 + **逐条成就明细**（可按状态筛选：已完成/已领奖/进行中/未开始，按 ID 搜索）。
- **全部在浏览器本地处理，不上传任何服务器。**
- 双击打开（file://）或挂在网站上均可。

## 给网站用户的完整流程
1. 网站放一个下载链接指向 `hs-cosmetics-collector.zip`。
2. 用户下载解压 → 开炉石 + Firestone → 双击 `HsCosmeticsCollector.exe` → 得到 2 个 JSON（`cosmetics.json` + `achievements.json`）。
3. 用户打开网站导入页（`dist-importer/index.html`）→ 上传这 2 个文件 → 看自己的收藏。

## 部署（网站管理员）
- 把 `tools/hs-cosmetics-viewer/dist-importer/` 整个目录挂到站点，例如 `/hearthstone-cosmetics/`。
- 把 `tools/hs-cosmetics-collector/dist/hs-cosmetics-collector.zip` 放到可下载位置并链接。
- 本地目录（卡背/硬币/皮肤名称）需要更新时，重跑：
  ```bash
  node tools/hs-cosmetics-viewer/build-importer.mjs
  ```
  重新生成 `dist-importer/index.html`（目录数据来自 `src/features/hearthstone/data/`）。

## 已知限制
- 采集器读的是「已拥有」集合；游戏收藏界面的「总数」可能略多（含默认/未解锁项），
  且工具不读「总数」接口，只报已拥有数。
- 个别最新内容若本地目录未更新，名称会暂时缺失（ID 仍正确显示）。
- 硬币 `1746` 在当前本地目录无名称数据，属目录待补全项，不影响已拥有数（ID 正确）。
- 成就逐条明细（`achievements.json` 的 `items`）来自 `GetAchievementsInfo()`：每个成就含
  `id`(数字 AchievementId) / `status`(1未开始·2进行中·3已完成未领奖·4已领奖) / `progress` / `isComplete`。
  本地目录使用自定义 slug（如 `dragons-001`），与内存数字 ID 无直接映射，故成就明细**只显示数字 ID 与状态，不显示名称**
  （ID 可与游戏内成就编号对照；如需名称需另行建立数字 ID→名称 映射表）。
- 官方「总完成」(4117) 与内存逐条完成(4145) 相差 28：后者把「已完成但未在官方完成计数中」的成就也计为完成，
  属正常差异（多为刚完成/账号级成就）。

## 开发/调试（开发者）
- 采集器源码：`tools/hs-cosmetics-collector/Program.cs`（net48，需 .NET Framework 4.8 引用集，
  本机用 `dotnet build -c Release`；运行时 DLL 优先用 `lib/`，其次 Firestone 安装目录）。
- 导入器模板：`tools/hs-cosmetics-viewer/importer-template.html`；构建：`build-importer.mjs`。
- 本地预览（旧版 Node 服务，可选）：`node tools/hs-cosmetics-viewer/server.mjs`（默认 5178）。
