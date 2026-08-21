<script setup lang="ts">
// @ts-nocheck
import { defineProps, PropType, ref } from 'vue'
import { useToast } from 'vue-toastification'
import { formatRating } from '@/@core/utils/formatters'
import router from '@/router'
import noImage from '@images/no-image.jpeg'
import tmdbImage from '@images/logos/tmdb.png'
import doubanImage from '@images/logos/douban-black.png'
import bangumiImage from '@images/logos/bangumi.png'
import { useUserStore, useGlobalSettingsStore } from '@/stores'

type VideoEpisode = any

// 输入参数
const props = defineProps({
  episode: {
    type: Object as PropType<VideoEpisode>,
    required: true,
  },
  width: String,
  height: String,
})

// 从 provide 中获取全局设置
// 全局设置
const globalSettingsStore = useGlobalSettingsStore()
const globalSettings = globalSettingsStore.globalSettings

// 用户 Store
const userStore = useUserStore()

// 提示框
const $toast = useToast()

// 图片加载状态
const isImageLoaded = ref(false)

// 图片加载失败
const imageLoadError = ref(false)

const isSelected = ref(false)

// TMDB识别标志
const tmdbFlag = ref(true)

// 本地存在状态
const isExists = ref(false)

// 来源角标字典
const sourceIconDict: { [key: string]: any } = {
  themoviedb: tmdbImage,
  douban: doubanImage,
  bangumi: bangumiImage,
}

// 绑定MediaCard元素
const videoCardRef = ref<HTMLElement | null>(null)

// 搜索菜单显示状态
const searchMenuShow = ref(false)

// 角标颜色
function getChipColor(type: string) {
  if (type === '电影') return 'border-blue-500 bg-blue-600'
  else if (type === '电视剧') return ' bg-indigo-500 border-indigo-600'
  else return 'border-purple-600 bg-purple-600'
}

function selectEsipode() {
  if (!props.episode) return
  props.episode.selected = !props.episode?.selected
}

onMounted(() => {})

onBeforeUnmount(() => {})

// 计算图片地址
const getImgUrl: Ref<string> = computed(() => {
  if (imageLoadError.value) return noImage
  const url = props.episode?.image_url ?? noImage
  // 使用图片缓存
  if (globalSettings.GLOBAL_IMAGE_CACHE)
    return `${import.meta.env.VITE_API_BASE_URL}system/cache/image?url=${encodeURIComponent(url)}`
  // 如果地址中包含douban则使用中转代理
  if (url.includes('doubanio.com'))
    return `${import.meta.env.VITE_API_BASE_URL}system/img/0?imgurl=${encodeURIComponent(url)}`
  return url
})
// 设置集数
function setEpisode(episode: string) {
  if (!props.episode) return
  props.episode.episode = parseInt(episode)
}
// 将yyyy-mm-dd转换为yyyy年mm月dd日
function formatAirDate(airDate: string) {
  if (!airDate) return ''
  const date = new Date(airDate.replaceAll(/-/g, '/'))
  return `${date.getFullYear()}年${date.getMonth() + 1}月${date.getDate()}日`
}

// 从yyyy-mm-dd中提取年份
function getYear(airDate: string) {
  if (!airDate) return ''
  const date = new Date(airDate.replaceAll(/-/g, '/'))
  return date.getFullYear()
}
</script>

<template>
  <VHover>
    <template #default="hover">
      <div ref="videoCardRef">
        <VCard
          v-bind="hover.props"
          :height="props.height"
          :width="props.width"
          class="outline-none shadow ring-gray-500 rounded-lg"
          :class="{
            'transition transform-cpu duration-300 scale-105 shadow-lg': hover.isHovering,
            'ring-1': isImageLoaded,
          }"
          @click.stop="selectEsipode"
        >
          <VImg
            :src="getImgUrl"
            class="align-end brightness-50"
            cover
            @load="isImageLoaded = true"
            @error="imageLoadError = true"
          >
          </VImg>

          <!-- <VCardTitle class="text-white -mt-20 z-50" v-text="props.episode?.play_title || props.episode?.title || ''"></VCardTitle> -->
          <VCardTitle class="text-white absolute left-0 bottom-0 bg-opacity-90 shadow-md w-100">
            {{ props.episode?.play_title || props.episode?.title || '' }}
            <VTooltip activator="parent" location="bottom">
              {{ props.episode?.play_title || props.episode?.title || '' }}
              {{ props.episode?.full_play_sub_title || props.episode?.full_play_sub_title || '' }}
            </VTooltip>
          </VCardTitle>
          <VChip
            v-if="props.episode?.pay_type_name"
            variant="elevated"
            size="small"
            class="border-red-500 bg-red-600 absolute left-2 top-2 bg-opacity-90 shadow-md text-white font-bold"
          >
            {{ props.episode?.pay_type_name }}
          </VChip>
          <!-- <VChip
            v-if="props.episode?.pay_type === '7' || props.episode?.pay_type === '6' || props.episode?.pay_type === '0'"
            variant="elevated" size="small"
            class="border-red-500 bg-red-600 absolute left-2 top-2 bg-opacity-90 shadow-md text-white font-bold">
            {{ props.episode?.pay_type === '7' ? '付费' : (props.episode?.pay_type === '0' ? '正片' : 'VIP') }}
          </VChip> -->
          <!--来源图标-->
          <VIcon v-if="props.episode?.selected" icon="mdi-check" color="success" class="absolute top-1 right-1" />
          <v-text-field
            label="集"
            :model-value="episode.episode"
            variant="outlined"
            bg-color="white"
            color="white"
            base-color="white"
            text-color="white"
            :width="60"
            :height="30"
            class="absolute left-1/2 top-1/2 transform -translate-x-1/2 -translate-y-1/2"
            @keydown.enter="setEpisode($event.target.value)"
            @blur="setEpisode($event.target.value)"
            @click.stop
          ></v-text-field>
        </VCard>
      </div>
    </template>
  </VHover>
</template>

<style scoped>
/* 现有输入框样式保持不变 */
::v-deep .v-field__input {
  color: white !important;
  font-weight: bold !important;
  text-align: center !important;
}

/* 新增label居中样式 */
::v-deep .v-label {
  /* label文本居中 */
  inline-size: 100% !important;
  text-align: center !important;

  /* 强制label容器宽度占满，确保居中生效 */
}
</style>
