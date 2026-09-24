<template>
  <section class="section page-section hs-bm" :data-hs-theme="hsTheme">
    <div class="container hs-bm-wrap">
      <main class="hs-bm-panel">
        <header class="hs-bm-topbar">
          <button type="button" class="hs-bm-back" @click="router.push('/hearthstone')">返回炉石工具</button>
          <div class="hs-bm-sign"><span>流浪者的店</span><strong>黑市</strong></div>
        </header>

        <section class="hs-bm-overview" aria-labelledby="black-market-overview-title">
          <div class="hs-bm-overview-head">
            <div>
              <p>黑市血石计算器</p>
              <h1 id="black-market-overview-title">价格总览</h1>
            </div>
            <div v-if="!marketPlan.hasEnded" class="hs-bm-timer">
              <span>每日 15:00 随机变价，幅度最多 ±15%</span>
              <strong>距下次变价 {{ priceChangeCountdown }}</strong>
            </div>
          </div>
          <dl class="hs-bm-summary" aria-label="剩余商品购买总计">
            <div class="hs-bm-summary-balance"><dt><label for="black-market-bloodstones">我的血石（可编辑）</label></dt><dd><input id="black-market-bloodstones" v-model.number="currentBloodstones" type="number" min="0" step="1" inputmode="numeric"></dd></div>
            <div><dt>未兑换商品总价</dt><dd>{{ formatNumber(marketPlan.totalPrice) }}</dd></div>
            <div><dt>扣除已有血石后还需</dt><dd>{{ formatNumber(marketPlan.remainingBloodstones) }}</dd></div>
            <div><dt>全部买齐约需</dt><dd>{{ marketPlan.daysNeeded }}<small> 天</small></dd></div>
          </dl>
          <p class="hs-bm-deadline" :class="marketPlan.canComplete ? 'is-possible' : 'is-impossible'">
            <strong>活动截止：2026 年 10 月 7 日 0:00（北京时间）</strong>
            <span v-if="!marketPlan.completionDate">奖励已全部兑换</span>
            <span v-else-if="marketPlan.hasEnded">活动已结束，未兑换奖励无法再获取</span>
            <span v-else-if="marketPlan.canComplete">预计 {{ formatPlanDate(marketPlan.completionDate) }} 买齐</span>
            <span v-else>活动截止前买不齐</span>
          </p>
          <div class="hs-bm-table-wrap">
            <table class="hs-bm-table">
              <caption class="sr-only">黑市商品价格总览</caption>
              <thead>
                <tr>
                  <th scope="col">商品</th>
                  <th scope="col">原价</th>
                  <th scope="col">现价</th>
                  <th scope="col">±15% 后</th>
                  <th scope="col">相对首发</th>
                  <th scope="col">血石变化</th>
                  <th scope="col">建议</th>
                  <th scope="col">购买计划</th>
                  <th scope="col">状态</th>
                </tr>
              </thead>
              <tbody>
                <tr v-for="item in marketItems" :key="item.id" :class="{ 'is-exchanged': item.isExchanged }">
                  <th scope="row">{{ item.name }}</th>
                  <td>{{ formatNumber(item.initialPrice) }}<small v-if="item.quantity > 1"> / 份</small></td>
                  <td>
                    <label class="hs-bm-input" :for="`black-market-${item.id}`">
                      <span class="sr-only">{{ item.name }}{{ item.quantity > 1 ? '每包' : '' }}当前价格</span>
                      <input :id="`black-market-${item.id}`" v-model.number="prices[item.id]" type="number" min="0" step="1" inputmode="numeric">
                      <b>{{ item.quantity > 1 ? '血石/包' : '血石' }}</b>
                    </label>
                  </td>
                  <td>
                    <span v-if="item.isExchanged">—</span>
                    <span v-else class="hs-bm-range">
                      <span class="is-down">跌 {{ formatNumber(item.result.lowerPrice) }}</span>
                      <span class="is-up">涨 {{ formatNumber(item.result.upperPrice) }}</span>
                    </span>
                  </td>
                  <td :class="changeClass(item.result?.changePercent)">{{ item.isExchanged ? '—' : formatChangePercent(item.result.changePercent) }}</td>
                  <td :class="changeClass(item.result?.priceDifference)">{{ item.isExchanged ? '—' : formatChange(item.result.priceDifference) }}</td>
                  <td class="hs-bm-advice" :class="`is-${item.advice.level}`">{{ item.isExchanged ? '已兑换' : item.advice.title }}</td>
                  <td class="hs-bm-plan" :class="{ 'is-ready': marketPlan.dates[item.id]?.canBuyNow && !marketPlan.hasEnded, 'is-late': marketPlan.dates[item.id] && !marketPlan.dates[item.id].onTime }">
                    <template v-if="item.isExchanged">已兑换</template>
                    <template v-else-if="marketPlan.hasEnded">活动已结束</template>
                    <template v-else-if="marketPlan.dates[item.id].canBuyNow">可随时兑换</template>
                    <template v-else>还差 {{ formatNumber(marketPlan.dates[item.id].shortfall) }} 血石，约 {{ marketPlan.dates[item.id].daysNeeded }} 天{{ marketPlan.dates[item.id].onTime ? '后可兑换' : '后才够，赶不上截止' }}</template>
                  </td>
                  <td>
                    <label v-if="item.quantity > 1" class="hs-bm-quantity" :for="`black-market-redeemed-${item.id}`">
                      <span>已兑换</span>
                      <select :id="`black-market-redeemed-${item.id}`" v-model.number="redeemedCounts[item.id]">
                        <option v-for="count in item.quantity + 1" :key="count - 1" :value="count - 1">{{ count - 1 }} / {{ item.quantity }} 包</option>
                      </select>
                    </label>
                    <button v-else type="button" class="hs-bm-exchange" :class="{ 'is-active': item.isExchanged }" @click="toggleExchanged(item.id)">{{ item.isExchanged ? '取消标记' : '标记已兑换' }}</button>
                  </td>
                </tr>
              </tbody>
            </table>
          </div>

          <p class="hs-bm-summary-note">按当前价格、现有血石和此后每天获得 900 血石估算；已兑换的商品和卡包不计入。购买计划逐项比较现有血石，买齐日期按全部未兑换商品计算。</p>
          <p class="hs-bm-note">直接修改现价即可查看相对首发的涨跌、血石变化和入手建议。跌 15% 和涨 15% 为以当前价格计算的参考价，四舍五入到整数。黑暗帝国卡包现价按每包填写，剩余价格按未兑换包数计算。</p>
          <p class="hs-bm-rule">建议规则：低于首发价 10% 及以上建议入手；低于首发价但不足 10% 可酌情入手；高于首发价建议观望。</p>
        </section>
      </main>
    </div>
  </section>
</template>

<script setup>
import { computed, onMounted, onUnmounted, ref, watch } from 'vue'
import { useRouter } from 'vue-router'
import { useHearthstoneTheme } from '../composables/useHearthstoneTheme.js'
import { calculateBlackMarketItem, calculateBlackMarketPlan, getBlackMarketAdvice, secondsUntilBlackMarketChange } from '../utils/blackMarket.js'

const STORAGE_KEY = 'hs:black-market'
const now = ref(new Date())
let clockTimer
onMounted(() => { clockTimer = window.setInterval(() => { now.value = new Date() }, 1_000) })
onUnmounted(() => { window.clearInterval(clockTimer) })
const router = useRouter()
const { hsTheme } = useHearthstoneTheme()
const defaults = [
  { id: 'tyrion', name: '异画泰兰·弗丁', initialPrice: 4200, quantity: 1 },
  { id: 'tyrande', name: '牧师皮肤「勇士泰兰德」', initialPrice: 1050, quantity: 1 },
  { id: 'broxigar', name: '布洛克斯加英雄皮肤和卡背图案', initialPrice: 2100, quantity: 1 },
  { id: 'yogg-ramen', name: '法师皮肤「尤格-拉面」', initialPrice: 1050, quantity: 1 },
  { id: 'dark-empire-pack', name: '黑暗帝国的统治卡牌包', initialPrice: 900, quantity: 4 },
  { id: 'fireside-friends', name: '卡背「炉边好友」', initialPrice: 750, quantity: 1 },
  { id: 'golden-standard-pack', name: '金色标准包', initialPrice: 900, quantity: 1 }
]

function readStoredValue() {
  try { return JSON.parse(localStorage.getItem(STORAGE_KEY) || '{}') } catch { return {} }
}

const stored = readStoredValue()
const currentBloodstones = ref(stored.currentBloodstones == null ? 900 : Math.max(0, Number(stored.currentBloodstones) || 0))
const prices = ref(Object.fromEntries(defaults.map((item) => [item.id, Math.max(0, Number(stored.prices?.[item.id]) || item.initialPrice)])))
const exchanged = ref(Object.fromEntries(defaults.map((item) => [item.id, Boolean(stored.exchanged?.[item.id])])))
const redeemedCounts = ref(Object.fromEntries(defaults.filter((item) => item.quantity > 1).map((item) => [
  item.id,
  Math.min(item.quantity, Math.max(0, Math.floor(Number(stored.redeemedCounts?.[item.id] ?? (stored.exchanged?.[item.id] ? item.quantity : 0)) || 0)))
])))
const marketItems = computed(() => defaults.map((item) => {
  const remainingQuantity = item.quantity > 1 ? item.quantity - redeemedCounts.value[item.id] : Number(!exchanged.value[item.id])
  const isExchanged = remainingQuantity === 0
  const currentPrice = Math.max(0, Number(prices.value[item.id]) || 0)
  const result = isExchanged ? null : calculateBlackMarketItem({ ...item, quantity: remainingQuantity, currentPrice, currentBloodstones: currentBloodstones.value })
  return {
    ...item,
    isExchanged,
    remainingQuantity,
    result,
    advice: result ? getBlackMarketAdvice(result.changePercent) : { level: 'neutral', title: '已兑换' }
  }
}).sort((a, b) => Number(a.isExchanged) - Number(b.isExchanged)))
const marketPlan = computed(() => calculateBlackMarketPlan(
  marketItems.value.filter((item) => !item.isExchanged).map((item) => ({ id: item.id, currentTotal: item.result.currentTotal })),
  currentBloodstones.value,
  now.value
))
const priceChangeCountdown = computed(() => {
  const seconds = secondsUntilBlackMarketChange(now.value)
  const hours = String(Math.floor(seconds / 3600)).padStart(2, '0')
  const minutes = String(Math.floor((seconds % 3600) / 60)).padStart(2, '0')
  const remainingSeconds = String(seconds % 60).padStart(2, '0')
  return `${hours}:${minutes}:${remainingSeconds}`
})

watch([currentBloodstones, prices, exchanged, redeemedCounts], () => {
  try { localStorage.setItem(STORAGE_KEY, JSON.stringify({ currentBloodstones: currentBloodstones.value, prices: prices.value, exchanged: exchanged.value, redeemedCounts: redeemedCounts.value })) } catch { /* 本地存储不可用时仍保持页面内结果。 */ }
}, { deep: true })

function toggleExchanged(id) { exchanged.value[id] = !exchanged.value[id] }
function formatNumber(value) { return Math.round(Number(value) || 0).toLocaleString('zh-CN') }
function formatChange(value) { const rounded = Math.round(Number(value) || 0); return `${rounded > 0 ? '+' : ''}${formatNumber(rounded)}` }
function formatChangePercent(value) { const amount = Number(value) || 0; return `${amount > 0 ? '+' : ''}${amount.toFixed(1)}%` }
function formatPlanDate(dateKey) { const [year, month, day] = dateKey.split('-'); return `${year} 年 ${Number(month)} 月 ${Number(day)} 日` }
function changeClass(value) { return value > 0 ? 'is-up' : value < 0 ? 'is-down' : 'is-flat' }
</script>

<style scoped>
.hs-bm { --bm-gold:#d9ac59;--bm-text:#f7eaca;--bm-muted:#c9b996;--bm-red:#ef675a;--bm-green:#83df95;min-height:100vh;padding:28px 0 56px;background:radial-gradient(circle at 50% 0%,#4b3035,#16121a 56%,#0b0a0e);color:var(--bm-text) }.hs-bm-wrap{max-width:1240px;margin:0 auto;padding:0 18px}.hs-bm-panel{overflow:hidden;border:5px solid #171016;border-radius:22px;background:#19151b;box-shadow:0 20px 55px rgba(0,0,0,.55),inset 0 0 0 2px rgba(217,172,89,.48)}
.hs-bm-topbar{display:grid;grid-template-columns:1fr minmax(190px,310px) 1fr;align-items:center;gap:16px;min-height:92px;padding:12px 20px;background:linear-gradient(#342524,#1b1519);border-bottom:3px solid #7f5c32}.hs-bm-back{justify-self:start;min-height:42px;padding:8px 12px;border:1px solid #8e7444;border-radius:7px;background:linear-gradient(#3c343a,#211d23);color:var(--bm-text);font:inherit;font-weight:700;cursor:pointer;transition:transform .18s ease,filter .18s ease}.hs-bm-back:hover{filter:brightness(1.2);transform:translateY(-1px)}.hs-bm-sign{position:relative;padding:8px 22px 10px;border:2px solid #a57b40;border-radius:8px 8px 16px 16px;background:linear-gradient(#d1b476,#75603a);color:#251b18;text-align:center;box-shadow:inset 0 1px rgba(255,244,193,.65),0 4px 0 #1e1614}.hs-bm-sign::after{position:absolute;right:16px;bottom:-13px;left:16px;height:8px;border-radius:0 0 50% 50%;background:#3c2730;content:''}.hs-bm-sign span,.hs-bm-sign strong{display:block}.hs-bm-sign span{font-size:13px;font-weight:700}.hs-bm-sign strong{font-size:24px;letter-spacing:.12em}
.hs-bm-overview{padding:26px;background:radial-gradient(ellipse at 50% 0%,rgba(108,68,37,.4),transparent 45%),#211916}.hs-bm-overview-head{display:flex;justify-content:space-between;align-items:end;gap:16px}.hs-bm-overview-head p{margin:0;color:#d9b86c;font-size:12px;font-weight:800;letter-spacing:.1em}.hs-bm-overview h1{margin:4px 0 0;color:#fff0c4;font:700 30px Georgia,'Microsoft YaHei',serif}.hs-bm-timer span,.hs-bm-note,.hs-bm-rule{color:var(--bm-muted);font-size:12px;line-height:1.65}.hs-bm-note{margin:8px 0 0}.hs-bm-table-wrap{margin-top:16px;overflow-x:auto;border:1px solid rgba(217,172,89,.38);border-radius:9px}.hs-bm-table{width:100%;min-width:1040px;border-collapse:collapse;table-layout:fixed;font-size:13px}.hs-bm-table th,.hs-bm-table td{padding:10px 13px;border-top:1px solid rgba(217,172,89,.18);background:rgba(0,0,0,.16);text-align:left;vertical-align:middle}.hs-bm-table thead th{border-top:0;background:rgba(217,172,89,.12);color:#dfc58e;font-size:11px;font-weight:800}.hs-bm-table tbody th{color:#fff0c4;font-weight:800}.hs-bm-table tbody tr.is-exchanged>*{background:rgba(70,69,70,.34);color:#a99f92}.hs-bm-table th:nth-child(1){width:20%}.hs-bm-table th:nth-child(2){width:7%}.hs-bm-table th:nth-child(3){width:11%}.hs-bm-table th:nth-child(4),.hs-bm-table th:nth-child(5){width:9%}.hs-bm-table th:nth-child(6){width:8%}.hs-bm-table th:nth-child(7){width:15%}.hs-bm-table th:nth-child(8){width:12%}.hs-bm-table small{color:var(--bm-muted);font-size:11px}.hs-bm-input{display:flex;align-items:center;min-width:0;border:1px solid #7c613c;border-radius:5px;background:#17131b}.hs-bm-input input{width:100%;min-width:0;padding:7px;border:0;background:transparent;color:#fff2cf;font:700 14px Georgia,serif;font-variant-numeric:tabular-nums}.hs-bm-input b{padding-right:7px;color:#ee685c;font-size:10px;white-space:nowrap}.hs-bm-exchange{min-height:30px;padding:5px 8px;border:1px solid #88734f;border-radius:4px;background:#2d2928;color:#f0dfb8;font:inherit;font-size:11px;font-weight:700;white-space:nowrap;cursor:pointer}.hs-bm-exchange:hover{filter:brightness(1.18)}.hs-bm-exchange.is-active{border-color:#6d966e;background:#243929;color:#c4f2bd}.is-up{color:var(--bm-red)!important}.is-down{color:var(--bm-green)!important}.is-flat{color:#e5cf9a!important}.hs-bm-advice{font-weight:800}.hs-bm-advice.is-buy{color:#baf3be}.hs-bm-advice.is-wait{color:#ffaaa0}.hs-bm-advice.is-consider{color:#f3d174}.hs-bm-advice.is-neutral{color:#d8d4e4}.hs-bm-rule{margin:14px 0 0}.sr-only{position:absolute;width:1px;height:1px;padding:0;margin:-1px;overflow:hidden;clip:rect(0,0,0,0);white-space:nowrap;border:0}.hs-bm button:focus-visible,.hs-bm input:focus-visible{outline:3px solid #ffe19a;outline-offset:3px}
.hs-bm-timer{display:grid;justify-items:end;gap:4px;text-align:right}.hs-bm-timer strong{color:#fff0c4;font:700 17px Georgia,serif;font-variant-numeric:tabular-nums}
.hs-bm-summary{display:grid;grid-template-columns:repeat(4,minmax(0,1fr));gap:12px;margin:16px 0 0}.hs-bm-summary>div{min-width:0;padding:14px 16px;border:1px solid rgba(217,172,89,.38);border-radius:8px;background:linear-gradient(135deg,rgba(106,71,43,.3),rgba(18,15,19,.62))}.hs-bm-summary>div.hs-bm-summary-balance{border-color:rgba(239,103,90,.55);background:linear-gradient(135deg,rgba(117,42,37,.55),rgba(40,22,24,.75))}.hs-bm-summary dt{color:var(--bm-muted);font-size:12px}.hs-bm-summary dd{margin:7px 0 0;color:#fff0c4;font:700 25px Georgia,'Microsoft YaHei',serif;font-variant-numeric:tabular-nums}.hs-bm-summary dd small{color:#dfc58e;font-size:12px}.hs-bm-summary-balance dd{display:flex;align-items:baseline;gap:4px}.hs-bm-summary-balance input{width:100%;min-width:0;border:0;background:transparent;color:#fff0c4;font:inherit;font-variant-numeric:tabular-nums}.hs-bm-summary-balance input:focus-visible{outline:3px solid #ffe19a;outline-offset:3px}.hs-bm-summary-note{margin:12px 0 0;color:var(--bm-muted);font-size:12px;line-height:1.5}
.hs-bm-deadline{display:flex;flex-wrap:wrap;gap:5px 14px;align-items:center;margin:12px 0 0;padding:10px 14px;border:1px solid;border-radius:7px;font-size:13px;line-height:1.5}.hs-bm-deadline.is-possible{border-color:rgba(131,223,149,.45);background:rgba(42,90,50,.22);color:#baf3be}.hs-bm-deadline.is-impossible{border-color:rgba(239,103,90,.45);background:rgba(105,39,35,.22);color:#ffaaa0}.hs-bm-deadline strong{color:#fff0c4}
.hs-bm-table{min-width:1100px}.hs-bm-table th:nth-child(1){width:19%}.hs-bm-table th:nth-child(2){width:7%}.hs-bm-table th:nth-child(3),.hs-bm-table th:nth-child(4){width:11%}.hs-bm-table th:nth-child(5),.hs-bm-table th:nth-child(7){width:8%}.hs-bm-table th:nth-child(6){width:9%}.hs-bm-table th:nth-child(8){width:15%}.hs-bm-table th:nth-child(9){width:12%}.hs-bm-range{display:grid;gap:3px;white-space:nowrap;font-variant-numeric:tabular-nums}.hs-bm-plan{font-size:12px;line-height:1.4}.hs-bm-plan.is-ready{color:#baf3be}.hs-bm-plan.is-late{color:#ffaaa0}.hs-bm-quantity{display:grid;gap:4px;color:var(--bm-muted);font-size:11px}.hs-bm-quantity select{width:100%;min-height:30px;padding:4px;border:1px solid #88734f;border-radius:4px;background:#2d2928;color:#f0dfb8;font:inherit;font-size:12px}.hs-bm select:focus-visible{outline:3px solid #ffe19a;outline-offset:3px}
@media (max-width:760px){.hs-bm-timer{justify-items:start;text-align:left}.hs-bm-summary{grid-template-columns:repeat(2,minmax(0,1fr));gap:8px}.hs-bm-summary>div{padding:10px 13px}.hs-bm-summary dd{margin-top:3px;font-size:21px}}
@media (max-width:760px){.hs-bm{padding:12px 0 36px}.hs-bm-wrap{padding:0 8px}.hs-bm-panel{border-width:3px;border-radius:12px}.hs-bm-topbar{grid-template-columns:1fr auto;gap:8px;padding:10px}.hs-bm-sign{grid-row:1;grid-column:1/-1;justify-self:center;width:min(220px,90%)}.hs-bm-sign strong{font-size:20px}.hs-bm-back{grid-row:2}.hs-bm-overview{padding:18px 11px}.hs-bm-overview-head{align-items:start;flex-direction:column;gap:4px}.hs-bm-overview h1{font-size:26px}.hs-bm-table-wrap{border-radius:6px}.hs-bm-table th,.hs-bm-table td{padding:9px 10px}.hs-bm-table{font-size:12px}}@media (prefers-reduced-motion:reduce){.hs-bm *,.hs-bm *::before,.hs-bm *::after{transition-duration:.01ms!important}}
</style>
