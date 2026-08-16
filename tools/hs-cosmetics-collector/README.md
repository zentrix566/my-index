# 炉石收藏与成就采集器 (HsCosmeticsCollector)

趁 **炉石传说运行期间**，通过 Firestone 自带的 `UnitySpy.HearthstoneLib`（MindVision，读取游戏内存）
抓取你**已拥有**的卡背 / 幸运币 / 英雄皮肤，以及**成就完成度**，输出 2 个 JSON 文件：
`cosmetics.json`（外观收藏）与 `achievements.json`（成就明细），
在网站「炉石收藏」「炉石成就」页面导入即可同步进度。

> 为什么必须开着游戏：这些数据只存在于**游戏运行时的内存**里，Firestone 本地文件
> （`collection.json` 等 13 个 JSON）只缓存卡牌 + 已完成成就，**不含**卡背/皮肤/硬币的拥有记录。

## 界面（v1.1.0 起）

双击 `HsCosmeticsCollector.exe` 打开图形界面（WinForms，无黑色控制台窗口）：

- 顶部实时显示两个状态灯：**炉石传说运行中** / **读取库已就绪**（每 2 秒自动刷新）
- 点「开始采集」后在窗口中滚动显示采集日志；结束后显示绿色结果摘要
- 「打开输出文件夹」一键定位导出文件；「打开网站导入页」（v1.2.0 起）打开网站收藏页，
  默认 `https://zentrix566.top/hearthstone/collection`，exe 旁放 `site-url.txt`（一行 URL）可覆盖
- 「复制日志」方便排障反馈
- 带命令行参数运行（如 `diag`、`diaghero`）时走原控制台逻辑，输出写入 stdout，便于重定向收集日志

## 原理

- `lib/` 里是 Firestone 插件目录下的 `UnitySpy.dll` + `UnitySpy.HearthstoneLib.dll`。
- 采集器在**运行时**加载这两个 DLL，用反射找到 `MindVision` 根类里读收藏的方法，调用后取出 id：
  - 卡背：`GetCollectionCardBacks()` → 取 `CardBackId`（数字）
  - 幸运币：`GetCollectionCoins()` → 取 `CoinId`（= dbfId 数字）
  - 英雄皮肤（标准皮肤）：`GetCollectionCards()` 取全部收藏卡牌的 `CardId` 字符串集合，
    再与目录 `hero-skins.json` 的 `cardId` 求交集（**不是** `GetCollectionBattlegroundsHeroSkins`，
    那是战棋皮肤，ID 体系不同）
  - 成就：`GetAchievementCategories()` 取各分类的 `Stats`（已完成/总数/点数）+
    `GetAchievementsInfo()` 逐条明细（id / status / progress）
- 采用反射而非硬编码方法名，以适配 Firestone 不同版本（fork）的 API 差异。

## 构建与发布

需要 Windows（二选一）：

**A. 有 .NET SDK**
```powershell
cd tools/hs-cosmetics-collector
dotnet build -c Release
```

**B. 没有 .NET SDK（脚本自动下载 Roslyn 编译器，一次性缓存在 .build/）**
```powershell
cd tools/hs-cosmetics-collector
.\build-release.ps1
```

一键发布（编译 + 打包 + SHA256）：
```powershell
.\build-release.ps1
# 生成 public/hs-cosmetics-collector-v{Version}.zip
```

- 版本号在 `hs-cosmetics-collector.csproj` 的 `<Version>` 维护；发布后同步改
  `src/features/hearthstone/utils/constants.js` 里的 `COLLECTOR_DOWNLOAD_URL`。
- 打包自动排除 `.pdb`；运行时依赖 DLL 与 `lib/` 缺失时会从上一个发布 zip 提取。
- exe 嵌入了 `icon.ico`、`app.manifest`（DPI 感知 + asInvoker）与完整版本信息
  （AssemblyTitle/Product/Company 等，见 csproj）。

## 使用步骤

1. **启动炉石传说**，进入任意界面（最好打开一次「收藏」界面，确保收藏已初始化）。
2. 双击 `HsCosmeticsCollector.exe`，等顶部两个状态灯变绿。
3. 点「开始采集」，结束后从摘要确认数量，点「打开输出文件夹」取文件。
4. 网站（需登录）：
   - 「炉石收藏」页 → 选择采集的 JSON 文件 → `cosmetics.json`
   - 「炉石成就」页 → 导出与备份 → 导入游戏内进度 → `achievements.json`
     （成就导入经 `achievement-id-map.json` 把游戏数字 ID 换算为站内成就，只推进不回退）

## 输出格式

`cosmetics.json`：
```json
{
  "source": "MindVision (Hearthstone game memory)",
  "collectedAt": "2026-08-15T...",
  "cardBacks": { "count": 280, "ids": [337, 462] },
  "coins":     { "count": 49,  "ids": [1746, 130518] },
  "heroSkins": { "count": 380, "ids": ["HERO_01", "HERO_05"], "byClass": {} }
}
```

`achievements.json`：
```json
{
  "source": "MindVision (Hearthstone game memory)",
  "collectedAt": "2026-08-15T...",
  "totalCompleted": 4117,
  "categories": [ { "id": 1, "name": "生涯", "CompletedAchievements": 207, "TotalAchievements": 214 } ],
  "itemsTotal": 4745,
  "itemsCompleted": 4117,
  "items": [ { "id": 367, "status": 4, "statusText": "REWARD_GRANTED", "progress": 10000, "isComplete": true } ]
}
```

## 站内 ID 映射

`achievements.json` 里的 `items[].id` 是游戏内数字成就 ID；站内成就用自定义 slug。
映射表 `src/features/hearthstone/data/achievement-id-map.json` 由脚本生成：

```powershell
node scripts/build-achievement-id-map.mjs --hs-data <HSAchieveGuide 的 hs-achievement-data.json 路径>
```

匹配策略：归一化名称 + 阶段 quota 序列精确对齐（L1），同名且条目数与阶段数一致时整组接受（L2），
冲突（如同名隐藏成就「？？？」）与名称不同者放弃，宁缺毋滥（当前 924/948）。

## 能分发给别人用吗？

- **采集器源码（`Program.cs` / `CollectorForm.cs` / `.csproj`）**：可自由分享，是我自己写的。
- **`lib/UnitySpy*.dll`**：来自 **Firestone（Zero to Heroes）** 的插件组件。
  发布 zip 中附带是为了降低使用门槛；若对方已安装 Firestone，删除 zip 里的 `lib/` 也能用
  （采集器会自动在其本机 `Overwolf\Extensions\` 下查找）。
- 他人使用条件：**Windows + 开着炉石 + .NET Framework 4.8**（Win10/11 一般自带）；无需密钥或账号。

## 杀毒软件误报

程序原理是读取游戏内存，未签名的绿色小工具容易被启发式误判（用户侧指引见 README-dist.txt）。
已做的缓解：嵌入图标 / 版本信息 / app.manifest、不打包 pdb、发布时输出 SHA256。
彻底消除需要代码签名证书；确认误报后可在
<https://www.microsoft.com/wdsi/filesubmission> 提交样本申诉，Defender 通常 1~3 个工作日解除。

## 排错

- 界面显示「读取库：缺失」：确认 `lib/` 与 exe 同级，且 DLL 未被杀软删除（先加白名单再重新解压）。
- `炉石传说未运行`：先开游戏，等状态灯变绿。
- GUI 内报错：点「复制日志」把内容反馈；也可用命令行 `HsCosmeticsCollector.exe diag` 收集输出。
- Firestone 大版本更新后 DLL 可能变化：重新复制 `lib/` 里的两个 DLL，再重跑 `build-release.ps1`。
