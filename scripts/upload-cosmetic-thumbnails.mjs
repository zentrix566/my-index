#!/usr/bin/env node
/**
 * 上传炉石收藏缩略图到 OSS。
 *
 * 遍历本地原图根目录下所有 <type>/.../384/*.webp，
 * 上传到 OSS key: hearthstone-cosmetics/<相对路径>
 * （本地根目录名 hearthstone_cosmetics 带下划线，OSS key 前缀为 hearthstone-cosmetics）。
 * 对象设为 public-read，与服务端反代回源一致（无需签名）。
 *
 * 依赖：项目已安装 ali-oss；.env 含 OSS_BUCKET / OSS_REGION / OSS_ACCESS_KEY_ID / OSS_ACCESS_KEY_SECRET。
 * 用法：node scripts/upload-cosmetic-thumbnails.mjs
 */
import { existsSync, readdirSync, statSync, readFileSync } from 'node:fs'
import { resolve, join, relative } from 'node:path'
import { fileURLToPath } from 'node:url'

const __dirname = fileURLToPath(new URL('.', import.meta.url))
const repoRoot = resolve(__dirname, '..')
const LOCAL_ROOT = process.env.HS_COSMETICS_SOURCE_DIR || 'E:/github/my-heartstone/hearthstone_cosmetics'
const THUMB_DIR = '384'

// 轻量 .env 加载（同 upload-site-asset.mjs）
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
} catch {
  /* 忽略 .env 读取异常 */
}

function walk(dir, out = []) {
  for (const name of readdirSync(dir)) {
    const p = join(dir, name)
    const st = statSync(p)
    if (st.isDirectory()) walk(p, out)
    else if (name.endsWith('.webp')) out.push(p)
  }
  return out
}

async function main() {
  const bucket = process.env.OSS_BUCKET
  const region = process.env.OSS_REGION || 'cn-beijing'
  const accessKeyId = process.env.OSS_ACCESS_KEY_ID
  const accessKeySecret = process.env.OSS_ACCESS_KEY_SECRET
  if (!bucket || !accessKeyId || !accessKeySecret) {
    console.error('缺少 OSS 配置：请在 .env 配置 OSS_BUCKET / OSS_REGION / OSS_ACCESS_KEY_ID / OSS_ACCESS_KEY_SECRET')
    process.exit(1)
  }

  const all = walk(LOCAL_ROOT).filter((f) => {
    const rel = relative(LOCAL_ROOT, f).replace(/\\/g, '/')
    return rel.split('/').includes(THUMB_DIR)
  })
  console.log(`找到缩略图 ${all.length} 张`)
  if (!all.length) {
    console.error('未找到任何缩略图，请先运行 scripts/gen-cosmetic-thumbnails.py 生成')
    process.exit(1)
  }

  const { default: OSS } = await import('ali-oss')
  // 必须显式传 endpoint：ali-oss 默认拼 ${bucket}.${region}.aliyuncs.com 会 DNS ENOTFOUND
  const client = new OSS({
    region,
    accessKeyId,
    accessKeySecret,
    bucket,
    endpoint: process.env.OSS_ENDPOINT || 'https://oss-cn-beijing.aliyuncs.com',
    cname: false
  })

  let ok = 0
  let err = 0
  for (const f of all) {
    const rel = relative(LOCAL_ROOT, f).replace(/\\/g, '/') // e.g. coins/384/CATA_COIN5.webp
    const ossKey = 'hearthstone-cosmetics/' + rel
    try {
      await client.put(ossKey, f, {
        headers: {
          'x-oss-object-acl': 'public-read',
          'Cache-Control': 'public, max-age=31536000'
        }
      })
      ok++
      if (ok % 100 === 0) console.log(`已上传 ${ok}/${all.length}`)
    } catch (e) {
      err++
      console.error(`上传失败 ${ossKey}: ${e.message}`)
    }
  }
  console.log(`完成: 成功 ${ok}, 失败 ${err}`)
}

main().catch((e) => {
  console.error(e)
  process.exit(1)
})
