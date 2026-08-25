<template>
  <section class="section page-section hs-page hs-guide-page">
    <div class="container">
      <header class="hs-guide-hero">
        <div>
          <p class="eyebrow"><span class="hs-live-dot" aria-hidden="true"></span> Hearthstone Guide</p>
          <h1>炉石功能手册</h1>
          <p>这里整理各个工具的用途和使用入口，第一次使用时可以从成就查看器开始。</p>
        </div>
        <router-link class="hs-guide-back" to="/hearthstone">返回成就查看器</router-link>
      </header>

      <div class="hs-guide-grid">
        <article v-for="item in guideItems" :key="item.title" class="hs-guide-card">
          <div class="hs-guide-card-top">
            <span class="hs-guide-index">{{ item.index }}</span>
            <h2>{{ item.title }}</h2>
          </div>
          <p>{{ item.description }}</p>
          <router-link :to="item.to">进入功能 <span aria-hidden="true">→</span></router-link>
        </article>
      </div>
    </div>
  </section>
</template>

<script setup>
const guideItems = [
  { index: '01', title: '成就档案', description: '按版本、职业、难度和完成状态浏览成就，登录后可保存进度、置顶目标和导入游戏进度。', to: '/hearthstone' },
  { index: '02', title: '查看卡牌', description: '按名称或 dbfId 查询卡牌，查看费用、身材、效果和卡面信息。', to: '/hearthstone/lookup' },
  { index: '03', title: '卡组代码解析', description: '粘贴游戏内卡组代码，查看卡牌构成、法力曲线、合成造价并导出图片。', to: '/hearthstone/deck' },
  { index: '04', title: '外观收藏', description: '管理英雄皮肤、幸运币和卡背，导入采集结果后查看拥有情况与收藏进度。', to: '/hearthstone/collection' },
  { index: '05', title: '活动与战令计算器', description: '根据当前点数、任务和每日游玩计划，估算活动或战令的完成进度。', to: '/hearthstone/event' },
  { index: '06', title: '暗月宝藏模拟器', description: '模拟暗月宝藏抽取过程，查看奖池、抽取记录和当前结果。', to: '/hearthstone/wheel' },
  { index: '07', title: '蛙生模拟器', description: '从三张随从牌中找出被蛙生修改过的卡牌，支持标准和狂野卡池。', to: '/hearthstone/frog' },
]
</script>

<style scoped>
.hs-guide-hero {
  display: flex;
  align-items: flex-end;
  justify-content: space-between;
  gap: 24px;
  padding: 28px 30px;
  border: 1px solid var(--hs-border);
  border-radius: 18px;
  background: var(--hs-hero-bg);
  box-shadow: var(--hs-shadow-hero);
}
.hs-guide-hero .eyebrow {
  display: flex;
  align-items: center;
  gap: 8px;
  margin: 0 0 10px;
  color: var(--hs-link);
  font-size: 11px;
  letter-spacing: 0.12em;
  text-transform: uppercase;
}
.hs-guide-hero h1 { margin: 0 0 10px; color: var(--hs-text); font-size: clamp(2rem, 4vw, 3.4rem); }
.hs-guide-hero p:not(.eyebrow) { max-width: 620px; margin: 0; color: var(--hs-text-soft); line-height: 1.7; }
.hs-guide-back,
.hs-guide-card a {
  color: var(--hs-link);
  font-weight: 700;
  text-decoration: none;
}
.hs-guide-back { flex: none; padding: 11px 14px; border: 1px solid var(--hs-border); border-radius: 10px; }
.hs-guide-grid { display: grid; grid-template-columns: repeat(4, minmax(0, 1fr)); gap: 12px; margin-top: 16px; }
.hs-guide-card { min-height: 170px; padding: 18px; border: 1px solid var(--hs-border); border-radius: 14px; background: var(--hs-inset-bg); }
.hs-guide-card-top { display: flex; align-items: baseline; gap: 10px; }
.hs-guide-index { color: var(--hs-gold-soft); font: 700 11px "SFMono-Regular", Consolas, monospace; letter-spacing: 0.08em; }
.hs-guide-card h2 { margin: 0; color: var(--hs-text); font-size: 17px; }
.hs-guide-card p { min-height: 66px; margin: 14px 0 16px; color: var(--hs-text-soft); font-size: 13px; line-height: 1.7; }
@media (max-width: 980px) { .hs-guide-grid { grid-template-columns: repeat(2, minmax(0, 1fr)); } }
@media (max-width: 640px) {
  .hs-guide-hero { align-items: flex-start; flex-direction: column; padding: 22px; }
  .hs-guide-grid { grid-template-columns: 1fr; }
}
</style>
