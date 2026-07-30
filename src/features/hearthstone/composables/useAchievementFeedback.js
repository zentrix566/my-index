import { onUnmounted, ref } from 'vue'
import { getClassName } from '../utils/achievements.js'

const CONFETTI_COLORS = ['#fbbf24', '#4ade80', '#60a5fa', '#f472b6', '#a78bfa']

/**
 * 管理成就页面的轻提示、达成庆祝和定时器清理。
 */
export function useAchievementFeedback() {
  const toast = ref({ show: false, type: '', message: '' })
  const celebration = ref({ show: false, name: '', sub: '' })
  let toastTimer = null
  let celebrationTimer = null

  function showToast(type, message) {
    toast.value = { show: true, type, message }
    if (toastTimer) clearTimeout(toastTimer)
    toastTimer = setTimeout(() => {
      toast.value = { ...toast.value, show: false }
    }, 2600)
  }

  function showAchievementCelebration(achievement) {
    if (!achievement) return
    const rewards = (achievement.stages || []).reduce(
      (total, stage) => ({
        xp: total.xp + (stage.xpReward || 0),
        points: total.points + (stage.points || 0)
      }),
      { xp: 0, points: 0 }
    )
    const rewardText = rewards.xp || rewards.points
      ? `${rewards.xp} XP · ${rewards.points} 点`
      : ''
    const sub = [getClassName(achievement), achievement.difficulty, rewardText]
      .filter(Boolean)
      .join(' · ')

    celebration.value = { show: true, name: achievement.name, sub }
    if (celebrationTimer) clearTimeout(celebrationTimer)
    celebrationTimer = setTimeout(() => {
      celebration.value = { ...celebration.value, show: false }
    }, 3400)
  }

  function confettiStyle(index) {
    const angle = index * 36 * (Math.PI / 180)
    const distance = 96 + (index % 3) * 20
    return {
      '--x': `${Math.cos(angle) * distance}px`,
      '--y': `${Math.sin(angle) * distance}px`,
      background: CONFETTI_COLORS[index % CONFETTI_COLORS.length]
    }
  }

  onUnmounted(() => {
    if (toastTimer) clearTimeout(toastTimer)
    if (celebrationTimer) clearTimeout(celebrationTimer)
  })

  return {
    toast,
    celebration,
    showToast,
    showAchievementCelebration,
    confettiStyle
  }
}
