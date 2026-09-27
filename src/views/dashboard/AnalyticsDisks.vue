<script setup lang="ts">
import api from '@/api'
import type { DiskUsageInfo } from '@/api/types'
import { formatDashboardFileSize } from '@/composables/useDashboardMotion'
import { useI18n } from 'vue-i18n'
import { useKeepAliveRefresh } from '@/composables/useKeepAliveRefresh'

// 国际化
const { t } = useI18n()

// 各挂载磁盘用量列表
const disks = ref<DiskUsageInfo[]>([])

// 展示名：Windows 盘符（C:\）原样，POSIX 长挂载路径压缩中间段避免撑破布局
function displayMount(mountPoint: string) {
  const value = mountPoint || ''
  if (/^[A-Za-z]:\\?$/.test(value)) return value.replace('\\', '')
  const parts = value.split('/').filter(Boolean)
  if (parts.length <= 2) return value
  return `${parts[0]}/…/${parts[parts.length - 1]}`
}

// 按使用率取进度条颜色
function usageColor(percent: number) {
  if (percent >= 95) return 'error'
  if (percent >= 85) return 'warning'
  return 'primary'
}

// 调用API，查询全部挂载磁盘的空间使用情况
async function getDisks() {
  try {
    const res: DiskUsageInfo[] = await api.get('dashboard/disks')
    disks.value = Array.isArray(res) ? res : []
  } catch (e) {
    console.log(e)
  }
}

const { refresh: refreshDisks } = useKeepAliveRefresh(getDisks)

onMounted(refreshDisks)
</script>

<template>
  <VCard class="dashboard-summary-card dashboard-grid-fill">
    <VCardItem class="pb-2">
      <VCardTitle>{{ t('dashboard.disks') }}</VCardTitle>
    </VCardItem>
    <VCardText class="dashboard-summary-content">
      <template v-if="disks.length">
        <div v-for="disk in disks" :key="disk.mount_point" class="disk-item">
          <div class="disk-meta">
            <span class="disk-mount" :title="disk.mount_point">
              {{ displayMount(disk.mount_point) }}
            </span>
            <span class="disk-percent">{{ Number(disk.percent ?? 0).toFixed(1) }}%</span>
          </div>
          <VProgressLinear
            :model-value="Number(disk.percent ?? 0)"
            :color="usageColor(Number(disk.percent ?? 0))"
            class="disk-progress"
            height="6"
            rounded
          />
          <div class="disk-caption">
            {{ t('dashboard.diskUsed', { used: formatDashboardFileSize(Number(disk.used) || 0), total: formatDashboardFileSize(Number(disk.total) || 0) }) }}
            <span v-if="disk.fs_type" class="disk-fstype">{{ disk.fs_type }}</span>
          </div>
        </div>
      </template>
      <div v-else class="disk-empty">
        {{ t('dashboard.noDisks') }}
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
  flex: 1 1 auto;
  min-block-size: 0;
  padding-block: 0 0.7rem;
}

.disk-item + .disk-item {
  margin-block-start: 0.85rem;
}

.disk-meta {
  display: flex;
  gap: 0.5rem;
  align-items: baseline;
  justify-content: space-between;
}

.disk-mount {
  overflow: hidden;
  color: rgba(var(--v-theme-on-surface), var(--v-high-emphasis-opacity));
  font-size: 0.875rem;
  font-weight: 600;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.disk-percent {
  color: rgba(var(--v-theme-on-surface), var(--v-medium-emphasis-opacity));
  font-size: 0.8rem;
  font-variant-numeric: tabular-nums;
  line-height: 1.2;
}

.disk-progress {
  overflow: hidden;
  margin-block-start: 0.3rem;
}

.disk-caption {
  color: rgba(var(--v-theme-on-surface), var(--v-medium-emphasis-opacity));
  font-size: 0.68rem;
  margin-block-start: 0.25rem;
}

.disk-fstype {
  float: right;
  opacity: 0.7;
  text-transform: uppercase;
}

.disk-empty {
  display: flex;
  align-items: center;
  justify-content: center;
  color: rgba(var(--v-theme-on-surface), var(--v-medium-emphasis-opacity));
  font-size: 0.8rem;
  block-size: 100%;
}
</style>
