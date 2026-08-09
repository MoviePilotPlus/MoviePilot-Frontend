<script setup lang="ts">
import api from '@/api'
import TencentView from '@/views/collect/TencentView.vue'
import MgtvView from '@/views/collect/MgtvView.vue'
import YoukuView from '@/views/collect/YoukuView.vue'
import IQiyiView from '@/views/collect/IQiyiView.vue'
import BilibiliView from '@/views/collect/BilibiliView.vue'
import YspView from '@/views/collect/YspView.vue'
import ExtraSourceView from '@/views/collect/ExtraSourceView.vue'
import type { DiscoverSource } from '@/api/types'
import { useI18n } from 'vue-i18n'

const { t } = useI18n()

const route = useRoute()
const router = useRouter()

const activeTab = ref((route.query.tab as string) || 'tencent')
const extraDiscoverSources = ref<DiscoverSource[]>([])

const baseTabs = [
  { tab: 'tencent', title: t('collect.tencentTab') },
  { tab: 'mgtv', title: t('collect.mgtvTab') },
  { tab: 'iqiyi', title: t('collect.iqiyiTab') },
  { tab: 'youku', title: t('collect.youkuTab') },
  { tab: 'bilibili', title: t('collect.bilibiliTab') },
  { tab: 'ysp', title: t('collect.yspTab') },
]

function jumpTab(tab: string) {
  router.replace({
    path: '/collect',
    query: { ...route.query, tab },
  })
}

async function loadExtraDiscoverSources() {
  try {
    extraDiscoverSources.value = await api.get('discover/source')
  } catch (error) {
    console.error(error)
    extraDiscoverSources.value = []
  }
}

watch(
  () => route.query.tab,
  value => {
    if (typeof value === 'string' && value) activeTab.value = value
  },
)

watch(activeTab, value => {
  if (value && value !== route.query.tab) jumpTab(value)
})

onMounted(loadExtraDiscoverSources)
onActivated(loadExtraDiscoverSources)
</script>

<template>
  <div class="collect-page">
    <div class="collect-main-tabs-wrap">
      <VTabs v-model="activeTab" show-arrows hide-slider class="collect-main-tabs">
        <VTab
          v-for="item in baseTabs"
          :key="item.tab"
          :value="item.tab"
          class="collect-main-tab"
          @click="jumpTab(item.tab)"
        >
          <span class="collect-main-tab-text">
            {{ item.title }}
          </span>
        </VTab>

        <VTab
          v-for="item in extraDiscoverSources"
          :key="item.mediaid_prefix"
          :value="item.mediaid_prefix"
          class="collect-main-tab"
          @click="jumpTab(item.mediaid_prefix)"
        >
          <span class="collect-main-tab-text">
            {{ item.name }}
          </span>
        </VTab>
      </VTabs>
    </div>

    <VWindow v-model="activeTab" class="mt-3 disable-tab-transition" :touch="false">
      <VWindowItem value="tencent" eager>
        <transition name="fade-slide" appear>
          <div><TencentView /></div>
        </transition>
      </VWindowItem>
      <VWindowItem value="mgtv" eager>
        <transition name="fade-slide" appear>
          <div><MgtvView /></div>
        </transition>
      </VWindowItem>
      <VWindowItem value="iqiyi" eager>
        <transition name="fade-slide" appear>
          <div><IQiyiView /></div>
        </transition>
      </VWindowItem>
      <VWindowItem value="youku" eager>
        <transition name="fade-slide" appear>
          <div><YoukuView /></div>
        </transition>
      </VWindowItem>
      <VWindowItem value="bilibili" eager>
        <transition name="fade-slide" appear>
          <div><BilibiliView /></div>
        </transition>
      </VWindowItem>
      <VWindowItem value="ysp" eager>
        <transition name="fade-slide" appear>
          <div><YspView /></div>
        </transition>
      </VWindowItem>
      <VWindowItem v-for="item in extraDiscoverSources" :key="item.mediaid_prefix" :value="item.mediaid_prefix" eager>
        <transition name="fade-slide" appear>
          <div><ExtraSourceView :source="item" /></div>
        </transition>
      </VWindowItem>
    </VWindow>
  </div>
</template>
<style scoped>
.collect-main-tabs-wrap {
  position: sticky;
  z-index: 5;
  backdrop-filter: blur(6px);
  inset-block-start: 0;
  padding-block: 8px 2px;
}

.collect-main-tabs {
  border: 1px solid rgba(var(--v-theme-on-surface), 0.08);
  border-radius: 14px;
  background: rgba(var(--v-theme-surface), 0.94);
  min-block-size: 56px;
  padding-block: 8px;
  padding-inline: 10px;
}

:deep(.collect-main-tab) {
  border-radius: 12px;
  min-block-size: 42px;
  padding-inline: 16px;
  transition: all 0.2s ease;
}

:deep(.collect-main-tab.v-tab--selected) {
  background: rgba(var(--v-theme-primary), 0.12);
  color: rgb(var(--v-theme-primary));
  font-weight: 700;
}

:deep(.collect-main-tabs .v-slide-group__content) {
  align-items: center;
  gap: 6px;
}

:deep(.collect-main-tab .v-tab__content) {
  line-height: 1.1;
}

.collect-main-tab-text {
  min-inline-size: 72px;
  text-align: center;
}
</style>
