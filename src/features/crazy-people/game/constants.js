// 全局常量：房间尺寸、速度、emoji 素材、对话台词等

// 房间尺寸（游戏世界坐标，单位 px）
export const ROOM = {
  width: 1160,
  height: 720,
  padding: 30, // 实体活动区域距墙的内边距
  wallHeight: 120 // 顶部"墙面"高度，其下为地板
}

// 疯子相关参数
export const MADMAN = {
  baseSpeed: 90, // px/s
  size: 46,
  smashRange: 46, // 进入该距离即可击打物体
  smashCooldown: 0.6, // 击打冷却（秒）
  screamChance: 0.008, // 每帧触发嘶吼的概率基数
  retargetTime: 2.2 // 多久重选一次游荡目标（秒）
}

// NPC 相关参数
export const NPC = {
  baseSpeed: 60,
  size: 40,
  fearRadius: 150, // 疯子进入该半径则惊慌
  panicSpeed: 150, // 惊慌逃跑速度
  calmDelay: 1.6, // 脱离危险后多久冷静下来（秒）
  chatChance: 0.004, // 每帧闲聊概率
  retargetTime: 3 // 正常游荡重选目标间隔
}

// 特效存活时间（秒）
export const EFFECT_TTL = 0.5

// 疯子外观：正常游荡 / 击打 / 嘶吼（通用回退表情）
export const MADMAN_FACES = {
  walk: '🧍',
  smash: '🤛',
  scream: '😡'
}

// 疯子的四种"疯法"人设：各自的表情、行为参数
// speedMul 速度倍率；screamMul 嘶吼概率倍率；smashes 是否真的砸物体
export const MADMAN_VARIANTS = {
  rage: {
    label: '狂暴',
    faces: { walk: '😤', smash: '🥊', scream: '🤬' },
    speedMul: 1.4,
    screamMul: 2,
    smashes: true,
    prefersBig: true // 优先扑向血量高的大件
  },
  gloom: {
    label: '忧郁',
    faces: { walk: '😔', smash: '😪', scream: '😭' },
    speedMul: 0.45,
    screamMul: 0.4,
    smashes: true,
    infects: true // 靠近的 NPC 被感染降理智
  },
  show: {
    label: '表演',
    faces: { walk: '🤡', smash: '💃', scream: '🎭' },
    speedMul: 1.15,
    screamMul: 1,
    smashes: false, // 只追着 NPC 绕圈，不真砸
    circles: true
  },
  genius: {
    label: '高智商',
    faces: { walk: '🧐', smash: '🤓', scream: '😈' },
    speedMul: 1.1,
    screamMul: 1,
    smashes: true,
    prefersSpecial: true // 优先寻找特殊道具制造连环案件
  }
}

// 随机抽取疯子人设时的候选
export const MADMAN_VARIANT_KEYS = Object.keys(MADMAN_VARIANTS)

// 疯子叹气（忧郁型）台词
export const SIGH_LINES = ['唉…', '活着好累…', '没意思…', '一切都会碎的…', '呜…']

// NPC 外观池（冷静时随机选一个）
export const NPC_FACES = ['🧑', '👩', '🧓', '👨', '👵', '🧔']

// NPC 惊慌时的表情
export const NPC_PANIC_FACE = '😱'

// NPC 的四种类型
// normal 普通逃跑；brave 勇者反击；spectator 吃瓜围观；enraged 暴躁易怒
export const NPC_VARIANTS = {
  normal: { label: '路人', weight: 5 },
  brave: { label: '勇者', weight: 2, fightBackRange: 60, stunTime: 2.4 },
  spectator: { label: '吃瓜', weight: 2, watchRadius: 90 }, // 疯子在此半径外则围观不逃
  enraged: { label: '暴躁', weight: 1, rageThreshold: 3 } // 受惊累计到阈值转化为疯子
}

// 吃瓜群众台词
export const WATCH_LINES = ['卧槽拍下来了!', '这也太刑了', '家人们谁懂啊', '前排围观', '让我看看', '好家伙!', '👏 精彩!']

// 暴躁 NPC 被惹毛的台词
export const RAGE_LINES = ['忍你很久了!', '你惹到我了!', '老子跟你拼了!', '够了!!!']

// 转化播报模板
export const TRANSFORM_LINES = {
  toMadman: '也疯了!',
  toNpc: '…我这是在哪?'
}

// 猫的外观与叫声台词
export const CAT_FACES = { walk: '🐈', run: '🐈‍⬛' }
export const CAT_LINES = ['喵~', '喵喵!', '呼噜噜', '嘶——', '喵呜!']

// 保安外观与台词
export const GUARD_FACE = '👮'
export const GUARD_PIN_FACE = '💪'
export const GUARD_LINES = ['别动!', '按住他!', '冷静点!', '老实点!', '保安到!']

// 理智系统参数
export const SANITY = {
  max: 100,
  npcDrainNear: 22, // NPC 处于疯子威胁半径内每秒掉的理智
  npcDrainInfect: 40, // 被忧郁型感染时每秒额外掉的理智
  npcRegen: 6, // NPC 安全时每秒回复
  madmanRegen: 9, // 疯子远离人群安静时每秒回复
  madmanDrainCrowd: 4 // 疯子附近有人时理智回复受阻（此处作为回复的抵扣）
}

// 普通可击打物体：emoji + 血量（击打次数）+ 破碎后外观
export const OBJECT_TYPES = [
  { emoji: '🪑', hp: 3, broken: '🪵' },
  { emoji: '📺', hp: 4, broken: '📉' },
  { emoji: '🪴', hp: 2, broken: '🥀' },
  { emoji: '🗑️', hp: 2, broken: '💢' },
  { emoji: '📦', hp: 3, broken: '🗑️' },
  { emoji: '🖼️', hp: 2, broken: '🩹' },
  { emoji: '🚪', hp: 5, broken: '🕳️' },
  { emoji: '🏺', hp: 2, broken: '🧱' },
  { emoji: '🖥️', hp: 4, broken: '📉' },
  { emoji: '🛋️', hp: 5, broken: '🪵' },
  { emoji: '🚽', hp: 3, broken: '💩' },
  { emoji: '🪟', hp: 2, broken: '🕳️' },
  { emoji: '🕰️', hp: 3, broken: '⚙️' },
  { emoji: '🍾', hp: 1, broken: '🧴' },
  { emoji: '🎸', hp: 2, broken: '🪵' },
  { emoji: '🥁', hp: 3, broken: '🕳️' }
]

// 特殊道具：被击打时触发独特效果（special 标记效果类型）
// 击中即触发一次效果，然后进入破碎状态
export const SPECIAL_OBJECTS = [
  { emoji: '💣', hp: 1, broken: '🕳️', special: 'bomb', label: '炸弹' }, // 爆炸：波及周围物体与 NPC
  { emoji: '🔔', hp: 2, broken: '🔕', special: 'alarm', label: '警铃' }, // 全场 NPC 惊慌
  { emoji: '🎈', hp: 1, broken: '💨', special: 'balloon', label: '气球' }, // 一击即爆
  { emoji: '📻', hp: 3, broken: '📻', special: 'radio', label: '收音机' } // 击打播放音符
]

// 爆炸波及半径
export const EXPLOSION_RADIUS = 150

// 混乱等级上限（扩展到 7 级）
export const MAX_CHAOS = 7

// 各混乱等级的效果说明与开关
// npcSmash: NPC 也会砸东西；quake: 地震常驻抖动强度；doomsday: 末日模式
export const CHAOS_LEVELS = {
  1: { name: '平静', npcSmash: false, quake: 0, doomsday: false },
  2: { name: '躁动', npcSmash: false, quake: 0, doomsday: false },
  3: { name: '混乱', npcSmash: false, quake: 0, doomsday: false },
  4: { name: '狂暴', npcSmash: false, quake: 0, doomsday: false },
  5: { name: '全员发疯', npcSmash: true, quake: 0, doomsday: false },
  6: { name: '地震模式', npcSmash: true, quake: 3, doomsday: false },
  7: { name: '末日', npcSmash: true, quake: 5, doomsday: true }
}

// 全局氛围（背景色）分档：由惊慌比例 + 疯子数 + 混乱等级综合得出
export const MOOD_LEVELS = [
  { key: 'calm', emoji: '🟢', bg: '#1b3a2b' },
  { key: 'uneasy', emoji: '🟡', bg: '#4a4520' },
  { key: 'chaotic', emoji: '🟠', bg: '#5a3212' },
  { key: 'insane', emoji: '🔴', bg: '#4d1414' }
]

// 成就定义：id / emoji / 名称 / 描述（解锁条件在 world.js 中判定）
export const ACHIEVEMENTS = [
  { id: 'demolition', emoji: '🏆', name: '拆迁办主任', desc: '累计砸毁 100 个物体' },
  { id: 'standup', emoji: '🙌', name: '全体起立', desc: '所有路人同时惊慌' },
  { id: 'chain', emoji: '💣', name: '连锁反应大师', desc: '一次爆炸波及 5+ 个物体' },
  { id: 'catdog', emoji: '🐾', name: '鸡飞狗跳', desc: '猫与疯子同时在场' },
  { id: 'bell', emoji: '🔔', name: '午夜凶铃', desc: '警铃累计响 10 次' },
  { id: 'infection', emoji: '🧠', name: '精神污染', desc: '累计有 5 名路人被逼疯' },
  { id: 'hero', emoji: '🦸', name: '路见不平', desc: '勇者成功击晕疯子' },
  { id: 'peace', emoji: '🕊️', name: '重归于好', desc: '疯子理智回满变回路人' }
]

// 角色图鉴：分组展示各类角色与机制说明
export const CHARACTER_GUIDE = [
  {
    group: '疯子的四种人设',
    items: [
      { emoji: '😤', name: '狂暴', desc: '移速快、专挑大件下手、嘶吼频繁' },
      { emoji: '😔', name: '忧郁', desc: '懒散原地叹气，靠近的人会被感染、掉理智' },
      { emoji: '🤡', name: '表演', desc: '追着路人绕圈演戏，但不真砸东西' },
      { emoji: '🧐', name: '高智商', desc: '专找炸弹💣/警铃🔔，制造连环案件' }
    ]
  },
  {
    group: '路人的类型',
    items: [
      { emoji: '🧑', name: '路人', desc: '平时闲逛聊天，疯子靠近就惊慌逃跑' },
      { emoji: '🦸', name: '勇者', desc: '被逼到近身时反击，能把疯子击晕几秒' },
      { emoji: '📸', name: '吃瓜', desc: '疯子不太近时不逃，掏手机📱围观鼓掌' },
      { emoji: '😡', name: '暴躁', desc: '受惊次数累计到阈值会暴走，变成疯子' }
    ]
  },
  {
    group: '其它角色',
    items: [
      { emoji: '🐈', name: '猫', desc: '四处乱窜，被角色靠近就加速逃开' },
      { emoji: '👮', name: '保安', desc: '从门口进场，冲向疯子并按住数秒后被挣脱' }
    ]
  },
  {
    group: '核心机制',
    items: [
      { emoji: '🧠', name: '理智值', desc: '路人理智归零→被逼疯；疯子理智回满→变回路人' },
      { emoji: '🔥', name: '混乱等级', desc: 'Lv5 全员发疯、Lv6 地震、Lv7 末日' },
      { emoji: '🖐️', name: '上帝之手', desc: '点角色弹菜单、拖物体摆放、选类型点空地生成' }
    ]
  }
]

// 初始摆放的物体数量
export const INITIAL_OBJECTS = 20

// 初始 NPC 数量
export const INITIAL_NPCS = 6

// 击打时随机弹出的命中特效
export const HIT_EFFECTS = ['💥', '⭐', '✨', '💢', '❕']

// 破碎时飞溅的碎片 emoji（配合物理抛射）
export const DEBRIS_EMOJIS = ['🔩', '🪵', '🧱', '🥚', '❔', '🔧', '⚙️', '📄', '🍂']

// 物体破碎后留在地板上的残迹（永久，直到重置）
export const RUBBLE_MARKS = ['🕳️', '💥', '🩹', '🧩', '♨️']

// 地板上保留的最大残迹数量（超过则丢弃最旧的）
export const MAX_MARKS = 60

// 装饰物：纯背景，不可交互（layer: wall 贴墙 / floor 落地）
// x/y 用相对坐标（0~1），组件按房间尺寸换算成 px
export const DECOR = [
  { emoji: '🪟', fx: 0.12, fy: 0.09, size: 60, layer: 'wall' },
  { emoji: '🖼️', fx: 0.32, fy: 0.08, size: 44, layer: 'wall' },
  { emoji: '🕰️', fx: 0.5, fy: 0.07, size: 40, layer: 'wall' },
  { emoji: '🖼️', fx: 0.66, fy: 0.09, size: 40, layer: 'wall' },
  { emoji: '🪟', fx: 0.86, fy: 0.09, size: 60, layer: 'wall' },
  { emoji: '💡', fx: 0.22, fy: 0.03, size: 26, layer: 'wall' },
  { emoji: '💡', fx: 0.78, fy: 0.03, size: 26, layer: 'wall' },
  { emoji: '🪴', fx: 0.04, fy: 0.9, size: 52, layer: 'floor' },
  { emoji: '🪴', fx: 0.96, fy: 0.9, size: 52, layer: 'floor' },
  { emoji: '📚', fx: 0.06, fy: 0.32, size: 50, layer: 'floor' },
  { emoji: '🧯', fx: 0.94, fy: 0.3, size: 40, layer: 'floor' },
  { emoji: '🚰', fx: 0.5, fy: 0.95, size: 44, layer: 'floor' }
]

// 疯子嘶吼台词
export const SCREAM_LINES = [
  '啊啊啊啊!!!',
  '砸烂它!',
  '哈哈哈哈!',
  '都给我闪开!',
  '嗷呜——!',
  '统统砸个稀巴烂!',
  '这世界疯了!',
  '谁也别想拦我!',
  '我要拆了这里!',
  '嘿嘿嘿…好玩!',
  '碎吧!碎吧!',
  '来啊!都过来啊!',
  '啊哈哈停不下来!',
  '看我一拳!',
  '气死我了!!!',
  '乱七八糟才最爽!',
  '哇呀呀呀!',
  '通通给我倒下!'
]

// NPC 平时闲聊台词
export const CHAT_LINES = [
  '今天天气不错~',
  '午饭吃点啥好呢',
  '这地方好闷啊',
  '哼着小曲儿…',
  '有点无聊',
  '咦，那是谁？',
  '摸鱼真快乐',
  '好想下班回家',
  '奶茶要不要加珍珠呢',
  '昨晚那剧太上头了',
  '腿有点酸，走两步',
  '嗯…时间过得真慢',
  '待会儿去趟洗手间',
  '这灯有点晃眼',
  '周末去哪儿玩好',
  '肚子有点饿了',
  '发会儿呆…',
  '感觉哪里怪怪的',
  '同事今天没来上班',
  '要不要买杯咖啡'
]

// NPC 惊慌台词
export const PANIC_LINES = [
  '他疯了!救命!',
  '快跑啊!!!',
  '别过来!',
  '啊——有疯子!',
  '谁来管管他!',
  '让开让开!',
  '妈呀吓死我了!',
  '报警!快报警!',
  '这人有病吧!',
  '躲哪儿去啊?!',
  '不要打我!',
  '保安在哪?!',
  '我什么都没做啊!',
  '救救孩子吧!',
  '门在哪门在哪!',
  '完蛋了完蛋了!',
  '别追我啦!',
  '啊啊啊他冲过来了!'
]
