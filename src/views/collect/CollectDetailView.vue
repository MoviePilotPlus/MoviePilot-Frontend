<script setup lang="ts">
// @ts-nocheck
import { useToast } from 'vue-toastification'
import { collectStatus } from '@/api/constants'
import api from '@/api'
import { tagOptions, categoryOptions, mediaCateOptions } from '@/api/constants'
import type { Collect, CollectCreate, DownloadTask, SiteSeed, Site, PtgenInfo } from '@/api/types'
import NoDataFound from '@/components/states/NoDataFound.vue'
import GroupTile from '@/components/GroupTitle.vue'
import TaskCardSlideView from '@/views/collect/TaskCardSlideView.vue'
import { doneNProgress, startNProgress } from '@/api/nprogress'
import { seedStatus } from '@/api/constants'
import SiteSearchDialog from '@/components/dialog/SiteSearchDialog.vue'
import VideoMediaInfoDialog from '@/components/dialog/VideoMediaInfoDialog.vue'
import VideoDescInfoDialog from '@/components/dialog/VideoDescInfoDialog.vue'
import VideoScreenshotDialog from '@/components/dialog/VideoScreenshotDialog.vue'
import ProgressInfoDialog from '@/components/dialog/ProgressInfoDialog.vue'
import AddSiteSeedDialog from '@/components/dialog/AddSiteSeedDialog.vue'
import SiteSeedInfoDialog from '@/components/dialog/SiteSeedInfoDialog.vue'
import CollectOperationDialog from '@/components/dialog/CollectOperationDialog.vue'
import { useUserStore, useGlobalSettingsStore } from '@/stores'

// 输入参数
const collectProps = defineProps({
  id: String,
})

// 从 provide 中获取全局设置
// 全局设置
const globalSettingsStore = useGlobalSettingsStore()
const globalSettings = globalSettingsStore.globalSettings

// 用户 Store
const userStore = useUserStore()
// 资源浏览弹窗
const resourceDialog = ref(false)
// 所有站点
const allSites = ref<Site[]>([])
// 提示框
const $toast = useToast()

// 媒体详情
const collectDetail = ref<Collect>({} as Collect)

const taskList = ref<DownloadTask[]>([])
// 站点列表
const siteSeedList = ref<SiteSeed[]>([])
const seedInfo = ref<SiteSeed>({} as SiteSeed)
const showMediaInfo = ref(false)
const showDescInfo = ref(false)
const showScreenshotInfo = ref(false)
const showProgressInfo = ref(false)
const showSiteSeedInfo = ref(false)
const showAddSiteSedd = ref(false)
const showCollectOperation = ref(false)
const ptgen = ref<PtgenInfo>({} as PtgenInfo)
const isLoading = ref(false)
const showSaveIcons = ref({
  en_title: false,
  cn_title: false,
  overview: false,
  douban_id: false,
  imdb_id: false,
  tmdb_id: false,
  bangumi_id: false,
  season: false,
  year: false,
  sub_title: false,
  episodes_all: false,
})
const operationType = ref('')
// 本地是否存在，存在则包括Item信息
const existsItemId = ref('1')

// 是否已订阅
const isSubscribed = ref(false)

// 是否已加载完成
const isRefreshed = ref(false)

// 采集任务添加表单
const addForm = ref<CollectCreate>({
  cid: '',
  defn: '',
  douban_id: '',
  imdb_id: '',
  tmdb_id: '',
  bangumi_id: '',
  cn_title: '',
  en_title: '',
  sub_title: '',
  original_title: '',
  season: 1,
  year: '',
  overview: '',
  type: '',
  site: '',
  cate: '',
  cover: '',
  poster: '',
  episodes_all: 1,
  auto_download: true,
  auto_publish: true,
  anon_publish: true,
  source: 'WEB-DL',
  tags: [],
  episode_list: [],
  site_list: [],
})
// 选中的站点
const selectedSites = ref<number>(0)
// 资源浏览弹窗关闭后的回调
function onSiteResourceDone() {
  resourceDialog.value = false
}
function getSelectedSite() {
  const selected_list = allSites.value.filter(item => selectedSites.value === item.id)
  if (selected_list.length > 0) return selected_list[0]
}
// 打开豆瓣详情页
function openDoubanDetail(doubanId: string) {
  if (!doubanId) {
    $toast.warning('豆瓣ID不存在，无法打开详情页！')
    return
  }
  window.open(`https://movie.douban.com/subject/${doubanId}/`, '_blank')
}

function openImdbDetail(imdbId: string) {
  if (!imdbId) {
    $toast.warning('IMDB ID不存在，无法打开详情页！')
    return
  }
  window.open(`https://www.imdb.com/title/${imdbId}/`, '_blank')
}

function openTmdbDetail(tmdbId: string) {
  if (!tmdbId) {
    $toast.warning('TMDB ID不存在，无法打开详情页！')
    return
  }
  // 优先使用 PTGen 返回的 TMDB 链接（已区分电影/剧集），否则按当前分类拼接
  let link = ptgen.value.tmdb_link
  if (!link) {
    const tmdbType = collectDetail.value.cate === 'Movie' ? 'movie' : 'tv'
    link = `https://www.themoviedb.org/${tmdbType}/${tmdbId}`
  }
  window.open(link, '_blank')
}

function openBangumiDetail(bangumiId: string) {
  if (!bangumiId) {
    $toast.warning('Bangumi ID不存在，无法打开详情页！')
    return
  }
  window.open(`https://bangumi.tv/subject/${bangumiId}`, '_blank')
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
function getCollectStatus(status: string | undefined) {
  return collectStatus[status as keyof typeof collectStatus]
}
// 调用API查询详情
async function getDetail() {
  if (collectProps.id) {
    collectDetail.value = await api.get(`collect/${collectProps.id}`)
    taskList.value = await api.get(`collect/task/${collectProps.id}`)

    addForm.value.tags = JSON.parse(collectDetail.value?.tags) ?? []
    addForm.value.douban_id = collectDetail.value.douban_id ?? ''
    addForm.value.imdb_id = collectDetail.value.imdb_id ?? ''
    addForm.value.tmdb_id = collectDetail.value.tmdb_id ?? ''
    addForm.value.bangumi_id = collectDetail.value.bangumi_id ?? ''
    addForm.value.sub_title = collectDetail.value.sub_title ?? ''
    addForm.value.overview = collectDetail.value.overview ?? ''
    addForm.value.cn_title = collectDetail.value.cn_title ?? ''
    addForm.value.en_title = collectDetail.value.en_title ?? ''
    addForm.value.year = collectDetail.value.year ?? ''
    addForm.value.season = collectDetail.value.season ?? 1
    addForm.value.episodes_all = collectDetail.value.episodes_all ?? 1
    addForm.value.cate = collectDetail.value.cate ?? ''
    addForm.value.type = collectDetail.value.type ?? ''
    // 等待 tags 更新完 watch 事件触发以后再设置加载完成，避免触发更新标签
    setTimeout(() => {
      isRefreshed.value = true
    }, 500)
  }
}
// 跳转播放页面
async function handlePlay() {
  // 获取播放链接地址
  try {
    if (collectDetail.value.cid) {
      // 打开链接地址
      window.open(`https://v.qq.com/x/cover/${collectDetail.value.cid}.html`, '_blank')
    } else {
      $toast.error(`获取播放链接失败！`)
    }
  } catch (error) {
    console.error(error)
  }
}
async function getSiteSeedList() {
  try {
    siteSeedList.value = await api.get(`collect/seed/${collectProps.id}`)
  } catch (error) {
    console.error(error)
  }
}
function showMediaInfoDialog() {
  showMediaInfo.value = true
}
function showDescInfoDialog() {
  showDescInfo.value = true
}
function showScreenshotInfoDialog() {
  showScreenshotInfo.value = true
}
function showProgressInfoDialog() {
  console.log('showProgressInfoDialog')
  showProgressInfo.value = true
}

function showSiteSeedInfoDialog(seed: SiteSeed) {
  seedInfo.value = seed
  showSiteSeedInfo.value = true
}

function showAddSiteSeddoDialog() {
  console.log('AddSiteSeedDialog')
  showAddSiteSedd.value = true
}

function showCollectOperationDialog(operation: string) {
  console.log('showCollectOperationDialog')
  operationType.value = operation
  showCollectOperation.value = true
}

// 调用API添加采集任务
async function publish(id: number) {
  try {
    startNProgress()
    // 请求API
    const result: { [key: string]: any } = await api.get('collect/torrent_publish/' + id)
    // 添加采集任务状态
    if (result.success) {
      // 成功
      $toast.success(`发布成功！`)
    } else {
      $toast.error(`发布失败`)
    }
  } catch (error) {
    console.error(error)
  }
  doneNProgress()
}

async function deleteSeed(id: number) {
  try {
    startNProgress()
    // 请求API
    // const result: { [key: string]: any } = await api.get('torrent_seed/' + id)
    // // 添加采集任务状态
    // if (result.success) {
    //   // 成功
    //   $toast.success(`发布成功！`)

    // } else {
    //   $toast.error(`发布失败`)
    // }
    $toast.success(`删除成功！`)
  } catch (error) {
    console.error(error)
  }
  doneNProgress()
}
// 表单校验
function validateForm() {
  // 清空旧数据
  const errors = []

  if (!addForm.value.cid) {
    errors.push('媒体ID不能为空！')
  }
  if (!addForm.value.defn) {
    errors.push('请选择清晰度！')
  }

  if (addForm.value.site_list.length === 0) {
    errors.push('请至少选择一个站点！')
  }

  if (errors.length > 0) {
    errors.forEach(msg => $toast.error(msg))
    return false
  }
  return true
}
// 弹出添加订阅提示
function showCollectAddToast(result: boolean, title: string, message: string) {
  let subname = '采集任务'
  if (!result) $toast.error(`${title} 添加${subname}失败：${message}！`)
}

// TMDB图片转换为w500大小
function getW500Image(url = '') {
  if (!url) return ''
  url = url.replace('original', 'w500')
  // 使用图片缓存
  if (globalSettings.GLOBAL_IMAGE_CACHE)
    return `${import.meta.env.VITE_API_BASE_URL}system/cache/image?url=${encodeURIComponent(url)}`
  return url
}

// 计算Poster地址
const getPosterUrl: Ref<string> = computed(() => {
  const url = collectDetail.value.cover ?? ''
  // 使用图片缓存
  if (globalSettings.GLOBAL_IMAGE_CACHE)
    return `${import.meta.env.VITE_API_BASE_URL}system/cache/image?url=${encodeURIComponent(url)}`
  // 如果地址中包含douban则使用中转代理
  if (url.includes('doubanio.com'))
    return `${import.meta.env.VITE_API_BASE_URL}system/img/0?imgurl=${encodeURIComponent(url)}`
  return url
})

// 计算backdrop地址
const getBackdropUrl: Ref<string> = computed(() => {
  const url = collectDetail.value.poster ?? ''
  // 使用图片缓存
  if (globalSettings.GLOBAL_IMAGE_CACHE)
    return `${import.meta.env.VITE_API_BASE_URL}system/cache/image?url=${encodeURIComponent(url)}`
  return url
})
function getSeedStatus(status: string) {
  return seedStatus[status as keyof typeof seedStatus]
}
// 删除任务成功
function deleteSiteSeedSuccess(url: string) {
  showSiteSeedInfo.value = false
  // 重新加载做种列表
  getSiteSeedList()
}
// 添加做种任务成功
function addSiteSeedSuccess(url: string) {
  showAddSiteSedd.value = false
  // 重新加载做种列表
  getSiteSeedList()
}

// 添加做种任务失败
function addSiteSeedError(error: string) {
  showAddSiteSedd.value = false
}

function getIcon(operation: string) {
  switch (operation) {
    case 'start_download_by_collect':
      return 'mdi-arrow-down-bold-circle'
    case 'metadata_by_collect':
      return 'mdi-camcorder-box'
    case 'screenshot_by_collect':
      return 'mdi-camera'
    case 'collect_desc_by_collect':
      return 'mdi-format-text'
    case 'collect_move':
      return 'mdi-rename-box'
    case 'torrent_create':
      return 'mdi-chevron-double-right'
    case 'auto_update':
      return 'mdi-refresh'
    case 'remake_torrent':
      return 'mdi-transfer'
    default:
      return 'mdi-arrow-down-bold-circle'
  }
}

// 页面加载时，加载当前用户数据
onBeforeMount(async () => {
  getDetail()
  getSiteSeedList()
})

// 页面卸载时，关闭事件源
onBeforeUnmount(() => {})

const updateTagsDebounced = useDebounceFn(async newTags => {
  try {
    await api.put(`collect/`, {
      id: collectDetail.value.id,
      tags: newTags,
    })
  } catch (error) {
    console.error('标签更新失败:', error)
  }
}, 500)

const updateCateDebounced = useDebounceFn(async newCate => {
  try {
    await api.put(`collect/`, {
      id: collectDetail.value.id,
      cate: newCate,
    })
  } catch (error) {
    console.error('媒体类型更新失败:', error)
  }
}, 500)

const updateTypeDebounced = useDebounceFn(async newType => {
  try {
    await api.put(`collect/`, {
      id: collectDetail.value.id,
      type: newType,
    })
  } catch (error) {
    console.error('命名类型更新失败:', error)
  }
}, 500)

async function updateCollect(field: string) {
  try {
    await api.put(`collect/`, {
      id: collectDetail.value.id,
      [field]: addForm.value[field as keyof typeof addForm.value],
    })
    // 同步本地详情，避免刷新前展示旧值
    if (field in collectDetail.value) {
      ;(collectDetail.value as any)[field] = addForm.value[field as keyof typeof addForm.value]
    }
    $toast.success(`更新 ${field} 成功！`)
  } catch (error) {
    console.error(`${field} 更新失败:`, error)
  }
}

function onClickDouban() {
  if (addForm.value.douban_id) {
    isLoading.value = true
    const url = `https://movie.douban.com/subject/${addForm.value.douban_id}/`
    getPtgen(url)
  }
}
function onClickImdb() {
  if (addForm.value.imdb_id) {
    isLoading.value = true
    const url = `https://www.imdb.com/title/${addForm.value.imdb_id}/`
    getPtgen(url)
  }
}

/** 用 Bangumi ID 直接拉 ptgen 信息并回填 */
function onClickBangumi() {
  if (!addForm.value.bangumi_id) {
    $toast.warning('Bangumi ID不存在，无法获取信息！')
    return
  }
  isLoading.value = true
  const id = String(addForm.value.bangumi_id).trim()
  const url = id.startsWith('http') ? id : `https://bangumi.tv/subject/${id}`
  getPtgen(url)
}

async function getPtgen(url: string) {
  try {
    ptgen.value = (await api.get('collect/ptgen/info?url=' + url)) as PtgenInfo
    addForm.value.en_title = ptgen.value.en_title
    addForm.value.cn_title = ptgen.value.cn_title
    addForm.value.sub_title = ptgen.value.sub_title
    if (ptgen.value.imdb_id) {
      addForm.value.imdb_id = ptgen.value.imdb_id
    }
    if (ptgen.value.tmdb_id) {
      addForm.value.tmdb_id = ptgen.value.tmdb_id
    }
    // 有解析到 bangumi_id 才覆盖，避免空结果清空已有值
    if (ptgen.value.bangumi_id) {
      addForm.value.bangumi_id = ptgen.value.bangumi_id
    }
    if (ptgen.value.douban_id) {
      addForm.value.douban_id = ptgen.value.douban_id
    }
    addForm.value.season = ptgen.value.season || addForm.value.season || 1
    // 后端返回 overview，兼容 description 字段
    addForm.value.overview =
      ptgen.value.overview || ptgen.value.description || collectDetail.value.overview || addForm.value.overview
    if (ptgen.value.year) {
      addForm.value.year = ptgen.value.year
    }
    // 编辑页：解析到的 ID 自动落库，避免只回填表单、刷新后丢失
    if (ptgen.value.bangumi_id) {
      await updateCollect('bangumi_id')
    }
    if (ptgen.value.tmdb_id) {
      await updateCollect('tmdb_id')
    }
    if (ptgen.value.imdb_id) {
      await updateCollect('imdb_id')
    }
  } catch (error) {
    console.error(error)
    $toast.error('获取 PTGen 信息失败')
  } finally {
    isLoading.value = false
  }
}

// 根据豆瓣/IMDB/Bangumi ID 走 ptgen/info 自动获取并更新 TMDB（及 bangumi）信息
async function fetchTmdbId() {
  const doubanId = addForm.value.douban_id
  const imdbId = addForm.value.imdb_id
  const bangumiId = addForm.value.bangumi_id
  let url = ''
  if (doubanId) {
    url = `https://movie.douban.com/subject/${doubanId}/`
  } else if (imdbId) {
    url = `https://www.imdb.com/title/${imdbId}/`
  } else if (bangumiId) {
    const id = String(bangumiId).trim()
    url = id.startsWith('http') ? id : `https://bangumi.tv/subject/${id}`
  } else {
    $toast.warning('豆瓣/IMDB/Bangumi ID不存在，无法获取TMDB信息！')
    return
  }
  try {
    isLoading.value = true
    const info = (await api.get('collect/ptgen/info?url=' + url)) as PtgenInfo
    ptgen.value = info
    addForm.value.tmdb_id = info.tmdb_id || addForm.value.tmdb_id || ''
    if (info.bangumi_id) {
      addForm.value.bangumi_id = info.bangumi_id
      await updateCollect('bangumi_id')
    }
    if (addForm.value.tmdb_id) {
      await updateCollect('tmdb_id')
    } else {
      $toast.warning('未能解析到TMDB信息')
    }
  } catch (error) {
    console.error(error)
    $toast.error('获取TMDB信息失败')
  } finally {
    isLoading.value = false
  }
}

watch(
  () => addForm.value.tags,
  (newTags, oldTags) => {
    if (!isRefreshed.value || JSON.stringify(newTags) === JSON.stringify(oldTags)) return
    updateTagsDebounced(newTags)
  },
  { deep: true, immediate: false },
)

watch(
  () => addForm.value.cate,
  (newCate, oldCate) => {
    if (!isRefreshed.value || !newCate) return
    updateCateDebounced(newCate)
  },
  { deep: true, immediate: false },
)
watch(
  () => addForm.value.type,
  (newType, oldType) => {
    if (!isRefreshed.value || !newType) return
    updateTypeDebounced(newType)
  },
  { deep: true, immediate: false },
)
</script>

<template>
  <LoadingBanner v-if="!isRefreshed" class="mt-12" />
  <div class="max-w-8xl mx-auto px-4">
    <template v-if="getBackdropUrl || getPosterUrl">
      <div class="vue-media-back absolute left-0 top-0 w-full h-96">
        <VImg class="h-96" position="top" :src="getBackdropUrl || getPosterUrl" cover />
      </div>
      <div class="vue-media-back absolute left-0 top-0 w-full h-96" />
    </template>
    <div class="media-page">
      <div class="media-header">
        <div class="media-poster">
          <VImg :src="getW500Image(getPosterUrl)" cover class="object-cover aspect-w-2 aspect-h-3 ring-1 ring-gray-500">
            <template #placeholder>
              <div class="w-full h-full">
                <VSkeletonLoader class="object-cover aspect-w-2 aspect-h-3" />
              </div>
            </template>
          </VImg>
        </div>
        <div class="media-title">
          <div v-if="existsItemId" class="media-status">
            <span
              class="px-2 inline-flex text-xs leading-5 font-semibold rounded-full whitespace-nowrap transition !no-underline bg-green-500 bg-opacity-80 border border-green-500 !text-green-100 hover:bg-green-500 hover:bg-opacity-100 false overflow-hidden"
            >
              <div class="relative z-20 flex items-center false">
                <span>{{ getCollectStatus(collectDetail.status) }}</span>
              </div>
            </span>
          </div>
          <h1 class="d-flex flex-column flex-lg-row align-baseline justify-center justify-lg-start">
            <div class="align-self-center align-self-lg-end">
              {{ collectDetail.cn_title }}
            </div>
            <div v-if="collectDetail.en_title" class="text-lg align-self-center align-self-lg-end">
              （{{ collectDetail.en_title }}）
            </div>
          </h1>
          <span class="media-attributes">
            <span v-if="collectDetail.title" class="font-title font-semibold">{{ collectDetail.title }}</span>
          </span>
        </div>
        <div class="media-actions">
          <VBtn class="ms-2 mb-2" color="green" @click="showMediaInfoDialog()">
            <template #prepend>
              <VIcon icon="mdi-timetable" />
            </template>
            媒体信息
          </VBtn>
          <VMenu close-on-content-click max-width="450">
            <template v-slot:activator="{ props }">
              <VBtn v-bind="props" class="ms-2 mb-2" color="green" @click.stop="clickSearch">
                <template #prepend>
                  <VIcon icon="mdi-magnify" />
                </template>
                搜索
              </VBtn>
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
          <VBtn class="ms-2 mb-2" color="green" @click="showDescInfoDialog()">
            <template #prepend>
              <VIcon icon="mdi-timetable" />
            </template>
            简介
          </VBtn>
          <VBtn class="ms-2 mb-2" color="purple" @click="showScreenshotInfoDialog()">
            <template #prepend>
              <VIcon icon="mdi-image-multiple" />
            </template>
            截图
          </VBtn>
          <VBtn class="ms-2 mb-2" color="green" @click="showProgressInfoDialog()">
            <template #prepend>
              <VIcon icon="mdi-timetable" />
            </template>
            进度
          </VBtn>
          <VBtn class="ms-2 mb-2" color="green" @click="handlePlay()">
            <template #prepend>
              <VIcon icon="mdi-play" />
            </template>
            在线播放
          </VBtn>
        </div>
      </div>
      <div class="media-overview">
        <div class="media-overview-left">
          <div class="tagline">
            <div class="media-actions">
              <VBtn
                class="ms-2 mb-2"
                color="primary"
                variant="tonal"
                @click.stop="showCollectOperationDialog('auto_update')"
              >
                <template #prepend>
                  <VIcon :icon="getIcon('auto_update')" />
                </template>
                更新
              </VBtn>
              <VBtn
                class="ms-2 mb-2"
                color="primary"
                variant="tonal"
                @click.stop="showCollectOperationDialog('remake_torrent')"
              >
                <template #prepend>
                  <VIcon :icon="getIcon('remake_torrent')" />
                </template>
                转种
              </VBtn>
              <VBtn
                class="ms-2 mb-2"
                color="primary"
                variant="tonal"
                @click.stop="showCollectOperationDialog('start_download_by_collect')"
              >
                <template #prepend>
                  <VIcon :icon="getIcon('start_download_by_collect')" />
                </template>
                下载
              </VBtn>
              <VBtn
                class="ms-2 mb-2"
                color="primary"
                variant="tonal"
                @click.stop="showCollectOperationDialog('metadata_by_collect')"
              >
                <template #prepend>
                  <VIcon :icon="getIcon('metadata_by_collect')" />
                </template>
                采集媒体信息
              </VBtn>
              <VBtn
                class="ms-2 mb-2"
                color="primary"
                variant="tonal"
                @click.stop="showCollectOperationDialog('screenshot_by_collect')"
              >
                <template #prepend>
                  <VIcon :icon="getIcon('screenshot_by_collect')" />
                </template>
                截图
              </VBtn>
              <VBtn
                class="ms-2 mb-2"
                color="primary"
                variant="tonal"
                @click.stop="showCollectOperationDialog('collect_desc_by_collect')"
              >
                <template #prepend>
                  <VIcon :icon="getIcon('collect_desc_by_collect')" />
                </template>
                采集简介
              </VBtn>

              <VBtn
                class="ms-2 mb-2"
                color="primary"
                variant="tonal"
                @click.stop="showCollectOperationDialog('collect_move')"
              >
                <template #prepend>
                  <VIcon :icon="getIcon('collect_move')" />
                </template>
                重命名
              </VBtn>
              <VBtn
                class="ms-2 mb-2"
                color="primary"
                variant="tonal"
                @click.stop="showCollectOperationDialog('torrent_create')"
              >
                <template #prepend>
                  <VIcon :icon="getIcon('torrent_create')" />
                </template>
                制种
              </VBtn>
            </div>
          </div>
          <div class="mt-6">
            <v-stepper
              bg-color="rgba(255, 255, 255, 0.1)"
              complete-icon="mdi-check-circle"
              edit-icon="mdi-checkbox-blank-circle"
            >
              <v-stepper-header>
                <v-stepper-item
                  title="媒体下载"
                  value="1"
                  :color="collectDetail.is_downloaded ? 'success' : ''"
                  :complete="collectDetail.is_downloaded"
                >
                </v-stepper-item>
                <v-divider></v-divider>
                <v-stepper-item
                  title="媒体信息采集"
                  value="2"
                  :color="collectDetail.mediainfo_collected ? 'success' : ''"
                  :complete="collectDetail.mediainfo_collected"
                ></v-stepper-item>
                <v-divider></v-divider>
                <v-stepper-item
                  title="截图"
                  value="3"
                  :color="collectDetail.image_collected ? 'success' : ''"
                  :complete="collectDetail.image_collected"
                ></v-stepper-item>
                <v-divider></v-divider>
                <v-stepper-item
                  title="简介采集"
                  value="4"
                  :color="collectDetail.desc_collected ? 'success' : ''"
                  :complete="collectDetail.desc_collected"
                ></v-stepper-item>
                <v-divider></v-divider>
                <v-stepper-item
                  title="重命名"
                  value="5"
                  :color="collectDetail.is_renamed ? 'success' : ''"
                  :complete="collectDetail.is_renamed"
                ></v-stepper-item>
                <v-divider></v-divider>
                <v-stepper-item
                  title="制作种子"
                  value="6"
                  :color="collectDetail.torrent_created ? 'success' : ''"
                  :complete="collectDetail.torrent_created"
                ></v-stepper-item>
              </v-stepper-header>
            </v-stepper>
          </div>
          <div class="mt-6">
            <v-row>
              <v-col cols="4">
                <v-switch v-model="addForm.auto_download" label="自动下载" hide-details disabled> </v-switch>
              </v-col>
              <v-col cols="4">
                <v-switch v-model="addForm.auto_publish" label="自动发布" hide-details disabled> </v-switch>
              </v-col>
              <v-col cols="4">
                <v-switch v-model="addForm.anon_publish" label="匿名发布" hide-details disabled> </v-switch>
              </v-col>
            </v-row>
          </div>
          <div class="mt-6">
            <VChipGroup column>
              <VChip v-for="(item, index) in siteSeedList" :key="index" @click.stop="showSiteSeedInfoDialog(item)">
                <template #append>
                  <VBadge color="primary" :content="getSeedStatus(item.status)" inline size="small" />
                </template>
                {{ item.site_name }}
              </VChip>
              <VBtn class="ms-2 mb-2" color="success" variant="tonal" @click="showAddSiteSeddoDialog()">
                <template #prepend>
                  <VIcon icon="mdi-plus" />
                </template>
                添加站点
              </VBtn>
            </VChipGroup>
          </div>
        </div>
      </div>
      <div class="mt-6">
        <GroupTile title="标签信息" />
        <VChipGroup column v-model="addForm.tags" multiple>
          <template v-for="(value, key) in tagOptions" :key="key">
            <VChip :color="addForm.tags.includes(key) ? 'primary' : ''" filter variant="outlined" :value="key">
              {{ value }}
            </VChip>
          </template>
        </VChipGroup>
      </div>
      <div class="mt-6">
        <GroupTile title="命名类型" />
        <VChipGroup column v-model="addForm.type">
          <template v-for="(value, key) in mediaCateOptions" :key="key">
            <VChip :color="addForm.type === key ? 'primary' : ''" filter variant="outlined" :value="key">
              {{ value }}
            </VChip>
          </template>
        </VChipGroup>
      </div>
      <div class="mt-6">
        <GroupTile title="分类信息" />
        <VChipGroup column v-model="addForm.cate">
          <template v-for="(value, key) in categoryOptions" :key="key">
            <VChip :color="addForm.cate === key ? 'primary' : ''" filter variant="outlined" :value="key">
              {{ value }}
            </VChip>
          </template>
        </VChipGroup>
      </div>
      <div class="mt-6">
        <GroupTile title="基本信息" />
        <v-row>
          <v-col cols="6" md="6">
            <VTextField
              v-model="addForm.episodes_all"
              placeholder="请手动输入总集数"
              label="总集数"
              variant="plain"
              persistent-hint
              class="max-w mt-1 input-style"
              density="compact"
              @focus="showSaveIcons.episodes_all = true"
              @blur="showSaveIcons.episodes_all = false"
            >
              <template #append-inner>
                <div class="absolute-icon-container">
                  <transition name="fade">
                    <v-icon
                      v-if="showSaveIcons.episodes_all"
                      icon="mdi-content-save"
                      @mousedown.stop="updateCollect('episodes_all')"
                      class="cursor-pointer save-icon"
                      color="primary"
                    />
                  </transition>
                </div>
              </template>
            </VTextField>
          </v-col>
          <v-col cols="6" md="6">
            <VTextField
              v-model="addForm.season"
              placeholder="请手动输入季数"
              label="季数"
              variant="plain"
              persistent-hint
              class="max-w mt-1 input-style"
              density="compact"
              @focus="showSaveIcons.season = true"
              @blur="showSaveIcons.season = false"
            >
              <template #append-inner>
                <div class="absolute-icon-container">
                  <transition name="fade">
                    <v-icon
                      v-if="showSaveIcons.season"
                      icon="mdi-content-save"
                      @mousedown.stop="updateCollect('season')"
                      class="cursor-pointer save-icon"
                      color="primary"
                    />
                  </transition>
                </div>
              </template>
            </VTextField>
          </v-col>
        </v-row>
      </div>
      <div class="mt-6">
        <v-row>
          <v-col cols="6" md="6">
            <VTextField
              v-model="addForm.douban_id"
              placeholder="请手动输入豆瓣ID"
              label="豆瓣ID"
              variant="plain"
              persistent-hint
              class="max-w mt-1"
              :loading="isLoading"
              density="compact"
              @focus="showSaveIcons.douban_id = true"
              @blur="showSaveIcons.douban_id = false"
            >
              <template #prepend-inner>
                <VIcon
                  v-if="addForm.douban_id"
                  icon="mdi-magnify"
                  class="cursor-pointer text-lg mt-1"
                  title="根据豆瓣 ID 获取信息"
                  @click="onClickDouban"
                />
                <VIcon
                  v-if="addForm.douban_id"
                  icon="mdi-cloud-outline"
                  class="cursor-pointer text-lg mt-1"
                  title="打开豆瓣详情页"
                  @click="openDoubanDetail(addForm.douban_id)"
                />
              </template>
              <template #append-inner>
                <div class="absolute-icon-container">
                  <transition name="fade">
                    <v-icon
                      v-if="showSaveIcons.douban_id"
                      icon="mdi-content-save"
                      @mousedown.stop="updateCollect('douban_id')"
                      class="cursor-pointer save-icon"
                      color="primary"
                    />
                  </transition>
                </div>
              </template>
            </VTextField>
          </v-col>
          <v-col cols="6" md="6">
            <VTextField
              v-model="addForm.imdb_id"
              placeholder="请手动输入IMDB ID"
              label="IMDB ID"
              variant="plain"
              persistent-hint
              class="max-w mt-1"
              :loading="isLoading"
              density="compact"
              @focus="showSaveIcons.imdb_id = true"
              @blur="showSaveIcons.imdb_id = false"
            >
              <template #prepend-inner>
                <VIcon
                  v-if="addForm.imdb_id"
                  icon="mdi-magnify"
                  class="cursor-pointer text-lg mt-1"
                  title="根据 IMDB ID 获取信息"
                  @click="onClickImdb"
                />
                <VIcon
                  v-if="addForm.imdb_id"
                  icon="mdi-cloud-outline"
                  class="cursor-pointer text-lg mt-1"
                  title="打开 IMDB 详情页"
                  @click="openImdbDetail(addForm.imdb_id)"
                />
              </template>
              <template #append-inner>
                <div class="absolute-icon-container">
                  <transition name="fade">
                    <v-icon
                      v-if="showSaveIcons.imdb_id"
                      icon="mdi-content-save"
                      @mousedown.stop="updateCollect('imdb_id')"
                      class="cursor-pointer save-icon"
                      color="primary"
                    />
                  </transition>
                </div>
              </template>
            </VTextField>
          </v-col>
          <v-col cols="6" md="6">
            <VTextField
              v-model="addForm.tmdb_id"
              placeholder="PTGen 解析后自动填充"
              label="TMDB ID"
              variant="plain"
              persistent-hint
              class="max-w mt-1"
              :loading="isLoading"
              density="compact"
              @focus="showSaveIcons.tmdb_id = true"
              @blur="showSaveIcons.tmdb_id = false"
            >
              <template #prepend-inner>
                <VIcon
                  v-if="addForm.douban_id || addForm.imdb_id || addForm.bangumi_id"
                  icon="mdi-magnify"
                  class="cursor-pointer text-lg mt-1"
                  title="根据豆瓣/IMDB/Bangumi ID 获取TMDB"
                  @click="fetchTmdbId"
                />
                <VIcon
                  v-if="addForm.tmdb_id"
                  icon="mdi-cloud-outline"
                  class="cursor-pointer text-lg mt-1"
                  title="打开TMDB详情页"
                  @click="addForm.tmdb_id && openTmdbDetail(addForm.tmdb_id)"
                />
              </template>
              <template #append-inner>
                <div class="absolute-icon-container">
                  <transition name="fade">
                    <v-icon
                      v-if="showSaveIcons.tmdb_id"
                      icon="mdi-content-save"
                      @mousedown.stop="updateCollect('tmdb_id')"
                      class="cursor-pointer save-icon"
                      color="primary"
                    />
                  </transition>
                </div>
              </template>
            </VTextField>
          </v-col>
          <v-col cols="6" md="6">
            <VTextField
              v-model="addForm.bangumi_id"
              placeholder="PTGen 解析后自动填充，可手动修改"
              hint="如：228715"
              label="Bangumi ID"
              variant="plain"
              persistent-hint
              class="max-w mt-1"
              :loading="isLoading"
              density="compact"
              @focus="showSaveIcons.bangumi_id = true"
              @blur="showSaveIcons.bangumi_id = false"
            >
              <template #prepend-inner>
                <VIcon
                  v-if="addForm.bangumi_id"
                  icon="mdi-magnify"
                  class="cursor-pointer text-lg mt-1"
                  title="根据 Bangumi ID 获取信息"
                  @click="onClickBangumi"
                />
                <VIcon
                  v-if="addForm.bangumi_id"
                  icon="mdi-cloud-outline"
                  class="cursor-pointer text-lg mt-1"
                  title="打开Bangumi详情页"
                  @click="openBangumiDetail(addForm.bangumi_id)"
                />
              </template>
              <template #append-inner>
                <div class="absolute-icon-container">
                  <transition name="fade">
                    <v-icon
                      v-if="showSaveIcons.bangumi_id"
                      icon="mdi-content-save"
                      @mousedown.stop="updateCollect('bangumi_id')"
                      class="cursor-pointer save-icon"
                      color="primary"
                    />
                  </transition>
                </div>
              </template>
            </VTextField>
          </v-col>
        </v-row>
      </div>
      <div class="mt-6">
        <v-row>
          <v-col cols="6" md="6">
            <VTextField
              v-model="addForm.cn_title"
              placeholder="请手动输入中文标题"
              label="中文标题"
              variant="plain"
              persistent-hint
              class="max-w mt-1 input-style"
              :loading="isLoading"
              density="compact"
              @focus="showSaveIcons.cn_title = true"
              @blur="showSaveIcons.cn_title = false"
            >
              <template #append-inner>
                <div class="absolute-icon-container">
                  <transition name="fade">
                    <v-icon
                      v-if="showSaveIcons.cn_title"
                      icon="mdi-content-save"
                      @mousedown.stop="updateCollect('cn_title')"
                      class="cursor-pointer save-icon"
                      color="primary"
                    />
                  </transition>
                </div>
              </template>
            </VTextField>
          </v-col>
          <v-col cols="6" md="6">
            <VTextField
              v-model="addForm.en_title"
              placeholder="请手动输入英文标题"
              label="英文标题"
              variant="plain"
              persistent-hint
              class="max-w mt-1 input-style"
              :loading="isLoading"
              density="compact"
              @focus="showSaveIcons.en_title = true"
              @blur="showSaveIcons.en_title = false"
            >
              <template #append-inner>
                <div class="absolute-icon-container">
                  <transition name="fade">
                    <v-icon
                      v-if="showSaveIcons.en_title"
                      icon="mdi-content-save"
                      @mousedown.stop="updateCollect('en_title')"
                      class="cursor-pointer save-icon"
                      color="primary"
                    />
                  </transition>
                </div>
              </template>
            </VTextField>
          </v-col>
        </v-row>
      </div>
      <div class="mt-6">
        <v-row>
          <v-col cols="6" md="6">
            <VTextField
              v-model="addForm.year"
              placeholder="请手动输入年份"
              label="年份"
              variant="plain"
              persistent-hint
              class="max-w mt-1 input-style"
              :loading="isLoading"
              density="compact"
              @focus="showSaveIcons.year = true"
              @blur="showSaveIcons.year = false"
            >
              <template #append-inner>
                <div class="absolute-icon-container">
                  <transition name="fade">
                    <v-icon
                      v-if="showSaveIcons.year"
                      icon="mdi-content-save"
                      @mousedown.stop="updateCollect('year')"
                      class="cursor-pointer save-icon"
                      color="primary"
                    />
                  </transition>
                </div>
              </template>
            </VTextField>
          </v-col>
        </v-row>
      </div>
      <div class="mt-6">
        <v-row>
          <v-col cols="12" md="12">
            <VTextarea
              v-model="addForm.sub_title"
              placeholder="请手动输入副标题"
              label="副标题"
              rows="3"
              variant="plain"
              persistent-hint
              class="max-w mt-1 input-style"
              :loading="isLoading"
              density="compact"
              @focus="showSaveIcons.sub_title = true"
              @blur="showSaveIcons.sub_title = false"
            >
              <template #append-inner>
                <div class="absolute-icon-container">
                  <transition name="fade">
                    <v-icon
                      v-if="showSaveIcons.sub_title"
                      icon="mdi-content-save"
                      @mousedown.stop="updateCollect('sub_title')"
                      class="cursor-pointer save-icon"
                      color="primary"
                    />
                  </transition>
                </div>
              </template>
            </VTextarea>
          </v-col>
        </v-row>
      </div>
      <div class="mt-6">
        <v-row>
          <v-col cols="12" md="12">
            <VTextarea
              v-model="addForm.overview"
              placeholder="请手动输入简介"
              label="简介"
              rows="3"
              variant="plain"
              persistent-hint
              class="max-w mt-1 relative input-style"
              :loading="isLoading"
              density="compact"
              @focus="showSaveIcons.overview = true"
              @blur="showSaveIcons.overview = false"
            >
              <template #append-inner>
                <div class="absolute-icon-container">
                  <transition name="fade">
                    <v-icon
                      v-if="showSaveIcons.overview"
                      icon="mdi-content-save"
                      @mousedown.stop="updateCollect('overview')"
                      class="cursor-pointer save-icon"
                      color="primary"
                    />
                  </transition>
                </div>
              </template>
            </VTextarea>
          </v-col>
        </v-row>
      </div>
      <div v-if="taskList && taskList.length > 0">
        <TaskCardSlideView title="剧集列表" :taskList="taskList" height="11rem" width="20rem" />
      </div>
    </div>
    <VideoMediaInfoDialog
      v-if="showMediaInfo"
      v-model="showMediaInfo"
      :collect="collectDetail"
      @close="showMediaInfo = false"
    />
    <VideoDescInfoDialog
      v-if="showDescInfo"
      v-model="showDescInfo"
      :collect="collectDetail"
      @close="showDescInfo = false"
    />
    <VideoScreenshotDialog
      v-if="showScreenshotInfo"
      v-model="showScreenshotInfo"
      :collect="collectDetail"
      @close="showScreenshotInfo = false"
    />
    <ProgressInfoDialog
      v-if="showProgressInfo"
      v-model="showProgressInfo"
      type="collect"
      :id="collectDetail.id"
      :name="collectDetail.name"
      @close="showProgressInfo = false"
    />
    <SiteSeedInfoDialog
      v-if="showSiteSeedInfo"
      v-model="showSiteSeedInfo"
      :seed="seedInfo"
      @close="deleteSiteSeedSuccess"
      @remove="deleteSiteSeedSuccess"
    />
    <AddSiteSeedDialog
      v-if="showAddSiteSedd"
      v-model="showAddSiteSedd"
      :collect="collectDetail"
      :siteSeedList="siteSeedList"
      @done="addSiteSeedSuccess"
      @error="addSiteSeedError"
      @close="showAddSiteSedd = false"
    />
    <CollectOperationDialog
      v-if="showCollectOperation"
      v-model="showCollectOperation"
      :collect_id="collectDetail.id"
      :operation="operationType"
      @close="showCollectOperation = false"
    />
    <!-- 站点资源弹窗 -->
    <SiteSearchDialog
      v-if="resourceDialog"
      v-model="resourceDialog"
      :site="getSelectedSite()"
      :keyword="collectDetail?.cn_title"
      @close="onSiteResourceDone"
    />
  </div>
  <NoDataFound
    v-if="!collectDetail.id && isRefreshed"
    error-code="500"
    error-title="出错啦！"
    error-description="未识别到媒体信息。"
  />
</template>

<style lang="scss">
.vue-media-back {
  background-image:
    linear-gradient(180deg, rgba(var(--v-theme-background), 0) 50%, rgba(var(--v-theme-background), 1) 100%),
    linear-gradient(90deg, rgba(var(--v-theme-background), 0) 50%, rgba(var(--v-theme-background), 1) 100%),
    linear-gradient(270deg, rgba(var(--v-theme-background), 0) 50%, rgba(var(--v-theme-background), 1) 100%);
  box-shadow: 0 0 0 2px rgb(var(--v-theme-background));
  margin-block-start: calc(-70px - env(safe-area-inset-top));
}

.media-page {
  position: relative;
  background-position: 50%;
  background-size: cover;
  margin-block-start: calc(-4rem - env(safe-area-inset-top));
  margin-inline: -1rem;
  padding-block-start: calc(4rem + env(safe-area-inset-top));
  padding-inline: 1rem;
}

.media-header {
  display: flex;
  flex-direction: column;
  align-items: center;
  padding-block-start: 1rem;
}

@media (width >=1280px) {
  .media-header {
    flex-direction: row;
    align-items: flex-end;
  }
}

.media-overview {
  display: flex;
  flex-direction: column;
  padding-block: 2rem 1rem;
}

@media (width >=1024px) {
  .media-overview {
    flex-direction: row;
  }
}

.media-poster {
  overflow: hidden;
  border-radius: 0.25rem;
  box-shadow: var(--tw-ring-offset-shadow, 0 0 #0000), var(--tw-ring-shadow, 0 0 #0000), var(--tw-shadow);
  inline-size: 8rem;

  --tw-shadow: 0 1px 3px 0 rgba(0, 0, 0, 10%), 0 1px 2px -1px rgba(0, 0, 0, 10%);
  --tw-shadow-colored: 0 1px 3px 0 var(--tw-shadow-color), 0 1px 2px -1px var(--tw-shadow-color);
}

@media (width >=1280px) {
  .media-poster {
    inline-size: 13rem;
    margin-inline-end: 1rem;
  }
}

@media (width >=768px) {
  .media-poster {
    border-radius: 0.5rem;
    box-shadow: var(--tw-ring-offset-shadow, 0 0 #0000), var(--tw-ring-shadow, 0 0 #0000), var(--tw-shadow);
    inline-size: 11rem;

    --tw-shadow: 0 25px 50px -12px rgba(0, 0, 0, 25%);
    --tw-shadow-colored: 0 25px 50px -12px var(--tw-shadow-color);
  }
}

.media-title {
  display: flex;
  flex: 1 1 0%;
  flex-direction: column;
  margin-block-start: 1rem;
  text-align: center;
}

@media (width >=1280px) {
  .media-title {
    margin-block-start: 0;
    margin-inline-end: 1rem;
    text-align: start;
  }
}

.media-title > h1 {
  font-size: 1.5rem;
  font-weight: 700;
  line-height: 2rem;
}

@media (width >=1280px) {
  .media-title > h1 {
    font-size: 2.25rem;
    line-height: 2.5rem;
  }
}

ul.media-crew {
  display: grid;
  gap: 1.5rem;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  margin-block-start: 1.5rem;
}

@media (width >=640px) {
  ul.media-crew {
    grid-template-columns: repeat(3, minmax(0, 1fr));
  }
}

ul.media-crew > li {
  display: flex;
  flex-direction: column;
  font-weight: 700;
  grid-column: span 1 / span 1;
}

a.crew-name {
  font-weight: 400;
}

.media-status {
  margin-block-end: 0.5rem;
}

.media-attributes {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  justify-content: center;
  margin-block-start: 0.25rem;
}

@media (width >=1280px) {
  .media-attributes {
    justify-content: flex-start;
    font-size: 1rem;
    line-height: 1.5rem;
    margin-block-start: 0;
  }
}

@media (width >=640px) {
  .media-attributes {
    font-size: 0.875rem;
    line-height: 1.25rem;
  }
}

.media-actions {
  position: relative;
  display: flex;
  flex-shrink: 0;
  flex-wrap: wrap;
  align-items: center;
  justify-content: center;
  margin-block-start: 1rem;
}

@media (width >=1280px) {
  .media-actions {
    margin-block-start: 0;
  }
}

@media (width >=640px) {
  .media-actions {
    flex-wrap: nowrap;
    justify-content: flex-end;
  }
}

.media-overview-left {
  flex: 1 1 0%;
}

@media (width >=1024px) {
  .media-overview-left {
    margin-inline-end: 2rem;
  }
}

.media-overview-right {
  inline-size: 100%;
  margin-block-start: 2rem;
}

@media (width >=1024px) {
  .media-overview-right {
    inline-size: 20rem;
    margin-block-start: 0;
  }
}

.media-facts {
  border-width: 1px;
  border-color: rgb(55 65 81 / var(--tw-border-opacity));
  border-radius: 0.5rem;
  font-size: 0.875rem;
  font-weight: 700;
  line-height: 1.25rem;

  --tw-border-opacity: 1;
  --tw-bg-opacity: 1;
  --tw-text-opacity: 1;
}

.media-ratings {
  display: flex;
  align-items: center;
  justify-content: center;
  border-color: rgb(55 65 81 / var(--tw-border-opacity));
  border-block-end-width: 1px;
  font-weight: 500;
  padding-block: 0.5rem;
  padding-inline: 1rem;

  --tw-border-opacity: 1;
}

.media-fact {
  display: flex;
  justify-content: space-between;
  border-color: rgb(55 65 81 / var(--tw-border-opacity));
  border-block-end-width: 1px;
  padding-block: 0.5rem;
  padding-inline: 1rem;

  --tw-border-opacity: 1;
}

.media-overview h2 {
  font-size: 1.25rem;
  font-weight: 700;
  line-height: 1.75rem;
}

@media (width >=640px) {
  .media-overview h2 {
    font-size: 1.5rem;
    line-height: 2rem;
  }
}

.tagline {
  font-size: 1.25rem;
  font-style: italic;
  line-height: 1.75rem;
  margin-block-end: 1rem;
}

@media (width >=1024px) {
  .tagline {
    font-size: 1.5rem;
    line-height: 2rem;
  }
}

.relative {
  position: relative;
}

.absolute-icon-container {
  position: absolute;
  z-index: 2;
  display: flex;
  align-items: flex-start;
  background: linear-gradient(90deg, transparent 0%, var(--v-theme-background) 70%);
  block-size: 100%;
  inline-size: 60px;
  inset-block-start: 0;
  inset-inline-end: 0;
}
</style>

<style scoped>
.save-icon {
  position: absolute;
  z-index: 3;
  inset-block-start: 6px;
  inset-inline-end: 2px;
}

.input-style {
  font-family:
    Rubik,
    -apple-system,
    BlinkMacSystemFont,
    'Segoe UI',
    Roboto,
    'Helvetica Neue',
    Arial,
    'Noto Sans',
    sans-serif,
    'Apple Color Emoji',
    'Segoe UI Emoji',
    'Segoe UI Symbol',
    'Noto Color Emoji';
  font-size: 14px;
}
</style>
