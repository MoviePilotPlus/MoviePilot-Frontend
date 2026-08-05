<!-- eslint-disable sonarjs/no-duplicate-string -->
<script lang="ts" setup>
import { useToast } from 'vue-toastification'
import { VRow, VSelect } from 'vuetify/lib/components/index.mjs'
import draggable from 'vuedraggable'
import api from '@/api'
import { MediaServerConf, Site } from '@/api/types'
import SiteSchemaCard from '@/components/cards/SiteSchemaCard.vue'
import ProgressDialog from '@/components/dialog/ProgressDialog.vue'
import SiteSchemaImportDialog from '@/components/dialog/SiteSchemaImportDialog.vue'
import { useI18n } from 'vue-i18n'
import { mediaServerOptions } from '@/api/constants'

// 截图模板配置引擎：默认配置 + 预设
const TPL_DEFAULTS = {
  layout: 'grid', margin: 18,
  background: { type: 'solid', color: '#ffffff', image_source: 'first', blur: 40, scrim_color: '#080a12', scrim_alpha: 150, gradient_top: '#0c0c14', gradient_bottom: '#1e1034' },
  grid: { gap: 10, corner_radius: 0, border_width: 0, border_color: '#ffffff', border_alpha: 30, shadow: false, show_timestamp: true },
  metadata: { position: 'top', align: 'left', font_color: '#000000', hierarchy: false, stroke: 0, outline: false, label_prefix: true, bold: false },
  poster: { show_cover: true },
  font: { primary: null, fallback: null },
  logo: { enabled: true, height_ratio: 0.55 },
}
const TPL_PRESETS: Record<string, any> = {
  default: {},
  modern: { background: { type: 'solid', color: '#141414' }, grid: { corner_radius: 14, border_width: 1, border_alpha: 30 }, metadata: { font_color: '#ebebeb' } },
  light: { grid: { corner_radius: 16, shadow: true }, metadata: { font_color: '#141414' } },
  cinema: { background: { type: 'frosted', blur: 48, scrim_alpha: 105 }, grid: { corner_radius: 12, border_width: 1, border_alpha: 36 }, metadata: { position: 'overlay', align: 'center', font_color: '#ffffff', hierarchy: true, stroke: 1, label_prefix: false } },
  spotlight: { background: { type: 'blur', blur: 16 }, grid: { corner_radius: 12, border_width: 1, border_alpha: 36 }, metadata: { font_color: '#ffffff', hierarchy: true, stroke: 1 } },
  gradient: { background: { type: 'gradient' }, grid: { corner_radius: 12, border_width: 1, border_color: '#8caaff', border_alpha: 50 }, metadata: { position: 'overlay', font_color: '#ebeeff', hierarchy: true, stroke: 1 } },
  mono: { background: { type: 'solid', color: '#000000' }, grid: { border_width: 2, border_color: '#ffffff', border_alpha: 255 }, metadata: { font_color: '#f0f0f0' } },
  poster: { layout: 'poster', background: { type: 'frosted', image_source: 'cover', blur: 42, scrim_alpha: 150 }, grid: { corner_radius: 12, border_width: 1, border_alpha: 36 }, metadata: { position: 'left', font_color: '#ffffff', hierarchy: true, outline: true } },
  noir: { background: { type: 'solid', color: '#000000' }, metadata: { position: 'bottom', font_color: '#f0f0f0' } },
  paper: { background: { type: 'solid', color: '#ffffff' }, metadata: { position: 'bottom', font_color: '#141414' } },
}
function tplDeepMerge(base: any, override: any): any {
  const out = JSON.parse(JSON.stringify(base))
  for (const k in override) {
    if (typeof override[k] === 'object' && !Array.isArray(override[k]) && typeof out[k] === 'object')
      out[k] = tplDeepMerge(out[k], override[k])
    else out[k] = override[k]
  }
  return out
}
const tplConfig = ref<any>(tplDeepMerge(TPL_DEFAULTS, {}))
const tplPreviewSrc = ref('')
const activePreset = ref('default')
const previewLoading = ref(false)
const savingScreenshotConfig = ref(false)
const realtimePreview = ref(true)
const tplPreviewLarge = ref(false)
const systemFonts = ref<string[]>([])
async function loadSystemFonts() {
  try {
    const result: any = await api.get('collect/screenshot-fonts')
    if (result?.success) systemFonts.value = result.data || []
  } catch (e) { console.error('load fonts error', e) }
}
function getContrastColor(hex: string): string {
  const h = (hex || '#000000').replace('#', '')
  if (h.length < 6) return '#000000'
  const r = parseInt(h.substr(0, 2), 16), g = parseInt(h.substr(2, 2), 16), b = parseInt(h.substr(4, 2), 16)
  return (0.299 * r + 0.587 * g + 0.114 * b) / 255 > 0.5 ? '#000000' : '#ffffff'
}
watch(() => tplConfig.value.background?.color, (c: string) => {
  if (tplConfig.value.background?.type === 'solid' && c) {
    tplConfig.value.metadata.font_color = getContrastColor(c)
  }
})
let _rtTimer: any = null
watch(tplConfig, () => {
  if (!realtimePreview.value) return
  if (_rtTimer) clearTimeout(_rtTimer)
  _rtTimer = setTimeout(() => renderTplPreview(), 800)
}, { deep: true })
function loadPreset(name: string) {
  activePreset.value = name
  tplConfig.value = tplDeepMerge(TPL_DEFAULTS, TPL_PRESETS[name] || {})
}
async function renderTplPreview() {
  previewLoading.value = true
  try {
    const result: any = await api.post('collect/screenshot-preview', {
      config: JSON.stringify(tplConfig.value), task_id: 335,
    })
    if (result?.success) tplPreviewSrc.value = result.data.image
  } catch (e) { console.error('preview error', e) } finally { previewLoading.value = false }
}
async function saveScreenshotConfig() {
  savingScreenshotConfig.value = true
  try {
    await api.post('system/env', { SCREENSHOT_TEMPLATE_CONFIG: JSON.stringify(tplConfig.value) })
    $toast.success('截图模板配置已保存')
  } catch (e) { $toast.error('保存失败') } finally { savingScreenshotConfig.value = false }
}

// 国际化
const { t } = useI18n()

// 导入对话框
const siteImportDialog = ref(false)

// 采集器设置项
const CollectSettings = ref<any>({
  // 基础设置
  Basic: {
    MEDIA_DIR: '',
    DOWNLOAD_DIR: '',
    PTGEN_URL: '',
    SECOND_PTGEN_URL: '',
    DOWNLOADER_SLEEP_TIME: 60,
    DOWNLOADER_THREAD_COUNT: 1,
    DOWNLOADER_SPEED: '10M',
    DOWNLOAD_TASK_MAX_WORKERS: 1,
    RAISE_EXCEPTION: false,
    API_DEBUG: false,
    SCREENSHOT_TEMPLATE: 'default',
    SCREENSHOT_TEMPLATE_CONFIG: '',
    SCREENSHOT_HDR_PROCESSOR: 'auto',
    DOWNLOADER_DELETE_AFTER_DONE: true,
    SEED_SKIP_HASH_CHECK: false,
    HIGH_BITRATE_THRESHOLD: 10000000,
    TV_FILE_FORMAT: '',
    MOVIE_FILE_FORMAT: '',
    TV_TITLE_FORMAT: '',
    MOVIE_TITLE_FORMAT: '',
    TV_FOLDER_FORMAT: '',
    MOVIE_FOLDER_FORMAT: '',
  },
  TencentApi: {
    TENCENT_CHACHAO20_API_URL: '',
    TENCENT_CKEY42_API_URL: '',
  },
  Youku: {
    YOUKU_DOWNLOAD_LINE: 'normal_tv',
  },
  ImageHosting: {
    ipic: {
      active: true,
    },
    smms: {
      apikey: '',
      active: true,
    },
    imgbb: {
      apikey: '',
      active: true,
    },
    panda: {
      apikey: '',
      active: true,
    },
    imgbox: {
      username: '',
      password: '',
      active: true,
    },
  },
})

const youkuDownloadLineOptions = [
  { title: '普通酷喵TV', value: 'normal_tv' },
  { title: '安卓端', value: 'android' },
  { title: '酷喵帧享影院', value: 'frame_enjoy_cinema' },
]

// 是否发送请求的总开关
const isRequest = ref(true)

// 所有站点
const allSites = ref<Site[]>([])
// 选中的媒体服务器
const mediaServers = ref<MediaServerConf[]>([])

// 提示框
const $toast = useToast()

// 进度框
const progressDialog = ref(false)

// 腾讯视频Cookie
const tencentCookie = ref('')
const mgTvTicket = ref('')
const mgAppTicket = ref('')
const iqiyiCookie = ref('')
const youkuCookie = ref('')
const youkuStoken = ref('')
const bilibiliCookie = ref('')

// 查询已设置的腾讯视频Cookie
async function queryTencentCookie() {
  try {
    const result: { [key: string]: any } = await api.get('system/setting/TencentCookie')
    if (result && result.data && result.data.value) tencentCookie.value = result.data.value
  } catch (error) {
    console.log(error)
  }
}
async function queryTvAppTicket() {
  try {
    const result: { [key: string]: any } = await api.get('system/setting/MgTvTicket')
    if (result && result.data && result.data.value) mgTvTicket.value = result.data.value
  } catch (error) {
    console.log(error)
  }
}
// 查询已设置的腾讯视频Cookie
async function queryMgAppTicket() {
  try {
    const result: { [key: string]: any } = await api.get('system/setting/MgAppTicket')
    if (result && result.data && result.data.value) mgAppTicket.value = result.data.value
  } catch (error) {
    console.log(error)
  }
}

// 查询已设置的爱奇艺Cookie
async function queryIqiyiCookie() {
  try {
    const result: { [key: string]: any } = await api.get('system/setting/IQiyiCookie')
    if (result && result.data && result.data.value) iqiyiCookie.value = result.data.value
  } catch (error) {
    console.log(error)
  }
}

// 查询已设置的优酷Cookie
async function queryYoukuCookie() {
  try {
    const result: { [key: string]: any } = await api.get('system/setting/YoukuCookie')
    if (result && result.data && result.data.value) youkuCookie.value = result.data.value
  } catch (error) {
    console.log(error)
  }
}
async function queryYoukuStoken() {
  try {
    const result: { [key: string]: any } = await api.get('system/setting/YoukuStoken')
    if (result && result.data && result.data.value) youkuStoken.value = result.data.value
  } catch (error) {
    console.log(error)
  }
}

// 查询已设置的哔哩哔哩Cookie
async function queryBilibiliCookie() {
  try {
    const result: { [key: string]: any } = await api.get('system/setting/BilibiliCookie')
    if (result && result.data && result.data.value) bilibiliCookie.value = result.data.value
  } catch (error) {
    console.log(error)
  }
}
// 重载系统生效配置
async function reloadSystem() {
  try {
    const result: { [key: string]: any } = await api.get('system/reload')
    if (result.success) $toast.success('系统配置已生效')
    else $toast.error('重载系统失败！')
  } catch (error) {
    console.log(error)
  }
}

// 保存用户设置的腾讯视频Cookie
async function saveTencentCookie() {
  try {
    // 用户名密码
    const result: { [key: string]: any } = await api.post('system/setting/TencentCookie', tencentCookie.value)

    if (result.success) {
      $toast.success('腾讯视频Cookie保存成功')
      await reloadSystem()
    } else $toast.error('腾讯视频Cookie保存失败！')
  } catch (error) {
    console.log(error)
  }
}
async function saveMgTvTicket() {
  try {
    // 用户名密码
    const result: { [key: string]: any } = await api.post('system/setting/MgTvTicket', mgTvTicket.value)

    if (result.success) {
      $toast.success('芒果TV 电视端Ticket保存成功')
      await reloadSystem()
    } else $toast.error('芒果TV 电视端Ticket保存失败！')
  } catch (error) {
    console.log(error)
  }
}

async function saveMgAppTicket() {
  try {
    // 用户名密码
    const result: { [key: string]: any } = await api.post('system/setting/MgAppTicket', mgAppTicket.value)

    if (result.success) {
      $toast.success('芒果TV App端Ticket保存成功')
      await reloadSystem()
    } else $toast.error('芒果TV App端Ticket保存失败！')
  } catch (error) {
    console.log(error)
  }
}

// 保存用户设置的爱奇艺Cookie
async function saveIqiyiCookie() {
  try {
    const result: { [key: string]: any } = await api.post('system/setting/IQiyiCookie', iqiyiCookie.value)

    if (result.success) {
      $toast.success('爱奇艺Cookie保存成功')
      await reloadSystem()
    } else $toast.error('爱奇艺Cookie保存失败！')
  } catch (error) {
    console.log(error)
  }
}

// 保存用户设置的优酷Cookie
async function saveYoukuCookie() {
  try {
    const result: { [key: string]: any } = await api.post('system/setting/YoukuCookie', youkuCookie.value)

    if (result.success) {
      $toast.success('优酷Cookie保存成功')
      await reloadSystem()
    } else $toast.error('优酷Cookie保存失败！')
  } catch (error) {
    console.log(error)
  }
}
// 保存用户设置的优酷Stoken
async function saveYoukuStoken() {
  try {
    const result: { [key: string]: any } = await api.post('system/setting/YoukuStoken', youkuStoken.value)

    if (result.success) {
      $toast.success('优酷Stoken保存成功')
      await reloadSystem()
    } else $toast.error('优酷Stoken保存失败！')
  } catch (error) {
    console.log(error)
  }
}
// 保存用户设置的哔哩哔哩Cookie
async function saveBilibiliCookie() {
  try {
    const result: { [key: string]: any } = await api.post('system/setting/BilibiliCookie', bilibiliCookie.value)

    if (result.success) {
      $toast.success('哔哩哔哩Cookie保存成功')
      await reloadSystem()
    } else $toast.error('哔哩哔哩Cookie保存失败！')
  } catch (error) {
    console.log(error)
  }
}
// 调用API查询下载器设置
async function loadImageHostingSetting() {
  const defaultImageHostingSettings = {
    'ipic': {
      'active': true,
    },
    'smms': {
      'apikey': '',
      'active': true,
    },
    'imgbb': {
      'apikey': '',
      'active': true,
    },
    'panda': {
      'apikey': '',
      'active': true,
    },
    'imgbox': {
      'username': '',
      'password': '',
      'active': true,
    },
  }
  try {
    const result: { [key: string]: any } = await api.get('system/setting/ImageHostingParams')
    CollectSettings.value.ImageHosting =
      Object.keys(result.data?.value || {}).length === 0 ? defaultImageHostingSettings : result.data?.value
  } catch (error) {
    console.log(error)
  }
}
async function loadSiteList() {
  try {
    const data: Site[] = await api.get('site/')
    allSites.value = data
  } catch (error) {
    console.log(error)
  }
}

// 导出站点模板
async function exportSiteSchemas() {
  try {
    // 获取所有站点模板数据
    const siteSchemas = await api.get('siteschema/')

    // 创建导出数据，只包含必要的字段，排除id
    const exportData = siteSchemas.map((schema: any) => {
      const { id, ...rest } = schema
      return rest
    })

    // 创建Blob对象
    const blob = new Blob([JSON.stringify(exportData, null, 2)], { type: 'application/json' })

    // 创建下载链接
    const url = URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.href = url
    link.download = `site_schemas_export_${new Date().toISOString().split('T')[0]}.json`
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
    URL.revokeObjectURL(url)

    // 显示成功提示
    $toast.success(t('setting.collect.siteSchemaExportSuccess'))
  } catch (error) {
    console.error('导出站点模板失败:', error)
    $toast.error(t('setting.collect.siteSchemaExportFailed'))
  }
}

// 处理导入成功
function handleImportSuccess() {
  // 重新获取站点模板数据
  loadSiteList()
  $toast.success(t('setting.collect.siteSchemaImportSuccess'))
}
// 调用API保存下载器设置
async function saveImageHostingSetting() {
  try {
    const imageHostingParam = CollectSettings.value.ImageHosting
    console.warn('imageHostingParam', imageHostingParam)
    const result: { [key: string]: any } = await api.post('system/setting/ImageHostingParams', imageHostingParam)
    if (result.success) $toast.success(t('setting.collect.imageHostingSaveSuccess'))
    else $toast.error(t('setting.collect.imageHostingSaveFailed'))
    await loadImageHostingSetting()
  } catch (error) {
    console.log(error)
  }
}

// 处理默认下载器状态
function handleDefaultImageHostings(enabledImageHostings: any[], imageHostings: any[]) {
  const enabledDefaultImageHosting = enabledImageHostings.find(item => item.default)
  if (enabledImageHostings.length > 0 && !enabledDefaultImageHosting) {
    imageHostings = imageHostings.map(item => {
      if (item === enabledImageHostings[0]) {
        $toast.info(t('setting.collect.defaultImageHostingNotice', { name: item.name }))
        return { ...item, default: true }
      }
      // 清除其他下载器的默认下载器状态
      return { ...item, default: false }
    })
  }
  return imageHostings
}

// 调用API查询媒体服务器设置
async function loadMediaServerSetting() {
  try {
    const result: { [key: string]: any } = await api.get('system/setting/MediaServers')
    mediaServers.value = result.data?.value ?? []
  } catch (error) {
    console.log(error)
  }
}

// 加载系统设置
async function loadSystemSettings() {
  try {
    const result: { [key: string]: any } = await api.get('system/env')
    if (result.success) {
      // 将API返回的值赋值给SystemSettings
      for (const sectionKey of Object.keys(CollectSettings.value) as Array<keyof typeof CollectSettings.value>) {
        Object.keys(CollectSettings.value[sectionKey]).forEach((key: string) => {
          if (result.data.hasOwnProperty(key)) (CollectSettings.value[sectionKey] as any)[key] = result.data[key]
        })
      }
      // 解析截图模板配置：优先用 JSON 配置，否则用预设名加载
      const tplCfg = CollectSettings.value.Basic.SCREENSHOT_TEMPLATE_CONFIG
      if (tplCfg) {
        try {
          const parsed = JSON.parse(tplCfg)
          // 合并默认值，确保新增字段（如 font）存在
          tplConfig.value = tplDeepMerge(TPL_DEFAULTS, parsed)
        } catch { /* ignore */ }
      } else {
        const tplName = CollectSettings.value.Basic.SCREENSHOT_TEMPLATE
        if (tplName && TPL_PRESETS[tplName]) loadPreset(tplName)
      }
      // 初始渲染预览
      renderTplPreview()
    }
  } catch (error) {
    console.log(error)
  }
}

// 调用API保存设置
async function saveSystemSetting(value: { [key: string]: any }) {
  try {
    const result: { [key: string]: any } = await api.post('system/env', value)
    if (result.success) {
      return true
    } else {
      $toast.error(result?.message || t('setting.collect.basicSaveFailed'))
      return false
    }
  } catch (error) {
    console.log(error)
  }
  return false
}

// 保存基础设置
async function saveBasicSettings() {
  if (await saveSystemSetting(CollectSettings.value.Basic)) {
    $toast.success(t('setting.collect.basicSaveSuccess'))
  }
}
// 保存腾讯API设置
async function saveTencentApiSettings() {
  if (await saveSystemSetting(CollectSettings.value.TencentApi)) {
    $toast.success(t('setting.collect.tencentApiSaveSuccess'))
  }
}
// 保存优酷下载线路设置
async function saveYoukuDownloadLineSettings() {
  if (await saveSystemSetting(CollectSettings.value.Youku)) {
    $toast.success(t('setting.collect.youkuDownloadLineSaveSuccess'))
  }
}
// 添加制作组配置
function addTeamConfig() {
  const newConfig: TeamConfig = {
    id: Date.now().toString(), // 使用时间戳作为唯一ID
    team: '',
    copyright: '',
    declare: '',
    ban_reprint: '',
    default: false,
    order: teamConfigs.value.length + 1,
  }

  teamConfigs.value.push(newConfig)

  // 如果是第一个制作组，设置为默认
  if (teamConfigs.value.length === 1) {
    newConfig.default = true
    defaultTeamId.value = newConfig.team
  }
}

// 删除媒体服务器
function removeMediaServer(ele: MediaServerConf) {
  const index = mediaServers.value.indexOf(ele)
  if (index !== -1) mediaServers.value.splice(index, 1)
}

// 删除制作组配置
function removeTeamConfig(teamConfig: TeamConfig) {
  const index = teamConfigs.value.indexOf(teamConfig)
  if (index !== -1) {
    // 如果删除的是默认制作组，设置第一个为默认
    if (teamConfig.default && teamConfigs.value.length > 1) {
      const remainingTeam = teamConfigs.value[0 === index ? 1 : 0]
      remainingTeam.default = true
      defaultTeamId.value = remainingTeam.team
    }

    teamConfigs.value.splice(index, 1)
  }
}

// 变更媒体服务器
function onMediaServerChange(mediaserver: MediaServerConf, name: string) {
  const index = mediaServers.value.findIndex(item => item.name === name)
  if (index !== -1) mediaServers.value[index] = mediaserver
}

// 制作组配置
type TeamConfig = {
  id: string // 添加唯一ID用于稳定的key
  team: string
  copyright: string
  declare: string
  ban_reprint: string
  default: boolean
  order: number
}

// 团队配置相关
const teamConfigs = ref<TeamConfig[]>([])
const isTeamLoading = ref(false)
const defaultTeamId = ref('')

// 查询制作组配置
async function queryTeamConfigs() {
  try {
    isTeamLoading.value = true
    const result: { [key: string]: any } = await api.get('system/setting/TEAM_PARAMS')
    if (result && result.data && result.data.value) {
      // 根据order字段排序
      teamConfigs.value = result.data.value
        .sort((a: any, b: any) => a.order - b.order)
        .map((item: any, index: number) => ({
          ...item,
          id: item.id || `team_${index}_${Date.now()}`, // 确保每个项目都有唯一ID
        }))
      // 处理默认值
      if (teamConfigs.value.length > 0) {
        const defaultConfig = teamConfigs.value.find(config => config.default)
        if (defaultConfig) {
          defaultTeamId.value = defaultConfig.team
        } else {
          teamConfigs.value[0].default = true
          defaultTeamId.value = teamConfigs.value[0].team
        }
      }
    }
  } catch (error) {
    console.log(error)
  } finally {
    isTeamLoading.value = false
  }
}

// 保存制作组配置
async function saveTeamConfigs() {
  try {
    // 验证至少要有一个制作组
    if (teamConfigs.value.length === 0) {
      $toast.error('至少需要保留一个制作组配置')
      return
    }

    // 验证每个制作组的名称和版权信息不能为空
    for (let i = 0; i < teamConfigs.value.length; i++) {
      const config = teamConfigs.value[i]
      if (!config.team || config.team.trim() === '') {
        $toast.error(`第 ${i + 1} 个制作组的名称不能为空`)
        return
      }
      if (!config.copyright || config.copyright.trim() === '') {
        $toast.error(`第 ${i + 1} 个制作组的版权信息不能为空`)
        return
      }
    }

    // 确保有默认制作组
    handleDefaultTeam(teamConfigs.value)

    // 更新order字段，并移除id字段
    const configsToSave = teamConfigs.value.map((item, index) => ({
      team: item.team,
      copyright: item.copyright,
      declare: item.declare,
      ban_reprint: item.ban_reprint,
      default: item.default,
      order: index + 1,
    }))

    const result: { [key: string]: any } = await api.post('system/setting/TEAM_PARAMS', JSON.stringify(configsToSave), {
      headers: {
        'Content-Type': 'text/plain',
      },
    })

    if (result.success) {
      $toast.success('制作组配置保存成功')
      await reloadSystem()
    } else {
      $toast.error('制作组配置保存失败！')
    }
  } catch (error) {
    console.log(error)
    $toast.error('保存失败，请重试')
  }
}

// 处理默认制作组
function handleDefaultTeam(teams: TeamConfig[]) {
  const defaultTeam = teams.find(item => item.default)
  if (teams.length > 0 && !defaultTeam) {
    teams[0].default = true
  }
  return teams
}

// 设置默认制作组
function setDefaultTeam(index: number) {
  teamConfigs.value.forEach((item, i) => {
    item.default = i === index
    if (item.default) {
      defaultTeamId.value = item.team
    }
  })
}

// 通过团队名称设置默认制作组
function setDefaultTeamByValue(teamName: string) {
  teamConfigs.value.forEach(config => {
    config.default = config.team === teamName
    if (config.default) {
      defaultTeamId.value = config.team
    }
  })
}

// 加载数据
onMounted(() => {
  queryTencentCookie()
  queryTvAppTicket()
  queryMgAppTicket()
  queryIqiyiCookie()
  queryYoukuCookie()
  queryYoukuStoken()
  queryBilibiliCookie()
  loadSystemFonts()
  loadImageHostingSetting()
  loadMediaServerSetting()
  loadSystemSettings()
  loadSiteList()
  queryTeamConfigs()
})

onActivated(async () => {
  isRequest.value = true
})

onDeactivated(() => {
  isRequest.value = false
})
</script>

<template>
  <ProgressDialog
    v-if="progressDialog"
    v-model="progressDialog"
    :text="t('setting.collect.reloading')"
    :indeterminate="true"
  />

  <VRow>
    <VCol cols="12">
      <VCard>
        <VCardItem>
          <VCardTitle>{{ t('setting.collect.basicSettings') }}</VCardTitle>
          <VCardSubtitle>{{ t('setting.collect.basicSettingsDesc') }}</VCardSubtitle>
        </VCardItem>
        <VCardText>
          <VForm @submit.prevent="() => {}">
            <VRow>
              <VCol cols="12" md="6">
                <VTextField
                  v-model="CollectSettings.Basic.MEDIA_DIR"
                  :label="t('setting.collect.mediaDir')"
                  :hint="t('setting.collect.mediaDirHint')"
                  placeholder="/mnt/media"
                  persistent-hint
                  prepend-inner-icon="mdi-folder-download"
                />
              </VCol>
              <VCol cols="12" md="6">
                <VTextField
                  v-model="CollectSettings.Basic.DOWNLOAD_DIR"
                  :label="t('setting.collect.downloadDir')"
                  :hint="t('setting.collect.downloadDirHint')"
                  placeholder="/mnt/media"
                  persistent-hint
                  prepend-inner-icon="mdi-folder-download"
                />
              </VCol>
              <VCol cols="12" md="6">
                <VTextField
                  v-model="CollectSettings.Basic.DOWNLOADER_THREAD_COUNT"
                  :label="t('setting.collect.downloaderThreadCount')"
                  :hint="t('setting.collect.downloaderThreadCountHint')"
                  placeholder="10"
                  persistent-hint
                  prepend-inner-icon="mdi-numeric"
                />
              </VCol>
              <VCol cols="12" md="6">
                <VTextField
                  v-model="CollectSettings.Basic.DOWNLOADER_SPEED"
                  :label="t('setting.collect.downloaderSpeed')"
                  :hint="t('setting.collect.downloaderSpeedHint')"
                  placeholder="10M"
                  persistent-hint
                  prepend-inner-icon="mdi-speedometer"
                />
              </VCol>
              <VCol cols="12" md="6">
                <VTextField
                  v-model="CollectSettings.Basic.DOWNLOAD_TASK_MAX_WORKERS"
                  :label="t('setting.collect.downloadTaskMaxWorkers')"
                  :hint="t('setting.collect.downloadTaskMaxWorkersHint')"
                  placeholder="1"
                  persistent-hint
                  prepend-inner-icon="mdi-view-week"
                />
              </VCol>
              <VCol cols="12" md="6">
                <VTextField
                  v-model="CollectSettings.Basic.DOWNLOADER_SLEEP_TIME"
                  :label="t('setting.collect.downloaderSleepTime')"
                  :hint="t('setting.collect.downloaderSleepTimeHint')"
                  placeholder="1"
                  persistent-hint
                  prepend-inner-icon="mdi-fan"
                />
              </VCol>
              <VCol cols="12" md="6">
                <VTextField
                  v-model="CollectSettings.Basic.PTGEN_URL"
                  :label="t('setting.collect.ptgenUrl')"
                  :hint="t('setting.collect.ptgenUrlHint')"
                  placeholder="1"
                  persistent-hint
                  prepend-inner-icon="mdi-apple-safari"
                />
              </VCol>
              <VCol cols="12" md="6">
                <VTextField
                  v-model="CollectSettings.Basic.SECOND_PTGEN_URL"
                  :label="t('setting.collect.secondPtgenUrl')"
                  :hint="t('setting.collect.secondPtgenUrlHint')"
                  placeholder="1"
                  persistent-hint
                  prepend-inner-icon="mdi-google-chrome"
                />
              </VCol>
              <VCol cols="12" md="6">
                <VSwitch
                  v-model="CollectSettings.Basic.DOWNLOADER_DELETE_AFTER_DONE"
                  :label="t('setting.collect.downloaderDeleteAfterDone')"
                  :hint="t('setting.collect.downloaderDeleteAfterDoneHint')"
                  persistent-hint
                />
              </VCol>
              <VCol cols="12" md="6">
                <VSwitch
                  v-model="CollectSettings.Basic.SEED_SKIP_HASH_CHECK"
                  :label="t('setting.collect.seedSkipHashCheck')"
                  :hint="t('setting.collect.seedSkipHashCheckHint')"
                  persistent-hint
                />
              </VCol>
              <VCol cols="12" md="6">
                <VTextField
                  v-model="CollectSettings.Basic.HIGH_BITRATE_THRESHOLD"
                  type="number"
                  :label="t('setting.collect.highBitrateThreshold')"
                  :hint="t('setting.collect.highBitrateThresholdHint')"
                  placeholder="10000000"
                  persistent-hint
                  prepend-inner-icon="mdi-speedometer"
                />
              </VCol>
              <VCol cols="12" md="6">
                <VSwitch
                  v-model="CollectSettings.Basic.RAISE_EXCEPTION"
                  :label="t('setting.collect.raiseException')"
                  :hint="t('setting.collect.raiseExceptionHint')"
                  persistent-hint
                />
              </VCol>
              <VCol cols="12" md="6">
                <VSwitch
                  v-model="CollectSettings.Basic.API_DEBUG"
                  :label="t('setting.collect.apiDebug')"
                  :hint="t('setting.collect.apiDebugHint')"
                  persistent-hint
                />
              </VCol>
              <VCol cols="12" md="6">
                <VSelect
                  v-model="CollectSettings.Basic.SCREENSHOT_HDR_PROCESSOR"
                  :items="[
                    { title: '自动检测', value: 'auto' },
                    { title: 'libplacebo（强制，需Vulkan）', value: 'libplacebo' },
                    { title: 'zscale（强制CPU）', value: 'zscale' },
                  ]"
                  label="截图色彩处理引擎"
                  hint="HDR/DV 截图的色彩映射引擎。auto 自动检测 Vulkan；libplacebo 质量最好但需要 Vulkan 支持；zscale 纯 CPU 速度快但 DV 可能偏色"
                  persistent-hint
                  prepend-inner-icon="mdi-palette"
                />
              </VCol>
              <VCol cols="12" md="12">
                <VTextarea
                  v-model="CollectSettings.Basic.TV_FILE_FORMAT"
                  auto-grow
                  :placeholder="t('setting.collect.tvFileFormat')"
                  :hint="t('setting.collect.tvFileFormatHint')"
                  rows="3"
                  persistent-hint
                />
              </VCol>
              <VCol cols="12" md="12">
                <VTextarea
                  v-model="CollectSettings.Basic.TV_FOLDER_FORMAT"
                  auto-grow
                  :placeholder="t('setting.collect.tvFolderFormat')"
                  :hint="t('setting.collect.tvFolderFormatHint')"
                  rows="3"
                  persistent-hint
                />
              </VCol>
              <VCol cols="12" md="12">
                <VTextarea
                  v-model="CollectSettings.Basic.TV_TITLE_FORMAT"
                  auto-grow
                  :placeholder="t('setting.collect.tvTitleFormat')"
                  :hint="t('setting.collect.tvTitleFormatHint')"
                  rows="3"
                  persistent-hint
                />
              </VCol>
              <VCol cols="12" md="12">
                <VTextarea
                  v-model="CollectSettings.Basic.MOVIE_FOLDER_FORMAT"
                  auto-grow
                  :placeholder="t('setting.collect.movieFolderFormat')"
                  :hint="t('setting.collect.movieFolderFormatHint')"
                  rows="3"
                  persistent-hint
                />
              </VCol>
              <VCol cols="12" md="12">
                <VTextarea
                  v-model="CollectSettings.Basic.MOVIE_FILE_FORMAT"
                  auto-grow
                  :placeholder="t('setting.collect.movieFileFormat')"
                  :hint="t('setting.collect.movieFileFormatHint')"
                  rows="3"
                  persistent-hint
                />
              </VCol>
              <VCol cols="12" md="12">
                <VTextarea
                  v-model="CollectSettings.Basic.MOVIE_TITLE_FORMAT"
                  auto-grow
                  :placeholder="t('setting.collect.movieTitleFormat')"
                  :hint="t('setting.collect.movieTitleFormatHint')"
                  rows="3"
                  persistent-hint
                />
              </VCol>
            </VRow>
          </VForm>
        </VCardText>
        <VCardText>
          <VForm @submit.prevent="() => {}">
            <div class="d-flex flex-wrap gap-4 mt-4">
              <VBtn type="submit" @click="saveBasicSettings" prepend-icon="mdi-content-save">
                {{ t('common.save') }}
              </VBtn>
            </div>
          </VForm>
        </VCardText>
      </VCard>
    </VCol>
  </VRow>

  <!-- 截图模板配置（独立卡片，左右两栏） -->
  <VRow>
    <VCol cols="12">
      <VCard>
        <VCardItem class="pb-2">
          <VCardTitle class="text-h6">{{ t('setting.collect.screenshotTemplate') }}</VCardTitle>
        </VCardItem>
        <VCardText>
          <VRow>
            <!-- 左：预览图（可点击查看大图） -->
            <VCol cols="12" md="7">
              <div class="position-relative" style="min-height:200px">
                <VProgressLinear v-if="previewLoading" indeterminate color="primary" absolute />
                <VImg v-if="tplPreviewSrc" :src="tplPreviewSrc" contain class="rounded-0"
                      style="cursor:pointer;max-height:70vh" @click="tplPreviewLarge = true" />
                <div v-else class="d-flex align-center justify-center bg-grey-lighten-3 rounded-0" style="min-height:300px">
                  <span class="text-medium-emphasis">{{ realtimePreview ? '正在生成预览…' : '点击「预览」查看效果' }}</span>
                </div>
              </div>
            </VCol>
            <!-- 右：控制区 -->
            <VCol cols="12" md="5">
              <!-- 工具栏 -->
              <div class="d-flex align-center gap-2 mb-2 flex-wrap">
                <VSelect v-model="activePreset" :items="Object.keys(TPL_PRESETS)" density="compact"
                         label="预设" variant="outlined" hide-details style="max-width:110px"
                         @update:model-value="loadPreset" />
                <VSwitch v-model="realtimePreview" label="实时" density="compact" hide-details color="primary" />
                <VSpacer />
                <VBtn v-if="!realtimePreview" size="small" color="primary" variant="outlined"
                      :loading="previewLoading" prepend-icon="mdi-eye" @click="renderTplPreview">预览</VBtn>
                <VBtn size="small" color="primary" :loading="savingScreenshotConfig"
                      prepend-icon="mdi-content-save" @click="saveScreenshotConfig">保存</VBtn>
              </div>

              <!-- 背景 -->
              <div class="text-body-2 font-weight-bold mb-1">背景</div>
              <VBtnGroup divided density="compact" class="mb-2" style="width:100%">
                <VBtn v-for="bt in ['solid','blur','frosted','gradient']" :key="bt" size="x-small"
                      :variant="tplConfig.background.type===bt?'flat':'outlined'" :color="tplConfig.background.type===bt?'primary':''"
                      style="flex:1" @click="tplConfig.background.type=bt">
                  {{ {solid:'纯色',blur:'模糊',frosted:'毛玻璃',gradient:'渐变'}[bt] }}
                </VBtn>
              </VBtnGroup>
              <VRow dense class="mb-1" no-gutters>
                <VCol v-if="tplConfig.background.type==='solid'" cols="12" class="pr-1">
                  <VMenu :close-on-content-click="false" location="bottom start">
                    <template #activator="{ props: mp }">
                      <VTextField v-bind="mp" v-model="tplConfig.background.color" label="背景色" density="compact" readonly variant="outlined" hide-details>
                        <template #prepend-inner><div :style="{backgroundColor:tplConfig.background.color,width:'18px',height:'18px',borderRadius:'3px',border:'1px solid #ccc'}" /></template>
                      </VTextField>
                    </template>
                    <VColorPicker v-model="tplConfig.background.color" mode="hex" hide-inputs />
                  </VMenu>
                </VCol>
                <VCol v-if="['blur','frosted'].includes(tplConfig.background.type)" cols="6" class="pr-1">
                  <div class="d-flex align-center gap-1">
                    <span class="text-caption" style="min-width:28px">模糊</span>
                    <VSlider v-model="tplConfig.background.blur" :min="0" :max="80" density="compact" hide-details thumb-size="14" class="flex-grow-1" />
                    <input v-model.number="tplConfig.background.blur" type="number" style="width:50px;text-align:center;font-size:15px;font-weight:bold;border:1px solid #666;border-radius:4px;padding:4px 2px;background:#fff;color:#000 !important" />
                  </div>
                </VCol>
                <VCol v-if="tplConfig.background.type==='frosted'" cols="6" class="pl-1">
                  <div class="d-flex align-center gap-1">
                    <span class="text-caption" style="min-width:28px">压暗</span>
                    <VSlider v-model="tplConfig.background.scrim_alpha" :min="0" :max="255" density="compact" hide-details thumb-size="14" class="flex-grow-1" />
                    <input v-model.number="tplConfig.background.scrim_alpha" type="number" style="width:50px;text-align:center;font-size:15px;font-weight:bold;border:1px solid #666;border-radius:4px;padding:4px 2px;background:#fff;color:#000 !important" />
                  </div>
                </VCol>
              </VRow>

              <!-- 拼图 -->
              <div class="text-body-2 font-weight-bold mb-1 mt-2">拼图</div>
              <VRow dense class="mb-1" no-gutters>
                <VCol cols="6" class="pr-1"><div class="d-flex align-center gap-1">
                  <span class="text-caption" style="min-width:28px">间距</span>
                  <VSlider v-model="tplConfig.grid.gap" :min="0" :max="30" density="compact" hide-details thumb-size="14" class="flex-grow-1" />
                  <input v-model.number="tplConfig.grid.gap" type="number" style="width:50px;text-align:center;font-size:15px;font-weight:bold;border:1px solid #666;border-radius:4px;padding:4px 2px;background:#fff;color:#000 !important" />
                </div></VCol>
                <VCol cols="6" class="pl-1"><div class="d-flex align-center gap-1">
                  <span class="text-caption" style="min-width:28px">圆角</span>
                  <VSlider v-model="tplConfig.grid.corner_radius" :min="0" :max="30" density="compact" hide-details thumb-size="14" class="flex-grow-1" />
                  <input v-model.number="tplConfig.grid.corner_radius" type="number" style="width:50px;text-align:center;font-size:15px;font-weight:bold;border:1px solid #666;border-radius:4px;padding:4px 2px;background:#fff;color:#000 !important" />
                </div></VCol>
                <VCol cols="6" class="pr-1"><div class="d-flex align-center gap-1">
                  <span class="text-caption" style="min-width:28px">描边</span>
                  <VSlider v-model="tplConfig.grid.border_width" :min="0" :max="5" density="compact" hide-details thumb-size="14" class="flex-grow-1" />
                  <input v-model.number="tplConfig.grid.border_width" type="number" style="width:50px;text-align:center;font-size:15px;font-weight:bold;border:1px solid #666;border-radius:4px;padding:4px 2px;background:#fff;color:#000 !important" />
                </div></VCol>
                <VCol cols="6" class="pl-1">
                  <VMenu :close-on-content-click="false" location="bottom start">
                    <template #activator="{ props: mp }">
                      <VTextField v-bind="mp" v-model="tplConfig.grid.border_color" label="描边色" density="compact" readonly variant="outlined" hide-details>
                        <template #prepend-inner><div :style="{backgroundColor:tplConfig.grid.border_color,width:'18px',height:'18px',borderRadius:'3px',border:'1px solid #ccc'}" /></template>
                      </VTextField>
                    </template>
                    <VColorPicker v-model="tplConfig.grid.border_color" mode="hex" hide-inputs />
                  </VMenu>
                </VCol>
              </VRow>
              <VSwitch v-model="tplConfig.grid.shadow" label="柔影" density="compact" hide-details class="mb-1 mt-1" />
              <VSwitch v-model="tplConfig.grid.show_timestamp" label="截图时间戳" density="compact" hide-details class="mb-1" />

              <!-- 元数据 -->
              <div class="text-body-2 font-weight-bold mb-1 mt-2">元数据</div>
              <VRow dense class="mb-1" no-gutters>
                <VCol cols="4" class="pr-1"><VSelect v-model="tplConfig.metadata.position"
                  :items="[{title:'顶部',value:'top'},{title:'底部',value:'bottom'},{title:'叠加',value:'overlay'},{title:'左侧',value:'left'}]"
                  label="位置" density="compact" variant="outlined" hide-details /></VCol>
                <VCol cols="4" class="px-1"><VSelect v-model="tplConfig.metadata.align"
                  :items="[{title:'左对齐',value:'left'},{title:'居中',value:'center'}]"
                  label="对齐" density="compact" variant="outlined" hide-details /></VCol>
                <VCol cols="4" class="pl-1">
                  <VMenu :close-on-content-click="false" location="bottom start">
                    <template #activator="{ props: mp }">
                      <VTextField v-bind="mp" v-model="tplConfig.metadata.font_color" label="文字色" density="compact" readonly variant="outlined" hide-details>
                        <template #prepend-inner><div :style="{backgroundColor:tplConfig.metadata.font_color,width:'18px',height:'18px',borderRadius:'3px',border:'1px solid #ccc'}" /></template>
                      </VTextField>
                    </template>
                    <VColorPicker v-model="tplConfig.metadata.font_color" mode="hex" hide-inputs />
                  </VMenu>
                </VCol>
              </VRow>
              <div class="d-flex gap-2 flex-wrap mt-1">
                <VSwitch v-model="tplConfig.metadata.hierarchy" label="标题放大" density="compact" hide-details />
                <VSwitch v-model="tplConfig.metadata.label_prefix" label="File:" density="compact" hide-details />
                <VSwitch v-model="tplConfig.metadata.outline" label="深色描边" density="compact" hide-details />
                <VSwitch v-model="tplConfig.metadata.bold" label="文字加粗" density="compact" hide-details />
                <VSwitch v-model="tplConfig.poster.show_cover" label="显示封面" density="compact" hide-details />
              </div>

              <!-- 字体 -->
              <div class="text-body-2 font-weight-bold mb-1 mt-2">字体</div>
              <VRow dense class="mb-1" no-gutters>
                <VCol cols="6" class="pr-1">
                  <VAutocomplete v-model="tplConfig.font.primary" :items="systemFonts" clearable
                    label="主字体" density="compact" variant="outlined" hide-details />
                </VCol>
                <VCol cols="6" class="pl-1">
                  <VAutocomplete v-model="tplConfig.font.fallback" :items="systemFonts" clearable
                    label="Fallback 字体" density="compact" variant="outlined" hide-details />
                </VCol>
              </VRow>
            </VCol>
          </VRow>
        </VCardText>
      </VCard>
    </VCol>
  </VRow>

  <!-- 预览大图 -->
  <VDialog v-model="tplPreviewLarge" max-width="95vw">
    <VImg v-if="tplPreviewSrc" :src="tplPreviewSrc" max-height="90vh" contain @click="tplPreviewLarge = false" style="cursor:pointer" class="rounded-0" />
  </VDialog>

  <VRow>
    <VCol cols="12">
      <VCard>
        <VCardItem>
          <VCardTitle>{{ t('setting.collect.imageHosting') }}</VCardTitle>
          <VCardSubtitle>{{ t('setting.collect.imageHostingDesc') }}</VCardSubtitle>
        </VCardItem>
        <VCardText>
          <VForm @submit.prevent="() => {}">
            <VRow>
              <!-- ipic -->
              <VCol cols="12" class="pb-2">
                <VListSubheader class="text-lg font-bold">{{ t('setting.collect.ipic') }}</VListSubheader>
              </VCol>
              <VCol cols="12" md="6">
                <VSwitch
                  v-model="CollectSettings.ImageHosting.ipic.active"
                  :label="t('setting.collect.active')"
                  persistent-hint
                />
              </VCol>
              <!-- smms -->
              <VCol cols="12" class="pb-2">
                <VListSubheader class="text-lg font-bold">{{ t('setting.collect.smms') }}</VListSubheader>
              </VCol>
              <VCol cols="12" md="6">
                <VTextField
                  v-model="CollectSettings.ImageHosting.smms.apikey"
                  :label="t('setting.collect.apikey')"
                  prepend-inner-icon="mdi-key"
                />
              </VCol>
              <VCol cols="12" md="6">
                <VSwitch v-model="CollectSettings.ImageHosting.smms.active" :label="t('setting.collect.active')" />
              </VCol>
              <!-- imgbb -->
              <VCol cols="12" class="pb-2">
                <VListSubheader class="text-lg font-bold">{{ t('setting.collect.imgbb') }}</VListSubheader>
              </VCol>
              <VCol cols="12" md="6">
                <VTextField
                  v-model="CollectSettings.ImageHosting.imgbb.apikey"
                  :label="t('setting.collect.apikey')"
                  prepend-inner-icon="mdi-key"
                />
              </VCol>
              <VCol cols="12" md="6">
                <VSwitch v-model="CollectSettings.ImageHosting.imgbb.active" :label="t('setting.collect.active')" />
              </VCol>

              <!-- panda -->
              <VCol cols="12" class="pb-2">
                <VListSubheader class="text-lg font-bold">{{ t('setting.collect.panda') }}</VListSubheader>
              </VCol>
              <VCol cols="12" md="6">
                <VTextField
                  v-model="CollectSettings.ImageHosting.panda.apikey"
                  :label="t('setting.collect.apikey')"
                  prepend-inner-icon="mdi-key"
                />
              </VCol>
              <VCol cols="12" md="6">
                <VSwitch v-model="CollectSettings.ImageHosting.panda.active" :label="t('setting.collect.active')" />
              </VCol>

              <!-- imgbox -->
              <VCol cols="12" class="pb-2">
                <VListSubheader class="text-lg font-bold">{{ t('setting.collect.imgbox') }}</VListSubheader>
              </VCol>
              <VCol cols="12" md="6">
                <VTextField
                  v-model="CollectSettings.ImageHosting.imgbox.username"
                  :label="t('setting.collect.username')"
                  prepend-inner-icon="mdi-account"
                />
              </VCol>
              <VCol cols="12" md="6">
                <VTextField
                  v-model="CollectSettings.ImageHosting.imgbox.password"
                  :label="t('setting.collect.password')"
                  prepend-inner-icon="mdi-account-key"
                />
              </VCol>
              <VCol cols="12" md="6">
                <VSwitch v-model="CollectSettings.ImageHosting.imgbox.active" :label="t('setting.collect.active')" />
              </VCol>
            </VRow>
          </VForm>
        </VCardText>
        <VCardText>
          <VForm @submit.prevent="() => {}">
            <div class="d-flex flex-wrap gap-4 mt-4">
              <VBtn type="submit" @click="saveImageHostingSetting" prepend-icon="mdi-content-save">
                {{ t('common.save') }}
              </VBtn>
            </div>
          </VForm>
        </VCardText>
      </VCard>
    </VCol>
  </VRow>
  <VRow>
    <VCol cols="12">
      <VCard>
        <VCardItem>
          <VCardTitle>{{ t('setting.collect.siteSchema') }}</VCardTitle>
          <VCardSubtitle>{{ t('setting.collect.siteSchemaDesc') }}</VCardSubtitle>
        </VCardItem>
        <VCardText>
          <draggable
            v-model="allSites"
            handle=".cursor-move"
            item-key="id"
            tag="div"
            :component-data="{ 'class': 'grid gap-3 grid-app-card' }"
          >
            <template #item="{ element }">
              <SiteSchemaCard :site="element" @close="removeMediaServer(element)" @change="onMediaServerChange" />
            </template>
          </draggable>
        </VCardText>
        <VCardText>
          <VForm @submit.prevent="() => {}">
            <div class="d-flex flex-wrap gap-4 mt-4">
              <!-- 导入按钮 -->
              <VBtn color="primary" variant="tonal" @click="siteImportDialog = true" prepend-icon="mdi-import">
                {{ t('site.actions.import') }}
              </VBtn>
              <!-- 导出按钮 -->
              <VBtn color="warning" variant="tonal" @click="exportSiteSchemas" prepend-icon="mdi-export">
                {{ t('site.actions.export') }}
              </VBtn>
            </div>
          </VForm>
        </VCardText>
      </VCard>
    </VCol>
  </VRow>
  <VRow>
    <VCol cols="12">
      <VCard>
        <VCardItem>
          <VCardTitle> {{ t('setting.collect.tencentCookie') }}</VCardTitle>
          <VCardSubtitle>{{ t('setting.collect.tencentCookieHint') }} </VCardSubtitle>
        </VCardItem>
        <VCardText>
          <VTextarea
            v-model="tencentCookie"
            auto-grow
            :placeholder="t('setting.collect.tencentCookie')"
            :hint="t('setting.collect.tencentCookieHint')"
            rows="3"
            persistent-hint
          />
        </VCardText>
        <VCardText>
          <VAlert type="info" variant="tonal" :title="t('setting.collect.tencentCookieTipsTitle')">
            <span v-html="t('setting.collect.tencentCookieTips')" />
          </VAlert>
        </VCardText>
        <VCardText>
          <VForm @submit.prevent="() => {}">
            <div class="d-flex flex-wrap gap-4 mt-4">
              <VBtn type="submit" @click="saveTencentCookie"> {{ t('common.save') }} </VBtn>
            </div>
          </VForm>
        </VCardText>
      </VCard>
    </VCol>
  </VRow>
  <VRow>
    <VCol cols="12">
      <VCard>
        <VCardItem>
          <VCardTitle>{{ t('setting.collect.tencentApiSettings') }}</VCardTitle>
          <VCardSubtitle>{{ t('setting.collect.tencentApiSettingsDesc') }}</VCardSubtitle>
        </VCardItem>
        <VCardText>
          <VForm @submit.prevent="() => {}">
            <VRow>
              <VCol cols="12" md="6">
                <VTextField
                  v-model="CollectSettings.TencentApi.TENCENT_CHACHAO20_API_URL"
                  :label="t('setting.collect.tencentChachao20ApiUrl')"
                  :hint="t('setting.collect.tencentChachao20ApiUrlHint')"
                  persistent-hint
                  prepend-inner-icon="mdi-lock-open-outline"
                />
              </VCol>
              <VCol cols="12" md="6">
                <VTextField
                  v-model="CollectSettings.TencentApi.TENCENT_CKEY42_API_URL"
                  :label="t('setting.collect.tencentCkey42ApiUrl')"
                  :hint="t('setting.collect.tencentCkey42ApiUrlHint')"
                  persistent-hint
                  prepend-inner-icon="mdi-key"
                />
              </VCol>
            </VRow>
          </VForm>
        </VCardText>
        <VCardText>
          <VForm @submit.prevent="() => {}">
            <div class="d-flex flex-wrap gap-4 mt-4">
              <VBtn type="submit" @click="saveTencentApiSettings" prepend-icon="mdi-content-save">
                {{ t('common.save') }}
              </VBtn>
            </div>
          </VForm>
        </VCardText>
      </VCard>
    </VCol>
  </VRow>
  <VRow>
    <VCol cols="12">
      <VCard>
        <VCardItem>
          <VCardTitle> {{ t('setting.collect.mgTvTicket') }}</VCardTitle>
          <VCardSubtitle>{{ t('setting.collect.mgTvTicketHint') }} </VCardSubtitle>
        </VCardItem>
        <VCardText>
          <VTextField
            v-model="mgTvTicket"
            auto-grow
            :placeholder="t('setting.collect.mgTvTicket')"
            :hint="t('setting.collect.mgTvTicketHint')"
            rows="3"
            persistent-hint
          />
        </VCardText>
        <VCardText>
          <VForm @submit.prevent="() => {}">
            <div class="d-flex flex-wrap gap-4 mt-4">
              <VBtn type="submit" @click="saveMgTvTicket"> {{ t('common.save') }} </VBtn>
            </div>
          </VForm>
        </VCardText>
      </VCard>
    </VCol>
  </VRow>
  <VRow>
    <VCol cols="12">
      <VCard>
        <VCardItem>
          <VCardTitle> {{ t('setting.collect.mgAppTicket') }}</VCardTitle>
          <VCardSubtitle>{{ t('setting.collect.mgAppTicketHint') }} </VCardSubtitle>
        </VCardItem>
        <VCardText>
          <VTextField
            v-model="mgAppTicket"
            auto-grow
            :placeholder="t('setting.collect.mgAppTicket')"
            :hint="t('setting.collect.mgAppTicketHint')"
            rows="3"
            persistent-hint
          />
        </VCardText>
        <VCardText>
          <VForm @submit.prevent="() => {}">
            <div class="d-flex flex-wrap gap-4 mt-4">
              <VBtn type="submit" @click="saveMgAppTicket"> {{ t('common.save') }} </VBtn>
            </div>
          </VForm>
        </VCardText>
      </VCard>
    </VCol>
  </VRow>
  <VRow>
    <VCol cols="12">
      <VCard>
        <VCardItem>
          <VCardTitle> {{ t('setting.collect.iqiyiCookie') }}</VCardTitle>
          <VCardSubtitle>{{ t('setting.collect.iqiyiCookieHint') }} </VCardSubtitle>
        </VCardItem>
        <VCardText>
          <VTextarea
            v-model="iqiyiCookie"
            auto-grow
            :placeholder="t('setting.collect.iqiyiCookie')"
            :hint="t('setting.collect.iqiyiCookieHint')"
            rows="3"
            persistent-hint
          />
        </VCardText>
        <VCardText>
          <VAlert type="info" variant="tonal" :title="t('setting.collect.iqiyiCookieTipsTitle')">
            <span v-html="t('setting.collect.iqiyiCookieTips')" />
          </VAlert>
        </VCardText>
        <VCardText>
          <VForm @submit.prevent="() => {}">
            <div class="d-flex flex-wrap gap-4 mt-4">
              <VBtn type="submit" @click="saveIqiyiCookie"> {{ t('common.save') }} </VBtn>
            </div>
          </VForm>
        </VCardText>
      </VCard>
    </VCol>
  </VRow>
  <VRow>
    <VCol cols="12">
      <VCard>
        <VCardItem>
          <VCardTitle> {{ t('setting.collect.youkuCookie') }}</VCardTitle>
          <VCardSubtitle>{{ t('setting.collect.youkuCookieHint') }} </VCardSubtitle>
        </VCardItem>
        <VCardText>
          <VTextarea
            v-model="youkuCookie"
            auto-grow
            :placeholder="t('setting.collect.youkuCookie')"
            :hint="t('setting.collect.youkuCookieHint')"
            rows="3"
            persistent-hint
          />
        </VCardText>
        <VCardText>
          <VAlert type="info" variant="tonal" :title="t('setting.collect.youkuCookieTipsTitle')">
            <span v-html="t('setting.collect.youkuCookieTips')" />
          </VAlert>
        </VCardText>
        <VCardText>
          <VForm @submit.prevent="() => {}">
            <div class="d-flex flex-wrap gap-4 mt-4">
              <VBtn type="submit" @click="saveYoukuCookie"> {{ t('common.save') }} </VBtn>
            </div>
          </VForm>
        </VCardText>
      </VCard>
    </VCol>
  </VRow>
  <VRow>
    <VCol cols="12">
      <VCard>
        <VCardItem>
          <VCardTitle> {{ t('setting.collect.youkuStoken') }}</VCardTitle>
          <VCardSubtitle>{{ t('setting.collect.youkuStokenHint') }} </VCardSubtitle>
        </VCardItem>
        <VCardText>
          <VTextarea
            v-model="youkuStoken"
            auto-grow
            :placeholder="t('setting.collect.youkuStoken')"
            :hint="t('setting.collect.youkuStokenHint')"
            rows="3"
            persistent-hint
          />
        </VCardText>
        <VCardText>
          <VAlert type="info" variant="tonal" :title="t('setting.collect.youkuStokenTipsTitle')">
            <span v-html="t('setting.collect.youkuStokenTips')" />
          </VAlert>
        </VCardText>
        <VCardText>
          <VForm @submit.prevent="() => {}">
            <div class="d-flex flex-wrap gap-4 mt-4">
              <VBtn type="submit" @click="saveYoukuStoken"> {{ t('common.save') }} </VBtn>
            </div>
          </VForm>
        </VCardText>
      </VCard>
    </VCol>
  </VRow>
  <VRow>
    <VCol cols="12">
      <VCard>
        <VCardItem>
          <VCardTitle>{{ t('setting.collect.youkuDownloadLine') }}</VCardTitle>
          <VCardSubtitle>{{ t('setting.collect.youkuDownloadLineHint') }}</VCardSubtitle>
        </VCardItem>
        <VCardText>
          <VSelect
            v-model="CollectSettings.Youku.YOUKU_DOWNLOAD_LINE"
            :items="youkuDownloadLineOptions"
            item-title="title"
            item-value="value"
            :label="t('setting.collect.youkuDownloadLine')"
            :hint="t('setting.collect.youkuDownloadLineHint')"
            persistent-hint
            prepend-inner-icon="mdi-routes"
          />
        </VCardText>
        <VCardText>
          <VForm @submit.prevent="() => {}">
            <div class="d-flex flex-wrap gap-4 mt-4">
              <VBtn type="submit" @click="saveYoukuDownloadLineSettings"> {{ t('common.save') }} </VBtn>
            </div>
          </VForm>
        </VCardText>
      </VCard>
    </VCol>
  </VRow>
  <VRow>
    <VCol cols="12">
      <VCard>
        <VCardItem>
          <VCardTitle> {{ t('setting.collect.bilibiliCookie') }}</VCardTitle>
          <VCardSubtitle>{{ t('setting.collect.bilibiliCookieHint') }} </VCardSubtitle>
        </VCardItem>
        <VCardText>
          <VTextarea
            v-model="bilibiliCookie"
            auto-grow
            :placeholder="t('setting.collect.bilibiliCookie')"
            :hint="t('setting.collect.bilibiliCookieHint')"
            rows="3"
            persistent-hint
          />
        </VCardText>
        <VCardText>
          <VAlert type="info" variant="tonal" :title="t('setting.collect.bilibiliCookieTipsTitle')">
            <span v-html="t('setting.collect.bilibiliCookieTips')" />
          </VAlert>
        </VCardText>
        <VCardText>
          <VForm @submit.prevent="() => {}">
            <div class="d-flex flex-wrap gap-4 mt-4">
              <VBtn type="submit" @click="saveBilibiliCookie"> {{ t('common.save') }} </VBtn>
            </div>
          </VForm>
        </VCardText>
      </VCard>
    </VCol>
  </VRow>

  <!-- 制作组配置 -->
  <VRow>
    <VCol cols="12">
      <VCard>
        <VCardItem>
          <VCardTitle>{{ t('collect.teamConfig') }}</VCardTitle>
          <VCardSubtitle>{{ t('collect.teamConfigDesc') }}</VCardSubtitle>
        </VCardItem>
        <VCardText>
          <VAlert v-if="isTeamLoading" type="info" variant="tonal">
            {{ t('common.loading') }}
          </VAlert>

          <VAlert v-else-if="teamConfigs.length === 0" type="info" variant="tonal">
            {{ t('collect.noTeamConfig') }}
          </VAlert>

          <div v-else class="mb-4">
            <draggable v-model="teamConfigs" item-key="id" handle=".drag-handle" @end="() => {}" class="draggable-list">
              <template #item="{ element, index }">
                <VCard class="mb-2">
                  <VCardText class="p-3">
                    <div class="flex items-center gap-4 mb-3">
                      <VIcon class="drag-handle cursor-move" color="grey">mdi-drag-vertical</VIcon>
                      <VRadio
                        v-model="defaultTeamId"
                        :value="element.team"
                        :label="t('collect.defaultTeam')"
                        @change="setDefaultTeamByValue(element.team)"
                      />
                      <div class="text-xs text-grey ml-auto">{{ t('collect.order') }}: {{ index + 1 }}</div>
                    </div>

                    <div class="flex flex-col md:flex-row gap-2">
                      <VTextField
                        v-model="element.team"
                        :label="t('collect.teamName')"
                        dense
                        outlined
                        hide-details
                        full-width
                      />
                      <VTextField
                        v-model="element.copyright"
                        :label="t('collect.copyright')"
                        dense
                        outlined
                        hide-details
                        full-width
                      />
                      <VTextField
                        v-model="element.declare"
                        :label="t('common.declare')"
                        dense
                        outlined
                        hide-details
                        full-width
                      />
                      <VTextField
                        v-model="element.ban_reprint"
                        :label="t('collect.banReprint')"
                        dense
                        outlined
                        hide-details
                        full-width
                      />
                      <VBtn
                        color="error"
                        icon
                        @click="removeTeamConfig(element)"
                        :disabled="teamConfigs.length <= 1"
                        class="self-center"
                      >
                        <VIcon>mdi-delete</VIcon>
                      </VBtn>
                    </div>
                  </VCardText>
                </VCard>
              </template>
            </draggable>
          </div>
        </VCardText>
        <VCardText>
          <VForm @submit.prevent="() => {}">
            <div class="d-flex flex-wrap gap-4 mt-4">
              <VBtn
                type="submit"
                @click="addTeamConfig"
                prepend-icon="mdi-plus"
                color="primary"
                :loading="isTeamLoading"
              >
                {{ t('common.add') }}
              </VBtn>
              <VBtn type="submit" @click="saveTeamConfigs" prepend-icon="mdi-content-save" :loading="isTeamLoading">
                {{ t('common.save') }}
              </VBtn>
            </div>
          </VForm>
        </VCardText>
      </VCard>
    </VCol>
  </VRow>

  <!-- 导入站点模板弹窗 -->
  <SiteSchemaImportDialog v-if="siteImportDialog" v-model="siteImportDialog" @import-success="handleImportSuccess" />
</template>

<style scoped>
</style>
