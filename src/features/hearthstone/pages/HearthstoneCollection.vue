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
        <label class="hs-collection-search">
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
        <button
          type="button"
          class="hs-btn hs-btn-ghost hs-browse-unowned"
          :class="{ active: statusFilter === 'missing' }"
          @click="browseUnowned"
        >从未收藏开始浏览</button>
        <span v-if="user" class="hs-btn hs-btn-ghost is-disabled" aria-disabled="true" title="正在测试中">下载 Firestone 导出工具（测试中）</span>
        <button v-if="user" type="button" class="hs-btn hs-btn-ghost" disabled title="正在测试中">选择导出的 JSON 文件（测试中）</button>
        <input ref="importFileInput" class="hs-firestone-file-input" type="file" accept="application/json,.json" @change="previewFirestoneImport" />
      </div>

      <section v-if="importPreview" class="hs-firestone-import" aria-live="polite">
        <div>
          <strong>Firestone 收藏导入预览</strong>
          <p>文件内有 {{ importPreview.sourceCardBacks }} 个卡背记录、{{ importPreview.sourceCoins }} 个幸运币记录、{{ importPreview.sourceHeroSkins }} 个英雄皮肤记录。</p>
          <p>网站识别到 {{ importPreview.detectedCardBacks }} 个卡背、{{ importPreview.detectedCoins }} 个幸运币、{{ importPreview.detectedHeroSkins }} 个英雄皮肤。</p>
          <p>确认后将新增 {{ importPreview.cardBacks }} 个卡背、{{ importPreview.coins }} 个幸运币、{{ importPreview.heroSkins }} 个英雄皮肤。</p>
          <small v-if="importPreview.unsupportedHeroSkins">另有 {{ importPreview.unsupportedHeroSkins }} 个战棋英雄皮肤 ID；当前网站未收录战棋皮肤，暂不导入。</small>
        </div>
        <div class="hs-firestone-import-actions">
          <button type="button" class="hs-btn hs-btn-ghost" @click="importPreview = null">取消</button>
          <button type="button" class="hs-btn hs-btn-primary" :disabled="profileSaving" @click="confirmFirestoneImport">确认导入</button>
        </div>
      </section>

      <p id="cosmetic-search-scope" class="hs-search-scope" aria-live="polite">
        <template v-if="isGlobalSearch">
          正在全部收藏中搜索“{{ normalizedQuery }}”，找到 {{ filteredItems.length }} 个结果
        </template>
        <template v-else>仅按名称搜索全部英雄皮肤、幸运币和卡背。先下载并运行导出工具，再选择生成的 JSON 文件即可预览导入。</template>
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
              <span v-if="isDirectImage(item)" class="hs-direct-hero-image">
                <img :src="item.imageUrl" :alt="item.officialName" loading="lazy" decoding="async" />
              </span>
              <span v-else-if="item.cosmeticType === 'heroSkins'" class="hs-hero-portrait-crop">
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
          aria-label="首页"
          @click="currentPage = 1"
        >首页</button>
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
        <button
          type="button"
          :disabled="pagination.currentPage >= pagination.pageCount"
          aria-label="末页"
          @click="currentPage = pagination.pageCount"
        >末页</button>
        <span class="hs-jump-page">
          跳至
          <input
            type="number"
            min="1"
            :max="pagination.pageCount"
            v-model.number="jumpInput"
            @keyup.enter="goToPage"
            aria-label="跳转到指定页码"
          />
          页
          <button
            type="button"
            class="hs-jump-page-btn"
            @click="goToPage"
          >跳转</button>
        </span>
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
              :class="{ 'hero-portrait-modal': selectedItem.cosmeticType === 'heroSkins' && !isDirectImage(selectedItem) }"
            >
              <span v-if="isDirectImage(selectedItem)" class="hs-direct-hero-image">
                <img :src="selectedItem.imageUrl" :alt="selectedItem.officialName" />
              </span>
              <span v-else-if="selectedItem.cosmeticType === 'heroSkins'" class="hs-hero-portrait-crop">
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
import heroSkins from '../data/hero-skins.json'
import coins from '../data/coins.json'
import cardBacks from '../data/card-backs.json'
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

// 与游戏“幸运币”收藏页一致：基础幸运币 + 54 个当前外观币。
// 四个旧扩展奖励币（FP1/GVG/AT/LOE）保留在原始资料中，但不在此收藏页展示。
const COIN_DISPLAY_ORDER = [
  'DMF_COIN1', 'ULD_COIN', 'DRG_COIN', 'BT_COIN', 'BAR_COIN3', 'DMF_COIN2', 'BAR_COIN2', 'BAR_COIN1', 'DAL_COIN',
  'SW_COIN1', 'SW_COIN2', 'AV_COIN1', 'AV_COIN2', 'TSC_COIN1', 'TSC_COIN2', 'REV_COIN2', 'REV_COIN1',
  'RLK_COIN1', 'RLK_COIN2', 'ETC_COIN1', 'ETC_COIN2', 'TTN_COIN1', 'TTN_COIN2', 'WW_COIN1', 'WW_COIN2',
  'MUDAN_COIN1', 'TOY_COIN3', 'TOY_COIN1', 'TOY_COIN2', 'VAC_COIN1', 'VAC_COIN2', 'GDB_COIN2', 'GDB_COIN1',
  'EDR_COIN1', 'EDR_COIN2', 'DINO_COIN1', 'TLC_COIN2', 'TLC_COIN1', 'TIME_COIN4', 'TIME_COIN2', 'TIME_COIN1',
  'TIME_EVENT_COIN', 'CATA_COIN1', 'CATA_COIN4', 'CATA_COIN5', 'CATA_COIN3', 'JAIL_COIN3', 'JAIL_COIN1',
  'DFT_ALEX_COIN1', 'DINO_COIN2', 'TIME_COIN3', 'CATA_COIN2', 'CATA_COIN6', 'JAIL_COIN2'
]
const DEFAULT_COIN = {
  id: 'coins-game_005',
  cardId: 'GAME_005',
  dbfId: 5,
  officialName: '幸运币',
  flavorText: '最基础的幸运币。',
  howToGet: '默认拥有。',
  availability: '',
  imageUrl: 'https://art.hearthstonejson.com/v1/render/latest/zhCN/512x/GAME_005.png',
  source: 'Hearthstone 基础卡',
  sourceUrl: ''
}
const DEATH_KNIGHT_DISPLAY_ORDER = [
  // 以用户提供的游戏截图、文件名顺序为准；已拥有项目会稳定地排在这一顺序前段。
  'HERO_11', 'HERO_11n', 'HERO_11am', 'HERO_11p_LichKing', 'HERO_11t_Lanathel_hls', 'HERO_11ab',
  'HERO_11ar', 'HERO_11af', 'HERO_11v', 'HERO_11ad', 'HERO_11al', 'HERO_11s_Scarlet_hls',
  'HERO_11bd', 'HERO_11o_ReskathePitBoss', 'HERO_11ao', 'HERO_11aa', 'HERO_11r_SaiShadestorm', 'HERO_11q_LichKing',
  'HERO_11bc', 'HERO_11c', 'HERO_11ah', 'HERO_11ae', 'HERO_11aw', 'HERO_11z', 'HERO_11ag', 'HERO_11w',
  'HERO_11m', 'HERO_11aj', 'HERO_11f', 'HERO_11d', 'HERO_11a', 'HERO_11an', 'HERO_11i', 'HERO_11az',
  'HERO_11e', 'HERO_11as', 'HERO_11aq', 'HERO_11x', 'HERO_11j', 'HERO_11ax', 'HERO_11y', 'HERO_11ai',
  'HERO_11h', 'HERO_11bi', 'HERO_11k', 'HERO_11ac', 'HERO_11u_Arfus', 'HERO_11b', 'HERO_11g', 'HERO_11l', 'HERO_11ay'
]
const coinByCardId = new Map(coins.map((item) => [item.cardId, item]))
const heroSkinByCardId = new Map(heroSkins.map((item) => [item.cardId, item]))
const collectionCatalog = {
  heroSkins: [
    ...heroSkins.filter((item) => item.heroClass !== '死亡骑士'),
    ...DEATH_KNIGHT_DISPLAY_ORDER.map((cardId) => heroSkinByCardId.get(cardId)).filter(Boolean)
  ].filter((item) => !item.hidden),
  coins: [DEFAULT_COIN, ...COIN_DISPLAY_ORDER.map((cardId) => coinByCardId.get(cardId)).filter(Boolean)].filter((item) => !item.hidden),
  cardBacks: cardBacks.filter((item) => !item.hidden)
}

const router = useRouter()
const { user, init: initAuth } = useAuth()
const { hsTheme } = useHearthstoneTheme()
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
const jumpInput = ref('')
const saveError = ref('')
const selectedItem = ref(null)
const detailsDialog = ref(null)
const importFileInput = ref(null)
const importPreview = ref(null)
const globalItems = getGlobalCosmeticItems(collectionCatalog)
const currentType = computed(() => COSMETIC_TYPES.find((type) => type.id === activeType.value))
const normalizedQuery = computed(() => query.value.trim())
const isGlobalSearch = computed(() => Boolean(normalizedQuery.value))
const currentItems = computed(() => (collectionCatalog[activeType.value] || []).map((item) => ({
  ...item,
  cosmeticType: activeType.value,
  cosmeticTypeLabel: currentType.value.label
})))
const ownedIds = computed(() => new Set(Object.values(profile.value.collection).flat()))
const stats = computed(() => getCollectionStats(collectionCatalog, profile.value.collection))
const heroClassStats = computed(() =>
  getHeroClassStats(collectionCatalog.heroSkins, profile.value.collection.heroSkins)
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

// 神枪手阿兰娜（Deadeye Aranna, HERO_10aj_Aranna）使用全幅原图，
// 不走英雄头像圆形裁剪框，改为直接展示整张图片。
const DIRECT_IMAGE_CARD_IDS = new Set(['HERO_10aj_Aranna'])
function isDirectImage(item) {
  return Boolean(item) && DIRECT_IMAGE_CARD_IDS.has(item.cardId)
}

function openDetails(item) {
  selectedItem.value = item
}

function closeDetails() {
  selectedItem.value = null
}

function browseUnowned() {
  query.value = ''
  statusFilter.value = 'missing'
  currentPage.value = 1
}

function readIdList(payload, keys) {
  for (const key of keys) {
    const value = payload?.[key] ?? payload?.collection?.[key]
    if (Array.isArray(value)) return value
  }
  return []
}

function getImportedIds(payload) {
  const cardBackById = new Map(cardBacks.map((item) => [Number(item.cardBackId), item.id]))
  const coinByDbfId = new Map(collectionCatalog.coins.map((item) => [Number(item.dbfId), item.id]))
  const cardBackSource = readIdList(payload, ['cardBackIds', 'cardBacks'])
  const coinSource = readIdList(payload, ['coinDbfIds', 'coins'])
  const heroSkinSource = readIdList(payload, ['heroSkinDbfIds', 'heroSkins'])
  const importedCardBacks = new Set(cardBackSource.map((id) => {
    const value = String(id)
    return cardBackById.get(Number(id)) || (cardBacks.some((item) => item.id === value) ? value : '')
  }).filter(Boolean))
  const importedCoins = new Set(coinSource.map((id) => {
    const value = String(id)
    return coinByDbfId.get(Number(id)) || (collectionCatalog.coins.some((item) => item.id === value) ? value : '')
  }).filter(Boolean))
  return { cardBacks: importedCardBacks, coins: importedCoins, heroSkins: new Set(), cardBackSource, coinSource, heroSkinSource }
}

async function previewFirestoneImport(event) {
  const file = event.target.files?.[0]
  event.target.value = ''
  if (!file) return
  try {
    const payload = JSON.parse(await file.text())
    const imported = getImportedIds(payload)
    importPreview.value = {
      cardBackIds: imported.cardBacks,
      coinIds: imported.coins,
      heroSkinIds: imported.heroSkins,
      sourceCardBacks: imported.cardBackSource.length,
      sourceCoins: imported.coinSource.length,
      sourceHeroSkins: imported.heroSkinSource.length,
      detectedCardBacks: imported.cardBacks.size,
      detectedCoins: imported.coins.size,
      detectedHeroSkins: imported.heroSkins.size,
      cardBacks: [...imported.cardBacks].filter((id) => !profile.value.collection.cardBacks.includes(id)).length,
      coins: [...imported.coins].filter((id) => !profile.value.collection.coins.includes(id)).length,
      heroSkins: [...imported.heroSkins].filter((id) => !profile.value.collection.heroSkins.includes(id)).length,
      unsupportedHeroSkins: Array.isArray(payload?.battlegroundsHeroSkinDbfIds) ? payload.battlegroundsHeroSkinDbfIds.length : 0
    }
    saveError.value = ''
  } catch {
    saveError.value = '无法识别导入文件。请选择由 Firestone 收藏导出工具生成的 JSON 文件。'
  }
}

async function confirmFirestoneImport() {
  if (!importPreview.value || profileSaving.value) return
  const preview = importPreview.value
  saveError.value = ''
  try {
    await save({
      ...profile.value,
      collection: {
        heroSkins: [...new Set([...profile.value.collection.heroSkins, ...preview.heroSkinIds])],
        coins: [...new Set([...profile.value.collection.coins, ...preview.coinIds])],
        cardBacks: [...new Set([...profile.value.collection.cardBacks, ...preview.cardBackIds])]
      }
    })
    importPreview.value = null
  } catch (error) {
    saveError.value = error.message || '收藏导入失败，请重试'
  }
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

function goToPage() {
  const raw = Number(jumpInput.value)
  if (!Number.isFinite(raw) || raw < 1) {
    jumpInput.value = ''
    return
  }
  const target = Math.min(Math.max(1, Math.floor(raw)), pagination.value.pageCount)
  currentPage.value = target
  jumpInput.value = ''
}
</script>

<style scoped src="../styles/hearthstone-collection.css"></style>
