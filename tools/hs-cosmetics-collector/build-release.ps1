# 一键构建并发布炉石收藏与成就采集器
# 用法（PowerShell）：
#   cd tools/hs-cosmetics-collector
#   .\build-release.ps1
#
# 行为：
#   1. 读取 csproj 中的 <Version>（如 1.1.0）
#   2. 编译 Release：
#      - 机器装有 dotnet SDK 时用 dotnet build
#      - 没有时自动下载 Roslyn 编译器（Microsoft.Net.Compilers.Toolset，
#        缓存在 .build/），配合上一个发布 zip 里的运行时依赖 DLL 编译
#   3. 打包 bin/Release/net48（exe + 依赖 DLL + lib/）+ README-dist.txt 为
#      public/hs-cosmetics-collector-v{Version}.zip（不含 .pdb）
#   4. 输出 SHA256 供用户核对下载完整性
#
# 注意：
#   - ApplicationIcon(icon.ico) 与 app.manifest 由编译器嵌入，重新编译后生效。
#   - 运行时依赖（System.Text.Json 等）与 lib/UnitySpy* 若 bin 里缺失，
#     会从 public/ 下最近一个旧发布 zip 提取（这些 DLL 被 .gitignore 忽略，
#     版本不变时可安全复用）。

$ErrorActionPreference = 'Stop'

$projectDir = Split-Path -Parent $MyInvocation.MyCommand.Definition
$csprojPath = Join-Path $projectDir 'hs-cosmetics-collector.csproj'
$binDir = Join-Path $projectDir 'bin\Release\net48'
$buildDir = Join-Path $projectDir '.build'

# ── 解析版本号与程序集元数据 ────────────────────────────────────────────
[xml]$csproj = Get-Content -Path $csprojPath -Encoding UTF8
$version = $csproj.Project.PropertyGroup.Version
if (-not $version) {
  Write-Warning 'csproj 中未找到 <Version>，回退使用 1.0.0'
  $version = '1.0.0'
}
$assemblyVersion = $csproj.Project.PropertyGroup.AssemblyVersion
if (-not $assemblyVersion) { $assemblyVersion = "$version.0" }

# ── 编译 ────────────────────────────────────────────────────────────────
function Invoke-DotnetBuild {
  Push-Location $projectDir
  try {
    dotnet build -c Release 2>&1 | ForEach-Object { Write-Host $_ }
    return ($LASTEXITCODE -eq 0)
  }
  finally { Pop-Location }
}

# Roslyn 兜底：下载 Microsoft.Net.Compilers.Toolset（nupkg 即 zip），用其中的 csc.exe 编译。
# 引用程序集取自系统 .NET Framework 4.x 目录；NuGet 依赖 DLL 从上一个发布 zip 提取。
function Invoke-RoslynBuild {
  $roslynVersion = '4.10.0'
  $csc = Join-Path $buildDir "roslyn-$roslynVersion\tasks\net472\csc.exe"
  if (-not (Test-Path $csc)) {
    Write-Host "==> 下载 Roslyn 编译器 $roslynVersion（一次性，缓存在 .build/）..." -ForegroundColor Cyan
    New-Item -ItemType Directory -Path $buildDir -Force | Out-Null
    [Net.ServicePointManager]::SecurityProtocol = [Net.SecurityProtocolType]::Tls12
    $nupkg = Join-Path $buildDir "roslyn.$roslynVersion.nupkg"
    Invoke-WebRequest -Uri "https://www.nuget.org/api/v2/package/Microsoft.Net.Compilers.Toolset/$roslynVersion" -OutFile $nupkg
    $zip = Join-Path $buildDir "roslyn.$roslynVersion.zip"
    Copy-Item $nupkg $zip -Force
    Expand-Archive -Path $zip -DestinationPath (Join-Path $buildDir "roslyn-$roslynVersion") -Force
    Remove-Item $nupkg, $zip -Force
  }
  if (-not (Test-Path $csc)) { throw "Roslyn 下载失败：找不到 $csc" }

  # 框架引用程序集（x64 主机；UnitySpy 为托管 AnyCPU，可加载进 64 位进程；缺失时退回 Framework）
  $fwDir = 'C:\Windows\Microsoft.NET\Framework64\v4.0.30319'
  if (-not (Test-Path (Join-Path $fwDir 'System.Windows.Forms.dll'))) { $fwDir = 'C:\Windows\Microsoft.NET\Framework\v4.0.30319' }

  # 运行时依赖 DLL：优先 bin 现有，其次从旧发布 zip 提取
  $depsDir = Join-Path $buildDir 'runtime-deps'
  $depNames = @(
    'Microsoft.Bcl.AsyncInterfaces.dll', 'System.Buffers.dll', 'System.Memory.dll',
    'System.Numerics.Vectors.dll', 'System.Runtime.CompilerServices.Unsafe.dll',
    'System.Text.Encodings.Web.dll', 'System.Text.Json.dll',
    'System.Threading.Tasks.Extensions.dll', 'System.ValueTuple.dll',
    'HsCosmeticsCollector.exe.config'
  )
  $missing = $depNames | Where-Object { -not (Test-Path (Join-Path $binDir $_)) }
  if ($missing) {
    $publicDir = Join-Path (Resolve-Path (Join-Path $projectDir '..\..')).Path 'public'
    $prevZip = Get-ChildItem $publicDir -Filter 'hs-cosmetics-collector-v*.zip' -ErrorAction SilentlyContinue |
      Sort-Object LastWriteTime -Descending | Select-Object -First 1
    if (-not $prevZip) { throw "bin 里缺依赖（$($missing -join ', ')）且找不到旧发布 zip 可提取" }
    Write-Host "==> 从旧发布包提取运行时依赖: $($prevZip.Name)" -ForegroundColor Cyan
    $tmp = Join-Path $env:TEMP "hs-collector-deps-$([IO.Path]::GetFileNameWithoutExtension($prevZip.Name))"
    if (Test-Path $tmp) { Remove-Item $tmp -Recurse -Force }
    Expand-Archive -Path $prevZip.FullName -DestinationPath $tmp -Force
    New-Item -ItemType Directory -Path $depsDir -Force | Out-Null
    foreach ($name in $depNames) {
      $src = Join-Path $tmp $name
      if (Test-Path $src) { Copy-Item $src $depsDir -Force }
      elseif ($name -ne 'HsCosmeticsCollector.exe.config') { throw "旧发布包中缺少 $name" }
    }
    # lib/（UnitySpy 运行时库）也一并恢复
    $libSrc = Join-Path $tmp 'lib'
    if ((Test-Path $libSrc) -and -not (Test-Path (Join-Path $binDir 'lib'))) {
      Copy-Item $libSrc (Join-Path $binDir 'lib') -Recurse -Force
    }
    Remove-Item $tmp -Recurse -Force
  }
  foreach ($name in $depNames | Where-Object { $_ -ne 'HsCosmeticsCollector.exe.config' }) {
    if (-not (Test-Path (Join-Path $binDir $name))) {
      $dep = Join-Path $depsDir $name
      if (Test-Path $dep) { Copy-Item $dep $binDir -Force }
    }
  }

  # csc 不会像 dotnet 那样生成 AssemblyVersionInfo，手工生成一份（版本信息对杀软信誉是正向信号）
  $asmInfo = @(
    "using System.Reflection;",
    "[assembly: AssemblyTitle(""$($csproj.Project.PropertyGroup.AssemblyTitle)"")]",
    "[assembly: AssemblyProduct(""$($csproj.Project.PropertyGroup.Product)"")]",
    "[assembly: AssemblyCompany(""$($csproj.Project.PropertyGroup.Company)"")]",
    "[assembly: AssemblyDescription(""$($csproj.Project.PropertyGroup.Description)"")]",
    "[assembly: AssemblyCopyright(""$($csproj.Project.PropertyGroup.Copyright)"")]",
    "[assembly: System.Resources.NeutralResourcesLanguage(""$($csproj.Project.PropertyGroup.NeutralLanguage)"")]",
    "[assembly: AssemblyVersion(""$assemblyVersion"")]",
    "[assembly: AssemblyFileVersion(""$assemblyVersion"")]"
  ) -join [Environment]::NewLine
  $asmInfoPath = Join-Path $buildDir 'AssemblyInfo.cs'
  [IO.File]::WriteAllText($asmInfoPath, $asmInfo, (New-Object System.Text.UTF8Encoding $false))

  New-Item -ItemType Directory -Path $binDir -Force | Out-Null
  $refs = @(
    "$fwDir\System.dll", "$fwDir\System.Core.dll", "$fwDir\System.Data.dll",
    "$fwDir\System.Drawing.dll", "$fwDir\System.Windows.Forms.dll"
  ) + ($depNames | Where-Object { $_ -like '*.dll' } | ForEach-Object { Join-Path $binDir $_ })
  $cscArgs = @(
    '/target:winexe',
    '/platform:x64',   # 炉石传说是 64 位进程；宿主必须 x64 才能读取其模块（32 位会报 Failed to read modules）
    '/langversion:latest', '/nullable:enable', '/utf8output', '/optimize+', '/deterministic',
    "/win32icon:$(Join-Path $projectDir 'icon.ico')",
    "/win32manifest:$(Join-Path $projectDir 'app.manifest')",
    "/out:$(Join-Path $binDir 'HsCosmeticsCollector.exe')"
  ) + ($refs | ForEach-Object { "/r:$_" }) + @(
    (Join-Path $projectDir 'Program.cs'),
    (Join-Path $projectDir 'CollectorForm.cs'),
    $asmInfoPath
  )
  Write-Host "==> Roslyn 编译 (v$version)..." -ForegroundColor Cyan
  & $csc $cscArgs 2>&1 | ForEach-Object { Write-Host $_ }
  return ($LASTEXITCODE -eq 0)
}

Write-Host "==> 构建 Release (v$version) ..." -ForegroundColor Cyan
# 检测「可用 SDK」而非仅 dotnet 命令（仅装了 dotnet 宿主而无 SDK 时，dotnet build 会失败，需退回 Roslyn）
$hasSdk = $false
try {
  $sdkVer = & dotnet --version 2>$null
  $hasSdk = ($LASTEXITCODE -eq 0) -and (-not [string]::IsNullOrWhiteSpace($sdkVer))
} catch { $hasSdk = $false }
$ok = if ($hasSdk) { Invoke-DotnetBuild } else { Write-Host "==> 未检测到可用的 .NET SDK，改用 Roslyn 编译" -ForegroundColor Yellow; Invoke-RoslynBuild }
if (-not $ok) { throw '编译失败' }

if (-not (Test-Path (Join-Path $binDir 'HsCosmeticsCollector.exe'))) { throw "找不到构建输出目录: $binDir" }

# ── 打包 ────────────────────────────────────────────────────────────────
# 说明文件：优先 README-dist.txt（随包分发的使用说明）
$readme = Join-Path $projectDir 'README-dist.txt'
if (-not (Test-Path $readme)) {
  $md = Join-Path $projectDir 'README.md'
  if (Test-Path $md) { $readme = $md } else { Write-Warning '未找到 README-dist.txt / README.md，打包将不含说明文件' }
}

$repoRoot = (Resolve-Path (Join-Path $projectDir '..\..')).Path
$publicDir = Join-Path $repoRoot 'public'
if (-not (Test-Path $publicDir)) { New-Item -ItemType Directory -Path $publicDir | Out-Null }
$zipName = "hs-cosmetics-collector-v$version.zip"
$zipPath = Join-Path $publicDir $zipName

$tmpDir = Join-Path $env:TEMP "hs-collector-publish-$version"
if (Test-Path $tmpDir) { Remove-Item $tmpDir -Recurse -Force }
New-Item -ItemType Directory -Path $tmpDir | Out-Null
# 排除 .pdb（调试符号不随包分发）
Copy-Item -Path (Join-Path $binDir '*') -Destination $tmpDir -Recurse -Force -Exclude '*.pdb'
if (Test-Path $readme) { Copy-Item $readme $tmpDir -Force }

if (Test-Path $zipPath) { Remove-Item $zipPath -Force }
Compress-Archive -Path (Join-Path $tmpDir '*') -DestinationPath $zipPath -Force
Remove-Item $tmpDir -Recurse -Force

$hash = (Get-FileHash -Algorithm SHA256 -LiteralPath $zipPath).Hash
$sizeMB = [math]::Round((Get-Item $zipPath).Length / 1MB, 2)
Write-Host "==> 已生成: $zipPath ($sizeMB MB)" -ForegroundColor Green
Write-Host "==> SHA256: $hash" -ForegroundColor Green
Write-Host "==> 前端下载链接应设置为: /$zipName" -ForegroundColor Green
Write-Host "==> 记得把该 zip 提交到 git（它是网站静态下载资源）。" -ForegroundColor Green
