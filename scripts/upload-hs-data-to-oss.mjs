#!/usr/bin/env node
/**
 * 上传炉石 JSON 数据文件到阿里云 OSS（hearthstone-data/ 前缀）。
 *
 * 用法：
 *   node scripts/upload-hs-data-to-oss.mjs                 # 上传 cards-db.json
 *   node scripts/upload-hs-data-to-oss.mjs <文件路径>      # 上传指定 JSON
 *
 * 数据文件走 /hearthstone-data/* 反代路由，服务端设 5 分钟缓存 + ETag，
 * 上传后最多 5 分钟全量生效，无需重新构建部署。
 */
import { readFileSync, existsSync } from 'node:fs'
import { resolve, dirname, basename } from 'node:path'
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

if (!bucket || !accessKeyId || !accessKeySecret) {
  console.error('缺少环境变量：OSS_BUCKET / OSS_ACCESS_KEY_ID / OSS_ACCESS_KEY_SECRET')
  process.exit(1)
}

const ossMod = await import('ali-oss')
const Client = ossMod.default || ossMod
const client = new Client({
  region: `oss-${region}`,
  accessKeyId,
  accessKeySecret,
  bucket,
  endpoint: `https://oss-${region}.aliyuncs.com`,
  cname: false,
  secure: true
})

const filePath = process.argv[2]
  ? resolve(process.argv[2])
  : resolve(repoRoot, 'public/hearthstone/cards-db.json')

if (!existsSync(filePath)) {
  console.error(`文件不存在: ${filePath}`)
  process.exit(1)
}

const key = `hearthstone-data/${basename(filePath)}`
const buf = readFileSync(filePath)
const mb = (buf.length / 1024 / 1024).toFixed(2)

console.log(`上传 ${filePath} (${mb} MB) → oss-${region}/${bucket}/${key}`)

try {
  await client.put(key, filePath, {
    headers: {
      'x-oss-object-acl': 'public-read',
      'Content-Type': 'application/json; charset=utf-8'
    }
  })
  console.log('✓ 上传成功')
  console.log(`  OSS: https://${bucket}.oss-${region}.aliyuncs.com/${key}`)
  console.log(`  本站: /hearthstone-data/${basename(filePath)}（5 分钟内全量生效）`)
} catch (err) {
  console.error('✗ 上传失败:', err.message)
  process.exit(2)
}
