<template>
  <article class="ai-insight-panel" aria-label="AI 生成的洞察">
    <header class="ai-insight-panel__header">
      <span>{{ eyebrow }}</span>
      <h2>{{ headline }}</h2>
    </header>

    <p class="ai-insight-panel__body">{{ body }}</p>

    <section v-if="evidence.length" class="ai-insight-panel__evidence" aria-labelledby="ai-evidence-title">
      <h3 id="ai-evidence-title">{{ evidenceLabel }}</h3>
      <ul>
        <li v-for="item in evidence" :key="item">{{ item }}</li>
      </ul>
    </section>

    <div v-if="sections.length" class="ai-insight-panel__sections">
      <section v-for="section in sections" :key="section.label">
        <h3>{{ section.label }}</h3>
        <p>{{ section.content }}</p>
      </section>
    </div>
  </article>
</template>

<script setup>
defineProps({
  eyebrow: { type: String, default: 'AI 生成 · 仅供参考' },
  headline: { type: String, required: true },
  body: { type: String, required: true },
  evidence: { type: Array, default: () => [] },
  evidenceLabel: { type: String, default: '判断依据' },
  sections: { type: Array, default: () => [] }
})
</script>

<style scoped>
.ai-insight-panel {
  display: grid;
  gap: 20px;
  padding: clamp(20px, 3vw, 30px);
  border: 1px solid var(--ai-insight-border, var(--color-border));
  border-radius: var(--radius-lg, 16px);
  background: var(--ai-insight-bg, var(--color-surface));
  box-shadow: var(--shadow-sm);
}

.ai-insight-panel__header {
  display: grid;
  gap: 7px;
}

.ai-insight-panel__header span {
  color: var(--ai-insight-accent, var(--color-primary));
  font-size: 0.78rem;
  font-weight: 750;
  letter-spacing: 0.06em;
}

.ai-insight-panel h2,
.ai-insight-panel h3,
.ai-insight-panel p {
  margin: 0;
}

.ai-insight-panel h2 {
  color: var(--color-text);
  font-size: clamp(1.18rem, 2.4vw, 1.48rem);
  line-height: 1.35;
}

.ai-insight-panel__body {
  color: var(--color-text);
  font-size: 1rem;
  line-height: 1.82;
}

.ai-insight-panel__evidence {
  padding: 16px 18px;
  border-left: 3px solid var(--ai-insight-accent, var(--color-primary));
  border-radius: 0 var(--radius-md, 10px) var(--radius-md, 10px) 0;
  background: var(--ai-insight-muted, var(--color-surface-soft));
}

.ai-insight-panel h3 {
  color: var(--color-text-secondary);
  font-size: 0.82rem;
  letter-spacing: 0.04em;
}

.ai-insight-panel ul {
  display: grid;
  gap: 8px;
  margin: 12px 0 0;
  padding-left: 20px;
}

.ai-insight-panel li {
  color: var(--color-text-secondary);
  line-height: 1.65;
}

.ai-insight-panel__sections {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(220px, 1fr));
  gap: 12px;
}

.ai-insight-panel__sections section {
  display: grid;
  gap: 8px;
  padding: 16px;
  border: 1px solid var(--ai-insight-border, var(--color-border));
  border-radius: var(--radius-md, 10px);
  background: var(--ai-insight-section-bg, var(--color-surface));
}

.ai-insight-panel__sections p {
  color: var(--color-text);
  line-height: 1.68;
}

@media (max-width: 600px) {
  .ai-insight-panel__sections {
    grid-template-columns: 1fr;
  }
}
</style>
