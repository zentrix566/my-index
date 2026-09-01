<template>
  <Teleport to="body">
    <div v-if="preview" class="notes-share-backdrop" role="presentation" @click.self="$emit('close')">
      <section class="notes-share-preview" role="dialog" aria-modal="true" aria-label="分享图片预览">
        <header>
          <div><p>本地生成，不会上传内容</p><h2>分享图片预览</h2></div>
          <button type="button" aria-label="关闭预览" @click="$emit('close')">×</button>
        </header>
        <div class="notes-share-preview__canvas"><img :src="preview.dataUrl" alt="灵感记录分享图片预览" /></div>
        <footer><button class="notes-button notes-button--quiet" type="button" @click="$emit('close')">返回详情</button><button class="notes-button" type="button" @click="$emit('download')">下载图片</button></footer>
      </section>
    </div>
  </Teleport>
</template>

<script setup>
defineProps({ preview: { type: Object, default: null } })
defineEmits(['close', 'download'])
</script>

<style scoped>
.notes-share-backdrop { position:fixed; z-index:2147483001; inset:0; display:grid; place-items:center; padding:24px; background:rgba(15,23,42,.64); }
.notes-share-preview { display:grid; width:min(760px,100%); max-height:calc(100dvh - 48px); overflow:hidden; border:1px solid #ded5f4; border-radius:20px; background:linear-gradient(145deg,#f8f5ff,#eef5ff); box-shadow:0 30px 90px rgba(15,23,42,.42); }
.notes-share-preview header { display:flex; align-items:center; justify-content:space-between; gap:16px; padding:20px 24px 16px; }
.notes-share-preview header p { margin:0 0 3px; color:#75658e; font-size:.78rem; }
.notes-share-preview h2 { margin:0; color:#2d155d; font-size:1.18rem; }
.notes-share-preview header button { display:grid; width:40px; height:40px; place-items:center; border:0; border-radius:50%; background:rgba(255,255,255,.8); color:#4a3b5d; font:inherit; font-size:1.7rem; cursor:pointer; }
.notes-share-preview__canvas { min-height:0; overflow:auto; padding:0 24px; background:rgba(255,255,255,.34); }
.notes-share-preview__canvas img { display:block; width:min(100%,540px); height:auto; margin:0 auto; box-shadow:0 14px 34px rgba(60,37,105,.2); }
.notes-share-preview footer { display:flex; justify-content:flex-end; flex-wrap:wrap; gap:10px; padding:16px 24px 20px; }
.notes-share-preview footer .notes-button { min-width:126px; min-height:44px; border:1px solid #bfaeed; background:rgba(255,255,255,.82); color:#5b21b6; box-shadow:none; }
.notes-share-preview footer .notes-button:hover { border-color:#9e81df; background:#f7f3ff; color:#4c1d95; }
@media (max-width:700px) { .notes-share-backdrop { padding:12px; }.notes-share-preview header,.notes-share-preview footer { padding-right:16px; padding-left:16px; }.notes-share-preview__canvas { padding:0 16px; }.notes-share-preview footer .notes-button { flex:1; } }
</style>
