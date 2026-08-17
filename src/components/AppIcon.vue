<template>
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
    <template v-if="name === 'cards'">
      <rect x="5" y="3" width="14" height="18" rx="2"/><path d="m9 9 3-3 3 3-3 3-3-3Z"/><path d="M9 17h6"/>
    </template>
    <template v-else-if="name === 'todo'">
      <rect x="4" y="3" width="16" height="18" rx="2"/><path d="m8 9 1.5 1.5L12 8"/><path d="M14 9h3M8 15h9"/>
    </template>
    <template v-else-if="name === 'shield'">
      <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10Z"/><path d="m9 12 2 2 4-4"/>
    </template>
    <template v-else-if="name === 'moon'">
      <path d="M20 15.5A8.5 8.5 0 0 1 8.5 4 8.5 8.5 0 1 0 20 15.5Z"/><path d="m15 5 .5 1.5L17 7l-1.5.5L15 9l-.5-1.5L13 7l1.5-.5L15 5Z"/>
    </template>
    <template v-else-if="name === 'search'">
      <circle cx="11" cy="11" r="7"/><path d="m20 20-4-4"/>
    </template>
    <template v-else-if="name === 'game'">
      <path d="M8 8h8a5 5 0 0 1 4.7 6.7l-1 2.8a2 2 0 0 1-3.2.8L14 16h-4l-2.5 2.3a2 2 0 0 1-3.2-.8l-1-2.8A5 5 0 0 1 8 8Z"/><path d="M7 12v4M5 14h4M16 13h.01M18 15h.01"/>
    </template>
    <template v-else-if="name === 'subway'">
      <rect x="5" y="3" width="14" height="14" rx="3"/><path d="M5 11h14"/><circle cx="9" cy="14" r="1"/><circle cx="15" cy="14" r="1"/><path d="m8 17 2 3M16 17l-2 3"/>
    </template>
    <template v-else-if="name === 'terminal'">
      <rect x="3" y="4" width="18" height="16" rx="2"/><path d="m7 9 3 3-3 3M13 15h4"/>
    </template>
    <template v-else-if="name === 'clock'">
      <circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/>
    </template>
    <template v-else-if="name === 'calculator'">
      <rect x="5" y="2" width="14" height="20" rx="2"/><path d="M8 6h8M8 11h.01M12 11h.01M16 11h.01M8 15h.01M12 15h.01M16 15h.01M8 19h.01M12 19h4"/>
    </template>
    <template v-else-if="name === 'pipeline'">
      <circle cx="6" cy="6" r="2"/><circle cx="18" cy="18" r="2"/><path d="M8 6h4a4 4 0 0 1 4 4v6M6 8v8a2 2 0 0 0 2 2h8"/>
    </template>
    <template v-else-if="name === 'cloud'">
      <path d="M17.5 19H7a5 5 0 1 1 1.7-9.7A6 6 0 0 1 20 12a3.5 3.5 0 0 1-2.5 7Z"/><path d="m9 14 3-3 3 3M12 11v6"/>
    </template>
    <template v-else>
      <path d="M4 4h6v6H4zM14 4h6v6h-6zM4 14h6v6H4zM14 14h6v6h-6z"/>
    </template>
  </svg>
</template>

<script setup>
defineProps({ name: { type: String, default: 'grid' } })
</script>

