<script setup lang="ts">
// @ts-nocheck
import { defineProps, PropType, ref } from 'vue'
import { useToast } from 'vue-toastification'
import api from '@/api'
import { VideoInfo, Site } from '@/api/types'
import router, { registerAbortController } from '@/router'
import { doneNProgress, startNProgress } from '@/api/nprogress'
import noImage from '@images/no-image.jpeg'
import SiteSearchDialog from '../dialog/SiteSearchDialog.vue'
import { useUserStore, useGlobalSettingsStore } from '@/stores'

// 输入参数
const props = defineProps({
  media: Object as PropType<VideoInfo>,
  cate: String,
  width: String,
  height: String,
})

// 从 provide 中获取全局设置
// 全局设置
const globalSettingsStore = useGlobalSettingsStore()
const globalSettings = globalSettingsStore.globalSettings

// 创建Intersection Observer实例
const observer = ref<IntersectionObserver | null>(null)

// 用户 Store
const userStore = useUserStore()

// 提示框
const $toast = useToast()

// 图片加载状态
const isImageLoaded = ref(false)

// 图片加载失败
const imageLoadError = ref(false)

// TMDB识别标志
const tmdbFlag = ref(true)

// 本地存在状态
const isExists = ref(false)

// 本地忽略状态
const isIgnore = ref(false)

// 所有站点
const allSites = ref<Site[]>([])

// 选中的站点
const selectedSites = ref<number>(0)

// 绑定MediaCard元素
const videoCardRef = ref<HTMLElement | null>(null)

// 搜索菜单显示状态
const searchMenuShow = ref(false)

// 资源浏览弹窗
const resourceDialog = ref(false)

// 资源浏览弹窗关闭后的回调
function onSiteResourceDone() {
  resourceDialog.value = false
}
// 获得mediaid
function getMediaId() {
  if (props.media?.tmdb_id) return `tmdb:${props.media?.tmdb_id}`
  else if (props.media?.douban_id) return `douban:${props.media?.douban_id}`
  else if (props.media?.bangumi_id) return `bangumi:${props.media?.bangumi_id}`
  else return `${props.media?.source}:${props.media?.cid}`
}

function getSelectedSite() {
  const selected_list = allSites.value.filter(item => selectedSites.value === item.id)
  if (selected_list.length > 0) return selected_list[0]
}

const topBadgeText = computed(() => {
  return props.media?.pay_type
})

const isLandscapeCover = computed(() => {
  const source = String(props.media?.source || '').toLowerCase()
  // 芒果TV只有综艺分类使用横版封面，其他分类使用竖版
  if (source.includes('mgtv')) {
    return props.cate === 'Show'
  }
  // 优酷全部使用横版封面
  return source.includes('youku')
})

const coverWrapClasses = computed(() => ({
  'video-cover-wrap': true,
  'video-cover-wrap--landscape': isLandscapeCover.value,
  'video-cover-wrap--portrait': !isLandscapeCover.value,
  'video-cover-wrap--loading': !isImageLoaded.value,
  'video-cover-wrap--loaded': isImageLoaded.value,
}))

function handleImageLoad() {
  isImageLoaded.value = true
}

function handleImageError() {
  if (imageLoadError.value) {
    // 回退图仍失败时，避免骨架层持续闪烁。
    isImageLoaded.value = true
    return
  }
  imageLoadError.value = true
}
// 打开详情页
function goMediaDetail() {
  // 将路由对象解析为完整 URL 后在新页面打开
  const route = router.resolve({
    path: '/video',
    query: {
      source: props.media?.source,
      mediaid: props.media?.cid,
      title: props.media?.title,
      year: props.media?.year,
      type: props.media?.type,
      cate: props.cate,
    },
  })
  window.open(route.href, '_blank')
}
// 查询当前媒体是否已入库
async function handleCheckExists() {
  try {
    const abortController = new AbortController()
    registerAbortController(abortController)
    const { signal } = abortController
    const result: { [key: string]: any } = await api.get('task/exist_cid/' + props.media?.cid, {
      params: {},
      signal,
    })

    if (result.success) isExists.value = true
  } catch (error) {
    console.error(error)
  }
}

async function handleCheckIgnore() {
  try {
    const abortController = new AbortController()
    registerAbortController(abortController)
    const { signal } = abortController
    const result: { [key: string]: any } = await api.get(`collect/ignore/${props.media?.source}/${props.media?.cid}`, {
      params: {},
      signal,
    })

    if (result.success) isIgnore.value = true
  } catch (error) {
    console.error(error)
  }
}
// 懒加载检查
function handleCheckLazy() {
  console.log('handleCheckLazy', props.media?.cid)
  // if (props.media?.cid) {
  //   return
  // }
  handleCheckExists()
  handleCheckIgnore()
}
// 在元素进入视窗时触发懒加载函数
function setupIntersectionObserver() {
  if (videoCardRef.value) {
    observer.value = new IntersectionObserver(
      entries => {
        entries.forEach(entry => {
          if (entry.isIntersecting) {
            // 只要 VideoCard 进入视窗，就调用懒加载的操作
            handleCheckLazy()
            // 加载后销毁观察者实例
            observer.value?.disconnect()
            observer.value = null
          }
        })
      },
      { threshold: 0.1 },
    )
    observer.value.observe(videoCardRef.value)
  }
}
onMounted(() => {
  setupIntersectionObserver()
})

onBeforeUnmount(() => {
  observer.value?.disconnect()
  observer.value = null
})

// 计算图片地址
const getImgUrl: Ref<string> = computed(() => {
  if (imageLoadError.value) return noImage
  const url = props.media?.new_pic_vt ?? noImage
  // 使用图片缓存
  if (globalSettings.GLOBAL_IMAGE_CACHE)
    return `${import.meta.env.VITE_API_BASE_URL}system/cache/image?url=${encodeURIComponent(url)}`
  // 如果地址中包含douban则使用中转代理
  if (url.includes('doubanio.com'))
    return `${import.meta.env.VITE_API_BASE_URL}system/img/0?imgurl=${encodeURIComponent(url)}`
  return url
})

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
// 查询所有站点
async function querySites() {
  try {
    const data: Site[] = await api.get('site/')
    // 过滤站点，只有启用的站点才显示
    allSites.value = data.filter(item => item.is_active)
    if (allSites.value.length > 0) {
      selectedSites.value = allSites.value[0].id
    }
  } catch (error) {
    console.log(error)
  }
}
// 点击搜索
async function clickSearch() {
  if (allSites.value?.length > 0) return
  querySites()
}
// 开始搜索
function handleSearch() {
  // TODO 显示搜索弹框
  resourceDialog.value = true
}
// 调用API取消订阅
async function removeIgnore() {
  // 开始处理
  startNProgress()
  try {
    const result: { [key: string]: any } = await api.delete(`collect/ignore/${props.media?.source}/${props.media?.cid}`)

    if (result.success) {
      isIgnore.value = false
      $toast.success(`${props.media?.title} 已取消忽略！`)
    } else {
      $toast.error(`${props.media?.title} 取消忽略失败：${result.message}！`)
    }
  } catch (error) {
    console.error(error)
  } finally {
    doneNProgress()
  }
}
// 添加订阅处理
async function addIgnore() {
  // 开始处理
  startNProgress()
  try {
    const result: { [key: string]: any } = await api.post(`collect/ignore/${props.media?.source}/${props.media?.cid}`)

    if (result.success) {
      isIgnore.value = true
      $toast.success(`${props.media?.title} 已忽略！`)
    } else {
      $toast.error(`${props.media?.title} 忽略失败：${result.message}！`)
    }
  } catch (error) {
    console.error(error)
  } finally {
    doneNProgress()
  }
}

// 爱心订阅按钮响应
function handleIgnore() {
  if (isIgnore.value) removeIgnore()
  else addIgnore()
}
</script>

<template>
  <VHover>
    <template #default="hover">
      <div ref="videoCardRef" class="video-card-shell">
        <VCard
          v-bind="hover.props"
          :height="props.height"
          :width="props.width"
          class="video-card d-flex flex-column"
          :class="{ 'video-card-hover': hover.isHovering }"
          @click.stop="goMediaDetail"
        >
          <div :class="coverWrapClasses">
            <img
              :src="getImgUrl"
              class="video-cover-image"
              loading="lazy"
              @load="handleImageLoad"
              @error="handleImageError"
            />
            <VChip
              v-show="topBadgeText"
              variant="elevated"
              size="x-small"
              class="absolute left-2 top-2 bg-red-600 text-white font-bold"
            >
              {{ topBadgeText }}
            </VChip>
            <VChip
              v-if="isImageLoaded && props.media?.rating"
              variant="elevated"
              size="x-small"
              class="absolute right-2 bottom-2 bg-blue-grey-darken-3 text-white font-bold"
            >
              {{ props.media?.rating }}
            </VChip>
            <ExistIcon v-if="isExists" />
            <IgnoreIcon v-if="!isExists && isIgnore" />
          </div>

          <VCardText class="video-content py-2">
            <div class="video-title text-subtitle-1 font-weight-bold line-clamp-1" :title="props.media?.title">
              {{ props.media?.title || '未知标题' }}
            </div>
            <div class="video-meta-row">
              <div class="text-caption text-medium-emphasis video-meta">
                {{ props.media?.year || '-' }}<span v-if="props.media?.type"> · {{ props.media?.type }}</span>
              </div>
              <VCardActions
                class="video-actions-inline"
                :class="{ 'video-actions-inline--visible': hover.isHovering }"
                @click.stop
              >
                <VMenu close-on-content-click v-model="searchMenuShow" max-width="450">
                  <template v-slot:activator="{ props }">
                    <IconBtn
                      v-bind="props"
                      icon="mdi-magnify"
                      variant="text"
                      size="small"
                      class="collect-action-btn"
                      title="搜索站点"
                      @click.stop="clickSearch"
                    />
                  </template>
                  <VList>
                    <VListItem>
                      <VChipGroup v-model="selectedSites" column @click.stop>
                        <VChip
                          v-for="site in allSites"
                          :key="site.id"
                          :color="selectedSites === site.id ? 'primary' : ''"
                          filter
                          variant="outlined"
                          :value="site.id"
                          size="small"
                        >
                          {{ site.name }}
                        </VChip>
                      </VChipGroup>
                    </VListItem>
                    <VListItem>
                      <VBtn @click="handleSearch" block>搜索</VBtn>
                    </VListItem>
                  </VList>
                </VMenu>
                <IconBtn
                  :icon="isIgnore ? 'mdi-eye-off' : 'mdi-eye'"
                  variant="text"
                  size="small"
                  class="collect-action-btn"
                  :class="{ 'collect-action-btn--active': isIgnore }"
                  :title="isIgnore ? '取消忽略' : '忽略'"
                  @click.stop="handleIgnore"
                />
              </VCardActions>
            </div>
          </VCardText>
        </VCard>
        <!-- 站点资源弹窗 -->
        <SiteSearchDialog
          v-if="resourceDialog"
          v-model="resourceDialog"
          :site="getSelectedSite()"
          :keyword="props.media?.title || props.media?.cn_title || props.media?.name"
          @close="onSiteResourceDone"
        />
      </div>
    </template>
  </VHover>
</template>
<style scoped>
.video-card-shell {
  position: relative;
  overflow: visible;
}

.video-card {
  position: relative;
  overflow: hidden;
  border: 1px solid rgba(var(--v-theme-on-surface), 0.08);
  border-radius: 12px;
  background: rgb(var(--v-theme-surface));
  transform: translate3d(0, 0, 0) scale(1);
  transform-origin: center center;
  transition:
    transform 0.24s cubic-bezier(0.22, 1, 0.36, 1),
    box-shadow 0.24s ease;
  will-change: transform, box-shadow;
}

.video-card-hover {
  z-index: 8;
  box-shadow: 0 18px 34px rgba(0, 0, 0, 18%);
  transform: translate3d(0, -8px, 0) scale(1.035);
}

.video-cover-wrap {
  position: relative;
  overflow: hidden;
  border-radius: 12px 12px 0 0;
  aspect-ratio: 3 / 4;
  background: rgba(var(--v-theme-on-surface), 0.04);
}

.video-cover-wrap--portrait {
  aspect-ratio: 3 / 4;
}

.video-cover-wrap--landscape {
  aspect-ratio: 16 / 9;
}

.video-cover-wrap::before {
  position: absolute;
  background: linear-gradient(
    105deg,
    rgba(var(--v-theme-on-surface), 0.04) 25%,
    rgba(var(--v-theme-on-surface), 0.1) 38%,
    rgba(var(--v-theme-on-surface), 0.04) 55%
  );
  background-size: 200% 100%;
  content: '';
  inset: 0;
  opacity: 0;
  pointer-events: none;
}

.video-cover-wrap--loading::before {
  animation: video-cover-shimmer 1.2s linear infinite;
  opacity: 1;
}

.video-cover-image {
  display: block;
  block-size: 100%;
  inline-size: 100%;
  object-fit: cover;
  opacity: 0;
  transition: opacity 0.22s ease;
}

.video-cover-wrap--loaded .video-cover-image {
  opacity: 1;
}

@keyframes video-cover-shimmer {
  from {
    background-position: 200% 0;
  }

  to {
    background-position: -200% 0;
  }
}

.video-content {
  display: flex;
  flex-direction: column;
  border-radius: 0 0 12px 12px;
  background: rgba(var(--v-theme-surface), 0.94);
  gap: 4px;
  min-block-size: 66px;
  padding-inline: 12px;
}

.video-title {
  display: -webkit-box;
  overflow: hidden;
  -webkit-box-orient: vertical;
  -webkit-line-clamp: 1;
  line-height: 1.34;
  min-block-size: calc(1em * 1.34);
}

.video-meta {
  overflow: hidden;
  min-inline-size: 0;
  text-overflow: ellipsis;
  transition:
    opacity 0.2s ease,
    transform 0.24s ease;
  white-space: nowrap;
}

.video-meta-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 8px;
  margin-block-start: 2px;
}

.video-actions-inline {
  overflow: hidden;
  flex-shrink: 0;
  align-items: center;
  justify-content: space-between;
  padding: 0;
  margin: 0;
  gap: 2px;
  max-inline-size: 0;
  min-block-size: 0;
  opacity: 0;
  pointer-events: none;
  transform: translateX(6px);
  transition:
    max-inline-size 0.24s ease,
    opacity 0.2s ease,
    transform 0.24s ease;
}

.video-actions-inline--visible {
  max-inline-size: 92px;
  opacity: 1;
  pointer-events: auto;
  transform: translateX(0);
}

.video-actions-inline :deep(.v-btn) {
  letter-spacing: 0;
  min-inline-size: auto;
  opacity: 0;
  text-transform: none;
  transform: translateY(4px) scale(0.98);
  transition:
    opacity 0.2s ease,
    transform 0.22s ease,
    background-color 0.2s ease;
}

.video-actions-inline--visible :deep(.v-btn) {
  opacity: 1;
  transform: translateY(0) scale(1);
}

.video-actions-inline--visible :deep(.collect-action-btn:nth-of-type(2)) {
  transition-delay: 0.03s;
}

@media (hover: hover) and (width >= 768px) {
  .video-meta-row {
    position: relative;
    display: block;
    min-block-size: 24px;
  }

  .video-actions-inline {
    position: absolute;
    z-index: 3;
    overflow: hidden;
    justify-content: space-between;
    padding: 0;
    border-radius: 0;
    background: transparent;
    block-size: 24px;
    inline-size: calc(100% + 24px);
    inset-block-start: 0;
    inset-inline: -12px;
    max-inline-size: none;
    min-block-size: 24px;
    opacity: 0;
    pointer-events: none;
    transform: translateY(6px);
    transition:
      opacity 0.2s ease,
      transform 0.24s ease;
  }

  .video-actions-inline--visible {
    inline-size: calc(100% + 24px);
    max-inline-size: none;
    opacity: 1;
    pointer-events: auto;
    transform: translateY(0);
  }

  .video-card-hover .video-meta {
    opacity: 0;
    transform: translateY(-2px);
  }

  .video-actions-inline :deep(.v-btn) {
    padding: 0;
    block-size: 24px;
    inline-size: 24px;
    min-block-size: 24px;
    min-inline-size: 24px;
  }

  .video-actions-inline :deep(.collect-action-btn:first-child) {
    margin-inline-start: 12px;
  }

  .video-actions-inline :deep(.collect-action-btn:last-child) {
    margin-inline-end: 12px;
  }
}

.video-actions-inline :deep(.collect-action-btn) {
  border-radius: 10px;
  color: rgba(var(--v-theme-on-surface), 0.62);
  opacity: 0.82;
  transition: all 0.2s ease;
}

.video-actions-inline :deep(.collect-action-btn:hover) {
  background: rgba(var(--v-theme-primary), 0.08);
  opacity: 1;
}

.video-actions-inline :deep(.collect-action-btn--active) {
  background: rgba(var(--v-theme-warning), 0.16);
  color: rgb(var(--v-theme-warning));
  opacity: 1;
}

@media (hover: none) {
  .video-actions-inline {
    max-inline-size: 92px;
    opacity: 1;
    pointer-events: auto;
    transform: none;
  }

  .video-actions-inline :deep(.v-btn) {
    opacity: 1;
    transform: none;
  }
}
</style>
