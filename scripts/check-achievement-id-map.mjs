#!/usr/bin/env node
// 守卫检查：站内成就库与游戏进度导入映射（achievement-id-map.json）的一致性。
//
// 背景（2026-10 紫罗兰监狱事故）：站内新增版本成就后忘记重建映射表，导致用户
// 导入游戏内进度时新成就全部匹配不到，预览显示「新增 0 个完成阶段」、确认按钮
// 不可用。本检查确保「新增成就必须重建映射」不再依赖人的记忆。
//
// 检查项：
//   1. 每个可导入成就 slug 都在映射表中（映射缺失 = 该成就永远无法导入）。
//      顶层 gameImportable: false 的版本（游戏内尚未上线）豁免，并核对 meta 登记一致。
//   2. 映射 meta.total 与站内成就总数一致、meta.importable 与可导入数一致
//      （防止改了成就库没重新生成映射）。
//   3. 每条映射是非空的数字 ID 数组，且映射目标 slug 都真实存在。
//   4. meta.unmatchedIds 里不允许残留可导入成就（未上线豁免的除外）。

import { readFileSync, readdirSync } from 'node:fs'
import { join, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'

const repoRoot = join(dirname(fileURLToPath(import.meta.url)), '..')
const ACHIEVEMENTS_DIR = join(repoRoot, 'src/features/hearthstone/data/achievements')
const MAP_PATH = join(repoRoot, 'src/features/hearthstone/data/achievement-id-map.json')

function readJson(path) {
  let text = readFileSync(path, 'utf8')
  if (text.charCodeAt(0) === 0xfeff) text = text.slice(1)
  return JSON.parse(text)
}

const siteSlugs = new Map()
// gameImportable: false 的版本游戏内尚未上线（HSAchieveGuide 里还没有其成就），
// 其 slug 豁免映射要求；上线移除标记后必须立刻重建映射。
const exemptSlugs = new Set()
for (const file of readdirSync(ACHIEVEMENTS_DIR)) {
  if (!file.endsWith('.json')) continue
  const data = readJson(join(ACHIEVEMENTS_DIR, file))
  for (const achievement of data.achievements || []) {
    if (siteSlugs.has(achievement.id)) {
      console.error(`成就 slug 重复：${achievement.id}（${file}）`)
      process.exit(1)
    }
    siteSlugs.set(achievement.id, file)
    if (data.gameImportable === false) exemptSlugs.add(achievement.id)
  }
}

const idMap = readJson(MAP_PATH)
const map = idMap.map || {}
const problems = []

for (const slug of siteSlugs.keys()) {
  if (exemptSlugs.has(slug)) continue
  if (!(slug in map)) problems.push(`映射缺失：${slug}（${siteSlugs.get(slug)}）——该成就无法通过游戏内进度导入`)
}

for (const [slug, hsIds] of Object.entries(map)) {
  if (!siteSlugs.has(slug)) problems.push(`映射指向不存在的成就：${slug}`)
  if (!Array.isArray(hsIds) || !hsIds.length || !hsIds.every((id) => typeof id === 'number')) {
    problems.push(`映射格式错误：${slug} 应为非空数字数组`)
  }
}

const meta = idMap.meta || {}
if (meta.total !== siteSlugs.size) {
  problems.push(`meta.total（${meta.total}）与站内成就数（${siteSlugs.size}）不一致——成就库变更后未重建映射`)
}
const importableCount = siteSlugs.size - exemptSlugs.size
if (meta.importable !== importableCount) {
  problems.push(`meta.importable（${meta.importable}）与可导入成就数（${importableCount}）不一致——新增/移除版本后未重建映射`)
}
if (meta.excluded !== exemptSlugs.size) {
  problems.push(`meta.excluded（${meta.excluded}）与未上线豁免成就数（${exemptSlugs.size}）不一致——版本上下线后未重建映射`)
}
for (const slug of meta.unmatchedIds || []) {
  if (siteSlugs.has(slug) && !exemptSlugs.has(slug)) {
    problems.push(`可导入成就 ${slug} 仍在未匹配清单中——该成就无法通过游戏内进度导入`)
  }
}

if (problems.length) {
  console.error(`成就 ID 映射检查未通过（站内 ${siteSlugs.size} 个成就，其中未上线豁免 ${exemptSlugs.size} 个，映射 ${Object.keys(map).length} 条）：`)
  for (const problem of problems) console.error(`  - ${problem}`)
  console.error('修复：拉取最新 HSAchieveGuide 校准数据后运行 node scripts/build-achievement-id-map.mjs（详见 AGENTS.md「成就进度导入与 ID 映射」）')
  process.exit(1)
}

console.log(`成就 ID 映射检查通过：站内 ${siteSlugs.size} 个成就，${importableCount} 个可导入成就全部有映射（未上线豁免 ${exemptSlugs.size} 个）`)
