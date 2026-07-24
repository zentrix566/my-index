import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'

export default defineConfig(() => {
  const proxy = {
    '/api': {
      target: 'http://localhost:3000',
      changeOrigin: true
    },
    // 本地开发：/hearthstone-cards/* 走本地 node 服务（端口 3000），
    // 与生产环境同一条代码路径（服务端再反代 OSS，带缓存 + inline）。
    '/hearthstone-cards': {
      target: 'http://localhost:3000',
      changeOrigin: true
    }
  }

  return {
    plugins: [vue()],
    server: { proxy }
  }
})
