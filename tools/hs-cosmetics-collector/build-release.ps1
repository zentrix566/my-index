# 一键构建并发布炉石外观采集器
# 用法（PowerShell）：
#   cd tools/hs-cosmetics-collector
#   .\build-release.ps1
#
# 行为：
#   1. 读取 csproj 中的 <Version>（如 1.0.0）
#   2. dotnet build -c Release
#   3. 把输出目录(bin/Release/net48，已含 lib/) + README.txt 打包为
#      public/hs-cosmetics-collector-v{Version}.zip
#   4. 输出带版本号的文件路径，供前端下载链接使用
#
# 注意：ApplicationIcon(icon.ico) 会被编译进 exe，因此重新 build 后图标才生效。

$ErrorActionPreference = 'Stop'

# 脚本所在目录 = 采集器项目根
$projectDir = Split-Path -Parent $MyInvocation.MyCommand.Definition
$csprojPath = Join-Path $projectDir 'hs-cosmetics-collector.csproj'

# 解析版本号
[xml]$csproj = Get-Content -Path $csprojPath -Encoding UTF8
$version = $csproj.Project.PropertyGroup.Version
if (-not $version) {
  Write-Warning 'csproj 中未找到 <Version>，回退使用 1.0.0'
  $version = '1.0.0'
}

# 构建
Write-Host "==> 构建 Release (v$version) ..." -ForegroundColor Cyan
Push-Location $projectDir
try {
  dotnet build -c Release
  if ($LASTEXITCODE -ne 0) { throw "dotnet build 失败 (exit $LASTEXITCODE)" }
}
finally {
  Pop-Location
}

# 收集要打包的文件
$binDir = Join-Path $projectDir 'bin' 'Release' 'net48'
if (-not (Test-Path $binDir)) { throw "找不到构建输出目录: $binDir" }
# 说明文件：优先 README.txt，回退 README.md（兼容不同命名习惯），都没有则仅告警
$readme = Join-Path $projectDir 'README.txt'
if (-not (Test-Path $readme)) {
  $md = Join-Path $projectDir 'README.md'
  if (Test-Path $md) { $readme = $md }
}
if (-not (Test-Path $readme)) { Write-Warning '未找到 README.txt / README.md，打包将不含说明文件' }

# 目标 zip：仓库 public/ 目录（前端下载资源）
$repoRoot = (Resolve-Path (Join-Path $projectDir '..' '..')).Path
$publicDir = Join-Path $repoRoot 'public'
if (-not (Test-Path $publicDir)) { New-Item -ItemType Directory -Path $publicDir | Out-Null }
$zipName = "hs-cosmetics-collector-v$version.zip"
$zipPath = Join-Path $publicDir $zipName

# 临时暂存目录（避免把旧 zip 自己也打进去）
$tmpDir = Join-Path $env:TEMP "hs-collector-publish-$version"
if (Test-Path $tmpDir) { Remove-Item $tmpDir -Recurse -Force }
New-Item -ItemType Directory -Path $tmpDir | Out-Null
Copy-Item -Path (Join-Path $binDir '*') -Destination $tmpDir -Recurse -Force
if (Test-Path $readme) { Copy-Item -Path $readme -Destination $tmpDir -Force }

# 生成 zip（先删旧）
if (Test-Path $zipPath) { Remove-Item $zipPath -Force }
Compress-Archive -Path (Join-Path $tmpDir '*') -DestinationPath $zipPath -Force
Remove-Item $tmpDir -Recurse -Force

# 提示旧的不带版本号的文件
$legacyZip = Join-Path $publicDir 'hs-cosmetics-collector.zip'
if (Test-Path $legacyZip) {
  Write-Host "==> 检测到旧的无版本号文件: public/hs-cosmetics-collector.zip" -ForegroundColor Yellow
  Write-Host "    建议删除它，并把前端下载链接指向带版本号的文件（见下方）。" -ForegroundColor Yellow
}

$sizeMB = [math]::Round((Get-Item $zipPath).Length / 1MB, 2)
Write-Host "==> 已生成: $zipPath ($sizeMB MB)" -ForegroundColor Green
Write-Host "==> 前端下载链接应设置为: /$zipName" -ForegroundColor Green
Write-Host "==> 记得把该 zip 提交到 git（它是网站静态下载资源）。" -ForegroundColor Green
