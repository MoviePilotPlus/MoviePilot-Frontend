<script setup lang="ts">
// @ts-nocheck
import { useToast } from 'vue-toastification'
import api from '@/api'
import { doneNProgress, startNProgress } from '@/api/nprogress'
import type { Collect, SiteSeed, Site } from '@/api/types'
import { VCardTitle, VChip } from 'vuetify/lib/components/index.mjs'

// 输入参数
const props = defineProps({
  title: String,
  siteSeedList: Array as PropType<SiteSeed[]>,
  collect: Object as PropType<Collect>
})

// 定义成功和失败事件
const emit = defineEmits(['done', 'error', 'close'])

// 提示框
const $toast = useToast()
// 所有站点
const allSites = ref<Site[]>([])
// 选中的站点
const selectedSites = ref<number[]>([])
const autoPublish = ref(true)

// 是否正在加载
const loading = ref(false)
async function querySites() {
  try {
    const data: Site[] = await api.get('site/')
    allSites.value = data
    // 过滤站点，只有不在已添加列表中的才显示
    allSites.value = data.filter(item => {
      return !props.siteSeedList?.some(siteSeed =>
        siteSeed.site_id === item.id
      )
    })
  } catch (error) {
    console.log(error)
  }
}
// 添加下载
async function addDownload() {
  startNProgress()
  loading.value = true
  try {
    let result: { [key: string]: any }
    if (selectedSites.value.length === 0) {
      $toast.error('请选择站点')
      return
    }
    // 检查 props.collect 是否为 undefined 或 null，以及其 id 是否为 undefined
    if (props.collect === undefined || props.collect === null || props.collect.id === undefined) {
      $toast.error('请选择收集任务')
      return
    }
    result = await api.post('collect/addSiteSeed', {
      site_list: selectedSites.value,
      collect_id: props.collect.id,
      next_step: autoPublish.value
    })
    if (result && result.success) {
      // 添加做种任务成功！
      $toast.success('添加做种任务成功！')
      emit('done')
    } else {
      // 添加做种任务失败！
      $toast.error(`添加做种任务失败失败：${result?.message}！`)
      emit('error', result?.message)
    }
  } catch (error) {
    console.error(error)
  }
  loading.value = false
  doneNProgress()
}

onMounted(() => {
  querySites()

})
</script>
<template>
  <VDialog max-width="45rem" scrollable>
    <VCard>
      <VCardItem>
        <VCardTitle>添加做种任务</VCardTitle>
        <DialogCloseBtn @click="emit('close')" />
      </VCardItem>
      <VDivider />
      <VCardText v-if="allSites.length > 0">
        <v-chip-group v-model="selectedSites" column multiple>
          <v-chip v-for="site in allSites" :key="site.id" :value="site.id" :text="site.name" variant="outlined"
            filter></v-chip>
        </v-chip-group>
      </VCardText>
      <VCardText v-else class="text-center">
        没有需要发布的站点
      </VCardText>
      <VCardText v-if="allSites.length > 0" class="flex items-center justify-between">
        <span>自动发布</span>
        <VSwitch v-model="autoPublish" color="primary" />
      </VCardText>
      <VCardText class="text-center mt-4">
        <VBtn variant="elevated" :disabled="loading" @click="addDownload" prepend-icon="mdi-progress-upload"
          class="px-5" size="small">
          添加任务
        </VBtn>
      </VCardText>
    </VCard>
  </VDialog>
</template>
