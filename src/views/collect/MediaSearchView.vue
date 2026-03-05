<script lang="ts" setup>
// @ts-nocheck
import { ref, defineProps, watch } from 'vue'
import api from '@/api'
import { VideoInfo } from '@/api/types'
import { default as VideoCard } from '@/components/cards/VideoCard.vue'
import { default as NoDataFound } from '@/components/NoDataFound.vue'

// 输入参数
const props = defineProps({
  apipath: String,
  keyword: String,
  cate: String,
  gridClass: String,
})

// 当前页码
const page = ref(0)

// 是否加载中
const loading = ref(false)

// 是否加载完成
const isRefreshed = ref(false)

// 数据列表
const dataList = ref<VideoInfo[]>([])
const currData = ref<VideoInfo[]>([])

// 拼装参数
function getParams() {
  let params = {
    keyword: props?.keyword,
  }
  return params
}

// 获取列表数据
async function fetchData() {
  try {
    if (!props.apipath) return

    // 如果正在加载中，直接返回
    if (loading.value) {
      return
    }
    // 设置加载中
    loading.value = true
    // 请求API
    currData.value = await api.get(props.apipath, {
      params: getParams(),
    })
    // 取消加载中
    loading.value = false
    // 标计为已请求完成
    isRefreshed.value = true
    // 合并数据
    dataList.value = [...currData.value]
    // 页码+1
    page.value++
    // 返回加载成功
    // 取消加载中
    loading.value = false
  } catch (error) {
    console.error(error)
  }
}

watch(() => props.keyword, () => {
  fetchData()
})
onMounted(() => {
  fetchData()
})
</script>

<template>
  <div>
    <LoadingBanner v-if="!isRefreshed" class="mt-12" />
    <div v-if="dataList.length > 0" :class="['grid', 'gap-4', 'grid-media-card', props.gridClass, 'mx-3']" tabindex="0">
      <VideoCard v-for="data in dataList" :key="data.cid" :media="data" :cate="props.cate" />
    </div>
    <NoDataFound v-if="dataList.length === 0 && isRefreshed" error-code="404" error-title="没有数据"
      error-description="无法获取到媒体信息。" />
  </div>
</template>
