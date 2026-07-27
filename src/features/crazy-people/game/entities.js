// 实体工厂：创建疯子、NPC、猫、保安、可击打物体

import {
  ROOM,
  MADMAN,
  NPC,
  OBJECT_TYPES,
  NPC_FACES,
  MADMAN_VARIANTS,
  MADMAN_VARIANT_KEYS,
  NPC_VARIANTS,
  SANITY
} from './constants.js'

let idSeed = 1
const nextId = () => idSeed++

// 在房间可活动区域内取随机坐标（顶部避开墙面band）
export function randomPoint() {
  const minX = ROOM.padding
  const maxX = ROOM.width - ROOM.padding
  const minY = ROOM.wallHeight + 10
  const maxY = ROOM.height - ROOM.padding
  return {
    x: minX + Math.random() * (maxX - minX),
    y: minY + Math.random() * (maxY - minY)
  }
}

// 按 weight 权重随机抽取 NPC 类型
function pickNpcVariant() {
  const entries = Object.entries(NPC_VARIANTS)
  const total = entries.reduce((s, [, v]) => s + (v.weight || 1), 0)
  let r = Math.random() * total
  for (const [key, v] of entries) {
    r -= v.weight || 1
    if (r <= 0) return key
  }
  return 'normal'
}

// 创建一个疯子。variant 为空时随机抽一种疯法
export function createMadman(pos = randomPoint(), variant = null) {
  const key = variant && MADMAN_VARIANTS[variant] ? variant : MADMAN_VARIANT_KEYS[Math.floor(Math.random() * MADMAN_VARIANT_KEYS.length)]
  return {
    id: nextId(),
    kind: 'madman',
    variant: key,
    x: pos.x,
    y: pos.y,
    size: MADMAN.size,
    target: randomPoint(),
    speed: MADMAN.baseSpeed,
    state: 'walk', // walk | smash | scream | stunned
    stateTimer: 0, // 当前动作剩余时间
    smashCd: 0, // 击打冷却计时
    retargetTimer: MADMAN.retargetTime,
    stunTimer: 0, // 被勇者/保安控制时的定身计时
    pinned: false, // 是否被保安按住
    sanity: 0, // 疯子理智从 0 起，安静时缓慢回升
    speedBoost: 0, // 上帝之手加速的剩余时间
    bubble: '', // 气泡文字
    bubbleTimer: 0
  }
}

// 创建一个 NPC。variant 为空时按权重随机
export function createNpc(pos = randomPoint(), variant = null) {
  const face = NPC_FACES[Math.floor(Math.random() * NPC_FACES.length)]
  const key = variant && NPC_VARIANTS[variant] ? variant : pickNpcVariant()
  return {
    id: nextId(),
    kind: 'npc',
    variant: key,
    x: pos.x,
    y: pos.y,
    size: NPC.size,
    face,
    target: randomPoint(),
    speed: NPC.baseSpeed,
    state: 'calm', // calm | panic | watch
    panicRelief: 0, // 脱离危险后的冷静倒计时
    retargetTimer: NPC.retargetTime,
    sanity: SANITY.max, // 理智满值，归零则发疯
    scares: 0, // 暴躁型累计受惊次数
    speedBoost: 0,
    bubble: '',
    bubbleTimer: 0
  }
}

// 创建一只猫（从随机点出现，四处乱窜）
export function createCat(pos = randomPoint()) {
  return {
    id: nextId(),
    kind: 'cat',
    x: pos.x,
    y: pos.y,
    size: 34,
    target: randomPoint(),
    speed: 140,
    state: 'walk', // walk | run
    retargetTimer: 1.2,
    bubble: '',
    bubbleTimer: 0
  }
}

// 创建一个保安（从门口——房间边缘——进入，追向疯子）
export function createGuard() {
  const y = ROOM.height - ROOM.padding
  const x = Math.random() < 0.5 ? ROOM.padding : ROOM.width - ROOM.padding
  return {
    id: nextId(),
    kind: 'guard',
    x,
    y,
    size: 44,
    target: randomPoint(),
    speed: 130,
    state: 'chase', // chase | pin
    pinTimer: 0, // 按住疯子的剩余时间
    targetId: null, // 正在按住的疯子 id
    bubble: '',
    bubbleTimer: 0
  }
}

// 创建一个可击打物体
export function createObject(type = OBJECT_TYPES[Math.floor(Math.random() * OBJECT_TYPES.length)], pos = randomPoint()) {
  return {
    id: nextId(),
    kind: 'object',
    x: pos.x,
    y: pos.y,
    size: 44,
    emoji: type.emoji,
    brokenEmoji: type.broken,
    hp: type.hp,
    maxHp: type.hp,
    special: type.special || null, // 特殊道具效果类型
    label: type.label || null, // 特殊道具中文名（用于标签）
    broken: false,
    shakeTimer: 0 // 被击打后的抖动计时
  }
}
