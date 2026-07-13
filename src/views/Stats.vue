<template>
  <section class="section page-section">
    <div class="container narrow-container">
      <p class="eyebrow">Analytics</p>
      <h1>访问统计</h1>
      <p class="section-desc">本页面展示站点实时访问数据，包括访问量、独立访客、热门页面和访问来源。</p>

      <div v-if="loading" class="stats-loading">加载中...</div>

      <template v-else-if="overview">
        <!-- 最近访问（放在最前面） -->
        <div class="stats-block">
          <h2>最近访问记录</h2>
          <div v-if="recentVisits.length === 0" class="stats-empty">暂无数据</div>
          <div v-else class="recent-table-wrap">
            <table class="recent-table">
              <thead>
                <tr>
                  <th>时间</th>
                  <th>IP</th>
                  <th>页面</th>
                  <th>来源地</th>
                  <th>来源</th>
                </tr>
              </thead>
              <tbody>
                <tr v-for="visit in recentVisits" :key="visit.ts + visit.ip + visit.path">
                  <td class="td-time">{{ formatTime(visit.ts) }}</td>
                  <td class="td-ip">{{ formatIp(visit.ip) }}</td>
                  <td class="td-path">{{ formatPath(visit.path) }}</td>
                  <td>{{ formatRegion(visit) }}</td>
                  <td class="td-referer">{{ formatReferer(visit.referer) }}</td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>

        <!-- 概览卡片 -->
        <div class="stats-grid">
          <div class="stat-card">
            <span class="stat-label">今日 PV</span>
            <span class="stat-value">{{ formatNum(overview.todayPv) }}</span>
            <span class="stat-compare" :class="compareClass(overview.todayPv, overview.yesterdayPv)">
              昨日 {{ formatNum(overview.yesterdayPv) }} {{ compareText(overview.todayPv, overview.yesterdayPv) }}
            </span>
          </div>
          <div class="stat-card">
            <span class="stat-label">今日 UV</span>
            <span class="stat-value">{{ formatNum(overview.todayUv) }}</span>
            <span class="stat-compare" :class="compareClass(overview.todayUv, overview.yesterdayUv)">
              昨日 {{ formatNum(overview.yesterdayUv) }} {{ compareText(overview.todayUv, overview.yesterdayUv) }}
            </span>
          </div>
          <div class="stat-card">
            <span class="stat-label">累计 PV</span>
            <span class="stat-value">{{ formatNum(overview.totalPv) }}</span>
          </div>
          <div class="stat-card">
            <span class="stat-label">累计 UV</span>
            <span class="stat-value">{{ formatNum(overview.totalUv) }}</span>
          </div>
        </div>

        <!-- 小时趋势 -->
        <div class="stats-block">
          <h2>今日访问时段分布</h2>
          <div class="hourly-chart">
            <svg :viewBox="`0 0 ${hourly.length * 20 + 20} 140`" preserveAspectRatio="none" class="hourly-svg">
              <g v-for="(h, i) in hourly" :key="i">
                <rect
                  :x="i * 20 + 10"
                  :y="120 - h.count / maxHourly * 100 || 120"
                  width="14"
                  :height="h.count / maxHourly * 100 || 2"
                  rx="3"
                  :fill="h.count === maxHourly && maxHourly > 0 ? 'var(--primary)' : 'var(--line)'"
                >
                  <title>{{ h.hour }}:00 - {{ h.count }} 次访问</title>
                </rect>
              </g>
            </svg>
            <div class="hourly-labels">
              <span v-for="(h, i) in hourly" :key="i" class="hour-label" v-show="i % 3 === 0">{{ h.hour }}</span>
            </div>
          </div>
        </div>

        <!-- 热门页面 -->
        <div class="stats-block">
          <h2>热门页面（近 7 天）</h2>
          <div v-if="topPages.length === 0" class="stats-empty">暂无数据</div>
          <ul v-else class="top-pages-list">
            <li v-for="page in topPages" :key="page.path">
              <span class="page-path">{{ formatPath(page.path) }}</span>
              <div class="page-bar-wrap">
                <div class="page-bar" :style="{ width: (page.count / topPages[0].count * 100) + '%' }"></div>
              </div>
              <span class="page-count">{{ page.count }}</span>
            </li>
          </ul>
        </div>

        <!-- 地域分布 -->
        <div class="stats-block">
          <h2>访问来源（近 7 天）</h2>
          <div v-if="geoDist.length === 0" class="stats-empty">暂无数据</div>
          <ul v-else class="geo-list">
            <li v-for="g in geoDist" :key="g.region">
              <span class="geo-name">{{ g.region || '未知' }}</span>
              <div class="geo-bar-wrap">
                <div class="geo-bar" :style="{ width: (g.count / geoDist[0].count * 100) + '%' }"></div>
              </div>
              <span class="geo-count">{{ g.count }}</span>
            </li>
          </ul>
        </div>

        <p class="stats-updated">数据更新于 {{ formatTime(overview.updatedAt) }}</p>
      </template>

      <template v-else>
        <div class="stats-error">无法加载统计数据，请稍后刷新页面。</div>
      </template>
    </div>
  </section>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue'

const loading = ref(true)
const overview = ref(null)
const topPages = ref([])
const geoDist = ref([])
const recentVisits = ref([])
const hourly = ref(new Array(24).fill(0).map((_, i) => ({ hour: i, count: 0 })))

const maxHourly = computed(() => {
  const m = Math.max(...hourly.value.map(h => h.count))
  return m > 0 ? m : 1
})

const ROUTE_NAMES = {
  '/': '首页',
  '/projects': '项目列表',
  '/vue-apps': 'Vue 项目',
  '/interval-training': '间歇训练数据看板',
  '/countdown': '人生倒计时',
  '/aiops': 'AIOps 智能运维控制台',
  '/crazy-people': '疯狂的人',
  '/worldcup': '世界杯点球大战',
  '/jiangyin': '江阴保卫战',
  '/domino': '多米诺骨牌',
  '/hearthstone': '炉石传说成就',
  '/about': '关于',
  '/stats': '访问统计'
}

function formatPath(path) {
  // 去掉查询参数
  const cleanPath = path.split('?')[0]
  // 去掉尾部斜杠
  const p = cleanPath.replace(/\/$/, '') || '/'
  // 匹配动态路由
  if (p.startsWith('/projects/')) {
    const slug = p.split('/')[2]
    return `项目 / ${slug}`
  }
  return ROUTE_NAMES[p] || p
}

function formatNum(n) {
  if (n == null) return '0'
  return n.toLocaleString('zh-CN')
}

function formatTime(ts) {
  const d = new Date(ts)
  const h = String(d.getHours()).padStart(2, '0')
  const m = String(d.getMinutes()).padStart(2, '0')
  const s = String(d.getSeconds()).padStart(2, '0')
  const today = new Date()
  const isToday = d.toDateString() === today.toDateString()
  if (isToday) return `${h}:${m}:${s}`
  return `${d.getMonth() + 1}/${d.getDate()} ${h}:${m}`
}

function formatRegion(visit) {
  if (!visit.country) return '未知'
  if (visit.country === '内网') return '内网/本地'
  const parts = []
  if (visit.country && visit.country !== '中国') parts.push(visit.country)
  if (visit.region) parts.push(visit.region)
  if (visit.city && visit.city !== visit.region) parts.push(visit.city)
  const loc = parts.join(' ')
  if (visit.isp && visit.isp !== '内网IP') {
    return loc + ' · ' + visit.isp
  }
  return loc
}

function formatIp(ip) {
  if (!ip) return '-'
  // IPv6 本地地址简化显示
  if (ip === '::1' || ip === '::ffff:127.0.0.1') return '本地'
  return ip
}

function formatReferer(referer) {
  if (!referer) return '直接访问'
  try {
    const url = new URL(referer)
    return url.hostname + (url.pathname !== '/' ? url.pathname.slice(0, 30) : '')
  } catch {
    return referer.slice(0, 40)
  }
}

function compareClass(today, yesterday) {
  if (yesterday === 0 && today > 0) return 'up'
  if (today > yesterday) return 'up'
  if (today < yesterday) return 'down'
  return ''
}

function compareText(today, yesterday) {
  if (yesterday === 0 && today > 0) return '↑ 新增'
  if (yesterday === 0) return ''
  const diff = today - yesterday
  if (diff > 0) return `↑ +${diff}`
  if (diff < 0) return `↓ ${diff}`
  return '持平'
}

async function loadData() {
  loading.value = true
  try {
    const [ov, tp, gd, rv, hr] = await Promise.all([
      fetch('/api/stats/overview').then(r => r.json()),
      fetch('/api/stats/pages?days=7').then(r => r.json()),
      fetch('/api/stats/geo?days=7').then(r => r.json()),
      fetch('/api/stats/recent?limit=30').then(r => r.json()),
      fetch('/api/stats/hourly').then(r => r.json())
    ])
    overview.value = ov
    topPages.value = tp
    geoDist.value = gd
    recentVisits.value = rv
    hourly.value = hr
  } catch (e) {
    console.error('加载统计数据失败:', e)
  } finally {
    loading.value = false
  }
}

onMounted(() => {
  loadData()
  // 每 30 秒自动刷新
  setInterval(loadData, 30000)
})
</script>
