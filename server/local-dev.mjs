/** 启动不依赖 PostgreSQL 的本地验证服务，内存数据会在进程退出后清空。 */
// 载入 .env（若存在）；文件不存在时静默跳过，不阻断启动
try {
  process.loadEnvFile('.env')
} catch {
  /* 无 .env 文件时跳过（例如尚未配置密钥） */
}
process.env.NODE_ENV = 'development'
process.env.LOCAL_DEV_MODE = 'true'
process.env.SEED_ON_STARTUP = 'true'

await import('./index.js')
