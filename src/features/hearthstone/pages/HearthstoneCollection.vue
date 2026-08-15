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
        <label class="hs-collection-pagesize">
          <span>每页</span>
          <select v-model.number="currentPageSize" aria-label="每页显示数量">
            <option v-for="opt in PAGE_SIZE_OPTIONS" :key="opt" :value="opt">{{ opt }}</option>
          </select>
          <span>个</span>
        </label>
        <button
          type="button"
          class="hs-btn hs-btn-ghost hs-browse-unowned"
          :class="{ active: statusFilter === 'missing' }"
          @click="browseUnowned"
        >从未收藏开始浏览</button>
        <a v-if="user" class="hs-btn hs-btn-ghost" :href="COLLECTOR_DOWNLOAD_URL" download>下载收藏采集工具</a>
        <button v-if="user" type="button" class="hs-btn hs-btn-ghost" @click="importFileInput.click()">选择采集的 JSON 文件</button>
        <button v-if="user" type="button" class="hs-btn hs-btn-ghost hs-bulk-clear" @click="openBulkClear">批量设为未拥有</button>
        <input ref="importFileInput" class="hs-firestone-file-input" type="file" accept="application/json,.json" @change="previewImport" />
      </div>

      <section v-if="importPreview" class="hs-firestone-import" aria-live="polite">
        <div>
          <strong>收藏采集导入预览</strong>
          <p>文件内有 {{ importPreview.sourceCardBacks }} 个卡背记录、{{ importPreview.sourceCoins }} 个幸运币记录、{{ importPreview.sourceHeroSkins }} 个英雄皮肤记录。</p>
          <p>网站识别到 {{ importPreview.detectedCardBacks }} 个卡背、{{ importPreview.detectedCoins }} 个幸运币、{{ importPreview.detectedHeroSkins }} 个英雄皮肤。</p>
          <p>确认后将新增 {{ importPreview.cardBacks }} 个卡背、{{ importPreview.coins }} 个幸运币、{{ importPreview.heroSkins }} 个英雄皮肤。</p>
          <small v-if="importPreview.unmatchedCardBacks || importPreview.unmatchedCoins || importPreview.unmatchedHeroSkins">
            另有 {{ importPreview.unmatchedCardBacks + importPreview.unmatchedCoins + importPreview.unmatchedHeroSkins }} 个 ID 在网站目录暂无名称（多为最新内容未更新或本地目录缺项），不影响已拥有高亮。
          </small>
          <small v-if="importPreview.removedCardBacks || importPreview.removedCoins || importPreview.removedHeroSkins">
            将一并清理 {{ importPreview.removedCardBacks + importPreview.removedCoins + importPreview.removedHeroSkins }} 个已不存在于当前目录的旧 ID（卡背/皮肤目录重建后遗留的标记），避免误命中同名新条目。
          </small>
        </div>
        <div class="hs-firestone-import-actions">
          <button type="button" class="hs-btn hs-btn-ghost" @click="importPreview = null">取消</button>
          <button type="button" class="hs-btn hs-btn-primary" :disabled="profileSaving" @click="confirmImport">确认导入</button>
        </div>
      </section>

      <Teleport to="body">
        <div
          v-if="bulkClearOpen"
          class="hs-page hs-cosmetic-modal"
          :data-hs-theme="hsTheme"
          @click.self="bulkClearOpen = false"
        >
          <article
            class="hs-cosmetic-modal-card bulk-clear-card"
            role="dialog"
            aria-modal="true"
            aria-labelledby="bulk-clear-title"
          >
            <h2 id="bulk-clear-title">
              <span class="hs-bulk-clear-icon" aria-hidden="true">⚠</span>
              确认批量设为未拥有？
            </h2>
            <p>
              将把「<strong>{{ currentType.label }}</strong>」下已拥有的
              <strong class="hs-bulk-clear-count">{{ bulkClearCount }}</strong>
              个外观全部设为未拥有。
            </p>
            <p class="hs-bulk-clear-warn">此操作不可撤销，确定要继续吗？</p>
            <div class="hs-firestone-import-actions hs-bulk-clear-actions">
              <button type="button" class="hs-btn hs-btn-ghost" :disabled="profileSaving" @click="bulkClearOpen = false">取消</button>
              <button type="button" class="hs-btn hs-btn-danger" :disabled="profileSaving" @click="confirmBulkClear">确认设为未拥有</button>
            </div>
          </article>
        </div>
      </Teleport>

      <p id="cosmetic-search-scope" class="hs-search-scope" aria-live="polite">
        <template v-if="isGlobalSearch">
          正在全部收藏中搜索“{{ normalizedQuery }}”，找到 {{ filteredItems.length }} 个结果
        </template>
        <template v-else>仅按名称搜索全部英雄皮肤、幸运币和卡背。先下载并运行收藏采集工具，再选择生成的 cosmetics.json 即可预览导入。</template>
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
            <span
              class="hs-cosmetic-image-wrap"
              :class="{ 'is-loaded': loadedSet.has(item.id), 'is-error': errorSet.has(item.id) }"
            >
              <span v-if="item.cosmeticType === 'heroSkins'" class="hs-direct-hero-image">
                <img
                  :src="thumbnailUrlFor(item)"
                  :alt="item.officialName"
                  loading="eager"
                  decoding="async"
                  @load="onImgLoad(item.id)"
                  @error="onImgError(item.id)"
                />
              </span>
              <img
                v-else
                :src="thumbnailUrlFor(item)"
                :alt="item.officialName"
                loading="eager"
                decoding="async"
                @load="onImgLoad(item.id)"
                @error="onImgError(item.id)"
              />
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
            <div class="hs-cosmetic-modal-image">
              <span
                class="hs-cosmetic-image-wrap"
                :class="{ 'is-loaded': loadedSet.has(selectedItem.id), 'is-error': errorSet.has(selectedItem.id) }"
              >
                <span v-if="selectedItem.cosmeticType === 'heroSkins'" class="hs-direct-hero-image">
                  <img
                    :src="selectedItem.imageUrl"
                    :alt="selectedItem.officialName"
                    loading="eager"
                    decoding="async"
                    @load="onImgLoad(selectedItem.id)"
                    @error="onImgError(selectedItem.id)"
                  />
                </span>
                <img
                  v-else
                  :src="selectedItem.imageUrl"
                  :alt="selectedItem.officialName"
                  loading="eager"
                  decoding="async"
                  @load="onImgLoad(selectedItem.id)"
                  @error="onImgError(selectedItem.id)"
                />
              </span>
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
import { computed, ref, watch, onBeforeUnmount } from 'vue'
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

// 幸运币按 dbfId 升序排列（基础幸运币 DEFAULT_COIN 前置，dbfId=5 最小天然排最前）。
// 注：dbfId 与「加入游戏时间」并不一致（如暗月 dbf=64827 < 怪盗军团 dbf=73372，但后者发布更早），
// 故这种排法只是稳定的近似，并非游戏内真实顺序。四个旧扩展奖励币(FP1/GVG/AT/LOE)标记 hidden，已被过滤排除。
const DEFAULT_COIN = {
  id: 'coins-game_005',
  cardId: 'GAME_005',
  dbfId: 5,
  officialName: '幸运币',
  flavorText: '不管你是花掉它还是留在手里，总有一枚幸运币留给后手的你。',
  howToGet: '默认拥有。',
  availability: '',
  imageUrl: 'https://art.hearthstonejson.com/v1/render/latest/zhCN/512x/GAME_005.png',
  source: 'Hearthstone 基础卡',
  sourceUrl: ''
}
const DEATH_KNIGHT_DISPLAY_ORDER = [
  // 按 dbfId 升序，与数据文件排序保持一致
  'HERO_11', 'HERO_11a', 'HERO_11b', 'HERO_11c', 'HERO_11d', 'HERO_11g', 'HERO_11e', 'HERO_11f',
  'HERO_11h', 'HERO_11i', 'HERO_11j', 'HERO_11m', 'HERO_11n', 'HERO_11k', 'HERO_11l', 'HERO_11o_ReskathePitBoss',
  'HERO_11p_LichKing', 'HERO_11q_LichKing', 'HERO_11r_SaiShadestorm', 'HERO_11s_Scarlet_hls', 'HERO_11t_Lanathel_hls', 'HERO_11u_Arfus', 'HERO_11v', 'HERO_11w',
  'HERO_11x', 'HERO_11z', 'HERO_11y', 'HERO_11aa', 'HERO_11ab', 'HERO_11ac', 'HERO_11ad', 'HERO_11ae',
  'HERO_11af', 'HERO_11ag', 'HERO_11ah', 'HERO_11aj', 'HERO_11ai', 'HERO_11am', 'HERO_11al', 'HERO_11an',
  'HERO_11ao', 'HERO_11aq', 'HERO_11ar', 'HERO_11as', 'HERO_11aw', 'HERO_11ax', 'HERO_11ay', 'HERO_11az',
  'HERO_11bc', 'HERO_11bd', 'HERO_11bi'
]
const heroSkinByCardId = new Map(heroSkins.map((item) => [item.cardId, item]))
// 采集器 heroSkins.ids 是 cardId（如 HERO_01），映射到目录的 profile id（如 hero-skins-hero_01）
const heroSkinIdByCardId = new Map(heroSkins.map((item) => [String(item.cardId), item.id]))
// 收藏采集工具（Windows 桌面程序）下载地址；文件名带版本号便于核对下载版本。
// 部署时可用 VITE_COLLECTOR_DOWNLOAD_URL 覆盖。版本号须与 tools/hs-cosmetics-collector/build-release.ps1 生成的一致。
const COLLECTOR_DOWNLOAD_URL = import.meta.env.VITE_COLLECTOR_DOWNLOAD_URL || '/hs-cosmetics-collector-v1.0.0.zip'
const collectionCatalog = {
  heroSkins: [
    ...heroSkins.filter((item) => item.heroClass !== '死亡骑士'),
    ...DEATH_KNIGHT_DISPLAY_ORDER.map((cardId) => heroSkinByCardId.get(cardId)).filter(Boolean)
  ].filter((item) => !item.hidden),
  coins: [DEFAULT_COIN, ...coins.filter((item) => !item.hidden).sort((a, b) => Number(a.dbfId) - Number(b.dbfId))],
  cardBacks: cardBacks.filter((item) => !item.hidden)
}

// 当前目录中存在的外观 ID 集合。导入/加载时清理 profile 中的「孤儿 ID」：
// catalog 重建后遗留的旧 ID（与新条目同名但语义已变）会让"已拥有"误命中。
const validHeroSkinIds = new Set(collectionCatalog.heroSkins.map((item) => item.id))
const validCoinIds = new Set(collectionCatalog.coins.map((item) => item.id))
const validCardBackIds = new Set(collectionCatalog.cardBacks.map((item) => item.id))

function removeOrphanIds(ids, validIds) {
  return (Array.isArray(ids) ? ids : []).filter((id) => validIds.has(id))
}

function cleanProfileCollection(collection) {
  return {
    heroSkins: removeOrphanIds(collection?.heroSkins, validHeroSkinIds),
    coins: removeOrphanIds(collection?.coins, validCoinIds),
    cardBacks: removeOrphanIds(collection?.cardBacks, validCardBackIds)
  }
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
// 图片加载状态：用于淡入与骨架占位，避免逐张硬刷出
const loadedSet = ref(new Set())
const errorSet = ref(new Set())

// 列表用缩略图（384 WebP），详情弹窗仍用原图
function thumbnailUrlFor(item) {
  const key = item.ossObjectKey || String(item.imageUrl || '').replace(/^\//, '')
  const m = key.match(/^(hearthstone-cosmetics\/.+?)\/([^/]+)\.(png|jpe?g)$/i)
  if (!m) return item.imageUrl
  return `/${m[1]}/384/${m[2]}.webp`
}
const globalItems = getGlobalCosmeticItems(collectionCatalog)

// 每页显示个数：按收藏类型分别记忆，默认英雄皮肤 6、幸运币 8、卡背 8、全局搜索 8
const PAGE_SIZE_STORAGE_KEY = 'hs-collection-page-sizes'
const DEFAULT_PAGE_SIZES = Object.freeze({ heroSkins: 6, coins: 8, cardBacks: 8, global: 8 })
const PAGE_SIZE_OPTIONS = Object.freeze([6, 8, 12, 24, 48])

function loadPageSizes() {
  try {
    const raw = localStorage.getItem(PAGE_SIZE_STORAGE_KEY)
    if (!raw) return { ...DEFAULT_PAGE_SIZES }
    const parsed = JSON.parse(raw)
    const merged = { ...DEFAULT_PAGE_SIZES }
    for (const key of Object.keys(DEFAULT_PAGE_SIZES)) {
      const value = Number(parsed?.[key])
      if (Number.isFinite(value) && value >= 1) merged[key] = Math.floor(value)
    }
    return merged
  } catch {
    return { ...DEFAULT_PAGE_SIZES }
  }
}

const pageSizeByType = ref(loadPageSizes())

function persistPageSizes() {
  try {
    localStorage.setItem(PAGE_SIZE_STORAGE_KEY, JSON.stringify(pageSizeByType.value))
  } catch {
    // 存储不可用时静默忽略
  }
}

const currentPageSize = computed({
  get() {
    const key = isGlobalSearch.value ? 'global' : activeType.value
    return pageSizeByType.value[key] ?? getCosmeticPageSize(key)
  },
  set(value) {
    const key = isGlobalSearch.value ? 'global' : activeType.value
    const size = Math.max(1, Math.floor(Number(value) || getCosmeticPageSize(key)))
    pageSizeByType.value = { ...pageSizeByType.value, [key]: size }
    persistPageSizes()
  }
})
const currentType = computed(() => COSMETIC_TYPES.find((type) => type.id === activeType.value))
const normalizedQuery = computed(() => query.value.trim())
const isGlobalSearch = computed(() => Boolean(normalizedQuery.value))
const currentItems = computed(() => (collectionCatalog[activeType.value] || []).map((item) => ({
  ...item,
  cosmeticType: activeType.value,
  cosmeticTypeLabel: currentType.value.label
})))
const ownedIds = computed(() => {
  const all = Object.values(profile.value.collection).flat()
  // 基础幸运币默认拥有，但不在 profile.coins 中，统一纳入「已拥有」集合以保证排序/统计一致。
  if (!profile.value.collection.coins.includes(DEFAULT_COIN.id)) all.push(DEFAULT_COIN.id)
  return new Set(all)
})
const stats = computed(() => {
  const result = getCollectionStats(collectionCatalog, profile.value.collection)
  // 基础幸运币不在 profile.coins 中，但属于永远拥有的默认币，统一补入统计，避免「已拥有」数少 1。
  if (!profile.value.collection.coins.includes(DEFAULT_COIN.id)) {
    result.byType.coins.owned += 1
    result.owned += 1
    result.percentage = result.total ? Math.round((result.owned / result.total) * 100) : 0
  }
  return result
})
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
const pageSize = computed(() => currentPageSize.value)
const pagination = computed(() => paginateCosmetics(filteredItems.value, currentPage.value, pageSize.value))

function onImgLoad(id) {
  const next = new Set(loadedSet.value)
  next.add(id)
  loadedSet.value = next
}

function onImgError(id) {
  const loaded = new Set(loadedSet.value)
  loaded.add(id)
  loadedSet.value = loaded
  const errored = new Set(errorSet.value)
  errored.add(id)
  errorSet.value = errored
}

// 图片加载兜底：同源 OSS 反代冷启动时，受浏览器同源并发上限(~6)影响，
// 首屏一批(每页默认 8 张)缩略图会被排队、可能长时间挂起。若 IMG_LOAD_TIMEOUT_MS
// 内既未 load 也未 error，则强制结束骨架转圈（标记占位），避免永久转圈。
const IMG_LOAD_TIMEOUT_MS = 8000
let imgLoadTimer = null

function clearImgLoadTimer() {
  if (imgLoadTimer) {
    clearTimeout(imgLoadTimer)
    imgLoadTimer = null
  }
}

function armImgLoadTimeout(ids) {
  clearImgLoadTimer()
  if (!ids.length) return
  const idSet = new Set(ids)
  imgLoadTimer = setTimeout(() => {
    const pending = [...idSet].filter((id) => !loadedSet.value.has(id))
    if (!pending.length) return
    const nextLoaded = new Set(loadedSet.value)
    const nextErr = new Set(errorSet.value)
    pending.forEach((id) => {
      nextLoaded.add(id)
      nextErr.add(id)
    })
    loadedSet.value = nextLoaded
    errorSet.value = nextErr
  }, IMG_LOAD_TIMEOUT_MS)
}

// 翻页/切换类型/筛选/改每页个数/改页码时重置图片加载态。
// 关键：只保留「当前页仍存在且之前已完成加载/失败」的 id，避免改每页个数等操作时，
// 已经显示出来的图被错误清回骨架——浏览器不会为「复用且已缓存」的 <img> 重新触发 load 事件，
// 这正是「之前显示的前 N 张突然不显示、只剩新加的几张正常」的根因。
// 同时剔除已不在当前页的旧 id，避免跨页/切类型后状态残留累积。
function resetImageLoadState() {
  const ids = pagination.value.items.map((it) => it.id)
  const idSet = new Set(ids)
  const nextLoaded = new Set([...loadedSet.value].filter((id) => idSet.has(id)))
  const nextErr = new Set([...errorSet.value].filter((id) => idSet.has(id)))
  loadedSet.value = nextLoaded
  errorSet.value = nextErr
  // 仅为尚未加载完成（新出现的）图启动兜底计时，已加载的不再重复计时
  armImgLoadTimeout(ids)
}

function isOwned(item) {
  // 基础幸运币（GAME_005）是默认拥有的，不在 profile.coins 中，但应始终显示为已拥有。
  if (item?.id === DEFAULT_COIN.id) return true
  return new Set(profile.value.collection[item.cosmeticType] || []).has(item.id)
}

// 英雄皮肤统一展示全幅原图（来自 Hearthstone Wiki 的高清立绘），
// 不走英雄头像圆形裁剪框。


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
    // 采集器格式：{ cardBacks: { count, ids: [...] } }
    if (value && Array.isArray(value.ids)) return value.ids
  }
  return []
}

function getImportedIds(payload) {
  const cardBackById = new Map(cardBacks.map((item) => [Number(item.cardBackId), item.id]))
  const coinByDbfId = new Map(collectionCatalog.coins.map((item) => [Number(item.dbfId), item.id]))
  const cardBackSource = readIdList(payload, ['cardBacks', 'cardBackIds'])
  const coinSource = readIdList(payload, ['coins', 'coinDbfIds', 'coinIds'])
  const heroSkinSource = readIdList(payload, ['heroSkins', 'heroSkinIds', 'heroSkinDbfIds'])
  let cbUnmatched = 0
  let coUnmatched = 0
  let hsUnmatched = 0
  const importedCardBacks = new Set(cardBackSource.map((id) => {
    const value = String(id)
    const mapped = cardBackById.get(Number(id)) || (cardBacks.some((item) => item.id === value) ? value : '')
    if (!mapped) cbUnmatched++
    return mapped
  }).filter(Boolean))
  const importedCoins = new Set(coinSource.map((id) => {
    const value = String(id)
    const mapped = coinByDbfId.get(Number(id)) || (collectionCatalog.coins.some((item) => item.id === value) ? value : '')
    if (!mapped) coUnmatched++
    return mapped
  }).filter(Boolean))
  const importedHeroSkins = new Set(heroSkinSource.map((id) => {
    const value = String(id)
    const mapped = heroSkinIdByCardId.get(value) || (heroSkins.some((item) => item.id === value) ? value : '')
    if (!mapped) hsUnmatched++
    return mapped
  }).filter(Boolean))
  return {
    cardBacks: importedCardBacks,
    coins: importedCoins,
    heroSkins: importedHeroSkins,
    cardBackSource,
    coinSource,
    heroSkinSource,
    unmatched: { cardBacks: cbUnmatched, coins: coUnmatched, heroSkins: hsUnmatched }
  }
}

async function previewImport(event) {
  const file = event.target.files?.[0]
  event.target.value = ''
  if (!file) return
  try {
    const payload = JSON.parse(await file.text())
    // 收藏页只导入外观（cosmetics.json）。若误传成就文件，给出引导。
    const isAchievementsFile = payload && !payload.cardBacks && !payload.coins && !payload.heroSkins &&
      Array.isArray(payload.items)
    if (isAchievementsFile) {
      saveError.value = '这是成就数据（achievements.json）。收藏页只需 cosmetics.json；成就明细请在本地查看器查看。'
      return
    }
    const imported = getImportedIds(payload)
    const prof = profile.value.collection
    const cleanedProf = cleanProfileCollection(prof)
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
      cardBacks: [...imported.cardBacks].filter((id) => !cleanedProf.cardBacks.includes(id)).length,
      coins: [...imported.coins].filter((id) => !cleanedProf.coins.includes(id)).length,
      heroSkins: [...imported.heroSkins].filter((id) => !cleanedProf.heroSkins.includes(id)).length,
      unmatchedCardBacks: imported.unmatched.cardBacks,
      unmatchedCoins: imported.unmatched.coins,
      unmatchedHeroSkins: imported.unmatched.heroSkins,
      removedHeroSkins: prof.heroSkins.length - cleanedProf.heroSkins.length,
      removedCoins: prof.coins.length - cleanedProf.coins.length,
      removedCardBacks: prof.cardBacks.length - cleanedProf.cardBacks.length
    }
    saveError.value = ''
  } catch {
    saveError.value = '无法识别导入文件。请选择采集工具生成的 cosmetics.json。'
  }
}

async function confirmImport() {
  if (!importPreview.value || profileSaving.value) return
  const preview = importPreview.value
  saveError.value = ''
  try {
    // 先剔除 profile 中已不存在于当前目录的孤儿 ID，再合并新导入的 ID，
    // 避免卡背/皮肤目录重建后旧标记被同名新条目错误继承。
    const cleaned = cleanProfileCollection(profile.value.collection)
    await save({
      ...profile.value,
      collection: {
        heroSkins: [...new Set([...cleaned.heroSkins, ...preview.heroSkinIds])],
        coins: [...new Set([...cleaned.coins, ...preview.coinIds])],
        cardBacks: [...new Set([...cleaned.cardBacks, ...preview.cardBackIds])]
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

// 导入后发现数据有误时，可一键将当前类型的全部已拥有外观设为未拥有（二次确认防误操作）。
const bulkClearOpen = ref(false)
const bulkClearCount = computed(() => {
  const type = activeType.value
  // 默认幸运币不在 profile.coins 中，仅统计实际存储的已拥有项
  if (type === 'coins') return profile.value.collection.coins.length
  return profile.value.collection[type].length
})

function openBulkClear() {
  if (!user.value || profileSaving.value) return
  if (!bulkClearCount.value) {
    saveError.value = `「${currentType.value.label}」当前没有已拥有的外观，无需操作。`
    return
  }
  bulkClearOpen.value = true
}

async function confirmBulkClear() {
  if (profileSaving.value) return
  const type = activeType.value
  saveError.value = ''
  try {
    await save({
      ...profile.value,
      collection: { ...profile.value.collection, [type]: [] }
    })
    bulkClearOpen.value = false
  } catch (error) {
    saveError.value = error.message || '批量操作失败，请重试'
  }
}

initAuth()
watch(user, (value) => {
  if (!value) return
  load({ force: true })
    .then((loaded) => {
      // 加载后自动清理孤儿 ID：catalog 重建后遗留的旧 ID 会让"已拥有"误命中。
      // 清理后若有变动，悄悄回写一次，避免用户每次进收藏页都看到旧统计。
      const cleaned = cleanProfileCollection(loaded.collection)
      const removed = (loaded.collection.heroSkins.length - cleaned.heroSkins.length)
        + (loaded.collection.coins.length - cleaned.coins.length)
        + (loaded.collection.cardBacks.length - cleaned.cardBacks.length)
      if (removed > 0) save({ ...loaded, collection: cleaned }).catch(() => {})
    })
    .catch(() => {})
}, { immediate: true })
watch([activeType, activeHeroClass, query, statusFilter], () => {
  currentPage.value = 1
})

watch(currentPageSize, () => {
  currentPage.value = 1
})

watch(() => pagination.value.currentPage, (page) => {
  if (currentPage.value !== page) currentPage.value = page
})

// 任意分页结果变化（首屏渲染、翻页、筛选、改每页个数）都重置并兜底图片加载态，
// 避免切页后旧加载态串页，也保证首屏能重新计时超时兜底。
watch(pagination, () => {
  resetImageLoadState()
}, { immediate: true })

onBeforeUnmount(clearImgLoadTimer)

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
