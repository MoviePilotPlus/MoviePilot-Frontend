<script setup lang="ts">
// @ts-nocheck

import api from '@/api'
import { CollectProgress, DownloadTask } from '@/api/types'
import { getIcon } from '@iconify/vue'
import { useToast } from 'vue-toastification'

// 提示框
const $toast = useToast()
// 加载中
const loading = ref(false)

const progress = ref<Array<CollectProgress>>([])
const task = ref<DownloadTask>()
// 输入参数
const props = defineProps({
  id: Number,
  type: String,
  name: String
})
const actions = {
  'create_download_task': {
    'name': '创建下载任务',
    'icon': 'mdi-clipboard-edit',
    'color': 'primary',
    'api': '',
    'next_action': 'prepare_download'
  },
  'prepare_download': {
    'name': '生成命令',
    'icon': 'mdi-clipboard-edit',
    'color': 'primary',
    'api': 'collect/prepare_download/{id}',
    'next_action': 'start_download'
  },
  'start_download': {
    'name': '下载',
    'icon': 'mdi-clipboard-edit',
    'color': 'primary',
    'api': 'collect/start_download/{id}',
    'next_action': 'collect_mediainfo'
  },
  'collect_mediainfo': {
    'name': '采集元数据',
    'icon': 'mdi-clipboard-edit',
    'color': 'primary',
    'api': 'collect/metadata/{id}',
    'next_action': 'screenshot'
  },
  'screenshot': {
    'name': '截图',
    'icon': 'mdi-clipboard-edit',
    'color': 'primary',
    'api': 'collect/screenshot/{id}',
    'next_action': 'collect_desc'
  },
  'collect_desc': {
    'name': '获取简介',
    'icon': 'mdi-clipboard-edit',
    'color': 'primary',
    'api': 'collect/collect_desc/{id}',
    'next_action': 'task_rename'
  },
  'task_rename': {
    'name': '重命名',
    'icon': 'mdi-clipboard-edit',
    'color': 'primary',
    'api': 'collect/task_rename/{id}',
    'next_action': ''
  }
}
// 修改 action 参数类型为 actions 对象的键类型
function getNextAction(action: keyof typeof actions) {
  return actions[action]?.next_action
}

function showActionBtn(action_key: string) {
  if (action_key) {
    const action = getNextAction(action_key as keyof typeof actions)
    if (action) {
      return true
    } else {
      return false
    }
  } else {
    return false
  }
}
function getBtnIcon(action_key: keyof typeof actions) {
  const action = getNextAction(action_key)

  if (action) {
    return actions[action as keyof typeof actions]?.icon
  } else {
    return ''
  }
}

function getActionColor(action_key: keyof typeof actions) {
  const action = getNextAction(action_key)
  if (action) {
    return actions[action as keyof typeof actions]?.color
  } else {
    return ''
  }
}

function getActionName(action_key: keyof typeof actions) {
  const action = getNextAction(action_key)
  if (action) {
    return actions[action as keyof typeof actions]?.name
  } else {
    return ''
  }
}
function getAction(action_key: keyof typeof actions) {
  const action = getNextAction(action_key)
  if (action) {
    return actions[action as keyof typeof actions]?.api
  } else {
    return ''
  }
}
async function handleSubmit(action: string) {
  loading.value = true
  try {
    // 请求API
    const next_action = getNextAction(action as keyof typeof actions)
    if (next_action) {
      const api_url = getAction(action as keyof typeof actions)
      const actionName = getActionName(action as keyof typeof actions)
      if (!api_url) {
        throw new Error('API URL not found')
      }
      await api.get(api_url?.replace('{id}', props?.id?.toString() || ''))
      // 事件提交成功
      $toast.success(actionName + '事件提交成功！')
    }
  } catch (error) {
    console.error(error)
  }
  loading.value = false
}
async function getDownloadTaskInfo() {
  try {
    task.value = await api.get(`task/detail/${props.id}`)
  } catch (error) {
    console.error(error)
  }
}

async function getProgressInfo() {
  try {
    progress.value = await api.get(`collect/progress/${props.type}/${props.id}`)
  } catch (error) {
    console.error(error)
  }
}
// 注册事件
const emit = defineEmits(['close'])

onMounted(() => {
  getDownloadTaskInfo()
  getProgressInfo()
})
</script>
<template>
  <VDialog scrollable max-width="60rem" :scrim="false" transition="dialog-bottom-transition">
    <VCard>
      <!-- Toolbar -->
      <div>
        <VToolbar color="primary">
          <VToolbarTitle>{{ `下载任务信息 - ${task?.name}` }}</VToolbarTitle>
          <VSpacer />
          <VToolbarItems>
            <VBtn icon variant="plain" @click="emit('close')" class="me-3">
              <VIcon size="large" color="white" icon="ri-close-line" />
            </VBtn>
          </VToolbarItems>
        </VToolbar>
      </div>
      <VCardText class="d-flex flex-row  justify-center ">
        <div class="d-flex align-center justify-center flex-wrap mx-auto px-4" width="100%" elevation="0">
          <VTimeline align="start" density="compact" side="end">
            <VTimelineItem :dot-color="item.success ? 'success' : 'error'" size="small" v-for="(item, index) in progress">
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
                  <div class="text-caption">
                    <VBtn v-if="showActionBtn(item.action)" variant="elevated" @click="handleSubmit(item.action)"
                      :disabled="loading" :color="getActionColor(item.action)" :prepend-icon="getBtnIcon(item.action)"
                      class="px-5" size="small">
                      {{ getActionName(item.action) }}
                    </VBtn>
                  </div>
                </div>
              </div>
            </VTimelineItem>
          </VTimeline>
        </div>
      </VCardText>
      <!-- <VCardItem class="text-center mt-10">
        
      </VCardItem> -->
    </VCard>
  </VDialog>
</template>

<style lang="scss" scoped>
.v-table th {
  white-space: nowrap;
}
</style>
