<script setup lang="ts">
import VideoDetailView from '@/views/collect/VideoDetailView.vue'

const route = useRoute()

const sourceMap: Record<string, string> = {
  tencent: 'Tencent',
  mgtv: 'MgTV',
  iqiyi: 'iQiyi',
  youku: 'YouKu',
  bilibili: 'Bilibili',
}

const source = computed(() => {
  const raw = route.query?.source?.toString() || ''
  if (!raw) return ''
  const lower = raw.toLowerCase()
  return sourceMap[lower] || raw
})
const mediaid = computed(() => route.query?.cid?.toString() || route.query?.mediaid?.toString() || '')
const title = computed(() => route.query?.title?.toString() || '')
const year = computed(() => route.query?.year?.toString() || '')
const type = computed(() => route.query?.type?.toString() || 'TV')
const cate = computed(() => route.query?.cate?.toString() || type.value)
</script>

<template>
  <div>
    <VideoDetailView
      :source="source"
      :mediaid="mediaid"
      :title="title"
      :year="year"
      :type="type"
      :cate="cate"
      link_to="disabled"
    />
  </div>
</template>
