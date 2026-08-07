<template>
  <section class="section page-section hs-page frog-page" :data-hs-theme="hsTheme">
    <div class="container">
      <div class="frog-wrap">
        <!-- 头部：返回 + 标题 + 计分板 -->
        <div class="frog-head">
          <div>
            <router-link to="/hearthstone" class="frog-back" aria-label="返回炉石成就查看器">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="m15 18-6-6 6-6"/></svg>
              返回炉石成就
            </router-link>
            <p class="frog-eyebrow"><span class="hs-live-dot" aria-hidden="true"></span> Frog Suspect Card</p>
            <h1>蛙生模拟器</h1>
            <p class="frog-sub">
              三张都是真实存在的随从，但其中一张的卡面被蛙生悄悄动了手脚。
              盯紧卡面，把那张假牌揪出来。下方可勾选要混入的混淆类型；想逐类看贴片效果，可前往卡牌修改验收台。
            </p>
          </div>
          <div class="frog-head__actions">
            <router-link to="/hearthstone/frog/review" class="frog-review-link">
              <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7-10-7-10-7Z"/><circle cx="12" cy="12" r="3"/></svg>
              卡牌修改验收台
            </router-link>
            <div class="frog-scoreboard" aria-label="游戏得分">
            <div><small>得分</small><strong>{{ score }}</strong></div>
            <i></i>
            <div><small>连胜</small><strong>{{ streak }}</strong></div>
            <i></i>
            <div><small>命中率</small><strong>{{ rounds ? accuracy + '%' : '—' }}</strong></div>
          </div>
          </div>
        </div>


        <p class="frog-notice">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><circle cx="12" cy="12" r="10"/><path d="M12 16v-4"/><path d="M12 8h.01"/></svg>
          <span>
            现阶段只收录<b>标准模式的随从牌</b>，法术、武器和地标不参与找茬。
            <b>狂野版本卡牌调试完毕后敬请期待。</b>
          </span>
        </p>

        <!-- 混淆类型设置 -->
        <div class="frog-config">
          <div class="frog-config__head">
            <span class="frog-config__title">混淆类型</span>
            <span class="frog-config__hint-inline">勾选要混入的混淆类型，切换后立即重新发牌</span>
          </div>
          <div class="frog-config__list">
            <label
              v-for="opt in mutationOptions"
              :key="opt.key"
              class="frog-check"
              :class="{ 'frog-check--unstable': opt.unstable }"
              :title="opt.hint"
            >
              <input type="checkbox" :value="opt.key" v-model="activeTypes" @change="reDeal" />
              <span class="frog-check__box" aria-hidden="true"></span>
              <span class="frog-check__label">{{ opt.label }}</span>
              <span class="frog-check__hint">{{ opt.hint }}</span>
            </label>
          </div>
        </div>

        <!-- 牌桌 -->
        <div class="frog-stage">
          <div class="frog-round"><span></span> 第 {{ round || 1 }} 轮 <span></span></div>
          <h2>哪张牌，被蛙生动了手脚？</h2>
          <p class="frog-stage__intro">篡改只会发生在一处，且一定来自另一张真实卡牌的同一位置。</p>

          <div v-if="loading" class="frog-status" role="status">
            <span class="frog-spinner"></span>
            正在洗入卡牌……
          </div>

          <div v-else-if="error" class="frog-status frog-status--error" role="alert">
            <strong>卡牌没有成功入场</strong>
            <span>{{ error }}</span>
            <button type="button" class="frog-btn" @click="loadCards">重新加载</button>
          </div>

          <template v-else>
            <div class="frog-row">
              <FrogCard
                v-for="(card, index) in roundCards"
                :key="`${round}-${card.id}`"
                :card="card"
                :index="index"
                :mutation="mutation"
                :is-suspicious="index === suspiciousIndex"
                :is-selected="index === selectedIndex"
                :revealed="revealed"
                @select="selectCard(index)"
              />
            </div>

            <p v-if="!showAnswer" class="frog-tip">
              仔细比对卡面（手机可左右滑动），然后点击你认为可疑的那张牌
            </p>

            <aside
              v-else
              class="frog-result"
              :class="{ 'frog-result--success': resultTone === 'success' }"
              aria-live="polite"
            >
              <span class="frog-result__icon" aria-hidden="true">
                <svg v-if="resultTone === 'success'" viewBox="0 0 24 24"><path d="m5 13 4 4L19 7" /></svg>
                <svg v-else viewBox="0 0 24 24"><path d="m7 7 10 10M17 7 7 17" /></svg>
              </span>
              <div class="frog-result__copy">
                <strong v-if="resultTone === 'success'">眼力不错，抓到了！</strong>
                <strong v-else>蛙生骗过了你</strong>
                <p v-if="explanation">
                  可疑的是第 {{ suspiciousIndex + 1 }} 张
                  「{{ roundCards[suspiciousIndex]?.name }}」，篡改了
                  <b>{{ explanation.field }}</b>：
                  <del>{{ explanation.original }}</del>
                  <span aria-hidden="true">→</span>
                  <ins>{{ explanation.changed }}</ins>
                </p>
              </div>
              <button class="frog-btn" type="button" :disabled="dealing" @click="startRound">
                {{ dealing ? '发牌中…' : '下一轮' }}
                <svg viewBox="0 0 24 24" aria-hidden="true"><path d="m9 18 6-6-6-6" /></svg>
              </button>
            </aside>
          </template>
        </div>

        <p class="frog-foot">
          卡牌数据来自暴雪国服卡牌接口，卡图经本站反向代理自对象存储 · 仅作交互演示，不代表游戏内实际数值
        </p>
      </div>
    </div>
  </section>
</template>

<script setup>
import { computed, onMounted } from 'vue'
import FrogCard from '../components/FrogCard.vue'
import { useFrogGame, mutationOptions } from '../composables/useFrogGame.js'
import { useHearthstoneTheme } from '../composables/useHearthstoneTheme.js'
import '../styles/hearthstone-frog.css'

const { hsTheme } = useHearthstoneTheme()

const {
  accuracy,
  activeTypes,
  allCards,
  correct,
  dealing,
  error,
  explanation,
  loadCards,
  loading,
  mutation,
  revealed,
  round,
  roundCards,
  rounds,
  score,
  selectCard,
  selectedIndex,
  startRound,
  streak,
  suspiciousIndex
} = useFrogGame()

// 揭晓后才给出答案
const showAnswer = computed(() => revealed.value)
const resultTone = computed(() => (correct.value ? 'success' : 'fail'))

// 切换混淆类型后立即重新发牌，立即看到效果
const reDeal = () => {
  if (loading.value || dealing.value) return
  startRound()
}

onMounted(loadCards)
</script>
