<script lang="ts" setup>
// @ts-nocheck
import { VRow } from 'vuetify/lib/components/index.mjs'
import api from '@/api'
import { useI18n } from 'vue-i18n'
import CollectBasicCard from './collect-settings/CollectBasicCard.vue'
import CollectNamingCard from './collect-settings/CollectNamingCard.vue'
import CollectScreenshotCard from './collect-settings/CollectScreenshotCard.vue'
import CollectImageHostingCard from './collect-settings/CollectImageHostingCard.vue'
import CollectPtgenCard from './collect-settings/CollectPtgenCard.vue'
import CollectSiteSchemaCard from './collect-settings/CollectSiteSchemaCard.vue'
import CollectCredentialsCard from './collect-settings/CollectCredentialsCard.vue'
import CollectTeamCard from './collect-settings/CollectTeamCard.vue'

// 采集设置页（设定 → 采集）：装配各分区卡片。
// 分区卡位于 ./collect-settings/，各自负责加载与保存；本页持有 Basic 组与
// 源线路组的表单状态（经 provide 共享给分区卡），并提供页内锚点导航。

// 国际化
const { t } = useI18n()

// ===== 页内锚点导航：采集设置卡片分区 =====
const collectSectionAnchors = [
  { id: 'collect-basic', labelKey: 'basicSettings' },
  { id: 'collect-naming', labelKey: 'namingFormat' },
  { id: 'collect-screenshot', labelKey: 'screenshotTemplate' },
  { id: 'collect-imagehosting', labelKey: 'imageHosting' },
  { id: 'collect-ptgen', labelKey: 'ptgenSource' },
  { id: 'collect-siteschema', labelKey: 'siteSchema' },
  { id: 'collect-accounts', labelKey: 'accountSettings' },
  { id: 'collect-teams', labelKey: 'teamConfig' },
]

function scrollToCollectSection(id: string) {
  // 本页滚动容器是根级 glass 容器，对 smooth 行为不响应（实测仅 auto 生效）；
  // 需要留白时用 scroll-margin-top 兜住吸顶锚点条
  document.getElementById(id)?.scrollIntoView({ behavior: 'auto', block: 'start' })
}

// scrollspy：高亮当前滚动到的分区（jsdom 无 IntersectionObserver，测试环境自动跳过）
const activeAnchor = ref('')
let anchorObserver: IntersectionObserver | null = null
onMounted(() => {
  if (typeof IntersectionObserver === 'undefined') return
  anchorObserver = new IntersectionObserver((entries) => {
    for (const entry of entries) {
      if (entry.isIntersecting) activeAnchor.value = entry.target.id
    }
  }, { rootMargin: '-25% 0px -65% 0px' })
  for (const anchor of collectSectionAnchors) {
    const el = document.getElementById(anchor.id)
    if (el) anchorObserver.observe(el)
  }
})
onBeforeUnmount(() => {
  anchorObserver?.disconnect()
  anchorObserver = null
})

// 采集器设置项
const CollectSettings = ref<any>({
  // 基础设置（截图组键由截图卡独占保存）
  Basic: {
    MEDIA_DIR: '',
    DOWNLOAD_DIR: '',
    DOWNLOADER_SLEEP_TIME: 60,
    DOWNLOADER_THREAD_COUNT: 1,
    DOWNLOADER_SPEED: '10M',
    DOWNLOAD_TASK_MAX_WORKERS: 1,
    RAISE_EXCEPTION: false,
    API_DEBUG: false,
    SCREENSHOT_TEMPLATE: 'default',
    SCREENSHOT_TEMPLATE_CONFIG: '',
    SCREENSHOT_HDR_PROCESSOR: 'auto',
    SCREENSHOT_COUNT: 4,
    SCREENSHOT_GRID_ENABLED: true,
    SCREENSHOT_CACHE_ENABLED: false,
    SCREENSHOT_COMPRESS_LIMIT: 5 * 1024 * 1024,
    SCREENSHOT_MIN_SIZE_LIMIT: 1800 * 1024,
    SCREENSHOT_QUALITY_CHECK: true,
    BANGUMI_API_BASE: '',
    DOUBAN_COOKIES: '',
    DOUBAN_USE_PROXY: true,
    DOUBAN_BROWSER_FALLBACK: true,
    TORRENT_AUTHOR: '',
    DOWNLOADER_DELETE_AFTER_DONE: true,
    SEED_SKIP_HASH_CHECK: false,
    HIGH_BITRATE_THRESHOLD: 10000000,
    TV_FILE_FORMAT: '',
    MOVIE_FILE_FORMAT: '',
    TV_TITLE_FORMAT: '',
    MOVIE_TITLE_FORMAT: '',
    TV_FOLDER_FORMAT: '',
    MOVIE_FOLDER_FORMAT: '',
  },
  Youku: {
    YOUKU_DOWNLOAD_LINE: 'normal_tv',
  },
  Tencent: {
    TENCENT_FETCH_LINE: 'normal_tv',
  },
})

// 向分区卡共享表单状态（读写同一响应式对象；卡内保存也基于它们）
provide('collectSettingsBasic', CollectSettings.value.Basic)
provide('collectSourceLines', { Youku: CollectSettings.value.Youku, Tencent: CollectSettings.value.Tencent })

// 加载系统设置
async function loadSystemSettings() {
  try {
    const result: { [key: string]: any } = await api.get('system/env')
    // 将API返回的值赋值给CollectSettings
    for (const sectionKey of Object.keys(CollectSettings.value) as Array<keyof typeof CollectSettings.value>) {
      Object.keys(CollectSettings.value[sectionKey]).forEach((key: string) => {
        if (result.hasOwnProperty(key)) (CollectSettings.value[sectionKey] as any)[key] = result[key]
      })
    }
  } catch (error) {
    console.log(error)
  }
}

// 加载数据（分区卡的自身加载在各自组件 onMounted 内完成）
onMounted(() => {
  loadSystemSettings()
})
</script>

<template>
  <!-- 页内锚点导航：与顶部 HeaderTab 同视觉语言的文字标签（吸顶，长页免滚动找卡） -->
  <nav class="collect-anchor-bar">
    <button
      v-for="anchor in collectSectionAnchors"
      :key="anchor.id"
      type="button"
      class="collect-anchor-tab"
      :class="{ 'collect-anchor-tab-active': activeAnchor === anchor.id }"
      @click="scrollToCollectSection(anchor.id)"
    >
      {{ t(`setting.collect.${anchor.labelKey}`) }}
    </button>
  </nav>

  <VRow>
    <VCol cols="12">
      <CollectBasicCard :basic="CollectSettings.Basic" />
    </VCol>
  </VRow>

  <!-- 命名格式模板 -->
  <VRow>
    <VCol cols="12">
      <CollectNamingCard :basic="CollectSettings.Basic" />
    </VCol>
  </VRow>

  <!-- 截图模板配置（含截图参数，一张卡管全部截图设置） -->
  <VRow>
    <VCol cols="12">
      <CollectScreenshotCard :basic="CollectSettings.Basic" />
    </VCol>
  </VRow>

  <!-- 图床设置 -->
  <VRow>
    <VCol cols="12">
      <CollectImageHostingCard />
    </VCol>
  </VRow>

  <!-- 简介抓取线路 -->
  <VRow>
    <VCol cols="12">
      <CollectPtgenCard />
    </VCol>
  </VRow>

  <!-- 站点模板 -->
  <VRow>
    <VCol cols="12">
      <CollectSiteSchemaCard />
    </VCol>
  </VRow>

  <!-- 视频源账号：六源凭据 + 腾讯/优酷下载线路（按源折叠分区） -->
  <VRow>
    <VCol cols="12">
      <CollectCredentialsCard />
    </VCol>
  </VRow>

  <!-- 制作组配置 -->
  <VRow>
    <VCol cols="12">
      <CollectTeamCard />
    </VCol>
  </VRow>
</template>

<style scoped>
/* 锚点目标：跳转时给吸顶锚点条留出高度（id 落在各分区卡的根 VCard 上） */
#collect-basic,
#collect-naming,
#collect-screenshot,
#collect-imagehosting,
#collect-ptgen,
#collect-siteschema,
#collect-accounts,
#collect-teams {
  scroll-margin-top: 8.5rem;
}

/* 页内锚点导航：吸在设定页顶部 tab 栏之下，视觉对齐 HeaderTab（圆角文字标签 + 悬停底色） */
.collect-anchor-bar {
  position: sticky;
  top: 6.9rem;
  z-index: 3;
  display: flex;
  gap: 0.75rem;
  padding: 0.35rem 0.25rem 0.55rem;
  overflow-x: auto;
  scrollbar-width: none;
  /* 滚动时内容透出，用主题表面色渐隐保证吸顶时可读 */
  background: linear-gradient(to bottom, rgb(var(--v-theme-surface)) 78%, transparent);
}

.collect-anchor-bar::-webkit-scrollbar {
  display: none;
}

.collect-anchor-tab {
  position: relative;
  flex-shrink: 0;
  border-radius: 1.25rem;
  color: rgba(var(--v-theme-on-surface), 0.7);
  cursor: pointer;
  font-size: 0.8rem;
  font-weight: 600;
  line-height: 1.2;
  padding-block: 0.35rem;
  padding-inline: 0.85rem;
  white-space: nowrap;
  transition: color 0.2s ease, background-color 0.2s ease;
}

.collect-anchor-tab:hover {
  background-color: rgba(var(--v-theme-primary), 0.05);
  color: rgba(var(--v-theme-on-surface), 1);
}

.collect-anchor-tab:active {
  color: rgb(var(--v-theme-primary));
}

/* scrollspy 当前分区高亮 */
.collect-anchor-tab-active {
  background-color: rgba(var(--v-theme-primary), 0.1);
  color: rgb(var(--v-theme-primary));
}
</style>
