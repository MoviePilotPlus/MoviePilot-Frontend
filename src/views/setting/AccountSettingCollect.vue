<script lang="ts" setup>
// @ts-nocheck
import { VRow } from 'vuetify/lib/components/index.mjs'
import api from '@/api'
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
// 源线路组的表单状态（经 provide 共享给分区卡）。

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
</style>
