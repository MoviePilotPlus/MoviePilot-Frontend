<script setup lang="ts">
import { ref, computed, onMounted, reactive, provide } from 'vue'
import { useToast } from 'vue-toastification'
import api from '@/api'
import { tagOptions, mediaCateOptions, categoryOptions } from '@/api/constants'
import type { CollectCreate, PtgenInfo } from '@/api/types'
import GroupTile from '@/components/GroupTitle.vue'
import { doneNProgress, startNProgress } from '@/api/nprogress'
import router from '@/router'
import { useUserStore, useGlobalSettingsStore } from '@/stores'

// 输入参数
const mediaProps = defineProps({
  source: String,
  mediaid: String, // cnlid
  title: String,
  cnlid: String,
  name: String, // 频道名称
  livepid: String,
  defn: String,
  programName: String,
  startTime: String,
  endTime: String,
  type: String,
  cate: String,
  isReserved: String,
})

// 提供给子组件的属性
provide('rankingPropsKey', reactive({ ...mediaProps }))

// 全局设置
const globalSettingsStore = useGlobalSettingsStore()
const globalSettings = globalSettingsStore.globalSettings

// 用户 Store
const userStore = useUserStore()

// 提示框
const $toast = useToast()

// 站点列表
const siteList = ref<any[]>([])

// 制作组列表
const teamList = ref<any[]>([])

// 清晰度选项
const definitionOptions = ref<any[]>([
  { name: 'sd', display_name: '标清' },
  { name: 'hd', display_name: '高清' },
  { name: 'fhd', display_name: '超清' },
  { name: '4k', display_name: '4K' }
])

// ptgen信息
const ptgen = ref<PtgenInfo>({} as PtgenInfo)

// 是否已加载完成
const isRefreshed = ref(false)
const isLoading = ref(true)

// 采集任务添加表单
const addForm = ref<CollectCreate>({
  cid: '',
  defn: mediaProps.defn || 'fhd',
  douban_id: '',
  imdb_id: '',
  cn_title: mediaProps.programName || mediaProps.title || '',
  en_title: '',
  sub_title: '',
  original_title: '',
  year: new Date().getFullYear().toString(),
  type: mediaProps.type ?? 'TV',
  overview: `央视频直播节目 - ${mediaProps.name || ''}`,
  season: '1',
  cate: mediaProps.cate ?? 'TV',
  site: '',
  cover: '',
  poster: '',
  episodes_all: '1',
  episode: '',
  issue: '',
  copyright: 'NoGroup',
  team: 'NoGroup',
  auto_download: true,
  auto_publish: true,
  anon_publish: true,
  source: 'WEB-DL',
  tags: [],
  episode_list: [],
  site_list: []
})

// 格式化时间为 datetime-local 格式
function formatDateTimeForInput(dateTimeStr: string): string {
  if (!dateTimeStr) return ''
  try {
    console.log('原始时间字符串:', dateTimeStr)
    
    // 尝试解析为 Date 对象
    let date: Date
    if (dateTimeStr.includes(' ')) {
      // 格式: "2026-03-15 10:30:00"
      const [datePart, timePart] = dateTimeStr.split(' ')
      date = new Date(`${datePart}T${timePart}`)
    } else if (dateTimeStr.includes('T')) {
      // 已经是 ISO 格式
      date = new Date(dateTimeStr)
    } else {
      // 尝试直接解析
      date = new Date(dateTimeStr)
    }
    
    // 检查日期是否有效
    if (isNaN(date.getTime())) {
      console.error('无效的日期:', dateTimeStr)
      return ''
    }
    
    // 格式化为 yyyy-MM-ddTHH:mm
    const year = date.getFullYear()
    const month = String(date.getMonth() + 1).padStart(2, '0')
    const day = String(date.getDate()).padStart(2, '0')
    const hours = String(date.getHours()).padStart(2, '0')
    const minutes = String(date.getMinutes()).padStart(2, '0')
    
    const result = `${year}-${month}-${day}T${hours}:${minutes}`
    console.log('格式化后时间:', result)
    return result
  } catch (e) {
    console.error('时间格式化错误:', e)
    return ''
  }
}

// 央视频专用参数
const liveParams = reactive({
  cnlid: mediaProps.cnlid || mediaProps.mediaid || '',
  channelName: mediaProps.name || '',
  livepid: mediaProps.livepid || '',
  defn: mediaProps.defn || 'fhd',
  startTime: '',
  endTime: '',
  programName: mediaProps.programName || mediaProps.title || '',
  isReserved: mediaProps.isReserved === 'true',
})

// 站点标签
const siteTagOptions = computed(() => {
  return siteList.value.map(item => ({
    label: item.name,
    value: item.name, // 使用站点名称作为值，对应后端的 VideoSite 枚举
  }))
})

// 类型标签
const typeOptions = computed(() => {
  return Object.entries(mediaCateOptions)
    .map(([value, label]) => ({ value, label }))
})

// 分类标签
const categoryOptionsList = computed(() => {
  return Object.entries(categoryOptions)
    .map(([value, label]) => ({ value, label }))
})

// 标签选项
const tagOptionsList = computed(() => {
  return Object.entries(tagOptions).map(([value, label]) => ({ value, label }))
})

// 优化图片 URL，将高度 h/120 替换为 h/9999
function optimizeImageUrl(url: string): string {
  if (!url) return url
  return url.replace(/\/h\/\d+/, '/h/9999')
}

// 计算优化后的图片 URL
const optimizedCoverUrl = computed(() => {
  return optimizeImageUrl(addForm.value.cover)
})

// 解析直播节目名称
function parseLiveProgramTitle(title: string) {
  let cleanTitle = title
  let year = ''
  let episode = ''
  let issue = ''
  let episodesAll = ''

  // 先保存原始标题用于后续匹配
  const originalTitle = title

  console.log('开始解析标题:', originalTitle)

  // 格式1: 岁月有情时23/30（版权原因不可回看）→ 集数23，总集数30
  const epTotalMatch = originalTitle.match(/(\d+)\/(\d+)/)
  if (epTotalMatch) {
    episode = epTotalMatch[1]
    episodesAll = epTotalMatch[2]
    cleanTitle = cleanTitle.replace(epTotalMatch[0], '')
    console.log('匹配到集数/总集数:', { episode, episodesAll })
  }

  // 格式2: 天下同心第15集 → 集数15
  const epMatch = originalTitle.match(/第(\d+)[集期]/)
  if (epMatch && !episode) {
    episode = epMatch[1]
    cleanTitle = cleanTitle.replace(epMatch[0], '')
    console.log('匹配到第X集:', { episode })
  }

  // 格式3: 农耕探文明-2025-20 → 年份2025，期数20
  // 格式4: 生活早参考-特别节目(生活圈)2026-69 → 年份2026，期数69
  // 格式5: 活力·源2026-73 → 年份2026，期数73
  // 格式6: 寰宇视野2025-327 → 年份2025，期数327
  // 格式7: 自然传奇-2026-74 → 年份2026，期数74
  const yearIssueMatch = originalTitle.match(/(\d{4})-(\d+)/)
  if (yearIssueMatch) {
    year = yearIssueMatch[1]
    issue = yearIssueMatch[2]
    cleanTitle = cleanTitle.replace(yearIssueMatch[0], '')
    console.log('匹配到年份-期数:', { year, issue })
  }

  // 只匹配年份
  const yearOnlyMatch = originalTitle.match(/(\d{4})/)
  if (yearOnlyMatch && !year) {
    year = yearOnlyMatch[1]
    cleanTitle = cleanTitle.replace(yearOnlyMatch[0], '')
    console.log('匹配到年份:', { year })
  }

  // 清理标题，去除多余的连字符、括号内容等
  cleanTitle = cleanTitle.replace(/-特别节目\([^)]*\)/, '')
  cleanTitle = cleanTitle.replace(/[（(][^）)]*[）)]/g, '')
  // 处理多个连字符的情况，比如 "自然传奇--" 变成 "自然传奇"
  cleanTitle = cleanTitle.replace(/[-_]+/g, ' ')
  // 最后再去除首尾空格和连字符
  cleanTitle = cleanTitle.trim().replace(/^[-_\s]+|[-_\s]+$/g, '')

  console.log('解析完成:', { cleanTitle, year, episode, issue, episodesAll })

  return {
    cleanTitle,
    year,
    episode,
    issue,
    episodesAll
  }
}

// 加载站点列表
const loadSites = async () => {
  try {
    const sites = await api.get('site/')
    siteList.value = sites.filter((site: any) => site?.is_active === true)
  } catch (error) {
    console.error('加载站点列表失败:', error)
  }
}

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
    teamList.value = [{ team: 'ZimaWeb', copyright: 'Zima' }, { team: 'NoGroup', copyright: 'NoGroup' }]
  }
}

// 处理豆瓣ID输入
function onClickDouban() {
  if (addForm.value.douban_id) {
    isLoading.value = true
    const url = `https://movie.douban.com/subject/${addForm.value.douban_id}/`
    getPtgen(url)
  }
}

// 处理IMDb ID输入
function onClickImdb() {
  if (addForm.value.imdb_id) {
    isLoading.value = true
    const url = `https://www.imdb.com/title/${addForm.value.imdb_id}/`
    getPtgen(url)
  }
}

// 获取PTGen信息
async function getPtgen(url: string) {
  try {
    ptgen.value = await api.get('collect/ptgen/info?url=' + url) as PtgenInfo
    addForm.value.en_title = ptgen.value.en_title
    addForm.value.cn_title = ptgen.value.cn_title || addForm.value.cn_title
    addForm.value.sub_title = ptgen.value.sub_title
    addForm.value.imdb_id = ptgen.value.imdb_id || ''
    addForm.value.season = ptgen.value.season || 1
    // 处理可能为 null 的情况，确保赋值给 addForm.value.overview 的是 string 类型
    addForm.value.overview = ptgen.value.description || addForm.value.overview || ''
    addForm.value.year = ptgen.value.year || addForm.value.year || ''
    isLoading.value = false
    update_subtitle()
  } catch (error) {
    isLoading.value = false
    console.error(error)
  }
}

// 打开豆瓣详情页
function openDoubanDetail(doubanId: string) {
  if (!doubanId) {
    $toast.warning('豆瓣ID不存在，无法打开详情页！')
    return
  }
  window.open(`https://movie.douban.com/subject/${doubanId}/`, '_blank')
}

// 打开IMDb详情页
function openImdbDetail(imdbId: string) {
  if (!imdbId) {
    $toast.warning('IMDB ID不存在，无法打开详情页！')
    return
  }
  window.open(`https://www.imdb.com/title/${imdbId}/`, '_blank')
}

// 更新副标题
function update_subtitle() {
  let additionalInfo = ''
  
  // 构建补充的副标题信息
  if (addForm.value.year) {
    additionalInfo = `${addForm.value.year}年`
  }
  
  if (addForm.value.issue) {
    const issueNum = addForm.value.issue.padStart(3, '0')
    additionalInfo += ` 第${issueNum}期`
  } else if (addForm.value.episode) {
    const epNum = addForm.value.episode.padStart(2, '0')
    additionalInfo += ` 第${epNum}集`
  }
  
  // 如果有补充信息，在原有基础上添加
  if (additionalInfo) {
    if (addForm.value.sub_title) {
      if (!addForm.value.sub_title.includes(additionalInfo)) {
        // 原有副标题存在且不包含补充信息
        // 找到第一个 | 的位置，在标题后面添加补充信息
        const firstPipeIndex = addForm.value.sub_title.indexOf(' | ')
        if (firstPipeIndex !== -1) {
          // 有 |，在第一个 | 后面插入
          const beforePipe = addForm.value.sub_title.substring(0, firstPipeIndex)
          const afterPipe = addForm.value.sub_title.substring(firstPipeIndex)
          addForm.value.sub_title = `${beforePipe} | ${additionalInfo}${afterPipe}`
        } else {
          // 没有 |，在最后添加
          addForm.value.sub_title = `${addForm.value.sub_title} | ${additionalInfo}`
        }
      }
    } else {
      // 原有副标题不存在，直接使用补充信息
      addForm.value.sub_title = additionalInfo
    }
  } else if (ptgen.value.sub_title && !addForm.value.sub_title) {
    // 没有补充信息但有ptgen副标题，使用ptgen的
    addForm.value.sub_title = ptgen.value.sub_title
  }
}

// 填充副标题
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

// 获取直播节目豆瓣信息
async function getLiveProgramDoubanInfo(parsedYear?: string) {
  try {
    const programName = addForm.value.cn_title
    const programYear = parsedYear ? parseInt(parsedYear) : (parseInt(addForm.value.year) || new Date().getFullYear())
    
    if (!programName) {
      console.log('节目名称为空，跳过获取豆瓣信息')
      return
    }

    console.log('开始获取直播节目豆瓣信息:', { programName, programYear, cnlid: liveParams.cnlid, livepid: liveParams.livepid })
    
    const result = await api.get('ysp/get_live_program_douban_info', {
      params: {
        program_name: programName,
        program_year: programYear,
        cnlid: liveParams.cnlid,
        livepid: liveParams.livepid
      }
    })

    console.log('获取到的豆瓣信息:', result)

    // 处理清晰度列表
    if (result.definition_list && result.definition_list.length > 0) {
      definitionOptions.value = result.definition_list.map((d: any) => ({
        name: d.name,
        display_name: d.display_name || d.name
      }))
      // 默认选择第一个清晰度
      if (definitionOptions.value.length > 0) {
        addForm.value.defn = definitionOptions.value[0].name
      }
    }

    if (result.douban_id) {
      addForm.value.douban_id = result.douban_id
    }

    if (result.douban_info) {
      if (result.douban_info.title) {
        addForm.value.cn_title = result.douban_info.title
      }
      // 如果解析到了年份，优先使用解析的年份
      if (!parsedYear && result.douban_info.year) {
        addForm.value.year = result.douban_info.year.toString()
      }
      if (result.douban_info.cover) {
        addForm.value.cover = result.douban_info.cover
        addForm.value.poster = result.douban_info.cover
      }
      if (result.douban_info.description) {
        addForm.value.overview = result.douban_info.description
      }

      // 如果有豆瓣ID，调用PTGen获取更详细的信息
      if (result.douban_id) {
        const douban_url = `https://movie.douban.com/subject/${result.douban_id}/`
        await getPtgen(douban_url)
      }
    }
  } catch (error) {
    console.error('获取直播节目豆瓣信息失败:', error)
  }
}

// 初始化页面
onMounted(async () => {
  startNProgress()
  isLoading.value = true
  
  // 调试：输出传入的时间
  console.log('传入的 startTime:', mediaProps.startTime)
  console.log('传入的 endTime:', mediaProps.endTime)
  
  // 确保时间正确回填
  if (mediaProps.startTime) {
    liveParams.startTime = formatDateTimeForInput(mediaProps.startTime)
  }
  if (mediaProps.endTime) {
    liveParams.endTime = formatDateTimeForInput(mediaProps.endTime)
  }
  
  console.log('格式化后的 startTime:', liveParams.startTime)
  console.log('格式化后的 endTime:', liveParams.endTime)
  
  try {
    await loadSites()
    await loadTeamOptions()
    // 自动选择第一个站点
    if (siteList.value.length > 0) {
      addForm.value.site_list = [siteList.value[0].id]
    }
    
    // 解析节目名称
    const parsedInfo = parseLiveProgramTitle(addForm.value.cn_title)
    console.log('解析结果:', parsedInfo)
    
    // 应用解析结果
    if (parsedInfo.cleanTitle) {
      addForm.value.cn_title = parsedInfo.cleanTitle
    }
    if (parsedInfo.year) {
      addForm.value.year = parsedInfo.year
    }
    if (parsedInfo.episode) {
      addForm.value.episode = parsedInfo.episode
    }
    if (parsedInfo.issue) {
      addForm.value.issue = parsedInfo.issue
    }
    if (parsedInfo.episodesAll) {
      addForm.value.episodes_all = parsedInfo.episodesAll
    }
    
    // 获取直播节目豆瓣信息，传入解析到的年份
    await getLiveProgramDoubanInfo(parsedInfo.year)
    
    // 更新副标题
    update_subtitle()
  } catch (error) {
    console.error('初始化失败:', error)
    $toast.error('初始化失败')
  } finally {
    isLoading.value = false
    isRefreshed.value = true
    doneNProgress()
  }
})

// 提交采集任务
const submitForm = async () => {
  if (!addForm.value.site_list || addForm.value.site_list.length === 0) {
    $toast.error('请选择下载站点')
    return
  }

  if (!addForm.value.cn_title) {
    $toast.error('请输入节目名称')
    return
  }

  try {
    startNProgress()

    // 确保 poster 和 cover 使用相同的值
    if (addForm.value.cover) {
      addForm.value.poster = addForm.value.cover
    } else if (addForm.value.poster) {
      addForm.value.cover = addForm.value.poster
    }

    // 构建直播采集参数
    addForm.value.episode_list = [{
      cid: liveParams.cnlid,
      vid: liveParams.livepid,
      poster: addForm.value.poster,
      episode: addForm.value.episode ? parseInt(addForm.value.episode) : 1
    }]
    addForm.value.source = 'HDTV'
    addForm.value.site = 'YSP'
    addForm.value.team = addForm.value.team || 'NoGroup'
    
    // 添加期数字段
    ;(addForm.value as any).issue = addForm.value.issue
    
    // 处理版权和制作组信息
    if (addForm.value.team) {
      const teamItem = teamList.value.find(item => item.team === addForm.value.team)
      if (teamItem) {
        addForm.value.copyright = teamItem.copyright
      }
    }

    // 格式化时间为后端需要的格式
    function formatDateTimeForBackend(dateTimeStr: string): string {
      if (!dateTimeStr) return ''
      // datetime-local 格式是 "2026-03-15T10:30"，转换为 "2026-03-15 10:30:00"
      return dateTimeStr.replace('T', ' ') + ':00'
    }
    
    // 添加直播专用参数
    addForm.value.cnlid = liveParams.cnlid
    addForm.value.livepid = liveParams.livepid
    addForm.value.startTime = formatDateTimeForBackend(liveParams.startTime)
    addForm.value.endTime = formatDateTimeForBackend(liveParams.endTime)
    addForm.value.channelName = liveParams.channelName
    addForm.value.isReserved = liveParams.isReserved
    addForm.value.reserveStartTime = formatDateTimeForBackend(liveParams.startTime)
    addForm.value.reserveEndTime = formatDateTimeForBackend(liveParams.endTime)

    console.log('提交采集任务:', addForm.value)

    const result = await api.post('collect/', addForm.value)

    console.log('提交结果:', result)

    if (result?.success) {
      $toast.success('采集任务添加成功')
      // 跳转到任务列表
      console.log('准备跳转到 /task')
      router.push('/task')
    } else {
      $toast.error('采集任务添加失败')
    }
  } catch (error) {
    console.error('提交失败:', error)
    $toast.error('提交失败，请重试')
  } finally {
    doneNProgress()
  }
}

// 返回上一页
const goBack = () => {
  router.back()
}
</script>

<template>
  <div class="ysp-video-detail">
    <!-- 头部 -->
    <div class="detail-header">
      <button class="back-btn" @click="goBack">
        <svg
          xmlns="http://www.w3.org/2000/svg"
          width="24"
          height="24"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          stroke-width="2"
          stroke-linecap="round"
          stroke-linejoin="round"
        >
          <path d="M15 18l-6-6 6-6" />
        </svg>
        返回
      </button>
      <h1 class="text-h5 font-bold">直播节目采集</h1>
    </div>

    <!-- 直播信息 -->
    <div class="live-info-card">
      <div class="live-info-header">
        <h2 class="text-h6 font-semibold">直播节目信息</h2>
      </div>
      <div class="live-info-wrapper">
        <!-- 封面图片展示 -->
        <div v-if="addForm.cover" class="live-cover-container">
          <div class="cover-image-container">
            <img :src="optimizedCoverUrl" alt="封面图片" class="cover-image" />
          </div>
        </div>
        <div class="live-info-content">
            <div class="live-info-item">
              <span class="label">频道名称：</span>
              <span class="value">{{ liveParams.channelName }}</span>
            </div>
            <div class="live-info-item">
              <span class="label">节目名称：</span>
              <span class="value">{{ liveParams.programName }}</span>
            </div>
            <div class="live-info-item">
              <span class="label">开始时间：</span>
              <input v-model="liveParams.startTime" type="datetime-local" class="form-input" />
            </div>
            <div class="live-info-item">
              <span class="label">结束时间：</span>
              <input v-model="liveParams.endTime" type="datetime-local" class="form-input" />
            </div>
          </div>
      </div>
    </div>

    <!-- 采集设置 -->
    <div class="collect-settings">
      <GroupTile title="采集设置" />

      <div class="settings-form">
        <!-- 节目信息 -->
        <div class="form-section">
          <h3 class="section-title">节目信息</h3>

          <div class="form-row">
            <div class="form-item">
              <label>节目名称</label>
              <input v-model="addForm.cn_title" type="text" class="form-input" placeholder="请输入节目名称" />
            </div>
          </div>

          <div class="form-row">
            <div class="form-item">
              <label>豆瓣 ID</label>
              <div class="input-with-icon">
                <input v-model="addForm.douban_id" type="text" class="form-input" placeholder="如：1878011" />
                <button class="icon-button" @click="onClickDouban" :disabled="!addForm.douban_id">
                  <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="11" cy="11" r="8"></circle><line x1="21" y1="21" x2="16.65" y2="16.65"></line></svg>
                </button>
                <button v-if="addForm.douban_id" class="icon-button" @click="openDoubanDetail(addForm.douban_id)">
                  <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"></path><polyline points="15 3 21 3 21 9"></polyline><line x1="10" y1="14" x2="21" y2="3"></line></svg>
                </button>
              </div>
            </div>
            <div class="form-item">
              <label>IMDB ID</label>
              <div class="input-with-icon">
                <input v-model="addForm.imdb_id" type="text" class="form-input" placeholder="如：tt1878011" />
                <button class="icon-button" @click="onClickImdb" :disabled="!addForm.imdb_id">
                  <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="11" cy="11" r="8"></circle><line x1="21" y1="21" x2="16.65" y2="16.65"></line></svg>
                </button>
                <button v-if="addForm.imdb_id" class="icon-button" @click="openImdbDetail(addForm.imdb_id)">
                  <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"></path><polyline points="15 3 21 3 21 9"></polyline><line x1="10" y1="14" x2="21" y2="3"></line></svg>
                </button>
              </div>
            </div>
          </div>

          <div class="form-row">
            <div class="form-item">
              <label>英文标题</label>
              <input v-model="addForm.en_title" type="text" class="form-input" placeholder="请输入英文标题" />
            </div>
            <div class="form-item">
              <label>年份</label>
              <input v-model="addForm.year" type="text" class="form-input" placeholder="请输入年份" />
            </div>
          </div>

          <div class="form-row">
            <div class="form-item full-width">
              <label>副标题</label>
              <input v-model="addForm.sub_title" type="text" class="form-input" placeholder="根据豆瓣信息自动生成，可以手动修正" />
            </div>
          </div>



          <div class="form-row">
            <div class="form-item">
              <label>节目类型</label>
              <select v-model="addForm.type" class="form-select">
                <option v-for="option in typeOptions" :key="option.value" :value="option.value">
                  {{ option.label }}
                </option>
              </select>
            </div>
            <div class="form-item">
              <label>节目分类</label>
              <select v-model="addForm.cate" class="form-select">
                <option v-for="option in categoryOptionsList" :key="option.value" :value="option.value">
                  {{ option.label }}
                </option>
              </select>
            </div>
          </div>

          <div class="form-row">
            <div class="form-item">
              <label>总剧集</label>
              <input v-model="addForm.episodes_all" type="text" class="form-input" placeholder="请输入总剧集" />
            </div>
            <div class="form-item">
              <label>季数</label>
              <input v-model="addForm.season" type="text" class="form-input" placeholder="请输入季数" />
            </div>
          </div>

          <div class="form-row">
            <div class="form-item">
              <label>集数</label>
              <input v-model="addForm.episode" type="text" class="form-input" placeholder="请输入集数" />
            </div>
            <div class="form-item">
              <label>期数</label>
              <input v-model="addForm.issue" type="text" class="form-input" placeholder="请输入期数" />
            </div>
          </div>

          <div class="form-row">
            <div class="form-item full-width">
              <label>标签</label>
              <div class="tag-selector">
                <label v-for="option in tagOptionsList" :key="option.value" class="tag-checkbox">
                  <input type="checkbox" :value="option.value" v-model="addForm.tags" />
                  <span>{{ option.label }}</span>
                </label>
              </div>
            </div>
          </div>

          <div class="form-row">
            <div class="form-item full-width">
              <label>节目简介</label>
              <textarea
                v-model="addForm.overview"
                class="form-textarea"
                placeholder="请输入节目简介"
                rows="3"
              ></textarea>
            </div>
          </div>
        </div>

        <!-- 下载设置 -->
        <div class="form-section">
          <h3 class="section-title">下载设置</h3>

          <div class="form-row">
            <div class="form-item full-width">
              <label>下载站点</label>
              <div class="site-selector">
                <label v-for="site in siteList" :key="site.id" class="site-checkbox">
                  <input type="checkbox" :value="site.id" v-model="addForm.site_list" />
                  <span>{{ site.name }}</span>
                </label>
              </div>
            </div>
          </div>
          
          <div class="form-row">
            <div class="form-item">
              <label>清晰度</label>
              <select v-model="addForm.defn" class="form-select">
                <option v-for="defn in definitionOptions" :key="defn.name" :value="defn.name">
                  {{ defn.display_name || defn.name }}
                </option>
              </select>
            </div>
          </div>

          <div class="form-row">
            <div class="form-item checkbox-item">
              <input v-model="addForm.auto_download" type="checkbox" id="auto_download" />
              <label for="auto_download">自动下载</label>
            </div>
            <div class="form-item checkbox-item">
              <input v-model="addForm.auto_publish" type="checkbox" id="auto_publish" />
              <label for="auto_publish">自动发布</label>
            </div>
            <div class="form-item checkbox-item">
              <input v-model="addForm.anon_publish" type="checkbox" id="anon_publish" />
              <label for="anon_publish">匿名发布</label>
            </div>
          </div>
        </div>


      </div>
    </div>

    <!-- 操作按钮 -->
    <div class="action-buttons">
      <button class="btn btn-secondary" @click="goBack">取消</button>
      <button class="btn btn-primary" @click="submitForm">提交采集任务</button>
    </div>
  </div>
</template>

<style scoped>
.ysp-video-detail {
  padding: 16px;
  margin-block: 0;
  margin-inline: auto;
  max-inline-size: 1200px;
}

.detail-header {
  display: flex;
  align-items: center;
  gap: 16px;
  margin-block-end: 24px;
}

.back-btn {
  display: flex;
  align-items: center;
  border: 1px solid rgba(var(--v-theme-on-surface), 0.12);
  border-radius: 8px;
  background: transparent;
  color: rgb(var(--v-theme-on-surface));
  cursor: pointer;
  gap: 8px;
  padding-block: 8px;
  padding-inline: 16px;
  transition: all 0.2s ease;
}

.back-btn:hover {
  background: rgba(var(--v-theme-primary), 0.08);
}

/* 直播信息卡片 */
.live-info-card {
  padding: 20px;
  border: 1px solid rgba(var(--v-theme-on-surface), 0.08);
  border-radius: 12px;
  background: rgba(var(--v-theme-surface), 0.94);
  margin-block-end: 24px;
}

.live-info-header {
  margin-block-end: 16px;
}

.live-info-wrapper {
  display: flex;
  gap: 24px;
  align-items: flex-start;
}

.live-info-content {
  flex: 1;
  display: grid;
  gap: 12px;
  grid-template-columns: 1fr;
}

.live-info-wrapper .live-cover-container {
  margin-top: 0;
  flex-shrink: 0;
}

.live-info-item {
  display: flex;
  align-items: center;
  gap: 8px;
  min-height: 48px;
}

.live-info-item .label {
  color: rgb(var(--v-theme-on-surface));
  font-size: 14px;
  font-weight: 600;
  min-inline-size: 80px;
}

.live-info-item .value {
  color: rgb(var(--v-theme-on-surface));
  font-size: 14px;
  font-weight: 500;
}

.live-info-item .form-input {
  flex: 0 0 auto;
  width: 240px;
}

.reserved-tag {
  background: rgba(34, 197, 94, 0.1);
  color: #22c55e;
  padding: 2px 8px;
  border-radius: 10px;
  font-size: 12px;
  font-weight: 600;
}

.normal-tag {
  background: rgba(59, 130, 246, 0.1);
  color: #3b82f6;
  padding: 2px 8px;
  border-radius: 10px;
  font-size: 12px;
  font-weight: 600;
}

/* 采集设置 */
.collect-settings {
  margin-block-end: 32px;
}

.settings-form {
  padding: 20px;
  border: 1px solid rgba(var(--v-theme-on-surface), 0.08);
  border-radius: 12px;
  background: rgba(var(--v-theme-surface), 0.94);
}

.form-section {
  margin-block-end: 24px;
}

.section-title {
  border-block-end: 1px solid rgba(var(--v-theme-on-surface), 0.08);
  color: rgb(var(--v-theme-on-surface));
  font-size: 16px;
  font-weight: 600;
  margin-block-end: 16px;
  padding-block-end: 8px;
}

.form-row {
  display: grid;
  gap: 16px;
  grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
  margin-block-end: 16px;
}

.form-item {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.form-item.full-width {
  grid-column: 1 / -1;
}

.form-item label {
  color: rgb(var(--v-theme-on-surface));
  font-size: 14px;
  font-weight: 600;
}

/* 直播信息卡片中的封面容器样式 */
.live-cover-container {
  margin-top: 16px;
  display: flex;
  justify-content: center;
}

.form-input,
.form-select,
.form-textarea {
  border: 1px solid rgba(var(--v-theme-on-surface), 0.12);
  border-radius: 8px;
  background: rgba(var(--v-theme-surface), 1);
  color: rgb(var(--v-theme-on-surface));
  font-size: 14px;
  padding-block: 10px;
  padding-inline: 12px;
  transition: all 0.2s ease;
}

.form-input:focus,
.form-select:focus,
.form-textarea:focus {
  border-color: rgba(var(--v-theme-primary), 0.3);
  box-shadow: 0 0 0 2px rgba(var(--v-theme-primary), 0.1);
  outline: none;
}

.form-textarea {
  min-block-size: 80px;
  resize: vertical;
}

.checkbox-item {
  flex-direction: row;
  align-items: center;
  gap: 8px;
}

.checkbox-item input[type='checkbox'] {
  accent-color: rgb(var(--v-theme-primary));
  block-size: 16px;
  inline-size: 16px;
}

/* 封面图片样式 */
.cover-image-container {
  width: 100%;
  max-width: 250px;
  max-height: 350px;
  border-radius: 8px;
  overflow: hidden;
  box-shadow: 0 2px 8px rgba(var(--v-theme-on-surface), 0.1);
}

.cover-image {
  width: 100%;
  height: 100%;
  display: block;
  object-fit: cover;
}

/* 操作按钮 */
.action-buttons {
  display: flex;
  justify-content: flex-end;
  padding: 20px;
  border: 1px solid rgba(var(--v-theme-on-surface), 0.08);
  border-radius: 12px;
  background: rgba(var(--v-theme-surface), 0.94);
  gap: 16px;
}

.btn {
  border: none;
  border-radius: 8px;
  cursor: pointer;
  font-size: 14px;
  font-weight: 500;
  padding-block: 10px;
  padding-inline: 24px;
  transition: all 0.2s ease;
}

.btn-secondary {
  background: rgba(var(--v-theme-on-surface), 0.08);
  color: rgb(var(--v-theme-on-surface));
}

.btn-secondary:hover {
  background: rgba(var(--v-theme-on-surface), 0.12);
}

.btn-primary {
  background: rgb(var(--v-theme-primary));
  color: white;
}

.btn-primary:hover {
  background: rgba(var(--v-theme-primary), 0.9);
}

/* 站点选择器样式 */
.site-selector {
  display: flex;
  flex-wrap: wrap;
  gap: 12px;
  margin-top: 8px;
}

.site-checkbox {
  display: flex;
  align-items: center;
  gap: 6px;
  cursor: pointer;
  padding: 6px 12px;
  border: 1px solid rgba(var(--v-theme-on-surface), 0.12);
  border-radius: 6px;
  background: rgba(var(--v-theme-surface), 1);
  transition: all 0.2s ease;
}

.site-checkbox:hover {
  background: rgba(var(--v-theme-primary), 0.05);
  border-color: rgba(var(--v-theme-primary), 0.3);
}

.site-checkbox:has(input:checked) {
  background: rgba(var(--v-theme-primary), 0.1);
  border-color: rgba(var(--v-theme-primary), 0.5);
  color: rgb(var(--v-theme-primary));
}

.site-checkbox input[type="checkbox"] {
  accent-color: rgb(var(--v-theme-primary));
  block-size: 16px;
  inline-size: 16px;
  cursor: pointer;
}

/* 标签选择器样式 */
.tag-selector {
  display: flex;
  flex-wrap: wrap;
  gap: 12px;
  margin-top: 8px;
}

.tag-checkbox {
  display: flex;
  align-items: center;
  gap: 6px;
  cursor: pointer;
  padding: 6px 12px;
  border: 1px solid rgba(var(--v-theme-on-surface), 0.12);
  border-radius: 6px;
  background: rgba(var(--v-theme-surface), 1);
  transition: all 0.2s ease;
}

.tag-checkbox:hover {
  background: rgba(var(--v-theme-primary), 0.05);
  border-color: rgba(var(--v-theme-primary), 0.3);
}

.tag-checkbox:has(input:checked) {
  background: rgba(var(--v-theme-primary), 0.1);
  border-color: rgba(var(--v-theme-primary), 0.5);
  color: rgb(var(--v-theme-primary));
}

.tag-checkbox input[type="checkbox"] {
  accent-color: rgb(var(--v-theme-primary));
  block-size: 16px;
  inline-size: 16px;
  cursor: pointer;
}

/* 带图标的输入框 */
.input-with-icon {
  position: relative;
  display: flex;
  align-items: center;
}

.input-with-icon .form-input {
  padding-right: 80px;
}

.input-with-icon .icon-button {
  position: absolute;
  right: 8px;
  background: none;
  border: none;
  cursor: pointer;
  color: rgb(var(--v-theme-on-surface-variant));
  padding: 8px;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: 4px;
  transition: all 0.2s ease;
}

.input-with-icon .icon-button:hover {
  background: rgba(var(--v-theme-on-surface), 0.08);
  color: rgb(var(--v-theme-on-surface));
}

.input-with-icon .icon-button:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.input-with-icon .icon-button:nth-child(2) {
  right: 48px;
}

/* 响应式设计 */
@media (width <= 768px) {
  .ysp-video-detail {
    padding: 12px;
  }

  .form-row {
    grid-template-columns: 1fr;
  }

  .live-info-content {
    grid-template-columns: 1fr;
  }

  .action-buttons {
    flex-direction: column;
  }

  .btn {
    inline-size: 100%;
  }

  .site-selector {
    flex-direction: column;
  }

  .site-checkbox {
    flex-direction: row;
  }
}
</style>
