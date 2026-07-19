<template>
  <div class="changelog-page">
    <div class="changelog-container">
      <header class="changelog-header">
        <h1>更新说明</h1>
        <p class="changelog-sub">站点与炉石成就查看器的功能、数据更新记录（按时间倒序）</p>
      </header>

      <ol class="changelog-list">
        <li
          v-for="entry in changelog"
          :key="entry.date + entry.title"
          class="changelog-item"
        >
          <div class="changelog-meta">
            <span class="changelog-date">{{ entry.date }}</span>
            <h2 class="changelog-title">{{ entry.title }}</h2>
          </div>
          <ul class="changelog-changes">
            <li v-for="(c, i) in entry.changes" :key="i">{{ c }}</li>
          </ul>
        </li>
      </ol>
    </div>
  </div>
</template>

<script setup>
import { changelog } from '../data/changelog.js'
</script>

<style scoped>
.changelog-page {
  max-width: 820px;
  margin: 0 auto;
  padding: 32px 20px 64px;
}

.changelog-header {
  margin-bottom: 28px;
}

.changelog-header h1 {
  font-size: 28px;
  margin: 0 0 6px;
  color: #1f1f2e;
}

.changelog-sub {
  color: #8a8a8a;
  margin: 0;
  font-size: 14px;
}

.changelog-list {
  list-style: none;
  margin: 0;
  padding: 0;
}

.changelog-item {
  position: relative;
  padding: 0 0 28px 22px;
  border-left: 2px solid #ececec;
}

.changelog-item:last-child {
  border-left-color: transparent;
  padding-bottom: 0;
}

.changelog-item::before {
  content: '';
  position: absolute;
  left: -7px;
  top: 4px;
  width: 12px;
  height: 12px;
  border-radius: 50%;
  background: #6c5ce7;
  box-shadow: 0 0 0 3px #fff;
}

.changelog-meta {
  display: flex;
  align-items: baseline;
  gap: 12px;
  flex-wrap: wrap;
}

.changelog-date {
  font-size: 13px;
  color: #6c5ce7;
  font-weight: 600;
  font-variant-numeric: tabular-nums;
}

.changelog-title {
  font-size: 18px;
  margin: 0;
  color: #2c2c3a;
}

.changelog-changes {
  margin: 10px 0 0;
  padding-left: 18px;
  color: #444;
  font-size: 14px;
  line-height: 1.7;
}

.changelog-changes li {
  margin-bottom: 4px;
}
</style>
