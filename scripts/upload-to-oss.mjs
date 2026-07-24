#!/usr/bin/env node
/**
 * 上传炉石卡牌图片到阿里云 OSS（公开读）
 *
 * 背景：
 *   卡牌图原先走 Git LFS 打进 Docker 镜像，线上因 LFS 指针 / CloudFront 不可达而破图。
 *   现改为托管到 OSS，前端用 VITE_OSS_BASE 直接引用 OSS URL，部署稳定、国内快、镜像更瘦。
 *
 * 图片来源：原始目录 E:\github\my-heartstone\hearthstone_cards（结构 wild/crop、wild/full）
 *   应用真正用到的图片由 manifest 决定：src/hearthstone-achievements/data/deck-card-images.json
 *   每张图的 OSS key 必须与应用请求路径一致：hearthstone-cards/wild/{crop,full}/<卡名>_<id>.png
 *
 * 用法（在 my-index 仓库根目录执行）：
 *   1. npm install ali-oss                 # 首次（ali-oss 已在 package.json 中）
 *   2. 在仓库根 .env 填入（.env 已被 gitignore，不会提交）：
 *        OSS_BUCKET=my-hearthstone-20260723
 *        OSS_REGION=cn-beijing
 *        OSS_ACCESS_KEY_ID=你的AK
 *        OSS_ACCESS_KEY_SECRET=你的SK
 *        OSS_USE_MANIFEST=1     # 卡组图只传 manifest 引用的约 1486 张；置 0 则整目录全传
 *        OSS_SKIP_EXISTING=1    # 默认开启：上传前先查 OSS 是否已有该图，已有则跳过，避免重复上传/覆盖；置 0 强制全量重传
 *        OSS_CHECK_CONCURRENCY=20  # 查 OSS 存在性的并发数（默认 20）
 *   3. 试运行（只数文件、不真传，确认路径无误）：
 *        OSS_DRY_RUN=1 node scripts/upload-to-oss.mjs
 *        OSS_DRY_RUN=1 node scripts/upload-to-oss.mjs related
 *   4. 正式上传：
 *        node scripts/upload-to-oss.mjs            # 卡组图 → hearthstone-cards/wild/...
 *        node scripts/upload-to-oss.mjs related    # 关联成就卡图 → hearthstone-cards/related/...
 *   脚本会自动读取 .env，无需手动 export 或 --env-file。
 *
 * 上传后：
 *   本地原始目录  E:/.../hearthstone_cards/wild/crop/X.png
 *     → OSS key  hearthstone-cards/wild/crop/X.png
 *     → 前端 .env  VITE_OSS_BASE=https://<bucket>.oss-cn-<region>.aliyuncs.com
 */
import { readdir, stat } from 'node:fs/promises'
import { readFileSync, existsSync } from 'node:fs'
import { join, relative, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

const __dirname = fileURLToPath(new URL('.', import.meta.url))
const repoRoot = resolve(__dirname, '..')

// 轻量 .env 加载：仅当对应环境变量尚未设置时填充（不覆盖已存在的 shell 环境变量）。
// 这样直接 `node scripts/upload-to-oss.mjs` 即可读取仓库根 .env，无需手动 export 或 --env-file。
try {
  const envPath = resolve(repoRoot, '.env')
  if (existsSync(envPath)) {
    const text = readFileSync(envPath, 'utf8')
    for (const line of text.split('\n')) {
      const m = line.match(/^\s*([\w.-]+)\s*=\s*(.*)\s*$/)
      if (m && process.env[m[1]] === undefined) {
        process.env[m[1]] = m[2].replace(/^["']|["']$/g, '')
      }
    }
  }
} catch (e) { /* 忽略 .env 读取异常 */ }

const bucket = process.env.OSS_BUCKET
const region = process.env.OSS_REGION || 'cn-beijing'
const accessKeyId = process.env.OSS_ACCESS_KEY_ID
const accessKeySecret = process.env.OSS_ACCESS_KEY_SECRET
// 子命令：node scripts/upload-to-oss.mjs [related]
//   related → 上传「关联成就卡图」(src/hearthstone-achievements/assets/cards)，前缀 hearthstone-cards/related
//   缺省    → 上传「卡组图」(OSS_SOURCE_DIR，默认 my-heartstone/hearthstone_cards)，前缀 hearthstone-cards
const RELATED = process.argv[2] === 'related'
// OSS key 前缀：必须与应用请求的路径一致
const prefix = (process.env.OSS_PREFIX || (RELATED ? 'hearthstone-cards/related' : 'hearthstone-cards')).replace(/^\/+|\/+$/g, '')
// 原始图片根目录
const SRC_DIR = RELATED
  ? resolve(repoRoot, 'src/hearthstone-achievements/assets/cards')
  : resolve(process.env.OSS_SOURCE_DIR || 'E:/github/my-heartstone/hearthstone_cards')
// 是否只传 manifest 引用的图片（默认否 = 整目录全传；设 1 则只传应用用到的约 1486 张，省空间更快）
// 注意：related 模式固定为整目录上传。
const useManifest = !RELATED && process.env.OSS_USE_MANIFEST === '1'

if (!bucket || !accessKeyId || !accessKeySecret) {
  console.error('缺少环境变量：OSS_BUCKET / OSS_ACCESS_KEY_ID / OSS_ACCESS_KEY_SECRET')
  process.exit(1)
}

const ossMod = await import('ali-oss')
const Client = ossMod.default || ossMod
const client = new Client({ region: `oss-${region}`, accessKeyId, accessKeySecret, bucket })

/**
 * 并发执行：限制同时进行的异步任务数，避免一次性发起上万次请求把网络打爆。
 */
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

/**
 * 查 OSS 是否已有该对象：已有返回 true，不存在（NoSuchKey / 404）返回 false。
 * 其他错误（网络/临时故障）视为「不存在，仍尝试上传」并打印告警，避免误跳过。
 */
async function existsInOss(key) {
  try {
    await client.head(key)
    return true
  } catch (err) {
    if (err.code === 'NoSuchKey' || err.status === 404) return false
    console.warn(`  [warn] 查 OSS 存在性失败 ${key}: ${err.message}（将尝试上传）`)
    return false
  }
}

/**
 * 收集要上传的文件：返回 [{ srcPath, key }]
 */
async function collectTargets() {
  // 模式 A：只传 manifest 引用的图片（精确、省空间）
  if (useManifest) {
    const manifestPath = join(repoRoot, 'src/hearthstone-achievements/data/deck-card-images.json')
    const manifest = JSON.parse(await import('node:fs/promises').then((m) => m.readFile(manifestPath, 'utf8')))
    const targets = []
    const seen = new Set()
    for (const [, info] of Object.entries(manifest)) {
      for (const k of ['crop', 'full']) {
        const p = info[k] // 如 /hearthstone-cards/wild/crop/SCV_112820.png
        if (!p) continue
        const rel = p.replace(/^\/+/, '') // hearthstone-cards/wild/crop/SCV_112820.png
        if (seen.has(rel)) continue
        seen.add(rel)
        // 去掉 OSS 前缀（hearthstone-cards/），拼回原始目录得到源文件真实路径
        const inner = rel.replace(new RegExp('^' + prefix.replace(/[.*+?^${}()|[\]\\]/g, '\\$&') + '/'), '')
        const srcPath = join(SRC_DIR, inner)
        targets.push({ srcPath, key: rel })
      }
    }
    return targets
  }

  // 模式 B：递归上传整个原始目录（完整，但 OSS 空间占用更大）
  const targets = []
  async function walk(dir) {
    const entries = await readdir(dir, { withFileTypes: true })
    for (const e of entries) {
      const p = join(dir, e.name)
      if (e.isDirectory()) await walk(p)
      else if (e.isFile()) {
        const rel = relative(SRC_DIR, p).split('\\').join('/')
        targets.push({ srcPath: p, key: `${prefix}/${rel}` })
      }
    }
  }
  await walk(SRC_DIR)
  return targets
}

const targets = await collectTargets()

// 校验源文件存在
let missing = 0
const valid = []
for (const t of targets) {
  try {
    await stat(t.srcPath)
    valid.push(t)
  } catch {
    missing++
    if (missing <= 20) console.warn(`  源文件缺失，跳过：${t.srcPath}（key=${t.key}）`)
  }
}

console.log(`来源目录：${SRC_DIR}`)
console.log(`模式：${useManifest ? '仅 manifest 引用' : '整目录递归'}`)
console.log(`待上传 ${valid.length} 个文件到 oss-${region}/${bucket}/${prefix}/（源文件缺失 ${missing}）`)

// 试运行：只统计不真正上传（设 OSS_DRY_RUN=1），且不做 OSS 存在性检查（免凭证、快速）
if (process.env.OSS_DRY_RUN === '1') {
  console.log('[DRY-RUN] 未实际上传，仅统计。确认路径无误后去掉 OSS_DRY_RUN 再跑（正式上传会先查 OSS 跳过已存在的图）。')
  process.exit(0)
}

// 增量模式：先查 OSS 是否已有，已有则跳过，避免重复上传/覆盖
const skipExisting = process.env.OSS_SKIP_EXISTING !== '0' // 默认开启；OSS_SKIP_EXISTING=0 强制全量重传
let toUpload = valid
let skipped = 0
if (skipExisting && valid.length) {
  const CHECK_CONCURRENCY = Number(process.env.OSS_CHECK_CONCURRENCY) || 20
  console.log(`增量检查：并发 ${CHECK_CONCURRENCY} 查 OSS 是否已存在...`)
  const flags = await mapPool(valid, CHECK_CONCURRENCY, async (t) => existsInOss(t.key))
  toUpload = []
  for (let i = 0; i < valid.length; i++) {
    if (flags[i]) skipped++
    else toUpload.push(valid[i])
  }
  console.log(`OSS 已存在 ${skipped} 个（跳过），实际需上传 ${toUpload.length} 个`)
}

let ok = 0
let fail = 0
let bytes = 0
for (const { srcPath, key } of toUpload) {
  try {
    const r = await client.put(key, srcPath, { headers: { 'x-oss-object-acl': 'public-read' } })
    ok++
    bytes += (r.res && r.res.size) || 0
    if (ok % 200 === 0) console.log(`  已上传 ${ok}/${toUpload.length}`)
  } catch (err) {
    fail++
    console.error(`  失败 ${key}:`, err.message)
  }
}

const mb = (bytes / 1024 / 1024).toFixed(1)
console.log(`\n完成：成功 ${ok}，跳过(已存在) ${skipped}，失败 ${fail}，本次上传 ${mb} MB`)
console.log(`OSS 基地址：https://${bucket}.oss-${region}.aliyuncs.com`)
console.log(`请在前端 .env / GitHub Secrets 设置：VITE_OSS_BASE=https://${bucket}.oss-${region}.aliyuncs.com`)
if (fail > 0) process.exit(2)
