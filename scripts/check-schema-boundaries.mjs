import fs from 'node:fs'

const businessSchemaFiles = [
  'server/db/business-db.js',
  'server/willpower/db.js',
  'server/todo/db.js',
  'server/migrate-json-to-pg.mjs',
  'server/migrate-sqlite-to-pg.mjs'
]

const violations = []
for (const file of businessSchemaFiles) {
  const source = fs.readFileSync(file, 'utf8')
  if (/REFERENCES\s+users\s*\(/i.test(source)) {
    violations.push(`${file}：业务库不能引用本库 users 表，账号 uid 来自独立认证库`)
  }
}

const businessSource = fs.readFileSync('server/db/business-db.js', 'utf8')
if (!businessSource.includes('buildDropLegacyUserForeignKeysSql')) {
  violations.push('server/db/business-db.js：缺少旧账号外键自动兼容迁移')
}

const willpowerSource = fs.readFileSync('server/willpower/db.js', 'utf8')
if (!willpowerSource.includes('buildDropLegacyUserForeignKeysSql')) {
  violations.push('server/willpower/db.js：缺少旧账号外键自动兼容迁移')
}
if (!/CREATE TABLE IF NOT EXISTS ai_reports \(\s*id \$\{pk\}/m.test(willpowerSource)) {
  violations.push('server/willpower/db.js：ai_reports.id 必须按数据库方言使用自增主键')
}

const authSource = fs.readFileSync('server/db/auth-db.js', 'utf8')
if (!authSource.includes('生产环境缺少 AUTH_DB_URL')) {
  violations.push('server/db/auth-db.js：生产环境必须在 AUTH_DB_URL 缺失时拒绝启动')
}
if (!authSource.includes('SELECT current_database() AS database_name')) {
  violations.push('server/db/auth-db.js：生产启动时必须核对实际认证数据库名称')
}

if (violations.length) {
  console.error(`数据库边界检查失败：\n- ${violations.join('\n- ')}`)
  process.exit(1)
}

console.log(`数据库边界检查通过：${businessSchemaFiles.length} 个业务数据层`)
