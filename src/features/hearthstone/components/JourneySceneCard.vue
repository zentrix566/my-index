<template>
  <article class="hs-journey-scene" :class="{ 'tasks-only': viewMode === 'tasks' }">
    <div class="hs-journey-scene-node">{{ scene.no }}</div>
    <div class="hs-journey-scene-body">
      <h4>{{ scene.title }}</h4>

      <div v-if="viewMode !== 'tasks' && scene.story?.length" class="hs-journey-story">
        <p v-for="(paragraph, i) in scene.story" :key="i">{{ paragraph }}</p>
      </div>

      <div v-if="viewMode !== 'story' && scene.tasks?.length" class="hs-journey-tasks">
        <div class="hs-journey-tasks-head">
          任务
          <span v-if="scene.tasks.length > 1" class="hs-journey-choice">二选一</span>
        </div>
        <ul class="hs-journey-task-list">
          <li v-for="(task, i) in scene.tasks" :key="i" class="hs-journey-task">
            <p class="hs-journey-task-text">{{ task.text }}</p>
            <div v-if="task.bonus?.length" class="hs-journey-bonus">
              <span class="hs-journey-bonus-label">计数加成</span>
              <span v-for="tag in task.bonus" :key="tag" class="hs-journey-bonus-tag">{{ tag }}</span>
            </div>
            <p v-if="task.note" class="hs-journey-task-note">{{ task.note }}</p>
          </li>
        </ul>
      </div>

      <details
        v-if="viewMode !== 'tasks' && scene.voice?.length"
        class="hs-journey-voice"
        :open="viewMode === 'story'"
      >
        <summary>游戏内语音（{{ scene.voice.length }} 段对话）</summary>
        <div class="hs-journey-voice-lines">
          <p
            v-for="(line, i) in scene.voice"
            :key="i"
            class="hs-journey-voice-line"
            :class="line.speaker === '流浪商人' ? 'is-merchant' : 'is-priest'"
          >
            <span class="hs-journey-speaker">{{ line.speaker }}</span>
            <span>{{ line.text }}</span>
          </p>
        </div>
      </details>
    </div>
  </article>
</template>

<script setup>
defineProps({
  scene: { type: Object, required: true },
  // all：剧情+任务+语音；story：只看剧情与语音；tasks：只看任务
  viewMode: { type: String, default: 'all' }
})
</script>
