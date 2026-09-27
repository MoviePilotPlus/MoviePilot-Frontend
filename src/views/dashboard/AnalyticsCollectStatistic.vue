<script setup lang="ts">
import api from '@/api'
import type { CollectSeedingSiteCount, CollectSourceCount, CollectStatistic } from '@/api/types'
import { formatDashboardCount, formatDashboardFileSize, useAnimatedDashboardNumber } from '@/composables/useDashboardMotion'
import { useDashboardSnapshot } from '@/composables/useDashboardSnapshot'
import { useI18n } from 'vue-i18n'

// 国际化
const { t } = useI18n()

const { readSnapshot, writeSnapshot } = useDashboardSnapshot<CollectStatistic>('collect-statistic-v1')
const currentSnapshot = readSnapshot()

const collectCount = ref(Number(currentSnapshot?.value.collect_count) || 0)
const collectFinishedCount = ref(Number(currentSnapshot?.value.collect_finished_count) || 0)
const seedCount = ref(Number(currentSnapshot?.value.seed_count) || 0)
const torrentSize = ref(Number(currentSnapshot?.value.torrent_size) || 0)
const collectCountMonth = ref(Number(currentSnapshot?.value.collect_count_month) || 0)
const collectFinishedMonth = ref(Number(currentSnapshot?.value.collect_finished_month) || 0)
const seedCountMonth = ref(Number(currentSnapshot?.value.seed_count_month) || 0)
const sourceCounts = ref<CollectSourceCount[]>(currentSnapshot?.value.source_counts ?? [])
const seedingSiteCounts = ref<CollectSeedingSiteCount[]>(currentSnapshot?.value.seeding_site_counts ?? [])
let statisticLoadId = 0

const animatedCollectCount = useAnimatedDashboardNumber(collectCount, {
  duration: 720,
})

const animatedCollectFinishedCount = useAnimatedDashboardNumber(collectFinishedCount, {
  delay: 60,
  duration: 720,
})

const animatedSeedCount = useAnimatedDashboardNumber(seedCount, {
  delay: 120,
  duration: 720,
})

const animatedTorrentSize = useAnimatedDashboardNumber(torrentSize, {
  delay: 180,
  duration: 720,
})

const statistics = computed(() => [
  {
    title: t('dashboard.collectTasks'),
    stats: formatDashboardCount(animatedCollectCount.value),
    icon: 'mdi-cloud-download-outline',
    color: 'primary',
    addition: collectCountMonth.value,
  },
  {
    title: t('dashboard.collectFinished'),
    stats: formatDashboardCount(animatedCollectFinishedCount.value),
    icon: 'mdi-check-decagram-outline',
    color: 'success',
    addition: collectFinishedMonth.value,
  },
  {
    title: t('dashboard.seedTasks'),
    stats: formatDashboardCount(animatedSeedCount.value),
    icon: 'mdi-seed',
    color: 'warning',
    addition: seedCountMonth.value,
  },
  {
    title: t('dashboard.torrentSize'),
    stats: formatDashboardFileSize(animatedTorrentSize.value, 2, torrentSize.value),
    icon: 'mdi-database-outline',
    color: 'info',
    addition: null,
  },
])

// 采集源展示元数据：VideoSite 枚举值 → i18n 词条与品牌色；未知值回退灰色与原文
const SOURCE_META: Record<string, { labelKey: string; color: string }> = {
  Tencent: { labelKey: 'sourceTencent', color: '#22B0E6' },
  iQiyi: { labelKey: 'sourceIQiyi', color: '#1CC749' },
  YouKu: { labelKey: 'sourceYouKu', color: '#4C6FFF' },
  MgTV: { labelKey: 'sourceMgTV', color: '#FF9800' },
  Bilibili: { labelKey: 'sourceBilibili', color: '#FB7299' },
  YSP: { labelKey: 'sourceYSP', color: '#E53935' },
}

// 做种站点条形图最多展示的行数，超出部分以「共 N 个站点」提示
const MAX_SITE_ROWS = 8

const sourceRows = computed(() => sourceCounts.value.slice(0, Object.keys(SOURCE_META).length))
const siteRows = computed(() => seedingSiteCounts.value.slice(0, MAX_SITE_ROWS))
const seedingSiteTotal = computed(() => seedingSiteCounts.value.length)

function sourceMeta(site: string) {
  return SOURCE_META[site] ?? { labelKey: '', color: '#9E9E9E' }
}

function sourceLabel(site: string) {
  const meta = SOURCE_META[site]
  return meta ? t(`dashboard.${meta.labelKey}`) : site
}

// 站点条形宽度按最大站点数归一（列表已按数量降序，首位即最大）
function sitePercent(count: number) {
  const max = Number(siteRows.value[0]?.count) || 0
  if (max <= 0) return 0
  return Math.min(100, Math.round((count / max) * 1000) / 10)
}

// 调用API加载采集统计数据
async function loadCollectStatistic() {
  const loadId = ++statisticLoadId
  try {
    const res: CollectStatistic = await api.get('collect/statistic')
    if (loadId !== statisticLoadId) return

    const statistic: CollectStatistic = {
      collect_count: Number(res.collect_count) || 0,
      collect_count_month: Number(res.collect_count_month) || 0,
      collect_finished_count: Number(res.collect_finished_count) || 0,
      collect_finished_month: Number(res.collect_finished_month) || 0,
      seed_count: Number(res.seed_count) || 0,
      seed_count_month: Number(res.seed_count_month) || 0,
      torrent_size: Number(res.torrent_size) || 0,
      source_counts: Array.isArray(res.source_counts)
        ? res.source_counts.map(item => ({ site: String(item.site ?? ''), count: Number(item.count) || 0 }))
        : [],
      seeding_site_counts: Array.isArray(res.seeding_site_counts)
        ? res.seeding_site_counts.map(item => ({ site_name: String(item.site_name ?? ''), count: Number(item.count) || 0 }))
        : [],
    }

    collectCount.value = statistic.collect_count
    collectFinishedCount.value = statistic.collect_finished_count
    seedCount.value = statistic.seed_count
    torrentSize.value = statistic.torrent_size
    collectCountMonth.value = statistic.collect_count_month
    collectFinishedMonth.value = statistic.collect_finished_month
    seedCountMonth.value = statistic.seed_count_month
    sourceCounts.value = statistic.source_counts
    seedingSiteCounts.value = statistic.seeding_site_counts
    writeSnapshot(statistic)
  } catch (e) {
    console.log(e)
  }
}

onMounted(() => {
  loadCollectStatistic()
})

onActivated(() => {
  loadCollectStatistic()
})
</script>

<template>
  <VCard class="dashboard-summary-card dashboard-grid-fill">
    <VCardItem>
      <VCardTitle>{{ t('dashboard.collectStatistic') }}</VCardTitle>
    </VCardItem>

    <VCardText class="dashboard-summary-content">
      <div class="dashboard-stat-grid">
        <div v-for="item in statistics" :key="item.title" class="dashboard-stat-item">
          <VAvatar :color="item.color" size="46" class="dashboard-stat-icon">
            <VIcon size="24" :icon="item.icon" />
          </VAvatar>
          <div class="dashboard-stat-copy">
            <span class="dashboard-stat-label">{{ item.title }}</span>
            <span class="dashboard-number">{{ item.stats }}</span>
            <span v-if="item.addition !== null" class="dashboard-stat-addition">
              {{ t('dashboard.monthlyAddition', { count: item.addition }) }}
            </span>
          </div>
        </div>
      </div>

      <div v-if="sourceRows.length || siteRows.length" class="dashboard-dimension-grid">
        <!-- 按采集源分布 -->
        <div v-if="sourceRows.length" class="dimension-block">
          <div class="dimension-title">{{ t('dashboard.collectSources') }}</div>
          <div class="source-grid">
            <div v-for="row in sourceRows" :key="row.site" class="source-item" :title="row.site">
              <span class="source-dot" :style="{ backgroundColor: sourceMeta(row.site).color }" />
              <span class="source-name">{{ sourceLabel(row.site) }}</span>
              <span class="source-count">{{ formatDashboardCount(row.count) }}</span>
            </div>
          </div>
        </div>
        <!-- 按做种站点分布 -->
        <div v-if="siteRows.length" class="dimension-block">
          <div class="dimension-title">
            {{ t('dashboard.seedingSites') }}
            <span v-if="seedingSiteTotal > siteRows.length" class="dimension-hint">
              {{ t('dashboard.seedingSitesTotal', { count: seedingSiteTotal }) }}
            </span>
          </div>
          <div class="site-rows">
            <div v-for="row in siteRows" :key="row.site_name" class="site-item">
              <span class="site-name" :title="row.site_name">{{ row.site_name }}</span>
              <VProgressLinear
                :model-value="sitePercent(row.count)"
                class="site-bar"
                color="primary"
                height="6"
                rounded
              />
              <span class="site-count">{{ formatDashboardCount(row.count) }}</span>
            </div>
          </div>
        </div>
      </div>
    </VCardText>
  </VCard>
</template>

<style lang="scss" scoped>
.dashboard-summary-card {
  display: flex;
  flex-direction: column;
  block-size: 100%;
  min-block-size: 160px;
}

.dashboard-summary-content {
  display: flex;
  flex: 1 1 auto;
  flex-direction: column;
  justify-content: center;
  min-block-size: 0;
}

.dashboard-stat-grid {
  display: grid;
  flex: 0 0 auto;
  grid-template-columns: repeat(4, minmax(0, 1fr));
}

.dashboard-stat-item {
  display: flex;
  min-inline-size: 0;
  align-items: center;
  gap: 0.7rem;
  padding-inline: 1.1rem;
}

.dashboard-stat-item:first-child {
  padding-inline-start: 0;
}

.dashboard-stat-item + .dashboard-stat-item {
  border-inline-start: 1px solid rgba(var(--v-border-color), var(--v-border-opacity));
}

.dashboard-stat-copy {
  display: flex;
  min-inline-size: 0;
  flex-direction: column;
}

.dashboard-stat-label,
.dashboard-stat-addition {
  font-size: 0.72rem;
}

.dashboard-stat-label {
  color: rgba(var(--v-theme-on-surface), var(--v-medium-emphasis-opacity));
}

.dashboard-number {
  color: rgba(var(--v-theme-on-surface), var(--v-high-emphasis-opacity));
  font-size: 1.15rem;
  font-weight: 700;
  font-variant-numeric: tabular-nums;
  line-height: 1.4;
}

.dashboard-stat-addition {
  overflow: hidden;
  color: rgb(var(--v-theme-success));
  text-overflow: ellipsis;
  white-space: nowrap;
}

.dashboard-dimension-grid {
  display: grid;
  flex: 1 1 auto;
  grid-template-columns: minmax(0, 2fr) minmax(0, 3fr);
  gap: 1.5rem;
  align-items: start;
  margin-block-start: 1.1rem;
}

.dimension-block {
  min-inline-size: 0;
  padding-inline-start: 1.1rem;
  border-inline-start: 1px solid rgba(var(--v-border-color), var(--v-border-opacity));
}

.dimension-title {
  color: rgba(var(--v-theme-on-surface), var(--v-medium-emphasis-opacity));
  font-size: 0.72rem;
  line-height: 1.2;
}

.dimension-hint {
  margin-inline-start: 0.35rem;
  opacity: 0.7;
}

.source-grid {
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: 0.55rem 0.9rem;
  margin-block-start: 0.6rem;
}

.source-item {
  display: flex;
  min-inline-size: 0;
  align-items: center;
  gap: 0.45rem;
}

.source-dot {
  flex: 0 0 auto;
  border-radius: 50%;
  block-size: 0.55rem;
  inline-size: 0.55rem;
}

.source-name {
  overflow: hidden;
  color: rgba(var(--v-theme-on-surface), var(--v-medium-emphasis-opacity));
  flex: 1 1 auto;
  font-size: 0.72rem;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.source-count {
  color: rgba(var(--v-theme-on-surface), var(--v-high-emphasis-opacity));
  font-size: 0.78rem;
  font-variant-numeric: tabular-nums;
  font-weight: 700;
}

.site-rows {
  display: flex;
  flex-direction: column;
  gap: 0.45rem;
  margin-block-start: 0.6rem;
}

.site-item {
  display: flex;
  gap: 0.6rem;
  align-items: center;
  min-inline-size: 0;
}

.site-name {
  overflow: hidden;
  color: rgba(var(--v-theme-on-surface), var(--v-medium-emphasis-opacity));
  flex: 0 0 7.5rem;
  font-size: 0.72rem;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.site-bar {
  flex: 1 1 auto;
  overflow: hidden;
}

.site-count {
  color: rgba(var(--v-theme-on-surface), var(--v-high-emphasis-opacity));
  flex: 0 0 auto;
  font-size: 0.72rem;
  font-variant-numeric: tabular-nums;
  font-weight: 700;
}

@media (max-width: 740px) {
  .dashboard-stat-grid {
    grid-template-columns: repeat(2, minmax(0, 1fr));
    row-gap: 1rem;
  }

  .dashboard-stat-item {
    padding-inline: 0.5rem;
  }

  .dashboard-stat-item:nth-child(odd) {
    border-inline-start: 0;
    padding-inline-start: 0;
  }

  .dashboard-dimension-grid {
    grid-template-columns: 1fr;
    gap: 1rem;
  }

  .dimension-block {
    padding-inline-start: 0.5rem;
  }

  .source-grid {
    grid-template-columns: repeat(3, minmax(0, 1fr));
  }
}
</style>
