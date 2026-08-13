#!/usr/bin/env node
/** 只覆盖上传本地卡背素材，不改动幸运币、英雄皮肤或前端清单。 */
import { existsSync, readFileSync } from 'node:fs'
import { access } from 'node:fs/promises'
import { join, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

const repoRoot = resolve(fileURLToPath(new URL('.', import.meta.url)), '..')
const envPath = join(repoRoot, '.env')
if (existsSync(envPath)) {
  for (const rawLine of readFileSync(envPath, 'utf8').split('\n')) {
    const match = rawLine.match(/^\s*([\w.-]+)\s*=\s*(.*)\s*$/)
    if (match && process.env[match[1]] === undefined) {
      process.env[match[1]] = match[2].replace(/^["']|["']$/g, '')
    }
  }
}

const { OSS_BUCKET: bucket, OSS_ACCESS_KEY_ID: accessKeyId, OSS_ACCESS_KEY_SECRET: accessKeySecret } = process.env
if (!bucket || !accessKeyId || !accessKeySecret) {
  throw new Error('缺少 OSS_BUCKET、OSS_ACCESS_KEY_ID 或 OSS_ACCESS_KEY_SECRET')
}

const sourceRoot = resolve(process.env.HS_COSMETICS_SOURCE_DIR || 'E:/github/my-heartstone/hearthstone_cosmetics')
const mappings = JSON.parse(readFileSync(join(repoRoot, 'src/features/hearthstone/data/card-back-map.json'), 'utf8'))
const ossModule = await import('ali-oss')
const Client = ossModule.default || ossModule
const client = new Client({
  region: `oss-${process.env.OSS_REGION || 'cn-beijing'}`,
  accessKeyId,
  accessKeySecret,
  bucket
})

const targets = mappings
  .filter((item) => Number.isInteger(item.cardBackId) && item.cardBackId > 0)
  .map((item) => {
    const fileName = `${item.cardBackId}.png`
    return {
      filePath: join(sourceRoot, 'card-backs', fileName),
      objectKey: `hearthstone-cosmetics/card-backs/${fileName}`
    }
  })

let uploaded = 0
let missing = 0
for (const target of targets) {
  try {
    await access(target.filePath)
  } catch {
    missing += 1
    continue
  }
  await client.put(target.objectKey, target.filePath, {
    headers: { 'x-oss-object-acl': 'public-read' }
  })
  uploaded += 1
}

console.log(`卡背 OSS 覆盖完成：上传 ${uploaded}，本地缺图 ${missing}`)
if (!uploaded) process.exitCode = 1
