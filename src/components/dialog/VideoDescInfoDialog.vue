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
          <BbcodeParser v-if="collectDetail?.description" :content="collectDetail.description" />
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
