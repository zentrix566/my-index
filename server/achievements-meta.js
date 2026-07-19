/**
 * 成就元数据加载器（服务端用）
 * 用 fs 扫描 src/hearthstone-achievements/data/achievements/*.json，
 * 构建 成就ID -> { name, version } 映射。
 *
 * 不 import 前端的 expansions.js，因为它用裸 import JSON（Node 需 assert），
 * 这里纯 fs 读取，稳妥且与运行环境无关。
 */
import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const ACHIEVEMENTS_DIR = path.resolve(
  __dirname,
  '../src/hearthstone-achievements/data/achievements'
)

function loadMeta() {
  const map = {}
  if (!fs.existsSync(ACHIEVEMENTS_DIR)) {
    console.warn('[meta] 成就数据目录不存在:', ACHIEVEMENTS_DIR)
    return map
  }
  for (const file of fs.readdirSync(ACHIEVEMENTS_DIR)) {
    if (!file.endsWith('.json')) continue
    try {
      const exp = JSON.parse(fs.readFileSync(path.join(ACHIEVEMENTS_DIR, file), 'utf-8'))
      const version = exp.name || exp.id || ''
      for (const a of exp.achievements || []) {
        if (a && a.id) {
          map[a.id] = { name: a.name || a.id, version }
        }
      }
    } catch (err) {
      console.warn(`[meta] 跳过无法解析的成就文件 ${file}:`, err.message)
    }
  }
  return map
}

const META = loadMeta()

/** 按成就 ID 取 { name, version }；未知 ID 回退为 id 本身，避免写入报错 */
export function getAchievementMeta(id) {
  return META[id] || { name: id, version: '' }
}

/** 全部元数据（调试用） */
export function getAllAchievementMeta() {
  return META
}
