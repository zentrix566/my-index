<template>
  <aside class="todo-sidebar">
    <RouterLink to="/todo" class="todo-brand">日程管理</RouterLink>

    <div class="todo-section-title">日常</div>
    <nav class="todo-nav">
      <RouterLink to="/todo" class="todo-nav-item">
        <span class="todo-nav-ico">☐</span>今日待办
      </RouterLink>
      <RouterLink to="/todo/done" class="todo-nav-item">
        <span class="todo-nav-ico">✓</span>今日已完成
      </RouterLink>
    </nav>

    <div class="todo-section-title">管理</div>
    <nav class="todo-nav">
      <RouterLink to="/todo/calendar" class="todo-nav-item">
        <span class="todo-nav-ico">📅</span>日历视图
      </RouterLink>
      <RouterLink to="/todo/manage" class="todo-nav-item">
        <span class="todo-nav-ico">🗓️</span>日程管理
      </RouterLink>
      <RouterLink to="/todo/ai" class="todo-nav-item">
        <span class="todo-nav-ico">🤖</span>日程 AI
      </RouterLink>
      <RouterLink to="/todo/groups" class="todo-nav-item">
        <span class="todo-nav-ico">⚙️</span>分组设置
      </RouterLink>
    </nav>

    <div class="todo-section-title">我的分组</div>
    <nav class="todo-nav">
      <RouterLink
        v-for="l in lists"
        :key="l.id"
        :to="`/todo/list/${l.id}`"
        class="todo-nav-item"
      >
        <span class="todo-nav-ico">{{ l.icon || '📁' }}</span>{{ l.name }}
      </RouterLink>
      <p v-if="!lists.length" class="todo-empty-hint" style="padding: 0 10px">还没有分组，点下方新建</p>
    </nav>

    <button class="todo-new-group" type="button" @click="$emit('new-group')">＋ 新建分组</button>
  </aside>
</template>

<script setup>
defineProps({
  lists: { type: Array, default: () => [] }
})
defineEmits(['new-group'])
</script>
