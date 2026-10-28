using System;
using System.Collections;
using System.Collections.Generic;
using System.Diagnostics;
using System.IO;
using System.Linq;
using System.Reflection;
using System.Text;
using System.Windows.Forms;

namespace HsCosmeticsCollector
{
    /// <summary>
    /// 炉石外观收藏采集器：趁炉石传说运行期间，通过 Firestone 的 UnitySpy.HearthstoneLib
    /// （MindVision，读取游戏内存）抓取你「已拥有」的卡背 / 幸运币 / 英雄皮肤 / 成就进度，
    /// 写出带时间戳的 cosmetics-*.json + achievements-*.json（并同步固定名 latest），供网站收藏页 / 成就页导入。
    ///
    /// 采用运行时反射，不依赖 Firestone fork 的具体方法名/类型，适配不同版本。
    /// 默认启动 WinForms 图形界面；带命令行参数（diag* 诊断等）时走原控制台逻辑。
    /// </summary>
    class Program
    {
        // GUI 模式下最近一次采集结果（PrintCompletion 填充），供界面展示摘要与「打开输出文件夹」
        public sealed class CollectorResult
        {
            public string DataDir = "";
            public int CardBacks;
            public int Coins;
            public int HeroSkins;
            public int? Achievements;
        }

        public static CollectorResult? LastResult;

        [STAThread]
        static int Main(string[] args)
        {
            // 无参数：双击运行 → 图形界面（普通用户日常路径）
            if (args.Length == 0)
            {
                Application.EnableVisualStyles();
                Application.SetCompatibleTextRenderingDefault(false);
                Application.Run(new CollectorForm());
                return 0;
            }

            // 带参数：控制台 / 诊断模式（输出重定向到 stdout，便于排障收集日志）
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
                Console.Error.WriteLine(DescribeException(ex));
                Console.Error.WriteLine("  请将以上信息完整复制反馈。");
                Console.ResetColor();
                exitCode = 99;
            }
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

        // ── 诊断信息（v1.4.1）：完整异常链 + 系统环境，供远程排障 ─────────────────
        // v1.4.0 之前只打印两层异常 Message，最内层真实原因（通常是 GAC 依赖冲突的
        // FileLoadException）被吞掉，反馈日志无法定位。这里逐层展开异常链并附带
        // .NET Framework 版本与 GAC 残留清单。

        /// <summary>单行环境摘要，采集开始时打印，方便对照不同用户的日志。</summary>
        public static string DescribeEnvironmentLine()
        {
            return $"采集器 v{typeof(Program).Assembly.GetName().Version} | {DescribeFramework()}"
                + $" | {Environment.OSVersion.VersionString} | {(Environment.Is64BitProcess ? "x64" : "x86")} 进程";
        }

        /// <summary>
        /// 完整异常诊断：逐层异常链（类型/消息/HResult）、最内层堆栈前几帧、
        /// 系统环境与依赖程序集（本地 DLL 版本 + GAC 残留）清单。
        /// </summary>
        public static string DescribeException(Exception ex)
        {
            var sb = new StringBuilder();
            sb.AppendLine("[错误] 程序运行中出现未捕获的异常：");
            int level = 0;
            Exception? innermost = ex;
            for (var e = ex; e != null; e = e.InnerException)
            {
                level++;
                innermost = e;
                sb.AppendLine($"  {level}. {e.GetType().Name}: {e.Message}"
                    + (e.HResult != 0 ? $" (HResult=0x{e.HResult:X8})" : ""));
            }
            if (innermost?.StackTrace is { Length: > 0 } stack)
            {
                sb.AppendLine("  最内层堆栈:");
                var frames = stack.Split(new[] { "\r\n", "\n" }, StringSplitOptions.RemoveEmptyEntries);
                foreach (var frame in frames.Take(5))
                    sb.AppendLine("    " + frame.Trim());
            }
            sb.AppendLine("  ---- 系统环境 ----");
            sb.AppendLine("  " + DescribeEnvironmentLine());
            foreach (var line in DescribeAssemblyState())
                sb.AppendLine("  " + line);
            return sb.ToString().TrimEnd();
        }

        /// <summary>.NET Framework 4.x 安装版本（注册表 Release 号换算），读不到时明确说明。</summary>
        static string DescribeFramework()
        {
            try
            {
                using var baseKey = Microsoft.Win32.RegistryKey.OpenBaseKey(
                    Microsoft.Win32.RegistryHive.LocalMachine, Microsoft.Win32.RegistryView.Registry32);
                using var ndp = baseKey.OpenSubKey(@"SOFTWARE\Microsoft\NET Framework Setup\NDP\v4\Full");
                if (ndp?.GetValue("Release") is int release)
                {
                    var name = release >= 533320 ? "4.8.1"
                             : release >= 528040 ? "4.8"
                             : release >= 461808 ? "4.7.2"
                             : release >= 461308 ? "4.7.1"
                             : "低于 4.8（程序理论上无法启动）";
                    return $".NET Framework {name} (Release={release})";
                }
            }
            catch { }
            return ".NET Framework 版本未知";
        }

        /// <summary>
        /// 逐个列出导出依赖的 System.* 程序集：exe 旁的 DLL 版本，以及 GAC 里是否有同名残留
        /// （机器级绑定策略会把本地正确的 DLL 劫持到旧版，是同类崩溃的头号嫌疑）。
        /// </summary>
        static IEnumerable<string> DescribeAssemblyState()
        {
            var names = new[]
            {
                "System.Runtime.CompilerServices.Unsafe", "System.Memory", "System.Buffers",
                "System.Numerics.Vectors", "System.Text.Json", "System.Text.Encodings.Web",
                "System.Threading.Tasks.Extensions", "Microsoft.Bcl.AsyncInterfaces", "System.ValueTuple"
            };
            var windir = Environment.GetFolderPath(Environment.SpecialFolder.Windows);
            var gacRoots = new[]
            {
                Path.Combine(windir, "Microsoft.NET", "assembly", "GAC_MSIL"),
                Path.Combine(windir, "Microsoft.NET", "assembly", "GAC_64")
            };
            foreach (var name in names)
            {
                string local;
                try
                {
                    var path = Path.Combine(AppContext.BaseDirectory, name + ".dll");
                    local = File.Exists(path)
                        ? System.Diagnostics.FileVersionInfo.GetVersionInfo(path).FileVersion ?? "?"
                        : "缺失";
                }
                catch { local = "?"; }

                var hits = new List<string>();
                try
                {
                    foreach (var root in gacRoots)
                    {
                        var dir = Path.Combine(root, name);
                        if (!Directory.Exists(dir)) continue;
                        hits.AddRange(Directory.GetDirectories(dir)
                            .Select(Path.GetFileName)
                            .Where(f => !string.IsNullOrEmpty(f))!);
                    }
                }
                catch { hits.Add("枚举失败"); }
                yield return $"{name}: 本地 {local} | " + (hits.Count > 0 ? "GAC 残留: " + string.Join("; ", hits) : "GAC 无");
            }
        }

        public static int RunCollector(string[] args)
        {
            Console.WriteLine("环境: " + DescribeEnvironmentLine());

            // 导出序列化自检：提前触发与 WriteJson 完全相同的 System.Text.Json 初始化路径。
            // 个别机器 GAC 残留旧版 System.* 程序集时，编码器静态初始化会失败，过去表现为
            // 「采集全部成功却在写文件时崩」。在读取游戏数据之前先暴露，避免白采集一趟。
            try
            {
                var probeOptions = new System.Text.Json.JsonSerializerOptions
                {
                    Encoder = System.Text.Encodings.Web.JavaScriptEncoder.UnsafeRelaxedJsonEscaping
                };
                _ = System.Text.Json.JsonSerializer.Serialize(new { probe = 1 }, probeOptions);
            }
            catch (Exception ex)
            {
                Console.ForegroundColor = ConsoleColor.Red;
                Console.Error.WriteLine("[错误] JSON 导出组件自检失败：本机 .NET Framework 组件存在冲突或损坏，导出必然失败（尚未读取游戏，可先修环境）。");
                Console.Error.WriteLine(DescribeException(ex));
                Console.Error.WriteLine("  常见原因：GAC 中残留旧版 System.* 程序集（见上方清单），或 .NET Framework 4.8 安装不完整。");
                Console.ResetColor();
                return 3;
            }

            // 导出管线自测：不依赖游戏进程，用与真实导出一致的数据形状完整走一遍
            // 序列化 → 写文件 → latest 副本 → 回读校验。用于无游戏环境验证导出路径。
            if (args.Length > 0 && args.Contains("selftest"))
            {
                return RunExportSelfTest();
            }

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

            // 机器上可能同时存在多个名为 Hearthstone 的进程（实测有用户机器上 5 个同名进程、
            // 仅 1 个加载了 Mono）。UnitySpy 默认按名称 FirstOrDefault() 自选，选到非游戏进程
            // 就在读内存阶段抛「拒绝访问」。这里先定位真游戏进程，把 PID 显式传给构造函数。
            int? gamePid = SelectHearthstoneProcess();

            object mv;
            try
            {
                mv = CreateInstanceAdaptive(mvType, gamePid);
            }
            catch (Exception ex)
            {
                Console.ForegroundColor = ConsoleColor.Red;
                Console.Error.WriteLine("创建采集实例失败（构造参数不匹配，或目标进程无法访问）");
                Console.Error.WriteLine("  本次传入 PID: " + (gamePid?.ToString() ?? "未指定（未筛选到加载 Mono 的游戏进程）"));
                var inner = ex.InnerException;
                if (inner == null)
                    Console.Error.WriteLine($"  {ex.GetType().Name}: {ex.Message}");
                while (inner != null)
                {
                    Console.Error.WriteLine($"  内部 {inner.GetType().Name}: {inner.Message}"
                        + (inner.HResult != 0 ? $" (HResult=0x{inner.HResult:X8})" : ""));
                    var frame = inner.StackTrace?.Split('\n').FirstOrDefault()?.Trim();
                    if (!string.IsNullOrEmpty(frame))
                        Console.Error.WriteLine("    于 " + frame);
                    inner = inner.InnerException;
                }
                Console.Error.WriteLine("  若上方 PID 为「未指定」，请确认炉石已启动并进入主界面后重试。");
                Console.ResetColor();
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

            // 导出成就 DBF 全表：游戏内存里的成就数据库（数字 ID ↔ 名称 ↔ 配额）的权威来源，
            // 供网站 scripts/build-achievement-id-map.mjs 建立 站内 slug ↔ 游戏数字 ID 映射。
            // 第三方成就数据（HSAchieveGuide）对新版本常滞后，游戏本体内数据永远与当前补丁一致。
            if (args.Length > 0 && args.Contains("dumpachievedbf"))
            {
                return DumpAchievementDbf(mv, mvType);
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
            // 文件名时间戳：每次采集产出独立文件，避免多次运行覆盖历史；另同步固定名 latest 供本地查看器/server 读取
            var fileStamp = DateTime.Now.ToString("yyyyMMdd-HHmmss");
            var src = "MindVision (Hearthstone game memory)";
            // 合并为 2 个文件：cosmetics + achievements（均带时间戳，并维护 latest 副本）
            var cosmetics = new Dictionary<string, object?>
            {
                ["source"] = src,
                ["collectedAt"] = stamp,
                ["cardBacks"] = new Dictionary<string, object?> { ["count"] = cardBackIds.Count, ["ids"] = cardBackIds },
                ["coins"] = new Dictionary<string, object?> { ["count"] = coinIds.Count, ["ids"] = coinIds },
                ["heroSkins"] = new Dictionary<string, object?> { ["count"] = heroSkins.Count, ["ids"] = heroSkins, ["byClass"] = heroByClass }
            };
            var cosmeticsFile = Path.Combine(dataDir, $"cosmetics-{fileStamp}.json");
            WriteJson(cosmeticsFile, cosmetics);
            CopyLatest(cosmeticsFile, Path.Combine(dataDir, "cosmetics.json"), "外观收藏");

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
                var achFile = Path.Combine(dataDir, $"achievements-{fileStamp}.json");
                WriteJson(achFile, payload);
                CopyLatest(achFile, Path.Combine(dataDir, "achievements.json"), "成就明细");
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

                // 名称/配额富化：优先读条目自身字段；条目没有时从成就 DBF 表按 ID 补。
                // 网站对尚无 ID 映射的新版本成就按「名称+阶段结构」兜底匹配，名称是关键。
                var dbfByName = BuildAchievementDbfLookup(mv, mvType);
                int enriched = 0;
                foreach (var it in raw)
                {
                    var t = it.GetType();
                    int? id = ToInt(t.GetProperty("AchievementId")?.GetValue(it));
                    int? progress = ToInt(t.GetProperty("Progress")?.GetValue(it));
                    int status = ToInt(t.GetProperty("Status")?.GetValue(it)) ?? 0;
                    bool isComplete = status == 3 || status == 4; // COMPLETE / REWARD_GRANTED
                    if (isComplete) completed++;

                    string? name = ReadFirstString(it, "Name", "AchievementName", "Title", "DisplayName");
                    int? quota = ReadFirstInt(it, "Quota", "MaxProgress", "Goal", "Target", "RequiredProgress");
                    if ((name == null || quota == null) && id != null && dbfByName.TryGetValue(id.Value, out var dbf))
                    {
                        name ??= dbf.Name;
                        quota ??= dbf.Quota;
                    }
                    if (!string.IsNullOrWhiteSpace(name)) enriched++;

                    outItems.Add(new Dictionary<string, object?>
                    {
                        ["id"] = id,
                        ["status"] = status,
                        ["statusText"] = StatusText(status),
                        ["progress"] = progress,
                        ["isComplete"] = isComplete,
                        ["name"] = name != null && name.Trim().Length > 0 ? name.Trim() : null,
                        ["quota"] = quota
                    });
                }
                Console.WriteLine($"  [achievement] 单条成就 {outItems.Count} 条，完成(状态3/4) {completed}，带名称 {enriched} 条");
                if (enriched == 0 && outItems.Count > 0)
                    Console.WriteLine("  [achievement] 提示：未能富化出成就名称（当前客户端字段名与预期不符），名称兜底导入将失效；建议用 dumpachievedbf 模式导出全字段帮助排查。");
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

        // net48 不支持 record（需 IsExternalInit），用元组承载 DBF 富化信息
        static Dictionary<int, (string? Name, int? Quota)> BuildAchievementDbfLookup(object mv, Type mvType)
        {
            var lookup = new Dictionary<int, (string? Name, int? Quota)>();
            var dbfM = mvType.GetMethods(BindingFlags.Public | BindingFlags.Instance)
                .FirstOrDefault(x => x.Name.Equals("GetAchievementsDbf", StringComparison.OrdinalIgnoreCase));
            if (dbfM == null) return lookup;
            try
            {
                foreach (var x in (IEnumerable)dbfM.Invoke(mv, null)!)
                {
                    if (x == null) continue;
                    int? id = ReadFirstInt(x, "ID", "Id", "AchievementId", "id");
                    if (id == null) continue;
                    string? name = ReadFirstString(x, "Name", "NameValue", "AchievementName", "Title", "Text");
                    int? quota = ReadFirstInt(x, "Quota", "MaxProgress", "Goal", "Target", "RequiredProgress");
                    lookup[id.Value] = (name != null && name.Trim().Length > 0 ? name.Trim() : null, quota);
                }
                Console.WriteLine($"  [achievement] DBF 富化表 {lookup.Count} 条");
            }
            catch (Exception ex)
            {
                Console.WriteLine($"  [achievement] DBF 富化失败（不影响导出）: {ex.Message}");
            }
            return lookup;
        }

        static string? ReadFirstString(object item, params string[] propNames)
        {
            var t = item.GetType();
            foreach (var p in propNames)
            {
                var m = t.GetProperty(p, BindingFlags.Public | BindingFlags.Instance);
                if (m == null) continue;
                try { if (m.GetValue(item) is string s && !string.IsNullOrWhiteSpace(s)) return s; } catch { }
            }
            return null;
        }

        static int? ReadFirstInt(object item, params string[] propNames)
        {
            var t = item.GetType();
            foreach (var p in propNames)
            {
                var m = t.GetProperty(p, BindingFlags.Public | BindingFlags.Instance);
                if (m == null) continue;
                try { var v = ToInt(m.GetValue(item)); if (v != null) return v; } catch { }
            }
            return null;
        }

        /// <summary>
        /// 导出成就 DBF 全表（dumpachievedbf 模式）：字段全量转储，不依赖玩家进度。
        /// 同时附带逐条成就状态对象的全属性（可能携带名称类字段）作为对照，
        /// 便于网站侧确认哪个字段是中文名 / 配额。写出 achievement-dbf-{时间戳}.json + latest 副本。
        /// </summary>
        static int DumpAchievementDbf(object mv, Type mvType)
        {
            List<Dictionary<string, object?>> dbfRows = new();
            string dbfSource = "";
            var dbfM = mvType.GetMethods(BindingFlags.Public | BindingFlags.Instance)
                .FirstOrDefault(x => x.Name.Equals("GetAchievementsDbf", StringComparison.OrdinalIgnoreCase));
            if (dbfM != null)
            {
                try
                {
                    foreach (var x in (IEnumerable)dbfM.Invoke(mv, null)!)
                        if (x != null && ToPropDict(x) is { } row) dbfRows.Add(row);
                    dbfSource = "GetAchievementsDbf";
                    Console.WriteLine($"  [dbf] 成就数据库 {dbfRows.Count} 条");
                }
                catch (Exception ex) { Console.WriteLine($"  [dbf] GetAchievementsDbf 调用失败: {ex.Message}"); }
            }
            else
            {
                Console.WriteLine("  [dbf] 未发现 GetAchievementsDbf 方法");
            }

            List<Dictionary<string, object?>> progressItems = new();
            var infoM = mvType.GetMethods(BindingFlags.Public | BindingFlags.Instance)
                .FirstOrDefault(x => x.Name.Equals("GetAchievementsInfo", StringComparison.OrdinalIgnoreCase) && x.GetParameters().Length == 0);
            if (infoM != null)
            {
                try
                {
                    var info = infoM.Invoke(mv, null);
                    var listProp = info?.GetType().GetProperty("Achievements");
                    if (listProp != null)
                    {
                        foreach (var x in (IEnumerable)listProp.GetValue(info)!)
                            if (x != null && ToPropDict(x) is { } item) progressItems.Add(item);
                        Console.WriteLine($"  [dbf] 逐条成就状态 {progressItems.Count} 条（全属性）");
                    }
                }
                catch (Exception ex) { Console.WriteLine($"  [dbf] GetAchievementsInfo 转储失败: {ex.Message}"); }
            }

            if (dbfRows.Count == 0 && progressItems.Count == 0)
            {
                Console.Error.WriteLine("  [dbf] 没有读到任何成就记录，未写出文件。");
                return 1;
            }
            if (dbfRows.Count > 0)
            {
                Console.WriteLine($"  [dbf] 数据库记录字段: {string.Join(", ", dbfRows[0].Keys)}");
            }

            string? dataDir = FindDataDir();
            if (dataDir == null)
            {
                Console.Error.WriteLine("  [dbf] 找不到输出目录。");
                return 1;
            }
            var payload = new Dictionary<string, object?>
            {
                ["source"] = dbfSource,
                ["dumpedAt"] = DateTime.Now.ToString("yyyy-MM-dd HH:mm:ss"),
                ["dbfCount"] = dbfRows.Count,
                ["records"] = dbfRows,
                ["progressItemCount"] = progressItems.Count,
                ["progressItems"] = progressItems
            };
            var fileStamp = DateTime.Now.ToString("yyyyMMdd-HHmmss");
            var outFile = Path.Combine(dataDir, $"achievement-dbf-{fileStamp}.json");
            WriteJson(outFile, payload);
            CopyLatest(outFile, Path.Combine(dataDir, "achievement-dbf.json"), "成就DBF");
            Console.WriteLine("成就 DBF 导出完成。");
            return 0;
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

        // ── 目标进程选择 ──────────────────────────────────────────────────────
        // 真正的炉石是 Unity/Mono 程序，必然加载 mono* 模块（现行版本为 mono-2.0-bdwgc.dll）；
        // 同名的非游戏进程通常只有主模块可枚举。按这个特征筛选，不依赖进程顺序。

        /// <summary>
        /// 枚举所有名为 Hearthstone 的进程并逐个打印诊断（可见模块数 / 是否加载 Mono），
        /// 返回其中加载了 Mono 的真游戏进程 PID；找不到时返回 null。
        /// </summary>
        static int? SelectHearthstoneProcess()
        {
            Process[] candidates;
            try { candidates = Process.GetProcessesByName("Hearthstone"); }
            catch (Exception ex)
            {
                Console.WriteLine("枚举 Hearthstone 进程失败: " + ex.Message);
                return null;
            }
            if (candidates.Length == 0)
            {
                Console.WriteLine("未检测到名为 Hearthstone 的进程（游戏可能未启动）。");
                return null;
            }

            Console.WriteLine($"检测到 {candidates.Length} 个名为 Hearthstone 的进程：");
            int? gamePid = null;
            foreach (var p in candidates)
            {
                int moduleCount = 0;
                bool hasMono = false;
                try
                {
                    foreach (ProcessModule m in p.Modules)
                    {
                        moduleCount++;
                        if (m.ModuleName.StartsWith("mono", StringComparison.OrdinalIgnoreCase)) hasMono = true;
                    }
                }
                catch { /* 权限不足或进程刚退出：按已枚举到的部分判断 */ }

                Console.WriteLine($"  PID {p.Id}: 可见模块 {moduleCount} 个"
                    + (hasMono ? "，已加载 Mono（游戏进程）" : "，未加载 Mono"));
                if (hasMono && gamePid == null) gamePid = p.Id;
            }

            if (gamePid == null)
                Console.WriteLine("以上进程均未加载 Mono 模块，无法确定游戏进程，将交由读取库按名称自选。");
            else
                Console.WriteLine("选定游戏进程 PID: " + gamePid);
            return gamePid;
        }

        // 自适应构造：优先无参；否则取参数最少的构造函数，尽量补全参数
        static object CreateInstanceAdaptive(Type t, int? processId)
        {
            var ctors = t.GetConstructors(BindingFlags.Public | BindingFlags.Instance);
            var p0 = ctors.FirstOrDefault(c => c.GetParameters().Length == 0);
            if (p0 != null) return Activator.CreateInstance(t)!;

            var ctor = ctors.OrderBy(c => c.GetParameters().Length).First();
            var args = ctor.GetParameters().Select(p => MakeArg(p.ParameterType, processId)).ToArray();
            return ctor.Invoke(args)!;
        }

        static object? MakeArg(Type pt, int? processId)
        {
            // MindVision 构造函数的 inputProcessId（int?）：显式传入筛选出的游戏进程 PID，
            // 避免 UnitySpy 按名称 FirstOrDefault() 自选到非游戏进程
            if (Nullable.GetUnderlyingType(pt) == typeof(int))
                return processId; // 有值→装箱 int；无值→null
            if (pt == typeof(int))
                return processId ?? 0;
            if (pt == typeof(string)) return "Hearthstone";
            if (pt == typeof(EventHandler))
                return new EventHandler(OnMindVisionMessage);
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

        // MindVision 通过 MessageEventArgs.Message 属性传日志文本；直接 ToString() 只会打印
        // 类型名（v1.4.1 排障时初始化日志因此全部被吞）。反射取 Message，取不到再退回 ToString。
        static void OnMindVisionMessage(object? sender, EventArgs e)
        {
            string text = e?.ToString() ?? "";
            try
            {
                if (e?.GetType().GetProperty("Message")?.GetValue(e) is string msg && msg.Length > 0)
                    text = msg;
            }
            catch { }
            Console.WriteLine("  [MindVision] " + text);
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

        public static string FindFirestoneLib()
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

        // selftest 模式：合成与真实导出同构的数据（中文名/引号/换行/emoji/null 字段），验证
        // 「序列化 → 写文件 → latest 副本 → JSON 回读」全链路。全部写入临时目录，
        // 不触碰真实输出（cosmetics.json / achievements.json），也不读取游戏。
        static int RunExportSelfTest()
        {
            var dataDir = Path.Combine(Path.GetTempPath(), "hs-collector-selftest");
            try { Directory.Delete(dataDir, true); } catch { }
            Directory.CreateDirectory(dataDir);
            Console.WriteLine("[selftest] 导出管线自测（合成数据，未附加游戏）");
            Console.WriteLine("  输出目录: " + dataDir);

            var stamp = DateTime.Now.ToString("o");
            var fileStamp = DateTime.Now.ToString("yyyyMMdd-HHmmss");
            var src = "selftest (synthetic data, no game attached)";

            // 形状与真实导出一致：卡背数字 id、硬币/皮肤字符串 id、byClass 中文职业键
            var cardBackIds = Enumerable.Range(1, 170).Select(i => (object)(5000 + i)).ToList();
            var coinIds = Enumerable.Range(1, 28).Select(i => (object)$"COIN_{800 + i:000}").ToList();
            var heroSkins = Enumerable.Range(1, 165).Select(i => (object)$"HERO_{1000 + i:000}").ToList();
            var heroByClass = new Dictionary<string, Dictionary<string, int>>
            {
                ["法师"] = new Dictionary<string, int> { ["owned"] = 12, ["total"] = 20 },
                ["战士"] = new Dictionary<string, int> { ["owned"] = 8, ["total"] = 19 },
                ["恶魔猎手"] = new Dictionary<string, int> { ["owned"] = 3, ["total"] = 10 },
            };
            var cosmetics = new Dictionary<string, object?>
            {
                ["source"] = src,
                ["collectedAt"] = stamp,
                ["cardBacks"] = new Dictionary<string, object?> { ["count"] = cardBackIds.Count, ["ids"] = cardBackIds },
                ["coins"] = new Dictionary<string, object?> { ["count"] = coinIds.Count, ["ids"] = coinIds },
                ["heroSkins"] = new Dictionary<string, object?> { ["count"] = heroSkins.Count, ["ids"] = heroSkins, ["byClass"] = heroByClass }
            };

            // 刁钻字符压测编码器：引号、反斜杠、换行、制表符、emoji、零宽字符
            string[] tricky =
            {
                "紫罗兰监狱：营救行动", "带\"引号\"的成就", "带\\反斜杠的成就",
                "换行\n成就", "制表\t成就", "表情 🐸☕ 成就", "\uFEFF零宽字符成就"
            };
            var items = new List<Dictionary<string, object?>>();
            for (int i = 1; i <= 800; i++)
            {
                int status = i % 3 == 0 ? 3 : i % 7 == 0 ? 4 : 2;
                items.Add(new Dictionary<string, object?>
                {
                    ["id"] = 100000 + i * 3,
                    ["status"] = status,
                    ["statusText"] = StatusText(status),
                    ["progress"] = i % 5,
                    ["isComplete"] = status == 3 || status == 4,
                    ["name"] = i % 9 == 0 ? null : tricky[i % tricky.Length] + " #" + i,
                    ["quota"] = i % 4 == 0 ? (int?)null : i % 4,
                });
            }
            var categories = new List<object>
            {
                new Dictionary<string, object?>
                {
                    ["id"] = 394, ["name"] = "游戏玩法", ["icon"] = "achievement_zone_gameplay",
                    ["numCompleted"] = 1234, ["numPoints"] = 25600
                },
                new Dictionary<string, object?>
                {
                    ["id"] = 395, ["name"] = "收集\",祸水\"", ["icon"] = null, ["numCompleted"] = 2797
                },
            };

            var cosmeticsFile = Path.Combine(dataDir, $"cosmetics-{fileStamp}.json");
            WriteJson(cosmeticsFile, cosmetics);
            CopyLatest(cosmeticsFile, Path.Combine(dataDir, "cosmetics.json"), "外观收藏");

            var payload = new Dictionary<string, object?>
            {
                ["source"] = src,
                ["collectedAt"] = stamp,
                ["totalCompleted"] = 2797,
                ["categories"] = categories,
                ["itemsTotal"] = items.Count,
                ["itemsCompleted"] = 2797,
                ["items"] = items,
            };
            var achFile = Path.Combine(dataDir, $"achievements-{fileStamp}.json");
            WriteJson(achFile, payload);
            CopyLatest(achFile, Path.Combine(dataDir, "achievements.json"), "成就明细");

            // 回读校验：与网站导入侧相同，按 JSON 解析并核对条数
            using (var doc = System.Text.Json.JsonDocument.Parse(File.ReadAllText(achFile)))
            {
                int n = doc.RootElement.GetProperty("items").GetArrayLength();
                if (n != items.Count)
                    throw new InvalidOperationException($"成就条目回读条数不一致: {n} != {items.Count}");
                Console.WriteLine($"  [selftest] 回读 OK: 成就条目 {n} 条，与写入一致");
            }
            using (var doc = System.Text.Json.JsonDocument.Parse(File.ReadAllText(cosmeticsFile)))
            {
                int cb = doc.RootElement.GetProperty("cardBacks").GetProperty("ids").GetArrayLength();
                if (cb != cardBackIds.Count)
                    throw new InvalidOperationException($"卡背回读条数不一致: {cb} != {cardBackIds.Count}");
                Console.WriteLine($"  [selftest] 回读 OK: 卡背 {cb} 条，与写入一致");
            }
            foreach (var f in new[] { cosmeticsFile, achFile, Path.Combine(dataDir, "cosmetics.json"), Path.Combine(dataDir, "achievements.json") })
                Console.WriteLine($"  [selftest] 文件: {Path.GetFileName(f)} ({new FileInfo(f).Length / 1024.0:F1} KB)");

            Console.ForegroundColor = ConsoleColor.Green;
            Console.WriteLine("========== 导出自测通过 ==========");
            Console.ResetColor();
            Console.WriteLine("  已验证: 序列化(含中文/引号/换行/emoji) → 写文件 → latest 副本 → JSON 回读。");
            Console.WriteLine("  未覆盖: 游戏内存读取（需炉石运行中，由正式采集验证）。");
            return 0;
        }

        static void WriteJson(string path, object value)
        {
            var json = System.Text.Json.JsonSerializer.Serialize(value,
                new System.Text.Json.JsonSerializerOptions { WriteIndented = true, Encoder = System.Text.Encodings.Web.JavaScriptEncoder.UnsafeRelaxedJsonEscaping });
            File.WriteAllText(path, json);
            Console.WriteLine("  写入: " + path);
        }

        // 写出带时间戳文件的同时，复制一份固定名 latest，供依赖固定文件名的本地查看器/server 使用
        static void CopyLatest(string srcFile, string latestFile, string label)
        {
            try
            {
                File.Copy(srcFile, latestFile, true);
                Console.WriteLine("  已同步最新副本: " + latestFile);
            }
            catch (Exception ex)
            {
                Console.WriteLine($"  [warn] {label} 最新副本同步失败（不影响带时间戳文件导入）: " + ex.Message);
            }
        }

        // 采集成功后的醒目摘要（彩色 + 分隔线 + 各类数量 + 输出目录），同时填充 LastResult 供 GUI 使用
        public static void PrintCompletion(string dataDir, int cardBack, int coin, int hero,
            Dictionary<string, object> heroByClass, int? achTotal)
        {
            LastResult = new CollectorResult
            {
                DataDir = dataDir,
                CardBacks = cardBack,
                Coins = coin,
                HeroSkins = hero,
                Achievements = achTotal
            };
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
    }
}
