#!/usr/bin/env node
/**
 * 将主业务库 zentrix 中已经停用的旧认证表改名归档，不删除任何账号数据。
 *
 * 执行前提：
 * 1. 新版本已部署，生产缺少 AUTH_DB_URL 时会拒绝启动；
 * 2. AUTH_DB_URL 确认指向 zentrix_auth；
 * 3. 已备份 zentrix 主库。
 *
 * 默认仅执行只读预检；必须同时传 --apply 和确认口令才会修改数据库：
 * node scripts/archive-legacy-main-auth.mjs
 * ARCHIVE_LEGACY_AUTH_CONFIRM=archive-zentrix-auth-20260830 node scripts/archive-legacy-main-auth.mjs --apply
 */
import '../server/load-env.js'
import pg from 'pg'

const { Pool } = pg
const CONFIRM_VALUE = 'archive-zentrix-auth-20260830'
const expectedMainDatabase = process.env.PG_DATABASE || 'zentrix'
const expectedAuthDatabase = process.env.AUTH_DB_NAME || 'zentrix_auth'
const applyChanges = process.argv.includes('--apply')

if (applyChanges && process.env.ARCHIVE_LEGACY_AUTH_CONFIRM !== CONFIRM_VALUE) {
  throw new Error(`缺少确认口令：ARCHIVE_LEGACY_AUTH_CONFIRM=${CONFIRM_VALUE}`)
}
if (!process.env.AUTH_DB_URL) throw new Error('缺少 AUTH_DB_URL，无法核对独立认证库')

const mainDb = new Pool({
  host: process.env.PG_HOST,
  port: Number(process.env.PG_PORT || 5432),
  user: process.env.PG_USER || 'postgres',
  database: expectedMainDatabase,
  password: process.env.PG_PASS,
  ssl: process.env.PG_SSL === 'false' ? false : { rejectUnauthorized: false },
  max: 1,
  connectionTimeoutMillis: 10000
})
const authDb = new Pool({
  connectionString: process.env.AUTH_DB_URL,
  max: 1,
  connectionTimeoutMillis: 10000
})

const archiveSuffix = '20260830'
const tableRenames = [
  ['password_reset_tokens', `legacy_auth_password_reset_tokens_${archiveSuffix}`],
  ['email_verification_tokens', `legacy_auth_email_verification_tokens_${archiveSuffix}`],
  ['module_activity', `legacy_auth_module_activity_${archiveSuffix}`],
  ['users', `legacy_auth_users_${archiveSuffix}`]
]

async function databaseName(pool) {
  const { rows } = await pool.query('SELECT current_database() AS name')
  return rows[0]?.name
}

try {
  const [mainName, authName] = await Promise.all([databaseName(mainDb), databaseName(authDb)])
  if (mainName !== expectedMainDatabase) {
    throw new Error(`主库连接错误：期望 ${expectedMainDatabase}，实际 ${mainName}`)
  }
  if (authName !== expectedAuthDatabase) {
    throw new Error(`认证库连接错误：期望 ${expectedAuthDatabase}，实际 ${authName}`)
  }
  if (mainName === authName) throw new Error('主业务库与认证库不能是同一个数据库')

  const names = tableRenames.flat()
  const { rows: existingRows } = await mainDb.query(
    `SELECT tablename FROM pg_tables
     WHERE schemaname = current_schema() AND tablename = ANY($1::text[])`,
    [names]
  )
  const existing = new Set(existingRows.map((row) => row.tablename))
  if (!existing.has('users')) {
    const archivedUsers = tableRenames.find(([source]) => source === 'users')[1]
    if (existing.has(archivedUsers)) {
      console.log(`旧认证表已经归档为 ${archivedUsers}，无需重复执行`)
      process.exit(0)
    }
    throw new Error('主库中既没有 users，也没有预期归档表，拒绝继续')
  }
  for (const [source, archived] of tableRenames) {
    if (existing.has(source) && existing.has(archived)) {
      throw new Error(`${source} 与 ${archived} 同时存在，需人工确认后处理`)
    }
  }

  // 新认证库必须至少覆盖旧主库的全部用户 ID；允许新库拥有迁移后注册的额外用户。
  const [{ rows: oldUsers }, { rows: authUsers }] = await Promise.all([
    mainDb.query('SELECT id FROM users ORDER BY id'),
    authDb.query('SELECT id FROM users ORDER BY id')
  ])
  const authUserIds = new Set(authUsers.map((row) => Number(row.id)))
  const missingUserIds = oldUsers
    .map((row) => Number(row.id))
    .filter((id) => !authUserIds.has(id))
  if (missingUserIds.length) {
    throw new Error(`认证库缺少旧用户 ID：${missingUserIds.join(', ')}`)
  }

  // 业务表必须已经不再引用旧 users；认证表自身的外键会随表改名自动更新，可保留归档关系。
  const legacyAuthTables = tableRenames.map(([source]) => source).filter((name) => name !== 'users')
  const { rows: businessForeignKeys } = await mainDb.query(
    `SELECT source_table.relname AS table_name, constraint_def.conname AS constraint_name
     FROM pg_constraint AS constraint_def
     JOIN pg_class AS source_table ON source_table.oid = constraint_def.conrelid
     JOIN pg_class AS referenced_table ON referenced_table.oid = constraint_def.confrelid
     JOIN pg_namespace AS source_namespace ON source_namespace.oid = source_table.relnamespace
     WHERE constraint_def.contype = 'f'
       AND source_namespace.nspname = current_schema()
       AND referenced_table.relname = 'users'
       AND NOT (source_table.relname = ANY($1::text[]))`,
    [legacyAuthTables]
  )
  if (businessForeignKeys.length) {
    throw new Error(
      `仍有业务表引用旧 users：${businessForeignKeys
        .map((row) => `${row.table_name}.${row.constraint_name}`)
        .join(', ')}`
    )
  }

  if (!applyChanges) {
    console.log(
      `只读预检通过：${mainName} 的旧用户均存在于 ${authName}，且业务表已无旧 users 外键；未修改数据库`
    )
    console.log(
      `确认备份后可执行：ARCHIVE_LEGACY_AUTH_CONFIRM=${CONFIRM_VALUE} npm run archive:legacy-auth -- --apply`
    )
  } else {
    const client = await mainDb.connect()
    try {
      await client.query('BEGIN')
      for (const [source, archived] of tableRenames) {
        if (!existing.has(source)) continue
        await client.query(`ALTER TABLE ${source} RENAME TO ${archived}`)
      }
      await client.query('COMMIT')
    } catch (error) {
      await client.query('ROLLBACK')
      throw error
    } finally {
      client.release()
    }
    console.log(`归档完成：旧认证表已在 ${mainName} 中改名保留，账号唯一来源为 ${authName}`)
  }
} finally {
  await Promise.allSettled([mainDb.end(), authDb.end()])
}
