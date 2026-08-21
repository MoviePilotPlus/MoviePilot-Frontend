<script setup lang="ts">
import { computed } from 'vue'
import { useRoute } from 'vue-router'
import VideoDetailView from '@/views/collect/VideoDetailView.vue'
import YspVideoDetailView from '@/views/collect/YspVideoDetailView.vue'

const route = useRoute()

const sourceMap: Record<string, string> = {
  tencent: 'Tencent',
  mgtv: 'MgTV',
  iqiyi: 'iQiyi',
  youku: 'YouKu',
  bilibili: 'Bilibili',
  ysp: 'YSP',
}

const source = computed(() => {
  const raw = route.query?.source?.toString() || ''
  if (!raw) return ''
  const lower = raw.toLowerCase()
  return sourceMap[lower] || raw
})

const isYspSource = computed(() => {
  const raw = route.query?.source?.toString() || ''
  return raw.toLowerCase() === 'ysp'
})

const mediaid = computed(() => route.query?.cid?.toString() || route.query?.mediaid?.toString() || '')
// 帧享 programId（列表/搜索写入 vid，详情用来直查 fireworks）
const vid = computed(() => route.query?.vid?.toString() || '')
const title = computed(() => route.query?.title?.toString() || '')
const year = computed(() => route.query?.year?.toString() || '')
const type = computed(() => route.query?.type?.toString() || 'TV')
const cate = computed(() => route.query?.cate?.toString() || type.value)

// 央视频专用参数
const cnlid = computed(() => route.query?.cnlid?.toString() || '')
const name = computed(() => route.query?.name?.toString() || '')
const livepid = computed(() => route.query?.livepid?.toString() || '')
const defn = computed(() => route.query?.defn?.toString() || '')
const programName = computed(() => route.query?.programName?.toString() || '')
const startTime = computed(() => route.query?.startTime?.toString() || '')
const endTime = computed(() => route.query?.endTime?.toString() || '')
</script>

<template>
  <div>
    <YspVideoDetailView
      v-if="isYspSource"
      :source="source"
      :mediaid="mediaid"
      :title="title"
      :cnlid="cnlid"
      :name="name"
      :livepid="livepid"
      :defn="defn"
      :programName="programName"
      :startTime="startTime"
      :endTime="endTime"
      :type="type"
      :cate="cate"
    />
    <VideoDetailView
      v-else
      :source="source"
      :mediaid="mediaid"
      :vid="vid"
      :title="title"
      :year="year"
      :type="type"
      :cate="cate"
      link_to="disabled"
    />
  </div>
</template>
