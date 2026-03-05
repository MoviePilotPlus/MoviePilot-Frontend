<script setup lang="ts">
// @ts-nocheck

import api from '@/api'
import { CollectProgress, Collect } from '@/api/types'
const progress = ref<Array<CollectProgress>>([])
// 输入参数
const props = defineProps({
  id: Number,
  type: String,
  name: String
})
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
  getProgressInfo()
})
</script>
<template>
  <VDialog scrollable fullscreen :scrim="false" transition="dialog-bottom-transition">
    <VCard>
      <!-- Toolbar -->
      <div>
        <VToolbar color="primary">
          <VToolbarTitle>{{ `进度信息 - ${props.name}` }}</VToolbarTitle>
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
          <VTimeline align="start" side="end" line-inset="2">
            <VTimelineItem
              dot-color="pink"
              size="small"
              v-for="(item, index) in progress"
            >
              <div class="d-flex">
                
                <div>
                  <strong>{{item.name}}</strong>
                  <div class="text-caption">
                    {{item.created_at}}
                  </div>
                </div>
              </div>
            </VTimelineItem>
          </VTimeline>
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
