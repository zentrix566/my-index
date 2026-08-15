#!/usr/bin/env node
/**
 * 从阿里云 OSS 下载炉石卡背图片到本地，供人工核对哪些图「不是想要的」。
 *
 * 下载 hearthstone-cosmetics/card-backs/ 前缀下的所有对象（含原图 <id>.png
 * 与缩略图 384/<id>.webp），去掉 hearthstone-cosmetics/ 前缀后落到
 * tools/card-back-images/ 下，保留相对目录结构。
 *
 * 用法：
 *   node scripts/download-card-backs.mjs          # 全量下载
 *   node scripts/download-card-backs.mjs --list    # 仅列出对象数，不下载
 */
import { existsSync, mkdirSync, writeFileSync, readFileSync } from 'node:fs'
import { resolve, join } from 'node:path'
import { fileURLToPath } from 'node:url'

const __dirname = fileURLToPath(new URL('.', import.meta.url))
const repoRoot = resolve(__dirname, '..')

// 轻量 .env 加载（同 upload-cosmetic-thumbnails.mjs）
const envPath = resolve(repoRoot, '.env')
if (existsSync(envPath)) {
  for (const line of readFileSync(envPath, 'utf8').split('\n')) {
    const m = line.match(/^\s*([\w.-]+)\s*=\s*(.*)\s*$/)
    if (m && process.env[m[1]] === undefined) {
      process.env[m[1]] = m[2].replace(/^["']|["']$/g, '')
    }
  }
}

const bucket = process.env.OSS_BUCKET
const region = process.env.OSS_REGION || 'cn-beijing'
const accessKeyId = process.env.OSS_ACCESS_KEY_ID
const accessKeySecret = process.env.OSS_ACCESS_KEY_SECRET
const endpoint = process.env.OSS_ENDPOINT || `https://oss-${region}.aliyuncs.com`
if (!bucket || !accessKeyId || !accessKeySecret) {
  console.error('缺少 OSS 配置：请在 .env 配置 OSS_BUCKET / OSS_REGION / OSS_ACCESS_KEY_ID / OSS_ACCESS_KEY_SECRET')
  process.exit(1)
}

const { default: OSS } = await import('ali-oss')
const client = new OSS({ region, accessKeyId, accessKeySecret, bucket, endpoint, cname: false })

const PREFIX = 'hearthstone-cosmetics/card-backs/'
const OUT_BASE = resolve(repoRoot, 'tools/card-back-images')
const CONCURRENCY = 12
const ONLY_LIST = process.argv.includes('--list')

mkdirSync(OUT_BASE, { recursive: true })

// 1) 分页列出前缀下所有对象
const allKeys = []
let marker = ''
do {
  const res = await client.list({ prefix: PREFIX, marker, 'max-keys': 1000 })
  for (const obj of res.objects || []) allKeys.push(obj.name)
  marker = res.nextMarker || ''
} while (marker)

console.log('OSS 对象数(前缀 card-backs/):', allKeys.length)
const pngs = allKeys.filter((k) => k.toLowerCase().endsWith('.png'))
const webps = allKeys.filter((k) => k.toLowerCase().endsWith('.webp'))
console.log(`  其中 png ${pngs.length}, webp ${webps.length}`)

if (ONLY_LIST) {
  console.log('样例:', allKeys.slice(0, 8).join(', '))
  process.exit(0)
}

// 2) 并发下载
let ok = 0
let err = 0
const failed = []
async function downloadOne(key) {
  const rel = key.replace(/^hearthstone-cosmetics\//, '')
  const outPath = join(OUT_BASE, rel)
  mkdirSync(join(outPath, '..'), { recursive: true })
  try {
    const result = await client.get(key)
    writeFileSync(outPath, result.content)
    ok++
  } catch (e) {
    err++
    failed.push(`${key} -> ${e.message}`)
  }
}
for (let i = 0; i < allKeys.length; i += CONCURRENCY) {
  await Promise.all(allKeys.slice(i, i + CONCURRENCY).map(downloadOne))
}
console.log(`下载完成: 成功 ${ok}, 失败 ${err}`)
if (failed.length) console.log('失败:\n' + failed.slice(0, 20).join('\n'))
