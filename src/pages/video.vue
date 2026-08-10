<script setup lang="ts">
// @ts-nocheck
import VideoDetailView from '@/views/collect/VideoDetailView.vue'

// 路由参数
const route = useRoute()

// TMDBID / 节目 cid
const mediaid = route.query?.mediaid?.toString()
// 帧享 programId（列表/搜索写入 vid，详情用来直查 fireworks）
const vid = route.query?.vid?.toString()

// 类型
const type = route.query?.type?.toString()

const cate = route.query?.cate?.toString()

// 标题
const title = route.query?.title?.toString()

// 年份
const year = route.query?.year?.toString()
// 来源
const source = route.query?.source?.toString()
</script>

<template>
  <div>
    <VideoDetailView :mediaid="mediaid" :vid="vid" :source="source" :type="type" :cate="cate" :title="title" :year="year" link_to="disabled"/>
  </div>
</template>
