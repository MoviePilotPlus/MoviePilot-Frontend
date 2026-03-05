<script setup lang="ts">
import api from '@/api'
import NoDataFound from '@/components/NoDataFound.vue'
import noImage from '@images/no-image.jpeg'
import type { TencentEpisodeInfo, TencentVideoDetailInfo } from './types'
import { useI18n } from 'vue-i18n'
import router from '@/router'

const { t } = useI18n()

const props = defineProps({
  cid: {
    type: String,
    default: '',
  },
  title: {
    type: String,
    default: '',
  },
  year: {
    type: String,
    default: '',
  },
})

const loading = ref(true)
const isRefreshed = ref(false)
const detail = ref<TencentVideoDetailInfo | null>(null)
const selectedEpisodeVid = ref<string>('')
const errorMessage = ref('')

const episodes = computed(() => detail.value?.episode_list || [])
const selectedEpisode = computed(() => {
  if (!selectedEpisodeVid.value) return null
  return episodes.value.find(item => item.vid === selectedEpisodeVid.value) || null
})
const posterUrl = computed(() => detail.value?.new_pic_vt || detail.value?.new_pic_hz || noImage)
const displayTitle = computed(() => detail.value?.title || props.title || '-')
const displayYear = computed(() => detail.value?.year || props.year || '-')

async function loadDetail() {
  if (!props.cid) {
    loading.value = false
    isRefreshed.value = true
    errorMessage.value = t('collect.detail.invalidCid')
    return
  }
  loading.value = true
  errorMessage.value = ''
  try {
    const data = (await api.get('mgtv/detail', {
      params: { cid: props.cid },
    })) as TencentVideoDetailInfo
    detail.value = data
    const firstPlayable = (data?.episode_list || []).find((item: TencentEpisodeInfo) => item.vid && item.cid)
    selectedEpisodeVid.value = firstPlayable?.vid || ''
  } catch (error) {
    console.error(error)
    errorMessage.value = t('collect.detail.loadFailed')
  } finally {
    loading.value = false
    isRefreshed.value = true
  }
}

function openSeriesPage() {
  if (!props.cid) return
  window.open(`https://www.mgtv.com/b/${props.cid}/0.html`, '_blank')
}

function openEpisode(episode: TencentEpisodeInfo | null) {
  if (!episode) return
  if (episode.web_play_url) {
    window.open(episode.web_play_url, '_blank')
    return
  }
  if (episode.cid && episode.vid) {
    window.open(`https://www.mgtv.com/b/${episode.cid}/${episode.vid}.html`, '_blank')
  }
}

function backToCollect() {
  router.push('/collect')
}

watch(
  () => props.cid,
  () => loadDetail(),
  { immediate: true },
)
</script>

<template>
  <LoadingBanner v-if="loading" class="mt-12" />
  <div v-else-if="detail" class="px-3">
    <VCard class="mb-4" variant="flat">
      <VRow>
        <VCol cols="12" md="3">
          <VImg :src="posterUrl" aspect-ratio="2/3" cover class="rounded-md" />
        </VCol>
        <VCol cols="12" md="9">
          <div class="d-flex align-center mb-2">
            <h2 class="text-h5 font-weight-bold mr-3">{{ displayTitle }}</h2>
            <VChip color="primary" variant="tonal" size="small">{{ displayYear }}</VChip>
          </div>
          <p class="text-body-2 text-medium-emphasis mb-3">
            {{ detail.sub_title || '-' }}
          </p>
          <p class="text-body-2 mb-4">
            {{ detail.overview || '-' }}
          </p>
          <div class="d-flex flex-wrap ga-2">
            <VBtn color="primary" prepend-icon="mdi-play-circle-outline" @click="openEpisode(selectedEpisode)">
              {{ t('collect.detail.playSelectedEpisode') }}
            </VBtn>
            <VBtn variant="outlined" prepend-icon="mdi-open-in-new" @click="openSeriesPage">
              {{ t('collect.detail.openMgtvPage') }}
            </VBtn>
            <VBtn variant="text" prepend-icon="mdi-arrow-left" @click="backToCollect">
              {{ t('collect.detail.backToCollect') }}
            </VBtn>
          </div>
        </VCol>
      </VRow>
    </VCard>

    <VCard>
      <VCardTitle>{{ t('collect.detail.episodes') }}</VCardTitle>
      <VCardText>
        <VChipGroup v-model="selectedEpisodeVid" column mandatory>
          <VChip
            v-for="item in episodes"
            :key="`${item.vid || item.title}`"
            :value="item.vid || ''"
            size="small"
            @dblclick="openEpisode(item)"
          >
            {{ item.play_title || item.full_play_sub_title || item.title || item.episode || '-' }}
          </VChip>
        </VChipGroup>
      </VCardText>
    </VCard>
  </div>

  <NoDataFound
    v-else-if="isRefreshed"
    error-code="404"
    :error-title="t('collect.noDataTitle')"
    :error-description="errorMessage || t('collect.noDataDescription')"
  />
</template>
