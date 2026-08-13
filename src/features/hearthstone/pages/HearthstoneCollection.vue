<template>
  <section class="section page-section hs-page hs-collection-page" :data-hs-theme="hsTheme">
    <div class="container">
      <header class="hs-collection-hero">
        <div>
          <p class="eyebrow">Hearthstone Collection</p>
          <h1>炉石外观收藏</h1>
          <p>像游戏收藏册一样查看英雄皮肤、幸运币和卡背。已拥有保持彩色，未拥有显示为黑白。</p>
        </div>
        <div class="hs-collection-actions">
          <button type="button" class="hs-btn hs-btn-ghost" @click="router.push('/hearthstone')">返回成就</button>
          <button type="button" class="hs-btn hs-btn-ghost" @click="toggleTheme">
            {{ hsTheme === 'dark' ? '明亮主题' : '暗色主题' }}
          </button>
        </div>
      </header>

      <div v-if="!user" class="hs-collection-notice" role="status">
        登录后即可勾选并同步收藏状态。
        <button type="button" @click="router.push({ path: '/login', query: { redirect: '/hearthstone/collection', source: 'hearthstone' } })">登录 / 注册</button>
      </div>
      <div v-else-if="saveError" class="hs-collection-notice error" role="alert">{{ saveError }}</div>

      <nav class="hs-collection-tabs" aria-label="收藏类型">
        <button
          v-for="type in COSMETIC_TYPES"
          :key="type.id"
          type="button"
          :class="{ active: activeType === type.id }"
          :aria-current="activeType === type.id ? 'page' : undefined"
          @click="activeType = type.id"
        >
          <strong>{{ type.label }}</strong>
          <span class="hs-type-progress-copy">
            {{ stats.byType[type.id].owned }}/{{ stats.byType[type.id].total }}
            · {{ stats.byType[type.id].percentage }}%
          </span>
          <span
            class="hs-type-progress"
            role="progressbar"
            :aria-label="`${type.label}收藏进度`"
            :aria-valuenow="stats.byType[type.id].percentage"
            aria-valuemin="0"
            aria-valuemax="100"
          >
            <i :style="{ width: `${stats.byType[type.id].percentage}%` }"></i>
          </span>
        </button>
      </nav>

      <nav
        v-if="activeType === 'heroSkins' && !isGlobalSearch"
        class="hs-hero-class-tabs"
        aria-label="选择英雄职业"
      >
        <button
          v-for="hero in heroClassStats"
          :key="hero.heroClass"
          type="button"
          role="tab"
          :class="{ active: activeHeroClass === hero.heroClass }"
          :aria-selected="activeHeroClass === hero.heroClass"
          @click="activeHeroClass = hero.heroClass"
        >
          <strong>{{ hero.heroClass }}</strong>
          <span>{{ hero.owned }}/{{ hero.total }} · {{ hero.percentage }}%</span>
          <span
            class="hs-hero-progress"
            role="progressbar"
            :aria-label="`${hero.heroClass}英雄皮肤收藏进度`"
            :aria-valuenow="hero.percentage"
            aria-valuemin="0"
            aria-valuemax="100"
          >
            <i :style="{ width: `${hero.percentage}%` }"></i>
          </span>
        </button>
      </nav>

      <div class="hs-collection-toolbar">
        <label>
          <span class="hs-visually-hidden">搜索收藏</span>
          <input
            v-model="query"
            type="search"
            placeholder="按名称搜索全部皮肤、幸运币和卡背…"
            aria-describedby="cosmetic-search-scope"
          />
        </label>
        <label class="hs-collection-filter">
          <span>显示</span>
          <select v-model="statusFilter">
            <option value="all">全部</option>
            <option value="owned">已拥有</option>
            <option value="missing">未拥有</option>
          </select>
        </label>
      </div>

      <p id="cosmetic-search-scope" class="hs-search-scope" aria-live="polite">
        <template v-if="isGlobalSearch">
          正在全部收藏中搜索“{{ normalizedQuery }}”，找到 {{ filteredItems.length }} 个结果
        </template>
        <template v-else>仅按名称搜索全部英雄皮肤、幸运币和卡背</template>
      </p>

      <div v-if="profileLoading" class="hs-collection-empty" role="status">正在加载收藏…</div>
      <div v-else-if="!currentItems.length" class="hs-collection-empty">
        {{ currentType.emptyText }}。请先运行收藏图片上传脚本生成清单。
      </div>
      <div v-else-if="!filteredItems.length" class="hs-collection-empty" role="status">
        没有找到符合条件的收藏，请尝试缩短关键词或切换拥有状态。
      </div>
      <div
        v-else
        class="hs-collection-grid"
        :class="!isGlobalSearch && activeType === 'heroSkins' ? 'hero-layout' : 'cosmetic-layout'"
      >
        <article
          v-for="item in pagination.items"
          :key="item.id"
          class="hs-cosmetic-card"
          :class="[{ owned: isOwned(item), missing: !isOwned(item) }, `type-${item.cosmeticType}`]"
        >
          <button
            type="button"
            class="hs-cosmetic-detail-trigger"
            :disabled="profileSaving"
            :aria-label="`查看${item.cosmeticTypeLabel}“${item.officialName}”详情`"
            @click="openDetails(item)"
          >
            <span class="hs-cosmetic-image-wrap">
              <span v-if="item.cosmeticType === 'heroSkins'" class="hs-hero-portrait-crop">
                <img :src="item.imageUrl" :alt="item.officialName" loading="lazy" decoding="async" />
              </span>
              <img v-else :src="item.imageUrl" :alt="item.officialName" loading="lazy" decoding="async" />
            </span>
            <strong class="hs-cosmetic-name">{{ item.officialName }}</strong>
            <small>{{ item.cosmeticTypeLabel }}<template v-if="item.heroClass"> · {{ item.heroClass }}</template></small>
          </button>
          <button
            v-if="user"
            type="button"
            class="hs-cosmetic-state"
            :class="{ active: isOwned(item) }"
            :disabled="profileSaving"
            :aria-pressed="isOwned(item)"
            :aria-label="`${isOwned(item) ? '取消拥有' : '标记拥有'}${item.officialName}`"
            @click="toggleOwned(item)"
          >{{ isOwned(item) ? '✓ 已拥有' : '标记为已拥有' }}</button>
          <span v-else class="hs-cosmetic-state login-required">登录后可标记拥有</span>
        </article>
      </div>

      <nav v-if="filteredItems.length" class="hs-collection-pagination" aria-label="收藏分页">
        <button
          type="button"
          :disabled="pagination.currentPage <= 1"
          aria-label="上一页"
          @click="currentPage -= 1"
        >上一页</button>
        <span aria-live="polite">
          第 {{ pagination.currentPage }} / {{ pagination.pageCount }} 页
          <small>显示 {{ pagination.start + 1 }}–{{ pagination.end }}，共 {{ pagination.total }} 个</small>
        </span>
        <button
          type="button"
          :disabled="pagination.currentPage >= pagination.pageCount"
          aria-label="下一页"
          @click="currentPage += 1"
        >下一页</button>
      </nav>

      <Teleport to="body">
        <div
          v-if="selectedItem"
          class="hs-page hs-cosmetic-modal"
          :data-hs-theme="hsTheme"
          @click.self="closeDetails"
        >
          <article
            ref="detailsDialog"
            class="hs-cosmetic-modal-card"
            :class="`detail-${selectedItem.cosmeticType}`"
            role="dialog"
            aria-modal="true"
            :aria-labelledby="`cosmetic-title-${selectedItem.id}`"
            tabindex="-1"
          >
            <button type="button" class="hs-cosmetic-modal-close" aria-label="关闭详情" @click="closeDetails">×</button>
            <div
              class="hs-cosmetic-modal-image"
              :class="{ 'hero-portrait-modal': selectedItem.cosmeticType === 'heroSkins' }"
            >
              <span v-if="selectedItem.cosmeticType === 'heroSkins'" class="hs-hero-portrait-crop">
                <img :src="selectedItem.imageUrl" :alt="selectedItem.officialName" />
              </span>
              <img v-else :src="selectedItem.imageUrl" :alt="selectedItem.officialName" />
            </div>
            <div class="hs-cosmetic-modal-content">
              <p class="hs-cosmetic-modal-type">{{ selectedItem.cosmeticTypeLabel }}<template v-if="selectedItem.heroClass"> · {{ selectedItem.heroClass }}</template></p>
              <h2 :id="`cosmetic-title-${selectedItem.id}`">{{ selectedItem.officialName }}</h2>
              <dl>
                <div>
                  <dt>风味描述</dt>
                  <dd>{{ selectedItem.flavorText || '暂无中文风味描述' }}</dd>
                </div>
                <div>
                  <dt>获取方式</dt>
                  <dd>{{ selectedItem.howToGet || '暂无可靠的中文获取记录' }}</dd>
                </div>
                <div v-if="selectedItem.availability">
                  <dt>当前状态</dt>
                  <dd>{{ selectedItem.availability }}</dd>
                </div>
              </dl>
              <a
                v-if="selectedItem.sourceUrl"
                :href="selectedItem.sourceUrl"
                target="_blank"
                rel="noopener noreferrer"
                class="hs-cosmetic-source-link"
              >查看资料来源</a>
              <button
                v-if="user"
                type="button"
                class="hs-btn hs-btn-primary hs-cosmetic-owned-action"
                :disabled="profileSaving"
                @click="toggleOwned(selectedItem)"
              >
                {{ isOwned(selectedItem) ? '标记为未拥有' : '标记为已拥有' }}
              </button>
            </div>
          </article>
        </div>
      </Teleport>
    </div>
  </section>
</template>

<script setup>
import { computed, ref, watch } from 'vue'
import { useRouter } from 'vue-router'
import catalog from '../data/cosmetics.json'
import { useAuth } from '../../../auth/useAuth.js'
import { useHearthstoneTheme } from '../composables/useHearthstoneTheme.js'
import { useHearthstoneProfile } from '../composables/useHearthstoneProfile.js'
import { useDialogFocus } from '../composables/useDialogFocus.js'
import {
  COSMETIC_TYPES,
  getCosmeticPageSize,
  getCollectionStats,
  getGlobalCosmeticItems,
  getHeroClassStats,
  HERO_CLASS_ORDER,
  paginateCosmetics,
  searchCosmetics,
  sortOwnedCosmeticsFirst
} from '../utils/cosmetics.js'

const router = useRouter()
const { user, init: initAuth } = useAuth()
const { hsTheme, toggleTheme } = useHearthstoneTheme()
const {
  profile,
  loading: profileLoading,
  saving: profileSaving,
  load,
  save
} = useHearthstoneProfile()

const activeType = ref('heroSkins')
const activeHeroClass = ref(HERO_CLASS_ORDER[0])
const query = ref('')
const statusFilter = ref('all')
const currentPage = ref(1)
const saveError = ref('')
const selectedItem = ref(null)
const detailsDialog = ref(null)
const globalItems = getGlobalCosmeticItems(catalog)
const currentType = computed(() => COSMETIC_TYPES.find((type) => type.id === activeType.value))
const normalizedQuery = computed(() => query.value.trim())
const isGlobalSearch = computed(() => Boolean(normalizedQuery.value))
const currentItems = computed(() => (catalog[activeType.value] || []).map((item) => ({
  ...item,
  cosmeticType: activeType.value,
  cosmeticTypeLabel: currentType.value.label
})))
const ownedIds = computed(() => new Set(Object.values(profile.value.collection).flat()))
const stats = computed(() => getCollectionStats(catalog, profile.value.collection))
const heroClassStats = computed(() =>
  getHeroClassStats(catalog.heroSkins, profile.value.collection.heroSkins)
)
const filteredItems = computed(() => {
  const sourceItems = isGlobalSearch.value
    ? searchCosmetics(globalItems, normalizedQuery.value)
    : currentItems.value
  const matchingItems = sourceItems.filter((item) => {
    const owned = isOwned(item)
    if (!isGlobalSearch.value && activeType.value === 'heroSkins' && item.heroClass !== activeHeroClass.value) return false
    if (statusFilter.value === 'owned' && !owned) return false
    if (statusFilter.value === 'missing' && owned) return false
    return true
  })
  return sortOwnedCosmeticsFirst(matchingItems, ownedIds.value)
})
const pageSize = computed(() => getCosmeticPageSize(isGlobalSearch.value ? 'global' : activeType.value))
const pagination = computed(() => paginateCosmetics(filteredItems.value, currentPage.value, pageSize.value))

function isOwned(item) {
  return new Set(profile.value.collection[item.cosmeticType] || []).has(item.id)
}

function openDetails(item) {
  selectedItem.value = item
}

function closeDetails() {
  selectedItem.value = null
}

useDialogFocus(computed(() => Boolean(selectedItem.value)), detailsDialog, closeDetails)

async function toggleOwned(item) {
  if (!user.value || profileSaving.value) return
  const type = item.cosmeticType
  const current = profile.value.collection[type]
  const next = current.includes(item.id)
    ? current.filter((id) => id !== item.id)
    : [...current, item.id]
  saveError.value = ''
  try {
    await save({
      ...profile.value,
      collection: { ...profile.value.collection, [type]: next }
    })
  } catch (error) {
    saveError.value = error.message || '收藏保存失败，请重试'
  }
}

initAuth()
watch(user, (value) => {
  if (value) load({ force: true }).catch(() => {})
}, { immediate: true })
watch([activeType, activeHeroClass, query, statusFilter], () => {
  currentPage.value = 1
})
watch(() => pagination.value.currentPage, (page) => {
  if (currentPage.value !== page) currentPage.value = page
})
</script>

<style scoped src="../styles/hearthstone-collection.css"></style>
