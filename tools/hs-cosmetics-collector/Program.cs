using System;
using System.Collections;
using System.Collections.Generic;
using System.IO;
using System.Linq;
using System.Reflection;

namespace HsCosmeticsCollector
{
    /// <summary>
    /// 炉石外观收藏采集器：趁炉石传说运行期间，通过 Firestone 的 UnitySpy.HearthstoneLib
    /// （MindVision，读取游戏内存）抓取你「已拥有」的卡背 / 幸运币 / 英雄皮肤，
    /// 写入 hs-cosmetics-viewer 的 owned.json，供查看器直接渲染。
    ///
    /// 采用运行时反射，不依赖 Firestone fork 的具体方法名/类型，适配不同版本。
    /// </summary>
    class Program
    {
        static int Main(string[] args)
        {
            PrintBanner();
            int exitCode;
            try
            {
                exitCode = RunCollector(args);
            }
            catch (Exception ex)
            {
                Console.ForegroundColor = ConsoleColor.Red;
                Console.Error.WriteLine();
                Console.Error.WriteLine("[错误] 程序运行中出现未捕获的异常：");
                Console.Error.WriteLine("  " + ex.Message);
                if (ex.InnerException != null)
                    Console.Error.WriteLine("  内部异常: " + ex.InnerException.Message);
                Console.Error.WriteLine("  请将以上信息截图反馈。");
                Console.ResetColor();
                exitCode = 99;
            }
            PressAnyKeyToExit();
            return exitCode;
        }

        static void PrintBanner()
        {
            Console.ForegroundColor = ConsoleColor.DarkCyan;
            Console.WriteLine("==============================================");
            Console.WriteLine("      炉石外观收藏采集器 (MindVision)");
            Console.WriteLine("==============================================");
            Console.ResetColor();
            Console.WriteLine("读取游戏内存，导出你已拥有的卡背 / 幸运币 / 英雄皮肤。");
            Console.WriteLine();
        }

        static int RunCollector(string[] args)
        {
            string libDir = Path.Combine(AppContext.BaseDirectory, "lib");
            string hsLibPath = Path.Combine(libDir, "UnitySpy.HearthstoneLib.dll");
            if (!File.Exists(hsLibPath))
            {
                hsLibPath = FindFirestoneLib();
            }
            if (hsLibPath == null || !File.Exists(hsLibPath))
            {
                Console.Error.WriteLine("找不到 UnitySpy.HearthstoneLib.dll（请确认 lib/ 目录或 Firestone 已安装）。");
                return 2;
            }
            Console.WriteLine("使用库: " + hsLibPath);

            // 依赖解析：优先从 lib/ 目录加载
            AppDomain.CurrentDomain.AssemblyResolve += (s, e) =>
            {
                var name = new AssemblyName(e.Name!).Name;
                var probe = Path.Combine(libDir, name + ".dll");
                return File.Exists(probe) ? Assembly.LoadFrom(probe) : null;
            };

            Assembly asm;
            try
            {
                asm = Assembly.LoadFrom(hsLibPath);
            }
            catch (Exception ex)
            {
                Console.Error.WriteLine("加载 UnitySpy 失败: " + ex.Message);
                return 2;
            }

            // 找到提供 CardBack/Collection 读取的类型（即 MindVision 根类，fork 可能改名）
            // 注意：必须排除接口/抽象类，否则会误匹配到 ICollectionCardBack 等接口
            // （接口也有 get_CardBackId 这类方法，名字里含 CardBack）。
            Type? mvType =
                // 1) 优先精确匹配文档约定的根类 MindVision
                asm.GetTypes().FirstOrDefault(t => !t.IsInterface && !t.IsAbstract
                    && t.Name.Equals("MindVision", StringComparison.OrdinalIgnoreCase))
                // 2) 退化：具体类，且其（含继承）公有实例方法里既有 IsRunning，又有返回集合的 CardBack 读取方法
                ?? asm.GetTypes().Where(t => !t.IsInterface && !t.IsAbstract).FirstOrDefault(t =>
                {
                    var ms = t.GetMethods(BindingFlags.Public | BindingFlags.Instance);
                    bool hasRunning = ms.Any(m => m.Name.IndexOf("IsRunning", StringComparison.OrdinalIgnoreCase) >= 0);
                    bool hasCardBack = ms.Any(m => m.Name.IndexOf("CardBack", StringComparison.OrdinalIgnoreCase) >= 0
                                                   && typeof(IEnumerable).IsAssignableFrom(m.ReturnType));
                    return hasRunning && hasCardBack;
                });
            if (mvType == null)
            {
                Console.Error.WriteLine("在 UnitySpy.HearthstoneLib 中找不到收藏读取类型。");
                return 2;
            }
            Console.WriteLine("采集类型: " + mvType.FullName + (mvType.IsInterface ? " (接口!)" : ""));

            // 诊断：列出所有构造函数及其参数类型，便于适配不同 fork 的构造方式
            Console.WriteLine("--- MindVision 构造函数 ---");
            foreach (var ctor in mvType.GetConstructors(BindingFlags.Public | BindingFlags.Instance))
            {
                var ps = ctor.GetParameters();
                Console.WriteLine("  (" + string.Join(", ", ps.Select(p => p.ParameterType.FullName + " " + p.Name)) + ")");
            }

            object mv;
            try
            {
                mv = CreateInstanceAdaptive(mvType);
            }
            catch (Exception ex)
            {
                var msg = ex.Message;
                if (ex.InnerException != null && !string.IsNullOrEmpty(ex.InnerException.Message))
                    msg += " | 内部: " + ex.InnerException.Message;
                Console.Error.WriteLine("创建采集实例失败（炉石可能未运行 / 构造参数不匹配）: " + msg);
                return 3;
            }

            // 检查游戏是否在运行
            var isRunning = mvType.GetMethod("IsRunning");
            if (isRunning != null)
            {
                bool running = false;
                try { running = (bool)isRunning.Invoke(mv, null)!; } catch { }
                if (!running)
                {
                    Console.Error.WriteLine("炉石传说未运行，请先启动游戏（并进入任意界面），再运行本工具。");
                    return 4;
                }
            }

            // 诊断：打印与收藏/卡背/硬币/皮肤/成就相关的候选方法名，便于版本差异时校正
            Console.WriteLine("--- 候选方法 (含 Collection/CardBack/Coin/Skin/Achievement) ---");
            foreach (var m in mvType.GetMethods(BindingFlags.Public | BindingFlags.Instance | BindingFlags.DeclaredOnly)
                         .Where(m => new[] { "Collection", "CardBack", "Coin", "Skin", "Achievement" }
                             .Any(k => m.Name.IndexOf(k, StringComparison.OrdinalIgnoreCase) >= 0))
                         .OrderBy(m => m.Name))
            {
                Console.WriteLine($"  {m.ReturnType.Name} {m.Name}()");
            }

            // 检查收藏是否已初始化（部分版本需要先在游戏内打开收藏界面）
            var isInit = mvType.GetMethod("IsCollectionInit");
            if (isInit != null)
            {
                try
                {
                    if (!(bool)isInit.Invoke(mv, null)!)
                        Console.WriteLine("提示: 收藏尚未初始化，建议在游戏内打开一次「收藏」界面后再运行。");
                }
                catch { }
            }

            // 临时诊断：用 GetCollectionCards 取全部 CardId，与 hero-skins.json 的 dbfId 求交集
            if (args.Length > 0 && args.Contains("diaghero"))
            {
                var cardMethod = mvType.GetMethods(BindingFlags.Public | BindingFlags.Instance)
                    .FirstOrDefault(m => m.Name.IndexOf("CollectionCards", StringComparison.OrdinalIgnoreCase) >= 0
                                      && typeof(IEnumerable).IsAssignableFrom(m.ReturnType));
                if (cardMethod != null)
                {
                    var cards = (IEnumerable)cardMethod.Invoke(mv, null)!;
                    var list = new List<object>();
                    foreach (var c in cards) if (c != null) list.Add(c);
                    Console.WriteLine($"[diag] GetCollectionCards 返回 {list.Count} 项");
                    var cardIds = new HashSet<string>(StringComparer.OrdinalIgnoreCase);
                    int dbg = 0;
                    foreach (var c in list)
                    {
                        var p = c.GetType().GetProperty("CardId");
                        if (p != null && p.GetValue(c) is string s)
                        {
                            if (dbg < 3) { Console.WriteLine($"[diag] CardId raw={s}"); dbg++; }
                            cardIds.Add(s);
                        }
                    }
                    Console.WriteLine($"[diag] collection CardId 字符串数: {cardIds.Count}");
                    var hsPath = FindCatalog("hero-skins.json");
                    if (hsPath != null)
                    {
                        using var doc = System.Text.Json.JsonDocument.Parse(File.ReadAllText(hsPath));
                        var hsCardIds = new List<string>();
                        foreach (var it in doc.RootElement.EnumerateArray())
                            if (it.TryGetProperty("cardId", out var e) && e.ValueKind == System.Text.Json.JsonValueKind.String)
                                hsCardIds.Add(e.GetString()!);
                        var hit = hsCardIds.Count(x => cardIds.Contains(x));
                        Console.WriteLine($"[diag] hero-skins.json cardId 数: {hsCardIds.Count}, 命中收藏: {hit}");
                        Console.WriteLine($"[diag] 命中样例: {string.Join(",", hsCardIds.Where(x => cardIds.Contains(x)).Take(25))}");
                    }
                    else Console.WriteLine("[diag] 找不到 hero-skins.json");
                }
                return 0;
            }

            // 诊断：列出内部 NetCache / 服务 / 对象，寻找标准英雄皮肤的真源
            if (args.Length > 0 && args.Contains("diagsvc"))
            {
                foreach (var mn in new[] { "ListNetCacheServices", "ListServices", "ListObjects" })
                {
                    var m = mvType.GetMethod(mn, BindingFlags.Public | BindingFlags.Instance);
                    if (m == null) { Console.WriteLine($"[diag] 无方法 {mn}"); continue; }
                    try
                    {
                        var val = m.Invoke(mv, null);
                        var list = new List<string>();
                        if (val is IEnumerable en)
                            foreach (var x in en) if (x != null) list.Add(x.ToString()!);
                        Console.WriteLine($"[diag] {mn}() 返回 {list.Count} 项:");
                        foreach (var s in list) Console.WriteLine($"    {s}");
                    }
                    catch (Exception ex) { Console.WriteLine($"[diag] {mn} 调用失败: {ex.Message}"); }
                }
                return 0;
            }

            // 诊断：检查 GetCollectionCards 中英雄卡的 Count 语义（Count>0 是否=已拥有）
            if (args.Length > 0 && args.Contains("diaghero3"))
            {
                var cardMethod = mvType.GetMethods(BindingFlags.Public | BindingFlags.Instance)
                    .FirstOrDefault(m => m.Name.IndexOf("CollectionCards", StringComparison.OrdinalIgnoreCase) >= 0
                                      && typeof(IEnumerable).IsAssignableFrom(m.ReturnType));
                if (cardMethod != null)
                {
                    var cards = new List<object>();
                    foreach (var x in (IEnumerable)cardMethod.Invoke(mv, null)!) if (x != null) cards.Add(x);
                    Console.WriteLine($"[diag] GetCollectionCards 共 {cards.Count} 项");
                    var props = cards[0].GetType().GetProperties().Select(p => p.Name).ToList();
                    Console.WriteLine($"[diag] 卡片属性: {string.Join(", ", props)}");
                    Console.WriteLine($"[diag] 前3项全属性:");
                    for (int i = 0; i < Math.Min(3, cards.Count); i++)
                        Console.WriteLine($"[diag]   {string.Join(", ", ToPropDict(cards[i]).Select(kv => $"{kv.Key}={kv.Value}"))}");
                    // Count 分布
                    int countGt0 = 0, countEq0 = 0;
                    var heroCards = new List<object>();
                    foreach (var c in cards)
                    {
                        var cardIdP = c.GetType().GetProperty("CardId");
                        var countP = c.GetType().GetProperty("Count");
                        int? cnt = countP != null && countP.GetValue(c) is { } v ? (int?)Convert.ToInt32(v) : null;
                        if (cnt.HasValue && cnt.Value > 0) countGt0++; else countEq0++;
                        if (cardIdP?.GetValue(c) is string cid && cid.StartsWith("HERO", StringComparison.OrdinalIgnoreCase))
                            heroCards.Add(c);
                    }
                    Console.WriteLine($"[diag] Count>0: {countGt0}, Count==0: {countEq0}");
                    Console.WriteLine($"[diag] 英雄卡(HERO_*) 数: {heroCards.Count}");
                    int heroOwned = 0;
                    foreach (var c in heroCards)
                    {
                        var countP = c.GetType().GetProperty("Count");
                        int? cnt = countP != null && countP.GetValue(c) is { } v ? (int?)Convert.ToInt32(v) : null;
                        if (cnt.HasValue && cnt.Value > 0) heroOwned++;
                    }
                    Console.WriteLine($"[diag] 英雄卡中 Count>0（=已拥有皮肤）: {heroOwned}");
                }
                return 0;
            }

            // 临时诊断：枚举所有可能的英雄皮肤/卡背/硬币读取方法，并转储样例结构
            if (args.Length > 0 && args.Contains("diaghero2"))
            {
                // A) 标量 Size 方法的值（总数）
                Console.WriteLine("[diag] === 各集合 Size（总数）===");
                foreach (var sm in mvType.GetMethods(BindingFlags.Public | BindingFlags.Instance | BindingFlags.DeclaredOnly)
                             .Where(m => m.Name.EndsWith("Size", StringComparison.OrdinalIgnoreCase) && !typeof(IEnumerable).IsAssignableFrom(m.ReturnType)))
                {
                    try { var v = sm.Invoke(mv, null); Console.WriteLine($"  {sm.Name}() = {v}"); }
                    catch (Exception ex) { Console.WriteLine($"  {sm.Name}() 失败: {ex.Message}"); }
                }

                // B) 全部公开实例方法（找标准英雄皮肤真源）
                Console.WriteLine("[diag] === 全部公开实例方法（按名排序，含返回类型）===");
                foreach (var m in mvType.GetMethods(BindingFlags.Public | BindingFlags.Instance | BindingFlags.DeclaredOnly)
                             .OrderBy(m => m.Name))
                {
                    Console.WriteLine($"  {m.ReturnType.Name} {m.Name}()");
                }
                return 0;
            }

            // 临时诊断：探测成就读取方法，并转储样例，便于接入
            if (args.Length > 0 && args.Contains("diagachieve"))
            {
                var achMethods = mvType.GetMethods(BindingFlags.Public | BindingFlags.Instance | BindingFlags.DeclaredOnly)
                    .Where(m => m.Name.IndexOf("Achievement", StringComparison.OrdinalIgnoreCase) >= 0)
                    .OrderBy(m => m.Name).ToList();
                Console.WriteLine($"[diag] 成就相关方法 {achMethods.Count} 个:");
                foreach (var m in achMethods) Console.WriteLine($"  {m.ReturnType.Name} {m.Name}()");

                // 1) 分类 + Stats 子属性
                var catM = achMethods.FirstOrDefault(m => m.Name.IndexOf("Categories", StringComparison.OrdinalIgnoreCase) >= 0);
                if (catM != null)
                {
                    try
                    {
                        var cats = new List<object>();
                        foreach (var x in (IEnumerable)catM.Invoke(mv, null)!) if (x != null) cats.Add(x);
                        Console.WriteLine($"[diag] 分类数: {cats.Count}");
                        foreach (var c in cats)
                        {
                            var d = ToPropDict(c);
                            Console.WriteLine($"[diag] 分类: " + string.Join(", ", d.Select(kv => $"{kv.Key}={kv.Value}")));
                            // Stats 子对象属性
                            var statsP = c.GetType().GetProperty("Stats");
                            if (statsP != null && statsP.GetValue(c) is { } stats)
                            {
                                var sd = ToPropDict(stats);
                                Console.WriteLine($"[diag]   该分类 Stats: " + string.Join(", ", sd.Select(kv => $"{kv.Key}={kv.Value}")));
                            }
                        }
                    }
                    catch (Exception ex) { Console.WriteLine($"[diag] 分类读取失败: {ex.Message}"); }
                }

                // 2) IAchievementsInfo（进度）
                var infoM = achMethods.FirstOrDefault(m => m.Name.IndexOf("ProgressInfo", StringComparison.OrdinalIgnoreCase) >= 0)
                         ?? achMethods.FirstOrDefault(m => m.Name.Equals("GetAchievementsInfo", StringComparison.OrdinalIgnoreCase));
                if (infoM != null)
                {
                    try
                    {
                        var info = infoM.Invoke(mv, null);
                        if (info != null)
                        {
                            var id = ToPropDict(info);
                            Console.WriteLine($"[diag] {infoM.Name} 属性: " + string.Join(", ", id.Select(kv => $"{kv.Key}={kv.Value}")));
                        }
                    }
                    catch (Exception ex) { Console.WriteLine($"[diag] {infoM.Name} 读取失败: {ex.Message}"); }
                }

                // 3) 已完成数量 + dbf 列表
                var numM = achMethods.FirstOrDefault(m => m.Name.IndexOf("CompletedAchievements", StringComparison.OrdinalIgnoreCase) >= 0);
                if (numM != null) { try { Console.WriteLine($"[diag] 已完成成就数: {numM.Invoke(mv, null)}"); } catch (Exception ex) { Console.WriteLine($"[diag] 已完成数读取失败: {ex.Message}"); } }
                var dbfM = achMethods.FirstOrDefault(m => m.Name.IndexOf("AchievementsDbf", StringComparison.OrdinalIgnoreCase) >= 0);
                if (dbfM != null) { try { var l = new List<object>(); foreach (var x in (IEnumerable)dbfM.Invoke(mv, null)!) l.Add(x); Console.WriteLine($"[diag] GetAchievementsDbf 返回 {l.Count} 项，样例: {string.Join(",", l.Take(10))}"); } catch (Exception ex) { Console.WriteLine($"[diag] dbf 读取失败: {ex.Message}"); } }
                return 0;
            }

            // 临时诊断：枚举所有返回 IEnumerable 的成就方法，转储首个元素的全部属性，便于确认 GetAchievements 等方法的字段名
            if (args.Length > 0 && args.Contains("diagachieve2"))
            {
                var list = mvType.GetMethods(BindingFlags.Public | BindingFlags.Instance | BindingFlags.DeclaredOnly)
                    .Where(m => m.Name.IndexOf("Achievement", StringComparison.OrdinalIgnoreCase) >= 0
                             && typeof(IEnumerable).IsAssignableFrom(m.ReturnType)
                             && m.GetParameters().Length == 0)
                    .OrderBy(m => m.Name).ToList();
                Console.WriteLine($"[diag] 返回集合的成就方法 {list.Count} 个:");
                foreach (var m in list)
                {
                    try
                    {
                        var en = (IEnumerable)m.Invoke(mv, null)!;
                        var items = new List<object>();
                        foreach (var x in en) if (x != null) items.Add(x);
                        Console.WriteLine($"  {m.Name}() 返回 {items.Count} 项");
                        if (items.Count > 0)
                        {
                            var d = ToPropDict(items[0]);
                            Console.WriteLine("    首项属性: " + string.Join(", ", d.Select(kv => $"{kv.Key}={kv.Value}")));
                            if (items.Count > 1)
                                Console.WriteLine($"    (还有 {items.Count - 1} 项未展开)");
                        }
                    }
                    catch (Exception ex) { Console.WriteLine($"  {m.Name}() 失败: {ex.Message}"); }
                }
                return 0;
            }

            // 诊断：深挖 IAchievementsInfo（逐条成就状态），确认字段名以便接入 ReadAchievementItems
            if (args.Length > 0 && args.Contains("diagachieve3"))
            {
                foreach (var mn in new[] { "GetAchievementsInfo", "GetInGameAchievementsProgressInfo", "GetInGameAchievementsProgressInfoByIndex" })
                {
                    var m = mvType.GetMethods(BindingFlags.Public | BindingFlags.Instance)
                        .FirstOrDefault(x => x.Name.Equals(mn, StringComparison.OrdinalIgnoreCase) && x.GetParameters().Length == 0);
                    if (m == null) { Console.WriteLine($"[diag] 无方法 {mn}"); continue; }
                    try
                    {
                        var val = m.Invoke(mv, null);
                        if (val == null) { Console.WriteLine($"[diag] {mn}() 返回 null"); continue; }
                        Console.WriteLine($"[diag] === {mn}() 类型 {val.GetType().FullName} ===");
                        DumpProps(val, "  ");
                    }
                    catch (Exception ex) { Console.WriteLine($"[diag] {mn} 失败: {ex.Message}"); }
                }
                var dbfM = mvType.GetMethods(BindingFlags.Public | BindingFlags.Instance)
                    .FirstOrDefault(x => x.Name.Equals("GetAchievementsDbf", StringComparison.OrdinalIgnoreCase));
                if (dbfM != null)
                {
                    try
                    {
                        var list = new List<object>();
                        foreach (var x in (IEnumerable)dbfM.Invoke(mv, null)!) { if (x != null) list.Add(x); if (list.Count >= 3) break; }
                        Console.WriteLine($"[diag] GetAchievementsDbf 前3项完整属性:");
                        foreach (var it in list) Console.WriteLine($"  {string.Join(", ", ToPropDict(it).Select(kv => $"{kv.Key}={kv.Value}"))}");
                    }
                    catch (Exception ex) { Console.WriteLine($"[diag] dbf 失败: {ex.Message}"); }
                }
                return 0;
            }

            var cardBacks = TryRead(mv, mvType, "CardBack");
            var coins = TryRead(mv, mvType, "Coin");
            var cardBackIds = Normalize(cardBacks, "cardBack");
            var coinIds = Normalize(coins, "coin");

            // 英雄皮肤 = 收藏中 HERO_* 且 Count>0 的卡（标准皮肤，与 hero-skins.json.cardId 对齐）
            // 不直接读 GetCollectionBattlegroundsHeroSkins（那是战棋皮肤，ID 体系不同）
            var heroSkins = ComputeHeroSkinsOwned(mv, mvType);
            var heroByClass = ComputeHeroSkinsByClass(heroSkins);

            // 成就（若有对应方法则读取）
            var achievements = ReadAchievements(mv, mvType);

            // 单条成就（id/name/状态）尽力读取；失败不影响分类级数据
            var achItems = ReadAchievementItems(mv, mvType);

            string? dataDir = FindDataDir();
            if (dataDir == null)
            {
                Console.Error.WriteLine("找不到输出目录，无法写出文件。");
                return 5;
            }
            var stamp = DateTime.Now.ToString("o");
            var src = "MindVision (Hearthstone game memory)";
            // 合并为 2 个文件：cosmetics.json（卡背/硬币/皮肤）+ achievements.json（成就明细）
            var cosmetics = new Dictionary<string, object?>
            {
                ["source"] = src,
                ["collectedAt"] = stamp,
                ["cardBacks"] = new Dictionary<string, object?> { ["count"] = cardBackIds.Count, ["ids"] = cardBackIds },
                ["coins"] = new Dictionary<string, object?> { ["count"] = coinIds.Count, ["ids"] = coinIds },
                ["heroSkins"] = new Dictionary<string, object?> { ["count"] = heroSkins.Count, ["ids"] = heroSkins, ["byClass"] = heroByClass }
            };
            WriteJson(Path.Combine(dataDir, "cosmetics.json"), cosmetics);

            if (achievements != null || achItems != null)
            {
                var ach = achievements as Dictionary<string, object?>;
                var payload = new Dictionary<string, object?>
                {
                    ["source"] = src,
                    ["collectedAt"] = stamp,
                    ["totalCompleted"] = ach?["totalCompleted"],
                    ["categories"] = ach?["categories"] ?? new List<object>()
                };
                if (achItems is Dictionary<string, object?> ai)
                {
                    payload["itemsTotal"] = ai.TryGetValue("total", out var t) ? t : null;
                    payload["itemsCompleted"] = ai.TryGetValue("completed", out var c) ? c : null;
                    payload["items"] = ai.TryGetValue("items", out var it) ? it : new List<object>();
                }
                WriteJson(Path.Combine(dataDir, "achievements.json"), payload);
            }

            int? achTotal = achievements is Dictionary<string, object?> ad ? ToInt(ad["totalCompleted"]) : null;
            PrintCompletion(dataDir, cardBackIds.Count, coinIds.Count, heroSkins.Count, heroByClass, achTotal);
            Console.WriteLine("完成后刷新查看器页面即可看到「已拥有」标记。");

            try { ((IDisposable)mv).Dispose(); } catch { }
            return 0;
        }

        // 发现并调用返回集合的方法（方法名含关键字，返回 IEnumerable）
        static IReadOnlyList<object> TryRead(object mv, Type mvType, string keyword)
        {
            var methods = mvType.GetMethods(BindingFlags.Public | BindingFlags.Instance | BindingFlags.DeclaredOnly)
                .Where(m => m.Name.IndexOf(keyword, StringComparison.OrdinalIgnoreCase) >= 0
                         && typeof(IEnumerable).IsAssignableFrom(m.ReturnType))
                .ToList();

            var collected = new List<object>();
            foreach (var m in methods)
            {
                try
                {
                    var val = m.Invoke(mv, null);
                    if (val is IEnumerable en)
                    {
                        foreach (var item in en) if (item != null) collected.Add(item);
                    }
                    Console.WriteLine($"  [{keyword}] 方法 {m.Name} 返回 {collected.Count} 项");
                }
                catch (Exception ex)
                {
                    Console.WriteLine($"  [{keyword}] 方法 {m.Name} 调用失败: {ex.Message}");
                }
            }
            return collected;
        }

        // 把集合归一化为 id 列表（卡背→数字；硬币/皮肤→字符串）
        static IReadOnlyList<object> Normalize(IReadOnlyList<object> items, string kind)
        {
            var outIds = new List<object>();
            var priority = kind == "cardBack"
                ? new[] { "CardBackId", "cardBackId", "Id", "id" }
                : kind == "coin"
                    ? new[] { "CoinId", "coinId", "CardId", "cardId", "Id", "id" }
                    : new[] { "HeroSkinId", "heroSkinId", "CardId", "cardId", "Id", "id" };

            foreach (var item in items)
            {
                var id = ExtractId(item, priority);
                if (id == null) continue;
                if (kind == "cardBack" && int.TryParse(id, out int n)) outIds.Add(n);
                else outIds.Add(id);
            }
            return outIds;
        }

        static string? ExtractId(object item, string[] priority)
        {
            if (item is int or long or double or float)
                return item.ToString();
            var props = item.GetType().GetProperties(BindingFlags.Public | BindingFlags.Instance);
            foreach (var name in priority)
            {
                var p = props.FirstOrDefault(x => x.Name.Equals(name, StringComparison.OrdinalIgnoreCase));
                if (p != null && p.GetValue(item) is { } v) return v.ToString();
            }
            // 退化：取第一个以 Id/ID 结尾的属性
            var fallback = props.FirstOrDefault(x => x.Name.EndsWith("Id", StringComparison.OrdinalIgnoreCase)
                                                     && x.GetValue(item) is { } v2);
            return fallback?.GetValue(item)?.ToString();
        }

        static Dictionary<string, object?>? ToPropDict(object item)
        {
            if (item is int or long or double or float or string)
                return new Dictionary<string, object?> { ["value"] = item };
            var dict = new Dictionary<string, object?>();
            try
            {
                foreach (var p in item.GetType().GetProperties(BindingFlags.Public | BindingFlags.Instance))
                {
                    object? v = null;
                    try { v = p.GetValue(item); } catch { }
                    dict[p.Name] = v switch
                    {
                        null => null,
                        int or long or double or float or bool or string => v,
                        _ => v.ToString()
                    };
                }
            }
            catch { }
            return dict;
        }

        // 通用属性转储（诊断用）：枚举对象属性；IEnumerable 列出首项完整属性
        static void DumpProps(object? obj, string indent)
        {
            if (obj == null) { Console.WriteLine(indent + "(null)"); return; }
            var t = obj.GetType();
            if (t == typeof(string) || t.IsPrimitive) { Console.WriteLine(indent + obj); return; }
            foreach (var p in t.GetProperties(BindingFlags.Public | BindingFlags.Instance))
            {
                object? v = null; try { v = p.GetValue(obj); } catch { }
                if (v is IEnumerable en && v is not string)
                {
                    var items = new List<object>();
                    foreach (var x in en) if (x != null) items.Add(x);
                    Console.WriteLine($"{indent}{p.Name}: IList[{items.Count}]");
                    if (items.Count > 0)
                    {
                        var d0 = new List<string>();
                        foreach (var pp in items[0].GetType().GetProperties(BindingFlags.Public | BindingFlags.Instance))
                        {
                            object? pv = null; try { pv = pp.GetValue(items[0]); } catch { }
                            d0.Add($"{pp.Name}={pv}");
                        }
                        Console.WriteLine($"{indent}  [0]: " + string.Join(", ", d0));
                        if (items.Count > 1) Console.WriteLine($"{indent}  (还有 {items.Count - 1} 项)");
                    }
                }
                else
                {
                    Console.WriteLine($"{indent}{p.Name}: {v}");
                }
            }
        }

        // 读取收藏中「已拥有」的标准英雄皮肤：GetCollectionCards 里 CardId 以 HERO_ 开头且 Count>0 的卡
        // （之前误用「CardId 是否在收藏中」判断，会把基础英雄/未拥有皮肤也算进来；正确信号是 Count>0）
        static List<string> ComputeHeroSkinsOwned(object mv, Type mvType)
        {
            var method = mvType.GetMethods(BindingFlags.Public | BindingFlags.Instance)
                .FirstOrDefault(m => m.Name.IndexOf("CollectionCards", StringComparison.OrdinalIgnoreCase) >= 0
                                  && typeof(IEnumerable).IsAssignableFrom(m.ReturnType));
            var owned = new List<string>();
            if (method == null) { Console.WriteLine("  [heroSkin] 未发现 GetCollectionCards 方法"); return owned; }
            try
            {
                var cards = new List<object>();
                foreach (var x in (IEnumerable)method.Invoke(mv, null)!) if (x != null) cards.Add(x);
                Console.WriteLine($"  [heroSkin] 收藏卡牌总数: {cards.Count}");
                foreach (var c in cards)
                {
                    var cardIdP = c.GetType().GetProperty("CardId");
                    var countP = c.GetType().GetProperty("Count");
                    if (cardIdP?.GetValue(c) is not string cid) continue;
                    if (!cid.StartsWith("HERO", StringComparison.OrdinalIgnoreCase)) continue;
                    int cnt = 0;
                    if (countP != null && countP.GetValue(c) is { } v) { try { cnt = Convert.ToInt32(v); } catch { } }
                    if (cnt > 0) owned.Add(cid);
                }
                Console.WriteLine($"  [heroSkin] 已拥有标准英雄皮肤(HERO_* 且 Count>0): {owned.Count}");
            }
            catch (Exception ex) { Console.WriteLine($"  [heroSkin] 读取失败: {ex.Message}"); }
            return owned;
        }

        // 用 hero-skins.json 目录，按职业统计英雄皮肤「已拥有/总数」
        static Dictionary<string, object> ComputeHeroSkinsByClass(List<string> ownedCardIds)
        {
            var result = new Dictionary<string, object>();
            var hsPath = FindCatalog("hero-skins.json");
            if (hsPath == null) { Console.WriteLine("  [heroSkin] 未找到 hero-skins.json，跳过按职业统计"); return result; }
            try
            {
                var ownedSet = new HashSet<string>(ownedCardIds, StringComparer.OrdinalIgnoreCase);
                using var doc = System.Text.Json.JsonDocument.Parse(File.ReadAllText(hsPath));
                var totals = new Dictionary<string, int>();
                var owned = new Dictionary<string, int>();
                foreach (var it in doc.RootElement.EnumerateArray())
                {
                    string cls = "", cid = "";
                    if (it.TryGetProperty("heroClass", out var ec)) cls = ec.GetString() ?? "";
                    if (it.TryGetProperty("cardId", out var eid)) cid = eid.GetString() ?? "";
                    if (cls == "") continue;
                    if (!totals.ContainsKey(cls)) { totals[cls] = 0; owned[cls] = 0; }
                    totals[cls]++;
                    if (ownedSet.Contains(cid)) owned[cls]++;
                }
                foreach (var cls in totals.Keys)
                    result[cls] = new Dictionary<string, int> { ["owned"] = owned[cls], ["total"] = totals[cls] };
            }
            catch (Exception ex) { Console.WriteLine($"  [heroSkin] 按职业统计失败: {ex.Message}"); }
            return result;
        }

        // 读取成就数据（分类完成度 + 总完成数）。返回 null 表示本版本无成就读取能力
        static object? ReadAchievements(object mv, Type mvType)
        {
            var catM = mvType.GetMethods(BindingFlags.Public | BindingFlags.Instance)
                .FirstOrDefault(m => m.Name.IndexOf("AchievementCategories", StringComparison.OrdinalIgnoreCase) >= 0);
            if (catM == null) { Console.WriteLine("  [achievement] 未发现 GetAchievementCategories 方法"); return null; }
            try
            {
                var cats = new List<object>();
                foreach (var x in (IEnumerable)catM.Invoke(mv, null)!) if (x != null) cats.Add(x);
                var categories = new List<object>();
                foreach (var c in cats)
                {
                    var d = new Dictionary<string, object?>();
                    d["id"] = c.GetType().GetProperty("Id")?.GetValue(c);
                    d["name"] = c.GetType().GetProperty("Name")?.GetValue(c)?.ToString();
                    d["icon"] = c.GetType().GetProperty("Icon")?.GetValue(c)?.ToString();
                    var statsP = c.GetType().GetProperty("Stats");
                    if (statsP != null && statsP.GetValue(c) is { } stats)
                    {
                        foreach (var sp in stats.GetType().GetProperties())
                        {
                            var v = sp.GetValue(stats);
                            if (v is int or long or double or float or bool or string) d[sp.Name] = v;
                        }
                    }
                    categories.Add(d);
                }
                int? totalCompleted = null;
                var numM = mvType.GetMethods(BindingFlags.Public | BindingFlags.Instance)
                    .FirstOrDefault(m => m.Name.IndexOf("CompletedAchievements", StringComparison.OrdinalIgnoreCase) >= 0);
                if (numM != null) { try { var v = numM.Invoke(mv, null); if (v != null) totalCompleted = Convert.ToInt32(v); } catch { } }
                var result = new Dictionary<string, object?>
                {
                    ["totalCompleted"] = totalCompleted,
                    ["categories"] = categories,
                };
                Console.WriteLine($"  [achievement] 分类 {categories.Count} 个，总完成 {totalCompleted}");
                return result;
            }
            catch (Exception ex) { Console.WriteLine($"  [achievement] 读取成就失败: {ex.Message}"); return null; }
        }

        // 读取单个成就条目（AchievementId / 状态 / 进度）。真源为 GetAchievementsInfo() 返回的
        // IAchievementsInfo.Achievements（每条含 AchievementId / Progress / Status 枚举）。
        // 返回 null 表示本版本无此能力。
        static object? ReadAchievementItems(object mv, Type mvType)
        {
            var method = mvType.GetMethods(BindingFlags.Public | BindingFlags.Instance)
                .FirstOrDefault(m => m.Name.Equals("GetAchievementsInfo", StringComparison.OrdinalIgnoreCase)
                                  && m.GetParameters().Length == 0);
            if (method == null)
            {
                Console.WriteLine("  [achievement] 未发现 GetAchievementsInfo（无法读单条成就）");
                return null;
            }
            try
            {
                var info = method.Invoke(mv, null);
                if (info == null) return null;
                var listProp = info.GetType().GetProperty("Achievements");
                if (listProp == null) { Console.WriteLine("  [achievement] IAchievementsInfo 无 Achievements 属性"); return null; }
                var raw = new List<object>();
                foreach (var x in (IEnumerable)listProp.GetValue(info)!) if (x != null) raw.Add(x);

                var outItems = new List<Dictionary<string, object?>>();
                int completed = 0;
                foreach (var it in raw)
                {
                    var t = it.GetType();
                    int? id = ToInt(t.GetProperty("AchievementId")?.GetValue(it));
                    int? progress = ToInt(t.GetProperty("Progress")?.GetValue(it));
                    int status = ToInt(t.GetProperty("Status")?.GetValue(it)) ?? 0;
                    bool isComplete = status == 3 || status == 4; // COMPLETE / REWARD_GRANTED
                    if (isComplete) completed++;
                    outItems.Add(new Dictionary<string, object?>
                    {
                        ["id"] = id,
                        ["status"] = status,
                        ["statusText"] = StatusText(status),
                        ["progress"] = progress,
                        ["isComplete"] = isComplete
                    });
                }
                Console.WriteLine($"  [achievement] 单条成就 {outItems.Count} 条，完成(状态3/4) {completed}");
                return new Dictionary<string, object?>
                {
                    ["total"] = outItems.Count,
                    ["completed"] = completed,
                    ["items"] = outItems
                };
            }
            catch (Exception ex)
            {
                Console.WriteLine($"  [achievement] 读取单条成就失败: {ex.Message}");
                return null;
            }
        }

        static int? ToInt(object? v) { try { return v == null ? null : Convert.ToInt32(v); } catch { return null; } }

        static string StatusText(int s) => s switch
        {
            0 => "INVALID",
            1 => "NOT_STARTED",
            2 => "IN_PROGRESS",
            3 => "COMPLETE",
            4 => "REWARD_GRANTED",
            _ => "UNKNOWN(" + s + ")"
        };

        // 自适应构造：优先无参；否则取参数最少的构造函数，尽量补全参数
        static object CreateInstanceAdaptive(Type t)
        {
            var ctors = t.GetConstructors(BindingFlags.Public | BindingFlags.Instance);
            var p0 = ctors.FirstOrDefault(c => c.GetParameters().Length == 0);
            if (p0 != null) return Activator.CreateInstance(t)!;

            var ctor = ctors.OrderBy(c => c.GetParameters().Length).First();
            var args = ctor.GetParameters().Select(p => MakeArg(p.ParameterType)).ToArray();
            return ctor.Invoke(args)!;
        }

        static object? MakeArg(Type pt)
        {
            if (pt == typeof(string)) return "Hearthstone";
            if (pt == typeof(EventHandler))
                return new EventHandler((s, e) => Console.WriteLine("  [MindVision] " + (e?.ToString() ?? "")));
            if (pt.IsValueType) return Activator.CreateInstance(pt)!;
            if (!pt.IsInterface && !pt.IsAbstract)
            {
                var c = pt.GetConstructors(BindingFlags.Public | BindingFlags.Instance)
                          .FirstOrDefault(x => x.GetParameters().Length == 0);
                if (c != null) return Activator.CreateInstance(pt)!;
            }
            // 接口/抽象或无法无参构造 → 暂时传 null，交由构造函数容忍
            return null;
        }

        // 向上查找仓库内的外观目录文件（src/features/hearthstone/data/<name>）
        static string? FindCatalog(string name)
        {
            var dir = new DirectoryInfo(AppContext.BaseDirectory);
            for (int i = 0; i < 10 && dir != null; i++)
            {
                var candidate = Path.Combine(dir.FullName, "src", "features", "hearthstone", "data", name);
                if (File.Exists(candidate)) return candidate;
                dir = dir.Parent;
            }
            return null;
        }

        static string FindFirestoneLib()
        {
            try
            {
                var baseDir = Path.Combine(
                    Environment.GetFolderPath(Environment.SpecialFolder.LocalApplicationData),
                    "Overwolf", "Extensions");
                if (!Directory.Exists(baseDir)) return null!;
                foreach (var f in Directory.EnumerateFiles(baseDir, "UnitySpy.HearthstoneLib.dll", SearchOption.AllDirectories))
                    return f;
            }
            catch { }
            return null!;
        }

        // 输出路径：优先写到 tools/hs-cosmetics-viewer/data/owned.json（向上查找），否则写 exe 旁边
        static string ResolveOutputPath(string[] args)
        {
            if (args.Length > 0 && !string.IsNullOrWhiteSpace(args[0]))
                return Path.GetFullPath(args[0]);

            var dir = new DirectoryInfo(AppContext.BaseDirectory);
            for (int i = 0; i < 8 && dir != null; i++)
            {
                var candidate = Path.Combine(dir.FullName, "tools", "hs-cosmetics-viewer", "data", "owned.json");
                if (File.Exists(candidate) || Directory.Exists(Path.Combine(dir.FullName, "tools", "hs-cosmetics-viewer", "data")))
                    return candidate;
                dir = dir.Parent;
            }
            return Path.Combine(AppContext.BaseDirectory, "owned.json");
        }

        // 查找 hs-cosmetics-viewer/data 目录（向上查找仓库）；仓库外（便携包）运行时直接输出到 exe 所在目录
        static string? FindDataDir()
        {
            var dir = new DirectoryInfo(AppContext.BaseDirectory);
            for (int i = 0; i < 10 && dir != null; i++)
            {
                var candidate = Path.Combine(dir.FullName, "tools", "hs-cosmetics-viewer", "data");
                if (Directory.Exists(candidate)) return candidate;
                dir = dir.Parent;
            }
            // 便携模式：直接写到 exe 旁边，用户解压后能在同文件夹找到 4 个 JSON
            return AppContext.BaseDirectory;
        }

        static void WriteJson(string path, object value)
        {
            var json = System.Text.Json.JsonSerializer.Serialize(value,
                new System.Text.Json.JsonSerializerOptions { WriteIndented = true, Encoder = System.Text.Encodings.Web.JavaScriptEncoder.UnsafeRelaxedJsonEscaping });
            File.WriteAllText(path, json);
            Console.WriteLine("  写入: " + path);
        }

        // 采集成功后的醒目摘要（彩色 + 分隔线 + 各类数量 + 输出目录）
        static void PrintCompletion(string dataDir, int cardBack, int coin, int hero,
            Dictionary<string, object> heroByClass, int? achTotal)
        {
            Console.WriteLine();
            Console.ForegroundColor = ConsoleColor.Green;
            Console.WriteLine("========== 采集完成 ==========");
            Console.ResetColor();
            Console.WriteLine($"  输出目录 : {dataDir}");
            Console.WriteLine($"  卡背     : {cardBack}");
            Console.WriteLine($"  幸运币   : {coin}");
            Console.WriteLine($"  英雄皮肤 : {hero}");
            if (heroByClass != null && heroByClass.Count > 0)
            {
                Console.WriteLine("  英雄皮肤按职业(已拥有/总数):");
                foreach (var kv in heroByClass)
                {
                    var d = (Dictionary<string, int>)kv.Value;
                    Console.WriteLine($"    {kv.Key}: {d["owned"]}/{d["total"]}");
                }
            }
            if (achTotal != null)
                Console.WriteLine($"  成就完成 : {achTotal}");
            Console.ForegroundColor = ConsoleColor.Green;
            Console.WriteLine("================================");
            Console.ResetColor();
        }

        // 等待用户按键再退出，避免双击运行时一闪而过看不到结果或报错
        static void PressAnyKeyToExit()
        {
            Console.WriteLine();
            Console.WriteLine("按任意键退出...");
            try { Console.ReadKey(true); }
            catch { try { Console.ReadLine(); } catch { } }
        }
    }
}
