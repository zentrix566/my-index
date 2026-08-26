<script setup>
import { computed, ref } from 'vue'
import { useRouter } from 'vue-router'
import { useHearthstoneTheme } from '../composables/useHearthstoneTheme.js'

const router = useRouter()
const { hsTheme } = useHearthstoneTheme()
const activeStep = ref(3)
const jugglerFirstRound = ref('')
const jugglerSecondRound = ref('')
const jugglerError = ref('')
const jugglerStartIndex = ref(null)
const cubeFormula = ref('')
const cubeMoves = ref([])
const starterTools = ref({ torch: false, axe: false, boots: false, bomb: false })
const clearedMazes = ref(0)
const coinsDelivered = ref(0)
const bobSupplyTaken = ref(false)

const starterReady = computed(() => Object.values(starterTools.value).every(Boolean))
const mazeProgress = computed(() => Math.min(100, Math.round((coinsDelivered.value / 20) * 100)))
const nextMazeAction = computed(() => {
  if (!starterReady.value) return '先在出生迷宫的内圈开四个箱子：火炬、斧子、熔岩踏靴、炸药。'
  if (clearedMazes.value === 0) return '带着炸药到内圈唯一的开裂墙壁，炸开进入外圈；开外圈箱子补炸药，再炸开出口。'
  if (coinsDelivered.value >= 20) return '20 枚金币已上交，回到游戏确认成就与卡背奖励。'
  if (!bobSupplyTaken.value) return '先将首座迷宫的 5 枚金币交给鲍勃；再取他左下树丛箱子的炸药和金币，金币继续交给鲍勃。'
  return `从世界地图选择下一座未探索迷宫。每座收齐 5 枚金币后先交给鲍勃；还差 ${20 - coinsDelivered.value} 枚。`
})

function resetMaze() {
  starterTools.value = { torch: false, axe: false, boots: false, bomb: false }
  clearedMazes.value = 0
  coinsDelivered.value = 0
  bobSupplyTaken.value = false
}

function parseHealthRow(value) {
  const values = String(value).trim().split(/[，,、\s]+/).filter(Boolean).map(Number)
  return values.length === 7 && values.every((item) => Number.isInteger(item) && item >= 0 && item <= 99)
    ? values
    : null
}

function solveJuggler() {
  const first = parseHealthRow(jugglerFirstRound.value)
  const second = parseHealthRow(jugglerSecondRound.value)
  jugglerError.value = ''
  jugglerStartIndex.value = null
  if (!first || !second) {
    jugglerError.value = '请按从左到右输入两行各 7 个血量，使用空格或逗号分隔。'
    return
  }
  const unchanged = first.map((value, index) => value === second[index] ? index : -1).filter((index) => index >= 0)
  if (unchanged.length !== 1) {
    jugglerError.value = unchanged.length === 0
      ? '没有找到血量不变的球：请确认第二行是在第一回合空过、动画完全结束后记录的。'
      : '找到了多个不变血量：请重新记录两行，正常情况应恰好只有一个。'
    return
  }
  jugglerStartIndex.value = unchanged[0]
}

const jugglerSteps = computed(() => {
  if (jugglerStartIndex.value === null) return []
  return Array.from({ length: 15 }, (_, index) => ({
    turn: index + 2,
    position: ((jugglerStartIndex.value + index) % 7) + 1,
  }))
})

const cubeCardMap = { F: 1, B: 2, U: 3, D: 4, L: 5, R: 6 }
function convertCubeFormula() {
  const normalized = cubeFormula.value.toUpperCase().replace(/[’′]/g, "'")
  const tokens = normalized.match(/[FBRUDL](?:2|')?/g) || []
  const compact = normalized.replace(/\s+/g, '')
  if (!tokens.length || tokens.join('') !== compact) {
    cubeMoves.value = []
    return
  }
  cubeMoves.value = tokens.flatMap((token) => {
    const face = token[0]
    const suffix = token.slice(1)
    // 游戏手牌是逆时针；标准公式不带撇号时为顺时针，需连续打 3 次。
    const count = suffix === "'" ? 1 : suffix === '2' ? 2 : 3
    return Array.from({ length: count }, () => cubeCardMap[face])
  })
}
</script>

<template>
  <section class="section page-section hs-page ap-page" :data-hs-theme="hsTheme">
    <div class="container ap-container">
      <header class="ap-header">
        <div>
          <button type="button" class="ap-back" @click="router.push('/hearthstone')">← 返回成就</button>
          <p class="ap-kicker">奥特兰克的谜题 · 霏微雪花卡背</p>
          <h1>谜题通关助手</h1>
          <p>按游戏内阶段顺序给出入口与解法；第三关会根据你的实际进度给出下一步，避免误用炸药或金币爆手牌。</p>
          <a class="ap-video-link" href="https://www.bilibili.com/video/BV1jL411A7Hx/" target="_blank" rel="noopener noreferrer">观看奥特兰克谜题视频攻略</a>
          <p class="ap-disclaimer"><strong>免责声明：</strong>本助手基于公开视频、地图和社区攻略整理；作者尚未亲自验证泽瑞拉、库尔特鲁斯和凯瑞尔三个谜题的完整流程。请结合游戏内实际状态谨慎操作。</p>
        </div>
        <!-- 主题切换统一由全站状态栏提供。 -->
      </header>

      <nav class="ap-tabs" aria-label="谜题阶段">
        <button :class="{ active: activeStep === 1 }" @click="activeStep = 1">1/3 泽瑞拉</button>
        <button :class="{ active: activeStep === 2 }" @click="activeStep = 2">2/3 库尔特鲁斯</button>
        <button :class="{ active: activeStep === 3 }" @click="activeStep = 3">3/3 凯瑞尔迷宫</button>
      </nav>

      <article v-if="activeStep === 1" class="ap-card">
        <h2>泽瑞拉：二阶魔方</h2>
        <p><strong>进入方式：</strong>游戏模式 → 单人模式 → 佣兵之书 → <strong>泽瑞拉</strong>章节；在章节挑战封面的<strong>左下角</strong>点击隐藏角标进入。</p>
        <p>场上随从种族对应魔方颜色，手牌 1 至 6 分别是前、后、上、下、左、右面的逆时针旋转。先把棋盘录入二阶魔方求解器，将得到的公式粘到下方；工具会直接换成该打哪张牌的序列。</p>
        <div class="ap-moves">
          <span>1：前面 F′</span><span>2：后面 B′</span><span>3：上面 U′</span>
          <span>4：下面 D′</span><span>5：左面 L′</span><span>6：右面 R′</span>
        </div>
        <section class="ap-solver" aria-label="魔方出牌转换器">
          <h3>魔方公式 → 出牌步骤</h3>
          <label>粘贴标准二阶魔方公式（例如 <code>R U R' U'</code>）
            <input v-model="cubeFormula" placeholder="R U R' U'" @input="convertCubeFormula">
          </label>
          <p v-if="cubeFormula && !cubeMoves.length" class="ap-error">只支持 F、B、U、D、L、R，以及 <code>'</code> 和 <code>2</code>。</p>
          <div v-else-if="cubeMoves.length" class="ap-solution">
            <strong>依次打出手牌：</strong>
            <span class="ap-card-sequence">{{ cubeMoves.join(' → ') }}</span>
            <p>数字对应你当前手牌的位置；每打出一张牌后，下一张仍按数字找即可。标准公式的无撇号转动会自动换成同一张牌连打 3 次。</p>
          </div>
        </section>
        <a class="ap-link" href="https://outof.games/realms/hearthstone/guides/163-solving-the-shimmering-snowflake-card-back-achievement-in-hearthstone-solve-the-alterac-valley-mysteries/" target="_blank" rel="noopener noreferrer">查看魔方录入与求解说明</a>
      </article>

      <article v-else-if="activeStep === 2" class="ap-card">
        <h2>库尔特鲁斯：接球谜题</h2>
        <p><strong>进入方式：</strong>游戏模式 → 单人模式 → 佣兵之书 → <strong>库尔特鲁斯</strong>章节；在章节挑战封面的<strong>左上角</strong>点击隐藏角标进入。</p>
        <p>不用理解抛球规律：第一回合<strong>不要点技能</strong>，分别记下第一、二回合开始时，7 个球从左到右的血量。工具会找到两回合间<strong>血量不变</strong>的那个球，并给出后续 15 次点击。</p>
        <section class="ap-solver" aria-label="接球步骤生成器">
          <h3>接球步骤生成器</h3>
          <label>第一回合开始（从左至右 7 个血量）
            <input v-model="jugglerFirstRound" inputmode="numeric" placeholder="例如：95, 71, 32, 1, 49, 14, 79">
          </label>
          <label>空过并结束回合后（从左至右 7 个血量）
            <input v-model="jugglerSecondRound" inputmode="numeric" placeholder="例如：…">
          </label>
          <button type="button" class="ap-solve" @click="solveJuggler">生成点击步骤</button>
          <p v-if="jugglerError" class="ap-error">{{ jugglerError }}</p>
          <div v-else-if="jugglerSteps.length" class="ap-solution">
            <strong>从第 2 回合开始，按此顺序点英雄技能，再结束回合：</strong>
            <ol>
              <li v-for="step in jugglerSteps" :key="step.turn">第 {{ step.turn }} 回合：点从左数第 <b>{{ step.position }}</b> 个球。</li>
            </ol>
            <p>第 16 回合点完后，余下 5 回合直接结束回合即可。若某个球在第一回合就死亡，直接重开本局。</p>
          </div>
        </section>
        <a class="ap-link" href="https://ol.3dmgame.com/gl/185429.html" target="_blank" rel="noopener noreferrer">查看数值与接球原理</a>
      </article>

      <article v-else class="ap-card ap-maze">
        <div class="ap-maze-head">
          <div>
            <h2>凯瑞尔：迷宫助手</h2>
            <p><strong>进入方式：</strong>游戏模式 → 单人模式 → 佣兵之书 → <strong>凯瑞尔</strong>章节；在章节挑战封面的<strong>右上角</strong>点击隐藏角标进入。</p>
          </div>
          <button type="button" class="ap-reset" @click="resetMaze">重置本次记录</button>
        </div>

        <div class="ap-progress" aria-label="金币进度">
          <div :style="{ width: mazeProgress + '%' }"></div>
          <span>已交 {{ coinsDelivered }} / 20 枚金币</span>
        </div>

        <section class="ap-next"><strong>下一步：</strong>{{ nextMazeAction }}</section>

        <section class="ap-grid">
          <div class="ap-panel">
            <h3>出生迷宫：先拿四件工具</h3>
            <label v-for="(label, key) in { torch: '火炬（通过黑暗）', axe: '斧子（砍树，需手动使用）', boots: '熔岩踏靴（通过熔岩）', bomb: '炸药（炸开裂缝）' }" :key="key">
              <input v-model="starterTools[key]" type="checkbox"> {{ label }}
            </label>
            <p v-if="starterReady" class="ap-ok">工具齐全：前往唯一的开裂墙壁，使用炸药。</p>
          </div>
          <div class="ap-panel">
            <h3>世界地图与鲍勃</h3>
            <label>已探索迷宫
              <input v-model.number="clearedMazes" type="number" min="0" max="4">
            </label>
            <label>已交金币
              <input v-model.number="coinsDelivered" type="number" min="0" max="20" step="5">
            </label>
            <label><input v-model="bobSupplyTaken" type="checkbox"> 已拿鲍勃左下树丛箱子</label>
          </div>
        </section>

        <div class="ap-warning"><strong>关键防呆：</strong>炸药只用于“开裂的墙壁”；不要把炸药交给鲍勃。每清完一座迷宫先交金币，避免手牌上限导致失败。</div>
        <p class="ap-disclaimer"><strong>第三关额外提醒：</strong>每次开箱、使用炸药或交金币前请结合游戏内实际状态确认，避免因手牌超过 10 张而爆牌。</p>
        <div class="ap-links">
          <a class="ap-link" href="https://www.bilibili.com/video/BV1jL411A7Hx/" target="_blank" rel="noopener noreferrer">观看谜题视频攻略</a>
          <a class="ap-link" href="https://docs.qq.com/sheet/DUmFwSHlIRkl2WmVi?tab=5lfc46" target="_blank" rel="noopener noreferrer">打开八座迷宫世界地图</a>
          <a class="ap-link" href="https://www.bilibili.com/video/BV1G94y1f7Q8/" target="_blank" rel="noopener noreferrer">打开 20–30 分钟视频路线</a>
        </div>
      </article>
    </div>
  </section>
</template>

<style scoped>
.ap-container { max-width: 1080px; }
.ap-header { display:flex; justify-content:space-between; gap:24px; margin-bottom:22px; }
.ap-back,.ap-theme,.ap-reset,.ap-tabs button { border:1px solid var(--hs-border); border-radius:9px; color:var(--hs-text); background:var(--hs-surface); cursor:pointer; }
.ap-video-link { display:inline-flex; margin-top:4px; color:var(--hs-link); font-size:14px; font-weight:800; }
.ap-back { padding:6px 0; border:0; background:transparent; color:var(--hs-link); }
.ap-theme,.ap-reset { align-self:flex-start; padding:9px 12px; }
.ap-kicker { margin:10px 0 4px; color:var(--hs-primary); font-size:13px; font-weight:800; }
h1,h2,h3 { color:var(--hs-text); } h1 { margin:0; } .ap-header p:not(.ap-kicker) { color:var(--hs-text-soft); line-height:1.6; }
.ap-tabs { display:flex; gap:8px; flex-wrap:wrap; margin-bottom:14px; }.ap-tabs button { padding:10px 13px; font-weight:700; }.ap-tabs button.active { color:#fff; border-color:var(--hs-primary); background:var(--hs-primary); }
.ap-card { padding:22px; border:1px solid var(--hs-border); border-radius:14px; color:var(--hs-text-soft); background:var(--hs-surface); box-shadow:var(--hs-shadow); }.ap-card h2 { margin:0 0 12px; }.ap-card p,.ap-card li { line-height:1.7; }.ap-card ol { padding-left:22px; }
.ap-link { display:inline-flex; margin-top:8px; color:var(--hs-link); font-weight:700; }.ap-moves { display:grid; grid-template-columns:repeat(3,minmax(0,1fr)); gap:8px; }.ap-moves span,.ap-next,.ap-warning { padding:9px 11px; border-radius:8px; background:var(--hs-surface-soft); }
.ap-solver { display:grid; gap:10px; margin:16px 0; padding:15px; border:1px solid var(--hs-border); border-radius:11px; background:var(--hs-surface-soft); }.ap-solver h3 { margin:0; font-size:16px; }.ap-solver label { display:grid; gap:6px; color:var(--hs-text); font-weight:700; }.ap-solver input { width:100%; box-sizing:border-box; padding:9px 10px; border:1px solid var(--hs-border); border-radius:8px; color:var(--hs-text); background:var(--hs-surface); }.ap-solve { justify-self:start; padding:9px 13px; border:0; border-radius:8px; color:#fff; background:var(--hs-primary); font-weight:800; cursor:pointer; }.ap-error { margin:0; color:#dc2626; font-weight:700; }.ap-solution { padding:11px; border-radius:8px; color:var(--hs-text); background:var(--hs-surface); }.ap-solution ol { display:grid; grid-template-columns:repeat(3,minmax(0,1fr)); gap:5px 16px; margin:9px 0; }.ap-solution li { font-size:14px; }.ap-solution p { margin:8px 0 0; font-size:13px; }.ap-card-sequence { display:block; margin-top:9px; padding:9px; overflow-wrap:anywhere; border-radius:7px; color:var(--hs-primary); background:var(--hs-surface-soft); font-weight:900; letter-spacing:.04em; }
.ap-maze-head { display:flex; justify-content:space-between; gap:16px; }.ap-progress { position:relative; height:30px; overflow:hidden; margin:18px 0; border-radius:999px; background:var(--hs-surface-soft); }.ap-progress div { height:100%; background:var(--hs-primary); transition:width .2s; }.ap-progress span { position:absolute; inset:0; display:grid; place-items:center; color:var(--hs-text); font-size:13px; font-weight:800; }.ap-next { margin-bottom:14px; color:var(--hs-text); }.ap-grid { display:grid; grid-template-columns:repeat(2,minmax(0,1fr)); gap:14px; }.ap-panel { display:grid; gap:9px; padding:14px; border:1px solid var(--hs-border); border-radius:10px; }.ap-panel h3 { margin:0 0 3px; font-size:15px; }.ap-panel label { display:flex; align-items:center; gap:7px; }.ap-panel input[type=number] { width:70px; margin-left:auto; padding:6px; border:1px solid var(--hs-border); border-radius:7px; color:var(--hs-text); background:var(--hs-surface-soft); }.ap-ok { margin:2px 0 0; color:#22a65b; font-weight:700; }.ap-warning { margin-top:14px; color:var(--hs-text); border-left:3px solid #f59e0b; }.ap-disclaimer { margin:12px 0 0; padding:10px 12px; border:1px solid color-mix(in srgb, #f59e0b 40%, var(--hs-border)); border-radius:8px; color:var(--hs-text-soft); font-size:13px; line-height:1.65; background:var(--hs-surface-soft); }.ap-links { display:flex; gap:16px; flex-wrap:wrap; }
@media (max-width:640px) { .ap-header,.ap-maze-head { flex-direction:column; }.ap-grid,.ap-moves,.ap-solution ol { grid-template-columns:1fr; } }
</style>
