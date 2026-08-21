<script setup lang="ts">
// @ts-nocheck
import CollectDetailView from '@/views/collect/CollectDetailView.vue'

// 路由参数
const route = useRoute()


const id = route.query?.id?.toString()

</script>

<template>
  <div>
    <CollectDetailView :id="id" />
  </div>
</template>
