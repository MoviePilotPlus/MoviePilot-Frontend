<script setup lang="ts">
// @ts-nocheck
import { useToast } from 'vue-toastification'
import { useI18n } from 'vue-i18n'

import api from '@/api'
import { tagOptions, mediaCateOptions, categoryOptions } from '@/api/constants'
import type { VideoInfo, CollectCreate, Site, PtgenInfo, VideoEpisode, DoubanCandidate } from '@/api/types'
import GroupTile from '@/components/GroupTitle.vue'
import AppFieldActions, { type FieldAction } from '@/components/AppFieldActions.vue'
import EpisodeCard from '@/components/cards/EpisodeCard.vue'
import VirtualSlideView from '@/components/slide/VirtualSlideView.vue'
import SiteSearchDialog from '@/components/dialog/SiteSearchDialog.vue'
import VideoScreenshotDialog from '@/components/dialog/VideoScreenshotDialog.vue'
import { doneNProgress, startNProgress } from '@/api/nprogress'
import router from '@/router'
import { useGlobalSettingsStore } from '@/stores'

// 组件加载完成
const componentLoaded = ref(false)

// 是否已尝试加载
const hasTriedLoading = ref(false)

// 输入参数
const mediaProps = defineProps({
  source: String,
  mediaid: String,
  vid: String,
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

// 提示框
const $toast = useToast()

// 国际化
const { t } = useI18n()

// 媒体详情
const mediaDetail = ref<VideoInfo>({} as VideoInfo)
// 站点列表
const siteList = ref<Site[]>([])

const ptgen = ref<PtgenInfo>({} as PtgenInfo)

// 查看截图对话框
const showScreenshotDialog = ref(false)
const screenshotCollect = ref<any>({})

// 采集模式选项（label 走词条，随语言切换）
const collectModeOptions = computed<Record<'normal' | 'episode' | 'follow', string>>(() => ({
  normal: t('collectVideo.modeNormal'),
  episode: t('collectVideo.modeEpisode'),
  follow: t('collectVideo.modeFollow'),
}))

// 采集模式（三选一）
const collectMode = ref<'normal' | 'episode' | 'follow'>('normal')

// 吸底提交条的采集模式摘要文案
const collectModeLabel = computed(() => collectModeOptions.value[collectMode.value])

// 是否预约采集（开关，仅普通和分集采集可用）
const isReserveCollect = ref(false)

// 预约时间
const reserveStartTime = ref<string | null>(null)
const reserveStartDate = ref<string | null>(null)
const reserveStartTimeOnly = ref<string | null>(null)

// 追更配置
const followConfig = ref({
  startEpisode: 1,
  totalEpisodes: null as number | null,
  checkStartTime: '18:00',
  checkEndTime: '22:00',
  checkIntervalMin: 5,
  checkIntervalMax: 30,
})

// 生成预约时间字符串
const reserveTimeFormatted = computed(() => {
  if (reserveStartDate.value && reserveStartTimeOnly.value) {
    return `${reserveStartDate.value} ${reserveStartTimeOnly.value}:00`
  }
  return null
})

// 监听采集模式变化，自动选中/取消分集标签
watch(collectMode, newMode => {
  if (newMode === 'episode') {
    // 分集采集时自动选中分集标签
    if (!addForm.value.tags.includes('Episode')) {
      addForm.value.tags.push('Episode')
    }
  } else {
    // 非分集采集时移除分集标签
    const index = addForm.value.tags.indexOf('Episode')
    if (index > -1) {
      addForm.value.tags.splice(index, 1)
    }
  }
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

// 总集数小于已选集数时的即时提示（提交校验前移到输入框）
const episodesAllError = computed(() => {
  const total = Number(addForm.value.episodes_all)
  if (!total || total <= 0) return ''
  if (total < selectedCount.value) return t('collectVideo.episodesAllLessThanSelected', { total, selected: selectedCount.value })
  return ''
})

const selectedEpisode = computed(() => {
  const selectedEpisodes: VideoEpisode[] = []
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

// 清晰度条目（definition_list 元素；fs=视频流字节数）
interface DefinitionInfo {
  name?: string
  cname?: string
  sname?: string
  fs?: number
}

// CollectCreate 扩展（selected_audio_tracks 提交字段）
interface CollectForm {
  selected_audio_tracks?: string[] | null
}

function definitionLabel(definition: DefinitionInfo) {
  const label = definition?.sname || definition?.cname || definition?.name || ''
  // 拼接视频流大小（fs 字节；能拿到时展示，如「超高清SDR (4.3G)」）
  const fs = Number(definition?.fs) || 0
  if (label && fs > 0) {
    const gb = fs / 1024 / 1024 / 1024
    return `${label} (${gb >= 1 ? gb.toFixed(2) + 'G' : (fs / 1024 / 1024).toFixed(0) + 'M'})`
  }
  return label
}

// 独立音频轨勾选（默认全选；源无独立音轨时隐藏整组）
const audioTrackOptions = computed<{ name: string, track?: string, fs?: number }[]>(() => {
  const tracks = (mediaDetail.value as VideoInfo)?.audio_tracks
  return Array.isArray(tracks) ? tracks.filter((t): t is { name: string } => !!t?.name) : []
})
const selectedAudioTracks = ref<string[]>([])
watch(audioTrackOptions, (opts) => {
  if (opts.length > 0) selectedAudioTracks.value = opts.map(t => t.name)
}, { immediate: true })

function optionLabel(option: any) {
  return option?.label || option?.name || option?.value || ''
}

const isYoukuSource = computed(() => mediaProps.source === 'YouKu' || mediaProps.source === 'youku')
// 帧享影院技术参数（来自 bluray detail show 节点，直接展示）
const blurayTechInfo = computed(() => {
  const d = mediaDetail.value || {}
  return {
    frameRate: d.bluray_frame_rate || '',
    bitRate: d.bluray_bit_rate || '',
    capacity: d.bluray_capacity || '',
    resolution: d.bluray_resolution || '',
    hqIcons: d.bluray_hq_icons || [],
  }
})

const youkuVideoQualityOptions = computed(() => {
  const options = mediaDetail.value.video_quality_options || []
  if (Array.isArray(options)) return options
  return options.default || Object.values(options)[0] || []
})

const hasYoukuVideoQualityOptions = computed(() => {
  return isYoukuSource.value && youkuVideoQualityOptions.value.length > 0
})

function resetYoukuQualitySelection() {
  if (!hasYoukuVideoQualityOptions.value) return
  const videoOptions = youkuVideoQualityOptions.value
  if (videoOptions.length > 0) {
    addForm.value.defn = videoOptions[0].value
  }
}

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
  year: '',
  type: mediaProps.type ?? '',
  overview: '',
  season: 1,
  cate: 'TV',
  site: '',
  cover: '',
  poster: '',
  episodes_all: 1,
  copyright: 'NoGroup',
  team: 'NoGroup',
  auto_download: true,
  auto_publish: true,
  anon_publish: true,
  source: 'WEB-DL',
  tags: [],
  episode_list: [],
  site_list: [],
})
// 调用API查询详情
// 加载制作组数据
async function loadTeamOptions() {
  try {
    const result: { [key: string]: any } = await api.get('system/setting/TEAM_PARAMS')
    teamList.value = result?.value ?? []
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
  if (!mediaProps.mediaid || !mediaProps.type) return
  try {
    mediaDetail.value = await api.get(`${mediaProps.source?.toLowerCase()}/detail`, {
      params: {
        cid: mediaProps.mediaid,
        vid: mediaProps.vid || '',
      },
    })
    componentLoaded.value = true
    // 标题携带季数形态（贝贝彬 第四季/第4季/第二季）时自动填入季数表单——
    // 豆瓣/PTGen 能解析到季时以其为准（getPtgen 回填会覆盖）
    const parsedSeason = parseSeasonFromTitle(
      mediaDetail.value.title || mediaProps.title || '')
    if (parsedSeason > 1) {
      addForm.value.season = parsedSeason
    }
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
    if (hasYoukuVideoQualityOptions.value) {
      resetYoukuQualitySelection()
    } else if (mediaDetail.value.definition_list?.length > 0) {
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
      ? Math.max(Number(mediaDetail.value.episode_all), episodeListLength) // 取较大值
      : episodeListLength // 无episode_all时使用列表长度
    if (addForm.value.episodes_all == 1) {
      addForm.value.type = 'Movie'
    }
    // 新增：当剧集数等于列表长度时添加Completed标签
    if (addForm.value.episodes_all > 1 && addForm.value.episodes_all == mediaDetail.value.episode_list?.length) {
      addForm.value.tags.push('Completed')
    }
    // 默认选中中字、官方标签
    addForm.value.tags.push('ChineseSubtitles')
    addForm.value.tags.push('Official')
    // 检测可用音轨语言，自动选标签并生成音轨说明
    const audioLangs = (mediaDetail.value as any).audio_languages || []
    if (audioLangs.includes('mandarin') && !addForm.value.tags.includes('Mandarin')) {
      addForm.value.tags.push('Mandarin')
    }
    if (audioLangs.includes('cantonese') && !addForm.value.tags.includes('Cantonese')) {
      addForm.value.tags.push('Cantonese')
    }
    if (audioLangs.includes('japanese') && !addForm.value.tags.includes('Japanese')) {
      addForm.value.tags.push('Japanese')
    }
    if (audioLangs.includes('korean') && !addForm.value.tags.includes('Korean')) {
      addForm.value.tags.push('Korean')
    }
    ;(addForm.value as any).audio_languages = audioLangs
    // 自动填入追更配置的总集数
    followConfig.value.totalEpisodes = addForm.value.episodes_all

    // 加载制作组数据
    await loadTeamOptions()
    if (mediaDetail.value.douban_id) {
      const douban_url = `https://movie.douban.com/subject/${mediaDetail.value.douban_id}/`
      getPtgen(douban_url)
    } else {
      isLoading.value = false
    }
  } catch (error) {
    console.error('加载媒体详情失败:', error)
    $toast.error(t('collectVideo.detailLoadFailed'))
    isLoading.value = false
  } finally {
    // 成功/失败统一结束加载态，避免永久转圈
    isRefreshed.value = true
    componentLoaded.value = true
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

/** ID 字段尾部的操作按钮组（获取信息 / 打开详情页） */
function idFieldActions(kind: 'douban' | 'imdb' | 'tmdb' | 'bangumi'): FieldAction[] {
  if (kind === 'douban') {
    return [
      { key: 'fetch', icon: 'mdi-magnify', label: t('collectVideo.actionFetch'), title: t('collectVideo.actionFetchDouban'), disabled: !addForm.value.douban_id, onClick: onClickDouban },
      {
        key: 'open',
        icon: 'mdi-cloud-outline',
        label: t('collectVideo.actionOpen'),
        title: t('collectVideo.actionOpenDouban'),
        disabled: !addForm.value.douban_id,
        onClick: () => addForm.value.douban_id && openDoubanDetail(addForm.value.douban_id),
      },
    ]
  }
  if (kind === 'imdb') {
    return [
      { key: 'fetch', icon: 'mdi-magnify', label: t('collectVideo.actionFetch'), title: t('collectVideo.actionFetchImdb'), disabled: !addForm.value.imdb_id, onClick: onClickImdb },
      {
        key: 'open',
        icon: 'mdi-cloud-outline',
        label: t('collectVideo.actionOpen'),
        title: t('collectVideo.actionOpenImdb'),
        disabled: !addForm.value.imdb_id,
        onClick: () => addForm.value.imdb_id && openImdbDetail(addForm.value.imdb_id),
      },
    ]
  }
  if (kind === 'tmdb') {
    return [
      {
        key: 'open',
        icon: 'mdi-cloud-outline',
        label: t('collectVideo.actionOpen'),
        title: t('collectVideo.actionOpenTmdb'),
        disabled: !addForm.value.tmdb_id,
        onClick: () => addForm.value.tmdb_id && openTmdbDetail(addForm.value.tmdb_id),
      },
    ]
  }
  return [
    {
      key: 'open',
      icon: 'mdi-cloud-outline',
      label: t('collectVideo.actionOpen'),
      title: t('collectVideo.actionOpenBangumi'),
      disabled: !addForm.value.bangumi_id,
      onClick: () => addForm.value.bangumi_id && openBangumiDetail(addForm.value.bangumi_id),
    },
  ]
}
async function getPtgen(url: string) {
  try {
    ptgen.value = (await api.get('collect/ptgen/info?url=' + url)) as PtgenInfo
    addForm.value.en_title = ptgen.value.en_title
    addForm.value.cn_title = ptgen.value.cn_title || mediaDetail.value.title
    addForm.value.sub_title = ptgen.value.sub_title
    addForm.value.imdb_id = ptgen.value.imdb_id || ''
    addForm.value.tmdb_id = ptgen.value.tmdb_id || ''
    addForm.value.bangumi_id = ptgen.value.bangumi_id || ''
    addForm.value.season = ptgen.value.season || 1
    // 后端返回 overview，兼容 description 字段
    addForm.value.overview =
      ptgen.value.overview || ptgen.value.description || mediaDetail.value.overview || ''
    // 左栏「简介」段落与表单同步刷新（切换豆瓣候选后页面级信息跟着变）
    mediaDetail.value.overview = addForm.value.overview
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

// 合并检查媒体状态（已采集、已忽略、已追更）
async function handleCheckStatus() {
  try {
    const result: { [key: string]: any } = await api.get(
      `collect/status/${mediaProps?.source}/${mediaProps?.mediaid}`,
      {
        params: {},
        feedback: 'silent',
      },
    )

    if (result) {
      isExists.value = result.exists
      isIgnore.value = result.ignored
      isFollowed.value = result.followed
    }
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
          poster: episode.image_url,
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
    // 独立音频轨勾选：null=源无独立音轨或用户未改（全部）；数组=勾选子集
    ;(addForm.value as CollectForm).selected_audio_tracks = audioTrackOptions.value.length > 0
      ? [...selectedAudioTracks.value]
      : null
    // 提交前检查参数
    console.log(addForm.value)

    if (!validateForm()) return

    // 检查预约时间（仅普通和分集采集）
    if (
      (collectMode.value === 'normal' || collectMode.value === 'episode') &&
      isReserveCollect.value &&
      !reserveTimeFormatted.value
    ) {
      $toast.error(t('collectVideo.reserveTimeRequired'))
      return
    }

    // 检查追更配置（仅追更采集）
    if (collectMode.value === 'follow') {
      if (!followConfig.value.startEpisode || followConfig.value.startEpisode < 1) {
        $toast.error(t('collectVideo.startEpisodeInvalid'))
        return
      }
    }

    // 调用接口添加采集任务
    startNProgress()

    // 根据采集模式选择不同的API
    if (collectMode.value === 'follow') {
      // 追更采集：创建追更任务
      await api.post('follow/', {
        cid: addForm.value.cid,
        site: addForm.value.site,
        defn: addForm.value.defn,
        cn_title: addForm.value.cn_title,
        en_title: addForm.value.en_title,
        original_title: addForm.value.original_title,
        year: addForm.value.year,
        season: addForm.value.season ? String(addForm.value.season) : null,
        sub_title_template: addForm.value.sub_title,
        douban_id: addForm.value.douban_id,
        imdb_id: addForm.value.imdb_id,
        team: addForm.value.team,
        copyright: addForm.value.copyright,
        tags: addForm.value.tags,
        site_list: addForm.value.site_list,
        poster: addForm.value.poster,
        cover: addForm.value.cover,
        total_episodes: followConfig.value.totalEpisodes ? Number(followConfig.value.totalEpisodes) : null,
        start_episode: followConfig.value.startEpisode,
        check_start_time: followConfig.value.checkStartTime,
        check_end_time: followConfig.value.checkEndTime,
        check_interval_min: followConfig.value.checkIntervalMin,
        check_interval_max: followConfig.value.checkIntervalMax,
        auto_download: addForm.value.auto_download,
        auto_publish: addForm.value.auto_publish,
        anon_publish: addForm.value.anon_publish,
      })
    } else if (collectMode.value === 'episode') {
      // 分集采集：每个剧集创建独立的采集任务
      const baseData = {
        ...addForm.value,
        isReserved: isReserveCollect.value,
        reserveStartTime: isReserveCollect.value ? reserveTimeFormatted.value : null,
        collect_mode: 'episode',
      }
      await api.post('collect/episode', baseData)
    } else {
      // 普通采集
      const baseData = {
        ...addForm.value,
        isReserved: isReserveCollect.value,
        reserveStartTime: isReserveCollect.value ? reserveTimeFormatted.value : null,
      }
      await api.post('collect/', baseData)
    }

    // 添加采集任务成功
    if (collectMode.value === 'follow') {
      router.push({ path: '/follow' })
    } else {
      router.push({ path: '/task' })
    }
    isExists.value = true
  } catch (error: any) {
    console.error(error)
    const modeText = collectMode.value === 'follow' ? t('collectVideo.followTask') : t('collectVideo.collectTask')
    showCollectAddToast(false, mediaDetail.value?.title ?? '', error?.message ?? '', modeText)
  }
  doneNProgress()
}
function fill_subtile(sub_tile: string, title: string) {
  if (!sub_tile) return sub_tile
  if (!title) return sub_tile
  // 分割标题和其他信息
  const [originalTitle, ...restParts] = sub_tile.split('|').map(p => p.trim())
  // 检查原图标题是否包含新标题
  if (!originalTitle.includes(title)) {
    // 合并新旧标题
    const mergedTitle = `${title}/${originalTitle}`
    // 重组完整sub_title
    return [mergedTitle, ...restParts].join(' | ')
  }

  // 保持原标题格式不变
  return sub_tile
}
// 中文季数数字（一二三…十、廿等支持到 99 以内的常见形态）
const CN_SEASON_DIGITS: Record<string, number> = {
  零: 0, 一: 1, 二: 2, 三: 3, 四: 4, 五: 5, 六: 6, 七: 7, 八: 8, 九: 9,
}
/** 从标题解析季数：第N季/第N部（阿拉伯或中文数字），未命中返回 1。 */
function parseSeasonFromTitle(title: string): number {
  if (!title) return 1
  const match = title.match(/第\s*([0-9一二三四五六七八九十]+)\s*[季部]/)
  if (!match) return 1
  const raw = match[1]
  if (/^[0-9]+$/.test(raw)) return Number(raw)
  // 中文数字：十/十X/X十/X十Y 四段形态
  if (raw === '十') return 10
  const complex = raw.match(/^([一二三四五六七八九]?)十([一二三四五六七八九]?)$/)
  if (complex) {
    const tens = CN_SEASON_DIGITS[complex[1] ?? ''] ?? 1
    const ones = CN_SEASON_DIGITS[complex[2] ?? ''] ?? 0
    return tens * 10 + ones
  }
  if (CN_SEASON_DIGITS[raw] !== undefined) return CN_SEASON_DIGITS[raw]
  return 1
}
// 表单校验
function validateForm() {
  // 清空旧数据
  const errors = []

  if (!addForm.value.cid) {
    errors.push(t('collectVideo.errMediaIdRequired'))
  }
  if (hasYoukuVideoQualityOptions.value) {
    if (!addForm.value.defn) {
      errors.push(t('collectVideo.errQualityRequired'))
    }
  } else if (!addForm.value.defn) {
    errors.push(t('collectVideo.errDefinitionRequired'))
  }
  if (!addForm.value.cate) {
    errors.push(t('collectVideo.errCateRequired'))
  }
  if (!addForm.value.cn_title) {
    errors.push(t('collectVideo.errCnTitleRequired'))
  }
  if (!addForm.value.en_title) {
    errors.push(t('collectVideo.errEnTitleRequired'))
  }
  if (!addForm.value.sub_title) {
    errors.push(t('collectVideo.errSubTitleRequired'))
  }
  if (!mediaDetail.value.episode_list?.some(e => e.selected)) {
    errors.push(t('collectVideo.errEpisodeRequired'))
  }
  // 分离音轨源（优酷帧享等）视频流无内嵌音，至少勾一条，否则成片无声
  if (audioTrackOptions.value.length > 0 && selectedAudioTracks.value.length === 0) {
    errors.push(t('collectVideo.errAudioTrackRequired'))
  }

  // 新增：校验选中剧集的集数必须为数字且不重复
  const selectedEpisodes = mediaDetail.value.episode_list?.filter(ep => ep.selected) || []
  if (selectedEpisodes.length > 0) {
    const episodeNumbers = selectedEpisodes.map(ep => ep.episode)

    // 校验是否全为数字
    const nonNumberEpisodes = episodeNumbers.filter(num => typeof num !== 'number' || isNaN(num))
    if (nonNumberEpisodes.length > 0) {
      errors.push(t('collectVideo.errEpisodeNotNumber'))
    }

    // 校验是否有重复
    const uniqueNumbers = new Set(episodeNumbers)
    if (uniqueNumbers.size !== episodeNumbers.length) {
      errors.push(t('collectVideo.errEpisodeDuplicated'))
    }
    // 新增：校验集数必须大于0
    const invalidNumbers = episodeNumbers.filter(num => num <= 0)
    if (invalidNumbers.length > 0) {
      errors.push(t('collectVideo.errEpisodeNonPositive'))
    }
  }

  // if (addForm.value.site_list.length === 0) {
  //   errors.push('请至少选择一个站点！')
  // }

  // if (!addForm.value.douban_id && !addForm.value.imdb_id) {
  //   errors.push('豆瓣ID或者IMDBID需要至少需输入一个！')
  // }

  if (!addForm.value.episodes_all) {
    errors.push(t('collectVideo.errEpisodesAllRequired'))
  }

  if (addForm.value.episodes_all < selectedCount.value) {
    errors.push(t('collectVideo.errEpisodesAllLessThanSelected'))
  }

  if (errors.length > 0) {
    errors.forEach(msg => $toast.error(msg))
    return false
  }
  return true
}
// 弹出添加订阅提示（modeText 已由调用方按模式传入词条文案）
function showCollectAddToast(result: boolean, title: string, message: string, modeText?: string) {
  if (!result) $toast.error(t('collectVideo.addTaskFailed', { title, mode: modeText ?? t('collectVideo.collectTask'), message }))
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

// 豆瓣候选列表（douban_list 全量 + 当前 douban_info 高亮），供人工核对/一键修正
const doubanCandidates = computed<DoubanCandidate[]>(() => {
  const detail = mediaDetail.value as any
  const list: DoubanCandidate[] = Array.isArray(detail?.douban_list) ? detail.douban_list : []
  const current = detail?.douban_info
  // 当前选中项也在候选里补进头部（douban_list 有时不含已选条目）
  if (current?.id && !list.some(item => String(item.id) === String(current.id))) {
    return [current, ...list]
  }
  return list
})

function isCurrentDouban(item: DoubanCandidate): boolean {
  // 选中态跟表单走（addForm.douban_id 初始即 mediaDetail.douban_id，点选后实时更新）；
  // 只看 douban_info 会一直钉在自动匹配的那条上（2026-09-20 实录）
  const selectedId = addForm.value.douban_id || (mediaDetail.value as any)?.douban_info?.id
  return !!selectedId && String(item.id) === String(selectedId)
}

// 一键改选豆瓣候选：更新表单 ID 并重新拉取简介
function selectDoubanCandidate(item: DoubanCandidate) {
  if (!item.id || isCurrentDouban(item)) return
  addForm.value.douban_id = String(item.id)
  // 页面级关联信息同步：doubanHint（ID 框下方提示）、顶部 card_subtitle 等
  // 都从 mediaDetail.douban_info 读取，不跟着改的话切完候选页面仍是旧条目
  mediaDetail.value.douban_id = String(item.id)
  mediaDetail.value.douban_info = { ...(mediaDetail.value.douban_info ?? {}), ...item }
  onClickDouban()
}

const doubanHint = computed(() => {
  if (mediaDetail.value.douban_id) {
    return `${mediaDetail.value.douban_info.title}(${mediaDetail.value.douban_info.year})`
  } else {
    return t('collectVideo.doubanIdHint')
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

// 在线播放链接：仅腾讯/芒果有确定的详情页 URL 规则，其余来源不展示按钮
const playUrl = computed(() => {
  if (!mediaProps.mediaid) return ''
  if (mediaProps.source === 'MgTV') return `https://www.mgtv.com/b/${mediaProps.mediaid}.html`
  if (mediaProps.source === 'Tencent') return `https://v.qq.com/x/cover/${mediaProps.mediaid}.html`
  return ''
})

// 跳转播放页面
function handlePlay() {
  if (playUrl.value) window.open(playUrl.value, '_blank')
}

onBeforeMount(() => {
  handleCheckStatus()
  getMediaDetail()
  getSites()
})
function update_subtitle() {
  // 集数表述（全N集/第N集）是发布副标题的产物内容，面向中文 PT 站，不随界面语言切换
  let name = ''
  let play_title = ''
  let full_play_sub_title = ''
  if (addForm.value.episodes_all > 1) {
    if (addForm.value.episodes_all == selectedCount.value) {
      name = `全${addForm.value.episodes_all}集`
    } else if (selectedCount.value == 1) {
      full_play_sub_title = selectedEpisode.value[0]?.full_play_sub_title || ''
      if (mediaProps.source == 'MgTV') {
        play_title = selectedEpisode.value[0]?.play_title || ''
      } else {
        console.log(selectedEpisode.value)
        name = `第${selectedEpisode.value[0]?.episode || 1}集`
      }
    } else {
      const selectedEpisodes = mediaDetail.value.episode_list?.filter(ep => ep.selected) || []
      const episodes = selectedEpisodes.map(e => e.episode).sort((a, b) => a - b)

      let isConsecutive = true
      for (let i = 1; i < episodes.length; i++) {
        if (episodes[i] - episodes[i - 1] !== 1) {
          isConsecutive = false
          break
        }
      }

      if (isConsecutive) {
        name = `第${episodes[0]}集-第${episodes[episodes.length - 1]}集`
      } else {
        name = episodes.map(e => `第${e}集`).join('、')
      }
    }
  }
  if (ptgen.value.sub_title) {
    const subTitleParts = ptgen.value.sub_title.split(' | ')
    if (full_play_sub_title) {
      subTitleParts.splice(1, 0, full_play_sub_title) // 在第二位插入full_play_sub_title
    }
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

  // 在末尾追加音轨说明
  const audioLangs = ((addForm.value as any).audio_languages as string[]) || []
  if (audioLangs.length > 0) {
    const langMap: Record<string, { short: string; full: string }> = {
      mandarin: { short: '国', full: '国语' },
      cantonese: { short: '粤', full: '粤语' },
      english: { short: '英', full: '英语' },
      japanese: { short: '日', full: '日语' },
      korean: { short: '韩', full: '韩语' },
      french: { short: '法', full: '法语' },
      german: { short: '德', full: '德语' },
      spanish: { short: '西', full: '西班牙语' },
      italian: { short: '意', full: '意大利语' },
      portuguese: { short: '葡', full: '葡萄牙语' },
      russian: { short: '俄', full: '俄语' },
      thai: { short: '泰', full: '泰语' },
      turkish: { short: '土', full: '土耳其语' },
      swedish: { short: '瑞', full: '瑞典语' },
    }
    const known = audioLangs.map(l => langMap[l]).filter(Boolean)
    if (known.length === 1) {
      addForm.value.sub_title = addForm.value.sub_title + ` | ${known[0].full}音轨`
    } else if (known.length > 1) {
      addForm.value.sub_title = addForm.value.sub_title + ` | [${known.map(l => l.short).join('/')}]音轨`
    }
  }
}
watch(
  () => [addForm.value.episodes_all, mediaDetail.value.episode_list?.map(ep => ep.episode), selectedCount],
  () => {
    update_subtitle()
  },
  { deep: true, immediate: true },
)

// 自动设置选中剧集的自增编号，未选中的清空
function autoSetEpisodeNumbers() {
  const allEpisodes = mediaDetail.value.episode_list || []
  if (allEpisodes.length === 0) {
    $toast.warning(t('collectVideo.warnNoEpisodeList'))
    return
  }

  // 先清空所有未选中或隐藏剧集的编号
  allEpisodes.forEach(ep => {
    if (!ep.selected || !ep.show) ep.episode = 0 // 或根据实际需求设置为 null/0 等空值
  })

  // 再处理选中剧集的自增编号
  const selectedEpisodes = allEpisodes.filter(ep => ep.selected && ep.show)
  if (selectedEpisodes.length === 0) {
    $toast.warning(t('collectVideo.warnNoSelectedForNumbering'))
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
    $toast.warning(t('collectVideo.warnNoEpisodeList'))
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
    $toast.warning(t('collectVideo.warnNoEpisodeList'))
    return
  }

  allEpisodes.forEach(ep => {
    ep.selected = false
  })
}
// 打开豆瓣详情页
function openDoubanDetail(doubanId: string) {
  if (!doubanId) {
    $toast.warning(t('collectVideo.warnDoubanIdMissing'))
    return
  }
  window.open(`https://movie.douban.com/subject/${doubanId}/`, '_blank')
}

function openImdbDetail(imdbId: string) {
  if (!imdbId) {
    $toast.warning(t('collectVideo.warnImdbIdMissing'))
    return
  }
  window.open(`https://www.imdb.com/title/${imdbId}/`, '_blank')
}

function openTmdbDetail(tmdbId: string) {
  if (!tmdbId) {
    $toast.warning(t('collectVideo.warnTmdbIdMissing'))
    return
  }
  // 优先使用 PTGen 返回的 TMDB 链接（已区分电影/剧集），否则按当前分类拼接
  let link = ptgen.value.tmdb_link
  if (!link) {
    const tmdbType = addForm.value.type === 'Movie' ? 'movie' : 'tv'
    link = `https://www.themoviedb.org/${tmdbType}/${tmdbId}`
  }
  window.open(link, '_blank')
}

function openBangumiDetail(bangumiId: string) {
  if (!bangumiId) {
    $toast.warning(t('collectVideo.warnBangumiIdMissing'))
    return
  }
  window.open(`https://bangumi.tv/subject/${bangumiId}`, '_blank')
}

// 资源浏览弹窗
const resourceDialog = ref(false)
// 本地存在状态
const isExists = ref(false)

// 追更状态
const isFollowed = ref(false)

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
      // 恢复上次选择的站点（找不到时回退第一个）
      const lastSiteId = Number(localStorage.getItem('collect_search_last_site'))
      selectedSites.value = allSites.value.some(item => item.id === lastSiteId)
        ? lastSiteId
        : allSites.value[0].id
    }
  } catch (error) {
    console.log(error)
  }
}
// 选中站点变化时记住选择（三个采集搜索入口共用同一 key）
watch(selectedSites, (val) => {
  if (val)
    localStorage.setItem('collect_search_last_site', String(val))
})
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
    await api.delete(`collect/ignore/${mediaProps?.source}/${mediaProps?.mediaid}`)

    isIgnore.value = false
    $toast.success(t('collectVideo.unignoredToast', { title: mediaProps?.title }))
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
    await api.post(`collect/ignore/${mediaProps?.source}/${mediaProps?.mediaid}`)

    isIgnore.value = true
    $toast.success(t('collectVideo.ignoredToast', { title: mediaProps?.title }))
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
            <span
              v-if="isExists"
              class="mr-2 mb-2 px-2 inline-flex text-xs leading-5 font-semibold rounded-full whitespace-nowrap transition !no-underline bg-green-500 bg-opacity-80 border border-green-500 !text-green-100 hover:bg-green-500 hover:bg-opacity-100 false overflow-hidden"
            >
              <div class="relative z-20 flex items-center false"><span>{{ t('collectVideo.statusCollected') }}</span></div>
            </span>
            <span
              v-if="isFollowed"
              class="mr-2 mb-2 px-2 inline-flex text-xs leading-5 font-semibold rounded-full whitespace-nowrap transition !no-underline bg-orange-500 bg-opacity-80 border border-orange-500 !text-orange-100 hover:bg-orange-500 hover:bg-opacity-100 false overflow-hidden"
            >
              <div class="relative z-20 flex items-center false"><span>{{ t('collectVideo.statusFollowing') }}</span></div>
            </span>
            <span
              v-if="!isFollowed && isIgnore"
              class="mr-2 mb-2 px-2 inline-flex text-xs leading-5 font-semibold rounded-full whitespace-nowrap transition !no-underline bg-gray-500 bg-opacity-80 border border-gray-500 !text-green-100 hover:bg-green-500 hover:bg-opacity-100 false overflow-hidden"
            >
              <div class="relative z-20 flex items-center false"><span>{{ t('collectVideo.statusIgnored') }}</span></div>
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
            <span v-if="mediaDetail.douban_info && mediaDetail.douban_info.card_subtitle" class="mx-1"> | </span>
            <span v-if="mediaDetail.douban_info && mediaDetail.douban_info.card_subtitle">{{
              mediaDetail.douban_info.card_subtitle
            }}</span>
          </span>
          <!-- 帧享影院技术参数（顶部 banner 副标题位置）-->
          <div v-if="blurayTechInfo.resolution || blurayTechInfo.frameRate || blurayTechInfo.bitRate || blurayTechInfo.capacity" class="bluray-tech-badges mt-2">
            <span v-if="blurayTechInfo.resolution" class="bluray-badge">{{ blurayTechInfo.resolution }}</span>
            <span v-if="blurayTechInfo.frameRate" class="bluray-badge">{{ blurayTechInfo.frameRate }}</span>
            <span v-if="blurayTechInfo.bitRate" class="bluray-badge">{{ blurayTechInfo.bitRate }}</span>
            <span v-if="blurayTechInfo.capacity" class="bluray-badge">{{ blurayTechInfo.capacity }}</span>
            <img v-for="(icon, i) in blurayTechInfo.hqIcons" :key="'hq'+i" :src="icon" class="bluray-hq-icon" />
          </div>
        </div>
        <div class="media-actions">
          <VBtn variant="tonal" color="info" class="mb-2" @click="addCollect">
            <template #prepend>
              <VIcon icon="mdi-download-multiple" />
            </template>
            {{ t('collectVideo.actionCollect') }}
          </VBtn>

          <VMenu close-on-content-click max-width="450">
            <template v-slot:activator="{ props }">
              <VBtn v-bind="props" class="ms-2 mb-2" :color="getAddBtnColor" variant="tonal" @click.stop="clickSearch">
                <template #prepend>
                  <VIcon :icon="getAddBtnIcon" />
                </template>
                {{ t('common.search') }}
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
                <VBtn @click="handleSearch" block>{{ t('common.search') }}</VBtn>
              </VListItem>
            </VList>
          </VMenu>
          <VBtn variant="tonal" color="info" class="ms-2 mb-2" @click="handleIgnore">
            <template #prepend>
              <VIcon :icon="isIgnore ? 'mdi-eye-off' : 'mdi-eye'" />
            </template>
            {{ isIgnore ? t('collectVideo.unignore') : t('collectVideo.ignore') }}
          </VBtn>
          <VBtn v-if="playUrl" class="ms-2 mb-2" variant="tonal" @click="handlePlay()">
            <template #prepend>
              <VIcon icon="mdi-play" />
            </template>
            {{ t('collectVideo.playOnline') }}
          </VBtn>
        </div>
      </div>
      <div class="media-overview">
        <div class="media-overview-left">
          <div class="tagline">
            <!-- 已选/总剧集/季数：一行三个紧凑可编辑字段（手机端换行）；
                 总集数小于已选集数时即时提示，不等提交才报错 -->
            <div class="d-flex flex-wrap ga-4 align-start collect-episode-meta">
              <VTextField
                :label="t('collectVideo.selectedCount')"
                readonly
                :model-value="selectedCount"
                variant="outlined"
                density="compact"
                hide-details
                class="collect-meta-field"
                :mobile-layout="false"
              />
              <VTextField
                v-model="addForm.episodes_all"
                :label="t('collectVideo.episodesAll')"
                :placeholder="t('collectVideo.manualInputPlaceholder')"
                type="number"
                variant="outlined"
                density="compact"
                :error-messages="episodesAllError"
                class="collect-meta-field"
                :mobile-layout="false"
              />
              <VTextField
                v-model="addForm.season"
                :label="t('collectVideo.season')"
                :placeholder="t('collectVideo.manualInputPlaceholder')"
                type="number"
                variant="outlined"
                density="compact"
                hide-details
                class="collect-meta-field"
                :mobile-layout="false"
              />
            </div>
          </div>
          <h2 v-if="mediaDetail.overview">{{ t('collectVideo.overview') }}</h2>
          <p>{{ mediaDetail.overview }}</p>
        </div>

        <div class="media-overview-right">
          <!-- 媒体信息分组卡：ID ×4 紧凑竖排，手机端退出窄框适配（ID 属长 token） -->
          <VCard class="collect-form-card mb-4">
            <VCardText>
              <GroupTile :title="t('collectVideo.groupMediaIds')" />
              <VTextField
                v-model="addForm.douban_id"
                :placeholder="t('collectVideo.doubanIdPlaceholder')"
                :hint="doubanHint"
                :label="t('collectVideo.doubanIdLabel')"
                variant="outlined"
                persistent-hint
                density="compact"
                class="mb-3"
                :mobile-layout="false"
              >
                <template #append-inner>
                  <AppFieldActions :actions="idFieldActions('douban')" />
                </template>
              </VTextField>
              <!-- 豆瓣候选：封面/标题/年份，直观人工核对与一键改选（2026-09-20） -->
              <div v-if="doubanCandidates.length" class="douban-candidate-strip mb-3">
                <div
                  v-for="item in doubanCandidates"
                  :key="`${item.id}-${item.year}`"
                  class="douban-candidate"
                  :class="{ 'douban-candidate--active': isCurrentDouban(item) }"
                  :title="`${item.title} (${item.year})${item.card_subtitle ? ' · ' + item.card_subtitle : ''}`"
                  @click="selectDoubanCandidate(item)"
                >
                  <VImg
                    :src="item.cover_url"
                    cover
                    class="douban-candidate__poster"
                    aspect-ratio="2/3"
                  >
                    <template #placeholder>
                      <div class="douban-candidate__placeholder" />
                    </template>
                  </VImg>
                  <div class="douban-candidate__meta">
                    <div class="douban-candidate__title">{{ item.title }}</div>
                    <div class="douban-candidate__year">{{ item.year }}</div>
                  </div>
                  <VIcon
                    v-if="isCurrentDouban(item)"
                    icon="mdi-check-circle"
                    color="success"
                    size="small"
                    class="douban-candidate__check"
                  />
                </div>
              </div>
              <VTextField
                v-model="addForm.imdb_id"
                :placeholder="t('collectVideo.imdbIdPlaceholder')"
                :hint="t('collectVideo.imdbIdHint')"
                :label="t('collectVideo.imdbIdLabel')"
                variant="outlined"
                :loading="isLoading"
                persistent-hint
                density="compact"
                class="mb-3"
                :mobile-layout="false"
              >
                <template #append-inner>
                  <AppFieldActions :actions="idFieldActions('imdb')" />
                </template>
              </VTextField>
              <VTextField
                v-model="addForm.tmdb_id"
                :placeholder="t('collectVideo.tmdbIdPlaceholder')"
                :hint="t('collectVideo.tmdbIdHint')"
                :label="t('collectVideo.tmdbIdLabel')"
                variant="outlined"
                persistent-hint
                density="compact"
                class="mb-3"
                :mobile-layout="false"
              >
                <template #append-inner>
                  <AppFieldActions :actions="idFieldActions('tmdb')" />
                </template>
              </VTextField>
              <VTextField
                v-model="addForm.bangumi_id"
                :placeholder="t('collectVideo.bangumiIdPlaceholder')"
                :hint="t('collectVideo.bangumiIdHint')"
                :label="t('collectVideo.bangumiIdLabel')"
                variant="outlined"
                :loading="isLoading"
                persistent-hint
                density="compact"
                :mobile-layout="false"
              >
                <template #append-inner>
                  <AppFieldActions :actions="idFieldActions('bangumi')" />
                </template>
              </VTextField>
            </VCardText>
          </VCard>
        </div>
      </div>
      <div class="media-overview-bottom">
        <!-- 标题信息分组卡 -->
        <VCard class="collect-form-card mb-4">
          <VCardText>
            <GroupTile :title="t('collectVideo.groupTitles')" />
            <v-row>
              <v-col cols="12" md="6">
                <VTextField
                  v-model="addForm.cn_title"
                  :placeholder="t('collectVideo.cnTitlePlaceholder')"
                  :hint="t('collectVideo.cnTitleHint')"
                  :label="t('collectVideo.cnTitleLabel')"
                  variant="outlined"
                  :loading="isLoading"
                  persistent-hint
                  density="compact"
                  :mobile-layout="false"
                >
                  <template #prepend-inner>
                    <VIcon icon="mdi-home-map-marker" class="cursor-pointer text-lg" />
                  </template>
                </VTextField>
              </v-col>
              <v-col cols="12" md="6">
                <VTextField
                  v-model="addForm.en_title"
                  :loading="isLoading"
                  :placeholder="t('collectVideo.enTitlePlaceholder')"
                  :hint="t('collectVideo.enTitleHint')"
                  :label="t('collectVideo.enTitleLabel')"
                  variant="outlined"
                  persistent-hint
                  density="compact"
                  :mobile-layout="false"
                >
                  <template #prepend-inner>
                    <VIcon icon="mdi-earth" class="cursor-pointer text-lg" />
                  </template>
                </VTextField>
              </v-col>
              <v-col cols="12" md="6">
                <VTextField
                  v-model="addForm.year"
                  :placeholder="t('collectVideo.yearPlaceholder')"
                  :hint="t('collectVideo.yearHint')"
                  :label="t('collectVideo.yearLabel')"
                  :loading="isLoading"
                  variant="outlined"
                  persistent-hint
                  density="compact"
                  :mobile-layout="false"
                >
                  <template #prepend-inner>
                    <VIcon icon="mdi-calendar" class="cursor-pointer text-lg" />
                  </template>
                </VTextField>
              </v-col>
            </v-row>
          </VCardText>
        </VCard>
        <!-- 副标题与简介分组卡（长文本，手机端同样退出窄框适配） -->
        <VCard class="collect-form-card mb-4">
          <VCardText>
            <GroupTile :title="t('collectVideo.groupSubOverview')" />
            <VTextarea
              v-model="addForm.sub_title"
              :loading="isLoading"
              :placeholder="t('collectVideo.subTitlePlaceholder')"
              :hint="t('collectVideo.subTitleHint')"
              :label="t('collectVideo.subTitleLabel')"
              rows="3"
              variant="outlined"
              persistent-hint
              density="compact"
              class="mb-3"
              :mobile-layout="false"
            >
            </VTextarea>
            <VTextarea
              v-model="addForm.overview"
              :loading="isLoading"
              :placeholder="t('collectVideo.overviewPlaceholder')"
              :hint="t('collectVideo.overviewHint')"
              :label="t('collectVideo.overviewLabel')"
              rows="4"
              variant="outlined"
              persistent-hint
              density="compact"
              :mobile-layout="false"
            >
            </VTextarea>
          </VCardText>
        </VCard>
      </div>
      <div class="media-overview-bottom">
        <div class="mt-6">
          <v-row>
            <v-col cols="4">
              <v-switch v-model="addForm.auto_download" :label="t('collectVideo.autoDownload')" hide-details> </v-switch>
            </v-col>
            <v-col cols="4">
              <v-switch v-model="addForm.auto_publish" :label="t('collectVideo.autoPublish')" hide-details> </v-switch>
            </v-col>
            <v-col cols="4">
              <v-switch v-model="addForm.anon_publish" :label="t('collectVideo.anonPublish')" hide-details> </v-switch>
            </v-col>
          </v-row>
        </div>
        <div class="mt-6">
          <GroupTile :title="t('collectVideo.groupCollectMode')" />
          <VChipGroup column v-model="collectMode">
            <VChip :color="collectMode === 'normal' ? 'primary' : ''" filter variant="outlined" value="normal">
              {{ t('collectVideo.modeNormal') }}
            </VChip>
            <VChip :color="collectMode === 'episode' ? 'primary' : ''" filter variant="outlined" value="episode">
              {{ t('collectVideo.modeEpisode') }}
            </VChip>
            <VChip :color="collectMode === 'follow' ? 'primary' : ''" filter variant="outlined" value="follow">
              {{ t('collectVideo.modeFollow') }}
            </VChip>
          </VChipGroup>
          <div v-if="collectMode === 'normal'" class="text-caption text-grey mt-1">{{ t('collectVideo.modeNormalDesc') }}</div>
          <div v-if="collectMode === 'episode'" class="text-caption text-grey mt-1">
            {{ t('collectVideo.modeEpisodeDesc') }}
          </div>
          <div v-if="collectMode === 'follow'" class="text-caption text-grey mt-1">{{ t('collectVideo.modeFollowDesc') }}</div>
        </div>

        <!-- 预约采集选项（普通采集和分集采集可用） -->
        <div v-if="collectMode === 'normal' || collectMode === 'episode'" class="mt-4">
          <v-switch v-model="isReserveCollect" :label="t('collectVideo.reserveCollect')" hide-details color="primary" density="compact" />
          <v-slide-y-transition>
            <div v-if="isReserveCollect" class="mt-4">
              <div class="d-flex align-center ga-3 flex-wrap">
                <VTextField
                  v-model="reserveStartDate"
                  :label="t('collectVideo.reserveDate')"
                  type="date"
                  variant="outlined"
                  density="compact"
                  hide-details
                  :min="new Date().toISOString().split('T')[0]"
                  style="max-inline-size: 180px"
                  class="reserve-date-input"
                />
                <VTextField
                  v-model="reserveStartTimeOnly"
                  :label="t('collectVideo.reserveTime')"
                  type="time"
                  variant="outlined"
                  density="compact"
                  hide-details
                  style="max-inline-size: 150px"
                  class="reserve-time-input"
                />
              </div>
              <div v-if="reserveTimeFormatted" class="text-caption text-primary mt-2">
                <v-icon size="small" class="mr-1">mdi-information-outline</v-icon>
                {{ t('collectVideo.reserveHint', { time: reserveTimeFormatted }) }}
              </div>
            </div>
          </v-slide-y-transition>
        </div>

        <!-- 追更采集配置 -->
        <div v-if="collectMode === 'follow'" class="mt-4">
          <v-row>
            <v-col cols="6" md="4">
              <VTextField
                v-model="followConfig.startEpisode"
                :label="t('collectVideo.followStartEpisode')"
                type="number"
                variant="outlined"
                density="compact"
                :hint="
                  followConfig.startEpisode
                    ? t('collectVideo.followStartFrom', { episode: followConfig.startEpisode })
                    : t('collectVideo.followStartDefault')
                "
                persistent-hint
                min="1"
              />
            </v-col>
            <v-col cols="6" md="4">
              <VTextField
                v-model="followConfig.totalEpisodes"
                :label="t('collectVideo.followTotalEpisodes')"
                type="number"
                variant="outlined"
                density="compact"
                :hint="t('collectVideo.followTotalHint')"
                persistent-hint
                min="1"
              />
            </v-col>
          </v-row>
          <v-row class="mt-2">
            <v-col cols="6" md="4">
              <VTextField
                v-model="followConfig.checkStartTime"
                :label="t('collectVideo.followCheckStart')"
                type="time"
                variant="outlined"
                density="compact"
                hide-details
                class="reserve-time-input"
              />
            </v-col>
            <v-col cols="6" md="4">
              <VTextField
                v-model="followConfig.checkEndTime"
                :label="t('collectVideo.followCheckEnd')"
                type="time"
                variant="outlined"
                density="compact"
                hide-details
                class="reserve-time-input"
              />
            </v-col>
            <v-col cols="6" md="4">
              <VTextField
                v-model="followConfig.checkIntervalMin"
                :label="t('collectVideo.followIntervalMin')"
                type="number"
                variant="outlined"
                density="compact"
                :hint="t('collectVideo.followIntervalMinHint')"
                persistent-hint
                min="1"
              />
            </v-col>
            <v-col cols="6" md="4">
              <VTextField
                v-model="followConfig.checkIntervalMax"
                :label="t('collectVideo.followIntervalMax')"
                type="number"
                variant="outlined"
                density="compact"
                :hint="t('collectVideo.followIntervalMaxHint')"
                persistent-hint
                min="1"
              />
            </v-col>
          </v-row>
          <div class="text-caption text-grey mt-2">
            <v-icon size="small" class="mr-1">mdi-information-outline</v-icon>
            {{ t('collectVideo.followCheckHint') }}
          </div>
        </div>

        <div v-if="hasYoukuVideoQualityOptions" class="mt-6">
          <GroupTile :title="t('collectVideo.groupQuality')" />
          <VChipGroup column v-model="addForm.defn">
            <template v-for="option in youkuVideoQualityOptions" :key="option.value">
              <VChip
                :color="addForm.defn === option.value ? 'primary' : ''"
                filter
                variant="outlined"
                :value="option.value"
              >
                {{ optionLabel(option) }}
              </VChip>
            </template>
          </VChipGroup>
        </div>

        <div v-if="!hasYoukuVideoQualityOptions" class="mt-6">
          <GroupTile :title="t('collectVideo.groupDefinition')" />
          <VChipGroup column v-model="addForm.defn">
            <template v-for="definition in mediaDetail.definition_list" :key="definition.name">
              <VChip
                v-if="definitionLabel(definition)"
                :color="addForm.defn === definition.name ? 'primary' : ''"
                filter
                variant="outlined"
                :value="definition.name"
              >
                {{ definitionLabel(definition) }}
              </VChip>
            </template>
          </VChipGroup>
        </div>

        <div v-if="audioTrackOptions.length > 0" class="mt-6">
          <GroupTile :title="t('collectVideo.groupAudioTracks')" />
          <div class="text-caption text-medium-emphasis mb-2">
            {{ t('collectVideo.audioTracksHint') }}
          </div>
          <VChipGroup column multiple v-model="selectedAudioTracks">
            <VChip
              v-for="track in audioTrackOptions"
              :key="track.name"
              :color="selectedAudioTracks.includes(track.name) ? 'primary' : ''"
              filter
              variant="outlined"
              :value="track.name"
            >
              {{ track.name }}{{ track.track ? ` (${track.track})` : '' }}
            </VChip>
          </VChipGroup>
        </div>

        <div class="mt-6">
          <GroupTile :title="t('collectVideo.groupTeam')" />
          <VChipGroup column v-model="addForm.team">
            <template v-for="(teamOption, index) in teamList" :key="index">
              <VChip
                :color="addForm.team === teamOption.team ? 'primary' : ''"
                filter
                variant="outlined"
                :value="teamOption.team"
              >
                {{ teamOption.team }}
              </VChip>
            </template>
          </VChipGroup>
        </div>
        <div class="mt-6">
          <GroupTile :title="t('collectVideo.groupNamingType')" />
          <VChipGroup column v-model="addForm.type">
            <template v-for="(value, key) in mediaCateOptions" :key="key">
              <VChip :color="addForm.type === key ? 'primary' : ''" filter variant="outlined" :value="key">
                {{ value }}
              </VChip>
            </template>
          </VChipGroup>
        </div>
        <div class="mt-6">
          <GroupTile :title="t('collectVideo.groupCate')" />
          <VChipGroup column v-model="addForm.cate">
            <template v-for="(value, key) in categoryOptions" :key="key">
              <VChip :color="addForm.cate === key ? 'primary' : ''" filter variant="outlined" :value="key">
                {{ value }}
              </VChip>
            </template>
          </VChipGroup>
        </div>
        <div class="mt-6">
          <GroupTile :title="t('collectVideo.groupTags')" />
          <VChipGroup column v-model="addForm.tags" multiple>
            <template v-for="(value, key) in tagOptions" :key="key">
              <VChip :color="addForm.tags.includes(key) ? 'primary' : ''" filter variant="outlined" :value="key">
                {{ value }}
              </VChip>
            </template>
          </VChipGroup>
        </div>
        <div class="mt-6">
          <GroupTile :title="t('collectVideo.groupSites')" />
          <VChipGroup column v-model="addForm.site_list" multiple>
            <template v-for="(site, index) in siteList" :key="index">
              <VChip
                :color="addForm.site_list.includes(site.id) ? 'primary' : ''"
                filter
                variant="outlined"
                :value="site.id"
              >
                {{ site.name }}
              </VChip>
            </template>
          </VChipGroup>
        </div>
      </div>
      <div v-if="mediaDetail.episode_list" class="relative mt-6">
        <div class="absolute right-0 -top-5 flex gap-2">
          <VBtn
            v-if="mediaProps.source == 'MgTV'"
            color="#5865f2"
            size="x-small"
            variant="flat"
            @click="toggleMainEpisodes"
          >
            {{ onlyShowMainEpisodes ? t('collectVideo.showAllEpisodes') : t('collectVideo.mainEpisodesOnly') }}
          </VBtn>
          <VBtn color="#5865f2" size="x-small" variant="flat" @click="selectAllEpisodes"> {{ t('collectVideo.selectAll') }} </VBtn>
          <VBtn color="#5865f2" size="x-small" variant="flat" @click="invertSelectEpisodes"> {{ t('collectVideo.selectNone') }} </VBtn>
          <VBtn color="#5865f2" size="x-small" variant="flat" @click="autoSetEpisodeNumbers"> {{ t('collectVideo.autoNumbering') }} </VBtn>
        </div>

        <VirtualSlideView
          :items="mediaDetail.episode_list"
          :itemWidth="260"
          :loading="!componentLoaded"
          :get-item-key="item => item.vid"
        >
          <template #item="{ item }">
            <EpisodeCard v-if="item.show" :episode="item" height="9rem" width="16rem" />
          </template>
          <template #loading>
            <div v-for="i in 10" :key="i" style="inline-size: 20rem">
              <VCard class="outline-none overflow-hidden">
                <div style="padding-block-end: 55%"></div>
              </VCard>
            </div>
          </template>
        </VirtualSlideView>
      </div>
    </div>
  </div>
  <!-- 吸底提交条：已选摘要 + 添加按钮，长表单滚动到任意位置均可提交 -->
  <div v-if="isRefreshed" class="collect-submit-bar">
    <div class="d-flex align-center flex-wrap ga-2">
      <VChip size="small" variant="tonal" color="primary" label>
        {{ collectModeLabel }} · {{ t('collectVideo.selectedCountShort', { count: selectedCount }) }}
      </VChip>
      <VChip v-if="episodesAllError" size="small" variant="tonal" color="error" label>
        {{ t('collectVideo.episodesAllShort', { count: addForm.episodes_all }) }}
      </VChip>
    </div>
    <VBtn variant="tonal" color="info" @click="addCollect">
      <template #prepend>
        <VIcon icon="mdi-download-multiple" />
      </template>
      {{ t('collectVideo.actionCollect') }}
    </VBtn>
  </div>
  <!-- 站点资源弹窗 -->
  <SiteSearchDialog
    v-if="resourceDialog"
    v-model="resourceDialog"
    :site="getSelectedSite()"
    :keyword="mediaProps?.title"
    @close="onSiteResourceDone"
  />
  <!-- 查看截图弹窗 -->
  <VideoScreenshotDialog
    v-if="showScreenshotDialog"
    v-model="showScreenshotDialog"
    :collect="screenshotCollect"
    @close="showScreenshotDialog = false"
  />
</template>

<style lang="scss">
// 调整浏览器原生的日期/时间选择器图标
.reserve-date-input,
.reserve-time-input {
  ::-webkit-calendar-picker-indicator {
    position: absolute;
    cursor: pointer;
    filter: invert(0.5);
    inset-inline-end: 8px;
  }
}

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
    inline-size: 24rem;
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

/* 已选/总剧集/季数紧凑行：定宽小字段，手机端随 flex-wrap 换行；
   手机端退出「左标签右窄框」适配（:mobile-layout="false"），label 在框上方，
   并压掉适配器残留的 min-block-size 让 label 行紧凑单行 */
.collect-meta-field {
  inline-size: 9rem;
}

@media (max-width: 959.98px) {
  .collect-meta-field {
    inline-size: 8rem;
  }

  /* 适配器即使被退出，其样式的 min-block-size 仍可能残留：压到原生紧凑高度 */
  .collect-meta-field :deep(.app-responsive-input) {
    display: block;
    min-block-size: 0;
    padding-block: 0;
  }

  /* label 不换行：超出省略（手机窄屏下"未获取到，请手动输入"等长 placeholder 已足够提示） */
  .collect-meta-field :deep(.v-label),
  .collect-meta-field :deep(.v-field-label) {
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
    max-inline-size: 100%;
  }
}

/* 表单分组卡：去掉背景与圆角，仅保留分组结构（同页 GroupTile 风格） */
/* 表单分组卡：无背景无圆角（tonal 的底色画在 .v-card__underlay 上，须一并隐藏） */
.collect-form-card {
  border-radius: 0 !important;
  background: transparent;
  box-shadow: none;
}

.collect-form-card :deep(.v-card__underlay) {
  display: none;
}

/* 吸底提交条：滚动全程可提交；毛玻璃底避免文字透出 */
.collect-submit-bar {
  position: sticky;
  inset-block-end: 0.75rem;
  z-index: 5;
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 0.75rem;
  margin-inline: 1rem;
  padding: 0.65rem 1rem;
  border-radius: 0.75rem;
  background: rgba(var(--v-theme-surface), 0.92);
  backdrop-filter: blur(8px);
  box-shadow: 0 2px 12px rgba(0, 0, 0, 0.18);
}

.bluray-tech-info {
  padding: 8px 12px;
  border-radius: 8px;
  background: rgba(var(--v-theme-surface-variant), 0.3);
}
.bluray-tech-chip {
  display: inline-flex;
  align-items: center;
  padding: 2px 8px;
  border-radius: 4px;
  background: rgba(var(--v-theme-primary), 0.1);
  color: rgb(var(--v-theme-primary));
  font-weight: 500;
}
.bluray-tech-badges {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 6px;
}
.bluray-badge {
  display: inline-flex;
  align-items: center;
  padding: 1px 8px;
  border-radius: 10px;
  background: rgba(var(--v-theme-primary), 0.12);
  color: rgb(var(--v-theme-primary));
  font-size: 11px;
  font-weight: 600;
  line-height: 20px;
  white-space: nowrap;
}
.bluray-hq-icon {
  height: 18px;
  width: auto;
  object-fit: contain;
}

/* 豆瓣候选横条：封面/标题/年份，点击改选（2026-09-20） */
.douban-candidate-strip {
  display: flex;
  gap: 8px;
  overflow-x: auto;
  padding-block: 4px;
  max-inline-size: 100%;
}
.douban-candidate {
  position: relative;
  inline-size: 76px;
  flex-shrink: 0;
  cursor: pointer;
  border: 2px solid transparent;
  border-radius: 8px;
  overflow: hidden;
  background: rgba(var(--v-theme-surface-variant), 0.25);
  transition: border-color 0.15s ease;
}
.douban-candidate:hover {
  border-color: rgba(var(--v-theme-primary), 0.6);
}
.douban-candidate--active {
  border-color: rgb(var(--v-theme-primary));
}
.douban-candidate__poster {
  inline-size: 100%;
  aspect-ratio: 2 / 3;
}
.douban-candidate__placeholder {
  inline-size: 100%;
  aspect-ratio: 2 / 3;
  background: rgba(var(--v-theme-surface-variant), 0.4);
}
.douban-candidate__meta {
  position: absolute;
  inset-block-end: 0;
  inset-inline: 0;
  padding: 2px 4px;
  background: linear-gradient(to top, rgba(0, 0, 0, 0.85), transparent);
  color: #fff;
}
.douban-candidate__title {
  font-size: 10px;
  line-height: 14px;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}
.douban-candidate__year {
  font-size: 10px;
  line-height: 13px;
  opacity: 0.85;
}
.douban-candidate__check {
  position: absolute;
  inset-block-start: 2px;
  inset-inline-end: 2px;
  filter: drop-shadow(0 1px 2px rgba(0, 0, 0, 0.6));
}
</style>
