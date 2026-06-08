<template>
  <section class="section page-section">
    <div class="container">
      <div class="section-heading">
        <p class="eyebrow">Countdown</p>
        <h1>人生倒计时</h1>
        <p>输入出生日期和性别，计算离 35 岁、退休年龄和平均预期寿命还剩多久。</p>
      </div>

      <div class="countdown-layout">
        <form class="dashboard-panel countdown-form" @submit.prevent>
          <label>
            出生日期
            <input v-model="birthDate" type="date" :max="todayKey">
          </label>
          <label>
            性别
            <select v-model="gender">
              <option value="male">男</option>
              <option value="female">女</option>
            </select>
          </label>
          <div class="custom-countdown-fields">
            <label>
              自定义标题
              <input v-model="customTitle" type="text" placeholder="例如：离 2028 年 9 月">
            </label>
            <label>
              目标年月
              <input v-model="customMonth" type="month">
            </label>
          </div>
          <label>
            自定义描述
            <input v-model="customDescription" type="text" placeholder="写点自己的说明，比如：某个计划、考试、转折点或 deadline">
          </label>
          <p class="form-hint">
            自定义目标按所选月份的 1 日计算。预期寿命使用一个便于个人页面展示的参考值：男 75 岁，女 80 岁；退休年龄按男 65 岁、女 60 岁计算。
          </p>
        </form>

        <div class="countdown-results">
          <article v-for="item in countdownItems" :key="item.key" class="countdown-card" :class="{ expired: item.expired }">
            <div class="card-kicker">{{ item.kicker }}</div>
            <h2>{{ item.title }}</h2>
            <p>{{ item.description }}</p>
            <strong>{{ item.remainingText }}</strong>
            <span>{{ item.targetDateText }}</span>
          </article>
        </div>
      </div>
    </div>
  </section>
</template>

<script setup>
import { computed, ref } from 'vue'

const today = new Date()
const todayKey = formatDateKey(today)
const birthDate = ref('1995-01-01')
const gender = ref('male')
const customTitle = ref('离 2028 年 9 月')
const customDescription = ref('给未来某个节点留一个可视化提醒。')
const customMonth = ref('2028-09')

const genderConfig = computed(() => {
  return gender.value === 'female'
    ? { retireAge: 60, lifeAge: 80, label: '女' }
    : { retireAge: 65, lifeAge: 75, label: '男' }
})

const birth = computed(() => {
  const date = new Date(`${birthDate.value}T00:00:00`)
  return Number.isNaN(date.getTime()) ? null : date
})

const countdownItems = computed(() => {
  if (!birth.value) return []

  const items = [
    {
      key: 'internet',
      kicker: 'Internet',
      title: '35 岁互联网斩杀线',
      description: '一个带点荒诞的行业梗，不代表真实能力边界。',
      targetDate: addYears(birth.value, 35)
    },
    {
      key: 'retire',
      kicker: 'Retirement',
      title: `${genderConfig.value.label}性退休年龄`,
      description: `按${genderConfig.value.label}性 ${genderConfig.value.retireAge} 岁估算。`,
      targetDate: addYears(birth.value, genderConfig.value.retireAge)
    },
    {
      key: 'life',
      kicker: 'Life Expectancy',
      title: '平均预期寿命参考',
      description: `按${genderConfig.value.label}性 ${genderConfig.value.lifeAge} 岁参考值估算。`,
      targetDate: addYears(birth.value, genderConfig.value.lifeAge)
    }
  ]

  if (customTargetDate.value) {
    items.push({
      key: 'custom',
      kicker: 'Custom',
      title: customTitle.value.trim() || '自定义倒计时',
      description: customDescription.value.trim() || '按你选择的目标年月计算，目标日默认为该月 1 日。',
      targetDate: customTargetDate.value
    })
  }

  return items.map((item) => {
    const remaining = diffDate(today, item.targetDate)
    return {
      ...item,
      expired: remaining.expired,
      remainingText: remaining.expired ? `已超过 ${remaining.text}` : `还剩 ${remaining.text}`,
      targetDateText: `目标日期：${formatDisplayDate(item.targetDate)}`
    }
  })
})

const customTargetDate = computed(() => {
  if (!customMonth.value) return null
  const date = new Date(`${customMonth.value}-01T00:00:00`)
  return Number.isNaN(date.getTime()) ? null : date
})

function addYears(date, years) {
  const next = new Date(date)
  next.setFullYear(next.getFullYear() + years)
  return next
}

function diffDate(fromDate, toDate) {
  const expired = toDate < fromDate
  const start = expired ? new Date(toDate) : new Date(fromDate)
  const end = expired ? new Date(fromDate) : new Date(toDate)

  let years = end.getFullYear() - start.getFullYear()
  let months = end.getMonth() - start.getMonth()
  let days = end.getDate() - start.getDate()

  if (days < 0) {
    months -= 1
    const previousMonth = new Date(end.getFullYear(), end.getMonth(), 0)
    days += previousMonth.getDate()
  }

  if (months < 0) {
    years -= 1
    months += 12
  }

  return {
    expired,
    text: `${years} 年 ${months} 个月 ${days} 天`
  }
}

function formatDateKey(date) {
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`
}

function formatDisplayDate(date) {
  return `${date.getFullYear()}年${date.getMonth() + 1}月${date.getDate()}日`
}

function pad(value) {
  return String(value).padStart(2, '0')
}
</script>
