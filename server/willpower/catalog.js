/**
 * 心魔 / 成就 / 正能量活动的内置目录。
 * 内置项不入库，只以常量存在；用户自定义项存 demons、custom_achievements 表，
 * 读取时按 key 合并（用户可对内置心魔做改名或归档的覆盖）。
 */

/** 统计「今天」「凌晨」用的时区，默认北京时间。 */
export const WILLPOWER_TIME_ZONE = process.env.WILLPOWER_TIME_ZONE || 'Asia/Shanghai'

/** 计时挑战默认坚持时长（秒）：满 10 分钟即判定抵御成功。 */
export const DEFAULT_HOLD_SECONDS = Number(process.env.WILLPOWER_HOLD_SECONDS) || 600

export const BUILTIN_DEMONS = [
  { demonKey: 'lust', name: '色魔', emoji: '🔥', color: '#e11d48', description: '情欲翻涌，最常在深夜叩门' },
  { demonKey: 'screen', name: '屏魔', emoji: '📱', color: '#0ea5e9', description: '短视频与信息流的无底洞' },
  { demonKey: 'sloth', name: '惰魔', emoji: '🛌', color: '#8b5cf6', description: '拖延、赖床、想着"明天再说"' },
  { demonKey: 'gluttony', name: '食魔', emoji: '🍜', color: '#f59e0b', description: '深夜外卖、暴食与甜食冲动' },
  { demonKey: 'rage', name: '嗔魔', emoji: '⚡', color: '#dc2626', description: '怒火上头，想发作或对线' },
  { demonKey: 'greed', name: '贪魔', emoji: '🛒', color: '#10b981', description: '冲动消费，购物车蠢蠢欲动' },
  { demonKey: 'game', name: '游魔', emoji: '🎮', color: '#6366f1', description: '再来一把，就一把' },
  { demonKey: 'anxiety', name: '忧魔', emoji: '🌀', color: '#64748b', description: '内耗、反刍、自我怀疑' }
]

// inputMode:
//   count    —— 只填一个数字，单位固定（如 跑步 公里、健身 分钟）
//   duration —— 填「小时 + 分钟」两段，展示为「X 小时 X 分」（如 学习）
export const BUILTIN_ACTIVITIES = [
  { activityKey: 'running', name: '跑步', emoji: '🏃', unit: '公里', inputMode: 'count' },
  { activityKey: 'workout', name: '健身', emoji: '🏋️', unit: '分钟', inputMode: 'count' },
  { activityKey: 'reading', name: '阅读', emoji: '📖', unit: '分钟', inputMode: 'count' },
  { activityKey: 'study', name: '学习', emoji: '✏️', unit: '分钟', inputMode: 'duration' },
  { activityKey: 'meditation', name: '冥想', emoji: '🧘', unit: '分钟', inputMode: 'count' },
  { activityKey: 'early-sleep', name: '早睡', emoji: '🌙', unit: '次', inputMode: 'count' }
]

/**
 * 支持的成就规则类型。自定义成就只允许使用 customizable 为 true 的类型。
 * target 一律是「达成所需的数量」，进度以同单位累加。
 */
export const RULE_TYPES = {
  resist_count: { label: '抵御次数', customizable: true, unit: '次' },
  resist_streak_days: { label: '连续抵御天数', customizable: true, unit: '天' },
  single_day_count: { label: '单日抵御次数', customizable: true, unit: '次' },
  resist_duration_minutes: { label: '累计坚持时长', customizable: true, unit: '分钟' },
  time_window: { label: '指定时段内抵御', customizable: true, unit: '次' },
  recover_after_fail: { label: '失手当天扳回', customizable: true, unit: '次' },
  positive_count: { label: '正能量记录次数', customizable: true, unit: '次' },
  positive_amount: { label: '正能量记录累计量', customizable: true, unit: '' }
}

/**
 * 内置成就。hidden 为 true 的在解锁前对用户不可见（只暴露"还有 N 个隐藏成就"）。
 * code 全局唯一且稳定，进度表以它为主键的一部分。
 */
export const BUILTIN_ACHIEVEMENTS = [
  {
    code: 'first-strike',
    name: '初次交锋',
    description: '第一次成功抵御任意心魔',
    tier: '入门',
    points: 5,
    rule: { type: 'resist_count', demonKey: '*', target: 1 }
  },
  {
    code: 'ten-wins',
    name: '十战十胜',
    description: '累计成功抵御 10 次',
    tier: '进阶',
    points: 10,
    rule: { type: 'resist_count', demonKey: '*', target: 10 }
  },
  {
    code: 'fifty-cuts',
    name: '五十斩',
    description: '累计成功抵御 50 次',
    tier: '进阶',
    points: 20,
    rule: { type: 'resist_count', demonKey: '*', target: 50 }
  },
  {
    code: 'hundred-forge',
    name: '百炼成钢',
    description: '累计成功抵御 100 次',
    tier: '精通',
    points: 40,
    rule: { type: 'resist_count', demonKey: '*', target: 100 }
  },
  {
    code: 'thousand-temper',
    name: '千锤之心',
    description: '累计成功抵御 500 次',
    tier: '大师',
    points: 100,
    rule: { type: 'resist_count', demonKey: '*', target: 500 }
  },
  {
    code: 'streak-3',
    name: '三日结界',
    description: '连续 3 天都有成功抵御记录',
    tier: '入门',
    points: 10,
    rule: { type: 'resist_streak_days', target: 3 }
  },
  {
    code: 'streak-7',
    name: '七日结界',
    description: '连续 7 天都有成功抵御记录',
    tier: '进阶',
    points: 25,
    rule: { type: 'resist_streak_days', target: 7 }
  },
  {
    code: 'streak-30',
    name: '月相圆满',
    description: '连续 30 天都有成功抵御记录',
    tier: '大师',
    points: 80,
    rule: { type: 'resist_streak_days', target: 30 }
  },
  {
    code: 'focus-60',
    name: '定力初成',
    description: '计时挑战累计坚持满 60 分钟',
    tier: '入门',
    points: 10,
    rule: { type: 'resist_duration_minutes', target: 60 }
  },
  {
    code: 'focus-600',
    name: '心如止水',
    description: '计时挑战累计坚持满 600 分钟',
    tier: '精通',
    points: 50,
    rule: { type: 'resist_duration_minutes', target: 600 }
  },
  {
    code: 'day-five',
    name: '一日五斩',
    description: '单日成功抵御 5 次',
    tier: '进阶',
    points: 20,
    rule: { type: 'single_day_count', target: 5 }
  },
  {
    code: 'comeback-three',
    name: '知耻后勇',
    description: '在破防的当天重新拿下抵御，累计 3 天',
    tier: '精通',
    points: 30,
    rule: { type: 'recover_after_fail', target: 3 }
  },
  {
    code: 'positive-ten',
    name: '正道之行',
    description: '累计 10 条正能量记录',
    tier: '入门',
    points: 10,
    rule: { type: 'positive_count', activityKey: '*', target: 10 }
  },
  {
    code: 'runner-42',
    name: '一场马拉松',
    description: '跑步累计满 42 公里',
    tier: '进阶',
    points: 30,
    rule: { type: 'positive_amount', activityKey: 'running', target: 42 }
  },
  // ===== 隐藏成就：解锁前不显示名称与条件 =====
  {
    code: 'midnight-slayer',
    name: '子夜斩魔',
    description: '在凌晨 0 点至 5 点之间成功抵御色魔',
    tier: '隐藏',
    points: 30,
    hidden: true,
    hint: '深夜的守夜人会得到额外的馈赠',
    rule: { type: 'time_window', demonKey: 'lust', hourFrom: 0, hourTo: 5, target: 1 }
  },
  {
    code: 'night-patrol',
    name: '夜巡不倦',
    description: '在凌晨 0 点至 5 点之间累计成功抵御 10 次',
    tier: '隐藏',
    points: 50,
    hidden: true,
    hint: '深夜的守夜人会得到额外的馈赠',
    rule: { type: 'time_window', demonKey: '*', hourFrom: 0, hourTo: 5, target: 10 }
  },
  {
    code: 'dawn-breaker',
    name: '破晓者',
    description: '在清晨 5 点至 7 点之间成功抵御一次心魔',
    tier: '隐藏',
    points: 20,
    hidden: true,
    hint: '天光将亮未亮时，也有心魔出没',
    rule: { type: 'time_window', demonKey: '*', hourFrom: 5, hourTo: 7, target: 1 }
  },
  {
    code: 'phoenix',
    name: '死灰复燃',
    description: '在失手当天重新拿下一次成功抵御',
    tier: '隐藏',
    points: 40,
    hidden: true,
    hint: '跌倒的地方，也可以是起点',
    rule: { type: 'recover_after_fail', target: 1 }
  }
]

const builtinDemonMap = new Map(BUILTIN_DEMONS.map((item) => [item.demonKey, item]))
const builtinActivityMap = new Map(BUILTIN_ACTIVITIES.map((item) => [item.activityKey, item]))

export function isBuiltinDemon(demonKey) {
  return builtinDemonMap.has(demonKey)
}

export function getBuiltinDemon(demonKey) {
  return builtinDemonMap.get(demonKey) || null
}

export function getBuiltinActivity(activityKey) {
  return builtinActivityMap.get(activityKey) || null
}

export function isBuiltinActivity(activityKey) {
  return builtinActivityMap.has(activityKey)
}

export function isBuiltinAchievementCode(code) {
  return BUILTIN_ACHIEVEMENTS.some((item) => item.code === code)
}
