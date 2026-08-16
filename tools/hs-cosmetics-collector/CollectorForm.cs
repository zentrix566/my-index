using System;
using System.Diagnostics;
using System.Drawing;
using System.IO;
using System.Text;
using System.Threading.Tasks;
using System.Windows.Forms;

namespace HsCosmeticsCollector
{
    /// <summary>
    /// 采集器图形界面：环境状态检测 → 一键采集（后台线程）→ 日志实时输出 →
    /// 结果摘要 + 打开输出文件夹。采集逻辑复用 Program.RunCollector，
    /// 通过重定向 Console.Out/Error 把原有日志全部转发到界面日志框。
    /// </summary>
    internal sealed class CollectorForm : Form
    {
        private readonly Label _introLabel;
        private readonly Label _hsStatusLabel;
        private readonly Label _libStatusLabel;
        private readonly TextBox _logBox;
        private readonly Button _collectButton;
        private readonly Button _openFolderButton;
        private readonly Button _openSiteButton;
        private readonly Button _copyLogButton;
        private readonly Label _summaryLabel;
        private readonly System.Windows.Forms.Timer _statusTimer;
        private bool _running;

        // 导入页默认打开线上站点；exe 同目录放 site-url.txt（一行 URL）可覆盖，方便本地/自部署环境
        private const string DefaultSiteUrl = "https://zentrix566.top/hearthstone/collection";
        private readonly string _siteUrl;

        public CollectorForm()
        {
            Text = "炉石收藏与成就采集器";
            Font = new Font("Microsoft YaHei UI", 9F);
            FormBorderStyle = FormBorderStyle.FixedSingle;
            MaximizeBox = false;
            StartPosition = FormStartPosition.CenterScreen;
            AutoScaleMode = AutoScaleMode.Dpi;
            ClientSize = new Size(720, 540);
            MinimumSize = new Size(600, 440);
            try { Icon = Icon.ExtractAssociatedIcon(Application.ExecutablePath); } catch { }
            _siteUrl = LoadSiteUrl();

            _introLabel = new Label
            {
                Text = "使用方法：先启动炉石传说并进入主界面（建议打开一次收藏页），然后点击「开始采集」。",
                Dock = DockStyle.Top,
                Padding = new Padding(12, 12, 12, 4),
                AutoSize = true
            };

            var statusPanel = new FlowLayoutPanel
            {
                Dock = DockStyle.Top,
                FlowDirection = FlowDirection.LeftToRight,
                Padding = new Padding(12, 2, 12, 6),
                AutoSize = true
            };
            _hsStatusLabel = new Label { AutoSize = true, Margin = new Padding(0, 4, 24, 4) };
            _libStatusLabel = new Label { AutoSize = true, Margin = new Padding(0, 4, 0, 4) };
            statusPanel.Controls.AddRange(new Control[] { _hsStatusLabel, _libStatusLabel });

            _summaryLabel = new Label
            {
                Dock = DockStyle.Bottom,
                Padding = new Padding(12, 8, 12, 4),
                Height = 56,
                Visible = false,
                ForeColor = Color.FromArgb(46, 125, 50)
            };

            _logBox = new TextBox
            {
                Dock = DockStyle.Fill,
                Multiline = true,
                ReadOnly = true,
                ScrollBars = ScrollBars.Vertical,
                BackColor = Color.FromArgb(32, 32, 32),
                ForeColor = Color.FromArgb(230, 230, 230),
                Font = new Font("Consolas", 9F),
                MaxLength = 0
            };

            var buttonPanel = new FlowLayoutPanel
            {
                Dock = DockStyle.Bottom,
                FlowDirection = FlowDirection.LeftToRight,
                Padding = new Padding(12, 6, 12, 10)
            };
            _collectButton = new Button
            {
                Text = "开始采集",
                AutoSize = true,
                Padding = new Padding(8, 4, 8, 4)
            };
            _collectButton.Click += async (_, _) => await RunCollectAsync();
            _openFolderButton = new Button
            {
                Text = "打开输出文件夹",
                AutoSize = true,
                Enabled = false,
                Padding = new Padding(8, 4, 8, 4)
            };
            _openFolderButton.Click += (_, _) => OpenOutputFolder();
            _openSiteButton = new Button
            {
                Text = "打开网站导入页",
                AutoSize = true,
                Padding = new Padding(8, 4, 8, 4)
            };
            _openSiteButton.Click += (_, _) =>
            {
                try { Process.Start(new ProcessStartInfo(_siteUrl) { UseShellExecute = true }); }
                catch { }
            };
            _copyLogButton = new Button
            {
                Text = "复制日志",
                AutoSize = true,
                Padding = new Padding(8, 4, 8, 4)
            };
            _copyLogButton.Click += (_, _) =>
            {
                try { Clipboard.SetText(_logBox.Text.Length > 0 ? _logBox.Text : "(无日志)"); }
                catch { }
            };
            buttonPanel.Controls.AddRange(new Control[] { _collectButton, _openFolderButton, _openSiteButton, _copyLogButton });

            Controls.Add(_logBox);
            Controls.Add(_summaryLabel);
            Controls.Add(buttonPanel);
            Controls.Add(statusPanel);
            Controls.Add(_introLabel);

            AcceptButton = null; // 防止回车误触发采集
            RefreshStatus();

            _statusTimer = new System.Windows.Forms.Timer { Interval = 2000 };
            _statusTimer.Tick += (_, _) => RefreshStatus();
            _statusTimer.Start();

            AppendLog("就绪。点击「开始采集」读取游戏内存，导出收藏与成就数据。");
            AppendLog("");
        }

        // 环境状态：炉石进程 + UnitySpy 读取库
        private void RefreshStatus()
        {
            bool hsRunning;
            try { hsRunning = Process.GetProcessesByName("Hearthstone").Length > 0; }
            catch { hsRunning = false; }
            _hsStatusLabel.Text = hsRunning ? "● 炉石传说：运行中" : "● 炉石传说：未检测到（请先启动游戏）";
            _hsStatusLabel.ForeColor = hsRunning ? Color.FromArgb(46, 125, 50) : Color.FromArgb(183, 28, 28);

            var libPath = Path.Combine(AppContext.BaseDirectory, "lib", "UnitySpy.HearthstoneLib.dll");
            if (!File.Exists(libPath)) libPath = Program.FindFirestoneLib();
            bool libOk = libPath != null && File.Exists(libPath);
            _libStatusLabel.Text = libOk
                ? "● 读取库：已就绪"
                : "● 读取库：缺失（需安装 Firestone，或确认 lib/ 目录完整）";
            _libStatusLabel.ForeColor = libOk ? Color.FromArgb(46, 125, 50) : Color.FromArgb(183, 28, 28);

            _collectButton.Enabled = !_running;
        }

        private async Task RunCollectAsync()
        {
            if (_running) return;
            _running = true;
            _collectButton.Enabled = false;
            _openFolderButton.Enabled = false;
            _summaryLabel.Visible = false;
            _logBox.Clear();
            AppendLog("========== 开始采集 ==========");

            // 把采集器的控制台输出转发到界面日志框
            var writer = new TextBoxWriter(this, _logBox);
            var oldOut = Console.Out;
            var oldError = Console.Error;
            Console.SetOut(writer);
            Console.SetError(writer);
            int exitCode;
            try
            {
                exitCode = await Task.Run(() => Program.RunCollector(Array.Empty<string>()));
            }
            catch (Exception ex)
            {
                AppendLog("");
                AppendLog("[错误] " + ex.Message);
                if (ex.InnerException != null) AppendLog("  内部异常: " + ex.InnerException.Message);
                AppendLog("请点击「复制日志」并反馈。");
                exitCode = 99;
            }
            finally
            {
                Console.SetOut(oldOut);
                Console.SetError(oldError);
                _running = false;
            }

            _collectButton.Enabled = true;
            if (exitCode == 0 && Program.LastResult != null)
            {
                var r = Program.LastResult;
                _summaryLabel.Text =
                    $"采集完成：卡背 {r.CardBacks} 个、幸运币 {r.Coins} 个、英雄皮肤 {r.HeroSkins} 个" +
                    (r.Achievements != null ? $"、成就完成 {r.Achievements} 项。" : "。") +
                    $"点「打开网站导入页」，收藏页选 cosmetics.json，成就页的「导入游戏内进度」选 achievements.json。";
                _summaryLabel.Visible = true;
                _openFolderButton.Enabled = Directory.Exists(r.DataDir);
                AppendLog("");
                AppendLog("采集成功。下一步：点「打开网站导入页」到网站导入两个 JSON 文件。");
            }
            else
            {
                AppendLog("");
                AppendLog($"采集未完成（退出码 {exitCode}）。可点击「复制日志」反馈问题。");
            }
        }

        private void OpenOutputFolder()
        {
            var dir = Program.LastResult?.DataDir;
            if (string.IsNullOrEmpty(dir) || !Directory.Exists(dir)) return;
            try { Process.Start(new ProcessStartInfo("explorer.exe", $"\"{dir}\"") { UseShellExecute = true }); }
            catch { }
        }

        // 读取 exe 同目录 site-url.txt（一行以 http(s):// 开头的 URL）覆盖默认导入页地址
        private static string LoadSiteUrl()
        {
            try
            {
                var path = Path.Combine(AppContext.BaseDirectory, "site-url.txt");
                if (File.Exists(path))
                {
                    var url = File.ReadAllText(path).Trim();
                    if (url.StartsWith("http://", StringComparison.OrdinalIgnoreCase)
                        || url.StartsWith("https://", StringComparison.OrdinalIgnoreCase))
                        return url;
                }
            }
            catch { }
            return DefaultSiteUrl;
        }

        private void AppendLog(string line)
        {
            if (_logBox.TextLength > 400_000) _logBox.Clear(); // 防御性截断，正常量级远达不到
            _logBox.AppendText(line + Environment.NewLine);
        }

        /// <summary>把 Console 输出转发到日志框的 TextWriter（跨线程安全）。</summary>
        private sealed class TextBoxWriter : TextWriter
        {
            private readonly CollectorForm _form;
            private readonly TextBox _box;

            public TextBoxWriter(CollectorForm form, TextBox box)
            {
                _form = form;
                _box = box;
            }

            public override Encoding Encoding => Encoding.UTF8;

            public override void Write(char value) => Write(value.ToString());

            public override void Write(string? value) => Post(value ?? "");

            public override void WriteLine(string? value) => Post((value ?? "") + Environment.NewLine);

            private void Post(string text)
            {
                if (_form.IsDisposed) return;
                if (_box.InvokeRequired)
                {
                    _box.BeginInvoke(new Action(() =>
                    {
                        if (!_form.IsDisposed) _box.AppendText(text);
                    }));
                }
                else
                {
                    _box.AppendText(text);
                }
            }
        }
    }
}
