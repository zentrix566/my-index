#!/usr/bin/env node
/** 上传桌面宠物图片到 hearthstone-cosmetics/pets/。 */
import { existsSync, readFileSync } from 'node:fs'
import { stat } from 'node:fs/promises'
import { join, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

const repoRoot = resolve(fileURLToPath(new URL('..', import.meta.url)))
const sourceRoot = resolve(process.env.HS_PETS_SOURCE_DIR || 'C:/Users/admin/Desktop/宠物')
const files = [
  'PET_4_1.png', 'PET_7_1.png', 'PET_10_1.png', 'PET_12_1.png',
  'PET_3_1.png', 'PET_9_1.png', 'PET_6_1.png', 'PET_8_1.png'
]

try {
  const envPath = join(repoRoot, '.env')
  if (existsSync(envPath)) {
    for (const line of readFileSync(envPath, 'utf8').split('\n')) {
      const match = line.match(/^\s*([\w.-]+)\s*=\s*(.*)\s*$/)
      if (match && process.env[match[1]] === undefined) process.env[match[1]] = match[2].replace(/^["']|["']$/g, '')
    }
  }
} catch {}

const { OSS_BUCKET: bucket, OSS_ACCESS_KEY_ID: accessKeyId, OSS_ACCESS_KEY_SECRET: accessKeySecret } = process.env
const region = process.env.OSS_REGION || 'cn-beijing'
if (!bucket || !accessKeyId || !accessKeySecret) throw new Error('缺少 OSS_BUCKET / OSS_ACCESS_KEY_ID / OSS_ACCESS_KEY_SECRET')
const ossModule = await import('ali-oss')
const Client = ossModule.default || ossModule
const client = new Client({ region: `oss-${region}`, accessKeyId, accessKeySecret, bucket })

for (const fileName of files) {
  const filePath = join(sourceRoot, fileName)
  await stat(filePath)
  const key = `hearthstone-cosmetics/pets/${fileName}`
  await client.put(key, filePath, { headers: { 'x-oss-object-acl': 'public-read', 'Content-Type': 'image/png' } })
  console.log(`已上传：${key}`)
}
console.log(`宠物图片上传完成：${files.length} 张`)
