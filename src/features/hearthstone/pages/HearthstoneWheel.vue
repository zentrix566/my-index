<template>
  <section class="section page-section hs-page hs-wheel-page" :data-hs-theme="hsTheme">
    <div class="container">
      <header class="hs-wheel-hero">
        <div><p class="eyebrow">Darkmoon Treasures · 34.4</p><h1>暗月宝藏</h1><p>从精选宝藏中抽取奖励。每个宝藏只能获得一次，抽到后不会重复；首次抽取免费。</p></div>
        <button type="button" class="hs-btn hs-btn-ghost" @click="router.push('/hearthstone')">返回炉石</button>
      </header>
      <div class="hs-cost-summary hs-cost-summary-top"><div><span>本轮已消耗</span><strong>{{ spentCost }} 宝珠</strong></div><div><span>剩余奖励还需</span><strong>{{ remainingCost }} 宝珠</strong></div></div>
      <div class="hs-wheel-layout">
        <aside class="hs-prize-panel">
          <div class="hs-panel-heading"><span>本期宝藏池</span><small>10 个奖励</small></div>
          <div class="hs-prizes"><article v-for="prize in prizes" :key="prize.id" class="hs-prize" :class="'rarity-' + prize.rarity"><span class="hs-prize-icon">{{ prize.icon }}</span><div><strong>{{ prize.name }}</strong><small>{{ prize.note }}</small></div></article></div>
          <div class="hs-wheel-wallet"><span>奥术宝珠</span><strong>∞</strong><small>无限体验</small></div>
        </aside>
        <main class="hs-wheel-stage" aria-live="polite">
          <div class="hs-action-bar"><button type="button" class="hs-spin-button" :disabled="spinning || !canSpin" @click="spin"><span>{{ spinning ? '宝藏转动中…' : canSpin ? (drawCount === 0 ? '免费抽取' : '抽取一次') : '已全部获得' }}</span><small v-if="drawCount > 0">第 {{ drawCount + 1 }} 抽 · {{ drawCosts[drawCount] || 0 }} 奥术宝珠</small></button><button type="button" class="hs-quick-button" :disabled="spinning || !canSpin" @click="quickDraw">快速抽奖：模拟到大奖</button><button type="button" class="hs-reset-button" :disabled="spinning" @click="resetTreasure">重置宝藏池</button></div>
          <div class="hs-treasure-board" :class="{ spinning }">
            <article v-for="prize in sidePrizes" :key="prize.id" class="hs-treasure-card" :class="['rarity-' + prize.rarity, { active: activeId === prize.id, selected: selectedIds.includes(prize.id) }]"><img :src="prize.image" :alt="prize.name"><strong>{{ prize.name }}</strong><small>{{ prize.note }}</small></article>
            <article v-for="prize in grandPrizes" :key="prize.id" class="hs-treasure-grand" :class="['rarity-' + prize.rarity, { active: activeId === prize.id, selected: selectedIds.includes(prize.id) }]"><img :src="prize.image" :alt="prize.name"><strong>{{ prize.name }}</strong><small>{{ prize.note }}</small><em>大奖</em></article>
            <button v-if="result" type="button" class="hs-board-result" aria-label="关闭抽奖结果" @click="result = null"><img :src="result.image" :alt="result.name"><div><small>本次获得</small><strong>{{ result.name }}</strong><span>点击关闭</span></div></button>
          </div>
          <p class="hs-wheel-hint">已抽取 {{ drawCount }}/10 次 · 下一抽 {{ drawCount < 10 ? (drawCount === 0 ? '免费' : drawCosts[drawCount] + ' 奥术宝珠') : '已全部获得' }}</p>
        </main>
        <aside class="hs-history-panel">
          <section class="hs-draw-history" aria-label="抽奖记录"><div class="hs-history-heading"><strong>抽奖记录</strong><small>最新记录在前</small></div><ol><li v-for="item in history" :key="item.draw"><span>第 {{ item.draw }} 抽</span><strong>{{ item.name }}</strong><em>{{ item.rarityLabel }}</em></li><li v-if="!history.length" class="empty">还没有抽奖记录</li></ol></section>
        </aside>
      </div>
    </div>
  </section>
</template>

<script setup>
import { computed, ref } from 'vue'
import { useRouter } from 'vue-router'

const router = useRouter()
const hsTheme = ref(localStorage.getItem('hs-theme') || 'dark')
const drawCount = ref(Number(localStorage.getItem('hs-wheel-draws') || 0))
const spinning = ref(false)
const result = ref(null)
const rotation = ref(0)
const activeId = ref(null)
const selectedIds = ref(JSON.parse(localStorage.getItem('hs-wheel-selected') || '[]'))
const history = ref(JSON.parse(localStorage.getItem('hs-wheel-history') || '[]'))
const prizes = [
  { id: 'coin', name: '幸运币异画：锁链', note: '30%', weight: 300, image: '/hearthstone-cosmetics/coins/JAIL_COIN3.png', rarity: 'common' },
  { id: 'velen', name: '异画高阶女巫维洛', note: '28%', weight: 280, image: '/hearthstone-cards/通灵学园/full/高阶女巫维洛_59252.png', rarity: 'common' },
  { id: 'volazj', name: '异画威拉诺兹', note: '12%', weight: 120, image: '/hearthstone-cards/大地的裂变/full/威拉诺兹_123151.png', rarity: 'rare' },
  { id: 'prophet', name: '异画上古预言师', note: '10%', weight: 100, image: '/hearthstone-cards/逃离紫罗兰监狱/full/上古预言师_125878.png', rarity: 'rare' },
  { id: 'doom', name: '异画毁灭', note: '7.5%', weight: 75, image: '/hearthstone-cards/逃离紫罗兰监狱/full/毁灭_126128.png', rarity: 'epic' },
  { id: 'imprison', name: '异画恶魔监禁', note: '6%', weight: 60, image: '/hearthstone-cards/逃离紫罗兰监狱/full/恶魔监禁_125915.png', rarity: 'epic' },
  { id: 'arator', name: '救赎者阿拉托尔及卡背', note: '2.5%', weight: 25, image: '/hearthstone-cosmetics/hero-skins/paladin/HERO_04cb.png', rarity: 'epic' },
  { id: 'illidan', name: '痴情的伊利丹', note: '2.5%', weight: 25, image: '/hearthstone-cosmetics/hero-skins/demon-hunter/HERO_10bx.png', rarity: 'epic' },
  { id: 'alleria', name: '七夕奥蕾莉亚 · 猎人钻石', note: '1.4%', weight: 14, image: '/hearthstone-cosmetics/hero-skins/hunter/HERO_05bz.png', rarity: 'legendary' },
  { id: 'turalyon', name: '七夕图拉扬 · 术士神话', note: '0.1%', weight: 1, image: '/hearthstone-cosmetics/hero-skins/warlock/HERO_07ca.png', rarity: 'mythic' }
]
const drawCosts = [0, 120, 240, 360, 600, 840, 1160, 1580, 1980, 3280]
const canSpin = computed(() => drawCount.value < 10)
const spentCost = computed(() => drawCosts.slice(0, drawCount.value).reduce((sum, cost) => sum + cost, 0))
const remainingCost = computed(() => drawCosts.slice(drawCount.value).reduce((sum, cost) => sum + cost, 0))
const availablePrizes = computed(() => prizes.filter((prize) => !selectedIds.value.includes(prize.id)))
const grandPrizes = computed(() => prizes.slice(-2))
const sidePrizes = computed(() => prizes.slice(0, 8))
const wheelStyle = computed(() => ({ transform: 'rotate(' + rotation.value + 'deg)' }))
const labelStyle = (index) => ({ transform: 'rotate(' + (index * 45 + 22.5) + 'deg) translateY(-112px) rotate(-' + (index * 45 + 22.5) + 'deg)' })

function spin() {
  if (spinning.value || !canSpin.value) return
  spinning.value = true
  result.value = null
  drawCount.value += 1
  const totalWeight = availablePrizes.value.reduce((sum, item) => sum + item.weight, 0)
  let roll = Math.random() * totalWeight
  const prize = availablePrizes.value.find((item) => { roll -= item.weight; return roll <= 0 }) || availablePrizes.value[availablePrizes.value.length - 1]
  rotation.value += 1440
  localStorage.setItem('hs-wheel-draws', String(drawCount.value))
  const track = availablePrizes.value
  const targetIndex = track.findIndex((item) => item.id === prize.id)
  let cursor = 0
  let passes = 0
  const timer = window.setInterval(() => {
    activeId.value = track[cursor % track.length].id
    cursor += 1
    if (cursor % track.length === targetIndex) passes += 1
    if (passes >= 3 && cursor % track.length === targetIndex) {
      window.clearInterval(timer)
      window.setTimeout(() => {
        activeId.value = prize.id
        selectedIds.value.push(prize.id)
        saveDraw(prize)
        result.value = prize
        activeId.value = null
        spinning.value = false
      }, 260)
    }
  }, 120)
}

function saveDraw(prize) {
  history.value.unshift({ draw: drawCount.value, name: prize.name, rarityLabel: prize.rarity === 'mythic' ? '神话大奖' : prize.rarity === 'legendary' ? '钻石大奖' : '已获得' })
  localStorage.setItem('hs-wheel-history', JSON.stringify(history.value))
  localStorage.setItem('hs-wheel-selected', JSON.stringify(selectedIds.value))
}

function pickPrize(pool) {
  const totalWeight = pool.reduce((sum, item) => sum + item.weight, 0)
  let roll = Math.random() * totalWeight
  return pool.find((item) => { roll -= item.weight; return roll <= 0 }) || pool[pool.length - 1]
}

function quickDraw() {
  if (spinning.value || !canSpin.value) return
  while (drawCount.value < 10 && !selectedIds.value.some((id) => id === 'alleria' || id === 'turalyon')) {
    const pool = prizes.filter((prize) => !selectedIds.value.includes(prize.id))
    const prize = pickPrize(pool)
    drawCount.value += 1
    selectedIds.value.push(prize.id)
    saveDraw(prize)
    result.value = prize
  }
  activeId.value = null
  localStorage.setItem('hs-wheel-draws', String(drawCount.value))
}

function resetTreasure() {
  if (spinning.value) return
  drawCount.value = 0
  selectedIds.value = []
  history.value = []
  result.value = null
  activeId.value = null
  localStorage.removeItem('hs-wheel-draws')
  localStorage.removeItem('hs-wheel-selected')
  localStorage.removeItem('hs-wheel-history')
}
</script>

<style scoped>
.hs-wheel-page{min-height:100vh}.hs-wheel-hero{display:flex;justify-content:space-between;gap:24px;align-items:flex-start;padding:28px;border:1px solid var(--hs-border);border-radius:18px;background:linear-gradient(135deg,#211836,#10233c);box-shadow:var(--hs-shadow-hero)}.hs-wheel-hero h1{margin:0 0 8px;color:#ffe7a1;font-size:clamp(2rem,5vw,3.5rem)}.hs-wheel-hero p:last-child{max-width:650px;margin:0;color:#d8d2e7;line-height:1.7}.hs-wheel-layout{display:grid;grid-template-columns:280px minmax(0,1fr);gap:18px;margin-top:18px}.hs-prize-panel,.hs-wheel-stage{border:1px solid var(--hs-border);border-radius:18px;background:rgba(20,25,46,.88);box-shadow:var(--hs-shadow-card)}.hs-prize-panel{padding:18px}.hs-panel-heading{display:flex;justify-content:space-between;color:#ffe7a1;font-weight:800}.hs-panel-heading small,.hs-prize small,.hs-wheel-hint{color:#aaa8bd;font-size:12px}.hs-prizes{display:grid;gap:9px;margin-top:18px}.hs-prize{display:flex;align-items:center;gap:10px;padding:10px;border:1px solid rgba(255,255,255,.09);border-radius:10px;background:rgba(255,255,255,.035)}.hs-prize-icon{display:grid;place-items:center;width:30px;height:30px;color:#f4c85c;font-size:20px}.hs-prize strong,.hs-prize small{display:block}.hs-prize strong{color:#f4f0ff;font-size:13px}.hs-prize small{margin-top:2px}.rarity-legendary{border-color:#d9a83f}.hs-wheel-wallet{display:flex;align-items:baseline;gap:8px;margin-top:20px;padding-top:16px;border-top:1px solid var(--hs-border);color:#bdb8cc}.hs-wheel-wallet strong{color:#ffd66e;font-size:24px}.hs-wheel-wallet small{display:block;margin-left:auto;font-size:11px}.hs-wheel-stage{position:relative;display:flex;min-height:670px;flex-direction:column;align-items:center;justify-content:center;overflow:hidden;background:radial-gradient(circle at center,#3c2859 0,#17182d 49%,#0c1223 100%)}.hs-wheel-stage:before{position:absolute;inset:0;background-image:radial-gradient(#f8d77b 1px,transparent 1px);background-size:34px 34px;opacity:.12;content:""}.hs-wheel-ribbon{position:absolute;top:20px;padding:8px 28px;border:1px solid #e0b754;border-radius:999px;color:#ffe7a1;background:#572b55;font-weight:900;letter-spacing:.15em}.hs-wheel-wrap{position:relative;margin-top:30px}.hs-wheel{position:relative;width:min(70vw,440px);height:min(70vw,440px);border:12px solid #d6a94e;border-radius:50%;background:conic-gradient(#7f3d6c 0 12.5%,#253e77 12.5% 25%,#7d6332 25% 37.5%,#3a6a73 37.5% 50%,#6c3a76 50% 62.5%,#254c6a 62.5% 75%,#805934 75% 87.5%,#452e72 87.5%);box-shadow:0 0 0 5px #4c2e51,0 0 42px #d5a74688;transition:transform 2.8s cubic-bezier(.13,.75,.18,1)}.hs-wheel-label{position:absolute;top:50%;left:50%;display:flex;width:76px;transform-origin:0 0;flex-direction:column;align-items:center;gap:5px;color:#fff4c7;font-size:24px;text-shadow:0 2px 4px #000}.hs-wheel-label span{font-size:11px;white-space:nowrap}.hs-wheel-pointer{position:absolute;z-index:2;top:-13px;left:50%;width:0;height:0;transform:translateX(-50%);border-right:16px solid transparent;border-left:16px solid transparent;border-top:38px solid #f6db7b;filter:drop-shadow(0 3px 2px #000)}.hs-wheel-center{position:absolute;z-index:1;top:50%;left:50%;display:grid;width:92px;height:92px;transform:translate(-50%,-50%);place-items:center;border:6px solid #f1c75c;border-radius:50%;color:#fff0b2;background:radial-gradient(circle,#873f61,#341c47);box-shadow:0 0 0 4px #4d2950}.hs-wheel-center span{font-size:12px}.hs-wheel-center strong{font-size:28px;line-height:20px}.hs-spin-button{z-index:1;min-width:190px;margin-top:28px;padding:13px 26px;border:2px solid #ffe08a;border-radius:999px;color:#4b2a20;background:linear-gradient(#ffe89a,#d99b3d);box-shadow:0 5px 0 #7c442c,0 0 22px #e4b45f99;font-size:18px;font-weight:900;cursor:pointer}.hs-spin-button:disabled{cursor:not-allowed;filter:grayscale(.7);opacity:.65}.hs-spin-button small{display:block;font-size:11px}.hs-wheel-hint{z-index:1;margin:18px 0 0}.hs-wheel-result{z-index:2;display:flex;align-items:center;gap:12px;position:absolute;right:18px;bottom:18px;left:18px;padding:14px 16px;border:1px solid #e3b852;border-radius:12px;color:#fff0bc;background:#301f45eF;box-shadow:0 8px 30px #0007}.result-spark{color:#ffe078;font-size:26px}.hs-wheel-result small,.hs-wheel-result strong{display:block}.hs-wheel-result strong{font-size:18px}.hs-wheel-result button{margin-left:auto;border:0;color:#fff;background:transparent;font-size:25px;cursor:pointer}@media(max-width:760px){.hs-wheel-hero{flex-direction:column}.hs-wheel-layout{grid-template-columns:1fr}.hs-prize-panel{order:2}.hs-wheel-stage{min-height:590px}.hs-wheel{width:320px;height:320px}.hs-wheel-label{transform:scale(.82)!important}}
.hs-treasure-board{z-index:1;display:grid;width:min(92%,620px);grid-template-columns:repeat(4,1fr);grid-template-rows:150px 260px 150px;gap:14px;margin-top:38px;padding:14px;border:8px solid #8e5925;border-radius:8px;background:linear-gradient(135deg,#163b26,#2d693c 50%,#173a27);box-shadow:0 0 0 3px #d9a43f,0 0 34px #0008}.hs-treasure-card,.hs-treasure-grand{position:relative;display:flex;min-width:0;flex-direction:column;align-items:center;justify-content:center;gap:5px;padding:10px;border:3px solid #4e2e1c;border-radius:9px;background:linear-gradient(145deg,#1d4930,#10281d);box-shadow:inset 0 0 0 2px #16311f,0 4px 10px #0008;text-align:center}.hs-treasure-card span,.hs-treasure-grand span{color:#f9d77d;font-size:36px;text-shadow:0 3px 5px #000}.hs-treasure-card strong,.hs-treasure-grand strong{color:#f7ebc0;font-size:12px;line-height:1.3}.hs-treasure-card small,.hs-treasure-grand small{color:#c6d7bf;font-size:11px}.hs-treasure-grand{grid-row:2;align-self:stretch;border-color:#d8a23d;background:linear-gradient(145deg,#39285a,#82465f 48%,#c1843d);box-shadow:inset 0 0 0 2px #f3c45a,0 0 22px #edbb5d88}.hs-treasure-grand:nth-of-type(10){grid-column:3}.hs-treasure-grand:nth-of-type(9){grid-column:2}.hs-treasure-grand em{position:absolute;top:8px;right:8px;padding:3px 7px;border-radius:10px;color:#5e3217;background:#ffe089;font-size:10px;font-style:normal;font-weight:900}.hs-treasure-board .hs-treasure-card:nth-child(1){grid-column:1;grid-row:1}.hs-treasure-board .hs-treasure-card:nth-child(2){grid-column:2;grid-row:1}.hs-treasure-board .hs-treasure-card:nth-child(3){grid-column:3;grid-row:1}.hs-treasure-board .hs-treasure-card:nth-child(4){grid-column:4;grid-row:1}.hs-treasure-board .hs-treasure-card:nth-child(5){grid-column:1;grid-row:2}.hs-treasure-board .hs-treasure-card:nth-child(6){grid-column:4;grid-row:2}.hs-treasure-board .hs-treasure-card:nth-child(7){grid-column:1;grid-row:3}.hs-treasure-board .hs-treasure-card:nth-child(8){grid-column:4;grid-row:3}.hs-treasure-board.spinning .hs-treasure-card,.hs-treasure-board.spinning .hs-treasure-grand{animation:treasure-pulse .22s ease-in-out infinite alternate}@keyframes treasure-pulse{to{filter:brightness(1.7);transform:scale(1.02)}}@media(max-width:760px){.hs-treasure-board{grid-template-rows:100px 190px 100px;gap:7px;padding:7px}.hs-treasure-card,.hs-treasure-grand{padding:5px}.hs-treasure-card span,.hs-treasure-grand span{font-size:25px}.hs-treasure-card strong,.hs-treasure-grand strong{font-size:10px}.hs-treasure-card small,.hs-treasure-grand small{font-size:9px}}
.hs-treasure-board .hs-treasure-card:nth-child(5),.hs-treasure-board .hs-treasure-card:nth-child(6),.hs-treasure-board .hs-treasure-card:nth-child(7),.hs-treasure-board .hs-treasure-card:nth-child(8){grid-row:3}.hs-treasure-board .hs-treasure-card:nth-child(5){grid-column:1}.hs-treasure-board .hs-treasure-card:nth-child(6){grid-column:2}.hs-treasure-board .hs-treasure-card:nth-child(7){grid-column:3}.hs-treasure-board .hs-treasure-card:nth-child(8){grid-column:4}
.hs-treasure-card.selected,.hs-treasure-grand.selected{filter:grayscale(.8);opacity:.42}.hs-treasure-card.active,.hs-treasure-grand.active{z-index:3;filter:none;opacity:1;transform:scale(1.06);border-color:#ffe77b;box-shadow:0 0 0 3px #fff0a0,0 0 28px #ffd34dcc,inset 0 0 0 2px #fff1a0}.hs-treasure-card.active:after,.hs-treasure-grand.active:after{position:absolute;inset:-7px;border:2px solid #ffdc64;border-radius:12px;content:"";animation:marquee-glow .45s ease-in-out infinite alternate}@keyframes marquee-glow{to{opacity:.35;transform:scale(1.04)}}
.hs-treasure-board{gap:4px}.hs-treasure-card img,.hs-treasure-grand img{display:block;width:100%;height:100px;object-fit:contain;filter:drop-shadow(0 3px 4px #0008)}.hs-treasure-grand img{height:225px;object-fit:cover;border-radius:4px}.hs-treasure-card strong,.hs-treasure-card small,.hs-treasure-grand strong,.hs-treasure-grand small{position:relative;z-index:1}.hs-treasure-grand strong{font-size:14px;text-shadow:0 2px 3px #000}.hs-treasure-grand small{color:#fff0bb;text-shadow:0 2px 3px #000}
.hs-quick-button{z-index:1;margin-top:12px;padding:8px 16px;border:1px solid #ba8c47;border-radius:999px;color:#f5d98b;background:#342544;font-size:13px;cursor:pointer}.hs-quick-button:disabled{cursor:not-allowed;opacity:.5}.hs-draw-history{z-index:1;width:min(92%,620px);margin-top:20px;padding:14px;border:1px solid #6c4b5c;border-radius:12px;background:#1a1c32cc}.hs-history-heading{display:flex;justify-content:space-between;color:#ffe29a}.hs-history-heading small{color:#aaa8bd;font-size:11px}.hs-draw-history ol{display:grid;grid-template-columns:repeat(2,1fr);gap:6px;margin:10px 0 0;padding:0;list-style:none}.hs-draw-history li{display:flex;align-items:center;gap:8px;padding:7px 9px;border-radius:7px;background:#ffffff09;font-size:12px}.hs-draw-history li span{color:#aaa8bd;white-space:nowrap}.hs-draw-history li strong{overflow:hidden;color:#f8f0d2;text-overflow:ellipsis;white-space:nowrap}.hs-draw-history li em{margin-left:auto;color:#f4c45e;font-size:10px;font-style:normal}.hs-draw-history .empty{grid-column:1/-1;justify-content:center;color:#aaa8bd}@media(max-width:760px){.hs-draw-history ol{grid-template-columns:1fr}}
.hs-treasure-board{position:relative}.hs-board-result{position:absolute;z-index:5;top:50%;left:50%;display:flex;align-items:center;justify-content:center;gap:24px;width:68%;min-height:62%;padding:24px;transform:translate(-50%,-50%);border:5px solid #ffe078;border-radius:16px;color:#fff4c8;background:#271b3ef5;box-shadow:0 0 0 5px #6d432c,0 0 48px #ffd45dcc;cursor:pointer}.hs-board-result img{width:45%;height:270px;object-fit:contain;filter:drop-shadow(0 6px 8px #000)}.hs-board-result small,.hs-board-result strong,.hs-board-result span{display:block;text-align:left}.hs-board-result small{color:#f7d77b;font-size:15px}.hs-board-result strong{margin-top:8px;font-size:22px;line-height:1.35}.hs-board-result span{margin-top:18px;color:#c6b8c6;font-size:12px}@media(max-width:760px){.hs-board-result{width:78%;gap:10px;padding:12px}.hs-board-result img{height:180px}.hs-board-result strong{font-size:15px}}
.hs-reset-button{z-index:1;margin-top:8px;border:0;color:#aaa8bd;background:transparent;font-size:12px;cursor:pointer;text-decoration:underline}.hs-reset-button:disabled{cursor:not-allowed;opacity:.45}
.hs-cost-summary{display:grid;gap:8px;margin-top:14px;padding-top:14px;border-top:1px solid var(--hs-border)}.hs-cost-summary div{display:flex;justify-content:space-between;gap:8px;font-size:12px}.hs-cost-summary span{color:#aaa8bd}.hs-cost-summary strong{color:#f4d477;font-weight:800}
.hs-cost-summary-top{margin-top:0;margin-bottom:16px;padding-top:0;border-top:0}
.hs-wheel-layout{display:flex;flex-direction:column}.hs-wheel-stage{order:1;width:100%}.hs-prize-panel{order:2;width:100%}.hs-prizes{grid-template-columns:repeat(2,minmax(0,1fr))}.hs-prize-panel .hs-panel-heading{margin-top:4px}.hs-prize-panel .hs-wheel-wallet{display:inline-flex;margin-right:24px}.hs-prize-panel .hs-cost-summary-top{max-width:420px}
.hs-action-bar{z-index:2;display:flex;align-items:center;justify-content:center;gap:12px;flex-wrap:wrap;margin:14px 0 18px}
.hs-cost-summary-top{max-width:620px;margin:18px auto 0;padding:14px 18px;border:1px solid var(--hs-border);border-radius:12px;background:rgba(20,25,46,.88)}.hs-wheel-layout{display:grid;grid-template-columns:280px minmax(0,1fr);gap:18px}.hs-wheel-stage{order:2;width:auto}.hs-prize-panel{order:1;width:auto}.hs-prizes{grid-template-columns:1fr}.hs-action-bar{justify-content:center}
.hs-draw-history ol{grid-template-columns:1fr}.hs-draw-history li{min-height:34px}
.hs-wheel-layout{display:grid;grid-template-columns:280px minmax(0,1fr) 280px;align-items:start;gap:18px}.hs-prize-panel{grid-column:1;grid-row:1}.hs-wheel-stage{grid-column:2;grid-row:1;min-width:0}.hs-history-panel{grid-column:3;grid-row:1;min-width:0}.hs-history-panel .hs-draw-history{width:100%;margin-top:0}.hs-history-panel .hs-draw-history ol{grid-template-columns:1fr}.hs-history-panel .hs-draw-history li{align-items:flex-start;flex-wrap:wrap}.hs-history-panel .hs-draw-history li strong{width:100%}@media(max-width:1100px){.hs-wheel-layout{grid-template-columns:240px minmax(0,1fr)}.hs-history-panel{grid-column:1 / -1;grid-row:2}.hs-history-panel .hs-draw-history ol{grid-template-columns:repeat(2,minmax(0,1fr))}}@media(max-width:760px){.hs-wheel-layout{display:flex;flex-direction:column}.hs-prize-panel,.hs-wheel-stage,.hs-history-panel{width:100%}.hs-history-panel{order:3}.hs-history-panel .hs-draw-history ol{grid-template-columns:1fr}}
.hs-wheel-stage{justify-content:flex-start;padding-top:82px}.hs-wheel-ribbon{top:22px}.hs-action-bar{position:relative;margin-top:0}.hs-treasure-board{margin-top:20px}
.hs-wheel-stage{padding-top:24px}.hs-action-bar{margin-top:0}
</style>
