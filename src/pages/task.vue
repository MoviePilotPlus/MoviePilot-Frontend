<script setup lang="ts">
// @ts-nocheck
import NoDataFound from '@/components/NoDataFound.vue'
import api from '@/api'
import type { Collect, DownloadTask } from '@/api/types'
import TaskCardListView from '@/views/collect/TaskCardListView.vue'
import TaskRowListView from '@/views/collect/TaskRowListView.vue'
import { useI18n } from 'vue-i18n'

// 国际化
const { t } = useI18n()

// 进度是否有效
const progressEnabled = ref(false)
// 视图切换中
const isViewChanging = ref(false)

// 视图类型，从localStorage中读取
const viewType = ref<string>(localStorage.getItem('MPTaskViewType') ?? 'row')

// 数据列表
const collectList = ref<Array<Collect>>([])

const taskList = ref<Array<DownloadTask>>([])

// 是否刷新过
const isRefreshed = ref(false)

// 加载进度文本
const progressText = ref('')

// 加载进度
const progressValue = ref(0)

// 加载进度SSE
const progressEventSource = ref<EventSource>()

const pageTitle = computed(() => (viewType.value === 'card' ? t('resource.downloadTasks') : t('resource.collectTasks')))
const errorTitle = computed(() => t('resource.noData'))
const errorDescription = computed(() => t('resource.noResourceFound'))

// 停止监听加载进度
function stopLoadingProgress() {
  if (progressEventSource.value) progressEventSource.value?.close()
}

// 获取搜索列表数据
async function fetchData() {
  try {
    if (viewType.value == 'row') {
      collectList.value = (await api.get('collect/')) ?? []
      taskList.value = (await api.get('task/')) ?? []
    } else {
      taskList.value = (await api.get('task/')) ?? []
      collectList.value = (await api.get('collect/')) ?? []
    }
    isRefreshed.value = true
  } catch (error) {
    isRefreshed.value = true
    return Promise.reject(error)
  }
}
// 设置视图类型
function changeViewType(newType: string) {
  if (viewType.value !== newType) {
    isViewChanging.value = true
    viewType.value = newType
    localStorage.setItem('MPTaskViewType', newType)

    // 模拟视图切换的加载过程
    setTimeout(() => {
      isViewChanging.value = false
    }, 600)
  }
}
// 加载数据
onMounted(() => {
  fetchData()
})

// 卸载时停止加载进度
onUnmounted(() => {
  stopLoadingProgress()
})
</script>

<template>
  <div>
    <!-- 加载进度条 -->
    <VFadeTransition>
      <div v-if="progressValue > 0 || progressEnabled" class="search-progress-container">
        <VCard elevation="3" class="search-progress-card">
          <div class="progress-header">
            <VIcon icon="mdi-movie-search" color="primary" size="small" class="me-2" />
            <span class="progress-title">{{ progressText }}</span>
          </div>
          <div class="progress-bar-container">
            <VProgressLinear color="primary" rounded :model-value="progressValue" />
            <div class="progress-percentage">{{ Math.ceil(progressValue) }}%</div>
          </div>
        </VCard>
      </div>
    </VFadeTransition>

    <VCard v-if="isRefreshed" class="search-header d-flex align-center mb-3">
      <div class="search-info-container">
        <div class="search-title-row">
          <VIcon icon="mdi-file-multiple" size="18" color="primary" class="me-2" />
          <div class="search-title text-moviepilot">
            {{ pageTitle }}
          </div>
        </div>
        <div class="search-subtitle text-medium-emphasis">
          {{ t('resource.taskPageHint') }}
        </div>
      </div>
      <VSpacer />
      <!-- 重新设计的视图切换按钮 -->
      <div class="view-toggle-container">
        <div class="view-toggle-buttons">
          <button class="view-toggle-btn" :class="{ active: viewType === 'row' }" @click="changeViewType('row')">
            <VIcon icon="mdi-view-list-outline" :color="viewType === 'row' ? 'primary' : undefined" />
          </button>
          <button class="view-toggle-btn" :class="{ active: viewType === 'card' }" @click="changeViewType('card')">
            <VIcon icon="mdi-view-grid-outline" :color="viewType === 'card' ? 'primary' : undefined" />
          </button>
        </div>
      </div>
    </VCard>

    <!-- 视图切换加载状态 -->
    <VFadeTransition>
      <div v-if="isRefreshed && isViewChanging" class="view-changing-container rounded-lg">
        <div class="view-changing-content">
          <div class="pulse-loader">
            <div class="pulse-circle"></div>
            <div class="pulse-circle"></div>
            <div class="pulse-circle"></div>
          </div>
          <div class="view-changing-text">{{ t('resource.switchingView') }}</div>
        </div>
      </div>
    </VFadeTransition>
    <!-- 搜索结果 -->
    <div
      v-if="
        isRefreshed &&
        ((viewType === 'card' && taskList.length > 0) || (viewType === 'row' && collectList.length > 0)) &&
        !isViewChanging
      "
      class="search-results-container"
    >
      <!-- 卡片视图模式 -->
      <VFadeTransition>
        <div v-if="viewType === 'card'">
          <TaskCardListView :items="taskList" />
        </div>
      </VFadeTransition>

      <!-- 列表视图模式 -->
      <VFadeTransition>
        <div v-if="viewType === 'row'">
          <TaskRowListView :items="collectList" />
        </div>
      </VFadeTransition>
    </div>

    <!-- 无数据显示 -->
    <div
      v-else-if="isRefreshed && !isViewChanging && taskList.length === 0 && collectList.length === 0"
      class="d-flex flex-column align-center justify-center py-8"
    >
      <NoDataFound :errorTitle="errorTitle" :errorDescription="errorDescription" />
      <VBtn class="mt-4" color="primary" prepend-icon="mdi-magnify" to="/">{{ t('resource.backToHome') }}</VBtn>
    </div>

    <!-- 初始加载状态 -->
    <LoadingBanner v-else-if="!isRefreshed && !(progressEnabled || progressValue > 0)" />
    <!-- 滚动到顶部按钮 -->
    <VScrollToTopBtn />
  </div>
</template>
<style scoped>
.search-progress-container {
  position: fixed;
  z-index: 100;
  display: flex;
  justify-content: center;
  inset-block-start: env(safe-area-inset-top);
  inset-inline: 0;
  padding-block-start: 4rem;
}

.search-progress-card {
  padding: 16px;
  border: 1px solid rgba(var(--v-theme-on-surface), 0.08);
  border-radius: 12px;
  background: rgb(var(--v-theme-surface));
  box-shadow: 0 1px 6px rgba(0, 0, 0, 4%);
  inline-size: 90%;
  max-inline-size: 400px;
}

.progress-header {
  display: flex;
  align-items: center;
  margin-block-end: 12px;
}

.progress-title {
  color: rgb(var(--v-theme-on-surface));
  font-size: 0.9rem;
  font-weight: 500;
}

.progress-bar-container {
  display: flex;
  align-items: center;
  gap: 12px;
}

.progress-percentage {
  color: rgb(var(--v-theme-primary));
  font-size: 0.8rem;
  font-weight: 600;
  min-inline-size: 36px;
  text-align: end;
}

/* 精简标题栏样式 */
.search-header {
  border: 1px solid rgba(var(--v-theme-on-surface), 0.08);
  border-radius: 14px;
  background: rgb(var(--v-theme-surface));
  box-shadow: 0 1px 6px rgba(0, 0, 0, 3%);
  padding-block: 12px;
  padding-inline: 18px;
}

.search-info-container {
  display: flex;
  flex-direction: column;
  gap: 12px;
  min-inline-size: 0;
}

.search-title-row {
  display: flex;
  align-items: center;
}

.search-title {
  font-size: 1.12rem;
  font-weight: 600;
  line-height: 1.2;
}

.search-subtitle {
  font-size: 0.85rem;
  line-height: 1.2;
}

/* 重新设计的视图切换按钮 */
.view-toggle-container {
  position: relative;
}

.view-toggle-buttons {
  display: flex;
  padding: 4px;
  border: 1px solid rgba(var(--v-theme-on-surface), 0.08);
  border-radius: 10px;
  background-color: rgba(var(--v-theme-surface-variant), 0.08);
  gap: 4px;
}

.view-toggle-btn {
  display: flex;
  align-items: center;
  justify-content: center;
  border: none;
  border-radius: 6px;
  background: transparent;
  block-size: 36px;
  cursor: pointer;
  inline-size: 40px;
  transition: all 0.2s ease;
}

.view-toggle-btn.active {
  background-color: rgba(var(--v-theme-surface), 0.92);
  box-shadow: 0 1px 4px rgba(0, 0, 0, 8%);
}

.view-toggle-btn:hover:not(.active) {
  background-color: rgba(var(--v-theme-primary), 0.08);
}

/* 视图切换加载状态 */
.view-changing-container {
  position: absolute;
  z-index: 10;
  display: flex;
  align-items: center;
  justify-content: center;
  backdrop-filter: blur(8px);
  inset: 0;
}

.view-changing-content {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 16px;
}

.pulse-loader {
  display: flex;
  gap: 8px;
}

.pulse-circle {
  border-radius: 50%;
  animation: pulse 1.2s ease-in-out infinite;
  background-color: rgb(var(--v-theme-primary));
  block-size: 12px;
  inline-size: 12px;
}

.pulse-circle:nth-child(2) {
  animation-delay: 0.2s;
}

.pulse-circle:nth-child(3) {
  animation-delay: 0.4s;
}

@keyframes pulse {
  0%,
  100% {
    opacity: 0.5;
    transform: scale(0.8);
  }

  50% {
    opacity: 1;
    transform: scale(1.2);
  }
}

.view-changing-text {
  color: rgb(var(--v-theme-primary));
  font-size: 0.9rem;
  font-weight: 500;
  letter-spacing: 1px;
}

.search-results-container {
  position: relative;
  min-block-size: 50vh;
}

@media (width <=600px) {
  .search-header {
    padding-block: 8px;
    padding-inline: 12px;
  }

  .search-title {
    font-size: 1.2rem;
    white-space: nowrap;
  }

  .search-info-container {
    overflow: hidden;
    flex: 1;
    gap: 8px;
    min-inline-size: 0;
  }

  .view-toggle-container {
    flex-shrink: 0;
  }

  .view-toggle-buttons {
    padding: 2px;
  }

  .view-toggle-btn {
    block-size: 32px;
    inline-size: 36px;
  }
}
</style>
