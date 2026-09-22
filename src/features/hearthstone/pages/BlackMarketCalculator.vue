<template>
  <section class="section page-section hs-bm" :data-hs-theme="hsTheme">
    <div class="container hs-bm-wrap">
      <main class="hs-bm-panel">
        <header class="hs-bm-topbar">
          <button type="button" class="hs-bm-back" @click="router.push('/hearthstone')">返回炉石工具</button>
          <div class="hs-bm-sign"><span>流浪者的店</span><strong>黑市</strong></div>
          <label class="hs-bm-balance" for="black-market-bloodstones"><span>我的血石</span><input id="black-market-bloodstones" v-model.number="currentBloodstones" type="number" min="0" step="1" inputmode="numeric"><b>血石</b></label>
        </header>

        <section class="hs-bm-overview" aria-labelledby="black-market-overview-title">
          <div class="hs-bm-overview-head">
            <div>
              <p>黑市血石计算器</p>
              <h1 id="black-market-overview-title">价格总览</h1>
            </div>
            <span class="hs-bm-refresh">每日 15:00 随机变价，幅度最多 ±15%<b>距下次变价 {{ countdown }}</b></span>
          </div>
          <p class="hs-bm-note">直接修改现价即可查看相对首发的涨跌、血石变化和入手建议。现价一律按单份填写；黑暗帝国的统治卡牌包为 4 份一组，可填写已拥有份数，血石与天数只按还差的部分计算，其余商品不受份数影响。</p>

          <div class="hs-bm-table-wrap">
            <table class="hs-bm-table">
              <caption class="sr-only">黑市商品价格总览</caption>
              <thead>
                <tr>
                  <th scope="col">商品</th>
                  <th scope="col">原价</th>
                  <th scope="col">建议入手</th>
                  <th scope="col">现价</th>
                  <th scope="col">相对首发</th>
                  <th scope="col">血石变化</th>
                  <th scope="col">建议</th>
                  <th scope="col">购买计划</th>
                  <th scope="col">状态</th>
                </tr>
              </thead>
              <tbody>
                <tr v-for="item in marketItems" :key="item.id" :class="{ 'is-exchanged': item.isExchanged }">
                  <th scope="row">
                    {{ item.name }}<small v-if="item.quantity > 1">×{{ item.quantity }}</small>
                    <label v-if="item.quantity > 1" class="hs-bm-owned" :for="`black-market-owned-${item.id}`">
                      <span class="sr-only">{{ item.name }}已拥有份数</span>
                      <input :id="`black-market-owned-${item.id}`" v-model.number="owned[item.id]" type="number" min="0" :max="item.quantity" step="1" inputmode="numeric">
                      <span>已拥有 / {{ item.quantity }}</span>
                    </label>
                  </th>
                  <td>{{ formatNumber(item.initialPrice) }}<small v-if="item.quantity > 1"> / 份</small></td>
                  <td :class="suggestedClass(item)">{{ formatNumber(suggestedPrice(item)) }}</td>
                  <td>
                    <label class="hs-bm-input" :for="`black-market-${item.id}`">
                      <span class="sr-only">{{ item.name }}当前价格</span>
                      <input :id="`black-market-${item.id}`" v-model.number="prices[item.id]" type="number" min="0" step="1" inputmode="numeric">
                      <b>血石</b>
                    </label>
                  </td>
                  <td :class="changeClass(item.result?.changePercent)">{{ item.isExchanged || item.collected ? '—' : formatChangePercent(item.result.changePercent) }}</td>
                  <td :class="changeClass(item.result?.priceDifference)">{{ item.isExchanged || item.collected ? '—' : formatChange(item.result.priceDifference) }}</td>
                  <td class="hs-bm-advice" :class="`is-${item.advice.level}`">{{ item.advice.title }}</td>
                  <td class="hs-bm-plan" :class="{ 'is-ready': item.result?.canBuyNow || item.collected }">
                    <template v-if="item.isExchanged">不参与计算</template>
                    <template v-else-if="item.collected">已集齐，无需再换</template>
                    <template v-else-if="item.result.canBuyNow">可立即兑换</template>
                    <template v-else-if="item.quantity > 1">还差 {{ item.result.remainingCount }} 份，需 {{ formatNumber(item.result.remainingBloodstones) }} 血石，约 {{ item.result.daysNeeded }} 天</template>
                    <template v-else>还需 {{ formatNumber(item.result.remainingBloodstones) }} 血石，约 {{ item.result.daysNeeded }} 天</template>
                  </td>
                  <td><button type="button" class="hs-bm-exchange" :class="{ 'is-active': item.isExchanged }" @click="toggleExchanged(item.id)">{{ item.isExchanged ? '取消标记' : '标记已兑换' }}</button></td>
                </tr>
              </tbody>
            </table>
          </div>

          <p class="hs-bm-rule">建议入手价 = 原价 × 90%。建议规则：现价低于或等于建议入手价建议入手；低于首发价但未到建议入手价可酌情入手；高于首发价建议观望。</p>
        </section>
      </main>
    </div>
  </section>
</template>

<script setup>
import { computed, onBeforeUnmount, onMounted, ref, watch } from 'vue'
import { useRouter } from 'vue-router'
import { useHearthstoneTheme } from '../composables/useHearthstoneTheme.js'
import { calculateBlackMarketItem, getBlackMarketAdvice } from '../utils/blackMarket.js'

const STORAGE_KEY = 'hs:black-market'
const router = useRouter()
const { hsTheme } = useHearthstoneTheme()
const defaults = [
  { id: 'tyrion', name: '异画泰兰·弗丁', initialPrice: 4200, quantity: 1 },
  { id: 'tyrande', name: '牧师皮肤「勇士泰兰德」', initialPrice: 1050, quantity: 1 },
  { id: 'broxigar', name: '布洛克斯加英雄皮肤和卡背图案', initialPrice: 2100, quantity: 1 },
  { id: 'yogg-ramen', name: '法师皮肤「尤格-拉面」', initialPrice: 1050, quantity: 1 },
  { id: 'dark-empire-pack', name: '黑暗帝国的统治卡牌包', initialPrice: 900, quantity: 4 },
  { id: 'fireside-friends', name: '卡背「炉边好友」', initialPrice: 750, quantity: 1 },
  { id: 'golden-standard-pack', name: '金色标准包', initialPrice: 750, quantity: 1 }
]
// 旧版本默认价 900：老用户 localStorage 里若仍是 900，视为未修改过，自动迁移到新默认价 750。
const LEGACY_DEFAULT_PRICES = { 'golden-standard-pack': 900 }

function readStoredValue() {
  try { return JSON.parse(localStorage.getItem(STORAGE_KEY) || '{}') } catch { return {} }
}

const stored = readStoredValue()
const currentBloodstones = ref(Math.max(0, Number(stored.currentBloodstones) || 900))
const prices = ref(Object.fromEntries(defaults.map((item) => {
  const storedPrice = Number(stored.prices?.[item.id])
  const legacyPrice = LEGACY_DEFAULT_PRICES[item.id]
  const fallback = storedPrice === legacyPrice ? item.initialPrice : storedPrice
  return [item.id, Math.max(0, fallback || item.initialPrice)]
})))
const exchanged = ref(Object.fromEntries(defaults.map((item) => [item.id, Boolean(stored.exchanged?.[item.id])])))
const owned = ref(Object.fromEntries(defaults.map((item) => [item.id, Math.max(0, Math.floor(Number(stored.owned?.[item.id]) || 0))])))
const marketItems = computed(() => defaults.map((item) => {
  const isExchanged = exchanged.value[item.id]
  const currentPrice = Math.max(0, Number(prices.value[item.id]) || 0)
  const ownedCount = Math.min(Math.max(0, Math.floor(Number(owned.value[item.id]) || 0)), item.quantity)
  const collected = item.quantity > 1 && ownedCount >= item.quantity
  const result = (isExchanged || collected) ? null : calculateBlackMarketItem({ ...item, owned: ownedCount, currentPrice, currentBloodstones: currentBloodstones.value })
  return {
    ...item,
    isExchanged,
    ownedCount,
    collected,
    result,
    advice: isExchanged ? { level: 'neutral', title: '已兑换' } : collected ? { level: 'buy', title: '已集齐' } : getBlackMarketAdvice(result.changePercent)
  }
}).sort((a, b) => Number(a.isExchanged) - Number(b.isExchanged)))

watch([currentBloodstones, prices, exchanged, owned], () => {
  try { localStorage.setItem(STORAGE_KEY, JSON.stringify({ currentBloodstones: currentBloodstones.value, prices: prices.value, exchanged: exchanged.value, owned: owned.value })) } catch { /* 本地存储不可用时仍保持页面内结果。 */ }
}, { deep: true })

function toggleExchanged(id) { exchanged.value[id] = !exchanged.value[id] }

// 距离北京时间 15:00（UTC 07:00）下一次变价的倒计时，与浏览器本地时区无关。
const countdown = ref('--:--:--')
let countdownTimer = null

function nextRefreshTime() {
  const target = new Date()
  target.setUTCHours(7, 0, 0, 0)
  if (target.getTime() <= Date.now()) target.setUTCDate(target.getUTCDate() + 1)
  return target
}

function updateCountdown() {
  const diff = Math.max(0, nextRefreshTime().getTime() - Date.now())
  const pad = (value) => String(value).padStart(2, '0')
  const hours = Math.floor(diff / 3600000)
  const minutes = Math.floor((diff % 3600000) / 60000)
  const seconds = Math.floor((diff % 60000) / 1000)
  countdown.value = `${pad(hours)}:${pad(minutes)}:${pad(seconds)}`
}

onMounted(() => {
  updateCountdown()
  countdownTimer = setInterval(updateCountdown, 1000)
})
onBeforeUnmount(() => { if (countdownTimer) clearInterval(countdownTimer) })
function suggestedPrice(item) { return Math.round(item.initialPrice * 0.9) }
function suggestedClass(item) {
  if (item.isExchanged) return ''
  const current = Math.max(0, Number(prices.value[item.id]) || 0)
  return current <= suggestedPrice(item) ? 'is-down' : 'is-flat'
}
function formatNumber(value) { return Math.round(Number(value) || 0).toLocaleString('zh-CN') }
function formatChange(value) { const rounded = Math.round(Number(value) || 0); return `${rounded > 0 ? '+' : ''}${formatNumber(rounded)}` }
function formatChangePercent(value) { const amount = Number(value) || 0; return `${amount > 0 ? '+' : ''}${amount.toFixed(1)}%` }
function changeClass(value) { return value > 0 ? 'is-up' : value < 0 ? 'is-down' : 'is-flat' }
</script>

<style scoped>
.hs-bm { --bm-gold:#d9ac59;--bm-text:#f7eaca;--bm-muted:#c9b996;--bm-red:#ef675a;--bm-green:#83df95;min-height:100vh;padding:28px 0 56px;background:radial-gradient(circle at 50% 0%,#4b3035,#16121a 56%,#0b0a0e);color:var(--bm-text) }.hs-bm-wrap{max-width:1240px;margin:0 auto;padding:0 18px}.hs-bm-panel{overflow:hidden;border:5px solid #171016;border-radius:22px;background:#19151b;box-shadow:0 20px 55px rgba(0,0,0,.55),inset 0 0 0 2px rgba(217,172,89,.48)}
.hs-bm-topbar{display:grid;grid-template-columns:1fr minmax(190px,310px) 1fr;align-items:center;gap:16px;min-height:92px;padding:12px 20px;background:linear-gradient(#342524,#1b1519);border-bottom:3px solid #7f5c32}.hs-bm-back{justify-self:start;min-height:42px;padding:8px 12px;border:1px solid #8e7444;border-radius:7px;background:linear-gradient(#3c343a,#211d23);color:var(--bm-text);font:inherit;font-weight:700;cursor:pointer;transition:transform .18s ease,filter .18s ease}.hs-bm-back:hover{filter:brightness(1.2);transform:translateY(-1px)}.hs-bm-sign{position:relative;padding:8px 22px 10px;border:2px solid #a57b40;border-radius:8px 8px 16px 16px;background:linear-gradient(#d1b476,#75603a);color:#251b18;text-align:center;box-shadow:inset 0 1px rgba(255,244,193,.65),0 4px 0 #1e1614}.hs-bm-sign::after{position:absolute;right:16px;bottom:-13px;left:16px;height:8px;border-radius:0 0 50% 50%;background:#3c2730;content:''}.hs-bm-sign span,.hs-bm-sign strong{display:block}.hs-bm-sign span{font-size:13px;font-weight:700}.hs-bm-sign strong{font-size:24px;letter-spacing:.12em}.hs-bm-balance{justify-self:end;display:grid;grid-template-columns:auto minmax(88px,112px) auto;align-items:center;gap:8px;padding:8px 11px;border:2px solid #7e3030;border-radius:6px;background:linear-gradient(135deg,#351414,#6b2422);color:#ffe9cf;font-weight:800}.hs-bm-balance span{font-size:12px}.hs-bm-balance input{width:100%;min-width:0;border:0;background:transparent;color:#fff1d4;font:800 20px Georgia,serif;text-align:right;font-variant-numeric:tabular-nums}.hs-bm-balance b{color:#ff8273;font-size:12px}
.hs-bm-overview{padding:26px;background:radial-gradient(ellipse at 50% 0%,rgba(108,68,37,.4),transparent 45%),#211916}.hs-bm-overview-head{display:flex;justify-content:space-between;align-items:end;gap:16px}.hs-bm-overview-head p{margin:0;color:#d9b86c;font-size:12px;font-weight:800;letter-spacing:.1em}.hs-bm-overview h1{margin:4px 0 0;color:#fff0c4;font:700 30px Georgia,'Microsoft YaHei',serif}.hs-bm-overview-head>span,.hs-bm-note,.hs-bm-rule{color:var(--bm-muted);font-size:12px;line-height:1.65}.hs-bm-refresh b{margin-left:10px;padding-left:10px;border-left:1px solid rgba(217,172,89,.4);color:#ffe19a;font-family:Georgia,serif;font-variant-numeric:tabular-nums}.hs-bm-note{margin:16px 0}.hs-bm-table-wrap{overflow-x:auto;border:1px solid rgba(217,172,89,.38);border-radius:9px}.hs-bm-table{width:100%;min-width:1120px;border-collapse:collapse;table-layout:fixed;font-size:13px}.hs-bm-table th,.hs-bm-table td{padding:10px 13px;border-top:1px solid rgba(217,172,89,.18);background:rgba(0,0,0,.16);text-align:left;vertical-align:middle}.hs-bm-table thead th{border-top:0;background:rgba(217,172,89,.12);color:#dfc58e;font-size:11px;font-weight:800}.hs-bm-table tbody th{color:#fff0c4;font-weight:800}.hs-bm-table tbody tr.is-exchanged>*{background:rgba(70,69,70,.34);color:#a99f92}.hs-bm-table th:nth-child(1){width:19%}.hs-bm-table th:nth-child(2){width:7%}.hs-bm-table th:nth-child(3){width:8%}.hs-bm-table th:nth-child(4){width:11%}.hs-bm-table th:nth-child(5),.hs-bm-table th:nth-child(6){width:9%}.hs-bm-table th:nth-child(7){width:8%}.hs-bm-table th:nth-child(8){width:14%}.hs-bm-table th:nth-child(9){width:11%}.hs-bm-table small{color:var(--bm-muted);font-size:11px}.hs-bm-owned{display:flex;align-items:center;gap:5px;margin-top:6px;color:var(--bm-muted);font-size:11px;font-weight:400}.hs-bm-owned input{width:46px;padding:3px 5px;border:1px solid #7c613c;border-radius:4px;background:#17131b;color:#fff2cf;font:700 12px Georgia,serif;text-align:right;font-variant-numeric:tabular-nums}.hs-bm-input{display:flex;align-items:center;min-width:0;border:1px solid #7c613c;border-radius:5px;background:#17131b}.hs-bm-input input{width:100%;min-width:0;padding:7px;border:0;background:transparent;color:#fff2cf;font:700 14px Georgia,serif;font-variant-numeric:tabular-nums}.hs-bm-input b{padding-right:7px;color:#ee685c;font-size:10px;white-space:nowrap}.hs-bm-exchange{min-height:30px;padding:5px 8px;border:1px solid #88734f;border-radius:4px;background:#2d2928;color:#f0dfb8;font:inherit;font-size:11px;font-weight:700;white-space:nowrap;cursor:pointer}.hs-bm-exchange:hover{filter:brightness(1.18)}.hs-bm-exchange.is-active{border-color:#6d966e;background:#243929;color:#c4f2bd}.is-up{color:var(--bm-red)!important}.is-down{color:var(--bm-green)!important}.is-flat{color:#e5cf9a!important}.hs-bm-advice{font-weight:800}.hs-bm-advice.is-buy{color:#baf3be}.hs-bm-advice.is-wait{color:#ffaaa0}.hs-bm-advice.is-consider{color:#f3d174}.hs-bm-advice.is-neutral{color:#d8d4e4}.hs-bm-plan{color:#e4d2ae;font-size:12px;line-height:1.4}.hs-bm-plan.is-ready{color:#baf3be;font-weight:800}.hs-bm-rule{margin:14px 0 0}.sr-only{position:absolute;width:1px;height:1px;padding:0;margin:-1px;overflow:hidden;clip:rect(0,0,0,0);white-space:nowrap;border:0}.hs-bm button:focus-visible,.hs-bm input:focus-visible{outline:3px solid #ffe19a;outline-offset:3px}
@media (max-width:760px){.hs-bm{padding:12px 0 36px}.hs-bm-wrap{padding:0 8px}.hs-bm-panel{border-width:3px;border-radius:12px}.hs-bm-topbar{grid-template-columns:1fr auto;gap:8px;padding:10px}.hs-bm-sign{grid-row:1;grid-column:1/-1;justify-self:center;width:min(220px,90%)}.hs-bm-sign strong{font-size:20px}.hs-bm-back{grid-row:2}.hs-bm-balance{grid-row:2;gap:5px;padding:7px}.hs-bm-balance span{display:none}.hs-bm-balance input{width:78px;font-size:17px}.hs-bm-overview{padding:18px 11px}.hs-bm-overview-head{align-items:start;flex-direction:column;gap:4px}.hs-bm-overview h1{font-size:26px}.hs-bm-table-wrap{border-radius:6px}.hs-bm-table th,.hs-bm-table td{padding:9px 10px}.hs-bm-table{font-size:12px}}@media (prefers-reduced-motion:reduce){.hs-bm *,.hs-bm *::before,.hs-bm *::after{transition-duration:.01ms!important}}
</style>
