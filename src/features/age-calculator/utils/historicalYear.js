export const ERA_BCE = 'bce'
export const ERA_CE = 'ce'

/** 将公元前/公元纪年转换为包含公元 0 年的天文年份，便于正确计算间隔。 */
export function toAstronomicalYear(era, year) {
  if (era !== ERA_BCE && era !== ERA_CE) {
    throw new RangeError('纪元必须是公元前或公元')
  }

  if (!Number.isSafeInteger(year) || year < 1) {
    throw new RangeError('年份必须是大于 0 的整数')
  }

  return era === ERA_BCE ? 1 - year : year
}

/** 按历史纪年计算两个年份之间的周岁差，不将不存在的公元 0 年多算一年。 */
export function calculateHistoricalAge(birth, target) {
  const birthYear = toAstronomicalYear(birth.era, birth.year)
  const targetYear = toAstronomicalYear(target.era, target.year)

  if (targetYear < birthYear) {
    throw new RangeError('特定年份不能早于出生年份')
  }

  return targetYear - birthYear
}

/** 将纪元与年份格式化为中文历史纪年。 */
export function formatHistoricalYear({ era, year }) {
  return `${era === ERA_BCE ? '公元前' : '公元'} ${year} 年`
}
