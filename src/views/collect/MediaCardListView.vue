<script lang="ts" setup>
// @ts-nocheck
import { ref, defineProps, PropType } from 'vue'
import { pluginApi } from '@/api'
import { VideoInfo } from '@/api/types'
import { default as VideoCard } from '@/components/cards/VideoCard.vue'
import { default as NoDataFound } from '@/components/states/NoDataFound.vue'

// 输入参数
const props = defineProps({
  apipath: String,
  params: Object as PropType<{ [key: string]: any }>,
  cate: String,
  firstPage: Number,
  gridClass: String,
})

// 判断是否有滚动条
function hasScroll() {
  return document.body.scrollHeight - (window.innerHeight || document.documentElement.clientHeight) > 2
}

// 当前页码
const page = ref(props.firstPage || 0)

// 是否加载中
const loading = ref(false)

// 是否加载完成
const isRefreshed = ref(false)
// 是否还有更多数据
const hasMore = ref(true)

// 数据列表
const dataList = ref<VideoInfo[]>([])
const currData = ref<VideoInfo[]>([])
const session = ref('')

function normalizeSession(value: any): string {
  if (value === null || value === undefined) return ''
  if (typeof value === 'string') return value
  try {
    return JSON.stringify(value)
  } catch {
    return String(value)
  }
}

function mediaKey(item: any): string {
  return `${item?.source || ''}:${item?.cid || ''}:${item?.vid || ''}`
}

function appendUniqueItems(items: VideoInfo[]): number {
  const existed = new Set(dataList.value.map(item => mediaKey(item)))
  const uniqueItems = items.filter(item => {
    const key = mediaKey(item)
    if (existed.has(key)) return false
    existed.add(key)
    return true
  })
  if (uniqueItems.length > 0) dataList.value = [...dataList.value, ...uniqueItems]
  return uniqueItems.length
}
// 拼装参数
function getParams() {
  let params = {
    page: page.value,
    session: session.value,
  }
  console.log('page.value', page.value)
  if (props.params) params = { ...params, ...props.params }
  return params
}

async function loadOnce() {
  try {
    if (!props.apipath) return 'error'
    loading.value = true
    const result: { [key: string]: any } = await pluginApi.get(props.apipath, {
      params: getParams(),
    })
    currData.value = Array.isArray(result?.data) ? result.data : []
    session.value = normalizeSession(result?.message)
    isRefreshed.value = true
    if (currData.value.length === 0) {
      hasMore.value = false
      return 'empty'
    }
    const appended = appendUniqueItems(currData.value)
    if (appended === 0) {
      hasMore.value = false
      return 'empty'
    }
    page.value++
    return 'ok'
  } catch (error) {
    console.error(error)
    return 'error'
  } finally {
    loading.value = false
  }
}

// 获取列表数据
async function fetchData({ done }: { done: any }) {
  try {
    if (!props.apipath) {
      done('error')
      return
    }

    // 如果正在加载中，直接返回
    if (loading.value) {
      done('ok')
      return
    }

    if (!hasMore.value) {
      done('empty')
      return
    }

    // 首屏未撑满时，连续加载直到撑满或无更多数据
    if (!hasScroll()) {
      while (!hasScroll() && hasMore.value) {
        const status = await loadOnce()
        if (status !== 'ok') {
          done(status)
          return
        }
      }
      done(hasMore.value ? 'ok' : 'empty')
      return
    }

    const status = await loadOnce()
    done(status)
  } catch (error) {
    console.error(error)
    done('error')
  }
}
</script>

<template>
  <div>
    <LoadingBanner v-if="!isRefreshed" class="mt-12" />
    <VInfiniteScroll mode="intersect" side="end" :items="dataList" class="overflow-visible" @load="fetchData">
      <template #loading />
      <template #empty />
      <div
        v-if="dataList.length > 0"
        :class="['grid', 'gap-4', 'grid-media-card', props.gridClass, 'mx-3']"
        tabindex="0"
      >
        <VideoCard v-for="data in dataList" :key="data.cid" :media="data" :cate="props.cate" />
      </div>
      <NoDataFound
        v-if="dataList.length === 0 && isRefreshed"
        error-code="404"
        error-title="没有数据"
        error-description="无法获取到媒体信息。"
      />
    </VInfiniteScroll>
  </div>
</template>
