/**
 * 成就元数据加载器（服务端用）
 * 用 fs 扫描 src/hearthstone-achievements/data/achievements/*.json，
 * 构建 成就ID -> { name, version, heroClass } 映射。
 *   name      成就中文名（如「嘿！吼！我们登场喽！」）
 *   version   所属版本中文名（如「荒芜之地」，取自扩展文件的 name 字段）
 *   heroClass 职业中文名（如「圣骑士」「中立」）
 *
 * 不 import 前端的 expansions.js，因为它用裸 import JSON（Node 需 assert），
 * 这里纯 fs 读取，稳妥且与运行环境无关。
 */
import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
// 候选目录（按顺序查找第一个存在的）：
//  1) 本地开发：server/ 同级的 ../src/hearthstone-achievements/data/achievements
//  2) 生产镜像：Dockerfile 已将成就 JSON 复制到 server/achievements-data/
// 关键：线上运行时镜像里没有 src/，必须用第 2 个路径，否则 META 为空、
//      getAchievementMeta 回退成编号，保存时会把中文名覆盖成编号。
const ACHIEVEMENTS_DIRS = [
  path.resolve(__dirname, '../src/hearthstone-achievements/data/achievements'),
  path.resolve(__dirname, 'achievements-data')
]

function scanDir(dir) {
  const map = {}
  for (const file of fs.readdirSync(dir)) {
    if (!file.endsWith('.json')) continue
    try {
      const exp = JSON.parse(fs.readFileSync(path.join(dir, file), 'utf-8'))
      const version = exp.name || exp.id || ''
      for (const a of exp.achievements || []) {
        if (a && a.id) {
          map[a.id] = {
            name: a.name || a.id,
            version,
            heroClass: a.heroClass || '',
            stageCount: Array.isArray(a.stages) ? a.stages.length : 0
          }
        }
      }
    } catch (err) {
      console.warn(`[meta] 跳过无法解析的成就文件 ${file}:`, err.message)
    }
  }
  return map
}

function loadMeta() {
  for (const dir of ACHIEVEMENTS_DIRS) {
    if (fs.existsSync(dir)) {
      return scanDir(dir)
    }
  }
  console.warn('[meta] 成就数据目录均不存在，已回退为编号（保存会写成编号）:', ACHIEVEMENTS_DIRS)
  return {}
}

const META = loadMeta()

/** 按成就 ID 取 { name, version, heroClass }；未知 ID 回退为 id 本身，避免写入报错 */
export function getAchievementMeta(id) {
  return META[id] || { name: id, version: '', heroClass: '' }
}

/** 仅用于写入校验：未知 ID 不应以“回退元数据”的形式进入数据库。 */
export function hasAchievementMeta(id) {
  return Object.hasOwn(META, id)
}

/** 全部元数据（调试用） */
export function getAllAchievementMeta() {
  return META
}
