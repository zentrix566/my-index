<script setup>
import { computed, onMounted, onUnmounted, ref, watch } from 'vue'

const systems = [
  '安全管理系统',
  '项目管理系统',
  '人力管理系统',
  '财务管理系统'
]

const themes = [
  { name: '清爽白', value: 'clean' },
  { name: '深空蓝', value: 'midnight' }
]

const severityMeta = {
  致命: { color: 'red', weight: 26 },
  预警: { color: 'yellow', weight: 12 },
  提醒: { color: 'blue', weight: 5 },
  通知: { color: 'purple', weight: 2 }
}

const systemProfiles = {
  安全管理系统: {
    owner: 'zentrix566',
    lastChange: '2026-05-29 13:18 更新认证策略与防火墙访问控制',
    duty: '负责统一认证、边界访问、审计日志和安全策略联动'
  },
  项目管理系统: {
    owner: 'zentrix566',
    lastChange: '2026-05-29 10:26 调整里程碑同步任务',
    duty: '负责项目进度、任务协作、里程碑和资源协调'
  },
  人力管理系统: {
    owner: 'zentrix566',
    lastChange: '2026-05-28 18:12 发布考勤导入模板',
    duty: '负责人事档案、考勤、薪酬基础数据和组织架构'
  },
  财务管理系统: {
    owner: 'zentrix566',
    lastChange: '2026-05-29 08:40 调整凭证归档批处理窗口',
    duty: '负责凭证、预算、报销、账务归档和月末报表'
  }
}

const alarmRecords = [
  {
    id: 1,
    system: '安全管理系统',
    severity: '预警',
    description: '边界防火墙出现异常登录尝试，来源地址访问频率超过策略阈值。',
    event: '异常登录拦截',
    ip: '192.168.145.172',
    status: '待响应',
    time: '2026-05-29 14:06:55'
  },
  {
    id: 2,
    system: '安全管理系统',
    severity: '致命',
    description: '核心认证服务连续失败，影响统一登录和权限校验链路。',
    event: '认证服务不可用',
    ip: '192.168.145.96',
    status: '处理中',
    time: '2026-05-29 13:42:18'
  },
  {
    id: 3,
    system: '项目管理系统',
    severity: '提醒',
    description: '项目里程碑同步延迟，部分任务状态未及时刷新。',
    event: '任务同步延迟',
    ip: '10.20.8.31',
    status: '处理中',
    time: '2026-05-29 11:28:09'
  },
  {
    id: 4,
    system: '人力管理系统',
    severity: '通知',
    description: '考勤数据导入完成，存在少量重复记录等待人工确认。',
    event: '考勤导入提示',
    ip: '10.40.2.18',
    status: '处理完成',
    time: '2026-05-29 09:13:44'
  },
  {
    id: 5,
    system: '财务管理系统',
    severity: '预警',
    description: '凭证归档队列积压，可能影响月末报表生成时效。',
    event: '归档队列积压',
    ip: '10.30.6.82',
    status: '待响应',
    time: '2026-05-29 08:55:26'
  }
]

const selectedSystem = ref(systems[0])
const activeTheme = ref('clean')
const selectedSeverity = ref('全部')
const now = ref(new Date())
const question = ref('')
const assistantMessages = ref([])
const isAsking = ref(false)
const assistantError = ref('')
const isAnalyzing = ref(false)
const analysisError = ref('')
const analysisResult = ref(null)
const refreshedAt = ref('')
const showProfileDialog = ref(false)

const currentSystemAlarms = computed(() => {
  return alarmRecords.filter((alarm) => alarm.system === selectedSystem.value)
})

const systemProfile = computed(() => systemProfiles[selectedSystem.value])

const severityTabs = computed(() => {
  const tabs = ['全部', '致命', '预警', '提醒', '通知']
  return tabs.map((label) => ({
    label,
    count: label === '全部'
      ? currentSystemAlarms.value.length
      : currentSystemAlarms.value.filter((alarm) => alarm.severity === label).length
  }))
})

const filteredAlarms = computed(() => {
  if (selectedSeverity.value === '全部') {
    return currentSystemAlarms.value
  }

  return currentSystemAlarms.value.filter((alarm) => alarm.severity === selectedSeverity.value)
})

const alertLevels = computed(() => {
  return ['致命', '预警', '提醒', '通知'].map((label) => ({
    label,
    count: currentSystemAlarms.value.filter((alarm) => alarm.severity === label).length,
    ...severityMeta[label]
  }))
})

const health = computed(() => {
  const totalImpact = alertLevels.value.reduce((sum, item) => sum + item.count * item.weight, 0)
  return Math.max(0, Math.min(100, 100 - totalImpact))
})

const activeAlarmSummary = computed(() => {
  if (!currentSystemAlarms.value.length) {
    return '当前系统暂无活动告警。'
  }

  return currentSystemAlarms.value
    .map((alarm) => `${alarm.severity}-${alarm.event}-${alarm.ip}-${alarm.status}`)
    .join('；')
})

const deepSeekReady = computed(() => {
  const key = import.meta.env.VITE_DEEPSEEK_API_KEY || ''
  return Boolean(key && !key.includes('请替换'))
})

const dateText = computed(() => {
  return new Intl.DateTimeFormat('zh-CN', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    weekday: 'short'
  }).format(now.value)
})

const timeText = computed(() => {
  return new Intl.DateTimeFormat('zh-CN', {
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12: false
  }).format(now.value)
})

function formatDateTime(date = new Date()) {
  return new Intl.DateTimeFormat('zh-CN', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12: false
  }).format(date)
}

function get_host_workload(system) {
  const base = system === '安全管理系统' ? 4.82 : 2.16
  return {
    name: 'get_host_workload',
    title: '获取主机负载',
    value: `${base}`,
    unit: 'load',
    detail: '5 分钟平均负载高于近期基线，认证链路存在排队迹象。'
  }
}

function get_host_cpu(system) {
  return {
    name: 'get_host_cpu',
    title: '获取 CPU 使用率',
    value: system === '安全管理系统' ? '83.6' : '46.8',
    unit: '%',
    detail: '单核 CPU 负载偏高，iowait 随磁盘写入增加而上升。'
  }
}

function get_host_env(system) {
  return {
    name: 'get_host_env',
    title: '获取进程个数',
    value: system === '安全管理系统' ? '318' : '176',
    unit: '个',
    detail: '认证、审计、日志采集相关进程数高于日常水平。'
  }
}

function get_host_disk(system) {
  return {
    name: 'get_host_disk',
    title: '获取磁盘数据',
    value: system === '安全管理系统' ? '91.2' : '68.4',
    unit: '%',
    detail: '审计日志分区空间接近阈值，可能拖慢认证日志写入。'
  }
}

function collectMcpEvidence(system) {
  return [
    get_host_workload(system),
    get_host_cpu(system),
    get_host_env(system),
    get_host_disk(system)
  ]
}

function buildMetrics(evidence) {
  const workload = Number(evidence.find((item) => item.name === 'get_host_workload')?.value || 0)
  const cpu = Number(evidence.find((item) => item.name === 'get_host_cpu')?.value || 0)
  const disk = Number(evidence.find((item) => item.name === 'get_host_disk')?.value || 0)

  return [
    { label: '5分钟平均负载', value: workload.toFixed(2), status: workload > 4 ? '偏高' : '正常' },
    { label: '单核 CPU 负载', value: (workload / 1.6).toFixed(2), status: workload > 4 ? '偏高' : '正常' },
    { label: '等待 I/O 进程数', value: workload > 4 ? '17' : '4', status: workload > 4 ? '偏高' : '正常' },
    { label: 'CPU iowait', value: cpu > 80 ? '18.4%' : '5.6%', status: cpu > 80 ? '偏高' : '正常' },
    { label: '磁盘空间使用率', value: `${disk.toFixed(1)}%`, status: disk > 85 ? '预警' : '正常' }
  ]
}

function buildAnalysisResult(aiSummary = '') {
  const evidence = collectMcpEvidence(selectedSystem.value)
  const metrics = buildMetrics(evidence)
  const primaryAlarm = currentSystemAlarms.value[0]
  const criticalAlarm = currentSystemAlarms.value.find((alarm) => alarm.severity === '致命') || primaryAlarm

  return {
    source: aiSummary ? 'DeepSeek + MCP' : '本地演示分析 + MCP',
    generatedAt: formatDateTime(),
    aiSummary: aiSummary || '监控数据显示主机负载、CPU iowait 和磁盘空间同时偏高，结合活动告警判断，当前风险集中在认证链路与审计日志写入路径。',
    rootCauses: [
      {
        title: criticalAlarm ? criticalAlarm.event : '暂无明确根因',
        confidence: criticalAlarm?.severity === '致命' ? 92 : 76,
        relevance: criticalAlarm?.severity === '致命' ? 88 : 72,
        detail: criticalAlarm
          ? `${criticalAlarm.ip} 的 ${criticalAlarm.event} 与高负载、磁盘写入等待存在强相关。`
          : '当前没有活动告警，根因定位保持观察。'
      },
      {
        title: '审计日志写入积压',
        confidence: 84,
        relevance: 79,
        detail: '磁盘空间使用率接近阈值，日志写入延迟可能放大认证服务响应时间。'
      }
    ],
    metrics,
    timeline: [
      { time: '13:18:00', title: '最近变更', detail: systemProfile.value.lastChange },
      { time: '13:42:18', title: '致命告警触发', detail: criticalAlarm ? criticalAlarm.description : '暂无致命告警。' },
      { time: '14:06:55', title: '预警持续', detail: primaryAlarm ? primaryAlarm.description : '当前没有新的预警。' },
      { time: timeText.value, title: '全量分析完成', detail: 'MCP 证据已汇总，AI 分析结果已生成。' }
    ],
    recommendations: [
      {
        title: '立即处置',
        items: ['优先检查认证服务实例状态，确认是否存在重启、线程池耗尽或连接池阻塞。', '清理或扩容审计日志分区，避免日志写入继续拖慢认证链路。']
      },
      {
        title: '短期缓解',
        items: ['临时收紧异常登录来源 IP 的访问策略。', '将认证服务流量切换到健康节点，并观察 5 分钟平均负载变化。']
      },
      {
        title: '复盘沉淀',
        items: ['把本次告警、MCP 证据和处置过程沉淀为知识条目。', '为磁盘空间和 iowait 增加组合告警规则。']
      }
    ],
    evidence
  }
}

async function callDeepSeekForAnalysis(evidence) {
  if (!deepSeekReady.value) {
    return ''
  }

  const prompt = [
    `当前系统：${selectedSystem.value}`,
    `系统画像：负责人 ${systemProfile.value.owner}；最近变更 ${systemProfile.value.lastChange}`,
    `活动告警：${activeAlarmSummary.value}`,
    `MCP 证据：${evidence.map((item) => `${item.name}=${item.value}${item.unit}`).join('；')}`,
    '请用 80 字以内给出 AIOps 根因分析摘要，直接给结论。'
  ].join('\n')

  const response = await fetch(`${import.meta.env.VITE_DEEPSEEK_BASE_URL}/chat/completions`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${import.meta.env.VITE_DEEPSEEK_API_KEY}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      model: import.meta.env.VITE_DEEPSEEK_MODEL,
      messages: [{ role: 'user', content: prompt }],
      temperature: 0.2,
      max_tokens: 180
    })
  })

  if (!response.ok) {
    throw new Error(`DeepSeek 返回 ${response.status}`)
  }

  const data = await response.json()
  return data?.choices?.[0]?.message?.content || ''
}

function buildAssistantContext() {
  const evidence = analysisResult.value?.evidence || collectMcpEvidence(selectedSystem.value)
  return [
    `当前系统：${selectedSystem.value}`,
    `系统画像：主要负责人 ${systemProfile.value.owner}；最近变更 ${systemProfile.value.lastChange}；职责 ${systemProfile.value.duty}`,
    `活动告警：${activeAlarmSummary.value}`,
    `已生成分析：${analysisResult.value?.aiSummary || '暂未生成全量分析'}`,
    `MCP 证据：${evidence.map((item) => `${item.name}=${item.value}${item.unit}，${item.detail}`).join('；')}`
  ].join('\n')
}

function escapeHtml(value) {
  return value
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#039;')
}

function renderInlineMarkdown(value) {
  return escapeHtml(value)
    .replace(/`([^`]+)`/g, '<code>$1</code>')
    .replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>')
}

function renderMarkdown(value) {
  const lines = value.split('\n')
  const html = []
  let listOpen = false
  let codeOpen = false
  let codeLines = []

  function closeList() {
    if (listOpen) {
      html.push('</ul>')
      listOpen = false
    }
  }

  function closeCode() {
    if (codeOpen) {
      html.push(`<pre><code>${escapeHtml(codeLines.join('\n'))}</code></pre>`)
      codeLines = []
      codeOpen = false
    }
  }

  for (const line of lines) {
    if (line.trim().startsWith('```')) {
      if (codeOpen) {
        closeCode()
      } else {
        closeList()
        codeOpen = true
      }
      continue
    }

    if (codeOpen) {
      codeLines.push(line)
      continue
    }

    const trimmed = line.trim()

    if (!trimmed) {
      closeList()
      continue
    }

    const heading = trimmed.match(/^(#{1,3})\s+(.+)$/)
    if (heading) {
      closeList()
      const level = heading[1].length + 2
      html.push(`<h${level}>${renderInlineMarkdown(heading[2])}</h${level}>`)
      continue
    }

    const listItem = trimmed.match(/^[-*]\s+(.+)$/)
    if (listItem) {
      if (!listOpen) {
        html.push('<ul>')
        listOpen = true
      }
      html.push(`<li>${renderInlineMarkdown(listItem[1])}</li>`)
      continue
    }

    closeList()
    html.push(`<p>${renderInlineMarkdown(trimmed)}</p>`)
  }

  closeCode()
  closeList()
  return html.join('')
}

async function askAssistant() {
  const content = question.value.trim()
  if (!content || isAsking.value) {
    return
  }

  assistantError.value = ''
  isAsking.value = true
  assistantMessages.value.push({ role: 'user', content })
  question.value = ''

  try {
    if (!deepSeekReady.value) {
      throw new Error('DeepSeek API Key 未配置')
    }

    const response = await fetch(`${import.meta.env.VITE_DEEPSEEK_BASE_URL}/chat/completions`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${import.meta.env.VITE_DEEPSEEK_API_KEY}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        model: import.meta.env.VITE_DEEPSEEK_MODEL,
        messages: [
          {
            role: 'system',
            content: '你是 AIOps 智能助手。回答要结合提供的系统、告警、分析和 MCP 证据上下文，给出演示项目可读的中文结论。'
          },
          {
            role: 'user',
            content: `${buildAssistantContext()}\n\n用户问题：${content}`
          }
        ],
        temperature: 0.3,
        max_tokens: 600
      })
    })

    if (!response.ok) {
      throw new Error(`DeepSeek 返回 ${response.status}`)
    }

    const data = await response.json()
    const answer = data?.choices?.[0]?.message?.content || '已收到问题，但暂未生成有效回复。'
    assistantMessages.value.push({ role: 'assistant', content: answer })
  } catch (error) {
    assistantError.value = `助手请求失败：${error.message}`
    assistantMessages.value.push({
      role: 'assistant',
      content: '当前浏览器直连 AI 接口未成功。演示建议：先查看全量分析结果，并按根因定位、影响指标和 MCP 证据逐项排查。'
    })
  } finally {
    isAsking.value = false
  }
}

async function runFullAnalysis() {
  isAnalyzing.value = true
  analysisError.value = ''
  const evidence = collectMcpEvidence(selectedSystem.value)

  try {
    const aiSummary = await callDeepSeekForAnalysis(evidence)
    analysisResult.value = buildAnalysisResult(aiSummary)
  } catch (error) {
    analysisResult.value = buildAnalysisResult('')
    analysisError.value = `DeepSeek 浏览器直连未成功，已使用演示分析兜底：${error.message}`
  } finally {
    isAnalyzing.value = false
  }
}

function refreshAlarms() {
  refreshedAt.value = formatDateTime()
}

watch(selectedSystem, () => {
  selectedSeverity.value = '全部'
  analysisResult.value = null
  analysisError.value = ''
  showProfileDialog.value = false
})

let timer

onMounted(() => {
  timer = window.setInterval(() => {
    now.value = new Date()
  }, 1000)
})

onUnmounted(() => {
  window.clearInterval(timer)
})
</script>

<template>
  <main class="aiops-console" :data-theme="activeTheme">
    <header class="topbar">
      <section class="brand-block" aria-label="产品信息">
        <div class="brand-mark">AI</div>
        <div>
          <p class="brand-title">AI Alert</p>
          <p class="brand-subtitle">演示级智能运维平台</p>
        </div>
      </section>

      <nav class="module-tabs" aria-label="模块导航">
        <button class="tab-button active" type="button">
          <span>告警分析</span>
          <strong>{{ currentSystemAlarms.length }}</strong>
        </button>
        <button class="tab-button" type="button">知识沉淀</button>
      </nav>

      <section class="system-picker" aria-label="系统选择">
        <label for="system">系统</label>
        <select id="system" v-model="selectedSystem">
          <option v-for="system in systems" :key="system" :value="system">
            {{ system }}
          </option>
        </select>
      </section>

      <section class="alert-summary" aria-label="告警概览">
        <article
          v-for="item in alertLevels"
          :key="item.label"
          class="alert-stat"
          :class="`is-${item.color}`"
        >
          <strong>{{ item.count }}</strong>
          <span>{{ item.label }}</span>
        </article>
        <article class="health-stat">
          <strong>{{ health }}%</strong>
          <span>健康度</span>
        </article>
      </section>

      <section class="right-tools" aria-label="用户工具">
        <div class="clock-block">
          <span>{{ dateText }}</span>
          <strong>{{ timeText }}</strong>
        </div>

        <label class="theme-select" for="theme">
          <span>主题</span>
          <select id="theme" v-model="activeTheme">
            <option v-for="theme in themes" :key="theme.value" :value="theme.value">
              {{ theme.name }}
            </option>
          </select>
        </label>

        <div class="ai-status" :class="{ ready: deepSeekReady }">
          {{ deepSeekReady ? 'DeepSeek 已配置' : 'DeepSeek 待配置' }}
        </div>

        <section class="user-panel" aria-label="登录账号">
          <div class="avatar">管</div>
          <div>
            <span>admin</span>
            <strong>演示账号</strong>
          </div>
        </section>
      </section>
    </header>

    <section class="workspace-preview">
      <aside class="alarm-list">
        <div class="side-title">
          <strong>告警列表</strong>
          <span>{{ currentSystemAlarms.length }}</span>
        </div>

        <div class="severity-tabs" aria-label="告警级别筛选">
          <button
            v-for="tab in severityTabs"
            :key="tab.label"
            type="button"
            :class="{ active: selectedSeverity === tab.label }"
            @click="selectedSeverity = tab.label"
          >
            <span>{{ tab.label }}</span>
            <strong>{{ tab.count }}</strong>
          </button>
        </div>

        <div class="alarm-scroll">
          <article
            v-for="alarm in filteredAlarms"
            :key="alarm.id"
            class="alarm-item"
            :class="[`is-${severityMeta[alarm.severity].color}`, { active: alarm.status !== '处理完成' }]"
          >
            <div class="alarm-head">
              <span class="severity-badge">{{ alarm.severity }}</span>
              <strong>{{ alarm.event }}</strong>
            </div>
            <p>{{ alarm.description }}</p>
            <dl>
              <div>
                <dt>事件</dt>
                <dd>{{ alarm.event }}</dd>
              </div>
              <div>
                <dt>IP</dt>
                <dd>{{ alarm.ip }}</dd>
              </div>
              <div>
                <dt>响应</dt>
                <dd>{{ alarm.status }}</dd>
              </div>
            </dl>
            <time>{{ alarm.time }}</time>
          </article>

          <div v-if="!filteredAlarms.length" class="empty-alarm">
            当前筛选下暂无告警
          </div>
        </div>
      </aside>

      <section class="analysis-panel">
        <section class="analysis-command-card">
          <div>
            <span>AI 智能分析</span>
            <h1>{{ selectedSystem }}</h1>
            <p>选择系统画像查看基础信息，刷新告警更新当前列表，全量分析会获取全部告警和监控数据并生成下方结果。</p>
          </div>
          <div class="analysis-actions">
            <button class="ghost-button" type="button" @click="showProfileDialog = true">系统画像</button>
            <button class="ghost-button" type="button" @click="refreshAlarms">刷新告警</button>
            <button type="button" :disabled="isAnalyzing" @click="runFullAnalysis">
              {{ isAnalyzing ? '分析中...' : '全量分析' }}
            </button>
          </div>
        </section>

        <section v-if="!analysisResult" class="analysis-empty-state">
          <strong>等待全量分析</strong>
          <p>点击“全量分析”后，将获取告警、监控指标和 MCP 补充证据，并生成根因定位、影响指标、事件时间线和处置建议。</p>
        </section>

        <template v-else>
        <section class="analysis-card call-chain-card">
          <div class="section-title">
            <span>调用链路</span>
            <strong>告警源 → {{ selectedSystem }} → MCP/AI 分析</strong>
          </div>
          <div class="chain-line">
            <div>告警源</div>
            <span></span>
            <div>{{ selectedSystem }}</div>
            <span></span>
            <div>MCP/AI 分析</div>
          </div>
        </section>

        <section class="analysis-card root-card">
          <div class="section-title">
            <span>根因定位</span>
            <strong>{{ analysisResult?.source }}</strong>
          </div>
          <p class="ai-summary">{{ analysisResult?.aiSummary }}</p>
          <p v-if="analysisError" class="analysis-warning">{{ analysisError }}</p>
          <article v-for="cause in analysisResult?.rootCauses" :key="cause.title" class="cause-item">
            <div>
              <strong>{{ cause.title }}</strong>
              <p>{{ cause.detail }}</p>
            </div>
            <div class="score-pair">
              <span>置信度 {{ cause.confidence }}%</span>
              <span>相关性 {{ cause.relevance }}%</span>
            </div>
          </article>
        </section>

        <section class="analysis-card">
          <div class="section-title">
            <span>影响指标</span>
            <strong>监控数据快照</strong>
          </div>
          <div class="metric-grid">
            <article v-for="metric in analysisResult?.metrics" :key="metric.label" class="metric-card">
              <span>{{ metric.label }}</span>
              <strong>{{ metric.value }}</strong>
              <em>{{ metric.status }}</em>
            </article>
          </div>
        </section>

        <section class="analysis-card">
          <div class="section-title">
            <span>事件时间线</span>
            <strong>从最初到最新</strong>
          </div>
          <ol class="timeline-list">
            <li v-for="item in analysisResult?.timeline" :key="`${item.time}-${item.title}`">
              <time>{{ item.time }}</time>
              <div>
                <strong>{{ item.title }}</strong>
                <p>{{ item.detail }}</p>
              </div>
            </li>
          </ol>
        </section>

        <section class="analysis-card">
          <div class="section-title">
            <span>处置建议</span>
            <strong>AI 分块建议</strong>
          </div>
          <div class="recommend-grid">
            <article v-for="group in analysisResult?.recommendations" :key="group.title">
              <strong>{{ group.title }}</strong>
              <p v-for="item in group.items" :key="item">{{ item }}</p>
            </article>
          </div>
        </section>

        <section class="analysis-card evidence-card">
          <div class="section-title">
            <span>MCP 补充证据</span>
            <strong>{{ analysisResult?.generatedAt }}</strong>
          </div>
          <article v-for="item in analysisResult?.evidence" :key="item.name">
            <div>
              <strong>{{ item.name }}</strong>
              <span>{{ item.title }}</span>
            </div>
            <p>{{ item.value }}{{ item.unit }}</p>
            <em>{{ item.detail }}</em>
          </article>
          <small v-if="refreshedAt">最近刷新告警：{{ refreshedAt }}</small>
        </section>
        </template>
      </section>

      <aside class="assistant-panel" aria-label="AI 智能助手">
        <div class="assistant-title">
          <div>
            <span>AI</span>
            <strong>智能助手</strong>
          </div>
          <button type="button" aria-label="展开助手">□</button>
        </div>

        <div class="assistant-message">
          欢迎来到 {{ selectedSystem }}，可以直接提问，我会自动带上当前系统、活动告警、已生成分析和 MCP 证据上下文。
        </div>

        <div class="context-box">
          <span>当前上下文</span>
          <p>{{ activeAlarmSummary }}</p>
          <p v-if="analysisResult">分析摘要：{{ analysisResult.aiSummary }}</p>
        </div>

        <div v-if="assistantMessages.length" class="assistant-chat">
          <article
            v-for="(message, index) in assistantMessages"
            :key="`${message.role}-${index}`"
            :class="message.role"
          >
            <span>{{ message.role === 'user' ? '我' : 'AI' }}</span>
            <div
              v-if="message.role === 'assistant'"
              class="markdown-body"
              v-html="renderMarkdown(message.content)"
            />
            <p v-else>{{ message.content }}</p>
          </article>
        </div>

        <p v-if="assistantError" class="assistant-error">{{ assistantError }}</p>

        <label class="question-box" for="question">
          <span>直接提问</span>
          <div class="question-input-row">
            <textarea
              id="question"
              v-model="question"
              rows="4"
              placeholder="例如：请分析当前告警的根因和处置建议"
              @keydown.ctrl.enter.prevent="askAssistant"
            />
            <button
              class="send-icon-button"
              type="button"
              aria-label="发送问题"
              :disabled="isAsking || !question.trim()"
              @click="askAssistant"
            >
              {{ isAsking ? '…' : '➜' }}
            </button>
          </div>
        </label>
      </aside>
    </section>

    <div v-if="showProfileDialog" class="dialog-backdrop" @click.self="showProfileDialog = false">
      <section class="profile-dialog" role="dialog" aria-modal="true" aria-labelledby="profile-title">
        <div class="dialog-heading">
          <div>
            <span>系统画像</span>
            <h2 id="profile-title">{{ selectedSystem }}</h2>
          </div>
          <button type="button" aria-label="关闭系统画像" @click="showProfileDialog = false">×</button>
        </div>
        <div class="dialog-grid">
          <article>
            <span>主要负责人</span>
            <strong>{{ systemProfile.owner }}</strong>
          </article>
          <article>
            <span>最近变更</span>
            <strong>{{ systemProfile.lastChange }}</strong>
          </article>
          <article class="dialog-wide">
            <span>系统职责</span>
            <p>{{ systemProfile.duty }}</p>
          </article>
          <article class="dialog-wide">
            <span>当前分析输入</span>
            <p>{{ activeAlarmSummary }}</p>
          </article>
        </div>
      </section>
    </div>
  </main>
</template>


<style scoped>
.aiops-console {
  --bg: #eef3fb;
  --panel: #ffffff;
  --panel-soft: #f7f9fd;
  --line: #d8e0ef;
  --text: #172033;
  --muted: #718096;
  --primary: #246bfe;
  --primary-soft: #e9f0ff;
  min-height: 100vh;
  background:
    linear-gradient(90deg, rgba(36, 107, 254, 0.08), transparent 38%),
    var(--bg);
  color: var(--text);
}

.aiops-console[data-theme="midnight"] {
  --bg: #111827;
  --panel: #172133;
  --panel-soft: #202b3f;
  --line: #324159;
  --text: #edf4ff;
  --muted: #9cadc6;
  --primary: #65a9ff;
  --primary-soft: #203756;
}

.aiops-console[data-theme="clean"] {
  --bg: #f7f9fc;
  --panel: #ffffff;
  --panel-soft: #fbfcff;
  --line: #dde4ef;
  --text: #1d2738;
  --muted: #637083;
  --primary: #1677ff;
  --primary-soft: #edf5ff;
}

.topbar {
  min-height: 74px;
  display: grid;
  grid-template-columns: 210px 210px minmax(260px, 360px) minmax(310px, 380px) minmax(420px, 1fr);
  align-items: center;
  gap: 14px;
  padding: 10px 16px;
  border-bottom: 1px solid var(--line);
  background: color-mix(in srgb, var(--panel) 92%, transparent);
  box-shadow: 0 8px 30px rgba(18, 38, 77, 0.06);
  position: sticky;
  top: 0;
  z-index: 10;
}

.brand-block,
.module-tabs,
.system-picker,
.alert-summary,
.right-tools,
.user-panel,
.theme-select {
  display: flex;
  align-items: center;
}

.brand-block {
  gap: 10px;
  min-width: 0;
}

.brand-mark {
  width: 34px;
  height: 34px;
  border-radius: 8px;
  display: grid;
  place-items: center;
  background: linear-gradient(145deg, #15233d, #0c101a);
  color: #53f0c1;
  font-weight: 800;
  box-shadow: inset 0 0 0 1px rgba(255, 255, 255, 0.2);
}

.brand-title,
.brand-subtitle {
  margin: 0;
  white-space: nowrap;
}

.brand-title {
  font-size: 18px;
  font-weight: 800;
}

.brand-subtitle {
  color: var(--muted);
  font-size: 12px;
}

.module-tabs {
  height: 44px;
  gap: 6px;
}

.tab-button {
  height: 38px;
  border: 0;
  border-bottom: 2px solid transparent;
  background: transparent;
  color: var(--muted);
  padding: 0 12px;
  cursor: pointer;
  display: inline-flex;
  align-items: center;
  gap: 6px;
}

.tab-button.active {
  color: var(--primary);
  border-color: var(--primary);
  font-weight: 700;
}

.tab-button strong {
  min-width: 20px;
  height: 20px;
  border-radius: 999px;
  display: grid;
  place-items: center;
  background: #ffe6eb;
  color: #ef476f;
  font-size: 12px;
}

.system-picker {
  gap: 8px;
  min-width: 0;
}

.system-picker label {
  flex: 0 0 auto;
  min-width: 32px;
  color: var(--muted);
  font-size: 13px;
  white-space: nowrap;
}

select {
  height: 36px;
  min-width: 0;
  border: 1px solid var(--line);
  border-radius: 6px;
  background: var(--panel-soft);
  color: var(--text);
  padding: 0 34px 0 10px;
  outline: none;
}

select:focus,
textarea:focus {
  border-color: var(--primary);
  box-shadow: 0 0 0 3px color-mix(in srgb, var(--primary) 18%, transparent);
}

.system-picker select {
  width: 100%;
}

.alert-summary {
  justify-content: center;
  gap: 10px;
}

.alert-stat,
.health-stat {
  width: 58px;
  min-height: 46px;
  display: grid;
  place-items: center;
  align-content: center;
  border-right: 1px solid var(--line);
}

.alert-stat strong,
.health-stat strong {
  line-height: 1;
  font-size: 22px;
}

.alert-stat span,
.health-stat span {
  margin-top: 4px;
  color: var(--muted);
  font-size: 12px;
}

.is-red strong,
.alarm-item.is-red .severity-badge {
  color: #ff4d5e;
}

.is-yellow strong,
.alarm-item.is-yellow .severity-badge {
  color: #ffb020;
}

.is-blue strong,
.alarm-item.is-blue .severity-badge {
  color: #408cff;
}

.is-purple strong,
.alarm-item.is-purple .severity-badge {
  color: #8a63ff;
}

.health-stat strong {
  color: #17c964;
}

.right-tools {
  justify-content: flex-end;
  gap: 10px;
  min-width: 0;
}

.clock-block {
  display: grid;
  gap: 2px;
  text-align: right;
  white-space: nowrap;
}

.clock-block span {
  color: var(--muted);
  font-size: 12px;
}

.clock-block strong {
  font-size: 14px;
}

.theme-select {
  gap: 6px;
  min-width: 148px;
  height: 36px;
  padding: 0 8px;
  border: 1px solid var(--line);
  border-radius: 6px;
  background: var(--panel-soft);
}

.theme-select span {
  color: var(--muted);
  font-size: 12px;
}

.theme-select select {
  height: 30px;
  width: 90px;
  border: 0;
  background: transparent;
  padding-left: 0;
}

.ai-status {
  height: 30px;
  display: grid;
  place-items: center;
  padding: 0 9px;
  border-radius: 6px;
  background: #fff3d6;
  color: #a15c00;
  white-space: nowrap;
  font-size: 12px;
  font-weight: 700;
}

.ai-status.ready {
  background: #ddfbe8;
  color: #047a3d;
}

.user-panel {
  gap: 8px;
  min-width: 118px;
  justify-content: flex-end;
}

.avatar {
  width: 34px;
  height: 34px;
  border-radius: 50%;
  display: grid;
  place-items: center;
  background: var(--primary);
  color: #fff;
  font-weight: 800;
}

.user-panel span,
.user-panel strong {
  display: block;
  white-space: nowrap;
}

.user-panel span {
  font-weight: 800;
  font-size: 14px;
}

.user-panel strong {
  color: var(--muted);
  font-size: 12px;
}

.workspace-preview {
  display: grid;
  grid-template-columns: 310px minmax(420px, 1fr) 360px;
  min-height: calc(100vh - 74px);
}

.alarm-list {
  background: color-mix(in srgb, var(--panel-soft) 92%, transparent);
  border-right: 1px solid var(--line);
  min-width: 0;
}

.side-title {
  height: 48px;
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 0 14px;
  border-bottom: 1px solid var(--line);
}

.side-title span {
  width: 22px;
  height: 22px;
  display: grid;
  place-items: center;
  border-radius: 999px;
  background: var(--primary-soft);
  color: var(--primary);
  font-weight: 800;
}

.severity-tabs {
  display: grid;
  grid-template-columns: repeat(5, 1fr);
  gap: 4px;
  padding: 10px 10px 8px;
  border-bottom: 1px solid var(--line);
}

.severity-tabs button {
  min-width: 0;
  height: 38px;
  border: 1px solid transparent;
  border-radius: 6px;
  background: transparent;
  color: var(--muted);
  cursor: pointer;
  display: grid;
  place-items: center;
  align-content: center;
}

.severity-tabs button.active {
  border-color: var(--primary);
  background: var(--primary-soft);
  color: var(--primary);
}

.severity-tabs span,
.severity-tabs strong {
  line-height: 1.1;
  font-size: 12px;
}

.severity-tabs strong {
  margin-top: 3px;
}

.alarm-scroll {
  max-height: calc(100vh - 174px);
  overflow: auto;
}

.alarm-item {
  display: grid;
  gap: 9px;
  padding: 14px;
  border-bottom: 1px solid var(--line);
  background: var(--panel);
}

.alarm-item.active {
  border-left: 3px solid #ffb020;
  background: color-mix(in srgb, var(--primary-soft) 58%, var(--panel));
}

.alarm-head {
  display: flex;
  align-items: center;
  gap: 8px;
}

.alarm-head strong {
  min-width: 0;
  font-size: 14px;
  line-height: 1.35;
}

.severity-badge {
  flex: 0 0 auto;
  min-width: 42px;
  height: 24px;
  display: inline-grid;
  place-items: center;
  border-radius: 999px;
  background: #fff3d6;
  font-size: 12px;
  font-weight: 900;
  box-shadow: inset 0 0 0 1px rgba(255, 176, 32, 0.32);
}

.alarm-item p {
  margin: 0;
  color: var(--text);
  font-size: 13px;
  line-height: 1.55;
}

.alarm-item dl {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 6px 10px;
  margin: 0;
}

.alarm-item dl div:last-child {
  grid-column: 1 / -1;
}

.alarm-item dt,
.alarm-item dd {
  margin: 0;
}

.alarm-item dt {
  color: var(--muted);
  font-size: 12px;
}

.alarm-item dd {
  margin-top: 2px;
  font-size: 13px;
  font-weight: 700;
}

.alarm-item time {
  color: var(--muted);
  font-size: 12px;
}

.empty-alarm {
  margin: 16px;
  min-height: 90px;
  display: grid;
  place-items: center;
  border: 1px dashed var(--line);
  border-radius: 8px;
  color: var(--muted);
  background: var(--panel);
}

.analysis-panel {
  min-width: 0;
  padding: 18px 18px 40px;
}

.panel-heading,
.analysis-command-card {
  min-height: 74px;
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 16px;
  border-bottom: 1px solid var(--line);
}

.analysis-command-card {
  border: 1px solid var(--line);
  border-radius: 8px;
  background: var(--panel);
  padding: 16px;
}

.panel-heading span,
.analysis-command-card span {
  color: var(--muted);
  font-size: 13px;
  font-weight: 700;
}

.panel-heading h1,
.analysis-command-card h1 {
  margin: 8px 0 0;
  font-size: 24px;
  letter-spacing: 0;
}

.analysis-command-card p {
  margin: 8px 0 0;
  color: var(--muted);
  font-size: 13px;
  line-height: 1.6;
}

.panel-heading button,
.analysis-command-card button {
  height: 36px;
  border: 0;
  border-radius: 6px;
  background: var(--primary);
  color: white;
  padding: 0 18px;
  font-weight: 800;
  cursor: pointer;
}

.panel-heading button:disabled,
.analysis-command-card button:disabled {
  cursor: wait;
  opacity: 0.72;
}

.analysis-actions {
  display: flex;
  align-items: center;
  gap: 8px;
  flex: 0 0 auto;
}

.panel-heading .ghost-button,
.analysis-command-card .ghost-button {
  border: 1px solid var(--line);
  background: var(--panel);
  color: var(--text);
}

.analysis-empty-state {
  min-height: 220px;
  margin-top: 14px;
  display: grid;
  place-items: center;
  align-content: center;
  gap: 8px;
  border: 1px dashed var(--line);
  border-radius: 8px;
  background: color-mix(in srgb, var(--panel) 72%, transparent);
  text-align: center;
  padding: 26px;
}

.analysis-empty-state strong {
  color: var(--text);
  font-size: 18px;
}

.analysis-empty-state p {
  max-width: 560px;
  margin: 0;
  color: var(--muted);
  line-height: 1.7;
}

.profile-grid {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 12px;
  margin-top: 16px;
}

.profile-grid article {
  border: 1px solid var(--line);
  border-radius: 8px;
  background: var(--panel);
  padding: 14px;
}

.profile-grid span,
.section-title span {
  color: var(--muted);
  font-size: 12px;
  font-weight: 800;
}

.profile-grid strong {
  display: block;
  margin-top: 6px;
  font-size: 16px;
}

.profile-grid p {
  margin: 8px 0 0;
  color: var(--muted);
  font-size: 13px;
  line-height: 1.6;
}

.analysis-card {
  margin-top: 12px;
  border: 1px solid var(--line);
  border-radius: 8px;
  background: var(--panel);
  padding: 16px;
  color: var(--muted);
  line-height: 1.65;
}

.section-title {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  margin-bottom: 12px;
}

.section-title strong {
  color: var(--text);
  font-size: 13px;
  text-align: right;
}

.chain-line {
  display: grid;
  grid-template-columns: minmax(80px, 1fr) 34px minmax(110px, 1.2fr) 34px minmax(100px, 1fr);
  align-items: center;
  gap: 8px;
}

.chain-line div {
  min-height: 42px;
  display: grid;
  place-items: center;
  border: 1px solid var(--line);
  border-radius: 8px;
  background: var(--panel-soft);
  color: var(--text);
  font-size: 13px;
  font-weight: 800;
  text-align: center;
  padding: 0 8px;
}

.chain-line span {
  height: 2px;
  background: var(--primary);
  position: relative;
}

.chain-line span::after {
  content: "";
  width: 8px;
  height: 8px;
  border-top: 2px solid var(--primary);
  border-right: 2px solid var(--primary);
  position: absolute;
  right: 0;
  top: 50%;
  transform: translateY(-50%) rotate(45deg);
}

.ai-summary {
  margin: 0 0 12px;
  color: var(--text);
  font-size: 14px;
}

.analysis-warning {
  margin: 0 0 12px;
  border: 1px solid #ffd88a;
  border-radius: 6px;
  background: #fff8e8;
  color: #9a5b00;
  padding: 8px 10px;
  font-size: 12px;
}

.cause-item {
  display: grid;
  grid-template-columns: minmax(0, 1fr) 170px;
  gap: 12px;
  padding: 12px 0;
  border-top: 1px solid var(--line);
}

.cause-item strong {
  color: var(--text);
}

.cause-item p {
  margin: 6px 0 0;
  font-size: 13px;
}

.score-pair {
  display: grid;
  gap: 6px;
  align-content: center;
}

.score-pair span {
  height: 28px;
  display: grid;
  place-items: center;
  border-radius: 999px;
  background: var(--primary-soft);
  color: var(--primary);
  font-size: 12px;
  font-weight: 800;
}

.metric-grid {
  display: grid;
  grid-template-columns: repeat(5, minmax(0, 1fr));
  gap: 10px;
}

.metric-card {
  min-height: 96px;
  display: grid;
  gap: 6px;
  align-content: center;
  border: 1px solid var(--line);
  border-radius: 8px;
  background: var(--panel-soft);
  padding: 12px;
}

.metric-card span {
  color: var(--muted);
  font-size: 12px;
}

.metric-card strong {
  color: var(--text);
  font-size: 22px;
}

.metric-card em {
  width: fit-content;
  border-radius: 999px;
  background: #fff3d6;
  color: #a15c00;
  padding: 3px 8px;
  font-style: normal;
  font-size: 12px;
  font-weight: 800;
}

.timeline-list {
  display: grid;
  gap: 10px;
  margin: 0;
  padding: 0;
  list-style: none;
}

.timeline-list li {
  display: grid;
  grid-template-columns: 78px minmax(0, 1fr);
  gap: 12px;
  position: relative;
}

.timeline-list time {
  color: var(--primary);
  font-size: 12px;
  font-weight: 900;
}

.timeline-list strong {
  color: var(--text);
}

.timeline-list p {
  margin: 4px 0 0;
  font-size: 13px;
}

.recommend-grid {
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: 10px;
}

.recommend-grid article {
  border: 1px solid var(--line);
  border-radius: 8px;
  background: var(--panel-soft);
  padding: 12px;
}

.recommend-grid strong {
  color: var(--text);
}

.recommend-grid p {
  margin: 8px 0 0;
  font-size: 13px;
}

.evidence-card article {
  display: grid;
  grid-template-columns: 170px 80px minmax(0, 1fr);
  gap: 12px;
  align-items: center;
  padding: 10px 0;
  border-top: 1px solid var(--line);
}

.evidence-card article strong,
.evidence-card article span {
  display: block;
}

.evidence-card article strong {
  color: var(--text);
  font-size: 13px;
}

.evidence-card article span,
.evidence-card article em {
  color: var(--muted);
  font-size: 12px;
  font-style: normal;
}

.evidence-card article p {
  margin: 0;
  color: var(--primary);
  font-size: 18px;
  font-weight: 900;
}

.evidence-card small {
  display: block;
  margin-top: 10px;
  color: var(--muted);
}

.assistant-panel {
  border-left: 1px solid var(--line);
  background: color-mix(in srgb, var(--panel) 92%, transparent);
  padding: 14px;
  min-width: 0;
}

.assistant-title {
  height: 42px;
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 10px;
}

.assistant-title div {
  display: flex;
  align-items: center;
  gap: 8px;
}

.assistant-title span {
  width: 26px;
  height: 26px;
  display: grid;
  place-items: center;
  border-radius: 50%;
  background: var(--primary-soft);
  color: var(--primary);
  font-size: 12px;
  font-weight: 900;
}

.assistant-title button {
  width: 30px;
  height: 30px;
  border: 1px solid var(--line);
  border-radius: 6px;
  background: var(--panel);
  color: var(--muted);
  cursor: pointer;
}

.assistant-message,
.context-box,
.question-box {
  display: grid;
  gap: 8px;
  margin-top: 12px;
  border: 1px solid var(--line);
  border-radius: 8px;
  background: var(--panel);
  padding: 12px;
}

.assistant-message {
  color: var(--muted);
  font-size: 13px;
  line-height: 1.7;
}

.context-box span,
.question-box span {
  color: var(--muted);
  font-size: 12px;
  font-weight: 800;
}

.context-box p {
  margin: 0;
  color: var(--text);
  font-size: 13px;
  line-height: 1.65;
}

textarea {
  width: 100%;
  resize: vertical;
  min-height: 104px;
  border: 1px solid var(--line);
  border-radius: 6px;
  background: var(--panel-soft);
  color: var(--text);
  outline: none;
  padding: 10px;
  line-height: 1.5;
}

.question-input-row {
  display: grid;
  grid-template-columns: minmax(0, 1fr) 34px;
  gap: 8px;
  align-items: stretch;
}

.send-icon-button {
  width: 34px;
  min-height: 104px;
  border: 0;
  border-radius: 6px;
  background: var(--primary);
  color: #fff;
  cursor: pointer;
  font-size: 18px;
  font-weight: 900;
  line-height: 1;
}

.send-icon-button:disabled {
  cursor: not-allowed;
  opacity: 0.5;
}

.send-icon-button:hover {
  filter: brightness(1.05);
}

.assistant-chat {
  display: grid;
  gap: 10px;
  margin-top: 12px;
}

.assistant-chat article {
  display: grid;
  gap: 6px;
  border: 1px solid var(--line);
  border-radius: 8px;
  background: var(--panel);
  padding: 10px;
}

.assistant-chat article.user {
  background: var(--primary-soft);
}

.assistant-chat span {
  width: fit-content;
  border-radius: 999px;
  background: var(--panel-soft);
  color: var(--primary);
  padding: 2px 8px;
  font-size: 12px;
  font-weight: 900;
}

.assistant-chat p {
  margin: 0;
  color: var(--text);
  font-size: 13px;
  line-height: 1.65;
  white-space: pre-wrap;
}

.markdown-body {
  color: var(--text);
  font-size: 13px;
  line-height: 1.65;
}

.markdown-body p,
.markdown-body ul,
.markdown-body pre,
.markdown-body h3,
.markdown-body h4,
.markdown-body h5 {
  margin: 0;
}

.markdown-body p + p,
.markdown-body p + ul,
.markdown-body ul + p,
.markdown-body h3 + p,
.markdown-body h4 + p,
.markdown-body h5 + p {
  margin-top: 8px;
}

.markdown-body h3,
.markdown-body h4,
.markdown-body h5 {
  color: var(--text);
  font-size: 14px;
}

.markdown-body ul {
  padding-left: 18px;
}

.markdown-body li + li {
  margin-top: 4px;
}

.markdown-body code {
  border-radius: 4px;
  background: var(--panel-soft);
  color: var(--primary);
  padding: 1px 5px;
  font-family: Consolas, "Courier New", monospace;
  font-size: 12px;
}

.markdown-body pre {
  overflow: auto;
  border: 1px solid var(--line);
  border-radius: 6px;
  background: var(--panel-soft);
  padding: 10px;
}

.markdown-body pre code {
  display: block;
  background: transparent;
  color: var(--text);
  padding: 0;
  white-space: pre;
}

.assistant-error {
  margin: 12px 0 0;
  border: 1px solid #ffd88a;
  border-radius: 6px;
  background: #fff8e8;
  color: #9a5b00;
  padding: 8px 10px;
  font-size: 12px;
}

.dialog-backdrop {
  position: fixed;
  inset: 0;
  z-index: 30;
  display: grid;
  place-items: center;
  background: rgba(10, 18, 32, 0.36);
  padding: 24px;
}

.profile-dialog {
  width: min(620px, 100%);
  border: 1px solid var(--line);
  border-radius: 8px;
  background: var(--panel);
  box-shadow: 0 22px 70px rgba(13, 30, 55, 0.22);
  padding: 18px;
}

.dialog-heading {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 16px;
  border-bottom: 1px solid var(--line);
  padding-bottom: 12px;
}

.dialog-heading span,
.dialog-grid span {
  color: var(--muted);
  font-size: 12px;
  font-weight: 800;
}

.dialog-heading h2 {
  margin: 6px 0 0;
  font-size: 22px;
  letter-spacing: 0;
}

.dialog-heading button {
  width: 32px;
  height: 32px;
  border: 1px solid var(--line);
  border-radius: 6px;
  background: var(--panel-soft);
  color: var(--text);
  cursor: pointer;
  font-size: 20px;
  line-height: 1;
}

.dialog-grid {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 12px;
  margin-top: 14px;
}

.dialog-grid article {
  border: 1px solid var(--line);
  border-radius: 8px;
  background: var(--panel-soft);
  padding: 12px;
}

.dialog-grid strong {
  display: block;
  margin-top: 8px;
  color: var(--text);
}

.dialog-grid p {
  margin: 8px 0 0;
  color: var(--text);
  line-height: 1.65;
}

.dialog-wide {
  grid-column: 1 / -1;
}

@media (max-width: 1480px) {
  .topbar {
    grid-template-columns: 200px 190px minmax(240px, 1fr) minmax(310px, 380px);
  }

  .right-tools {
    grid-column: 1 / -1;
    justify-content: flex-start;
  }
}

@media (max-width: 1180px) {
  .topbar {
    grid-template-columns: 1fr 1fr;
  }

  .alert-summary,
  .right-tools {
    grid-column: 1 / -1;
    justify-content: flex-start;
    flex-wrap: wrap;
  }

  .workspace-preview {
    grid-template-columns: 300px minmax(0, 1fr);
  }

  .assistant-panel {
    grid-column: 1 / -1;
    border-left: 0;
    border-top: 1px solid var(--line);
  }

  .metric-grid,
  .recommend-grid {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }
}

@media (max-width: 760px) {
  .topbar {
    grid-template-columns: 1fr;
  }

  .module-tabs,
  .system-picker {
    min-width: 0;
  }

  .workspace-preview {
    grid-template-columns: 1fr;
  }

  .alarm-list {
    border-right: 0;
  }

  .alarm-scroll {
    max-height: none;
  }

  .profile-grid,
  .metric-grid,
  .recommend-grid {
    grid-template-columns: 1fr;
  }

  .analysis-actions,
  .panel-heading,
  .analysis-command-card {
    align-items: flex-start;
    flex-direction: column;
  }

  .chain-line {
    grid-template-columns: 1fr;
  }

  .chain-line span {
    width: 2px;
    height: 20px;
    justify-self: center;
  }

  .chain-line span::after {
    right: 50%;
    top: auto;
    bottom: 0;
    transform: translateX(50%) rotate(135deg);
  }

  .cause-item,
  .evidence-card article {
    grid-template-columns: 1fr;
  }

  .dialog-grid {
    grid-template-columns: 1fr;
  }
}

</style>