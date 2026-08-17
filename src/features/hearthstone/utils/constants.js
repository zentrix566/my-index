// 炉石成就相关的共享常量。
// 前端 composable、页面文案与服务端校验必须使用同一份，避免出现「UI 允许但服务端拒绝」的漂移。
export const MAX_PINNED_ACHIEVEMENTS = 10

// 收藏/成就采集工具（Windows 桌面程序）下载地址；文件名带版本号便于核对下载版本。
// 部署时可用 VITE_COLLECTOR_DOWNLOAD_URL 覆盖。版本号须与 tools/hs-cosmetics-collector/build-release.ps1 生成的一致。
export const COLLECTOR_DOWNLOAD_URL =
  import.meta.env.VITE_COLLECTOR_DOWNLOAD_URL || '/hs-cosmetics-collector-v1.3.1.zip'
