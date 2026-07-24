import { defineConfig, loadEnv } from 'vite'
import vue from '@vitejs/plugin-vue'

export default defineConfig(({ mode }) => {
  // 加载全部环境变量（含无 VITE_ 前缀的 OSS_ORIGIN），仅用于本地 dev 代理
  const env = loadEnv(mode, process.cwd(), '')
  const ossOrigin = (env.OSS_ORIGIN || '').replace(/\/$/, '')

  const proxy = {
    '/api': {
      target: 'http://localhost:3000',
      changeOrigin: true
    }
  }
  // 本地开发时把 /hearthstone-cards/* 代理到 OSS，与生产 server 行为一致
  if (ossOrigin) {
    proxy['/hearthstone-cards'] = {
      target: ossOrigin,
      changeOrigin: true
    }
  }

  return {
    plugins: [vue()],
    server: { proxy }
  }
})
