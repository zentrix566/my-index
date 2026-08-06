/**
 * 统一数据层聚合入口。
 * 内部拆为认证层（auth-db.js：独立连接/独立库）与业务层（business-db.js：炉石进度等），
 * 本文件仅做再导出，保证既有 import 路径（server/auth.js、server/index.js 等）无需改动。
 */
export * from './db/auth-db.js'
export * from './db/business-db.js'

import { ensureAuthSchema, closeAuthDatabase } from './db/auth-db.js'
import { db, ensureBusinessSchema, closeBusinessDatabase } from './db/business-db.js'

/** 启动时确保认证库与业务库表都已就绪。 */
export async function ensureSchema() {
  await ensureAuthSchema()
  await ensureBusinessSchema()
}

/** 停机时关闭两个连接池。 */
export async function closeDatabase() {
  await closeAuthDatabase()
  await closeBusinessDatabase()
}

export default db
