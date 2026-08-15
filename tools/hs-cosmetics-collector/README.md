# 炉石外观收藏采集器 (HsCosmeticsCollector)

趁 **炉石传说运行期间**，通过 Firestone 自带的 `UnitySpy.HearthstoneLib`（MindVision，读取游戏内存）
抓取你**已拥有**的卡背 / 幸运币 / 英雄皮肤，以及**成就完成度**，写入查看器的 `owned.json` 与 `achievements` 字段。

> 为什么必须开着游戏：这些数据只存在于**游戏运行时的内存**里，Firestone 本地文件
> （`collection.json` 等 13 个 JSON）只缓存卡牌 + 已完成成就，**不含**卡背/皮肤/硬币的拥有记录。
> 参考工具 `ExportMindVisionAchievements.exe` 读成就也是这个机制——读的是内存，不是本地文件。

## 原理

- `lib/` 里是 Firestone 插件目录下的 `UnitySpy.dll` + `UnitySpy.HearthstoneLib.dll`（已复制）。
- 采集器在**运行时**加载这两个 DLL，用反射找到 `MindVision` 根类里读收藏的方法，调用后取出 id：
  - 卡背：`GetCollectionCardBacks()` → 取 `CardBackId`（数字）
  - 幸运币：`GetCollectionCoins()` → 取 `CoinId`（= dbfId 数字）
  - 英雄皮肤（标准皮肤，746 个）：`GetCollectionCards()` 取全部收藏卡牌的 `CardId` 字符串集合，
    再与目录 `hero-skins.json` 的 `cardId` 求交集（**不是** `GetCollectionBattlegroundsHeroSkins`，
    那是战棋皮肤，ID 体系不同，无法对应到 746 个标准皮肤）
  - 成就：`GetAchievementCategories()` 取各分类的 `Stats`（已完成/总数/点数），
    外加 `GetNumberOfCompletedAchievements()` 的总完成数
- 采用反射而非硬编码方法名，以适配 Firestone 不同版本（fork）的 API 差异。

## 构建与运行

需要 Windows + .NET 构建工具（二选一）：

**A. 有 .NET SDK（推荐）**
```powershell
cd tools/hs-cosmetics-collector
dotnet build -c Release
# 生成的 exe 在 bin/Release/net48/HsCosmeticsCollector.exe
```

**B. 有 Visual Studio**
直接打开 `hs-cosmetics-collector.csproj` → 生成 → 运行。

## 使用步骤

1. **启动炉石传说**，进入任意界面（最好打开一次「收藏」界面，确保收藏已初始化）。
2. 运行 `HsCosmeticsCollector.exe`（保持炉石开着）。
3. 控制台会打印抓到的数量并显示「采集完成」摘要，运行结束后停留，按任意键才退出（双击运行时不再一闪而过），结果写入 `tools/hs-cosmetics-viewer/data/`。
4. 打开外观收藏查看器（刷新页面），即可看到卡背/幸运币/英雄皮肤的「已拥有」标记，以及「成就」标签页的完成度。

## 诊断模式（可选）

```powershell
HsCosmeticsCollector.exe diaghero      # 打印收藏卡牌与英雄皮肤目录的交集，用于验证映射
HsCosmeticsCollector.exe diagachieve   # 打印成就分类与 Stats 字段，用于验证成就读取
```

## 输出格式

`owned.json`：
```json
{
  "source": "MindVision (Hearthstone game memory)",
  "exportedAt": "2026-08-15T...",
  "cardBacks": [337, 462, "..."],
  "coins": [1746, 130518, "..."],
  "heroSkins": ["HERO_01", "HERO_05", "..."],
  "achievements": {
    "totalCompleted": 4117,
    "categories": [
      { "id": 1, "name": "生涯", "icon": "general",
        "CompletedAchievements": 207, "TotalAchievements": 214,
        "Points": 4360, "AvailablePoints": 4580, "Unclaimed": 0 }
    ]
  },
  "raw": { "cardBacks": [...], "coins": [...], "heroSkins": [...], "achievements": {...} }
}
```
- `cardBacks` / `coins` / `heroSkins`：查看器直接消费的 id 列表（卡背数字、硬币 dbfId、皮肤 cardId）。
- `achievements`：分类完成度 + 总完成数；查看器「成就」标签页渲染进度条。
- `raw`：完整属性转储，用于版本差异时校正字段映射。

## 数据落盘位置

所有抓取结果写入 **`tools/hs-cosmetics-viewer/data/owned.json`**（与主项目 `tools/hs-cosmetics-viewer/`
在同一仓库内）。查看器读取该文件渲染；也可在查看器页面手动「导入/导出」清单。

## 能分发给别人用吗？

- **采集器源码（`Program.cs` / `.csproj`）**：可自由分享，是我自己写的。
- **`lib/UnitySpy*.dll`**：这是 **Firestone（Zero to Heroes）的专有组件**，请**不要**随仓库公开打包分发。
  他人使用时，采集器会**自动在其本机 `Overwolf\Extensions\` 下查找**这两个 DLL；
  若找不到，再提示他们从自己安装的 Firestone 插件目录复制到 `lib/`。
- 他人使用条件：**Windows + 开着炉石 + .NET 8 SDK**（或 .NET Framework 4.8 运行时）；
  无需你提供任何密钥或账号。

## 排错

- `炉石传说未运行`：先开游戏。
- `找不到 UnitySpy...dll`：采集器会先找 `lib/`，再找 `Overwolf\Extensions\`；都找不到时，
  请从自己安装的 Firestone 插件目录（`lnknbakk...\*\plugins\`）复制两个 DLL 到 `lib/`。
- 控制台打印 `0 个` 但候选方法里能看到 `GetCollectionXxx`：说明 id 提取字段名不对，
  把控制台输出与 `raw` 内容贴出来，调整 `Program.cs` 里的 `priority` 字段优先级即可。
- Firestone 大版本更新后 DLL 可能变化：重新复制 `lib/` 里的两个 DLL。
- 程序运行结束后窗口停留、按任意键才关闭：这是预期行为（避免双击运行时一闪而过看不到结果或报错）。
- 若采集中途报错，程序会以**红色文字**显示原因并停留窗口，把提示截图反馈即可。
