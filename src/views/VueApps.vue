<template>
  <section class="section page-section">
    <div class="container">
      <div class="section-heading">
        <p class="eyebrow">Vue Apps</p>
        <h1>我的 Vue 项目</h1>
        <p>用 Vue 写的一些小页面与小工具，从智能运维控制台到自娱自乐的互动小游戏，点卡片直接进入。</p>
      </div>
      <VueAppGrid :apps="vueApps" />
    </div>
  </section>
</template>

<script setup>
import VueAppGrid from '../components/VueAppGrid.vue'
import { vueApps } from '../data/vueApps'
</script>
