#!/usr/bin/env node
/**
 * 把 fetch-hs-cards.mjs 生成的卡牌图上传到阿里云 OSS。
 *
 * 数据源：public/hearthstone/cards-db.json（每条含 ossFull/ossCrop 相对路径 + dbfId 命名）。
 * 本地文件 = HS_LOCAL_ROOT + oss 路径去掉前缀（/hearthstone-cards/）后的部分。
 *   e.g. ossFull = /hearthstone-cards/决战荒芜之地/full/蹩脚海盗_40608.png
 *        => 本地 E:/github/我的炉石2/hs-cards/决战荒芜之地/full/蹩脚海盗_40608.png
 *        => OSS key hearthstone-cards/决战荒芜之地/full/蹩脚海盗_40608.png
 *
 * 用法（本机有 OSS 凭证时）：
 *   OSS_DRY_RUN=1 node scripts/upload-hs-cards-to-oss.mjs              # 统计待上传、不真传
 *   node scripts/upload-hs-cards-to-oss.mjs                            # 增量上传（OSS 已有则跳过）
 *   OSS_SKIP_EXISTING=0 node scripts/upload-hs-cards-to-oss.mjs        # 强制全量重传（削弱卡/重名卡覆盖旧图用这个）
 *
 * 环境变量（复用现有上传脚本的约定）：
 *   OSS_BUCKET / OSS_REGION / OSS_ACCESS_KEY_ID / OSS_ACCESS_KEY_SECRET
 *   OSS_PREFIX       OSS key 前缀（默认 hearthstone-cards）
 *   OSS_SOURCE_DIR   本地图库根（默认 E:/github/我的炉石2/hs-cards）
 *   OSS_DRY_RUN=1    只统计不真传
 *   OSS_SKIP_EXISTING=0  关闭增量跳过，强制覆盖已存在对象
 *   OSS_CHECK_CONCURRENCY  增量查 OSS 存在性并发（默认 20）
 *   OSS_PUT_CONCURRENCY    实际上传并发（默认 16）
 */
import { stat } from 'node:fs/promises'
import { readFileSync, existsSync } from 'node:fs'
import { join, resolve, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'

const __dirname = dirname(fileURLToPath(import.meta.url))
const repoRoot = resolve(__dirname, '..')

try {
  const envPath = resolve(repoRoot, '.env')
  if (existsSync(envPath)) {
    const text = readFileSync(envPath, 'utf8')
    for (const line of text.split('\n')) {
      const m = line.match(/^\s*([\w.-]+)\s*=\s*(.*)\s*$/)
      if (m && process.env[m[1]] === undefined) process.env[m[1]] = m[2].replace(/^["']|["']$/g, '')
    }
  }
} catch { /* ignore */ }

const bucket = process.env.OSS_BUCKET
const region = process.env.OSS_REGION || 'cn-beijing'
const accessKeyId = process.env.OSS_ACCESS_KEY_ID
const accessKeySecret = process.env.OSS_ACCESS_KEY_SECRET
const prefix = (process.env.OSS_PREFIX || 'hearthstone-cards').replace(/^\/+|\/+$/g, '')
const SRC_DIR = resolve(process.env.OSS_SOURCE_DIR || 'E:/github/我的炉石2/hs-cards-id')
const DB_PATH = join(repoRoot, 'public/hearthstone/cards-db.json')
const DRY_RUN = process.env.OSS_DRY_RUN === '1'
const skipExisting = process.env.OSS_SKIP_EXISTING !== '0'
const CHECK_CONCURRENCY = Number(process.env.OSS_CHECK_CONCURRENCY) || 20
const PUT_CONCURRENCY = Number(process.env.OSS_PUT_CONCURRENCY) || 16

if (!bucket || !accessKeyId || !accessKeySecret) {
  console.error('缺少环境变量：OSS_BUCKET / OSS_ACCESS_KEY_ID / OSS_ACCESS_KEY_SECRET')
  process.exit(1)
}

const ossMod = await import('ali-oss')
const Client = ossMod.default || ossMod
const client = new Client({ region: `oss-${region}`, accessKeyId, accessKeySecret, bucket })

async function mapPool(items, concurrency, fn) {
  const results = new Array(items.length)
  let idx = 0
  async function worker() {
    while (idx < items.length) {
      const cur = idx++
      results[cur] = await fn(items[cur], cur)
    }
  }
  const n = Math.min(concurrency, items.length)
  await Promise.all(Array.from({ length: n }, () => worker()))
  return results
}

async function existsInOss(key) {
  try { await client.head(key); return true }
  catch (err) {
    if (err.code === 'NoSuchKey' || err.status === 404) return false
    console.warn(`  [warn] 查 OSS 存在性失败 ${key}: ${err.message}（将尝试上传）`)
    return false
  }
}

async function main() {
  if (!existsSync(DB_PATH)) { console.error(`未找到 ${DB_PATH}，请先运行 fetch-hs-cards.mjs`); process.exit(1) }
  const db = JSON.parse(readFileSync(DB_PATH, 'utf8'))

  const targets = []
  const seen = new Set()
  for (const id of Object.keys(db)) {
    const c = db[id]
    for (const field of ['ossFull', 'ossCrop']) {
      const ossPath = c[field]
      if (!ossPath) continue
      const rel = ossPath.replace(/^\/+/, '')                  // hearthstone-cards/<set>/full/<name>_<id>.png
      if (seen.has(rel)) continue
      seen.add(rel)
      const inner = rel.replace(new RegExp('^' + prefix.replace(/[.*+?^${}()|[\]\\]/g, '\\$&') + '/'), '')
      const srcPath = join(SRC_DIR, inner)
      targets.push({ srcPath, key: rel, label: `${c.name}_${c.id}${field === 'ossCrop' ? '(crop)' : ''}` })
    }
  }

  // 校验源文件存在
  let missing = 0
  const valid = []
  await mapPool(targets, PUT_CONCURRENCY, async (t) => {
    try { await stat(t.srcPath); valid.push(t) }
    catch { missing++; if (missing <= 20) console.warn(`  源文件缺失，跳过：${t.srcPath}（key=${t.key}）`) }
  })

  console.log(`数据源：${DB_PATH}`)
  console.log(`本地根：${SRC_DIR}`)
  console.log(`待上传 ${valid.length} 个文件到 oss-${region}/${bucket}/${prefix}/（源文件缺失 ${missing}）`)

  if (DRY_RUN) {
    console.log('[DRY-RUN] 未实际上传，仅统计。确认路径无误后去掉 OSS_DRY_RUN 再跑。')
    process.exit(0)
  }

  let toUpload = valid
  let skipped = 0
  if (skipExisting && valid.length) {
    console.log(`增量检查：并发 ${CHECK_CONCURRENCY} 查 OSS 是否已存在...`)
    const flags = await mapPool(valid, CHECK_CONCURRENCY, (t) => existsInOss(t.key))
    toUpload = []
    for (let i = 0; i < valid.length; i++) (flags[i] ? skipped++ : toUpload.push(valid[i]))
    console.log(`OSS 已存在 ${skipped} 个（跳过），实际需上传 ${toUpload.length} 个`)
  }

  let ok = 0, fail = 0, bytes = 0
  await mapPool(toUpload, PUT_CONCURRENCY, async ({ srcPath, key, label }) => {
    try {
      const r = await client.put(key, srcPath, { headers: { 'x-oss-object-acl': 'public-read' } })
      ok++; bytes += (r.res && r.res.size) || 0
      if (ok % 200 === 0) console.log(`  已上传 ${ok}/${toUpload.length}`)
    } catch (err) { fail++; console.error(`  失败 ${label} (${key}):`, err.message) }
  })

  const mb = (bytes / 1024 / 1024).toFixed(1)
  console.log(`\n完成：成功 ${ok}，跳过(已存在) ${skipped}，失败 ${fail}，本次上传 ${mb} MB`)
  console.log(`OSS 基地址：https://${bucket}.oss-${region}.aliyuncs.com`)
  if (fail > 0) process.exit(2)
}

main().catch((e) => { console.error('FATAL', e); process.exit(1) })
