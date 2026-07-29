<template>
  <div class="pc-page">
    <div class="pc-shell">
      <RouterLink class="pc-back" to="/hearthstone">
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
          <path d="m15 18-6-6 6-6"/>
        </svg>
        返回成就查看器
      </RouterLink>

      <header class="pc-head">
        <div>
          <p class="pc-eyebrow">个人中心</p>
          <h1 class="pc-title">{{ user?.username || '账号' }}</h1>
        </div>
        <span class="pc-status" :class="user?.emailVerified ? 'ok' : 'warn'">
          <span class="pc-dot" aria-hidden="true"></span>
          {{ user?.emailVerified ? '已激活 · 正式用户' : '未激活' }}
        </span>
      </header>

      <nav class="pc-tabs" role="tablist" aria-label="个人中心内容">
        <button
          id="achievements-tab"
          class="pc-tab"
          :class="{ active: activeSection === 'achievements' }"
          type="button"
          role="tab"
          :aria-selected="activeSection === 'achievements'"
          aria-controls="achievements-panel"
          @click="activeSection = 'achievements'"
        >
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
            <path d="M8 21h8"/><path d="M12 17v4"/><path d="M7 4h10"/><path d="M17 4v8a5 5 0 0 1-10 0V4"/><path d="M5 6H3v2a4 4 0 0 0 4 4"/><path d="M19 6h2v2a4 4 0 0 1-4 4"/>
          </svg>
          成就概览
        </button>
        <button
          id="preferences-tab"
          class="pc-tab"
          :class="{ active: activeSection === 'preferences' }"
          type="button"
          role="tab"
          :aria-selected="activeSection === 'preferences'"
          aria-controls="preferences-panel"
          @click="activeSection = 'preferences'"
        >
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
            <path d="M4 21v-7"/><path d="M4 10V3"/><path d="M12 21v-9"/><path d="M12 8V3"/><path d="M20 21v-5"/><path d="M20 12V3"/><path d="M1 14h6"/><path d="M9 8h6"/><path d="M17 16h6"/>
          </svg>
          偏好与数据
        </button>
        <button
          id="security-tab"
          class="pc-tab"
          :class="{ active: activeSection === 'security' }"
          type="button"
          role="tab"
          :aria-selected="activeSection === 'security'"
          aria-controls="security-panel"
          @click="activeSection = 'security'"
        >
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
            <path d="M20 13c0 5-3.5 7.5-8 9-4.5-1.5-8-4-8-9V5l8-3 8 3z"/><path d="m9 12 2 2 4-4"/>
          </svg>
          账号安全
          <span v-if="!user?.emailVerified || !user?.hasPassword" class="pc-tab-badge">待完善</span>
        </button>
      </nav>

      <div
        v-show="activeSection === 'achievements'"
        id="achievements-panel"
        role="tabpanel"
        aria-labelledby="achievements-tab"
      >
        <section class="pc-card pc-card-charts">
          <div class="pc-card-head">
            <div>
              <h2 class="pc-card-title">成就仪表盘</h2>
              <p class="pc-hint pc-hint-mb">以图表汇总你的炉石成就进度，按版本、职业、类型与难度多维度展示。</p>
            </div>
            <button
              type="button"
              class="pc-toggle"
              :class="{ on: hardcore }"
              role="switch"
              :aria-checked="hardcore"
              :title="'硬核模式：统计全部 ' + totalExpansions + ' 个版本（含更多版本），而非仅核心 ' + coreExpansions + ' 个版本。'"
              @click="hardcore = !hardcore"
            >
              <span class="pc-toggle-track"><span class="pc-toggle-thumb"></span></span>
              <span class="pc-toggle-label">硬核模式{{ hardcore ? '：开' : '：关' }}</span>
            </button>
          </div>
          <ProfileCharts :hardcore="hardcore" />
        </section>

        <div class="pc-activity-grid">
          <section class="pc-card pc-activity-card">
            <div class="pc-card-head">
              <div>
                <h2 class="pc-card-title">最近完成</h2>
                <p class="pc-hint">按最后更新时间展示新近完成的成就。</p>
              </div>
            </div>
            <ul v-if="recentCompleted.length" class="pc-activity-list">
              <li v-for="item in recentCompleted" :key="item.achievement.id">
                <span class="pc-activity-marker complete" aria-hidden="true"></span>
                <div>
                  <strong>{{ item.achievement.name }}</strong>
                  <span>{{ item.achievement._expansionName }} · {{ formatActivityTime(item.updatedAt) }}</span>
                </div>
              </li>
            </ul>
            <p v-else class="pc-empty-copy">暂时没有近期完成记录。</p>
          </section>

          <section class="pc-card pc-activity-card">
            <div class="pc-card-head">
              <div>
                <h2 class="pc-card-title">最近进度变化</h2>
                <p class="pc-hint">展示最近更新过的成就及其当前状态。</p>
              </div>
            </div>
            <ul v-if="recentChanges.length" class="pc-activity-list">
              <li v-for="item in recentChanges" :key="item.achievement.id">
                <span class="pc-activity-marker" aria-hidden="true"></span>
                <div>
                  <strong>{{ item.achievement.name }}</strong>
                  <span>{{ item.progressText }} · {{ formatActivityTime(item.updatedAt) }}</span>
                </div>
              </li>
            </ul>
            <p v-else class="pc-empty-copy">修改成就进度后，这里会显示最近记录。</p>
          </section>
        </div>
      </div>

      <div
        v-show="activeSection === 'preferences'"
        id="preferences-panel"
        role="tabpanel"
        aria-labelledby="preferences-tab"
      >
        <section class="pc-card">
          <div class="pc-card-head">
            <div>
              <h2 class="pc-card-title">显示偏好</h2>
              <p class="pc-hint">这些设置会保存到账号，并应用到炉石成就查看器。</p>
            </div>
          </div>
          <form class="pc-preference-form" @submit.prevent="savePreferences">
            <label class="pc-field">
              <span>默认版本</span>
              <select v-model="preferenceDraft.defaultExpansionId" class="pc-select">
                <option value="">第一个版本</option>
                <option v-for="expansion in expansions" :key="expansion.id" :value="expansion.id">
                  {{ expansion.name }}
                </option>
              </select>
            </label>
            <label class="pc-check-row">
              <input v-model="preferenceDraft.hardcore" type="checkbox" />
              <span>
                <strong>默认开启硬核模式</strong>
                <small>“我的成就”默认统计全部版本。</small>
              </span>
            </label>
            <label class="pc-check-row">
              <input v-model="preferenceDraft.compactMode" type="checkbox" />
              <span>
                <strong>使用紧凑布局</strong>
                <small>缩小成就卡片间距，一屏显示更多内容。</small>
              </span>
            </label>
            <button class="pc-btn pc-password-submit" type="submit" :disabled="profileSaving">
              {{ profileSaving ? '保存中…' : '保存偏好' }}
            </button>
          </form>
          <p v-if="profileMsg" class="pc-feedback" :class="{ error: !profileOk }" aria-live="polite">{{ profileMsg }}</p>
        </section>

        <section class="pc-card">
          <div class="pc-card-head">
            <div>
              <h2 class="pc-card-title">成就数据导出与备份</h2>
              <p class="pc-hint">Excel 和 JSON 使用相同的成就明细；个人中心 JSON 还会备份进度、置顶成就和显示偏好。</p>
            </div>
          </div>
          <div class="pc-backup-actions">
            <button class="pc-btn" type="button" :disabled="exporting" @click="exportProfileExcel">
              {{ exporting ? '导出中…' : '导出 Excel' }}
            </button>
            <button class="pc-manage-btn" type="button" @click="exportProfileJson">导出 JSON</button>
            <button class="pc-manage-btn" type="button" @click="profileFileInput?.click()">导入 JSON</button>
            <input
              ref="profileFileInput"
              class="pc-visually-hidden"
              type="file"
              accept="application/json,.json"
              @change="importProfileJson"
            />
          </div>
          <p class="pc-hint pc-backup-note">个人中心导出的经验值不含临时通行证加成；如需带加成导出，可在成就页选择加成后导出。</p>
          <p v-if="backupMsg" class="pc-feedback" :class="{ error: !backupOk }" aria-live="polite">{{ backupMsg }}</p>
        </section>
      </div>

      <div
        v-show="activeSection === 'security'"
        id="security-panel"
        role="tabpanel"
        aria-labelledby="security-tab"
      >
        <section class="pc-card pc-security">
          <div class="pc-security-head">
            <div>
              <h2 class="pc-card-title">账号与安全</h2>
              <p class="pc-hint">查看账号状态，并在需要时管理邮箱与登录密码。</p>
            </div>
          </div>

          <div class="pc-security-list">
            <div class="pc-security-item">
              <span class="pc-security-icon" aria-hidden="true">
                <svg width="19" height="19" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                  <rect width="20" height="16" x="2" y="4" rx="2"/><path d="m22 7-8.97 5.485a2 2 0 0 1-2.06 0L2 7"/>
                </svg>
              </span>
              <div class="pc-security-copy">
                <strong>邮箱</strong>
                <span>{{ user?.email ? `${user.email} · ${user.emailVerified ? '已激活' : '待激活'}` : '尚未绑定邮箱' }}</span>
              </div>
              <button
                class="pc-manage-btn"
                type="button"
                :aria-expanded="accountPanel === 'email'"
                aria-controls="email-form-panel"
                @click="toggleAccountPanel('email')"
              >
                {{ accountPanel === 'email' ? '收起' : (user?.emailVerified ? '查看' : '激活邮箱') }}
                <svg class="pc-chevron" :class="{ open: accountPanel === 'email' }" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
                  <path d="m9 18 6-6-6-6"/>
                </svg>
              </button>
            </div>

            <div v-if="accountPanel === 'email'" id="email-form-panel" class="pc-security-panel">
              <div v-if="user?.emailVerified" class="pc-verified">
                <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
                  <path d="M20 6 9 17l-5-5"/>
                </svg>
                <div>
                  <p class="pc-verified-title">邮箱已激活</p>
                  <p class="pc-verified-sub">{{ user.email || '你已是正式用户，可正常使用全部功能。' }}</p>
                </div>
              </div>

              <template v-else>
                <p class="pc-hint">
                  <template v-if="user?.email">激活邮件将发送至 <strong>{{ user.email }}</strong>，请在 30 分钟内完成激活。</template>
                  <template v-else>绑定并激活邮箱后，账号将升级为正式用户。</template>
                </p>
                <form class="pc-form" @submit.prevent="saveEmail">
                  <span class="pc-input-shell">
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
                      <rect width="20" height="16" x="2" y="4" rx="2"/><path d="m22 7-8.97 5.485a2 2 0 0 1-2.06 0L2 7"/>
                    </svg>
                    <input v-model.trim="email" class="pc-input" type="email" placeholder="输入邮箱，用于激活账号" autocomplete="email" required />
                  </span>
                  <div class="pc-actions">
                    <button class="pc-btn" type="submit" :disabled="emailLoading">
                      <span v-if="emailLoading" class="pc-spinner" aria-hidden="true"></span>
                      {{ emailLoading ? '发送中…' : (user?.email ? '重新发送激活邮件' : '发送激活链接') }}
                    </button>
                    <button v-if="user?.email" class="pc-link-btn" type="button" :disabled="emailLoading" @click="clearEmail">解绑</button>
                  </div>
                </form>
                <div v-if="emailMsg" class="pc-email-state" aria-live="polite">
                  <span class="pc-state-dot" :class="emailOk ? 'ok' : 'err'" aria-hidden="true"></span>
                  {{ emailMsg }}
                </div>
              </template>
            </div>

            <div class="pc-security-item">
              <span class="pc-security-icon" aria-hidden="true">
                <svg width="19" height="19" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                  <rect width="18" height="11" x="3" y="11" rx="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/>
                </svg>
              </span>
              <div class="pc-security-copy">
                <strong>登录密码</strong>
                <span>{{ user?.hasPassword ? '已设置，仅在需要时修改' : '尚未设置密码' }}</span>
              </div>
              <button
                class="pc-manage-btn"
                type="button"
                :aria-expanded="accountPanel === 'password'"
                aria-controls="password-form-panel"
                @click="toggleAccountPanel('password')"
              >
                {{ accountPanel === 'password' ? '收起' : (user?.hasPassword ? '修改' : '设置密码') }}
                <svg class="pc-chevron" :class="{ open: accountPanel === 'password' }" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
                  <path d="m9 18 6-6-6-6"/>
                </svg>
              </button>
            </div>

            <div v-if="accountPanel === 'password'" id="password-form-panel" class="pc-security-panel">
              <form class="pc-form pc-form-col" @submit.prevent="savePassword">
                <label v-if="user?.hasPassword" class="pc-field">
                  <span>当前密码</span>
                  <span class="pc-input-shell">
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
                      <rect width="18" height="11" x="3" y="11" rx="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/>
                    </svg>
                    <input v-model="currentPassword" class="pc-input" :type="showC ? 'text' : 'password'" placeholder="请输入当前密码" autocomplete="current-password" :required="user?.hasPassword" />
                    <button class="pc-visibility" type="button" :aria-label="showC ? '隐藏当前密码' : '显示当前密码'" @click="showC = !showC">{{ showC ? '隐藏' : '显示' }}</button>
                  </span>
                </label>

                <label class="pc-field">
                  <span>{{ user?.hasPassword ? '新密码' : '设置密码' }}</span>
                  <span class="pc-input-shell">
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
                      <rect width="18" height="11" x="3" y="11" rx="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/>
                    </svg>
                    <input v-model="newPassword" class="pc-input" :type="showN ? 'text' : 'password'" placeholder="至少 6 位" autocomplete="new-password" minlength="6" required />
                    <button class="pc-visibility" type="button" :aria-label="showN ? '隐藏新密码' : '显示新密码'" @click="showN = !showN">{{ showN ? '隐藏' : '显示' }}</button>
                  </span>
                </label>

                <label class="pc-field">
                  <span>确认密码</span>
                  <span class="pc-input-shell">
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
                      <rect width="18" height="11" x="3" y="11" rx="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/>
                    </svg>
                    <input v-model="confirmPassword" class="pc-input" :type="showN2 ? 'text' : 'password'" placeholder="再次输入密码" autocomplete="new-password" minlength="6" required />
                    <button class="pc-visibility" type="button" :aria-label="showN2 ? '隐藏确认密码' : '显示确认密码'" @click="showN2 = !showN2">{{ showN2 ? '隐藏' : '显示' }}</button>
                  </span>
                </label>

                <button class="pc-btn pc-password-submit" type="submit" :disabled="pwLoading">
                  <span v-if="pwLoading" class="pc-spinner" aria-hidden="true"></span>
                  {{ pwLoading ? '更新中…' : (user?.hasPassword ? '更新密码' : '设置密码') }}
                </button>
              </form>
              <div v-if="pwMsg" class="pc-email-state" aria-live="polite">
                <span class="pc-state-dot" :class="pwOk ? 'ok' : 'err'" aria-hidden="true"></span>
                {{ pwMsg }}
              </div>
            </div>
          </div>
        </section>

        <div class="pc-footer">
          <button class="pc-link-btn" type="button" @click="doLogout">退出登录</button>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { computed, reactive, ref, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { useAuth } from '../auth/useAuth.js'
import { expansions, originalExpansions } from '../features/hearthstone/data/expansions.js'
import { saveAchievementProgress } from '../features/hearthstone/api/progress.js'
import { useAchievementProgress } from '../features/hearthstone/composables/useAchievementProgress.js'
import { useHearthstoneProfile } from '../features/hearthstone/composables/useHearthstoneProfile.js'
import {
  buildExportBackup,
  downloadExportExcel,
  downloadExportJson
} from '../features/hearthstone/utils/achievementExport.js'
import ProfileCharts from './ProfileCharts.vue'

const { user, init, setEmail, changePassword, setPassword, logout } = useAuth()
const router = useRouter()
const {
  progress,
  reload: reloadProgress,
  clear: clearProgress,
  applyLocalProgress,
  isAchievementCompleted,
  getProgressInfo
} = useAchievementProgress()
const {
  profile,
  saving: profileSaving,
  load: loadProfile,
  save: saveProfile,
  clear: clearProfile
} = useHearthstoneProfile()

// 硬核模式：开启后仪表盘统计全部版本（含更多版本），否则仅核心版本
const hardcore = ref(false)
const totalExpansions = expansions.length
const coreExpansions = originalExpansions.length

const email = ref(user.value?.email || '')
const emailLoading = ref(false)
const emailMsg = ref('')
const emailOk = ref(false)

const currentPassword = ref('')
const newPassword = ref('')
const confirmPassword = ref('')
const pwLoading = ref(false)
const pwMsg = ref('')
const pwOk = ref(false)

const showC = ref(false)
const showN = ref(false)
const showN2 = ref(false)
const activeSection = ref('achievements')
const accountPanel = ref(null)
const preferenceDraft = reactive({
  hardcore: false,
  defaultExpansionId: '',
  compactMode: false
})
const profileMsg = ref('')
const profileOk = ref(true)
const exporting = ref(false)
const profileFileInput = ref(null)
const backupMsg = ref('')
const backupOk = ref(true)

const allAchievements = computed(() => {
  const output = []
  for (const expansion of expansions) {
    for (const achievement of expansion.achievements || []) {
      output.push({
        ...achievement,
        _expansionId: expansion.id,
        _expansionName: expansion.name
      })
    }
  }
  return output
})
const achievementById = computed(
  () => new Map(allAchievements.value.map((achievement) => [achievement.id, achievement]))
)
const recentItems = computed(() => {
  const items = []
  for (const [achievementId, entry] of Object.entries(progress.value || {})) {
    const achievement = achievementById.value.get(achievementId)
    if (!achievement || !entry?.updatedAt) continue
    const timestamp = new Date(entry.updatedAt).getTime()
    if (!Number.isFinite(timestamp)) continue
    const info = getProgressInfo(achievement)
    items.push({
      achievement,
      updatedAt: entry.updatedAt,
      timestamp,
      completed: info.completed,
      progressText: info.completed ? '已完成' : `${info.percent}% · ${info.remainingText || '已更新'}`
    })
  }
  return items.sort((a, b) => b.timestamp - a.timestamp)
})
const recentChanges = computed(() => recentItems.value.slice(0, 6))
const recentCompleted = computed(() =>
  recentItems.value.filter((item) => item.completed).slice(0, 6)
)

function toggleAccountPanel(panel) {
  accountPanel.value = accountPanel.value === panel ? null : panel
}

onMounted(async () => {
  await init()
  if (!user.value) {
    router.replace('/login')
    return
  }
  email.value = user.value.email || ''
  await Promise.allSettled([reloadProgress(), loadProfile({ force: true })])
  Object.assign(preferenceDraft, profile.value.preferences)
  hardcore.value = profile.value.preferences.hardcore === true
})

function formatActivityTime(value) {
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return '时间未知'
  return new Intl.DateTimeFormat('zh-CN', {
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    hour12: false
  }).format(date)
}

async function saveProfileChanges(nextProfile, successMessage) {
  profileMsg.value = ''
  try {
    await saveProfile(nextProfile)
    profileOk.value = true
    profileMsg.value = successMessage
  } catch (error) {
    profileOk.value = false
    profileMsg.value = error.message || '保存失败'
  }
}

async function savePreferences() {
  await saveProfileChanges(
    {
      ...profile.value,
      preferences: { ...preferenceDraft }
    },
    '显示偏好已保存'
  )
}

function getProfileBackup() {
  return buildExportBackup(allAchievements.value, 0, {
    user: user.value?.username || '',
    scope: '个人中心完整备份',
    progress: progress.value || {},
    profile: profile.value
  })
}

function exportProfileJson() {
  downloadExportJson(getProfileBackup())
  backupOk.value = true
  backupMsg.value = 'JSON 备份已导出'
}

async function exportProfileExcel() {
  exporting.value = true
  backupMsg.value = ''
  try {
    await downloadExportExcel(getProfileBackup())
    backupOk.value = true
    backupMsg.value = 'Excel 已导出'
  } catch (error) {
    backupOk.value = false
    backupMsg.value = error.message || 'Excel 导出失败'
  } finally {
    exporting.value = false
  }
}

async function importProfileJson(event) {
  const file = event.target.files?.[0]
  if (!file) return
  backupMsg.value = ''
  try {
    const parsed = JSON.parse(await file.text())
    const importedProgress =
      parsed.progress && typeof parsed.progress === 'object' ? parsed.progress : parsed
    if (!importedProgress || typeof importedProgress !== 'object' || Array.isArray(importedProgress)) {
      throw new Error('备份文件格式不正确')
    }
    await saveAchievementProgress(importedProgress)
    applyLocalProgress(importedProgress)
    if (parsed.profile && typeof parsed.profile === 'object') {
      await saveProfile(parsed.profile)
      Object.assign(preferenceDraft, profile.value.preferences)
      hardcore.value = profile.value.preferences.hardcore === true
    }
    backupOk.value = true
    backupMsg.value = `已恢复 ${Object.keys(importedProgress).length} 条成就进度${parsed.profile ? '及个人偏好' : ''}`
  } catch (error) {
    backupOk.value = false
    backupMsg.value = error.message || '导入失败'
  } finally {
    event.target.value = ''
  }
}

async function saveEmail() {
  emailMsg.value = ''
  emailLoading.value = true
  try {
    const data = await setEmail(email.value)
    emailOk.value = true
    if (data.needsActivation) {
      emailMsg.value = '激活链接已发送，请查收邮箱（30 分钟内有效）。'
    } else if (email.value) {
      emailMsg.value = '邮箱已保存'
    } else {
      emailMsg.value = '已解绑邮箱'
    }
  } catch (e) {
    emailOk.value = false
    emailMsg.value = e.message || '操作失败'
  } finally {
    emailLoading.value = false
  }
}

async function clearEmail() {
  email.value = ''
  await saveEmail()
}

async function savePassword() {
  pwMsg.value = ''
  if (newPassword.value.length < 6) {
    pwOk.value = false
    pwMsg.value = '新密码至少 6 位'
    return
  }
  if (newPassword.value !== confirmPassword.value) {
    pwOk.value = false
    pwMsg.value = '两次输入的密码不一致'
    return
  }
  pwLoading.value = true
  try {
    const hadPassword = Boolean(user.value?.hasPassword)
    if (hadPassword) {
      await changePassword(currentPassword.value, newPassword.value)
    } else {
      await setPassword(newPassword.value)
    }
    pwOk.value = true
    pwMsg.value = hadPassword ? '密码已更新' : '密码已设置'
    currentPassword.value = ''
    newPassword.value = ''
    confirmPassword.value = ''
  } catch (e) {
    pwOk.value = false
    pwMsg.value = e.message || '操作失败'
  } finally {
    pwLoading.value = false
  }
}

async function doLogout() {
  await logout()
  clearProgress()
  clearProfile()
  router.push('/login')
}
</script>

<style scoped>
.pc-page {
  min-height: calc(100vh - 137px);
  padding: 48px 24px;
  color: #e2e8f0;
  background:
    radial-gradient(900px 520px at 12% -8%, rgba(34, 197, 94, 0.16), transparent 60%),
    radial-gradient(760px 520px at 96% 4%, rgba(217, 119, 6, 0.12), transparent 60%),
    radial-gradient(680px 480px at 60% 110%, rgba(56, 189, 248, 0.10), transparent 60%),
    #0b1120;
}
.pc-shell {
  width: 100%;
  max-width: 920px;
  margin: 0 auto;
}
.pc-back {
  display: inline-flex;
  align-items: center;
  gap: 5px;
  margin-bottom: 22px;
  color: #94a3b8;
  font-size: 13px;
  font-weight: 600;
  text-decoration: none;
}
.pc-back:hover { color: #22c55e; }

.pc-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 16px;
  margin-bottom: 22px;
}
.pc-eyebrow {
  margin: 0 0 4px;
  color: #22c55e;
  font-size: 11px;
  font-weight: 800;
  letter-spacing: 0.14em;
  text-transform: uppercase;
}
.pc-title {
  margin: 0;
  font-size: 30px;
  line-height: 1.15;
  color: #f8fafc;
}
.pc-status {
  display: inline-flex;
  align-items: center;
  gap: 8px;
  padding: 8px 14px;
  border-radius: 999px;
  font-size: 13px;
  font-weight: 700;
  white-space: nowrap;
  border: 1px solid transparent;
}
.pc-status.ok {
  color: #4ade80;
  background: rgba(34, 197, 94, 0.12);
  border-color: rgba(34, 197, 94, 0.35);
}
.pc-status.warn {
  color: #fbbf24;
  background: rgba(217, 119, 6, 0.12);
  border-color: rgba(217, 119, 6, 0.35);
}
.pc-dot {
  width: 8px; height: 8px;
  border-radius: 50%;
  background: currentColor;
  box-shadow: 0 0 0 4px currentColor;
  opacity: 0.55;
}

.pc-tabs {
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: 6px;
  margin-bottom: 18px;
  padding: 5px;
  border: 1px solid rgba(148, 163, 184, 0.14);
  border-radius: 14px;
  background: rgba(15, 23, 42, 0.72);
  box-shadow: 0 12px 30px rgba(0, 0, 0, 0.2);
}
.pc-tab {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  min-height: 46px;
  padding: 0 14px;
  border: 1px solid transparent;
  border-radius: 10px;
  color: #94a3b8;
  background: transparent;
  font-size: 14px;
  font-weight: 700;
  cursor: pointer;
  transition: border-color 0.2s ease, color 0.2s ease, background 0.2s ease;
}
.pc-tab:hover {
  color: #e2e8f0;
  background: rgba(255, 255, 255, 0.04);
}
.pc-tab.active {
  border-color: rgba(34, 197, 94, 0.32);
  color: #f0fdf4;
  background: rgba(34, 197, 94, 0.13);
}
.pc-tab-badge {
  padding: 2px 7px;
  border-radius: 999px;
  color: #fde68a;
  background: rgba(217, 119, 6, 0.2);
  font-size: 10px;
  font-weight: 800;
  line-height: 1.5;
}

.pc-select {
  width: 100%;
  min-height: 48px;
  padding: 0 38px 0 13px;
  border: 1px solid rgba(148, 163, 184, 0.22);
  border-radius: 11px;
  outline: none;
  color: #f1f5f9;
  background: #111b2f;
  font-size: 14px;
  cursor: pointer;
}
.pc-select:focus {
  border-color: #22c55e;
  box-shadow: 0 0 0 3px rgba(34, 197, 94, 0.18);
}
.pc-activity-grid {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 18px;
  margin-bottom: 18px;
}
.pc-activity-card {
  min-width: 0;
  margin-bottom: 0;
}
.pc-activity-list {
  display: grid;
  gap: 12px;
  margin: 0;
  padding: 0;
  list-style: none;
}
.pc-activity-list li {
  display: grid;
  grid-template-columns: 9px minmax(0, 1fr);
  align-items: start;
  gap: 10px;
}
.pc-activity-list li > div {
  display: grid;
  min-width: 0;
  gap: 2px;
}
.pc-activity-list strong {
  color: #e2e8f0;
  font-size: 13px;
}
.pc-activity-list span:last-child {
  overflow-wrap: anywhere;
  color: #94a3b8;
  font-size: 11px;
  line-height: 1.5;
}
.pc-activity-marker {
  width: 8px;
  height: 8px;
  margin-top: 5px;
  border-radius: 50%;
  background: #38bdf8;
}
.pc-activity-marker.complete { background: #22c55e; }
.pc-empty-copy {
  margin: 0 0 14px;
  color: #94a3b8;
  font-size: 13px;
  line-height: 1.6;
}
.pc-feedback {
  margin: 12px 0 0;
  color: #4ade80;
  font-size: 13px;
  font-weight: 700;
}
.pc-feedback.error { color: #fca5a5; }
.pc-preference-form {
  display: grid;
  gap: 16px;
}
.pc-check-row {
  display: grid;
  grid-template-columns: 22px minmax(0, 1fr);
  align-items: start;
  gap: 11px;
  padding: 13px;
  border: 1px solid rgba(148, 163, 184, 0.16);
  border-radius: 11px;
  cursor: pointer;
  background: rgba(15, 23, 42, 0.28);
}
.pc-check-row input {
  width: 18px;
  height: 18px;
  margin: 2px 0 0;
  accent-color: #16a34a;
  cursor: pointer;
}
.pc-check-row span { display: grid; gap: 3px; }
.pc-check-row strong { color: #e2e8f0; font-size: 14px; }
.pc-check-row small { color: #94a3b8; font-size: 12px; line-height: 1.5; }
.pc-backup-actions {
  display: flex;
  align-items: center;
  flex-wrap: wrap;
  gap: 10px;
}
.pc-backup-note { margin: 13px 0 0; }
.pc-visually-hidden {
  position: absolute;
  width: 1px;
  height: 1px;
  padding: 0;
  margin: -1px;
  overflow: hidden;
  clip: rect(0, 0, 0, 0);
  white-space: nowrap;
  border: 0;
}

.pc-card {
  padding: 22px;
  margin-bottom: 18px;
  border: 1px solid rgba(148, 163, 184, 0.14);
  border-radius: 18px;
  background: rgba(255, 255, 255, 0.035);
  box-shadow: 0 20px 50px rgba(0, 0, 0, 0.3);
  backdrop-filter: blur(10px);
}
.pc-card-title {
  margin: 0 0 14px;
  font-size: 16px;
  font-weight: 700;
  color: #f1f5f9;
}
.pc-card-head {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 16px;
  margin-bottom: 4px;
}
.pc-card-head .pc-card-title { margin-bottom: 4px; }
.pc-card-charts { padding-bottom: 24px; }

.pc-security {
  padding: 0;
  overflow: hidden;
}
.pc-security-head {
  padding: 20px 22px 14px;
  border-bottom: 1px solid rgba(148, 163, 184, 0.12);
}
.pc-security-head .pc-card-title { margin-bottom: 4px; }
.pc-security-head .pc-hint { margin: 0; }
.pc-security-list { display: grid; }
.pc-security-item {
  display: grid;
  grid-template-columns: 42px minmax(0, 1fr) auto;
  align-items: center;
  gap: 12px;
  min-height: 72px;
  padding: 10px 22px;
}
.pc-security-item + .pc-security-item {
  border-top: 1px solid rgba(148, 163, 184, 0.12);
}
.pc-security-icon {
  display: grid;
  width: 40px;
  height: 40px;
  place-items: center;
  border: 1px solid rgba(34, 197, 94, 0.22);
  border-radius: 11px;
  color: #4ade80;
  background: rgba(34, 197, 94, 0.08);
}
.pc-security-copy {
  display: grid;
  min-width: 0;
  gap: 3px;
}
.pc-security-copy strong {
  color: #f1f5f9;
  font-size: 14px;
}
.pc-security-copy span {
  overflow-wrap: anywhere;
  color: #94a3b8;
  font-size: 12px;
  line-height: 1.5;
}
.pc-manage-btn {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 5px;
  min-width: 84px;
  min-height: 44px;
  padding: 0 12px;
  border: 1px solid rgba(148, 163, 184, 0.22);
  border-radius: 10px;
  color: #dbeafe;
  background: rgba(15, 23, 42, 0.45);
  font-size: 13px;
  font-weight: 700;
  cursor: pointer;
  transition: border-color 0.2s ease, color 0.2s ease, background 0.2s ease;
}
.pc-manage-btn:hover {
  border-color: rgba(34, 197, 94, 0.5);
  color: #4ade80;
  background: rgba(34, 197, 94, 0.08);
}
.pc-chevron {
  transition: transform 0.2s ease;
}
.pc-chevron.open { transform: rotate(90deg); }
.pc-security-panel {
  padding: 18px 22px 22px 76px;
  border-top: 1px solid rgba(148, 163, 184, 0.12);
  background: rgba(15, 23, 42, 0.26);
}
.pc-security-panel + .pc-security-item {
  border-top: 1px solid rgba(148, 163, 184, 0.12);
}
.pc-password-submit { align-self: flex-start; }

/* 硬核模式 ON/OFF 开关 */
.pc-toggle {
  display: inline-flex;
  align-items: center;
  gap: 9px;
  flex: none;
  padding: 7px 12px;
  border: 1px solid rgba(148, 163, 184, 0.22);
  border-radius: 999px;
  background: rgba(15, 23, 42, 0.4);
  color: #94a3b8;
  font-size: 12px;
  font-weight: 700;
  cursor: pointer;
  white-space: nowrap;
  transition: border-color 0.2s ease, color 0.2s ease, background 0.2s ease;
}
.pc-toggle:hover { border-color: rgba(34, 197, 94, 0.5); color: #cbd5e1; }
.pc-toggle.on {
  color: #4ade80;
  border-color: rgba(34, 197, 94, 0.55);
  background: rgba(34, 197, 94, 0.12);
}
.pc-toggle-track {
  position: relative;
  width: 34px;
  height: 18px;
  border-radius: 999px;
  background: rgba(148, 163, 184, 0.3);
  transition: background 0.2s ease;
  flex: none;
}
.pc-toggle.on .pc-toggle-track { background: #22c55e; }
.pc-toggle-thumb {
  position: absolute;
  top: 2px;
  left: 2px;
  width: 14px;
  height: 14px;
  border-radius: 50%;
  background: #fff;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.35);
  transition: transform 0.2s ease;
}
.pc-toggle.on .pc-toggle-thumb { transform: translateX(16px); }
.pc-toggle-label { line-height: 1; }
.pc-hint {
  margin: 0 0 14px;
  font-size: 13px;
  line-height: 1.6;
  color: #94a3b8;
}
.pc-hint strong { color: #e2e8f0; font-weight: 600; }
.pc-hint-mb { margin-bottom: 18px; }

.pc-verified {
  display: flex;
  align-items: center;
  gap: 14px;
  padding: 16px;
  border-radius: 12px;
  color: #4ade80;
  background: rgba(34, 197, 94, 0.10);
  border: 1px solid rgba(34, 197, 94, 0.28);
}
.pc-verified-title { margin: 0 0 2px; font-size: 15px; font-weight: 700; color: #bbf7d0; }
.pc-verified-sub { margin: 0; font-size: 13px; color: #cbd5e1; }

.pc-form { display: flex; align-items: flex-end; gap: 12px; flex-wrap: wrap; }
.pc-form-col { flex-direction: column; align-items: stretch; }
.pc-input-shell {
  display: flex;
  align-items: center;
  min-height: 48px;
  padding: 0 13px;
  border: 1px solid rgba(148, 163, 184, 0.22);
  border-radius: 11px;
  color: #94a3b8;
  background: rgba(15, 23, 42, 0.5);
  transition: border-color 0.2s ease, box-shadow 0.2s ease;
  flex: 1;
  min-width: 240px;
}
.pc-input-shell:focus-within {
  border-color: #22c55e;
  box-shadow: 0 0 0 3px rgba(34, 197, 94, 0.18);
}
.pc-input {
  width: 100%;
  height: 46px;
  min-width: 0;
  padding: 0 10px;
  border: 0;
  outline: 0;
  color: #f1f5f9;
  background: transparent;
  font-size: 14px;
}
.pc-input::placeholder { color: #64748b; }
.pc-field { display: grid; gap: 7px; font-size: 13px; font-weight: 650; color: #cbd5e1; }
.pc-visibility {
  min-width: 44px; min-height: 36px;
  border: 0; color: #d97706; background: transparent;
  font-size: 12px; font-weight: 700; cursor: pointer;
}
.pc-actions { display: flex; align-items: center; gap: 10px; }
.pc-btn {
  display: inline-flex; align-items: center; justify-content: center; gap: 8px;
  min-height: 48px; padding: 0 22px;
  border: none; border-radius: 11px;
  background: linear-gradient(135deg, #15803d, #16a34a);
  color: #fff; font-size: 14px; font-weight: 750; cursor: pointer;
  box-shadow: 0 10px 24px rgba(21, 128, 61, 0.3);
  transition: transform 0.2s ease, filter 0.2s ease;
}
.pc-btn:hover:not(:disabled) { filter: brightness(1.12); transform: translateY(-1px); }
.pc-btn:disabled { opacity: 0.6; cursor: not-allowed; }
.pc-link-btn {
  min-height: 36px; border: 0; color: #d97706; background: transparent;
  font-size: 13px; font-weight: 700; cursor: pointer;
}
.pc-email-state {
  display: flex; align-items: center; gap: 8px;
  margin-top: 12px; font-size: 13px; font-weight: 600;
}
.pc-state-dot { width: 8px; height: 8px; border-radius: 50%; flex: none; }
.pc-state-dot.ok { background: #22c55e; }
.pc-state-dot.err { background: #ef4444; }

.pc-footer {
  margin-top: 4px;
  padding-top: 16px;
  text-align: right;
}
.pc-spinner {
  width: 16px; height: 16px;
  border: 2px solid rgba(255, 255, 255, 0.35);
  border-top-color: #fff;
  border-radius: 50%;
  animation: pc-spin 0.7s linear infinite;
}
@keyframes pc-spin { to { transform: rotate(360deg); } }

.pc-back:focus-visible,
.pc-btn:focus-visible,
.pc-link-btn:focus-visible,
.pc-visibility:focus-visible,
.pc-toggle:focus-visible,
.pc-manage-btn:focus-visible,
.pc-tab:focus-visible {
  outline: 3px solid rgba(34, 197, 94, 0.5);
  outline-offset: 3px;
}
@media (max-width: 600px) {
  .pc-page { padding: 24px 14px; }
  .pc-card { padding: 18px 16px; }
  .pc-card-charts { padding-bottom: 18px; }
  .pc-security { padding: 0; }
  .pc-title { font-size: 24px; }
  .pc-head { flex-direction: column; align-items: flex-start; }
  .pc-tab {
    gap: 6px;
    padding: 0 4px;
    font-size: 12px;
  }
  .pc-tab svg { display: none; }
  .pc-tab-badge { display: none; }
  .pc-activity-grid { grid-template-columns: 1fr; gap: 0; }
  .pc-card-head { flex-direction: column; }
  .pc-security-head { padding: 18px 16px 12px; }
  .pc-security-item {
    grid-template-columns: 40px minmax(0, 1fr);
    padding: 12px 16px;
  }
  .pc-manage-btn {
    grid-column: 2;
    justify-self: start;
  }
  .pc-security-panel { padding: 16px; }
  .pc-input-shell { min-width: 100%; }
  .pc-input,
  .pc-select { font-size: 16px; }
  .pc-actions { width: 100%; flex-wrap: wrap; }
}
@media (prefers-reduced-motion: reduce) {
  .pc-btn,
  .pc-toggle,
  .pc-manage-btn,
  .pc-chevron,
  .pc-tab { transition: none; }
  .pc-spinner { animation: none; }
}
</style>
