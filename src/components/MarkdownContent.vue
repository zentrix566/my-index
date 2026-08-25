<template>
  <div v-bind="$attrs" class="markdown-content" :class="className" v-html="html"></div>
</template>

<script setup>
import { computed } from 'vue'
import MarkdownIt from 'markdown-it'

const props = defineProps({
  content: { type: String, default: '' },
  className: { type: [String, Array, Object], default: '' }
})

const markdown = new MarkdownIt({ html: false, linkify: true, breaks: true })
const html = computed(() => markdown.render(props.content || ''))
</script>
