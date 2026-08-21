<script setup lang="ts">
import api from '@/api'
import NoDataFound from '@/components/states/NoDataFound.vue'
import noImage from '@images/no-image.jpeg'
import type { PropType } from 'vue'
import type { TencentMediaInfo } from './types'
import { useI18n } from 'vue-i18n'
import router from '@/router'

const { t } = useI18n()

const props = defineProps({
  source: {
    type: String,
    default: 'tencent',
  },
  endpoint: {
    type: String,
    required: true,
  },
  params: {
    type: Object as PropType<Record<string, string | number | null | undefined>>,
    default: () => ({}),
  },
  mode: {
    type: String as PropType<'list' | 'search'>,
    default: 'list',
  },
})

const page = ref(1)
const loading = ref(false)
const isRefreshed = ref(false)
const hasMore = ref(true)
const dataList = ref<TencentMediaInfo[]>([])
const seenKeys = ref<Set<string>>(new Set<string>())

function hasScroll() {
  return document.body.scrollHeight - (window.innerHeight || document.documentElement.clientHeight) > 2
}

function getImageUrl(media: TencentMediaInfo) {
  return media.new_pic_vt || media.new_pic_hz || noImage
}

function getDetailUrl(media: TencentMediaInfo) {
  if (media.cid && media.vid) return `https://v.qq.com/x/cover/${media.cid}/${media.vid}.html`
  if (media.cid) return `https://v.qq.com/x/cover/${media.cid}.html`
  return ''
}

function openDetail(media: TencentMediaInfo) {
  if (media.cid) {
    router.push({
      path: '/collect/video',
      query: {
        source: props.source,
        cid: media.cid,
        title: media.title || '',
        year: media.year || '',
      },
    })
    return
  }
  const url = getDetailUrl(media)
  if (url) window.open(url, '_blank')
}

function getParams() {
  const params: Record<string, string | number | null | undefined> = {
    ...props.params,
  }
  if (props.mode === 'list') {
    params.page = page.value
  }
  return params
}

function normalizeResponse(payload: any): TencentMediaInfo[] {
  if (props.mode === 'search') {
    return Array.isArray(payload) ? payload : []
  }
  if (Array.isArray(payload?.data)) {
    return payload.data
  }
  return []
}

function deduplicate(items: TencentMediaInfo[]) {
  return items.filter(item => {
    const key = `${item.cid || ''}~${item.vid || ''}~${item.title || ''}`
    if (seenKeys.value.has(key)) return false
    seenKeys.value.add(key)
    return true
  })
}

async function loadOnce() {
  loading.value = true
  try {
    const payload = await api.get(props.endpoint, { params: getParams() })
    isRefreshed.value = true
    const items = deduplicate(normalizeResponse(payload))
    if (items.length === 0) {
      hasMore.value = false
      return 'empty'
    }
    dataList.value.push(...items)
    if (props.mode === 'list') {
      page.value++
      return 'ok'
    }
    hasMore.value = false
    return 'empty'
  } catch (error) {
    isRefreshed.value = true
    console.error(error)
    return 'error'
  } finally {
    loading.value = false
  }
}

async function fetchData({ done }: { done: any }) {
  if (!props.endpoint) {
    done('error')
    return
  }
  if (loading.value) {
    done('ok')
    return
  }
  if (!hasMore.value) {
    done('empty')
    return
  }

  // In list mode, keep loading until the first screen is filled.
  if (props.mode === 'list' && !hasScroll()) {
    while (!hasScroll() && hasMore.value) {
      const status = await loadOnce()
      if (status !== 'ok') {
        done(status)
        return
      }
    }
    done('ok')
    return
  }

  const status = await loadOnce()
  done(status)
}
</script>

<template>
  <LoadingBanner v-if="!isRefreshed" class="mt-12" />
  <VInfiniteScroll mode="intersect" side="end" :items="dataList" class="overflow-visible pt-3 px-2" @load="fetchData">
    <template #loading />
    <template #empty />
    <div v-if="dataList.length > 0" class="grid gap-4 grid-media-card" tabindex="0">
      <VCard
        v-for="item in dataList"
        :key="`${item.cid || item.title}-${item.vid || ''}`"
        class="tencent-card cursor-pointer"
        @click="openDetail(item)"
      >
        <VImg :src="getImageUrl(item)" aspect-ratio="2/3" cover>
          <template #placeholder>
            <div class="w-full h-full">
              <VSkeletonLoader class="object-cover aspect-w-2 aspect-h-3" />
            </div>
          </template>
        </VImg>
        <VCardText class="pa-3">
          <h3 class="font-semibold text-body-2 line-clamp-2">{{ item.title || '-' }}</h3>
          <p class="text-caption text-medium-emphasis mt-1">{{ item.year || '-' }}</p>
          <p v-if="item.sub_title" class="text-caption mt-1 line-clamp-2">{{ item.sub_title }}</p>
          <VChip v-if="item.episode_all" size="x-small" color="primary" variant="tonal" class="mt-2">
            {{ t('media.episodeCount', { count: item.episode_all }) }}
          </VChip>
        </VCardText>
      </VCard>
    </div>
    <NoDataFound
      v-if="dataList.length === 0 && isRefreshed"
      error-code="404"
      :error-title="t('collect.noDataTitle')"
      :error-description="t('collect.noDataDescription')"
    />
  </VInfiniteScroll>
</template>

<style scoped>
.tencent-card {
  overflow: hidden;
}
</style>
