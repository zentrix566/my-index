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
 *   1. npm install ali-oss                 # 首次
 *   2. 设置环境变量（PowerShell 示例）：
 *        $env:OSS_BUCKET="your-bucket"
 *        $env:OSS_REGION="cn-beijing"       # cn-hangzhou / cn-beijing ...
 *        $env:OSS_ACCESS_KEY_ID="你的AK"
 *        $env:OSS_ACCESS_KEY_SECRET="你的SK"
 *        # 原始图片目录（默认见下），可改：
 *        $env:OSS_SOURCE_DIR="E:/github/my-heartstone/hearthstone_cards"
 *        # 是否只传 manifest 引用的图片（默认不传，即整目录全传，最省事）
 *        # 设为 1 可只传应用真正用到的 1486 张（更省 OSS 空间）
 *        $env:OSS_USE_MANIFEST="0"
 *   3. node scripts/upload-to-oss.mjs
 *
 * 上传后：
 *   本地原始目录  E:/.../hearthstone_cards/wild/crop/X.png
 *     → OSS key  hearthstone-cards/wild/crop/X.png
 *     → 前端 .env  VITE_OSS_BASE=https://<bucket>.oss-cn-<region>.aliyuncs.com
 */
import { readdir, stat } from 'node:fs/promises'
import { join, relative, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

const __dirname = fileURLToPath(new URL('.', import.meta.url))
const repoRoot = resolve(__dirname, '..')

const bucket = process.env.OSS_BUCKET
const region = process.env.OSS_REGION || 'cn-beijing'
const accessKeyId = process.env.OSS_ACCESS_KEY_ID
const accessKeySecret = process.env.OSS_ACCESS_KEY_SECRET
// OSS key 前缀：必须与应用请求的路径一致
const prefix = (process.env.OSS_PREFIX || 'hearthstone-cards').replace(/^\/+|\/+$/g, '')
// 原始图片根目录：默认用 my-heartstone 里的原始目录
const SRC_DIR = resolve(process.env.OSS_SOURCE_DIR || 'E:/github/my-heartstone/hearthstone_cards')
// 是否只传 manifest 引用的图片（默认否 = 整目录全传，最省事；设 1 则只传应用用到的 1486 张）
const useManifest = process.env.OSS_USE_MANIFEST === '1'

if (!bucket || !accessKeyId || !accessKeySecret) {
  console.error('缺少环境变量：OSS_BUCKET / OSS_ACCESS_KEY_ID / OSS_ACCESS_KEY_SECRET')
  process.exit(1)
}

const ossMod = await import('ali-oss')
const Client = ossMod.default || ossMod
const client = new Client({ region: `oss-${region}`, accessKeyId, accessKeySecret, bucket })

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
console.log(`待上传 ${valid.length} 个文件到 oss-${region}/${bucket}/${prefix}/（缺失 ${missing}）`)

let ok = 0
let fail = 0
let bytes = 0
for (const { srcPath, key } of valid) {
  try {
    const r = await client.put(key, srcPath, { headers: { 'x-oss-object-acl': 'public-read' } })
    ok++
    bytes += (r.res && r.res.size) || 0
    if (ok % 200 === 0) console.log(`  已上传 ${ok}/${valid.length}`)
  } catch (err) {
    fail++
    console.error(`  失败 ${key}:`, err.message)
  }
}

const mb = (bytes / 1024 / 1024).toFixed(1)
console.log(`\n完成：成功 ${ok}，失败 ${fail}，共 ${mb} MB`)
console.log(`OSS 基地址：https://${bucket}.oss-${region}.aliyuncs.com`)
console.log(`请在前端 .env / GitHub Secrets 设置：VITE_OSS_BASE=https://${bucket}.oss-${region}.aliyuncs.com`)
if (fail > 0) process.exit(2)
