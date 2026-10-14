// 游戏成就导出 → 站内进度增量的纯函数换算。
// 从 useAchievementGameImport 迁出为独立模块：导入逻辑可在 Node 里单独测试，
// 名称兜底匹配（无 ID 映射的新版本成就）与 ID 映射共用同一套阶段推进语义。

// 采集器导出的 status：3=COMPLETE、4=REWARD_GRANTED 视为已完成；isComplete 字段兜底
function isGameItemDone(item) {
  if (!item) return false
  if (item.isComplete === true) return true
  return item.status != null && item.status >= 3
}

// 与 useAchievementProgress.isStageCompleted 同口径地判断「站内已有进度」里某阶段是否完成，
// 用于导入预览统计（新增了多少），以及合并时避免回退已有勾选。
function isStageDoneInEntry(entry, achievement, stageIdx) {
  if (!entry) return false
  const stage = achievement.stages?.[stageIdx]
  if (!stage) return false
  if (entry.stages?.[String(stageIdx)]) return true
  if (achievement.trackClasses || achievement.trackItems || achievement.type === '累计') {
    return entry.count != null && entry.count >= stage.quota
  }
  return false
}

// 名称归一化：去空白与中英文标点、统一小写（与 scripts/build-achievement-id-map.mjs 同规则）
function normalizeName(name) {
  return String(name ?? '')
    .replace(/\s+/g, '')
    .replace(/[\p{P}\p{S}]/gu, '')
    .toLowerCase()
}

// 归一化后为空说明名称由纯符号构成（如隐藏谜题「？？？」），无区分度，不参与匹配
function hasUsableName(name) {
  return normalizeName(name).length > 0
}

/**
 * 把采集器导出的 achievements.json 翻译成站内进度增量。
 * 匹配分两层：
 *   1. ID 映射（achievement-id-map.json）：数字 ID 精确换算，主路径。
 *   2. 名称兜底：尚无 ID 映射的成就（新上线版本），按「成就名称 + 阶段结构」
 *      与导出条目的 name/quota 字段匹配——依赖采集器 ≥1.4.0 导出名称，
 *      旧版导出没有名称时自然跳过，行为与从前一致。
 * 返回 null 表示文件不是采集器导出格式。
 *
 * @param {object} payload 采集器导出 JSON
 * @param {{ idMap: Record<string, number[]>, achievementsBySlug: Map, currentProgress: object }} ctx
 */
export function translateGameExport(payload, { idMap, achievementsBySlug, currentProgress }) {
  const items = Array.isArray(payload?.items) ? payload.items : null
  if (!items?.length || typeof items[0]?.id !== 'number') return null

  const itemsById = new Map()
  let sourceCompleted = 0
  for (const item of items) {
    itemsById.set(item.id, item)
    if (isGameItemDone(item)) sourceCompleted += 1
  }

  const entries = {}
  let matched = 0
  let stageHits = 0
  let countUpdates = 0
  const lowerProgressUpdates = []
  let newlyCompleted = 0
  let nameMatched = 0
  let nameAmbiguous = 0
  let nameNoData = 0

  /** 汇总一个 slug 的导入增量：与既有进度对比，只推进不回退。 */
  function recordEntry(slug, achievement, entry) {
    const existing = currentProgress?.[slug]
    let hasNew = false
    for (let i = 0; i < achievement.stages.length; i++) {
      const doneAfter = Boolean(entry.stages?.[String(i)]) ||
        (entry.count != null && entry.count >= achievement.stages[i].quota)
      const doneBefore = isStageDoneInEntry(existing, achievement, i)
      if (doneAfter && !doneBefore) {
        stageHits += 1
        hasNew = true
      }
    }
    if (entry.count != null && (existing?.count ?? 0) < entry.count) {
      countUpdates += 1
      hasNew = true
    }
    if (entry.count != null && Number.isFinite(existing?.count) && existing.count > entry.count) {
      lowerProgressUpdates.push({
        slug,
        name: achievement.name,
        existing: Math.trunc(existing.count),
        imported: Math.trunc(entry.count)
      })
    }
    if (
      achievement.stages.every((_, i) =>
        isStageDoneInEntry(existing, achievement, i) ||
        Boolean(entry.stages?.[String(i)]) ||
        (entry.count != null && entry.count >= achievement.stages[i].quota)
      ) && !achievement.stages.every((_, i) => isStageDoneInEntry(existing, achievement, i))
    ) {
      newlyCompleted += 1
    }
    if (hasNew || !existing || lowerProgressUpdates.some((item) => item.slug === slug)) {
      entries[slug] = entry
    }
  }

  // —— 主路径：ID 映射精确换算 ——
  const idMatchedNames = new Set()
  for (const [slug, hsIds] of Object.entries(idMap)) {
    const achievement = achievementsBySlug.get(slug)
    if (!achievement?.stages?.length) continue

    const stages = {}
    let maxProgress = 0
    let touched = false
    const stageCount = Math.min(hsIds.length, achievement.stages.length)
    for (let i = 0; i < stageCount; i++) {
      const item = itemsById.get(hsIds[i])
      if (!item) continue
      touched = true
      if (isGameItemDone(item)) stages[String(i)] = true
      if (typeof item.progress === 'number' && item.progress > maxProgress) {
        maxProgress = item.progress
      }
    }
    // 少数隐藏谜题在游戏数据中只有一个「最终完成」成就 ID，却在站内拆成多步展示。
    // 只有该最终 ID 被游戏标为完成时，才补全所有步骤；进行中状态绝不会被扩展为完成。
    const gameCompletionFillsStages = achievement.gameCompletionFillsStages === true &&
      hsIds.some((id) => isGameItemDone(itemsById.get(id)))
    if (gameCompletionFillsStages) {
      for (let i = 0; i < achievement.stages.length; i++) stages[String(i)] = true
    }
    if (!touched) continue
    matched += 1
    idMatchedNames.add(normalizeName(achievement.name))

    const entry = { stages }
    const usesCount =
      achievement.trackClasses || achievement.trackItems || achievement.type === '累计'
    if (usesCount && maxProgress > 0) entry.count = maxProgress
    recordEntry(slug, achievement, entry)
  }

  // —— 兜底路径：名称匹配（仅处理没有 ID 映射的成就） ——
  const unmapped = []
  for (const [slug, achievement] of achievementsBySlug) {
    if (slug in idMap) continue
    if (!achievement?.stages?.length) continue
    if (!hasUsableName(achievement.name)) continue
    unmapped.push({ slug, achievement })
  }
  // 站内同名无映射成就 >1 个时名称无区分度，整组放弃
  const groupsByName = new Map()
  for (const u of unmapped) {
    const key = normalizeName(u.achievement.name)
    if (!groupsByName.has(key)) groupsByName.set(key, [])
    groupsByName.get(key).push(u)
  }
  // 导出条目按名称分桶（仅含带名称字段的条目）
  const itemBuckets = new Map()
  for (const item of items) {
    if (typeof item?.name !== 'string' || !hasUsableName(item.name)) continue
    const key = normalizeName(item.name)
    if (!itemBuckets.has(key)) itemBuckets.set(key, [])
    itemBuckets.get(key).push(item)
  }

  for (const [key, group] of groupsByName) {
    if (group.length > 1) {
      nameAmbiguous += group.length
      continue
    }
    // 同名成就已由 ID 映射处理过（旧版本同名成就），不重复计数
    if (idMatchedNames.has(key)) continue
    const bucket = itemBuckets.get(key)
    if (!bucket?.length) {
      nameNoData += 1
      continue
    }
    const { slug, achievement } = group[0]
    const stages = achievement.stages
    const usesCount =
      achievement.trackClasses || achievement.trackItems || achievement.type === '累计'

    let entry = null
    if (usesCount) {
      // 累计成就：多档位中最高档的进度即当前累计次数（游戏中高档位始终显示真实累计值）
      const maxProgress = Math.max(0, ...bucket.map((it) =>
        typeof it.progress === 'number' ? it.progress : 0
      ))
      if (maxProgress <= 0) continue
      entry = { count: maxProgress }
    } else {
      // 一次性成就：游戏内档位严格按顺序解锁，已完成档位必为前缀。
      // 导出条目带 quota 时按 quota 升序对齐（更精确）；否则按「条目数=阶段数 + 完成前缀」匹配。
      if (bucket.length !== stages.length) {
        nameAmbiguous += 1
        continue
      }
      const stageSlots = new Array(stages.length).fill(false)
      const allQuotaKnown = bucket.every((it) => typeof it.quota === 'number' && it.quota > 0)
      if (allQuotaKnown) {
        const sorted = [...bucket].sort((a, b) => a.quota - b.quota)
        const aligned = stages.every((st, i) => sorted[i].quota === (st.quota === 0 ? 1 : st.quota))
        if (!aligned) {
          nameAmbiguous += 1
          continue
        }
        sorted.forEach((it, i) => {
          if (isGameItemDone(it)) stageSlots[i] = true
        })
      } else {
        const doneCount = bucket.filter(isGameItemDone).length
        for (let i = 0; i < doneCount; i++) stageSlots[i] = true
      }
      if (!stageSlots.some(Boolean)) continue
      entry = { stages: Object.fromEntries(
        stageSlots.map((v, i) => [String(i), v]).filter(([, v]) => v)
      ) }
    }

    const before = { matched, stageHits, countUpdates, newlyCompleted, lowerProgressUpdates: lowerProgressUpdates.length }
    recordEntry(slug, achievement, entry)
    const wrote = entries[slug] === entry
    matched += 1
    if (wrote) {
      nameMatched += 1
    } else {
      // 没有新增进度（站内已领先）：不计入匹配，也不覆盖已有记录
      matched = before.matched
      stageHits = before.stageHits
      countUpdates = before.countUpdates
      newlyCompleted = before.newlyCompleted
      lowerProgressUpdates.length = before.lowerProgressUpdates
    }
  }

  const mappedIds = new Set(Object.values(idMap).flat())
  let unmatchedItems = 0
  for (const item of items) {
    if (!mappedIds.has(item.id)) unmatchedItems += 1
  }

  return {
    entries,
    stats: {
      sourceItems: items.length,
      sourceCompleted,
      matched,
      stageHits,
      countUpdates,
      lowerProgressUpdates,
      lowerProgressUpdateCount: lowerProgressUpdates.length,
      newlyCompleted,
      unmatchedItems,
      // 名称兜底匹配的统计：无 ID 映射但通过名称识别 / 无法唯一识别的个数
      nameMatched,
      nameAmbiguous,
      nameNoData
    }
  }
}
