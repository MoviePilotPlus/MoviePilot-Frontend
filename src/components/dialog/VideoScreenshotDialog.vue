<script setup lang="ts">
// @ts-nocheck

import api from '@/api'
import { Collect } from '@/api/types'

// 输入参数
const props = defineProps({
  collect: {
    type: Object as () => Collect,
    default: () => ({})
  }
})
const collectDetail = ref<Collect>({} as Collect)
const screenshots = ref<string[]>([])

// 解析截图（支持 JSON 数组和 BBCode 格式）
function parseScreenshots(data: string | null): string[] {
  if (!data) return []
  
  // 尝试解析为 JSON 数组
  try {
    const parsed = JSON.parse(data)
    if (Array.isArray(parsed)) {
      return parsed
    }
  } catch (e) {
    // 不是 JSON，尝试解析 BBCode 格式
  }
  
  // 解析 BBCode 格式: [img]url[/img]
  const imgRegex = /\[img\](.*?)\[\/img\]/gi
  const urls: string[] = []
  let match
  while ((match = imgRegex.exec(data)) !== null) {
    if (match[1]) {
      urls.push(match[1])
    }
  }
  return urls
}

// 调用API查询详情
async function getDetail() {
  if (props.collect.id) {
    collectDetail.value = await api.get(`collect/${props.collect.id}`)
    // 解析截图
    if (collectDetail.value?.screenshots) {
      screenshots.value = parseScreenshots(collectDetail.value.screenshots)
    }
  }
}
// 注册事件
const emit = defineEmits(['close'])
// 装载时查询
onMounted(() => {
  getDetail()
})

// 打开图片
function openImage(url: string) {
  window.open(url, '_blank')
}
</script>
<template>
  <VDialog scrollable fullscreen :scrim="false" transition="dialog-bottom-transition">
    <VCard>
      <!-- Toolbar -->
      <div>
        <VToolbar color="primary">
          <VToolbarTitle>{{ `截图 - ${collectDetail?.name}` }}</VToolbarTitle>
          <VSpacer />
          <VToolbarItems>
            <VBtn icon variant="plain" @click="emit('close')" class="me-3">
              <VIcon size="large" color="white" icon="ri-close-line" />
            </VBtn>
          </VToolbarItems>
        </VToolbar>
      </div>
      <VCardText>
        <VRow v-if="screenshots.length > 0">
          <VCol v-for="(screenshot, index) in screenshots" :key="index" cols="12" sm="6">
            <VCard class="mb-4">
              <VImg :src="screenshot" aspect-ratio="1.77" cover @click="openImage(screenshot)" style="cursor: pointer" />
            </VCard>
          </VCol>
        </VRow>
        <VAlert v-else type="info" variant="tonal" class="ma-4">
          暂无截图
        </VAlert>
      </VCardText>
    </VCard>
  </VDialog>
</template>

<style lang="scss" scoped>
.v-card {
  overflow: hidden;
}
</style>
