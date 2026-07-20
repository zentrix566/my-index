/** 启动不依赖 PostgreSQL 的本地验证服务，内存数据会在进程退出后清空。 */
process.env.NODE_ENV = 'development'
process.env.LOCAL_DEV_MODE = 'true'
process.env.SEED_ON_STARTUP = 'true'

await import('./index.js')
