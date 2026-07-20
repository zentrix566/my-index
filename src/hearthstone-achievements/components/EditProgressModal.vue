<template>
  <div v-if="visible" class="epm-overlay" @click.self="$emit('close')">
    <div class="epm-modal">
      <button class="epm-close" type="button" aria-label="关闭" @click="$emit('close')">×</button>

      <h3 class="epm-title">{{ achievement?.name }}</h3>
      <p class="epm-meta">{{ achievement?.heroClass }} · {{ achievement?.difficulty }} · {{ achievement?.type }}</p>
      <p v-if="achievement?.description" class="epm-desc">{{ achievement.description }}</p>

      <!-- 一次性：阶段勾选 -->
      <div v-if="achievement?.type === '一次性'" class="epm-stages">
        <label v-for="(stage, i) in achievement.stages" :key="i" class="epm-stage">
          <input type="checkbox" v-model="draftStages[i]" />
          <span>
            阶段 {{ i + 1 }}：{{ stage.description }}
            <em class="epm-stage-points">{{ stage.xpReward }} XP / {{ stage.points }} 点</em>
          </span>
        </label>
      </div>

      <!-- 累计：count 输入 -->
      <div v-else-if="achievement" class="epm-cumulative">
        <label class="epm-count-label">当前累计次数</label>
        <div class="epm-count-control">
          <button type="button" @click="dec">−</button>
          <input type="number" v-model.number="draftCount" min="0" />
          <button type="button" @click="inc">＋</button>
        </div>
        <p class="epm-quota-hint">各阶段目标：{{ achievement.stages.map((s) => s.quota).join(' / ') }}</p>
      </div>

      <div class="epm-actions">
        <button class="epm-cancel" type="button" @click="$emit('close')">取消</button>
        <button class="epm-save" type="button" :disabled="saving" @click="save">
          {{ saving ? '保存中…' : '保存进度' }}
        </button>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, watch } from 'vue'
import { useAchievementProgress } from '../composables/useAchievementProgress.js'

const props = defineProps({
  visible: Boolean,
  achievement: { type: Object, default: null },
  saving: { type: Boolean, default: false }
})
const emit = defineEmits(['close', 'save'])

const { progress } = useAchievementProgress()
const draftStages = ref({})
const draftCount = ref(0)

// 打开时从当前进度初始化草稿
watch(
  () => [props.visible, props.achievement?.id],
  () => {
    if (props.visible && props.achievement) {
      const p = progress.value[props.achievement.id] || {}
      draftCount.value = p.count || 0
      draftStages.value = { ...(p.stages || {}) }
    }
  },
  { immediate: true }
)

function inc() {
  draftCount.value = (Number(draftCount.value) || 0) + 1
}
function dec() {
  draftCount.value = Math.max(0, (Number(draftCount.value) || 0) - 1)
}

function save() {
  if (!props.achievement || props.saving) return
  emit('save', {
    id: props.achievement.id,
    stages: { ...draftStages.value },
    count: Number(draftCount.value) || 0
  })
}
</script>

<style scoped>
.epm-overlay {
  position: fixed;
  inset: 0;
  background: rgba(15, 23, 42, 0.55);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 1000;
  padding: 16px;
}
.epm-modal {
  position: relative;
  width: 100%;
  max-width: 440px;
  background: #fff;
  border-radius: 14px;
  padding: 28px 26px;
  box-shadow: 0 20px 60px rgba(0, 0, 0, 0.25);
  max-height: 86vh;
  overflow-y: auto;
}
.epm-close {
  position: absolute;
  top: 12px;
  right: 14px;
  border: none;
  background: transparent;
  font-size: 26px;
  line-height: 1;
  color: #9ca3af;
  cursor: pointer;
}
.epm-title {
  margin: 0 0 4px;
  font-size: 19px;
  color: #1f2937;
}
.epm-meta {
  margin: 0 0 8px;
  color: #6b7280;
  font-size: 13px;
}
.epm-desc {
  margin: 0 0 16px;
  color: #4b5563;
  font-size: 13px;
  line-height: 1.6;
}
.epm-stages {
  display: flex;
  flex-direction: column;
  gap: 12px;
  margin-bottom: 20px;
}
.epm-stage {
  display: flex;
  gap: 10px;
  align-items: flex-start;
  font-size: 14px;
  color: #374151;
  cursor: pointer;
}
.epm-stage input {
  margin-top: 2px;
  width: 18px;
  height: 18px;
}
.epm-stage-points {
  display: block;
  font-style: normal;
  color: #9ca3af;
  font-size: 12px;
  margin-top: 2px;
}
.epm-cumulative {
  margin-bottom: 20px;
}
.epm-count-label {
  display: block;
  font-size: 13px;
  color: #6b7280;
  margin-bottom: 8px;
}
.epm-count-control {
  display: flex;
  align-items: center;
  gap: 10px;
}
.epm-count-control button {
  width: 40px;
  height: 40px;
  border: 1px solid #d1d5db;
  background: #f9fafb;
  border-radius: 8px;
  font-size: 20px;
  cursor: pointer;
}
.epm-count-control input {
  width: 90px;
  height: 40px;
  text-align: center;
  border: 1px solid #d1d5db;
  border-radius: 8px;
  font-size: 16px;
}
.epm-quota-hint {
  margin: 8px 0 0;
  color: #9ca3af;
  font-size: 12px;
}
.epm-actions {
  display: flex;
  gap: 12px;
  justify-content: flex-end;
}
.epm-cancel,
.epm-save {
  height: 40px;
  padding: 0 20px;
  border-radius: 8px;
  font-size: 14px;
  font-weight: 600;
  cursor: pointer;
}
.epm-cancel {
  border: 1px solid #d1d5db;
  background: #fff;
  color: #4b5563;
}
.epm-save {
  border: none;
  background: #6366f1;
  color: #fff;
}
.epm-save:disabled {
  opacity: 0.6;
  cursor: not-allowed;
}
</style>
