// 世界状态与逐帧更新逻辑

import { reactive } from 'vue'
import {
  ROOM,
  MADMAN,
  NPC,
  EFFECT_TTL,
  SCREAM_LINES,
  CHAT_LINES,
  PANIC_LINES,
  SPECIAL_OBJECTS,
  EXPLOSION_RADIUS,
  INITIAL_OBJECTS,
  INITIAL_NPCS,
  HIT_EFFECTS,
  DEBRIS_EMOJIS,
  RUBBLE_MARKS,
  MAX_MARKS,
  MADMAN_VARIANTS,
  NPC_VARIANTS,
  SANITY,
  MAX_CHAOS,
  CHAOS_LEVELS,
  MOOD_LEVELS,
  ACHIEVEMENTS,
  SIGH_LINES,
  WATCH_LINES,
  RAGE_LINES,
  TRANSFORM_LINES,
  CAT_LINES,
  GUARD_LINES
} from './constants.js'
import { createMadman, createNpc, createCat, createGuard, createObject, randomPoint } from './entities.js'
import { play } from './sound.js'

// 全局唯一的世界状态
export const world = reactive({
  actors: [], // 疯子 + NPC + 猫 + 保安
  objects: [], // 可击打物体
  effects: [], // 短生命周期特效（💥 等）
  debris: [], // 破碎飞溅的碎片（带物理）
  marks: [], // 地板上的永久残迹
  news: [], // 事件播报（最新在前）
  achievements: [], // 已解锁成就 id
  pendingToast: null, // 待弹出的成就（UI 消费后清空）
  chaosLevel: 1, // 混乱等级，影响疯子速度与击打频率
  mood: 0, // 全局氛围档位（0~3），驱动背景色
  shakeTime: 0, // 抑屏剩余时间
  shakeMag: 0, // 抑屏强度
  shakeX: 0, // 当前抑屏偏移
  shakeY: 0,
  stats: {
    smashed: 0, // 累计砸坏的物体数
    alarms: 0, // 警铃触发次数
    maddened: 0 // 被逼疯的路人累计数
  }
})

let effectSeed = 1
const GRAVITY = 900 // 碎片重力（px/s^2）

// 场上没有疯子的累计时长；超过阈值自动补一个，避免冷场
let noMadmanTimer = 0
const AUTO_MADMAN_DELAY = 10 // 秒

// 取数组随机元素
function pick(list) {
  return list[Math.floor(Math.random() * list.length)]
}

// 距离平方（避免开方）
function dist2(ax, ay, bx, by) {
  const dx = ax - bx
  const dy = ay - by
  return dx * dx + dy * dy
}

// 把坐标限制在房间活动区域内（顶部避开墙面）
function clampToRoom(entity) {
  const min = ROOM.padding
  const minY = ROOM.wallHeight + 10
  entity.x = Math.max(min, Math.min(ROOM.width - ROOM.padding, entity.x))
  entity.y = Math.max(minY, Math.min(ROOM.height - ROOM.padding, entity.y))
}

// 让实体朝目标点移动，返回是否已抵达
function moveToward(entity, target, speed, dt) {
  const dx = target.x - entity.x
  const dy = target.y - entity.y
  const d = Math.hypot(dx, dy)
  if (d < 4) return true
  const step = speed * dt
  if (step >= d) {
    entity.x = target.x
    entity.y = target.y
    return true
  }
  entity.x += (dx / d) * step
  entity.y += (dy / d) * step
  return false
}

// 设置气泡文字并给定存活时间
function say(entity, text, duration = 1.6) {
  entity.bubble = text
  entity.bubbleTimer = duration
}

// —— 事件播报 ——
function pushNews(text) {
  const now = new Date()
  const t = now.toTimeString().slice(0, 8)
  // 最新的追加到末尾（弹幕逻辑：新消息在下方），超量则丢弃最旧的
  world.news.push({ id: `nw-${effectSeed++}`, time: t, text })
  if (world.news.length > 40) world.news.shift()
}

// —— 成就 ——
function unlockAchievement(id) {
  if (world.achievements.includes(id)) return
  const def = ACHIEVEMENTS.find((a) => a.id === id)
  if (!def) return
  world.achievements.push(id)
  world.pendingToast = def // 供 UI 弹窗读取
  pushNews(`${def.emoji} 成就解锁：${def.name}`)
  play('pop')
}

// 状态型成就的逐帧检查（事件型成就在触发处直接解锁）
function checkAchievements() {
  if (world.stats.smashed >= 100) unlockAchievement('demolition')
  if (world.stats.alarms >= 10) unlockAchievement('bell')
  if (world.stats.maddened >= 5) unlockAchievement('infection')

  const npcs = world.actors.filter((a) => a.kind === 'npc')
  if (npcs.length >= 3 && npcs.every((n) => n.state === 'panic')) unlockAchievement('standup')

  const hasCat = world.actors.some((a) => a.kind === 'cat')
  const hasMadman = world.actors.some((a) => a.kind === 'madman')
  if (hasCat && hasMadman) unlockAchievement('catdog')
}

// 生成一个特效（如击打的 💥）
function spawnEffect(x, y, emoji) {
  world.effects.push({ id: `fx-${effectSeed++}`, x, y, emoji, ttl: EFFECT_TTL })
}

// 生成一批飞溅碎片（带初速度、重力与旋转）
function spawnDebris(x, y, count, power = 260) {
  for (let i = 0; i < count; i++) {
    const angle = Math.random() * Math.PI * 2
    const speed = power * (0.4 + Math.random() * 0.8)
    world.debris.push({
      id: `db-${effectSeed++}`,
      x,
      y,
      vx: Math.cos(angle) * speed,
      vy: Math.sin(angle) * speed - power * 0.5, // 略微向上抛
      rot: Math.random() * 360,
      vr: (Math.random() - 0.5) * 720,
      emoji: DEBRIS_EMOJIS[Math.floor(Math.random() * DEBRIS_EMOJIS.length)],
      ttl: 0.9 + Math.random() * 0.5,
      life: 1
    })
  }
}

// 在地板上留下一处永久残迹（超出上限则丢弃最旧的）
function addMark(x, y) {
  world.marks.push({
    id: `mk-${effectSeed++}`,
    x,
    y,
    emoji: RUBBLE_MARKS[Math.floor(Math.random() * RUBBLE_MARKS.length)],
    rot: (Math.random() - 0.5) * 40
  })
  if (world.marks.length > MAX_MARKS) world.marks.shift()
}

// 触发抑屏（取较大值，避免小抖动覆盖大爆炸）
function triggerShake(mag, time) {
  world.shakeMag = Math.max(world.shakeMag, mag)
  world.shakeTime = Math.max(world.shakeTime, time)
}

// 初始化世界：默认摆放物体、几个 NPC、一个疯子
export function resetWorld() {
  world.actors = []
  world.objects = []
  world.effects = []
  world.debris = []
  world.marks = []
  world.news = []
  world.achievements = []
  world.pendingToast = null
  world.chaosLevel = 1
  world.mood = 0
  world.shakeTime = 0
  world.shakeMag = 0
  world.shakeX = 0
  world.shakeY = 0
  world.stats.smashed = 0
  world.stats.alarms = 0
  world.stats.maddened = 0
  noMadmanTimer = 0

  // 先放入全部特殊道具（炸弹/警铃/气球/收音机各一个）
  for (const type of SPECIAL_OBJECTS) {
    world.objects.push(createObject(type))
  }
  // 再随机摆放一批普通物体，凑够初始数量
  const normalCount = Math.max(0, INITIAL_OBJECTS - SPECIAL_OBJECTS.length)
  for (let i = 0; i < normalCount; i++) {
    world.objects.push(createObject())
  }
  // 初始 NPC
  for (let i = 0; i < INITIAL_NPCS; i++) {
    world.actors.push(createNpc())
  }
  // 1 个疯子
  world.actors.push(createMadman())
  pushNews('🚪 房间开门，混乱开始…')
}

// 从物体列表里挑一个目标：genius 偏好特殊道具，rage 偏好大件，其余取最近
function findTargetObject(m, cfg) {
  let best = null
  let bestScore = Infinity
  for (const o of world.objects) {
    if (o.broken) continue
    const d2 = dist2(m.x, m.y, o.x, o.y)
    let score = d2
    if (cfg.prefersSpecial && o.special) score -= 400 * 400 // 大幅优先特殊道具
    if (cfg.prefersBig) score -= o.maxHp * 8000 // 偏好高血量大件
    if (score < bestScore) {
      bestScore = score
      best = o
    }
  }
  return best
}

// 找最近的 NPC（表演型追人用）
function findNearestNpc(m) {
  let best = null
  let bestD2 = Infinity
  for (const a of world.actors) {
    if (a.kind !== 'npc') continue
    const d2 = dist2(m.x, m.y, a.x, a.y)
    if (d2 < bestD2) {
      bestD2 = d2
      best = a
    }
  }
  return best
}

// 更新单个疯子
function updateMadman(m, dt) {
  const cfg = MADMAN_VARIANTS[m.variant] || MADMAN_VARIANTS.rage

  // 被按住 / 击晕：定身，不行动
  if (m.pinned || m.stunTimer > 0) {
    m.stunTimer = Math.max(0, m.stunTimer - dt)
    if (!m.pinned) m.state = m.stunTimer > 0 ? 'stunned' : 'walk'
    // 被控制时理智快速回升，可能恢复正常
    m.sanity = Math.min(SANITY.max, m.sanity + SANITY.madmanRegen * 2 * dt)
    tryRecover(m)
    return
  }

  if (m.speedBoost > 0) m.speedBoost -= dt
  const boost = m.speedBoost > 0 ? 1.8 : 1
  m.speed = MADMAN.baseSpeed * (1 + (world.chaosLevel - 1) * 0.35) * cfg.speedMul * boost
  m.smashCd = Math.max(0, m.smashCd - dt)
  m.retargetTimer -= dt

  // 处理击打/嘶吼这类短动作的计时
  if (m.stateTimer > 0) {
    m.stateTimer -= dt
    if (m.stateTimer <= 0) m.state = 'walk'
  }

  // 忧郁型：偶尔叹气并感染附近 NPC 降理智
  if (m.variant === 'gloom') {
    if (m.bubbleTimer <= 0 && Math.random() < 0.006) say(m, pick(SIGH_LINES), 1.6)
    for (const a of world.actors) {
      if (a.kind === 'npc' && dist2(m.x, m.y, a.x, a.y) <= NPC.fearRadius * NPC.fearRadius) {
        a.sanity = Math.max(0, a.sanity - SANITY.npcDrainInfect * dt)
      }
    }
  }

  // 表演型：只追着最近 NPC 绕圈，不砸物体
  if (cfg.circles) {
    const prey = findNearestNpc(m)
    const goal = prey || m.target
    const arrived = moveToward(m, goal, m.speed, dt)
    if (arrived || m.retargetTimer <= 0) {
      // 围绕猎物选一个偏移点，制造转圈效果
      if (prey) {
        const ang = Math.random() * Math.PI * 2
        m.target = { x: prey.x + Math.cos(ang) * 70, y: prey.y + Math.sin(ang) * 70 }
      } else {
        m.target = randomPoint()
      }
      m.retargetTimer = 0.8
    }
    maybeScream(m, cfg)
    madmanRegen(m, dt)
    clampToRoom(m)
    return
  }

  const nearest = findTargetObject(m, cfg)
  const nearestD2 = nearest ? dist2(m.x, m.y, nearest.x, nearest.y) : Infinity
  const inSmashRange = nearest && nearestD2 <= MADMAN.smashRange * MADMAN.smashRange

  if (cfg.smashes && inSmashRange && m.smashCd <= 0) {
    hitObject(nearest, m)
    m.smashCd = MADMAN.smashCooldown / world.chaosLevel
    m.state = 'smash'
    m.stateTimer = 0.25
  } else if (m.state === 'walk' || m.state === 'stunned') {
    m.state = 'walk'
    // 忧郁型走得懒散，偶尔驻足
    if (m.variant === 'gloom' && Math.random() < 0.4) {
      // 有一定几率原地发呆
    } else {
      const goal = nearest ? nearest : m.target
      const arrived = moveToward(m, goal, m.speed, dt)
      if (arrived || m.retargetTimer <= 0) {
        m.target = randomPoint()
        m.retargetTimer = MADMAN.retargetTime
      }
    }
  }

  maybeScream(m, cfg)
  madmanRegen(m, dt)
  clampToRoom(m)
}

// 疯子随机嘶吼
function maybeScream(m, cfg) {
  if (m.state !== 'smash' && Math.random() < MADMAN.screamChance * world.chaosLevel * cfg.screamMul) {
    m.state = 'scream'
    m.stateTimer = 0.6
    say(m, pick(SCREAM_LINES), 1.2)
    play('scream')
  }
}

// 疯子理智回升：附近没人时才明显回复，回满则恢复正常
function madmanRegen(m, dt) {
  let crowded = false
  for (const a of world.actors) {
    if ((a.kind === 'npc' || a.kind === 'madman') && a !== m) {
      if (dist2(m.x, m.y, a.x, a.y) <= NPC.fearRadius * NPC.fearRadius) {
        crowded = true
        break
      }
    }
  }
  const gain = crowded ? SANITY.madmanRegen - SANITY.madmanDrainCrowd : SANITY.madmanRegen
  m.sanity = Math.min(SANITY.max, Math.max(0, m.sanity + gain * dt))
  tryRecover(m)
}

// 疯子理智回满 → 变回路人
function tryRecover(m) {
  if (m.sanity >= SANITY.max) {
    const idx = world.actors.indexOf(m)
    if (idx === -1) return
    const npc = createNpc({ x: m.x, y: m.y }, 'normal')
    npc.sanity = SANITY.max
    say(npc, TRANSFORM_LINES.toNpc, 2)
    world.actors.splice(idx, 1, npc)
    spawnEffect(m.x, m.y - 20, '🕊️')
    spawnEffect(m.x, m.y - 40, '✨')
    pushNews(`🕊️ 一个疯子冷静了下来，变回路人`)
    unlockAchievement('peace')
  }
}

// 疯子击打物体
function hitObject(o, m) {
  o.hp -= 1
  o.shakeTimer = 0.35
  spawnEffect(o.x, o.y - 10, HIT_EFFECTS[Math.floor(Math.random() * HIT_EFFECTS.length)])
  spawnDebris(o.x, o.y, 3, 180) // 击打溅起少量碎屑
  triggerShake(3, 0.12)
  play('hit')

  // 收音机被敲：每次都冒音符并发声，但不立即破碎
  if (o.special === 'radio' && !o.broken) {
    spawnEffect(o.x, o.y - 18, '🎵')
    play('pop')
  }

  if (o.hp <= 0 && !o.broken) {
    breakObject(o)
  }
  // 击打瞬间小概率喊一句
  if (m && Math.random() < 0.4) say(m, pick(SCREAM_LINES), 1)
}

// 物体进入破碎状态，并处理特殊道具效果
function breakObject(o) {
  o.broken = true
  world.stats.smashed += 1
  spawnEffect(o.x, o.y - 16, '💫')
  spawnEffect(o.x, o.y - 4, '💨')
  spawnDebris(o.x, o.y, 8, 300) // 破碎时大量碎片飞溅
  addMark(o.x, o.y) // 地板留下残迹
  triggerShake(6, 0.2)

  switch (o.special) {
    case 'bomb':
      explode(o)
      break
    case 'alarm':
      triggerAlarm()
      break
    case 'balloon':
      spawnEffect(o.x, o.y - 16, '💨')
      play('pop')
      break
    default:
      play('break')
      pushNews(`💥 ${o.emoji} 被砸碎了`)
  }
}

// 炸弹爆炸：波及周围物体（直接摧毁）与 NPC（触发惊慌）
function explode(bomb) {
  spawnEffect(bomb.x, bomb.y - 10, '🔥')
  spawnEffect(bomb.x, bomb.y - 30, '💥')
  spawnEffect(bomb.x, bomb.y - 50, '🌫️')
  spawnDebris(bomb.x, bomb.y, 16, 480) // 爆炸大量碎片
  addMark(bomb.x, bomb.y)
  triggerShake(18, 0.45) // 强烈抑屏
  play('explosion')
  const r2 = EXPLOSION_RADIUS * EXPLOSION_RADIUS
  let affected = 0
  for (const o of world.objects) {
    if (o.broken || o === bomb) continue
    if (dist2(bomb.x, bomb.y, o.x, o.y) <= r2) {
      o.shakeTimer = 0.35
      spawnEffect(o.x, o.y - 10, '💥')
      spawnDebris(o.x, o.y, 6, 340)
      affected += 1
      // 非炸弹物体直接摧毁，炸弹连锁交给后续帧的独立击打太复杂，这里直接破坏
      if (o.special === 'bomb') {
        // 连锁爆炸
        o.broken = true
        world.stats.smashed += 1
        explode(o)
      } else {
        o.hp = 0
        o.broken = true
        world.stats.smashed += 1
        addMark(o.x, o.y)
      }
    }
  }
  for (const a of world.actors) {
    if (a.kind === 'npc' && dist2(bomb.x, bomb.y, a.x, a.y) <= r2) {
      scareNpc(a)
    }
  }
  pushNews(`💣 炸弹爆炸，波及 ${affected} 个物体!`)
  if (affected >= 5) unlockAchievement('chain')
}

// 警铃：让全场 NPC 立刻惊慌
function triggerAlarm() {
  play('alarm')
  world.stats.alarms += 1
  pushNews('🔔 警铃大作，全场惊慌!')
  for (const a of world.actors) {
    if (a.kind === 'npc') scareNpc(a, '警报!快跑!')
  }
}

// 把某个 NPC 立刻切到惊慌状态
function scareNpc(n, line) {
  if (n.state !== 'panic') {
    say(n, line || pick(PANIC_LINES), 1.4)
    n.scares += 1
  }
  n.state = 'panic'
  n.panicRelief = NPC.calmDelay
}

// NPC 理智归零 → 变成疯子
function maddenNpc(n) {
  const idx = world.actors.indexOf(n)
  if (idx === -1) return
  const m = createMadman({ x: n.x, y: n.y }, n.variant === 'enraged' ? 'rage' : null)
  m.sanity = 0
  say(m, n.variant === 'enraged' ? pick(RAGE_LINES) : TRANSFORM_LINES.toMadman, 1.8)
  world.actors.splice(idx, 1, m)
  world.stats.maddened += 1
  spawnEffect(n.x, n.y - 20, '💢')
  spawnEffect(n.x, n.y - 40, '😡')
  triggerShake(6, 0.2)
  play('scream')
  pushNews(`😡 一名路人被逼疯了! (${MADMAN_VARIANTS[m.variant].label})`)
}

// 勇者反击：击晕疯子几秒
function heroFightBack(n, threat) {
  const cfg = NPC_VARIANTS.brave
  threat.stunTimer = Math.max(threat.stunTimer, cfg.stunTime)
  threat.state = 'stunned'
  say(n, '吃我一拳!', 1.2)
  say(threat, '眼冒金星…', 1.2)
  spawnEffect(threat.x, threat.y - 12, '💥')
  spawnEffect(threat.x, threat.y - 30, '⭐')
  triggerShake(8, 0.2)
  play('hit')
  pushNews('🦸 勇者挺身而出，击晕了疯子!')
  unlockAchievement('hero')
}

// 更新单个 NPC
function updateNpc(n, dt) {
  const cfg = NPC_VARIANTS[n.variant] || NPC_VARIANTS.normal
  if (n.speedBoost > 0) n.speedBoost -= dt
  const boost = n.speedBoost > 0 ? 1.8 : 1
  n.retargetTimer -= dt

  // 找最近的疯子
  let threatD2 = Infinity
  let threat = null
  for (const a of world.actors) {
    if (a.kind !== 'madman') continue
    const d2 = dist2(n.x, n.y, a.x, a.y)
    if (d2 < threatD2) {
      threatD2 = d2
      threat = a
    }
  }

  // 吃瓜群众用更小的半径才逃，否则围观
  const fleeRadius = n.variant === 'spectator' ? cfg.watchRadius : NPC.fearRadius
  const inDanger = threat && threatD2 <= fleeRadius * fleeRadius

  // 理智：危险中持续下降，安全时回升
  const doom = CHAOS_LEVELS[world.chaosLevel]?.doomsday
  if (inDanger || doom) {
    const drain = SANITY.npcDrainNear * (doom ? 1.8 : 1)
    n.sanity = Math.max(0, n.sanity - drain * dt)
  } else {
    n.sanity = Math.min(SANITY.max, n.sanity + SANITY.npcRegen * dt)
  }
  if (n.sanity <= 0) {
    maddenNpc(n)
    return
  }

  // 勇者：疯子逼近到反击距离时有几率反击
  if (n.variant === 'brave' && threat && threatD2 <= cfg.fightBackRange * cfg.fightBackRange) {
    if (threat.stunTimer <= 0 && Math.random() < 0.04) {
      heroFightBack(n, threat)
    }
  }

  if (inDanger) {
    if (n.state !== 'panic') {
      say(n, pick(PANIC_LINES), 1.4)
      n.scares += 1
      play('panic')
      // 暴躁型受惊到阈值直接暴走
      if (n.variant === 'enraged' && n.scares >= cfg.rageThreshold) {
        maddenNpc(n)
        return
      }
    }
    n.state = 'panic'
    n.panicRelief = NPC.calmDelay
    const dx = n.x - threat.x
    const dy = n.y - threat.y
    const d = Math.hypot(dx, dy) || 1
    n.x += (dx / d) * NPC.panicSpeed * boost * dt
    n.y += (dy / d) * NPC.panicSpeed * boost * dt
    if (Math.random() < 0.01) say(n, pick(PANIC_LINES), 1.2)
  } else if (threat && n.variant === 'spectator' && threatD2 <= NPC.fearRadius * NPC.fearRadius * 2.2) {
    // 吃瓜：疯子在视野内但不算太近 → 掏手机围观
    n.state = 'watch'
    if (n.bubbleTimer <= 0 && Math.random() < 0.02) say(n, pick(WATCH_LINES), 1.6)
  } else if (n.state === 'panic') {
    n.panicRelief -= dt
    if (n.panicRelief <= 0) {
      n.state = 'calm'
      n.target = randomPoint()
      say(n, '呼…吓死我了', 1.4)
    } else {
      moveToward(n, n.target, NPC.baseSpeed, dt)
    }
  } else {
    // 正常游荡
    if (n.state === 'watch') n.state = 'calm'
    const arrived = moveToward(n, n.target, NPC.baseSpeed, dt)
    if (arrived || n.retargetTimer <= 0) {
      n.target = randomPoint()
      n.retargetTimer = NPC.retargetTime
    }
    // Lv5+ 全员发疯：普通 NPC 也会顺手砸东西
    if (CHAOS_LEVELS[world.chaosLevel]?.npcSmash) npcTrySmash(n)
    // 随机闲聊
    if (n.bubbleTimer <= 0 && Math.random() < NPC.chatChance) {
      say(n, pick(CHAT_LINES), 1.8)
    }
  }

  clampToRoom(n)
}

// Lv5+ 时 NPC 也会砸附近的物体
function npcTrySmash(n) {
  if (Math.random() > 0.02) return
  for (const o of world.objects) {
    if (o.broken) continue
    if (dist2(n.x, n.y, o.x, o.y) <= MADMAN.smashRange * MADMAN.smashRange) {
      hitObject(o, n)
      say(n, '一起砸!', 1)
      return
    }
  }
}

// 更新猫：四处乱窜，被角色靠近就加速逃开
function updateCat(c, dt) {
  c.retargetTimer -= dt
  // 附近有角色则受惊快跑
  let scared = false
  for (const a of world.actors) {
    if (a === c) continue
    if (dist2(c.x, c.y, a.x, a.y) <= 90 * 90) {
      scared = true
      break
    }
  }
  c.state = scared ? 'run' : 'walk'
  const speed = scared ? c.speed * 1.6 : c.speed
  const arrived = moveToward(c, c.target, speed, dt)
  if (arrived || c.retargetTimer <= 0) {
    c.target = randomPoint()
    c.retargetTimer = 0.8 + Math.random() * 1.2
  }
  if (c.bubbleTimer <= 0 && Math.random() < 0.01) {
    say(c, pick(CAT_LINES), 1.2)
    play('pop')
  }
  clampToRoom(c)
}

// 更新保安：冲向最近疯子并按住，按住计时结束后疯子挣脱
function updateGuard(g, dt) {
  // 正在按人
  if (g.state === 'pin') {
    const target = world.actors.find((a) => a.id === g.targetId && a.kind === 'madman')
    if (!target) {
      g.state = 'chase'
      g.targetId = null
      return
    }
    g.x = target.x - 24
    g.y = target.y
    target.pinned = true
    g.pinTimer -= dt
    if (g.bubbleTimer <= 0 && Math.random() < 0.02) say(g, pick(GUARD_LINES), 1.4)
    if (g.pinTimer <= 0) {
      target.pinned = false
      target.stunTimer = 0.4
      g.state = 'chase'
      g.targetId = null
      say(target, '哈哈挣脱啦!', 1.4)
      pushNews('💨 疯子挣脱了保安的控制!')
    }
    return
  }

  // 追最近的疯子
  let nearest = null
  let nearestD2 = Infinity
  for (const a of world.actors) {
    if (a.kind !== 'madman' || a.pinned) continue
    const d2 = dist2(g.x, g.y, a.x, a.y)
    if (d2 < nearestD2) {
      nearestD2 = d2
      nearest = a
    }
  }
  if (nearest) {
    const arrived = moveToward(g, nearest, g.speed, dt)
    if (arrived || nearestD2 <= 46 * 46) {
      g.state = 'pin'
      g.targetId = nearest.id
      g.pinTimer = 3
      nearest.pinned = true
      say(g, '按住他!', 1.4)
      pushNews('👮 保安按住了一个疯子!')
      play('alarm')
    }
  } else {
    // 没有疯子就巡逻
    const arrived = moveToward(g, g.target, g.speed * 0.6, dt)
    if (arrived) g.target = randomPoint()
  }
  clampToRoom(g)
}

// 更新物体（抖动计时）
function updateObject(o, dt) {
  if (o.shakeTimer > 0) o.shakeTimer = Math.max(0, o.shakeTimer - dt)
}

// 计算全局氛围档位（0~3）
function computeMood() {
  const npcs = world.actors.filter((a) => a.kind === 'npc')
  const madmen = world.actors.filter((a) => a.kind === 'madman').length
  const panicRatio = npcs.length ? npcs.filter((n) => n.state === 'panic').length / npcs.length : 0
  const score = panicRatio * 2 + Math.min(madmen, 5) * 0.4 + (world.chaosLevel - 1) * 0.35
  const idx = Math.min(MOOD_LEVELS.length - 1, Math.floor(score))
  world.mood = idx
}

// 更新气泡、特效、碎片与抑屏
function updateTransients(dt) {
  for (const a of world.actors) {
    if (a.bubbleTimer > 0) {
      a.bubbleTimer -= dt
      if (a.bubbleTimer <= 0) a.bubble = ''
    }
  }
  for (let i = world.effects.length - 1; i >= 0; i--) {
    world.effects[i].ttl -= dt
    if (world.effects[i].ttl <= 0) world.effects.splice(i, 1)
  }

  // 碎片：抛物线运动 + 旋转 + 渐隐
  const floorY = ROOM.height - ROOM.padding
  for (let i = world.debris.length - 1; i >= 0; i--) {
    const d = world.debris[i]
    d.vy += GRAVITY * dt
    d.x += d.vx * dt
    d.y += d.vy * dt
    d.rot += d.vr * dt
    // 落地反弹并减速
    if (d.y > floorY) {
      d.y = floorY
      d.vy *= -0.35
      d.vx *= 0.6
    }
    d.ttl -= dt
    d.life = Math.max(0, d.ttl / 1.2)
    if (d.ttl <= 0) world.debris.splice(i, 1)
  }

  // 地震模式：混乱等级带来的常驻抖动
  const quake = CHAOS_LEVELS[world.chaosLevel]?.quake || 0
  if (quake > 0) triggerShake(quake, 0.1)

  // 抑屏：随时间衰减，逐帧生成随机偏移
  if (world.shakeTime > 0) {
    world.shakeTime -= dt
    const factor = Math.max(0, world.shakeTime)
    const mag = world.shakeMag * Math.min(1, factor / 0.2)
    world.shakeX = (Math.random() * 2 - 1) * mag
    world.shakeY = (Math.random() * 2 - 1) * mag
    if (world.shakeTime <= 0) {
      world.shakeTime = 0
      world.shakeMag = 0
      world.shakeX = 0
      world.shakeY = 0
    }
  }
}

// 主循环每帧调用
export function tick(dt) {
  // dt 过大时（切后台回来）做个封顶，避免瞬移
  const d = Math.min(dt, 0.05)
  // 遍历副本，允许更新过程中替换/删除 actors（转化）
  for (const a of [...world.actors]) {
    if (!world.actors.includes(a)) continue
    if (a.kind === 'madman') updateMadman(a, d)
    else if (a.kind === 'npc') updateNpc(a, d)
    else if (a.kind === 'cat') updateCat(a, d)
    else if (a.kind === 'guard') updateGuard(a, d)
  }
  for (const o of world.objects) updateObject(o, d)
  updateTransients(d)
  computeMood()
  checkAchievements()
  autoSpawnMadman(d)
}

// 场上没有疯子超过 10 秒则自动生成一个，保持混乱不断
function autoSpawnMadman(dt) {
  if (countMadmen() > 0) {
    noMadmanTimer = 0
    return
  }
  noMadmanTimer += dt
  if (noMadmanTimer >= AUTO_MADMAN_DELAY) {
    noMadmanTimer = 0
    const m = createMadman()
    world.actors.push(m)
    spawnEffect(m.x, m.y - 20, '💢')
    pushNews(`😈 场上无人捣乱，一个疯子登场了 (${MADMAN_VARIANTS[m.variant].label})`)
    play('scream')
  }
}

// —— 控制面板用到的操作 ——

export function addMadman() {
  const m = createMadman()
  world.actors.push(m)
  pushNews(`😈 又来了一个疯子 (${MADMAN_VARIANTS[m.variant].label})`)
}

export function addNpc() {
  world.actors.push(createNpc())
}

// 添加一个物体：小概率是特殊道具，增添惊喜
export function addObject() {
  if (Math.random() < 0.25) {
    const type = SPECIAL_OBJECTS[Math.floor(Math.random() * SPECIAL_OBJECTS.length)]
    world.objects.push(createObject(type))
  } else {
    world.objects.push(createObject())
  }
}

export function spawnCat() {
  world.actors.push(createCat())
  pushNews('🐈 一只猫窜了进来!')
}

export function spawnGuard() {
  world.actors.push(createGuard())
  pushNews('👮 保安进场了!')
}

export function increaseChaos() {
  world.chaosLevel = Math.min(MAX_CHAOS, world.chaosLevel + 1)
  const lv = CHAOS_LEVELS[world.chaosLevel]
  pushNews(`🔥 混乱升级到 Lv.${world.chaosLevel}「${lv.name}」`)
}

// —— 上帝之手交互 ——

// 在指定位置生成一个实体
export function spawnAt(kind, x, y) {
  const pos = { x, y }
  clampToRoom(pos)
  switch (kind) {
    case 'object':
      if (Math.random() < 0.25) {
        world.objects.push(createObject(SPECIAL_OBJECTS[Math.floor(Math.random() * SPECIAL_OBJECTS.length)], pos))
      } else {
        world.objects.push(createObject(undefined, pos))
      }
      break
    case 'npc':
      world.actors.push(createNpc(pos))
      break
    case 'madman': {
      const m = createMadman(pos)
      world.actors.push(m)
      break
    }
    case 'cat':
      world.actors.push(createCat(pos))
      break
    case 'guard': {
      const g = createGuard()
      g.x = pos.x
      g.y = pos.y
      world.actors.push(g)
      break
    }
  }
}

// 拖拽物体到新位置
export function moveObject(id, x, y) {
  const o = world.objects.find((it) => it.id === id)
  if (!o) return
  o.x = x
  o.y = y
  clampToRoom(o)
}

function findActor(id) {
  return world.actors.find((a) => a.id === id)
}

// 驱赶：让角色朝远离画面中心的方向猛冲一段
export function shooActor(id) {
  const a = findActor(id)
  if (!a) return
  const cx = ROOM.width / 2
  const cy = ROOM.height / 2
  const dx = a.x - cx || (Math.random() - 0.5)
  const dy = a.y - cy || (Math.random() - 0.5)
  const d = Math.hypot(dx, dy) || 1
  a.x += (dx / d) * 120
  a.y += (dy / d) * 120
  a.target = { x: a.x + (dx / d) * 200, y: a.y + (dy / d) * 200 }
  clampToRoom(a)
  clampToRoom(a.target)
  say(a, '哎哟!', 1)
  spawnEffect(a.x, a.y - 20, '💨')
}

// 安抚：疯子回满理智变回路人，NPC 冷静，猫也安静
export function calmActor(id) {
  const a = findActor(id)
  if (!a) return
  if (a.kind === 'madman') {
    a.sanity = SANITY.max
    tryRecover(a)
  } else if (a.kind === 'npc') {
    a.state = 'calm'
    a.sanity = SANITY.max
    a.scares = 0
    say(a, '好多了…', 1.4)
  }
  spawnEffect(a.x, a.y - 20, '💗')
}

// 加速：给角色一段加速 buff
export function speedUpActor(id) {
  const a = findActor(id)
  if (!a) return
  a.speedBoost = 4
  say(a, '冲鸭!', 1)
  spawnEffect(a.x, a.y - 20, '⚡')
}

// 删除角色
export function removeActor(id) {
  const idx = world.actors.findIndex((a) => a.id === id)
  if (idx !== -1) {
    const a = world.actors[idx]
    spawnEffect(a.x, a.y - 16, '💨')
    world.actors.splice(idx, 1)
  }
}

// 取出并清空成就弹窗（供 UI 消费）
export function consumeToast() {
  const t = world.pendingToast
  world.pendingToast = null
  return t
}

// 便捷统计（供 UI 读取）
export function countMadmen() {
  return world.actors.filter((a) => a.kind === 'madman').length
}

export function countPanicNpc() {
  return world.actors.filter((a) => a.kind === 'npc' && a.state === 'panic').length
}
