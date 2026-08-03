<template>
  <section class="wp-page">
    <div class="wp-container">
      <WpNav />

      <header class="wp-pc-head">
        <div>
          <p class="wp-pc-eyebrow">个人中心</p>
          <h1 class="wp-pc-title">{{ displayName || username }}</h1>
        </div>
      </header>

      <nav class="wp-pc-tabs" role="tablist" aria-label="个人中心内容">
        <button class="wp-pc-tab" :class="{ active: tab === 'demons' }" type="button" role="tab" :aria-selected="tab === 'demons'" @click="tab = 'demons'">心魔配置</button>
        <button class="wp-pc-tab" :class="{ active: tab === 'config' }" type="button" role="tab" :aria-selected="tab === 'config'" @click="tab = 'config'">正能量配置</button>
        <button class="wp-pc-tab" :class="{ active: tab === 'account' }" type="button" role="tab" :aria-selected="tab === 'account'" @click="tab = 'account'">账号设置</button>
      </nav>

      <p v-if="loadError" class="wp-error">{{ loadError }}</p>

      <div class="wp-card" style="margin-top: 16px">
        <div class="wp-pc-hint">
          <span>📊 数据看板已独立为顶部导航的「数据看板」，点这里可直达：</span>
          <RouterLink class="wp-btn ghost small" to="/willpower/data">查看数据看板 →</RouterLink>
        </div>
      </div>

      <p v-if="loadError" class="wp-error">{{ loadError }}</p>

      <!-- ===== 心魔配置 ===== -->
      <div v-show="tab === 'demons'">
        <div class="wp-card">
          <div class="wp-card-head"><div><h2>心魔配置</h2><p>管理心魔种类，拖动可排序，归档的心魔沉底不显示。</p></div></div>

          <p class="wp-section-title">心魔种类（拖动排序，归档沉底）</p>
          <div class="wp-demon-list">
            <div
              v-for="(d, i) in myDemons"
              :key="d.demonKey"
              class="wp-demon-row"
              :class="{ archived: d.archived, dragging: dragIndex === i }"
              draggable="true"
              @dragstart="dragIndex = i"
              @dragover.prevent
              @drop="onDrop(i)"
              @dragend="dragIndex = -1"
            >
              <span class="wp-drag-handle" title="拖动排序">⠿</span>
              <span class="wp-demon-emoji">{{ d.emoji }}</span>
              <span class="wp-demon-name">{{ d.name }}</span>
              <div class="wp-actions" style="margin-left: auto">
                <button
                  v-if="!d.builtin"
                  class="wp-btn danger small"
                  type="button"
                  @click="delDemon(d.demonKey)"
                >删除</button>
                <button
                  v-else
                  class="wp-btn ghost small"
                  type="button"
                  @click="toggleArchive(d)"
                >{{ d.archived ? '恢复' : '归档' }}</button>
              </div>
            </div>
          </div>

          <p class="wp-section-title" style="margin-top: 12px">新增自定义心魔</p>
          <form class="wp-form-row" @submit.prevent="addDemon">
            <div class="wp-field">
              <label for="dm-name">名称</label>
              <input id="dm-name" v-model="demon.name" type="text" maxlength="12" placeholder="如：奶茶魔" />
            </div>
            <div class="wp-field">
              <label for="dm-emoji">图标（emoji）</label>
              <input id="dm-emoji" v-model="demon.emoji" type="text" maxlength="4" placeholder="🧋" />
            </div>
            <div class="wp-field">
              <label for="dm-color">颜色</label>
              <input id="dm-color" v-model="demon.color" type="text" maxlength="7" placeholder="#7c3aed" />
            </div>
            <div class="wp-field" style="align-self: end">
              <button class="wp-btn primary" type="submit" :disabled="demonBusy">添加</button>
            </div>
          </form>
          <p v-if="demonErr" class="wp-error" style="margin-top: 10px">{{ demonErr }}</p>
        </div>
      </div>

      <!-- ===== 正能量配置 ===== -->
      <div v-show="tab === 'config'">
        <div class="wp-card">
          <div class="wp-card-head"><div><h2>正能量配置</h2><p>管理正能量活动类型，配置录入方式与单位。</p></div></div>

          <p class="wp-section-title">正能量活动（可配置单位/时长）</p>
          <div class="wp-demon-list">
            <div v-for="a in myActivities" :key="a.activityKey" class="wp-demon-row">
              <span class="wp-demon-emoji">{{ a.emoji }}</span>
              <span class="wp-demon-name">{{ a.name }}</span>
              <span class="wp-tag">{{ a.inputMode === 'duration' ? '时长·小时/分' : `计数·${a.unit || '次'}` }}</span>
              <div class="wp-actions" style="margin-left: auto">
                <button
                  v-if="!a.builtin"
                  class="wp-btn danger small"
                  type="button"
                  @click="delActivity(a.activityKey)"
                >删除</button>
                <button
                  v-else
                  class="wp-btn ghost small"
                  type="button"
                  @click="toggleArchiveActivity(a)"
                >{{ a.archived ? '恢复' : '归档' }}</button>
              </div>
            </div>
          </div>

          <p class="wp-section-title" style="margin-top: 12px">新增正能量活动</p>
          <form class="wp-form-row" @submit.prevent="addActivity">
            <div class="wp-field">
              <label for="ac-name">名称</label>
              <input id="ac-name" v-model="activity.name" type="text" maxlength="12" placeholder="如：练琴" />
            </div>
            <div class="wp-field">
              <label for="ac-emoji">图标</label>
              <input id="ac-emoji" v-model="activity.emoji" type="text" maxlength="4" placeholder="🎹" />
            </div>
            <div class="wp-field">
              <label for="ac-mode">录入方式</label>
              <select id="ac-mode" v-model="activity.inputMode">
                <option value="count">计数（固定单位）</option>
                <option value="duration">时长（小时+分）</option>
              </select>
            </div>
            <div v-if="activity.inputMode === 'count'" class="wp-field">
              <label for="ac-unit">单位</label>
              <input id="ac-unit" v-model="activity.unit" type="text" maxlength="6" placeholder="如：页/次" />
            </div>
            <div class="wp-field" style="align-self: end">
              <button class="wp-btn primary" type="submit" :disabled="activityBusy">添加</button>
            </div>
          </form>
          <p v-if="activityErr" class="wp-error" style="margin-top: 10px">{{ activityErr }}</p>
        </div>
      </div>

      <!-- ===== 账号设置 ===== -->
      <div v-show="tab === 'account'">
        <div class="wp-card">
          <div class="wp-card-head"><div><h2>账号设置</h2><p>昵称、邮箱与登录密码。</p></div></div>
          <div class="wp-form-row">
            <div class="wp-field">
              <label for="pf-name">昵称</label>
              <input id="pf-name" v-model="displayName" type="text" maxlength="20" placeholder="给自己起个名字" />
            </div>
            <div class="wp-field">
              <label for="pf-email">邮箱（用于找回密码）</label>
              <input id="pf-email" v-model="email" type="email" placeholder="留空则解绑" />
            </div>
          </div>
          <div class="wp-actions">
            <button class="wp-btn primary" type="button" :disabled="profileBusy" @click="saveProfile">保存资料</button>
          </div>

          <p class="wp-section-title" style="margin-top: 18px">修改密码</p>
          <div class="wp-form-row">
            <div class="wp-field">
              <label for="pf-cur">当前密码</label>
              <input id="pf-cur" v-model="pw.current" type="password" autocomplete="current-password" />
            </div>
            <div class="wp-field">
              <label for="pf-new">新密码</label>
              <input id="pf-new" v-model="pw.next" type="password" autocomplete="new-password" placeholder="6-128 位" />
            </div>
          </div>
          <div class="wp-actions">
            <button class="wp-btn ghost" type="button" :disabled="profileBusy" @click="changePw">修改密码</button>
          </div>
          <p v-if="profileMsg" class="wp-ok" style="margin-top: 12px">{{ profileMsg }}</p>
          <p v-if="profileErr" class="wp-error" style="margin-top: 12px">{{ profileErr }}</p>
        </div>
      </div>
    </div>

    <WpToastHost />
  </section>
</template>

<script setup>
import { onMounted, reactive, ref } from 'vue'
import { useRouter } from 'vue-router'
import willpowerApi from '../api/willpower.js'
import { useWillpowerAuth } from '../composables/useWillpowerAuth.js'
import { useToast } from '../composables/useToast.js'
import WpNav from '../components/WpNav.vue'
import WpToastHost from '../components/WpToastHost.vue'

const router = useRouter()
const { user, init, updateProfile, changePassword } = useWillpowerAuth()
const { push: toast } = useToast()

const tab = ref('demons')

const username = ref('')
const displayName = ref('')
const email = ref('')
const profileBusy = ref(false)
const profileMsg = ref('')
const profileErr = ref('')

const pw = reactive({ current: '', next: '' })

const myDemons = ref([])
const myActivities = ref([])
const loadError = ref('')

const demonBusy = ref(false)
const demonErr = ref('')
const demon = reactive({ name: '', emoji: '', color: '#7c3aed' })

const activityBusy = ref(false)
const activityErr = ref('')
const activity = reactive({ name: '', emoji: '', inputMode: 'count', unit: '' })

const dragIndex = ref(-1)

async function loadAll() {
  const [dm, act] = await Promise.all([
    willpowerApi.listDemons(),
    willpowerApi.listActivities()
  ])
  myDemons.value = dm.demons || []
  myActivities.value = act.activities || []
}

async function saveProfile() {
  profileMsg.value = ''
  profileErr.value = ''
  profileBusy.value = true
  try {
    await updateProfile({ displayName: displayName.value.trim(), email: email.value.trim() })
    profileMsg.value = '资料已保存'
  } catch (err) {
    profileErr.value = err.message || '保存失败'
  } finally {
    profileBusy.value = false
  }
}

async function changePw() {
  profileMsg.value = ''
  profileErr.value = ''
  if (!pw.current || !pw.next) {
    profileErr.value = '请填写当前密码与新密码'
    return
  }
  profileBusy.value = true
  try {
    await changePassword(pw.current, pw.next)
    profileMsg.value = '密码已修改'
    pw.current = ''
    pw.next = ''
  } catch (err) {
    profileErr.value = err.message || '修改失败'
  } finally {
    profileBusy.value = false
  }
}

async function toggleArchive(d) {
  try {
    await willpowerApi.updateDemon(d.demonKey, { archived: !d.archived })
    await loadAll()
  } catch (err) {
    toast(err.message || '操作失败', { type: 'error' })
  }
}

async function delDemon(key) {
  try {
    await willpowerApi.deleteDemon(key)
    toast('已删除自定义心魔', { type: 'info' })
    await loadAll()
  } catch (err) {
    toast(err.message || '删除失败', { type: 'error' })
  }
}

async function addDemon() {
  demonErr.value = ''
  if (!demon.name.trim()) {
    demonErr.value = '请填写心魔名称'
    return
  }
  demonBusy.value = true
  try {
    await willpowerApi.createDemon({
      name: demon.name.trim(),
      emoji: demon.emoji.trim() || '👹',
      color: /^#[0-9a-fA-F]{6}$/.test(demon.color) ? demon.color : '#7c3aed'
    })
    demon.name = ''
    demon.emoji = ''
    toast('自定义心魔已添加', { type: 'success' })
    await loadAll()
  } catch (err) {
    demonErr.value = err.message || '添加失败'
  } finally {
    demonBusy.value = false
  }
}

async function toggleArchiveActivity(a) {
  try {
    await willpowerApi.updateActivity(a.activityKey, { archived: !a.archived })
    await loadAll()
  } catch (err) {
    toast(err.message || '操作失败', { type: 'error' })
  }
}

async function delActivity(key) {
  try {
    await willpowerApi.deleteActivity(key)
    toast('已删除正能量活动', { type: 'info' })
    await loadAll()
  } catch (err) {
    toast(err.message || '删除失败', { type: 'error' })
  }
}

async function addActivity() {
  activityErr.value = ''
  if (!activity.name.trim()) {
    activityErr.value = '请填写活动名称'
    return
  }
  activityBusy.value = true
  try {
    await willpowerApi.createActivity({
      name: activity.name.trim(),
      emoji: activity.emoji.trim() || '🌱',
      inputMode: activity.inputMode,
      unit: activity.inputMode === 'count' ? activity.unit.trim() : ''
    })
    activity.name = ''
    activity.emoji = ''
    activity.unit = ''
    activity.inputMode = 'count'
    toast('正能量活动已添加', { type: 'success' })
    await loadAll()
  } catch (err) {
    activityErr.value = err.message || '添加失败'
  } finally {
    activityBusy.value = false
  }
}

// ===== 拖拽排序 =====
function onDrop(targetIndex) {
  if (dragIndex.value < 0 || dragIndex.value === targetIndex) return
  const list = myDemons.value.slice()
  const [moved] = list.splice(dragIndex.value, 1)
  list.splice(targetIndex, 0, moved)
  myDemons.value = list
  dragIndex.value = -1
  const keys = list.map((d) => d.demonKey)
  willpowerApi.reorderDemons(keys).catch((err) => toast(err.message || '排序失败', { type: 'error' }))
}

onMounted(async () => {
  await init()
  if (!user.value) {
    router.replace('/willpower/login')
    return
  }
  username.value = user.value.username
  displayName.value = user.value.displayName || ''
  email.value = user.value.email || ''
  try {
    await loadAll()
  } catch (err) {
    loadError.value = err.message || '数据加载失败'
  }
})
</script>
