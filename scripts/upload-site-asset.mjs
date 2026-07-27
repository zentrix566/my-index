#!/usr/bin/env node
/**
 * 上传单个站点静态资源到阿里云 OSS（公开读）。
 *
 * 用途：把与业务无关、又体积较大的站点静态资源（如江阴地图底图）从构建产物中剥离，
 *       改托管到 OSS，由服务端反代（/site-assets/* → OSS_ORIGIN）以本站域名返回并强制 inline。
 *       这样既缩小 Docker 镜像，又避免前端硬编码 OSS 域名。
 *
 * 用法（在仓库根目录执行）：
 *   node scripts/upload-site-asset.mjs <本地文件路径> <OSS key>
 *
 * 示例：
 *   node scripts/upload-site-asset.mjs "%TEMP%/jiangyin-map.webp" site-assets/jiangyin-map.webp
 *
 * 约定：
 *   - OSS key 必须以 site-assets/ 开头，且与前端请求路径一致（/site-assets/...）。
 *   - 凭证从仓库根 .env 读取：OSS_BUCKET / OSS_REGION / OSS_ACCESS_KEY_ID / OSS_ACCESS_KEY_SECRET。
 *   - 对象设为 public-read（与卡牌图一致，服务端回源无需签名）。
 */
import { readFileSync, existsSync } from 'node:fs'
import { resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

const __dirname = fileURLToPath(new URL('.', import.meta.url))
const repoRoot = resolve(__dirname, '..')

// 轻量 .env 加载：仅当对应环境变量尚未设置时填充（不覆盖已存在的 shell 环境变量）。
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

const [, , localPath, ossKey] = process.argv
if (!localPath || !ossKey) {
  console.error('用法: node scripts/upload-site-asset.mjs <本地文件路径> <OSS key>')
  process.exit(1)
}
if (!ossKey.startsWith('site-assets/')) {
  console.error(`OSS key 必须以 "site-assets/" 开头，当前为: ${ossKey}`)
  process.exit(1)
}

const bucket = process.env.OSS_BUCKET
const region = process.env.OSS_REGION || 'cn-beijing'
const accessKeyId = process.env.OSS_ACCESS_KEY_ID
const accessKeySecret = process.env.OSS_ACCESS_KEY_SECRET
if (!bucket || !accessKeyId || !accessKeySecret) {
  console.error('缺少环境变量：OSS_BUCKET / OSS_ACCESS_KEY_ID / OSS_ACCESS_KEY_SECRET（在 .env 中配置）')
  process.exit(1)
}

const ossMod = await import('ali-oss')
const Client = ossMod.default || ossMod
const client = new Client({ region: `oss-${region}`, accessKeyId, accessKeySecret, bucket })

try {
  const r = await client.put(ossKey, localPath, {
    headers: { 'x-oss-object-acl': 'public-read' }
  })
  console.log(`已上传: oss-${region}/${bucket}/${ossKey} (${(r.res.size / 1024).toFixed(0)}KB)`)
  console.log(`访问地址: https://${bucket}.oss-${region}.aliyuncs.com/${ossKey}`)
} catch (err) {
  console.error(`上传失败 ${ossKey}:`, err.message)
  process.exit(2)
}
