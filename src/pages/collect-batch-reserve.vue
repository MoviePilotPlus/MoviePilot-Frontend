<script setup lang="ts">
// @ts-nocheck
import { ref, computed, onMounted, reactive } from 'vue'
import { useRouter } from 'vue-router'
import { useToast } from 'vue-toastification'
import api from '@/api'
import { tagOptions, mediaCateOptions, categoryOptions } from '@/api/constants'
import type { PtgenInfo } from '@/api/types'
import { startNProgress, doneNProgress } from '@/api/nprogress'
import GroupTile from '@/components/GroupTitle.vue'

const router = useRouter()
const $toast = useToast()

interface ReservationItem {
  id: string
  reserve_start_time: string
  reserve_end_time: string
  issue?: string
  episode?: string
  sub_title?: string
  program: any
}

// 批量预约数据
const batchData = ref<any[]>([])

// ptgen信息
const ptgen = ref<PtgenInfo>({} as PtgenInfo)

// 是否已加载完成
const isRefreshed = ref(false)

// 固定信息
const fixedInfo = reactive({
  cnlid: '',
  livepid: '',
  channelName: '',
  cn_title: '',
  en_title: '',
  douban_id: '',
  imdb_id: '',
  sub_title: '',
  original_title: '',
  year: new Date().getFullYear().toString(),
  type: 'TV',
  cate: 'TV',
  defn: 'fhd',
  team: 'NoGroup',
  copyright: 'NoGroup',
  source: 'HDTV',
  site_list: [] as number[],
  auto_download: true,
  auto_publish: true,
  anon_publish: true,
  tags: [] as string[],
  cover: '',
  poster: '',
  overview: '',
  season: '1',
  episodes_all: '1',
  episode: '',
  issue: ''
})

// 预约列表
const reservations = ref<ReservationItem[]>([])

// 站点列表
const siteList = ref<any[]>([])

// 制作组列表
const teamList = ref<any[]>([])

// 清晰度选项
const definitionOptions = ref<any[]>([
  { fn: 'hd', fnname: '高清', defnname: '高清', defnrate: '540P', encrypt: 0 },
  { fn: 'shd', fnname: '超清', defnname: '超清', defnrate: '720P', encrypt: 0 },
  { fn: 'fhd', fnname: '蓝光', defnname: '蓝光', defnrate: '1080P', encrypt: 0 }
])

// 加载状态
const loading = ref(false)
const submitting = ref(false)

// 站点标签
const siteTagOptions = computed(() => {
  return siteList.value.map(item => ({
    label: item.name,
    value: item.name,
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

// 优化图片 URL
function optimizeImageUrl(url: string): string {
  if (!url) return url
  url = url.replace(/\/h\/\d+/, '/h/9999')
  if (url?.startsWith('http'))
    return `${import.meta.env.VITE_API_BASE_URL}system/img/1?imgurl=${encodeURIComponent(url)}&cache=true`
  return url.replace(/\/h\/\d+/, '/h/9999')
}

// 计算优化后的图片 URL
const optimizedCoverUrl = computed(() => {
  return optimizeImageUrl(fixedInfo.cover)
})

// 解析直播节目名称
function parseLiveProgramTitle(title: string) {
  let cleanTitle = title
  let year = ''
  let episode = ''
  let issue = ''
  let episodesAll = ''

  const originalTitle = title

  console.log('开始解析标题:', originalTitle)

  const epTotalMatch = originalTitle.match(/(\d+)\/(\d+)/)
  if (epTotalMatch) {
    episode = epTotalMatch[1]
    episodesAll = epTotalMatch[2]
    cleanTitle = cleanTitle.replace(epTotalMatch[0], '')
    console.log('匹配到集数/总集数:', { episode, episodesAll })
  }

  const epMatch = originalTitle.match(/第(\d+)[集期]/)
  if (epMatch && !episode) {
    episode = epMatch[1]
    cleanTitle = cleanTitle.replace(epMatch[0], '')
    console.log('匹配到第X集:', { episode })
  }

  const yearIssueMatch = originalTitle.match(/(\d{4})-(\d+)/)
  if (yearIssueMatch) {
    year = yearIssueMatch[1]
    issue = yearIssueMatch[2]
    cleanTitle = cleanTitle.replace(yearIssueMatch[0], '')
    console.log('匹配到年份-期数:', { year, issue })
  }

  const yearOnlyMatch = originalTitle.match(/(\d{4})/)
  if (yearOnlyMatch && !year) {
    year = yearOnlyMatch[1]
    cleanTitle = cleanTitle.replace(yearOnlyMatch[0], '')
    console.log('匹配到年份:', { year })
  }

  cleanTitle = cleanTitle.replace(/-特别节目\([^)]*\)/, '')
  cleanTitle = cleanTitle.replace(/[（(][^）)]*[）)]/g, '')
  cleanTitle = cleanTitle.replace(/[-_]+/g, ' ')
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

// 格式化时间为 datetime-local 格式
function formatDateTimeForInput(dateTimeStr: string): string {
  if (!dateTimeStr) return ''
  try {
    let date: Date
    if (dateTimeStr.includes(' ')) {
      const [datePart, timePart] = dateTimeStr.split(' ')
      date = new Date(`${datePart}T${timePart}`)
    } else if (dateTimeStr.includes('T')) {
      date = new Date(dateTimeStr)
    } else {
      date = new Date(dateTimeStr)
    }
    
    if (isNaN(date.getTime())) return ''
    
    const year = date.getFullYear()
    const month = String(date.getMonth() + 1).padStart(2, '0')
    const day = String(date.getDate()).padStart(2, '0')
    const hours = String(date.getHours()).padStart(2, '0')
    const minutes = String(date.getMinutes()).padStart(2, '0')
    
    return `${year}-${month}-${day}T${hours}:${minutes}`
  } catch (e) {
    console.error('时间格式化错误:', e)
    return ''
  }
}

// 格式化日期为中文格式
function formatDateToChinese(dateStr: string): string {
  if (!dateStr) return ''
  try {
    let date: Date
    if (dateStr.includes(' ')) {
      const [datePart] = dateStr.split(' ')
      date = new Date(datePart)
    } else if (dateStr.includes('T')) {
      date = new Date(dateStr)
    } else {
      date = new Date(dateStr)
    }
    
    if (isNaN(date.getTime())) return ''
    
    const year = date.getFullYear()
    const month = date.getMonth() + 1
    const day = date.getDate()
    return `${year}年${month}月${day}日`
  } catch (e) {
    console.error('日期格式化错误:', e)
    return ''
  }
}

// 更新单个预约的副标题
function updateReservationSubtitle(reservation: ReservationItem) {
  let additionalInfo = ''
  
  if (reservation.episode) {
    const season = fixedInfo.season || '1'
    additionalInfo = `第${season}季第${reservation.episode}集`
  } else if (reservation.issue) {
    additionalInfo = `${fixedInfo.year}年第${reservation.issue}期`
  } else if (fixedInfo.type === 'TV') {
    const dateStr = reservation.reserve_start_time
    const formattedDate = formatDateToChinese(dateStr)
    if (formattedDate) {
      additionalInfo = formattedDate
    }
  }
  
  if (additionalInfo) {
    if (reservation.sub_title) {
      if (!reservation.sub_title.includes(additionalInfo)) {
        const firstPipeIndex = reservation.sub_title.indexOf(' | ')
        if (firstPipeIndex !== -1) {
          const beforePipe = reservation.sub_title.substring(0, firstPipeIndex)
          const afterPipe = reservation.sub_title.substring(firstPipeIndex)
          reservation.sub_title = `${beforePipe} | ${additionalInfo}${afterPipe}`
        } else {
          reservation.sub_title = `${reservation.sub_title} | ${additionalInfo}`
        }
      }
    } else if (ptgen.value.sub_title) {
      reservation.sub_title = ptgen.value.sub_title
      if (additionalInfo && !reservation.sub_title.includes(additionalInfo)) {
        const firstPipeIndex = reservation.sub_title.indexOf(' | ')
        if (firstPipeIndex !== -1) {
          const beforePipe = reservation.sub_title.substring(0, firstPipeIndex)
          const afterPipe = reservation.sub_title.substring(firstPipeIndex)
          reservation.sub_title = `${beforePipe} | ${additionalInfo}${afterPipe}`
        } else {
          reservation.sub_title = `${reservation.sub_title} | ${additionalInfo}`
        }
      }
    } else {
      reservation.sub_title = additionalInfo
    }
  } else if (ptgen.value.sub_title && !reservation.sub_title) {
    reservation.sub_title = ptgen.value.sub_title
  }
}

// 更新所有预约的副标题
function updateAllSubtitles() {
  reservations.value.forEach(reservation => {
    updateReservationSubtitle(reservation)
  })
}

// 加载站点列表
const loadSites = async () => {
  try {
    const sites = await api.get('site/')
    siteList.value = sites.filter((site: any) => site?.is_active === true)
    if (siteList.value.length > 0) {
      fixedInfo.site_list = [siteList.value[0].id]
    }
  } catch (error) {
    console.error('加载站点列表失败:', error)
  }
}

// 加载制作组数据
async function loadTeamOptions() {
  try {
    const result: { [key: string]: any } = await api.get('system/setting/TEAM_PARAMS')
    teamList.value = result?.value ?? []
    teamList.value.sort((a: any, b: any) => (a.order || 0) - (b.order || 0))
    const defaultTeam = teamList.value.find((item: any) => item.default) || teamList.value[0]
    if (defaultTeam) {
      fixedInfo.team = defaultTeam.team
      fixedInfo.copyright = defaultTeam.copyright
    }
  } catch (error) {
    console.error('加载制作组数据失败:', error)
    teamList.value = [ { team: 'NoGroup', copyright: 'NoGroup' }]
  }
}

// 处理豆瓣ID输入
function onClickDouban() {
  if (fixedInfo.douban_id) {
    loading.value = true
    const url = `https://movie.douban.com/subject/${fixedInfo.douban_id}/`
    getPtgen(url)
  }
}

// 处理IMDb ID输入
function onClickImdb() {
  if (fixedInfo.imdb_id) {
    loading.value = true
    const url = `https://www.imdb.com/title/${fixedInfo.imdb_id}/`
    getPtgen(url)
  }
}

// 获取PTGen信息
async function getPtgen(url: string) {
  try {
    ptgen.value = await api.get('collect/ptgen/info?url=' + url) as PtgenInfo
    fixedInfo.en_title = ptgen.value.en_title
    if (ptgen.value.cn_title) {
      const parsedInfo = parseLiveProgramTitle(ptgen.value.cn_title)
      fixedInfo.cn_title = parsedInfo.cleanTitle
    }
    fixedInfo.sub_title = ptgen.value.sub_title
    fixedInfo.imdb_id = ptgen.value.imdb_id || ''
    fixedInfo.season = ptgen.value.season || 1
    fixedInfo.overview = ptgen.value.description || fixedInfo.overview || ''
    fixedInfo.year = ptgen.value.year || fixedInfo.year || ''
    if (ptgen.value.poster) {
      fixedInfo.cover = ptgen.value.poster
      fixedInfo.poster = ptgen.value.poster
    }
    loading.value = false
    updateAllSubtitles()
  } catch (error) {
    loading.value = false
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

// 获取直播节目豆瓣信息
async function getLiveProgramDoubanInfo(parsedYear?: string) {
  try {
    const programName = fixedInfo.cn_title
    const programYear = parsedYear ? parseInt(parsedYear) : (parseInt(fixedInfo.year) || new Date().getFullYear())
    
    if (!programName) {
      console.log('节目名称为空，跳过获取豆瓣信息')
      return
    }

    console.log('开始获取直播节目豆瓣信息:', { programName, programYear, cnlid: fixedInfo.cnlid, livepid: fixedInfo.livepid })
    
    const result = await api.get('ysp/get_live_program_douban_info', {
      params: {
        program_name: programName,
        program_year: programYear,
        cnlid: fixedInfo.cnlid,
        livepid: fixedInfo.livepid
      }
    })

    console.log('获取到的豆瓣信息:', result)

    if (result.definition_list && result.definition_list.length > 0) {
      definitionOptions.value = result.definition_list
      const priorityOrder = ['sfhd', 'fhd', 'shd', 'hd']
      let selectedDefn = null
      for (const priority of priorityOrder) {
        const found = definitionOptions.value.find(d => d.fn === priority)
        if (found) {
          selectedDefn = found.fn
          break
        }
      }
      if (!selectedDefn && definitionOptions.value.length > 0) {
        selectedDefn = definitionOptions.value[0].fn
      }
      if (selectedDefn) {
        fixedInfo.defn = selectedDefn
      }
    }

    if (result.douban_id) {
      fixedInfo.douban_id = result.douban_id
    }

    if (result.douban_info) {
      if (result.douban_info.title) {
        const parsedInfo = parseLiveProgramTitle(result.douban_info.title)
        fixedInfo.cn_title = parsedInfo.cleanTitle
      }
      if (!parsedYear && result.douban_info.year) {
        fixedInfo.year = result.douban_info.year.toString()
      }
      if (result.douban_info.cover) {
        fixedInfo.cover = result.douban_info.cover
        fixedInfo.poster = result.douban_info.cover
      }
      if (result.douban_info.description) {
        fixedInfo.overview = result.douban_info.description
      }

      if (result.douban_id) {
        const douban_url = `https://movie.douban.com/subject/${result.douban_id}/`
        await getPtgen(douban_url)
      }
    }
  } catch (error) {
    console.error('获取直播节目豆瓣信息失败:', error)
  }
}

// 删除预约项
const removeReservation = (index: number) => {
  reservations.value.splice(index, 1)
}

// 制作组选择变化
const onTeamChange = () => {
  if (fixedInfo.team) {
    const teamItem = teamList.value.find((item: any) => item.team === fixedInfo.team)
    if (teamItem) {
      fixedInfo.copyright = teamItem.copyright
    }
  }
}



// 格式化时间为后端格式
function formatDateTimeForBackend(dateTimeStr: string): string {
  if (!dateTimeStr) return ''
  return dateTimeStr.replace('T', ' ') + ':00'
}

// 提交批量预约
const submitBatchReserve = async () => {
  if (reservations.value.length === 0) {
    $toast.error('请至少选择一个预约时段')
    return
  }

  if (!fixedInfo.site_list || fixedInfo.site_list.length === 0) {
    $toast.error('请选择下载站点')
    return
  }

  if (!fixedInfo.cn_title) {
    $toast.error('请输入节目名称')
    return
  }

  try {
    submitting.value = true
    startNProgress()

    if (fixedInfo.cover) {
      fixedInfo.poster = fixedInfo.cover
    } else if (fixedInfo.poster) {
      fixedInfo.cover = fixedInfo.poster
    }

    const requestData = {
      ...fixedInfo,
      reservations: reservations.value.map(reservation => ({
        reserve_start_time: formatDateTimeForBackend(reservation.reserve_start_time),
        reserve_end_time: formatDateTimeForBackend(reservation.reserve_end_time),
        issue: reservation.issue,
        episode: reservation.episode,
        sub_title: reservation.sub_title
      }))
    }

    console.log('提交批量预约:', requestData)

    await api.post('collect/batch', requestData)

    $toast.success(`批量预约成功，共创建 ${reservations.value.length} 个任务`)
    sessionStorage.removeItem('batchReserveData')
    router.push('/task')
  } catch (error) {
    console.error('提交批量预约失败:', error)
    $toast.error('提交失败，请重试')
  } finally {
    submitting.value = false
    doneNProgress()
  }
}

// 返回上一页
const goBack = () => {
  router.back()
}

// 初始化页面
onMounted(async () => {
  startNProgress()
  loading.value = true
  
  try {
    const storedData = sessionStorage.getItem('batchReserveData')
    if (storedData) {
      batchData.value = JSON.parse(storedData)
      
      if (batchData.value.length > 0) {
        const firstProgram = batchData.value[0]
        const firstChannel = firstProgram.channel
        
        fixedInfo.cnlid = firstChannel.cnlid
        fixedInfo.livepid = firstChannel.livepid
        fixedInfo.channelName = firstChannel.name
        fixedInfo.cn_title = firstProgram.name
        fixedInfo.defn = firstChannel.defn || 'fhd'
        
        const parsedInfo = parseLiveProgramTitle(fixedInfo.cn_title)
        console.log('解析结果:', parsedInfo)
        
        if (parsedInfo.cleanTitle) {
          fixedInfo.cn_title = parsedInfo.cleanTitle
        }
        if (parsedInfo.year) {
          fixedInfo.year = parsedInfo.year
        }
        if (parsedInfo.episode) {
          fixedInfo.episode = parsedInfo.episode
        }
        if (parsedInfo.issue) {
          fixedInfo.issue = parsedInfo.issue
        }
        if (parsedInfo.episodesAll) {
          fixedInfo.episodes_all = parsedInfo.episodesAll
        }
        
        reservations.value = batchData.value.map((program: any, index: number) => {
          const item: ReservationItem = {
            id: program.programId,
            reserve_start_time: formatDateTimeForInput(program.startTime),
            reserve_end_time: formatDateTimeForInput(program.endTime),
            issue: parsedInfo.issue ? (parseInt(parsedInfo.issue) + index).toString() : '',
            episode: parsedInfo.episode,
            sub_title: '',
            program
          }
          return item
        })
      }
    }
    
    await loadSites()
    await loadTeamOptions()
    
    if (batchData.value.length > 0) {
      const firstProgram = batchData.value[0]
      const parsedInfo = parseLiveProgramTitle(fixedInfo.cn_title)
      await getLiveProgramDoubanInfo(parsedInfo.year)
      updateAllSubtitles()
    }
  } catch (error) {
    console.error('初始化失败:', error)
    $toast.error('初始化失败')
  } finally {
    loading.value = false
    isRefreshed.value = true
    doneNProgress()
  }
})
</script>

<template>
  <div class="batch-reserve">
    <div class="page-header">
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
      <h1 class="text-h4 font-bold">批量预约录制</h1>
    </div>

    <div v-if="!loading" class="batch-reserve-content">
      <div class="fixed-info-section">
        <GroupTile title="固定信息（所有预约共用）" />
        
        <div v-if="fixedInfo.cover" class="live-cover-container">
          <div class="cover-image-container">
            <img :src="optimizedCoverUrl" alt="封面图片" class="cover-image" />
          </div>
        </div>
        
        <div class="fixed-info-form">
          <div class="form-row">
            <div class="form-item">
              <label>频道名称</label>
              <input v-model="fixedInfo.channelName" type="text" class="form-input" readonly />
            </div>
            <div class="form-item">
              <label>节目名称</label>
              <input v-model="fixedInfo.cn_title" type="text" class="form-input" />
            </div>
          </div>

          <div class="form-row">
            <div class="form-item">
              <label>豆瓣 ID</label>
              <div class="input-with-icon">
                <input v-model="fixedInfo.douban_id" type="text" class="form-input" placeholder="如：1878011" />
                <button class="icon-button" @click="onClickDouban" :disabled="!fixedInfo.douban_id">
                  <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="11" cy="11" r="8"></circle><line x1="21" y1="21" x2="16.65" y2="16.65"></line></svg>
                </button>
                <button v-if="fixedInfo.douban_id" class="icon-button" @click="openDoubanDetail(fixedInfo.douban_id)">
                  <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"></path><polyline points="15 3 21 3 21 9"></polyline><line x1="10" y1="14" x2="21" y2="3"></line></svg>
                </button>
              </div>
            </div>
            <div class="form-item">
              <label>IMDB ID</label>
              <div class="input-with-icon">
                <input v-model="fixedInfo.imdb_id" type="text" class="form-input" placeholder="如：tt1878011" />
                <button class="icon-button" @click="onClickImdb" :disabled="!fixedInfo.imdb_id">
                  <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="11" cy="11" r="8"></circle><line x1="21" y1="21" x2="16.65" y2="16.65"></line></svg>
                </button>
                <button v-if="fixedInfo.imdb_id" class="icon-button" @click="openImdbDetail(fixedInfo.imdb_id)">
                  <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"></path><polyline points="15 3 21 3 21 9"></polyline><line x1="10" y1="14" x2="21" y2="3"></line></svg>
                </button>
              </div>
            </div>
          </div>

          <div class="form-row">
            <div class="form-item">
              <label>英文标题</label>
              <input v-model="fixedInfo.en_title" type="text" class="form-input" placeholder="请输入英文标题" />
            </div>
            <div class="form-item">
              <label>年份</label>
              <input v-model="fixedInfo.year" type="text" class="form-input" placeholder="请输入年份" />
            </div>
          </div>

          <div class="form-row">
            <div class="form-item">
              <label>节目类型</label>
              <select v-model="fixedInfo.type" class="form-select">
                <option v-for="option in typeOptions" :key="option.value" :value="option.value">
                  {{ option.label }}
                </option>
              </select>
            </div>
            <div class="form-item">
              <label>节目分类</label>
              <select v-model="fixedInfo.cate" class="form-select">
                <option v-for="option in categoryOptionsList" :key="option.value" :value="option.value">
                  {{ option.label }}
                </option>
              </select>
            </div>
          </div>

          <div class="form-row">
            <div class="form-item">
              <label>总剧集</label>
              <input v-model="fixedInfo.episodes_all" type="text" class="form-input" placeholder="请输入总剧集" />
            </div>
            <div class="form-item">
              <label>季数</label>
              <input v-model="fixedInfo.season" type="text" class="form-input" placeholder="请输入季数" />
            </div>
          </div>



          <div class="form-row">
            <div class="form-item full-width">
              <label>标签</label>
              <div class="tag-selector">
                <label v-for="option in tagOptionsList" :key="option.value" class="tag-checkbox">
                  <input type="checkbox" :value="option.value" v-model="fixedInfo.tags" />
                  <span>{{ option.label }}</span>
                </label>
              </div>
            </div>
          </div>

          <div class="form-row">
            <div class="form-item full-width">
              <label>节目简介</label>
              <textarea
                v-model="fixedInfo.overview"
                class="form-textarea"
                placeholder="请输入节目简介"
                rows="3"
              ></textarea>
            </div>
          </div>
          
          <div class="form-row">
            <div class="form-item">
              <label>清晰度</label>
              <div class="definition-selector">
                <label v-for="defn in definitionOptions" :key="defn.fn" class="definition-radio">
                  <input type="radio" :value="defn.fn" v-model="fixedInfo.defn" />
                  <span class="definition-name">{{ defn.fnname }}</span>
                  <span v-if="defn.defnrate" class="definition-rate">({{ defn.defnrate }})</span>
                  <span v-if="defn.encrypt === 1" class="encrypt-tag">加密</span>
                </label>
              </div>
            </div>
            <div class="form-item">
              <label>制作组</label>
              <div class="team-selector">
                <label v-for="team in teamList" :key="team.team" class="team-radio">
                  <input type="radio" :value="team.team" v-model="fixedInfo.team" @change="onTeamChange" />
                  <span class="team-name">{{ team.team }}</span>
                </label>
              </div>
            </div>
          </div>
          
          <div class="form-row">
            <div class="form-item full-width">
              <label>下载站点</label>
              <div class="site-selector">
                <label v-for="site in siteList" :key="site.id" class="site-checkbox">
                  <input type="checkbox" :value="site.id" v-model="fixedInfo.site_list" />
                  <span>{{ site.name }}</span>
                </label>
              </div>
            </div>
          </div>
          
          <div class="form-row">
            <div class="form-item checkbox-item">
              <input v-model="fixedInfo.auto_download" type="checkbox" id="auto_download" />
              <label for="auto_download">自动下载</label>
            </div>
            <div class="form-item checkbox-item">
              <input v-model="fixedInfo.auto_publish" type="checkbox" id="auto_publish" />
              <label for="auto_publish">自动发布</label>
            </div>
            <div class="form-item checkbox-item">
              <input v-model="fixedInfo.anon_publish" type="checkbox" id="anon_publish" />
              <label for="anon_publish">匿名发布</label>
            </div>
          </div>
        </div>
      </div>

      <div class="reservations-section">
        <div class="section-header">
          <GroupTile title="预约列表" />
        </div>
        <div class="reservations-list">
          <div
            v-for="(reservation, index) in reservations"
            :key="reservation.id"
            class="reservation-item"
          >
            <div class="reservation-number">#{{ index + 1 }}</div>
            <div class="reservation-content">
              <div class="reservation-title">
                {{ reservation.program.name }}
              </div>
              <div class="reservation-form">
                <div class="form-row">
                  <div class="form-item">
                    <label>开始时间</label>
                    <input v-model="reservation.reserve_start_time" type="datetime-local" class="form-input" />
                  </div>
                  <div class="form-item">
                    <label>结束时间</label>
                    <input v-model="reservation.reserve_end_time" type="datetime-local" class="form-input" />
                  </div>
                  <div class="form-item">
                    <label>期数</label>
                    <input v-model="reservation.issue" type="text" class="form-input" @change="updateReservationSubtitle(reservation)" />
                  </div>
                  <div class="form-item">
                    <label>集数</label>
                    <input v-model="reservation.episode" type="text" class="form-input" @change="updateReservationSubtitle(reservation)" />
                  </div>
                </div>
                <div class="form-row">
                  <div class="form-item full-width">
                    <label>副标题</label>
                    <input v-model="reservation.sub_title" type="text" class="form-input" placeholder="根据时间/期数自动生成，可以手动修正" />
                  </div>
                </div>
              </div>
            </div>
            <button class="delete-btn" @click="removeReservation(index)">
              <svg
                xmlns="http://www.w3.org/2000/svg"
                width="20"
                height="20"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                stroke-width="2"
                stroke-linecap="round"
                stroke-linejoin="round"
              >
                <line x1="18" y1="6" x2="6" y2="18"></line>
                <line x1="6" y1="6" x2="18" y2="18"></line>
              </svg>
            </button>
          </div>
        </div>
      </div>
    </div>

    <div v-else class="loading-container">
      <v-progress-circular indeterminate />
      <div class="loading-text">加载中...</div>
    </div>

    <div v-if="!loading" class="action-buttons">
      <button class="btn btn-secondary" @click="goBack">取消</button>
      <button 
        class="btn btn-primary" 
        :disabled="submitting || reservations.length === 0"
        @click="submitBatchReserve"
      >
        {{ submitting ? '提交中...' : `确认提交 (${reservations.length})` }}
      </button>
    </div>
  </div>
</template>

<style scoped>
.batch-reserve {
  padding: 16px;
  margin-block: 0;
  margin-inline: auto;
  max-inline-size: 1400px;
}

.page-header {
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

.batch-reserve-content {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 24px;
  margin-block-end: 24px;
  align-items: stretch;
}

.fixed-info-section,
.reservations-section {
  padding: 20px;
  border: 1px solid rgba(var(--v-theme-on-surface), 0.08);
  border-radius: 12px;
  background: rgba(var(--v-theme-surface), 0.94);
  height: 100%;
}

.reservations-section {
  display: flex;
  flex-direction: column;
}

.section-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-block-end: 16px;
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

.form-input:read-only {
  background: rgba(var(--v-theme-on-surface), 0.05);
  opacity: 0.7;
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

.live-cover-container {
  margin-top: 16px;
  display: flex;
  justify-content: center;
  margin-bottom: 16px;
}

.cover-image-container {
  width: 100%;
  max-width: 180px;
  max-height: 250px;
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

.reservations-list {
  display: flex;
  flex-direction: column;
  gap: 10px;
  flex: 1;
  overflow-y: auto;
}

.reservation-item {
  display: grid;
  grid-template-columns: 50px 1fr 40px;
  gap: 10px;
  padding: 12px;
  border: 1px solid rgba(var(--v-theme-on-surface), 0.08);
  border-radius: 8px;
  background: rgba(var(--v-theme-surface), 1);
  transition: all 0.2s ease;
}

.reservation-item:hover {
  border-color: rgba(var(--v-theme-primary), 0.2);
  background: rgba(var(--v-theme-primary), 0.05);
}

.reservation-number {
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 16px;
  font-weight: 600;
  color: rgb(var(--v-theme-primary));
  background: rgba(var(--v-theme-primary), 0.1);
  border-radius: 8px;
}

.reservation-content {
  flex: 1;
}

.reservation-title {
  font-size: 14px;
  font-weight: 600;
  color: rgb(var(--v-theme-on-surface));
  margin-block-end: 8px;
}

.reservation-form .form-row {
  margin-block-end: 6px;
  display: grid;
  gap: 8px;
  grid-template-columns: repeat(auto-fit, minmax(160px, 1fr));
}

.reservation-form .form-input {
  font-size: 13px;
  padding-block: 6px;
  padding-inline: 8px;
}

.delete-btn {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 40px;
  height: 40px;
  border: 1px solid rgba(var(--v-theme-error), 0.2);
  border-radius: 8px;
  background: rgba(var(--v-theme-error), 0.05);
  color: rgb(var(--v-theme-error));
  cursor: pointer;
  transition: all 0.2s ease;
}

.delete-btn:hover {
  background: rgba(var(--v-theme-error), 0.1);
  border-color: rgba(var(--v-theme-error), 0.3);
}

.loading-container {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 60px 20px;
  gap: 16px;
}

.loading-text {
  color: rgba(var(--v-theme-on-surface), 0.6);
  font-size: 14px;
}

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

.btn:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.btn-secondary {
  background: rgba(var(--v-theme-on-surface), 0.08);
  color: rgb(var(--v-theme-on-surface));
}

.btn-secondary:hover:not(:disabled) {
  background: rgba(var(--v-theme-on-surface), 0.12);
}

.btn-primary {
  background: rgb(var(--v-theme-primary));
  color: white;
}

.btn-primary:hover:not(:disabled) {
  background: rgba(var(--v-theme-primary), 0.9);
}

.definition-selector,
.team-selector,
.site-selector,
.tag-selector {
  display: flex;
  flex-wrap: wrap;
  gap: 12px;
  margin-top: 8px;
}

.definition-radio,
.team-radio,
.site-checkbox,
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

.definition-radio:hover,
.team-radio:hover,
.site-checkbox:hover,
.tag-checkbox:hover {
  background: rgba(var(--v-theme-primary), 0.05);
  border-color: rgba(var(--v-theme-primary), 0.3);
}

.definition-radio:has(input:checked),
.team-radio:has(input:checked),
.site-checkbox:has(input:checked),
.tag-checkbox:has(input:checked) {
  background: rgba(var(--v-theme-primary), 0.1);
  border-color: rgba(var(--v-theme-primary), 0.5);
  color: rgb(var(--v-theme-primary));
}

.definition-radio input[type="radio"],
.team-radio input[type="radio"],
.site-checkbox input[type="checkbox"],
.tag-checkbox input[type="checkbox"] {
  accent-color: rgb(var(--v-theme-primary));
  block-size: 16px;
  inline-size: 16px;
  cursor: pointer;
  color-scheme: light;
}

.definition-name,
.team-name {
  font-weight: 500;
}

.definition-rate {
  color: rgba(var(--v-theme-on-surface), 0.6);
  font-size: 14px;
}

.encrypt-tag {
  background: rgba(255, 107, 107, 0.1);
  color: #ff6b6b;
  font-size: 12px;
  padding: 1px 6px;
  border-radius: 4px;
  margin-left: 4px;
}

.input-with-icon {
  position: relative;
  display: flex;
  align-items: center;
}

.input-with-icon .form-input {
  padding-right: 100px;
}

.input-with-icon .icon-button {
  position: absolute;
  right: 6px;
  background: none;
  border: none;
  cursor: pointer;
  color: rgb(var(--v-theme-on-surface-variant));
  padding: 6px;
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

.input-with-icon .icon-button:nth-child(3) {
  right: 44px;
}

@media (width <= 1024px) {
  .batch-reserve-content {
    grid-template-columns: 1fr;
  }
}
</style>
