/**
 * 种子逻辑（幂等）：把 owner-progress.json 导入为「所有者」账号的初始进度。
 *
 * 两种调用方式：
 *   1) 手动运行：node server/seed/seed.js
 *   2) 服务启动时自动调用：server/index.js 在 bootstrap 阶段调用 ensureSeeded()
 *
 * 幂等保证：仅当所有者账号不存在时创建；仅当所有者还没有任何进度时导入初始数据，
 * 因此每次启动重跑都安全，不会覆盖所有者已编辑的进度。
 *
 * 环境变量：
 *   OWNER_USERNAME  默认 owner
 *   OWNER_PASSWORD  默认 owner123456（首次部署后请立即改密码，或改用 Secret 注入）
 *   SEED_ON_STARTUP 设为 "false" 可关闭启动自动种子
 */
import fs from 'fs'
import bcrypt from 'bcryptjs'
import { fileURLToPath } from 'url'
import path from 'path'
import { getUserByUsername, createUser, upsertProgress, getProgress } from '../db.js'

const __dirname = path.dirname(fileURLToPath(import.meta.url))

export async function ensureSeeded() {
  const username = process.env.OWNER_USERNAME || 'owner'
  const password = process.env.OWNER_PASSWORD || 'owner123456'

  let user = getUserByUsername(username)
  if (!user) {
    const hash = await bcrypt.hash(password, 10)
    const id = createUser(username, hash)
    user = { id }
    console.log(`[seed] 创建所有者账号 "${username}"`)
  } else {
    console.log(`[seed] 所有者账号 "${username}" 已存在，跳过创建`)
  }

  // 仅当所有者还没有任何进度时，才导入初始示例进度，避免覆盖已有数据
  const existing = getProgress(user.id)
  if (Object.keys(existing).length > 0) {
    console.log(`[seed] 所有者 "${username}" 已有 ${Object.keys(existing).length} 条进度，跳过导入`)
    return
  }

  const ownerProgress = JSON.parse(
    fs.readFileSync(path.join(__dirname, 'owner-progress.json'), 'utf-8')
  )
  let n = 0
  for (const [achId, prog] of Object.entries(ownerProgress)) {
    upsertProgress(user.id, achId, prog.stages || {}, prog.count || 0)
    n++
  }
  console.log(`[seed] 已导入 ${n} 条初始进度到 "${username}"`)
}

// 仅当作为脚本直接运行（而非被 import）时才自动执行
const isMain =
  process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)

if (isMain) {
  ensureSeeded()
    .then(() => process.exit(0))
    .catch((err) => {
      console.error('[seed] 种子失败:', err)
      process.exit(1)
    })
}
