/**
 * 站内成就简要索引（id → 名称/职业/版本），供卡组关联成就的选择器与徽章展示复用。
 * 数据与成就目录同源（expansions.js 聚合的全部版本 JSON），无额外请求。
 * 注意：本模块会连带加载全部版本成就数据（数百 KB），只允许动态 import 按需加载，
 * 不要静态 import 进轻量页面（否则卡组解析页等首屏会被拖慢）。
 */
import { expansions } from '../data/expansions.js';

const achievementRefIndex = new Map(
  expansions.flatMap((expansion) =>
    (expansion.achievements || []).map((achievement) => [
      achievement.id,
      {
        id: achievement.id,
        name: achievement.name,
        heroClass: achievement.heroClass,
        version: expansion.name
      }
    ])
  )
);

/** 按 slug 取成就简要信息，不存在返回 null。 */
export function getAchievementRef(id) {
  return achievementRefIndex.get(id) || null;
}

/** 按成就名称或 slug 模糊搜索（卡组关联选择器用），最多返回 limit 条。 */
export function searchAchievements(keyword, limit = 8) {
  const kw = (keyword || '').trim().toLowerCase();
  if (!kw) return [];
  const results = [];
  for (const ref of achievementRefIndex.values()) {
    if (results.length >= limit) break;
    if (ref.name.toLowerCase().includes(kw) || ref.id.toLowerCase().includes(kw)) {
      results.push(ref);
    }
  }
  return results;
}
