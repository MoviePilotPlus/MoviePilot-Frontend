import i18n from '@/plugins/i18n'

export const storageAttributes = [
  {
    type: 'local',
    icon: 'mdi-folder-multiple-outline',
    remote: false,
  },
  {
    type: 'alipan',
    icon: 'mdi-cloud-outline',
    remote: true,
  },
  {
    type: 'u115',
    icon: 'mdi-cloud-outline',
    remote: true,
  },
  {
    type: 'rclone',
    icon: 'mdi-server-network-outline',
    remote: true,
  },
  {
    type: 'alist',
    icon: 'mdi-server-network-outline',
    remote: true,
  },
  {
    type: 'alistgo',
    icon: 'mdi-server-network-outline',
    remote: true,
  },
  {
    type: 'smb',
    icon: 'mdi-folder-network-outline',
    remote: true,
  },
]

export const storageIconDict = storageAttributes.reduce((dict, item) => {
  dict[item.type] = item.icon
  return dict
}, {} as Record<string, string>)

export const storageRemoteDict = storageAttributes.reduce((dict, item) => {
  dict[item.type] = item.remote
  return dict
}, {} as Record<string, boolean>)

export const downloaderOptions = [
  {
    value: 'qbittorrent',
    title: i18n.global.t('setting.system.qbittorrent'),
  },
  {
    value: 'transmission',
    title: i18n.global.t('setting.system.transmission'),
  },
  {
    value: 'rtorrent',
    title: i18n.global.t('setting.system.rtorrent'),
  },
]

export const downloaderDict = downloaderOptions.reduce((dict, item) => {
  dict[item.value] = item.title
  return dict
}, {} as Record<string, string>)

export const mediaServerOptions = [
  {
    value: 'emby',
    title: i18n.global.t('setting.system.emby'),
  },
  {
    value: 'zspace',
    title: i18n.global.t('setting.system.zspace'),
  },
  {
    value: 'jellyfin',
    title: i18n.global.t('setting.system.jellyfin'),
  },
  {
    value: 'plex',
    title: i18n.global.t('setting.system.plex'),
  },
  {
    value: 'trimemedia',
    title: i18n.global.t('setting.system.trimeMedia'),
  },
]

// Legacy collect constants kept for backward-compatible collect/task views.
export const downloadStatus = {
  Init: '初始化',
  DownloadCreated: '创建完成',
  DownloadPending: '等待下载',
  Downloading: '正在下载',
  DownloadError: '下载出错',
  DownloadDone: '下载完成',
  DownloadStop: '下载停止',
  InfoCollected: '信息采集',
  Renamed: '重命名',
  Moved: '已转移',
  Finished: '完成',
}

export const collectStatus = {
  Init: '初始化',
  Downloaded: '下载完成',
  Downloading: '正在下载',
  ScreenshotCollected: '截图采集',
  InfoCollected: '元数据采集',
  ImageCollected: '截图完成',
  DescCollected: '简介采集',
  Renamed: '重命名',
  TorrentCreated: '制种',
  TorrentRemaking: '转种中',
  TorrentRemaked: '转种完成',
  Finished: '完成',
}

export const seedStatus = {
  Init: '待',
  TorrentUploaded: '传',
  TorrentDownloaded: '下',
  TorrentPublished: '种',
}

export const tagOptions = {
  Mandarin: '国语',
  ChineseSubtitles: '中字',
  Completed: '完结',
  Original: '原创',
  Children: '儿童片',
  Comedy: '喜剧',
  Official: '官方',
  Cantonese: '粤语',
  Japanese: '日语',
  Korean: '韩语',
  DolbyVision: '杜比视界',
  HDRVivid: 'HDRVivid',
  HDR10_PLUS: 'HDR10+',
  HDR10: 'HDR10',
  HighBitrate: '高码率',
  HighFrameRate: '高帧率',
  ThreeD: '3D',
  Collection: '合集',
  Episode: '分集',
  SHD: '4K',
  UHD: '8K',
  HLG: 'HLG',
}

export const mediaCateOptions = {
  Movie: '单片',
  TV: '剧集',
}

export const categoryOptions = {
  Movie: '电影',
  TV: '电视剧',
  Documentary: '纪录片',
  Comic: '动漫',
  Show: '综艺',
  Music: '音乐',
  Sports: '体育',
  Game: '游戏',
  Short: '短片',
  Other: '其他',
}

export const mediaServerDict = mediaServerOptions.reduce((dict, item) => {
  dict[item.value] = item.title
  return dict
}, {} as Record<string, string>)

export const innerFilterRules = [
  { title: i18n.global.t('filterRules.specSub'), value: ' SPECSUB ' },
  { title: i18n.global.t('filterRules.cnSub'), value: ' CNSUB ' },
  { title: i18n.global.t('filterRules.cnVoi'), value: ' CNVOI ' },
  { title: i18n.global.t('filterRules.gz'), value: ' GZ ' },
  { title: i18n.global.t('filterRules.notCnVoi'), value: ' !CNVOI ' },
  { title: i18n.global.t('filterRules.hkVoi'), value: ' HKVOI ' },
  { title: i18n.global.t('filterRules.notHkVoi'), value: ' !HKVOI ' },
  { title: i18n.global.t('filterRules.free'), value: ' FREE ' },
  { title: i18n.global.t('filterRules.resolution4k'), value: ' 4K ' },
  { title: i18n.global.t('filterRules.resolution1080p'), value: ' 1080P ' },
  { title: i18n.global.t('filterRules.resolution720p'), value: ' 720P ' },
  { title: i18n.global.t('filterRules.not720p'), value: ' !720P ' },
  { title: i18n.global.t('filterRules.qualityBlu'), value: ' BLU ' },
  { title: i18n.global.t('filterRules.notBlu'), value: ' !BLU ' },
  { title: i18n.global.t('filterRules.qualityBluray'), value: ' BLURAY ' },
  { title: i18n.global.t('filterRules.notBluray'), value: ' !BLURAY ' },
  { title: i18n.global.t('filterRules.qualityUhd'), value: ' UHD ' },
  { title: i18n.global.t('filterRules.notUhd'), value: ' !UHD ' },
  { title: i18n.global.t('filterRules.qualityRemux'), value: ' REMUX ' },
  { title: i18n.global.t('filterRules.notRemux'), value: ' !REMUX ' },
  { title: i18n.global.t('filterRules.qualityWebdl'), value: ' WEBDL ' },
  { title: i18n.global.t('filterRules.notWebdl'), value: ' !WEBDL ' },
  { title: i18n.global.t('filterRules.quality60fps'), value: ' 60FPS ' },
  { title: i18n.global.t('filterRules.not60fps'), value: ' !60FPS ' },
  { title: i18n.global.t('filterRules.codecH265'), value: ' H265 ' },
  { title: i18n.global.t('filterRules.notH265'), value: ' !H265 ' },
  { title: i18n.global.t('filterRules.codecH264'), value: ' H264 ' },
  { title: i18n.global.t('filterRules.notH264'), value: ' !H264 ' },
  { title: i18n.global.t('filterRules.effectDolby'), value: ' DOLBY ' },
  { title: i18n.global.t('filterRules.notDolby'), value: ' !DOLBY ' },
  { title: i18n.global.t('filterRules.effectAtmos'), value: ' ATMOS ' },
  { title: i18n.global.t('filterRules.notAtmos'), value: ' !ATMOS ' },
  { title: i18n.global.t('filterRules.effectHdr'), value: ' HDR ' },
  { title: i18n.global.t('filterRules.notHdr'), value: ' !HDR ' },
  { title: i18n.global.t('filterRules.effectSdr'), value: ' SDR ' },
  { title: i18n.global.t('filterRules.notSdr'), value: ' !SDR ' },
  { title: i18n.global.t('filterRules.effect3d'), value: ' 3D ' },
  { title: i18n.global.t('filterRules.not3d'), value: ' !3D ' },
]

export const transferTypeOptions = [
  { title: i18n.global.t('transferType.copy'), value: 'copy' },
  { title: i18n.global.t('transferType.move'), value: 'move' },
  { title: i18n.global.t('transferType.link'), value: 'link' },
  { title: i18n.global.t('transferType.softlink'), value: 'softlink' },
]

export const qualityOptions = ref([
  {
    title: i18n.global.t('qualityOptions.all'),
    value: '',
  },
  {
    title: i18n.global.t('qualityOptions.blurayOriginal'),
    value: 'Blu-?Ray.+VC-?1|Blu-?Ray.+AVC|UHD.+blu-?ray.+HEVC|MiniBD',
  },
  {
    title: i18n.global.t('qualityOptions.remux'),
    value: 'Remux',
  },
  {
    title: i18n.global.t('qualityOptions.bluray'),
    value: 'Blu-?Ray',
  },
  {
    title: i18n.global.t('qualityOptions.uhd'),
    value: 'UHD|UltraHD',
  },
  {
    title: i18n.global.t('qualityOptions.webdl'),
    value: 'WEB-?DL|WEB-?RIP',
  },
  {
    title: i18n.global.t('qualityOptions.hdtv'),
    value: 'HDTV',
  },
  {
    title: i18n.global.t('qualityOptions.h265'),
    value: '[Hx].?265|HEVC',
  },
  {
    title: i18n.global.t('qualityOptions.h264'),
    value: '[Hx].?264|AVC',
  },
])

// 分辨率选择框数据
export const resolutionOptions = ref([
  {
    title: i18n.global.t('resolutionOptions.all'),
    value: '',
  },
  {
    title: i18n.global.t('resolutionOptions.4k'),
    value: '4K|2160p|x2160',
  },
  {
    title: i18n.global.t('resolutionOptions.1080p'),
    value: '1080[pi]|x1080',
  },
  {
    title: i18n.global.t('resolutionOptions.720p'),
    value: '720[pi]|x720',
  },
])

// 特效选择框数据
export const effectOptions = ref([
  {
    title: i18n.global.t('effectOptions.all'),
    value: '',
  },
  {
    title: i18n.global.t('effectOptions.dolbyVision'),
    value: 'Dolby[\\s.]+Vision|DOVI|[\\s.]+DV[\\s.]+',
  },
  {
    title: i18n.global.t('effectOptions.dolbyAtmos'),
    value: 'Dolby[\\s.]*\\+?Atmos|Atmos',
  },
  {
    title: i18n.global.t('effectOptions.hdr'),
    value: '[\\s.]+HDR[\\s.]+|HDR10|HDR10\\+',
  },
  {
    title: i18n.global.t('effectOptions.sdr'),
    value: '[\\s.]+SDR[\\s.]+',
  },
])

// 媒体类型选项
export const mediaTypeOptions = [
  {
    title: i18n.global.t('mediaType.movie'),
    value: '电影',
  },
  {
    title: i18n.global.t('mediaType.tv'),
    value: '电视剧',
  },
  {
    title: i18n.global.t('mediaType.anime'),
    value: '动漫',
  },
  {
    title: i18n.global.t('mediaType.collection'),
    value: '合集',
  },
  {
    title: i18n.global.t('mediaType.unknown'),
    value: '未知',
  },
]

// 媒体类型字典
export const mediaTypeDict = mediaTypeOptions.reduce((dict, item) => {
  dict[item.value] = item.title
  return dict
}, {} as Record<string, string>)

// 通知开关选项
export const notificationSwitchOptions = [
  {
    title: i18n.global.t('notificationSwitch.resourceDownload'),
    value: '资源下载',
  },
  {
    title: i18n.global.t('notificationSwitch.organize'),
    value: '整理入库',
  },
  {
    title: i18n.global.t('notificationSwitch.subscribe'),
    value: '订阅',
  },
  {
    title: i18n.global.t('notificationSwitch.site'),
    value: '站点',
  },
  {
    title: i18n.global.t('notificationSwitch.mediaServer'),
    value: '媒体服务器',
  },
  {
    title: i18n.global.t('notificationSwitch.manual'),
    value: '手动处理',
  },
  {
    title: i18n.global.t('notificationSwitch.plugin'),
    value: '插件',
  },
  {
    title: i18n.global.t('notificationSwitch.agent'),
    value: '智能体',
  },
  {
    title: i18n.global.t('notificationSwitch.other'),
    value: '其它',
  },
]

// 通知开关字典
export const notificationSwitchDict = notificationSwitchOptions.reduce((dict, item) => {
  dict[item.value] = item.title
  return dict
}, {} as Record<string, string>)

// 操作步骤选项
export const actionStepOptions = [
  {
    title: i18n.global.t('actionStep.addDownload'),
    value: '添加下载',
  },
  {
    title: i18n.global.t('actionStep.addSubscribe'),
    value: '添加订阅',
  },
  {
    title: i18n.global.t('actionStep.fetchDownloads'),
    value: '获取下载任务',
  },
  {
    title: i18n.global.t('actionStep.fetchMedias'),
    value: '获取媒体数据',
  },
  {
    title: i18n.global.t('actionStep.fetchRss'),
    value: '获取RSS资源',
  },
  {
    title: i18n.global.t('actionStep.fetchTorrents'),
    value: '搜索站点资源',
  },
  {
    title: i18n.global.t('actionStep.filterMedias'),
    value: '过滤媒体数据',
  },
  {
    title: i18n.global.t('actionStep.filterTorrents'),
    value: '过滤资源',
  },
  {
    title: i18n.global.t('actionStep.scanFile'),
    value: '扫描目录',
  },
  {
    title: i18n.global.t('actionStep.scrapeFile'),
    value: '刮削文件',
  },
  {
    title: i18n.global.t('actionStep.sendEvent'),
    value: '发送事件',
  },
  {
    title: i18n.global.t('actionStep.sendMessage'),
    value: '发送消息',
  },
  {
    title: i18n.global.t('actionStep.transferFile'),
    value: '整理文件',
  },
  {
    title: i18n.global.t('actionStep.invokePlugin'),
    value: '调用插件',
  },
  {
    title: i18n.global.t('actionStep.note'),
    value: '备注',
  },
]

// 操作步骤字典
export const actionStepDict = actionStepOptions.reduce((dict, item) => {
  dict[item.value] = item.title
  return dict
}, {} as Record<string, string>)
