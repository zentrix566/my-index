import { defineConfig, loadEnv } from 'vite'
import vue from '@vitejs/plugin-vue'

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '')
  // 本地开发：若配了 OSS 源站，/hearthstone-cards/* 由 Vite 直接反代到 OSS，
  // 绕过本地 node 服务（node 只在启动时读一次 OSS_ORIGIN，热改 .env 不会生效）。
  // 与生产环境同一条数据路径（前端仍用相对路径 /hearthstone-cards/...），仅代理落点不同。
  const rawOrigin = env.OSS_ORIGIN || env.VITE_OSS_BASE || ''
  const ossOrigin = rawOrigin.replace(/\/+$/, '').replace(/\/hearthstone-cards$/, '')
  const proxy = {
    '/api': {
      target: 'http://localhost:3000',
      changeOrigin: true
    },
    '/hearthstone-cards': ossOrigin
      ? { target: ossOrigin, changeOrigin: true }
      : { target: 'http://localhost:3000', changeOrigin: true },
    // 外观原图由本地 Node 服务优先读取，未命中时再由 Node 回源 OSS。
    // 不直接代理 OSS，否则未上传 OSS 的本地图片会全部返回 404。
    '/hearthstone-cosmetics': { target: 'http://localhost:3000', changeOrigin: true },
    // 站点静态资源（如江阴地图底图）：与卡牌图同一条数据路径，仅代理落点不同
    '/site-assets': ossOrigin
      ? { target: ossOrigin, changeOrigin: true }
      : { target: 'http://localhost:3000', changeOrigin: true },
    // 炉石 JSON 数据（卡牌库等）：短缓存 + ETag，更新文件后无需重新部署
    '/hearthstone-data': ossOrigin
      ? { target: ossOrigin, changeOrigin: true }
      : { target: 'http://localhost:3000', changeOrigin: true }
  }

  return {
    plugins: [vue()],
    // Windows 上显式绑定 IPv4，确保 http://localhost、127.0.0.1 和代理资源都能稳定访问。
    server: { host: '127.0.0.1', proxy },
    build: {
      // 卡组解析器按需加载完整本地卡牌资料库；3.5 MB 是该独立懒加载数据块的预期上限。
      chunkSizeWarningLimit: 3500
    }
  }
})
