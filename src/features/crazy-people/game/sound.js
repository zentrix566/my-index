// 声音模块：用 Web Audio API 实时合成音效，无需任何音频素材文件
// 支持全局开关；关闭时所有播放调用直接返回

import { reactive } from 'vue'

// 对外暴露的响应式状态，供 UI 读取开关
export const soundState = reactive({ enabled: false })

let ctx = null
let noiseBuffer = null

// 同名音效的最小间隔（秒），避免大量击打时音频叠成噪音
const lastPlay = {}
const MIN_GAP = 0.05

// 惰性创建 AudioContext（首次需在用户手势中调用，如点击开关）
function ensureCtx() {
  if (!ctx) {
    const Ctor = window.AudioContext || window.webkitAudioContext
    ctx = new Ctor()
    buildNoise()
  }
  if (ctx.state === 'suspended') ctx.resume()
  return ctx
}

// 预生成一段白噪声，用于破碎/爆炸音效
function buildNoise() {
  const len = ctx.sampleRate * 0.5
  noiseBuffer = ctx.createBuffer(1, len, ctx.sampleRate)
  const data = noiseBuffer.getChannelData(0)
  for (let i = 0; i < len; i++) data[i] = Math.random() * 2 - 1
}

// 播放一个振荡器音（可带频率滑动）
function tone({ freq, freqEnd, type = 'sine', dur = 0.15, gain = 0.15, delay = 0 }) {
  const t0 = ctx.currentTime + delay
  const osc = ctx.createOscillator()
  const g = ctx.createGain()
  osc.type = type
  osc.frequency.setValueAtTime(freq, t0)
  if (freqEnd) osc.frequency.exponentialRampToValueAtTime(freqEnd, t0 + dur)
  g.gain.setValueAtTime(gain, t0)
  g.gain.exponentialRampToValueAtTime(0.0001, t0 + dur)
  osc.connect(g).connect(ctx.destination)
  osc.start(t0)
  osc.stop(t0 + dur + 0.02)
}

// 播放一段噪声（带低通，模拟撞击/爆裂）
function noise({ dur = 0.2, gain = 0.2, cutoff = 1200, delay = 0 }) {
  const t0 = ctx.currentTime + delay
  const src = ctx.createBufferSource()
  src.buffer = noiseBuffer
  const filter = ctx.createBiquadFilter()
  filter.type = 'lowpass'
  filter.frequency.setValueAtTime(cutoff, t0)
  const g = ctx.createGain()
  g.gain.setValueAtTime(gain, t0)
  g.gain.exponentialRampToValueAtTime(0.0001, t0 + dur)
  src.connect(filter).connect(g).connect(ctx.destination)
  src.start(t0)
  src.stop(t0 + dur + 0.02)
}

// 各音效的合成配方
const RECIPES = {
  hit() {
    tone({ freq: 160, freqEnd: 80, type: 'square', dur: 0.09, gain: 0.12 })
    noise({ dur: 0.08, gain: 0.1, cutoff: 900 })
  },
  break() {
    noise({ dur: 0.28, gain: 0.22, cutoff: 2600 })
    tone({ freq: 220, freqEnd: 60, type: 'triangle', dur: 0.2, gain: 0.1 })
  },
  scream() {
    tone({ freq: 300, freqEnd: 820, type: 'sawtooth', dur: 0.32, gain: 0.14 })
  },
  panic() {
    tone({ freq: 700, type: 'square', dur: 0.1, gain: 0.12 })
    tone({ freq: 900, type: 'square', dur: 0.1, gain: 0.12, delay: 0.12 })
  },
  explosion() {
    noise({ dur: 0.5, gain: 0.35, cutoff: 800 })
    tone({ freq: 120, freqEnd: 40, type: 'sine', dur: 0.5, gain: 0.25 })
  },
  alarm() {
    tone({ freq: 880, type: 'square', dur: 0.18, gain: 0.14 })
    tone({ freq: 660, type: 'square', dur: 0.18, gain: 0.14, delay: 0.2 })
    tone({ freq: 880, type: 'square', dur: 0.18, gain: 0.14, delay: 0.4 })
  },
  pop() {
    tone({ freq: 900, freqEnd: 1600, type: 'sine', dur: 0.07, gain: 0.16 })
  },
  toggle() {
    tone({ freq: 500, freqEnd: 900, type: 'sine', dur: 0.12, gain: 0.12 })
  }
}

// 播放指定音效；未开启则忽略
export function play(name) {
  if (!soundState.enabled) return
  const recipe = RECIPES[name]
  if (!recipe) return
  const now = ctx ? ctx.currentTime : 0
  if (lastPlay[name] && now - lastPlay[name] < MIN_GAP) return
  ensureCtx()
  lastPlay[name] = ctx.currentTime
  recipe()
}

// 切换开关；开启动作发生在用户点击手势中，可安全创建/恢复 AudioContext
export function toggleSound() {
  soundState.enabled = !soundState.enabled
  if (soundState.enabled) {
    ensureCtx()
    RECIPES.toggle()
  }
}
