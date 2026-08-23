<script setup lang="ts">
// @ts-nocheck

import { pluginApi as api } from '@/api'
import { CollectProgress, SiteSeed } from '@/api/types'
import { useToast } from 'vue-toastification'

const progress = ref<Array<CollectProgress>>([])
const siteSeed = ref<SiteSeed>()
// 注册事件
const emit = defineEmits(['remove', 'close'])
// 输入参数
const props = defineProps({
  seed: {
    type: Object as () => SiteSeed,
    default: () => ({})
  }
})
// 提示框
const $toast = useToast()
// 加载中
const loading = ref(false)
// 是否仅执行当前步骤（不自动续跑后续）
const onlyCurrentStep = ref(false)

// 种子操作配置表
const actions = {
  torrent_publish: {
    name: '发布种子',
    icon: 'mdi-progress-upload',
    color: 'primary',
    api: 'collect/torrent_publish/{id}',
    supportsNextStep: true,
    flag: 'torrent_uploaded',
  },
  torrent_download: {
    name: '下载种子',
    icon: 'mdi-arrow-down',
    color: 'primary',
    api: 'collect/torrent_download/{id}',
    supportsNextStep: true,
    flag: 'torrent_downloaded',
  },
  torrent_seed: {
    name: '做种',
    icon: 'mdi-arrow-up',
    color: 'primary',
    api: 'collect/torrent_seed/{id}',
    supportsNextStep: false,
    flag: 'torrent_seeded',
  },
  torrent_update: {
    name: '更新种子',
    icon: 'mdi-refresh',
    color: 'secondary',
    api: 'collect/torrent_update/{id}',
    supportsNextStep: false,
    flag: null,
  },
}

type SeedAction = keyof typeof actions

const POLL_INTERVAL_MS = 1500
const POLL_MAX_ATTEMPTS = 8

function sleep(ms: number) {
  return new Promise(resolve => setTimeout(resolve, ms))
}

function getSeedSnapshot(seed?: SiteSeed | null) {
  return {
    uploaded: Boolean(seed?.torrent_uploaded),
    downloaded: Boolean(seed?.torrent_downloaded),
    seeded: Boolean(seed?.torrent_seeded),
    lastError: seed?.last_error || '',
    torrentId: seed?.torrent_id || '',
    torrentHash: seed?.torrent_hash || '',
    progressLen: progress.value?.length || 0,
  }
}

function hasStateChanged(before: ReturnType<typeof getSeedSnapshot>, after: ReturnType<typeof getSeedSnapshot>) {
  return (
    before.uploaded !== after.uploaded ||
    before.downloaded !== after.downloaded ||
    before.seeded !== after.seeded ||
    before.lastError !== after.lastError ||
    before.torrentId !== after.torrentId ||
    before.torrentHash !== after.torrentHash ||
    before.progressLen !== after.progressLen
  )
}

async function getProgressInfo() {
  try {
    const response = await api.get(`collect/progress/seed/${props?.seed.id}`)
    // pluginApi 原样返回三键信封，进度列表在 data 中
    progress.value = response?.data ?? []
  } catch (error) {
    console.error(error)
  }
}

async function getSeedInfo() {
  try {
    const response = await api.get(`collect/seed/detail/${props?.seed.id}`)
    siteSeed.value = response?.data
  } catch (error) {
    console.error(error)
  }
}

async function refreshAll() {
  await Promise.all([getProgressInfo(), getSeedInfo()])
}

/** 提交后短轮询，直到状态变化或超时 */
async function pollUntilChanged(before: ReturnType<typeof getSeedSnapshot>) {
  for (let i = 0; i < POLL_MAX_ATTEMPTS; i++) {
    await sleep(POLL_INTERVAL_MS)
    await refreshAll()
    const after = getSeedSnapshot(siteSeed.value)
    if (hasStateChanged(before, after)) {
      return true
    }
  }
  return false
}

/** 根据状态位决定当前应执行的步骤 */
function getCurrentAction(): SeedAction {
  if (!siteSeed.value?.torrent_uploaded) {
    return 'torrent_publish'
  }
  if (!siteSeed.value?.torrent_downloaded) {
    return 'torrent_download'
  }
  if (!siteSeed.value?.torrent_seeded) {
    return 'torrent_seed'
  }
  return 'torrent_update'
}

function getActionMeta(action: SeedAction) {
  return actions[action]
}

function getBtnIcon() {
  return getActionMeta(getCurrentAction()).icon
}

function getActionName() {
  return getActionMeta(getCurrentAction()).name
}

function getActionColor() {
  return getActionMeta(getCurrentAction()).color
}

/** 失败进度节点是否展示重试按钮 */
function canRetryAction(action: string) {
  return Boolean(action && actions[action as SeedAction])
}

function getRetryActionName(action: string) {
  return actions[action as SeedAction]?.name || action
}

function getRetryActionIcon(action: string) {
  return actions[action as SeedAction]?.icon || 'mdi-refresh'
}

function getRetryActionColor(action: string) {
  return actions[action as SeedAction]?.color || 'error'
}

function buildApiUrl(action: SeedAction) {
  const meta = getActionMeta(action)
  let apiUrl = meta.api.replace('{id}', String(props?.seed.id))
  if (meta.supportsNextStep) {
    const nextStep = onlyCurrentStep.value ? 'false' : 'true'
    apiUrl += `?next_step=${nextStep}`
  }
  return apiUrl
}

// 调用API提交种子操作（底部主按钮 / 时间线失败重试共用）
async function handleSubmit(action?: string) {
  if (loading.value) {
    return
  }
  loading.value = true
  const act = (action || getCurrentAction()) as SeedAction
  const meta = getActionMeta(act)
  const before = getSeedSnapshot(siteSeed.value)
  try {
    const apiUrl = buildApiUrl(act)
    const result: { [key: string]: any } = await api.get(apiUrl)
    if (result.success) {
      const modeText = onlyCurrentStep.value && meta.supportsNextStep ? '（仅本步）' : ''
      $toast.success(`${meta.name}事件提交成功${modeText}！`)
      // 异步任务：短轮询直到状态变化
      await pollUntilChanged(before)
    } else {
      $toast.error(result.message || `${meta.name}事件提交失败`)
      await refreshAll()
    }
  } catch (error) {
    console.error(error)
    $toast.error(`${meta.name}事件提交失败`)
    await refreshAll()
  }
  loading.value = false
}

async function deleteSeed() {
  try {
    loading.value = true
    const result: { [key: string]: any } = await api.delete('collect/seed/' + props?.seed.id)
    if (result.success) {
      $toast.success(`删除成功！`)
    } else {
      $toast.error(`删除失败`)
    }
    emit('remove')
  } catch (error) {
    console.error(error)
  }
  loading.value = false
}

onMounted(() => {
  getProgressInfo()
  getSeedInfo()
})
</script>

<template>
  <VDialog scrollable max-width="60rem" :scrim="false" transition="dialog-bottom-transition">
    <VCard>
      <!-- Toolbar -->
      <div>
        <VToolbar color="primary">
          <VToolbarTitle>{{ `做种信息 - ${props.seed?.site_name}` }}</VToolbarTitle>
          <VSpacer />
          <VToolbarItems>
            <VBtn icon variant="plain" @click="emit('close')" class="me-3">
              <VIcon size="large" color="white" icon="ri-close-line" />
            </VBtn>
          </VToolbarItems>
        </VToolbar>
      </div>

      <!-- 最近错误 -->
      <VCardText v-if="siteSeed?.last_error" class="pb-0">
        <VAlert type="error" variant="tonal" density="compact" class="text-caption">
          {{ siteSeed.last_error }}
        </VAlert>
      </VCardText>

      <VCardText class="d-flex flex-row justify-center">
        <div class="d-flex align-center justify-center flex-wrap mx-auto px-4" width="100%" elevation="0">
          <VTimeline align="start" density="compact" side="end">
            <VTimelineItem
              v-for="(item, index) in progress"
              :key="index"
              :dot-color="item.success ? 'success' : 'error'"
              size="small"
            >
              <div class="d-flex">
                <strong class="me-4"></strong>
                <div>
                  <strong>{{ item.name }}</strong>
                  <div class="text-caption">
                    {{ item.created_at }}
                  </div>
                  <div class="text-caption" v-if="!item.success">
                    {{ item.error_msg }}
                  </div>
                  <!-- 失败节点：重试当前 action -->
                  <div class="text-caption mt-1" v-if="!item.success && canRetryAction(item.action)">
                    <VBtn
                      variant="elevated"
                      @click="handleSubmit(item.action)"
                      :disabled="loading"
                      :color="getRetryActionColor(item.action)"
                      :prepend-icon="getRetryActionIcon(item.action)"
                      class="px-5"
                      size="small"
                    >
                      重试：{{ getRetryActionName(item.action) }}
                    </VBtn>
                  </div>
                </div>
              </div>
            </VTimelineItem>
          </VTimeline>
        </div>
      </VCardText>

      <VCardItem class="text-center mt-4">
        <div class="d-flex align-center justify-center mb-3">
          <VCheckbox
            v-model="onlyCurrentStep"
            density="compact"
            hide-details
            label="仅执行当前步骤（不自动续跑）"
            :disabled="loading"
          />
        </div>
        <VBtn
          variant="elevated"
          @click="handleSubmit()"
          :disabled="loading"
          :color="getActionColor()"
          :prepend-icon="getBtnIcon()"
          class="px-5"
          size="small"
        >
          <VProgressCircular
            v-if="loading"
            indeterminate
            size="16"
            width="2"
            class="me-2"
          />
          {{ loading ? '执行中...' : getActionName() }}
        </VBtn>
        <VBtn
          variant="elevated"
          @click="deleteSeed"
          :disabled="loading"
          color="error"
          prepend-icon="mdi-delete"
          class="px-5 ml-5"
          size="small"
        >
          删除
        </VBtn>
      </VCardItem>
    </VCard>
  </VDialog>
</template>

<style lang="scss" scoped>
.v-table th {
  white-space: nowrap;
}
</style>
