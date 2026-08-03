<template>
  <section class="wp-page">
    <div class="wp-container">
      <WpNav />
      <WpDashboard />
    </div>
    <WpToastHost />
  </section>
</template>

<script setup>
import WpNav from '../components/WpNav.vue'
import WpDashboard from '../components/WpDashboard.vue'
import WpToastHost from '../components/WpToastHost.vue'
</script>
