<script setup lang="ts">
// @ts-nocheck

import api from '@/api'
import { Collect } from '@/api/types'
import BbcodeParser from '@/components/render/BbcodeParser.vue'

// 输入参数
const props = defineProps({
  collect: {
    type: Object as () => Collect,
    default: () => ({})
  }
})
const collectDetail = ref<Collect>({} as Collect)

// 调用API查询详情
async function getDetail() {
  if (props.collect.id) {
    collectDetail.value = await api.get(`collect/${props.collect.id}`)
  }
}
// 注册事件
const emit = defineEmits(['close'])
// 装载时查询站点图标
onMounted(() => {
  getDetail()
})

// screenshots 已与 description 解耦：展示时动态拼接当前 screenshots
// 兼容历史数据：若 description 末尾已拼接旧 screenshots，先剥离再拼接，避免重复
function stripTrailingScreenshots(desc: string, screenshots: string): string {
  if (!desc || !screenshots) return desc || ''
  const d = desc.replace(/\s+$/, '')
  const s = screenshots.trim()
  if (s && d.endsWith(s)) return d.slice(0, d.length - s.length).replace(/\s+$/, '')
  return d
}
const descContent = computed(() => {
  const desc = collectDetail.value?.description || ''
  const shots = collectDetail.value?.screenshots || ''
  const cleaned = stripTrailingScreenshots(desc, shots)
  return shots ? `${cleaned}\n\n${shots}` : cleaned
})
</script>
<template>
  <VDialog scrollable fullscreen :scrim="false" transition="dialog-bottom-transition">
    <VCard>
      <!-- Toolbar -->
      <div>
        <VToolbar color="primary">
          <VToolbarTitle>{{ `简介 - ${collectDetail?.name}` }}</VToolbarTitle>
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
          <BbcodeParser v-if="descContent" :content="descContent" />
        </v-sheet>
      </VCardText>

    </VCard>
  </VDialog>
</template>

<style lang="scss" scoped>
.v-table th {
  white-space: nowrap;
}
</style>
