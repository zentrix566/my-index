/**
 * 「蛙生模拟器」找茬玩法核心逻辑。
 *
 * 玩法：每轮抽 3 张真实随从牌，其中一张的某个卡面元素（费用/攻击/生命/稀有度/
 * 名称/效果/种族）被另一张牌的同位置像素「贴片」覆盖，玩家要指出被动手脚的那张。
 *
 * 卡池：运行时从 OSS 上的 cards-db.json（全量卡牌库）过滤得到，
 * 标准模式取当前轮换内的可收藏随从，狂野模式取其余全部。
 * 卡图统一走 /hearthstone-cards/... 相对路径，由服务端反代 OSS。
 */
import { computed, onBeforeUnmount, ref, shallowRef } from 'vue'
import { getFrogMinions } from './useCardDatabase.js'

/** 可被篡改的卡面字段 */
export const mutationTypes = [
  'manaCost',
  'attack',
  'health',
  'rarityId',
  'name',
  'text',
  'minionTypeId'
]

export const fieldLabels = {
  manaCost: '法力值',
  attack: '攻击力',
  health: '生命值',
  rarityId: '稀有度',
  name: '名称',
  text: '效果',
  minionTypeId: '随从类型'
}

/** 可在设置里勾选的混淆类型。unstable 标注的几类贴片效果还不够稳定，默认不勾选。 */
export const mutationOptions = [
  { key: 'manaCost', label: '法力值' },
  { key: 'attack', label: '攻击力' },
  { key: 'health', label: '生命值' },
  {
    key: 'rarityId',
    label: '稀有度',
    hint: '替换稀有度宝石贴片（此类型 bug 较多、结果不够准确，仍在调优）',
    unstable: true
  },
  {
    key: 'name',
    label: '名称',
    hint: '覆盖名称条文字贴片（此类型 bug 较多、结果不够准确，仍在调优）',
    unstable: true
  },
  {
    key: 'text',
    label: '效果',
    hint: '覆盖效果描述区贴片（此类型 bug 较多、结果不够准确，仍在调优）',
    unstable: true
  },
  {
    key: 'minionTypeId',
    label: '随从类型',
    hint: '替换种族铭牌贴片（此类型 bug 较多、结果不够准确，仍在调优）',
    unstable: true
  }
]

/** 数值类字段：只做 ±1 微调，避免和原图差距过大被一眼看穿 */
const numericTypes = ['manaCost', 'attack', 'health']

/** 数值贴片的合法落点：法力值封顶 10（炉石无法支付超过 10），
 *  所有数值都不允许到 0（1→0、攻击→0 太明显，一眼就看穿）。 */
const numericBounds = {
  manaCost: { min: 1, max: 10 },
  attack: { min: 1, max: 30 },
  health: { min: 1, max: 30 }
}

const isNumericTargetValid = (type, target) => {
  const { min, max } = numericBounds[type] || { min: 1, max: 30 }
  return target >= min && target <= max
}

export const minionTypes = {
  0: '无种族',
  14: '鱼人',
  15: '恶魔',
  17: '机械',
  18: '元素',
  20: '野兽',
  23: '海盗',
  24: '龙',
  26: '全部',
  43: '野猪人',
  92: '娜迦',
  93: '亡灵'
}

const rarityLabels = {
  1: '普通',
  2: '免费',
  3: '稀有',
  4: '史诗',
  5: '传说'
}

/** 贴片都会带一点卡框底纹，供体必须来自同款卡框，否则边缘会出现断层 */
const framePatchTypes = ['manaCost', 'attack', 'health', 'rarityId', 'name', 'text', 'minionTypeId']

/** 这几类贴片覆盖的是文字排版区，优先挑「内容最少」的供体，避免残留旧文字 */
const templatePatchTypes = ['rarityId', 'name', 'text', 'minionTypeId']

const sample = (items) => items[Math.floor(Math.random() * items.length)]

const shuffle = (items) => {
  const result = [...items]
  for (let index = result.length - 1; index > 0; index -= 1) {
    const target = Math.floor(Math.random() * (index + 1))
    ;[result[index], result[target]] = [result[target], result[index]]
  }
  return result
}

/** 预加载指定图片，成功失败都 resolve，只用来避免贴片先于底图出现 */
export const preloadCardImages = (urls) => Promise.all(
  urls.filter(Boolean).map((src) => new Promise((resolve) => {
    const image = new Image()
    image.onload = resolve
    image.onerror = resolve
    image.src = src
  }))
)

const isCompatibleDonor = (type, card, candidate) => {
  if (candidate.id === card.id || candidate[type] === card[type]) return false

  // 卡框按职业着色，双职业卡还是两色拼接，供体必须完全同款卡框。
  if (framePatchTypes.includes(type)) {
    if (candidate.classId !== card.classId) return false
    if ((candidate.dual || '') !== (card.dual || '')) return false
  }

  // 名称条和效果区紧邻稀有度宝石，同稀有度可避免边缘带入不同颜色的宝石。
  if (['name', 'text'].includes(type) && candidate.rarityId !== card.rarityId) return false

  // 效果区下沿会触到种族铭牌上缘，再限定同种族以保持底纹一致。
  return type !== 'text' || candidate.minionTypeId === card.minionTypeId
}

const cleanText = (value = '') => value.replace(/<[^>]+>/g, '')

const getTemplateScore = (type, candidate) => {
  const textLength = cleanText(candidate.text).length
  if (type === 'name') return candidate.name.length * 10 + textLength * 0.05
  if (type === 'text') return textLength
  if (type === 'minionTypeId') return textLength + candidate.name.length
  return textLength * 0.1
}

const selectCleanDonor = (type, donors) => {
  if (!templatePatchTypes.includes(type)) return sample(donors)
  const cleanest = [...donors]
    .sort((left, right) => getTemplateScore(type, left) - getTemplateScore(type, right))
    .slice(0, 3)
  return sample(cleanest)
}

export const createMutationForType = (card, cards, type) => {
  const donors = cards.filter((candidate) => isCompatibleDonor(type, card, candidate))
  if (!donors.length) return null

  // 数值类只做加强：费用降 1 点、攻击/生命加 1 点。
  // 贴片显示的卡面数字只差 1，既不会被一眼看穿，又保证"只加强不削弱"。
  // 但改动后的值不能越界：法力值不低于 1 且不超 10、攻击/生命不超 30。
  if (numericTypes.includes(type)) {
    const buffDelta = type === 'manaCost' ? -1 : 1
    const target = Number(card[type]) + buffDelta
    if (!isNumericTargetValid(type, target)) return null
    const match = donors.find((candidate) => Number(candidate[type]) === target)
    if (match) return { type, original: card[type], changed: target, donor: match, delta: buffDelta }
    return null
  }

  const donor = selectCleanDonor(type, donors)
  if (!donor) return null
  return { type, original: card[type], changed: donor[type], donor }
}

const createMutation = (card, cards, enabledTypes) => {
  const pool = shuffle([...enabledTypes])
  for (const type of pool) {
    const result = createMutationForType(card, cards, type)
    if (result) return result
  }
  return null
}

export const formatValue = (type, value) => {
  if (type === 'rarityId') return rarityLabels[value] ?? `稀有度 ${value}`
  if (type === 'minionTypeId') return minionTypes[value] ?? `种族 ${value}`
  if (type === 'text') return cleanText(value) || '（无）'
  return value
}

export const useFrogGame = () => {
  // 标准卡池默认加载；狂野卡池在玩家打开开关后才懒加载并合并
  const standardCards = shallowRef([])
  const wildCards = shallowRef([])
  const wildMode = ref(false)
  const wildLoaded = ref(false)
  // 只读不改，用 computed + shallowRef 省掉深层响应式代理开销
  const allCards = computed(() => (wildMode.value
    ? [...standardCards.value, ...wildCards.value]
    : standardCards.value))
  const roundCards = shallowRef([])
  const suspiciousIndex = ref(-1)
  const mutation = shallowRef(null)
  const selectedIndex = ref(null)
  const score = ref(0)
  const streak = ref(0)
  const bestStreak = ref(0)
  const round = ref(0)
  const rounds = ref(0)
  const hits = ref(0)
  const loading = ref(true)
  const dealing = ref(false)
  const error = ref('')

  // 翻牌历史与自动进入下一张
  const roundLog = ref([])      // 已发牌的每一轮快照（含揭晓状态），支持上/下一张回看
  const cursor = ref(0)         // 当前展示的是第几轮
  const advanceTimer = ref(null)
  const countdown = ref(0)      // 答对后的可见倒计时（秒），仅用于展示
  let countdownInterval = null
  const displayToken = ref(0)   // 每次切换展示的牌桌都 +1，强制卡牌组件重挂载

  // 勾选的混淆类型：默认只开数值三项，稀有度/名称/效果/随从类型默认关闭
  const activeTypes = ref(['manaCost', 'attack', 'health'])

  const revealed = computed(() => selectedIndex.value !== null)
  const correct = computed(() => revealed.value && selectedIndex.value === suspiciousIndex.value)
  const accuracy = computed(() => (rounds.value ? Math.round((hits.value / rounds.value) * 100) : 0))

  const explanation = computed(() => {
    if (!mutation.value) return null
    const { type, original, changed } = mutation.value
    return {
      field: fieldLabels[type],
      original: formatValue(type, original),
      changed: formatValue(type, changed)
    }
  })

  // 发一张新牌（不写历史）。成功返回 true，卡池不足/无供体返回 false
  const dealRound = async () => {
    if (allCards.value.length < 3) return false
    if (!activeTypes.value.length) {
      error.value = '请至少勾选一种混淆类型'
      return false
    }
    dealing.value = true
    try {
      let chosen = []
      let picked = null
      // 极小概率抽到三张都找不到合法供体的组合，重抽即可
      for (let attempt = 0; attempt < 12 && !picked; attempt += 1) {
        chosen = shuffle(allCards.value).slice(0, 3)
        const index = Math.floor(Math.random() * chosen.length)
        const found = createMutation(chosen[index], allCards.value, activeTypes.value)
        if (found) picked = { index, mutation: found }
      }
      if (!picked) {
        error.value = '这一轮没能凑出合适的卡牌，请再试一次'
        return false
      }
      // 只预载本轮真正会用到的 4 张图（3 张底图 + 1 张供体），不整包预热
      await preloadCardImages([...chosen.map((card) => card.image), picked.mutation.donor.image])
      roundCards.value = chosen
      suspiciousIndex.value = picked.index
      mutation.value = picked.mutation
      selectedIndex.value = null
      round.value += 1
      error.value = ''
      displayToken.value += 1
      return true
    } finally {
      dealing.value = false
    }
  }

  // 把某一轮快照渲染到牌桌
  const setDisplay = (snap) => {
    roundCards.value = snap.roundCards
    suspiciousIndex.value = snap.suspiciousIndex
    mutation.value = snap.mutation
    selectedIndex.value = snap.selectedIndex
    displayToken.value += 1
  }

  // 开新局：清空历史并从第一张开始
  const startRound = async () => {
    const ok = await dealRound()
    if (ok) {
      roundLog.value = [{
        roundCards: roundCards.value,
        suspiciousIndex: suspiciousIndex.value,
        mutation: mutation.value,
        selectedIndex: null,
        roundNum: round.value
      }]
      cursor.value = 0
    }
  }

  // 只加载卡池数据（不自动发牌），供游戏与验收台共用
  const loadData = async () => {
    loading.value = true
    error.value = ''
    try {
      standardCards.value = await getFrogMinions('standard')
      if (standardCards.value.length < 3) throw new Error('可用随从牌不足三张')
    } catch (loadError) {
      error.value = loadError.message || '卡牌数据读取失败'
    } finally {
      loading.value = false
    }
  }

  // 游戏入口：加载标准卡池后立即发牌
  const loadCards = async () => {
    await loadData()
    if (!error.value) await startRound()
  }

  // 切换「狂野模式」：首次打开时从已加载的卡牌库过滤狂野卡池（无需二次网络请求）
  const toggleWild = async (next = !wildMode.value) => {
    if (next && !wildLoaded.value) {
      try {
        wildCards.value = await getFrogMinions('wild')
        wildLoaded.value = true
      } catch (loadError) {
        error.value = '狂野卡牌数据读取失败'
        return false
      }
    }
    wildMode.value = next
    return next
  }

  // 答对后短暂停顿自动进入下一张；答错则停在结果面板，等待玩家手动点“下一轮”。
  const CORRECT_ADVANCE_DELAY = 5000

  // 清理“答对后”的定时翻牌与倒计时展示（手动点“下一轮/上一张”或组件卸载时调用）
  const clearPendingAdvance = () => {
    if (advanceTimer.value) {
      clearTimeout(advanceTimer.value)
      advanceTimer.value = null
    }
    if (countdownInterval) {
      clearInterval(countdownInterval)
      countdownInterval = null
    }
    countdown.value = 0
  }

  // 答对后启动 5 秒倒计时：到点自动翻下一张；期间点“下一轮”可立即跳过
  const startCorrectCountdown = () => {
    clearPendingAdvance()
    countdown.value = Math.round(CORRECT_ADVANCE_DELAY / 1000)
    advanceTimer.value = setTimeout(() => advance(), CORRECT_ADVANCE_DELAY)
    countdownInterval = setInterval(() => {
      countdown.value -= 1
      if (countdown.value <= 0) {
        clearInterval(countdownInterval)
        countdownInterval = null
      }
    }, 1000)
  }

  const selectCard = (index) => {
    if (revealed.value || dealing.value) return
    selectedIndex.value = index
    rounds.value += 1
    const isCorrect = index === suspiciousIndex.value
    if (isCorrect) {
      score.value += 100 + streak.value * 20
      streak.value += 1
      hits.value += 1
      if (streak.value > bestStreak.value) bestStreak.value = streak.value
    } else {
      streak.value = 0
    }
    // 记录本轮揭晓状态，返回上一张时能还原答案
    const entry = roundLog.value[cursor.value]
    if (entry) entry.selectedIndex = index
    // 答对自动翻下一张（5 秒倒计时）；答错不自动，留给玩家慢慢看答案
    if (isCorrect) startCorrectCountdown()
  }

  // 进入下一张：若已到末尾则发新牌，否则回看历史中的下一轮
  const advance = async () => {
    clearPendingAdvance()
    cursor.value += 1
    if (cursor.value >= roundLog.value.length) {
      const ok = await dealRound()
      if (ok) {
        roundLog.value.push({
          roundCards: roundCards.value,
          suspiciousIndex: suspiciousIndex.value,
          mutation: mutation.value,
          selectedIndex: null,
          roundNum: round.value
        })
        cursor.value = roundLog.value.length - 1
      } else {
        cursor.value -= 1
      }
    } else {
      setDisplay(roundLog.value[cursor.value])
    }
  }

  // 返回上一张（回看历史中已揭晓的轮次）
  const goBack = () => {
    clearPendingAdvance()
    if (cursor.value <= 0) return
    cursor.value -= 1
    setDisplay(roundLog.value[cursor.value])
  }

  const canGoBack = computed(() => cursor.value > 0)
  const canGoForward = computed(() => cursor.value < roundLog.value.length - 1)
  const currentRoundNum = computed(() => roundLog.value[cursor.value]?.roundNum ?? round.value)

  onBeforeUnmount(() => {
    clearPendingAdvance()
  })

  return {
    accuracy,
    activeTypes,
    allCards,
    advance,
    bestStreak,
    countdown,
    correctAdvanceDelay: CORRECT_ADVANCE_DELAY,
    canGoBack,
    canGoForward,
    correct,
    currentRoundNum,
    dealing,
    displayToken,
    error,
    explanation,
    goBack,
    hits,
    loadCards,
    loadData,
    loading,
    mutation,
    revealed,
    round,
    roundCards,
    rounds,
    score,
    selectCard,
    selectedIndex,
    startRound,
    streak,
    suspiciousIndex,
    toggleWild,
    wildMode
  }
}
