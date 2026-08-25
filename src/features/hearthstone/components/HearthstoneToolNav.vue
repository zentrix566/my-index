<template>
  <nav class="hs-tool-nav" aria-label="炉石工具入口">
    <div class="hs-tool-nav-grid">
      <button type="button" class="hs-tool-btn hs-tool-btn-featured" @click="$emit('navigate', '/hearthstone/collection')">
        <strong>外观收藏</strong><small>英雄皮肤 · 幸运币 · 卡背</small>
      </button>
      <button type="button" class="hs-tool-btn" @click="$emit('navigate', '/hearthstone/wheel')">暗月宝藏模拟器</button>
      <button type="button" class="hs-tool-btn" @click="$emit('navigate', '/hearthstone/frog')">蛙生模拟器</button>
      <button type="button" class="hs-tool-btn" @click="$emit('navigate', '/hearthstone/event')">活动计算器</button>
      <button type="button" class="hs-tool-btn" @click="$emit('navigate', '/hearthstone/xp')">战令计算器</button>
      <button type="button" class="hs-tool-btn" @click="$emit('navigate', '/hearthstone/deck')">卡组代码解析</button>
      <button type="button" class="hs-tool-btn" @click="$emit('navigate', '/hearthstone/lookup')">查看卡牌</button>
    </div>
  </nav>
</template>

<script setup>
defineEmits(['navigate'])
</script>

<style scoped>
.hs-tool-nav {
  grid-column: 1 / -1;
  width: 100%;
  margin: 18px 0 4px;
  padding: 14px 16px 16px;
  border: 1px solid var(--hs-border);
  border-radius: 14px;
  background: var(--hs-hero-bg);
}
.hs-tool-btn {
  min-height: 44px;
  padding: 9px 13px;
  color: var(--hs-text-soft);
  border: 1px solid var(--hs-border);
  border-radius: 10px;
  background: var(--hs-inset-bg);
  transition: transform 0.2s ease, border-color 0.2s ease, background 0.2s ease;
}
.hs-tool-btn:hover,
.hs-tool-btn-featured:hover {
  border-color: var(--hs-gold-soft);
  transform: translateY(-1px);
}
.hs-tool-nav-grid {
  display: grid;
  grid-template-columns: repeat(4, minmax(0, 1fr));
  gap: 8px;
}
.hs-tool-btn {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 4px;
  text-align: center;
}
.hs-tool-btn-featured {
  color: #fff8e7;
  border-color: rgba(245, 194, 66, 0.62);
  background: linear-gradient(135deg, #a7660d, #69370c);
}
.hs-tool-btn-featured small {
  color: rgba(255, 248, 231, 0.74);
  font-size: 10px;
  white-space: nowrap;
}
@media (max-width: 760px) {
  .hs-tool-nav-grid { grid-template-columns: repeat(2, minmax(0, 1fr)); }
}
</style>
