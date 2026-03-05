<script setup lang="ts">
// @ts-nocheck

import api from '@/api'
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

async function getProgressInfo() {
  try {
    progress.value = await api.get(`collect/progress/seed/${props?.seed.id}`)
  } catch (error) {
    console.error(error)
  }
}
async function getSeedInfo() {
  try {
    siteSeed.value = await api.get(`collect/seed/detail/${props?.seed.id}`)
  } catch (error) {
    console.error(error)
  }
}

function getBtnIcon() {
  if (!siteSeed.value?.torrent_uploaded) {
    return 'mdi-progress-upload'
  } else if (!siteSeed.value?.torrent_downloaded) {
    return 'mdi-arrow-down'
  } else if (!siteSeed.value?.torrent_seeded) {
    return 'mdi-arrow-up'
  } else {
    return 'mdi-progress-upload'
  }
}

function getActionName() {
  if (!siteSeed.value?.torrent_uploaded) {
    return '上传'
  } else if (!siteSeed.value?.torrent_downloaded) {
    return '下载'
  } else if (!siteSeed.value?.torrent_seeded) {
    return '发布'
  } else {
    return '更新'
  }
}
function getAction() {
  if (!siteSeed.value?.torrent_uploaded) {
    return 'torrent_publish'
  } else if (!siteSeed.value?.torrent_downloaded) {
    return 'torrent_download'
  } else if (!siteSeed.value?.torrent_seeded) {
    return 'torrent_seed'
  } else {
    return 'torrent_update'
  }
}
function hideHandleBtn() {
  return siteSeed.value?.torrent_uploaded && siteSeed.value?.torrent_downloaded && siteSeed.value?.torrent_seeded
}
// 调用API添加采集任务
async function handleSubmit(id: number) {
  loading.value = true
  try {
    // 请求API
    const action = getAction()

    const result: { [key: string]: any } = await api.get('collect/' + action + '/' + props?.seed.id)
    // 添加采集任务状态
    if (result.success) {
      // 成功
      $toast.success(getActionName() + '事件提交成功！')

    } else {
      $toast.error(getActionName() + '事件提交失败')
    }
  } catch (error) {
    console.error(error)
  }
  loading.value = false
}

async function deleteSeed() {
  try {
    loading.value = true
    // 请求API
    const result: { [key: string]: any } = await api.delete('collect/seed/' + props?.seed.id)
    // 添加采集任务状态
    if (result.success) {
      // 成功
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
      <VCardText class="d-flex flex-row  justify-center ">
        <v-sheet class="d-flex align-center justify-center flex-wrap mx-auto px-4" elevation="0">
          <VTimeline align="start" side="end">
            <VTimelineItem :dot-color="item.success ? 'success' : 'error'" size="small"
              v-for="(item, index) in progress">
              <div class="d-flex">
                <strong class="me-4">{{ item.created_at }}</strong>
                <div>
                  <strong>{{ item.name }}</strong>
                  <div class="text-caption" v-if="!item.success">
                    {{ item.error_msg }}
                  </div>
                </div>
              </div>
            </VTimelineItem>
          </VTimeline>
        </v-sheet>
      </VCardText>
      <VCardItem class="text-center mt-10">
        <VBtn variant="elevated" @click="handleSubmit" :disabled="loading" color="success" :prepend-icon="getBtnIcon()"
          class="px-5" size="small">
          {{ getActionName() }}
        </VBtn>
        <VBtn variant="elevated" @click="deleteSeed" :disabled="loading" color="error" prepend-icon="mdi-delete"
          class="px-5 ml-5" size="small">
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
