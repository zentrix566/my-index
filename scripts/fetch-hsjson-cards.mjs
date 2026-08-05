#!/usr/bin/env node
/**
 * 从 HearthstoneJSON 拉取「可收藏卡牌库」并落地到项目（主体卡牌数据源）。
 * 这是用户指定的权威卡牌库：含标准 dbfId / id / name / text / cost / attack /
 * health / rarity / set / cardClass / type / flavor 等字段，name 等文本按 locale 本地化。
 *
 * 用法：
 *   node scripts/fetch-hsjson-cards.mjs                       # 默认 latest + zhCN
 *   node scripts/fetch-hsjson-cards.mjs --version 123456      # 锁定补丁版本（推荐：可复现）
 *   node scripts/fetch-hsjson-cards.mjs --locale enUS         # 其他语言
 *   node scripts/fetch-hsjson-cards.mjs --out path/to/x.json  # 自定义输出路径
 *
 * 注意：version=latest 会随版本更新而漂移，用作「固定参照」时建议锁定补丁号。
 */
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const REPO_ROOT = path.resolve(__dirname, '..')
const DEFAULT_OUT = path.join(
  REPO_ROOT,
  'src/features/hearthstone/data/hearthstonejson-zhCN-cards.json'
)

function parseArgs(argv) {
  const args = { version: 'latest', locale: 'zhCN', out: DEFAULT_OUT }
  for (let i = 2; i < argv.length; i++) {
    const a = argv[i]
    if (a === '--version') args.version = argv[++i]
    else if (a === '--locale') args.locale = argv[++i]
    else if (a === '--out') args.out = argv[++i]
  }
  return args
}

const args = parseArgs(process.argv)
const url = `https://api.hearthstonejson.com/v1/${args.version}/${args.locale}/cards.collectible.json`
console.log(`下载 ${url}`)

const res = await fetch(url)
if (!res.ok) {
  console.error('HTTP', res.status)
  process.exit(1)
}
const json = await res.json()
if (!Array.isArray(json)) {
  console.error('响应非数组')
  process.exit(1)
}
fs.mkdirSync(path.dirname(args.out), { recursive: true })
fs.writeFileSync(args.out, JSON.stringify(json))
const withDbf = json.filter((c) => c.dbfId != null).length
console.log(
  `完成：条数=${json.length}，含dbfId=${withDbf}，落盘=${args.out}，` +
    `${(fs.statSync(args.out).size / 1024 / 1024).toFixed(2)}MB`
)
