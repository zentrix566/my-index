/**
 * 认证数据层：统一账号体系，独立连接（生产用 AUTH_DB_URL 指向独立认证库）。
 * - 用户表、令牌表、模块使用记录均在此层
 * - 与业务层（business-db.js）物理隔离，业务层只通过 user_id 关联
 */
import pg from 'pg'
import path from 'node:path'

const { Pool } = pg
const isLocalDevMode =
  process.env.NODE_ENV !== 'production' && process.env.LOCAL_DEV_MODE === 'true'

// 认证连接：优先用独立认证库连接串；未配置时回退到主库（迁移过渡期兼容）
function buildAuthPool() {
  if (process.env.AUTH_DB_URL) {
    return new Pool({
      connectionString: process.env.AUTH_DB_URL,
      max: 10,
      idleTimeoutMillis: 30000,
      connectionTimeoutMillis: 10000
    })
  }
  return new Pool({
    host: process.env.PG_HOST,
    port: parseInt(process.env.PG_PORT || '5432', 10),
    user: process.env.PG_USER || 'postgres',
    database: process.env.PG_DATABASE || 'zentrix',
    password: process.env.PG_PASS,
    ssl: process.env.PG_SSL === 'false' ? false : { rejectUnauthorized: false },
    max: 10,
    idleTimeoutMillis: 30000,
    connectionTimeoutMillis: 10000
  })
}

export const authDb = buildAuthPool()
let authPoolClosed = false

let authStorePromise
async function getLocalAuthStore() {
  if (!authStorePromise) {
    const filePath = path.resolve(
      process.env.AUTH_LOCAL_SQLITE_PATH || path.join('data', 'auth.local.db')
    )
    authStorePromise = import('./local-sqlite.js').then(({ createLocalAuthStore }) =>
      createLocalAuthStore(filePath)
    )
  }
  return authStorePromise
}

export async function closeAuthDatabase() {
  if (authPoolClosed) return
  authPoolClosed = true
  if (isLocalDevMode) {
    const s = await getLocalAuthStore()
    s.close()
    return
  }
  await authDb.end()
}

const AUTH_SCHEMA_SQL = `
CREATE TABLE IF NOT EXISTS users (
  id            SERIAL PRIMARY KEY,
  username      TEXT UNIQUE NOT NULL,
  password_hash TEXT NOT NULL,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE users ADD COLUMN IF NOT EXISTS email TEXT;

CREATE TABLE IF NOT EXISTS password_reset_tokens (
  token_hash  TEXT PRIMARY KEY,
  user_id     INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  expires_at  TIMESTAMPTZ NOT NULL,
  used_at     TIMESTAMPTZ,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_pwreset_user ON password_reset_tokens(user_id);

ALTER TABLE users ADD COLUMN IF NOT EXISTS email_verified BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE users ADD COLUMN IF NOT EXISTS has_password BOOLEAN NOT NULL DEFAULT true;
ALTER TABLE users ADD COLUMN IF NOT EXISTS display_name TEXT;
ALTER TABLE users ADD COLUMN IF NOT EXISTS avatar TEXT;

CREATE TABLE IF NOT EXISTS email_verification_tokens (
  token_hash  TEXT PRIMARY KEY,
  user_id     INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  expires_at  TIMESTAMPTZ NOT NULL,
  consumed_at TIMESTAMPTZ,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_emailverify_user ON email_verification_tokens(user_id);

CREATE TABLE IF NOT EXISTS module_activity (
  user_id      INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  module       TEXT NOT NULL,
  first_seen_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  last_seen_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
  PRIMARY KEY (user_id, module)
);
`

let authSchemaReady = false
export async function ensureAuthSchema() {
  if (isLocalDevMode) {
    await getLocalAuthStore()
    return
  }
  if (authSchemaReady) return
  await authDb.query(AUTH_SCHEMA_SQL)
  authSchemaReady = true
}

// ========== 用户/令牌：干净接口（均 async）==========

export async function getUserByUsername(username) {
  if (isLocalDevMode) return (await getLocalAuthStore()).getUserByUsername(username)
  const { rows } = await authDb.query('SELECT * FROM users WHERE username = $1', [username])
  return rows[0] || null
}

export async function getUserById(id) {
  if (isLocalDevMode) return (await getLocalAuthStore()).getUserById(id)
  const { rows } = await authDb.query(
    'SELECT id, username, email, email_verified, has_password, display_name, avatar, created_at FROM users WHERE id = $1',
    [id]
  )
  return rows[0] || null
}

export async function createUser(username, passwordHash, email = null) {
  if (isLocalDevMode) return (await getLocalAuthStore()).createUser(username, passwordHash, email)
  const { rows } = await authDb.query(
    'INSERT INTO users(username, password_hash, email) VALUES($1, $2, $3) RETURNING id',
    [username, passwordHash, email || null]
  )
  return rows[0].id
}

export async function getUserByEmail(email) {
  if (isLocalDevMode) return (await getLocalAuthStore()).getUserByEmail(email)
  const { rows } = await authDb.query('SELECT * FROM users WHERE LOWER(email) = LOWER($1)', [email])
  return rows[0] || null
}

export async function getUserByIdentifier(identifier) {
  if (isLocalDevMode) return (await getLocalAuthStore()).getUserByIdentifier(identifier)
  const { rows } = await authDb.query(
    'SELECT id, username, email FROM users WHERE username = $1 OR LOWER(email) = LOWER($1)',
    [identifier]
  )
  return rows[0] || null
}

export async function getUserAuthById(id) {
  if (isLocalDevMode) return (await getLocalAuthStore()).getUserAuthById(id)
  const { rows } = await authDb.query(
    'SELECT id, username, password_hash, email, has_password FROM users WHERE id = $1',
    [id]
  )
  return rows[0] || null
}

export async function setUserEmail(userId, email) {
  if (isLocalDevMode) return (await getLocalAuthStore()).setUserEmail(userId, email)
  await authDb.query('UPDATE users SET email = $1 WHERE id = $2', [email || null, userId])
}

export async function setEmailVerified(userId, verified) {
  if (isLocalDevMode) return (await getLocalAuthStore()).setEmailVerified(userId, verified)
  await authDb.query('UPDATE users SET email_verified = $1 WHERE id = $2', [verified, userId])
}

export async function setHasPassword(userId, value) {
  if (isLocalDevMode) return (await getLocalAuthStore()).setHasPassword(userId, value)
  await authDb.query('UPDATE users SET has_password = $1 WHERE id = $2', [value, userId])
}

export async function setDisplayName(userId, displayName) {
  const safe = typeof displayName === 'string' ? displayName.trim().slice(0, 20) : null
  if (isLocalDevMode) return (await getLocalAuthStore()).setDisplayName(userId, safe)
  await authDb.query('UPDATE users SET display_name = $1 WHERE id = $2', [safe, userId])
}

export async function setAvatar(userId, avatarUrl) {
  const safe = typeof avatarUrl === 'string' ? avatarUrl.trim().slice(0, 255) || null : null
  if (isLocalDevMode) return (await getLocalAuthStore()).setAvatar(userId, safe)
  await authDb.query('UPDATE users SET avatar = $1 WHERE id = $2', [safe, userId])
}

export async function createVerificationToken(userId, tokenHash, expiresAt) {
  if (isLocalDevMode) return (await getLocalAuthStore()).createVerificationToken(userId, tokenHash, expiresAt)
  await authDb.query(
    'INSERT INTO email_verification_tokens(token_hash, user_id, expires_at) VALUES($1, $2, $3)',
    [tokenHash, userId, expiresAt]
  )
}

export async function getValidVerificationToken(tokenHash) {
  if (isLocalDevMode) return (await getLocalAuthStore()).getValidVerificationToken(tokenHash)
  const { rows } = await authDb.query(
    'SELECT token_hash, user_id, expires_at, consumed_at FROM email_verification_tokens WHERE token_hash = $1',
    [tokenHash]
  )
  const row = rows[0]
  if (!row || row.consumed_at) return null
  if (new Date(row.expires_at).getTime() <= Date.now()) return null
  return row
}

export async function consumeVerificationToken(tokenHash, userId) {
  if (isLocalDevMode) return (await getLocalAuthStore()).consumeVerificationToken(tokenHash, userId)
  await authDb.query(
    'UPDATE email_verification_tokens SET consumed_at = now() WHERE token_hash = $1',
    [tokenHash]
  )
  if (userId) {
    await authDb.query('UPDATE users SET email_verified = true WHERE id = $1', [userId])
    await authDb.query(
      'UPDATE email_verification_tokens SET consumed_at = now() WHERE user_id = $1 AND consumed_at IS NULL AND token_hash <> $2',
      [userId, tokenHash]
    )
  }
}

export async function invalidateUserVerificationTokens(userId) {
  if (isLocalDevMode) return (await getLocalAuthStore()).invalidateUserVerificationTokens(userId)
  await authDb.query(
    'UPDATE email_verification_tokens SET consumed_at = now() WHERE user_id = $1 AND consumed_at IS NULL',
    [userId]
  )
}

export async function updatePasswordById(userId, passwordHash) {
  if (isLocalDevMode) return (await getLocalAuthStore()).updatePasswordById(userId, passwordHash)
  await authDb.query('UPDATE users SET password_hash = $1 WHERE id = $2', [passwordHash, userId])
}

export async function createResetToken(userId, tokenHash, expiresAt) {
  if (isLocalDevMode) return (await getLocalAuthStore()).createResetToken(userId, tokenHash, expiresAt)
  await authDb.query(
    'INSERT INTO password_reset_tokens(token_hash, user_id, expires_at) VALUES($1, $2, $3)',
    [tokenHash, userId, expiresAt]
  )
}

export async function getValidResetToken(tokenHash) {
  if (isLocalDevMode) return (await getLocalAuthStore()).getValidResetToken(tokenHash)
  const { rows } = await authDb.query(
    'SELECT token_hash, user_id, expires_at, used_at FROM password_reset_tokens WHERE token_hash = $1',
    [tokenHash]
  )
  const row = rows[0]
  if (!row || row.used_at) return null
  if (new Date(row.expires_at).getTime() <= Date.now()) return null
  return row
}

export async function consumeResetToken(tokenHash, userId) {
  if (isLocalDevMode) return (await getLocalAuthStore()).consumeResetToken(tokenHash, userId)
  await authDb.query(
    'UPDATE password_reset_tokens SET used_at = now() WHERE token_hash = $1',
    [tokenHash]
  )
  if (userId) {
    await authDb.query(
      'UPDATE password_reset_tokens SET used_at = now() WHERE user_id = $1 AND used_at IS NULL AND token_hash <> $2',
      [userId, tokenHash]
    )
  }
}

export async function invalidateUserResetTokens(userId) {
  if (isLocalDevMode) return (await getLocalAuthStore()).invalidateUserResetTokens(userId)
  await authDb.query(
    'UPDATE password_reset_tokens SET used_at = now() WHERE user_id = $1 AND used_at IS NULL',
    [userId]
  )
}

// ========== 模块使用记录（Q3：谁用了哪些模块）==========

// 记录某用户访问过某模块；首次插入，之后只更新最近访问时间。
// module 语义示例：'hearthstone' / 'willpower'
export async function trackModuleAccess(userId, module) {
  if (!userId || !module) return
  if (isLocalDevMode) return (await getLocalAuthStore()).trackModuleAccess(userId, module)
  await authDb.query(
    `INSERT INTO module_activity(user_id, module, first_seen_at, last_seen_at)
     VALUES($1, $2, now(), now())
     ON CONFLICT(user_id, module) DO UPDATE SET last_seen_at = now()`,
    [userId, module]
  )
}

// 汇总每个已注册用户使用过的模块列表与最近访问时间（owner 后台用）。
export async function getModuleUsage() {
  if (isLocalDevMode) return (await getLocalAuthStore()).getModuleUsage()
  const { rows } = await authDb.query(`
    SELECT u.id, u.username, u.display_name, u.email, u.email_verified, u.created_at,
           array_agg(m.module) FILTER (WHERE m.module IS NOT NULL) AS modules,
           MAX(m.last_seen_at) AS last_seen
    FROM users u
    LEFT JOIN module_activity m ON m.user_id = u.id
    GROUP BY u.id, u.username, u.display_name, u.email, u.email_verified, u.created_at
    ORDER BY MAX(m.last_seen_at) DESC NULLS LAST, u.id
  `)
  return rows.map((r) => ({
    id: r.id,
    username: r.username,
    displayName: r.display_name,
    email: r.email,
    emailVerified: r.email_verified,
    createdAt: r.created_at,
    modules: r.modules || [],
    lastSeen: r.last_seen
  }))
}
