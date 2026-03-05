<script setup lang="ts">
// @ts-nocheck


import { Collect } from '@/api/types'
import BbcodeParser from '@/components/render/BbcodeParser.vue'

// 输入参数
const props = defineProps({
  collect: {
    type: Object as () => Collect,
    default: () => ({})
  }
})
// 注册事件
const emit = defineEmits(['close'])
// 装载时查询站点图标
onMounted(() => {
})
</script>
<template>
  <VDialog scrollable fullscreen :scrim="false" transition="dialog-bottom-transition">
    <VCard>
      <!-- Toolbar -->
      <div>
        <VToolbar color="primary">
          <VToolbarTitle>{{ `媒体信息 - ${props.collect?.name}` }}</VToolbarTitle>
          <VSpacer />
          <VToolbarItems>
            <VBtn icon variant="plain" @click="emit('close')" class="me-3">
              <VIcon size="large" color="white" icon="ri-close-line" />
            </VBtn>
          </VToolbarItems>
        </VToolbar>
      </div>
      <VCardText class="d-flex flex-row  justify-center ">
        <v-sheet
          class="d-flex align-center justify-center flex-wrap mx-auto px-4"
          elevation="0"
          width="1100"
          height="800"
          > 
            <BbcodeParser v-if="props.collect?.mediainfo" :content="props.collect.mediainfo" />
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
