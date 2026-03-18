<script setup lang="ts">
// @ts-nocheck
import { useToast } from 'vue-toastification'

import api from '@/api'
import { tagOptions, mediaCateOptions, categoryOptions } from '@/api/constants'
import type { VideoInfo, CollectCreate, Site, PtgenInfo, VideoEpisode } from '@/api/types'
import GroupTile from '@/components/GroupTitle.vue'
import EpisodeCard from '@/components/cards/EpisodeCard.vue'
import SlideView from '@/components/slide/SlideView.vue'
import SiteSearchDialog from '@/components/dialog/SiteSearchDialog.vue'
import { doneNProgress, startNProgress } from '@/api/nprogress'
import router from '@/router'
import { useUserStore, useGlobalSettingsStore } from '@/stores'
import { add } from 'lodash-es'

// 输入参数
const mediaProps = defineProps({
  source: String,
  mediaid: String,
  title: String,
  year: String,
  type: String,
  cate: String,
  auto_download: Boolean,
  auto_publish: Boolean,
  anon_publish: Boolean,
  link_to: String,
})
// 提供给子组件的属性
provide('rankingPropsKey', reactive({ ...mediaProps }))
// 从 provide 中获取全局设置
// 全局设置
const globalSettingsStore = useGlobalSettingsStore()
const globalSettings = globalSettingsStore.globalSettings

// 用户 Store
const userStore = useUserStore()

// 提示框
const $toast = useToast()

// 媒体详情
const mediaDetail = ref<VideoInfo>({} as VideoInfo)
// 站点列表
const siteList = ref<Site[]>([])

const ptgen = ref<PtgenInfo>({} as PtgenInfo)

// 采集模式选项
const collectModeOptions = {
  'normal': '普通采集',
  'episode': '分集采集'
}

// 采集模式（二选一）
const collectMode = ref<'normal' | 'episode'>('normal')

// 是否预约采集（开关）
const isReserveCollect = ref(false)

// 预约时间
const reserveStartTime = ref<string | null>(null)
const reserveStartDate = ref<string | null>(null)
const reserveStartTimeOnly = ref<string | null>(null)

// 生成预约时间字符串
const reserveTimeFormatted = computed(() => {
  if (reserveStartDate.value && reserveStartTimeOnly.value) {
    return `${reserveStartDate.value} ${reserveStartTimeOnly.value}:00`
  }
  return null
})

// 制作组列表
const teamList = ref<any[]>([])


// 选中的剧集数量
const selectedCount = computed(() => {
  let count = 0
  mediaDetail.value.episode_list?.forEach(episode => {
    if (episode.selected && episode.show) {
      count++
    }
  })
  return count
})

const selectedEpisode = computed(() => {
  let selectedEpisodes: VideoEpisode[] = []
  mediaDetail.value.episode_list?.forEach(episode => {
    if (episode.selected) {
      selectedEpisodes.push(episode)
    }
  })
  return selectedEpisodes
})

// 是否已加载完成
const isRefreshed = ref(false)
const isLoading = ref(true)
const onlyShowMainEpisodes = ref(false)

function definitionLabel(definition: any) {
  return definition?.sname || definition?.cname || definition?.name || ''
}


// 采集任务添加表单
const addForm = ref<CollectCreate>({
  cid: "",
  defn: "",
  douban_id: "",
  imdb_id: "",
  cn_title: "",
  en_title: "",
  sub_title: "",
  original_title: "",
  year: "",
  type: mediaProps.type ?? "",
  overview: "",
  season: 1,
  cate: "TV",
  site: "",
  cover: "",
  poster: "",
  episodes_all: 1,
  copyright: "NoGroup",
  team: "NoGroup",
  auto_download: true,
  auto_publish: true,
  anon_publish: true,
  source: "WEB-DL",
  tags: [],
  episode_list: [],
  site_list: []
})
// 调用API查询详情
// 加载制作组数据
async function loadTeamOptions() {
  try {
    const result: { [key: string]: any } = await api.get('system/setting/TEAM_PARAMS')
    teamList.value = result.data?.value ?? []
    // 按照order排序
    teamList.value.sort((a, b) => (a.order || 0) - (b.order || 0))
    // 设置默认选中的制作组
    const defaultTeam = teamList.value.find(item => item.default) || teamList.value[0]
    if (defaultTeam) {
      addForm.value.team = defaultTeam.team
      addForm.value.copyright = defaultTeam.copyright
    }
  } catch (error) {
    console.error('加载制作组数据失败:', error)
    // 加载失败时使用默认值
    teamList.value = [{ team: 'NoGroup', copyright: 'NoGroup' }]
  }
}

async function getMediaDetail() {
  if (mediaProps.mediaid && mediaProps.type) {
    mediaDetail.value = await api.get(`${mediaProps.source?.toLowerCase()}/detail`, {
      params: {
        cid: mediaProps.mediaid
      },
    })
    // 默认选中所有剧集
    let episodeIndex = 0
    mediaDetail.value.episode_list?.forEach(episode => {
      //episode.selected = true
      // 新增：当只有1集且集数未设置时，默认设为1
      if (mediaDetail.value.episode_list?.length === 1 && !episode.episode) {
        episode.episode = 1
      }
      if (onlyShowMainEpisodes.value && mediaProps.source == 'MgTV' && episode.pay_type != '0') {
        episode.show = false
      } else {
        episode.show = true
        episode.selected = true
        episodeIndex += 1
        episode.episode = episodeIndex
      }
    })
    // mediaDetail.value.episode_all = episodeIndex.toString()
    // 设置默认选中第一个清晰度
    if (mediaDetail.value.definition_list?.length > 0) {
      addForm.value.defn = mediaDetail.value.definition_list[0].name
    }
    // addForm 赋值
    addForm.value.cid = mediaProps.mediaid
    addForm.value.douban_id = mediaDetail.value.douban_id ?? ''
    addForm.value.original_title = mediaDetail.value.title ?? ''
    addForm.value.year = mediaDetail.value.douban_info?.year ?? mediaDetail.value.year ?? ''
    addForm.value.type = mediaProps.type ?? ''
    addForm.value.cate = mediaProps.cate ?? ''
    addForm.value.site = mediaProps.source ?? ''
    addForm.value.cover = mediaDetail.value.new_pic_vt ?? ''
    addForm.value.poster = mediaDetail.value.new_pic_vt ?? ''
    addForm.value.overview = mediaDetail.value.overview ?? ''
    // 设置总集数（修改核心逻辑）
    const episodeListLength = episodeIndex || 1 // 剧集列表长度（至少1）
    addForm.value.episodes_all = mediaDetail.value.episode_all
      ? Math.max(Number(mediaDetail.value.episode_all), episodeListLength)  // 取较大值
      : episodeListLength  // 无episode_all时使用列表长度
    if (addForm.value.episodes_all == 1) {
      addForm.value.type = "Movie"
    }
    // 新增：当剧集数等于列表长度时添加Completed标签
    if (addForm.value.episodes_all > 1 && addForm.value.episodes_all == mediaDetail.value.episode_list?.length) {
      addForm.value.tags.push("Completed")
    }
    isRefreshed.value = true

    // 加载制作组数据
    await loadTeamOptions()
    if (mediaDetail.value.douban_id) {
      const douban_url = `https://movie.douban.com/subject/${mediaDetail.value.douban_id}/`
      getPtgen(douban_url)
    } else {
      isLoading.value = false
    }

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
async function getPtgen(url: string) {
  try {
    ptgen.value = await api.get('collect/ptgen/info?url=' + url) as PtgenInfo
    addForm.value.en_title = ptgen.value.en_title
    addForm.value.cn_title = ptgen.value.cn_title || mediaDetail.value.title
    addForm.value.sub_title = ptgen.value.sub_title
    addForm.value.imdb_id = ptgen.value.imdb_id || ''
    addForm.value.season = ptgen.value.season || 1
    // 处理可能为 null 的情况，确保赋值给 addForm.value.overview 的是 string 类型
    addForm.value.overview = ptgen.value.description || mediaDetail.value.overview || ''
    addForm.value.year = ptgen.value.year || mediaDetail.value.year || ''
    if (addForm.value.year) {
      mediaDetail.value.year = addForm.value.year
    }
    isLoading.value = false
    update_subtitle()
  } catch (error) {
    isLoading.value = false
    console.error(error)
  }
}

async function getSites() {
  try {
    siteList.value = await api.get('site/')
    // 设置默认选中第一个站点
    if (siteList.value.length > 0 && addForm.value.site_list.length === 0) {
      addForm.value.site_list = [siteList.value[0].id]
    }
  } catch (error) {
    console.error(error)
  }
}
async function handleCheckExists() {
  try {
    const result: { [key: string]: any } = await api.get('task/exist_cid/' + mediaProps?.mediaid, {
      params: {}
    })

    if (result.success) isExists.value = true
  } catch (error) {
    console.error(error)
  }
}

async function handleCheckIgnore() {
  try {

    const result: { [key: string]: any } = await api.get(`collect/ignore/${mediaProps?.source}/${mediaProps?.mediaid}`, {
      params: {},
    })

    if (result.success) isIgnore.value = true
  } catch (error) {
    console.error(error)
  }
}
// 调用API添加采集任务
async function addCollect() {
  try {
    // 处理选中的剧集
    addForm.value.episode_list = []
    mediaDetail.value.episode_list?.forEach(episode => {
      if (episode.selected) {
        addForm.value.episode_list.push({
          cid: episode.cid,
          vid: episode.vid,
          episode: episode.episode,
          poster: episode.image_url
        })
      }
    })
    // 处理总集数
    console.log('addForm.value.episodes_all: ', addForm.value.episodes_all)
    // 处理版权和制作组信息
    if (addForm.value.team) {
      const teamItem = teamList.value.find(item => item.team === addForm.value.team)
      if (teamItem) {
        addForm.value.copyright = teamItem.copyright
      }
    }
    // 提交前检查参数
    console.log(addForm.value)

    if (!validateForm()) return
    
    // 检查预约时间
    if (isReserveCollect.value && !reserveTimeFormatted.value) {
      $toast.error('请选择预约时间！')
      return
    }
    
    // 调用接口添加采集任务
    startNProgress()
    
    let result: { [key: string]: any }
    
    // 构建基础请求数据
    const baseData = {
      ...addForm.value,
      isReserved: isReserveCollect.value,
      reserveStartTime: isReserveCollect.value ? reserveTimeFormatted.value : null
    }
    
    // 根据采集模式选择不同的API
    if (collectMode.value === 'episode') {
      // 分集采集：每个剧集创建独立的采集任务
      result = await api.post('collect/episode', {
        ...baseData,
        collect_mode: 'episode'
      })
    } else {
      // 普通采集
      result = await api.post('collect/', baseData)
    }
    
    // 添加采集任务状态
    if (result.success) {
      // 成功
      router.push({ path: '/task' })
      isExists.value = true
    }

    // 提示
    showCollectAddToast(result.success, mediaDetail.value?.title ?? '', result.message)
  } catch (error) {
    console.error(error)
  }
  doneNProgress()
}
function fill_subtile(sub_tile: string, title: string) {
  if (!sub_tile) return sub_tile
  if (!title) return sub_tile
  // 分割标题和其他信息
  const [originalTitle, ...restParts] = sub_tile.split('|').map(p => p.trim());
  // 检查原标题是否包含新标题
  if (!originalTitle.includes(title)) {
    // 合并新旧标题
    const mergedTitle = `${title}/${originalTitle}`;
    // 重组完整sub_title
    return [mergedTitle, ...restParts].join(' | ');
  }

  // 保持原标题格式不变
  return sub_tile;
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
  if (!addForm.value.cate) {
    errors.push('请选择分类！')
  }
  if (!addForm.value.cn_title) {
    errors.push('中文标题不能为空！')
  }
  if (!addForm.value.en_title) {
    errors.push('英文标题不能为空！')
  }
  if (!addForm.value.sub_title) {
    errors.push('副标题不能为空！')
  }
  if (!mediaDetail.value.episode_list?.some(e => e.selected)) {
    errors.push('请至少选择一集！')
  }

  // 新增：校验选中剧集的集数必须为数字且不重复
  const selectedEpisodes = mediaDetail.value.episode_list?.filter(ep => ep.selected) || []
  if (selectedEpisodes.length > 0) {
    const episodeNumbers = selectedEpisodes.map(ep => ep.episode)

    // 校验是否全为数字
    const nonNumberEpisodes = episodeNumbers.filter(num => typeof num !== 'number' || isNaN(num))
    if (nonNumberEpisodes.length > 0) {
      errors.push('选中的剧集中存在非数字的集数编号！')
    }

    // 校验是否有重复
    const uniqueNumbers = new Set(episodeNumbers)
    if (uniqueNumbers.size !== episodeNumbers.length) {
      errors.push('选中的剧集中存在重复的集数编号！')
    }
    // 新增：校验集数必须大于0
    const invalidNumbers = episodeNumbers.filter(num => num <= 0)
    if (invalidNumbers.length > 0) {
      errors.push('选中的剧集中存在集数编号小于等于0的情况！')
    }
  }

  if (addForm.value.site_list.length === 0) {
    errors.push('请至少选择一个站点！')
  }

  // if (!addForm.value.douban_id && !addForm.value.imdb_id) {
  //   errors.push('豆瓣ID或者IMDBID需要至少需输入一个！')
  // }

  if (!addForm.value.episodes_all) {
    errors.push('总集数不能为空！')
  }

  if (addForm.value.episodes_all < selectedCount.value) {
    errors.push('总集数不不能小于选中的集数！')
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
  const url = mediaDetail.value.new_pic_vt ?? ''
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
  const url = mediaDetail.value.new_pic_hz ?? ''
  // 使用图片缓存
  if (globalSettings.GLOBAL_IMAGE_CACHE)
    return `${import.meta.env.VITE_API_BASE_URL}system/cache/image?url=${encodeURIComponent(url)}`
  return url
})

const doubanHint = computed(() => {
  if (mediaDetail.value.douban_id) {
    return `${mediaDetail.value.douban_info.title}(${mediaDetail.value.douban_info.year})`
  } else {
    return '如：1878011'
  }
})

// 计算订阅图标
const getAddBtnIcon = computed(() => {
  if (isExists.value) return 'mdi-magnify'
  else return 'mdi-magnify'
})

// 计算订阅按钮颜色
const getAddBtnColor = computed(() => {
  if (isExists.value) return 'error'
  else return 'warning'
})

// 跳转播放页面
async function handlePlay() {
  // 获取播放链接地址
  try {
    if (mediaProps.mediaid) {
      // 打开链接地址
      if (mediaProps.source == 'MgTV') {
        window.open(`https://www.mgtv.com/b/${mediaProps.mediaid}.html`, '_blank')
      } else if (mediaProps.source == 'Tencent') {
        window.open(`https://v.qq.com/x/cover/${mediaProps.mediaid}.html`, '_blank')
      } else {
        $toast.error(`不支持的播放源！`)
      }
    } else {
      $toast.error(`获取播放链接失败！`)
    }
  } catch (error) {
    console.error(error)
  }
}

onBeforeMount(() => {
  handleCheckExists()
  handleCheckIgnore()
  getMediaDetail()
  getSites()
})
function update_subtitle() {
  let name = ''
  let play_title = ''
  if (addForm.value.episodes_all > 1) {
    if (addForm.value.episodes_all == selectedCount.value) {
      name = `全${addForm.value.episodes_all}集`
    } else if (selectedCount.value == 1) {
      if (mediaProps.source == 'MgTV') {
        play_title = selectedEpisode.value[0]?.play_title || ''
      } else {
        name = `第${addForm.value.episode_list[0] ? addForm.value.episode_list[0].episode : 1}集`
      }
    } else {
      const selectedEpisodes = mediaDetail.value.episode_list?.filter(ep => ep.selected) || []
      const episodes = selectedEpisodes
        .map(e => e.episode)
        .sort((a, b) => a - b);

      let isConsecutive = true;
      for (let i = 1; i < episodes.length; i++) {
        if (episodes[i] - episodes[i - 1] !== 1) {
          isConsecutive = false;
          break;
        }
      }

      if (isConsecutive) {
        name = `第${episodes[0]}集-第${episodes[episodes.length - 1]}集`;
      } else {
        name = episodes.map(e => `第${e}集`).join('、');
      }
    }
  }
  if (ptgen.value.sub_title) {
    const subTitleParts = ptgen.value.sub_title.split(' | ')
    if (name) {
      subTitleParts.splice(1, 0, name) // 在第二位插入name
    }
    // 插入播放标题
    if (play_title) {
      subTitleParts.splice(1, 0, play_title) // 在第三位插入play_title
    }
    addForm.value.sub_title = subTitleParts.join(' | ')
  } else {
    addForm.value.sub_title = ptgen.value.sub_title
  }

  // 插入原始标题
  addForm.value.sub_title = fill_subtile(addForm.value.sub_title, mediaDetail.value.title)
}
watch(() => [
  addForm.value.episodes_all,
  mediaDetail.value.episode_list?.map(ep => ep.episode),
  selectedCount
], () => {
  update_subtitle()
}, { deep: true, immediate: true })

// 自动设置选中剧集的自增编号，未选中的清空
function autoSetEpisodeNumbers() {
  const allEpisodes = mediaDetail.value.episode_list || []
  if (allEpisodes.length === 0) {
    $toast.warning('没有可用的剧集列表！')
    return
  }

  // 先清空所有未选中或隐藏剧集的编号
  allEpisodes.forEach(ep => {
    if (!ep.selected || !ep.show) ep.episode = 0 // 或根据实际需求设置为 null/0 等空值
  })

  // 再处理选中剧集的自增编号
  const selectedEpisodes = allEpisodes.filter(ep => ep.selected && ep.show)
  if (selectedEpisodes.length === 0) {
    $toast.warning('请先选择需要设置编号的剧集！')
    return
  }

  // 按顺序设置自增编号（从1开始）
  selectedEpisodes.forEach((ep, index) => {
    ep.episode = index + 1
  })
}

// 切换是否只显示正片剧集
function toggleMainEpisodes() {
  const allEpisodes = mediaDetail.value.episode_list || []
  onlyShowMainEpisodes.value = !onlyShowMainEpisodes.value

  let episodeIndex = 0
  allEpisodes.forEach(episode => {
    if (onlyShowMainEpisodes.value && mediaProps.source == 'MgTV' && episode.pay_type != '0') {
      episode.show = false
    } else {
      episode.show = true
      episode.selected = true
      episodeIndex += 1
      episode.episode = episodeIndex
    }
  })
  addForm.value.episodes_all = episodeIndex
}

// 全选所有剧集
function selectAllEpisodes() {
  const allEpisodes = mediaDetail.value.episode_list || []
  if (allEpisodes.length === 0) {
    $toast.warning('没有可用的剧集列表！')
    return
  }

  allEpisodes.forEach(ep => {
    ep.selected = true
  })
}

// 全不选所有剧集
function invertSelectEpisodes() {
  const allEpisodes = mediaDetail.value.episode_list || []
  if (allEpisodes.length === 0) {
    $toast.warning('没有可用的剧集列表！')
    return
  }

  allEpisodes.forEach(ep => {
    ep.selected = false
  })
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

// 资源浏览弹窗
const resourceDialog = ref(false)
// 本地存在状态
const isExists = ref(false)

// 本地忽略状态
const isIgnore = ref(false)

// 所有站点
const allSites = ref<Site[]>([])

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
async function removeIgnore() {
  // 开始处理
  startNProgress()
  try {
    const result: { [key: string]: any } = await api.delete(`collect/ignore/${mediaProps?.source}/${mediaProps?.mediaid}`)

    if (result.success) {
      isIgnore.value = false
      $toast.success(`${mediaProps?.title} 已取消忽略！`)
    } else {
      $toast.error(`${mediaProps?.title} 取消忽略失败：${result.message}！`)
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
    const result: { [key: string]: any } = await api.post(`collect/ignore/${mediaProps?.source}/${mediaProps?.mediaid}`)

    if (result.success) {
      isIgnore.value = true
      $toast.success(`${mediaProps?.title} 已忽略！`)
    } else {
      $toast.error(`${mediaProps?.title} 忽略失败：${result.message}！`)
    }
  } catch (error) {
    console.error(error)
  } finally {
    doneNProgress()
  }
}
function handleIgnore() {
  if (isIgnore.value) removeIgnore()
  else addIgnore()
}
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
          <div class="media-status">
            <span v-if="isExists"
              class="mr-2 mb-2 px-2 inline-flex text-xs leading-5 font-semibold rounded-full whitespace-nowrap transition !no-underline bg-green-500 bg-opacity-80 border border-green-500 !text-green-100 hover:bg-green-500 hover:bg-opacity-100 false overflow-hidden">
              <div class="relative z-20 flex items-center false"><span>已采集</span></div>
            </span>
            <span v-if="isIgnore"
              class="mr-2 mb-2 px-2 inline-flex text-xs leading-5 font-semibold rounded-full whitespace-nowrap transition !no-underline bg-gray-500 bg-opacity-80 border border-gray-500 !text-green-100 hover:bg-green-500 hover:bg-opacity-100 false overflow-hidden">
              <div class="relative z-20 flex items-center false"><span>已忽略</span></div>
            </span>
          </div>

          <h1 class="d-flex flex-column flex-lg-row align-baseline justify-center justify-lg-start">
            <div class="align-self-center align-self-lg-end">
              {{ mediaDetail.title }}
            </div>
            <div v-if="mediaDetail.year" class="text-lg align-self-center align-self-lg-end">
              （{{ mediaDetail.year }}）
            </div>
          </h1>
          <span class="media-attributes">
            <span v-if="mediaDetail.areaName">{{ mediaDetail.areaName }}</span>
            <span v-if="mediaDetail.douban_info && mediaDetail.douban_info.card_subtitle" class="mx-1">
              |
            </span>
            <span v-if="mediaDetail.douban_info && mediaDetail.douban_info.card_subtitle">{{
              mediaDetail.douban_info.card_subtitle }}</span>
          </span>
        </div>
        <div class="media-actions">
          <VBtn variant="tonal" color="info" class="mb-2" @click="addCollect">
            <template #prepend>
              <VIcon icon="mdi-plus" />
            </template>
            添加
          </VBtn>

          <VMenu close-on-content-click max-width="450">
            <template v-slot:activator="{ props }">
              <VBtn v-bind="props" class="ms-2 mb-2" :color="getAddBtnColor" variant="tonal" @click.stop="clickSearch">
                <template #prepend>
                  <VIcon :icon="getAddBtnIcon" />
                </template>
                搜索
              </VBtn>

            </template>
            <VList>
              <VListItem>
                <VChipGroup v-model="selectedSites" column @click.stop>
                  <VChip v-for="site in allSites" :key="site.id" :color="selectedSites === site.id ? 'primary' : ''"
                    filter variant="outlined" :value="site.id" size="small">
                    {{ site.name }}
                  </VChip>
                </VChipGroup>
              </VListItem>
              <VListItem>
                <VBtn @click="handleSearch" block>搜索</VBtn>
              </VListItem>
            </VList>
          </VMenu>
          <VBtn variant="tonal" color="info" class="ms-2 mb-2" @click="handleIgnore">
            <template #prepend>
              <VIcon :icon="isIgnore ? 'mdi-eye-off' : 'mdi-eye'" />
            </template>
            {{ isIgnore ? '取消忽略' : '忽略' }}
          </VBtn>
          <VBtn class="ms-2 mb-2" variant="tonal" @click="handlePlay()">
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
            <v-row>
              <v-col cols="2">
                <v-text-field label="已选" readonly :model-value="selectedCount" variant="plain"></v-text-field>
              </v-col>
              <v-col cols="2">
                <v-text-field label="总剧集" placeholder="未获取到，请手动输入" variant="plain"
                  v-model="addForm.episodes_all"></v-text-field>
              </v-col>
              <v-col cols="2">
                <v-text-field label="季数" placeholder="未获取到，请手动输入" variant="plain"
                  v-model="addForm.season"></v-text-field>
              </v-col>
            </v-row>
          </div>
          <h2 v-if="mediaDetail.overview">简介</h2>
          <p>{{ mediaDetail.overview }}</p>
        </div>

        <div class="media-overview-right">
          <!-- 调整列宽设置为cols="6"，确保小屏幕也能并排显示 -->
          <v-row>
            <!-- 豆瓣ID输入框 -->
            <v-col cols="12" md="12">
              <VTextField v-model="addForm.douban_id" placeholder="请手动输入豆瓣ID" :hint="doubanHint" label="豆瓣 ID"
                variant="outlined" persistent-hint class="max-w-sm mt-1" density="compact"
                append-inner-icon="mdi-magnify" @click:append-inner="onClickDouban">
                <!-- 修复图标绑定逻辑：根据douban_id是否存在动态显示图标 -->
                <template #prepend-inner v-if="addForm.douban_id">
                  <VIcon icon="mdi-cloud-outline" class="cursor-pointer text-lg"
                    @click="addForm.douban_id && openDoubanDetail(addForm.douban_id)" />
                </template>
              </VTextField>
            </v-col>
            <!-- IMDB ID输入框 -->
            <v-col cols="12" md="12">
              <VTextField v-model="addForm.imdb_id" placeholder="请手动输入IMDB ID" hint="如：tt1878011" label="IMDB ID"
                variant="outlined" :loading="isLoading" persistent-hint class="max-w-sm mt-1" density="compact"
                append-inner-icon="mdi-magnify" @click:append-inner="onClickImdb">
                <template #prepend-inner v-if="addForm.imdb_id">
                  <VIcon icon="mdi-cloud-outline" class="cursor-pointer text-lg"
                    @click="addForm.imdb_id && openImdbDetail(addForm.imdb_id)" />
                </template>
              </VTextField>

            </v-col>
          </v-row>
        </div>
      </div>
      <div class="media-overview-bottom">
        <div class="mt-6">
          <v-row>
            <!-- 豆瓣ID输入框 -->
            <v-col cols="6" md="6">
              <VTextField v-model="addForm.cn_title" placeholder="请手动输入中文标题" hint="如：肖申克的救赎" label="中文标题"
                variant="outlined" :loading="isLoading" persistent-hint class="max-w-sm mt-1" density="compact">
                <!-- 修复图标绑定逻辑：根据douban_id是否存在动态显示图标 -->
                <template #prepend-inner>
                  <VIcon icon="mdi-home-map-marker" class="cursor-pointer text-lg" />
                </template>
              </VTextField>
            </v-col>
            <!-- IMDB ID输入框 -->
            <v-col cols="6" md="6">
              <VTextField v-model="addForm.en_title" :loading="isLoading" placeholder="请手动输入英文标题"
                hint="如：The Shawshank Redemption" label="英文标题" variant="outlined" persistent-hint class="max-w-sm mt-1"
                density="compact">
                <template #prepend-inner>
                  <VIcon icon="mdi-earth" class="cursor-pointer text-lg" />
                </template>
              </VTextField>

            </v-col>
          </v-row>
        </div>
        <div class="mt-6">
          <v-row>
            <!-- 年份输入框 -->
            <v-col cols="6" md="6">
              <VTextField v-model="addForm.year" placeholder="请手动输入年份" hint="如：2025" label="年份" :loading="isLoading"
                variant="outlined" persistent-hint class="max-w-sm mt-1" density="compact">
                <!-- 修复图标绑定逻辑：根据douban_id是否存在动态显示图标 -->
                <template #prepend-inner>
                  <VIcon icon="mdi-calendar" class="cursor-pointer text-lg" />
                </template>
              </VTextField>
            </v-col>
          </v-row>
        </div>
        <div class="mt-6">
          <v-row>
            <!-- 豆瓣ID输入框 -->
            <v-col cols="12" md="12">
              <VTextarea v-model="addForm.sub_title" :loading="isLoading" placeholder="请手动输入副标题"
                hint="根据豆瓣信息自动生成，可以手动修正" label="副标题" rows="3" variant="outlined" persistent-hint class="max-w mt-1"
                density="compact">
              </VTextarea>
            </v-col>
          </v-row>
        </div>
        <div class="mt-6">
          <v-row>
            <!-- 豆瓣ID输入框 -->
            <v-col cols="12" md="12">
              <VTextarea v-model="addForm.overview" :loading="isLoading" placeholder="请手动输入简介"
                hint="如果豆瓣信息里面有简介信息取豆瓣信息，否则从视频网站获取" label="简介" rows="4" variant="outlined" persistent-hint
                class="max-w mt-1" density="compact">
              </VTextarea>
            </v-col>
          </v-row>
        </div>
      </div>
      <div class="media-overview-bottom">
        <div class="mt-6">
          <v-row>
            <v-col cols="4">
              <v-switch v-model="addForm.auto_download" :label="`自动下载`" hide-details>
              </v-switch>
            </v-col>
            <v-col cols="4">
              <v-switch v-model="addForm.auto_publish" :label="`自动发布`" hide-details>
              </v-switch>
            </v-col>
            <v-col cols="4">
              <v-switch v-model="addForm.anon_publish" :label="`匿名发布`" hide-details>
              </v-switch>
            </v-col>
          </v-row>
        </div>
        <div class="mt-6">
          <GroupTile title="采集模式" />
          <VChipGroup column v-model="collectMode">
            <VChip :color="collectMode === 'normal' ? 'primary' : ''" filter variant="outlined" value="normal">
              普通采集
            </VChip>
            <VChip :color="collectMode === 'episode' ? 'primary' : ''" filter variant="outlined" value="episode">
              分集采集
            </VChip>
          </VChipGroup>
          <div v-if="collectMode === 'normal'" class="text-caption text-grey mt-1">
            所有选中剧集作为一个采集任务
          </div>
          <div v-if="collectMode === 'episode'" class="text-caption text-grey mt-1">
            每个选中的剧集创建一个独立的采集任务，便于单独管理
          </div>
        </div>
        <div class="mt-4">
          <v-switch v-model="isReserveCollect" :label="`预约采集`" hide-details color="primary" />
          <div v-if="isReserveCollect" class="mt-3">
            <v-row>
              <v-col cols="6" md="4">
                <VTextField
                  v-model="reserveStartDate"
                  label="预约日期"
                  type="date"
                  variant="outlined"
                  density="compact"
                  :min="new Date().toISOString().split('T')[0]"
                />
              </v-col>
              <v-col cols="6" md="4">
                <VTextField
                  v-model="reserveStartTimeOnly"
                  label="预约时间"
                  type="time"
                  variant="outlined"
                  density="compact"
                />
              </v-col>
            </v-row>
            <div v-if="reserveTimeFormatted" class="text-caption text-primary mt-1">
              任务将在 {{ reserveTimeFormatted }} 自动开始下载
            </div>
          </div>
        </div>
        <div class="mt-6">
          <GroupTile title="清晰度" />
          <VChipGroup column v-model="addForm.defn">
            <template v-for="definition in mediaDetail.definition_list" :key="definition.name">
              <VChip v-if="definitionLabel(definition)" :color="addForm.defn === definition.name ? 'primary' : ''" filter
                variant="outlined" :value="definition.name">
                {{ definitionLabel(definition) }}
              </VChip>
            </template>
          </VChipGroup>
        </div>

        <div class="mt-6">
          <GroupTile title="制作组" />
          <VChipGroup column v-model="addForm.team">
            <template v-for="(teamOption, index) in teamList" :key="index">
              <VChip :color="addForm.team === teamOption.team ? 'primary' : ''" filter variant="outlined"
                :value="teamOption.team">
                {{ teamOption.team }}
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
          <GroupTile title="分类" />
          <VChipGroup column v-model="addForm.cate">
            <template v-for="(value, key) in categoryOptions" :key="key">
              <VChip :color="addForm.cate === key ? 'primary' : ''" filter variant="outlined" :value="key">
                {{ value }}
              </VChip>
            </template>
          </VChipGroup>
        </div>
        <div class="mt-6">
          <GroupTile title="标签" />
          <VChipGroup column v-model="addForm.tags" multiple>
            <template v-for="(value, key) in tagOptions" :key="key">
              <VChip :color="addForm.tags.includes(key) ? 'primary' : ''" filter variant="outlined" :value="key">
                {{ value }}
              </VChip>
            </template>
          </VChipGroup>
        </div>
        <div class="mt-6">
          <GroupTile title="站点" />
          <VChipGroup column v-model="addForm.site_list" multiple>
            <template v-for="(site, index) in siteList" :key="index">
              <VChip :color="addForm.site_list.includes(site.id) ? 'primary' : ''" filter variant="outlined"
                :value="site.id">
                {{ site.name }}
              </VChip>
            </template>
          </VChipGroup>
        </div>
      </div>
      <div v-if="mediaDetail.episode_list" class="relative mt-6">
        <div class="absolute right-0 -top-5 flex gap-2">

          <VBtn v-if="mediaProps.source == 'MgTV'" color="#5865f2" size="x-small" variant="flat"
            @click="toggleMainEpisodes">
            {{ onlyShowMainEpisodes ? '显示所有剧集' : '只看正片' }}
          </VBtn>
          <VBtn color="#5865f2" size="x-small" variant="flat" @click="selectAllEpisodes">
            全选
          </VBtn>
          <VBtn color="#5865f2" size="x-small" variant="flat" @click="invertSelectEpisodes">
            全不选
          </VBtn>
          <VBtn color="#5865f2" size="x-small" variant="flat" @click="autoSetEpisodeNumbers">
            自动设置集数
          </VBtn>
        </div>

        <SlideView>
          <template #content>
            <template v-for="data in mediaDetail.episode_list" :key="data.vid">
              <EpisodeCard v-if="data.show" :episode="data" height="9rem" width="16rem" />
            </template>
          </template>
        </SlideView>
      </div>

    </div>
  </div>
  <!-- 站点资源弹窗 -->
  <SiteSearchDialog v-if="resourceDialog" v-model="resourceDialog" :site="getSelectedSite()"
    :keyword="mediaProps?.title" @close="onSiteResourceDone" />
</template>

<style lang="scss">
.vue-media-back {
  background-image: linear-gradient(180deg,
      rgba(var(--v-theme-background), 0) 50%,
      rgba(var(--v-theme-background), 1) 100%),
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

.media-title>h1 {
  font-size: 1.5rem;
  font-weight: 700;
  line-height: 2rem;
}

@media (width >=1280px) {
  .media-title>h1 {
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

ul.media-crew>li {
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
</style>
