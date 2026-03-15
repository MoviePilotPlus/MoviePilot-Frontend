<script setup lang="ts">
import { ref, computed, onMounted, onUnmounted } from 'vue'
import api from '@/api'
import { useRouter } from 'vue-router'
import dayjs from 'dayjs'
import Hls from 'hls.js'
import { VProgressCircular, VDialog, VCard, VCardTitle, VCardText, VCardActions, VBtn } from 'vuetify/components'

const router = useRouter()

// 导入频道图标
const channelIcons = import.meta.glob('@/assets/images/channels/*.{png,webp,jpg,jpeg}', { eager: true })

// 获取频道图标路径
function getChannelIcon(channelName: string): string {
  if (!channelName) return ''
  
  // 处理特殊字符，将空格、点号等替换为下划线
  let cleanName = channelName
    .replace(/\s+/g, '')
    .replace(/[·.]+/g, '')
    .replace(/[+]+/g, '')
    .replace(/[（(].*?[）)]/g, '')
  
  // 常见的频道名称映射
  const nameMap: Record<string, string> = {
    'CCTV5+': 'CCTV5+',
    'CCTV16(4K)': 'CCTV16(4K)',
    'CCTV16': 'CCTV16',
    'CCTV4K': 'CCTV4K',
    'CCTV8K': 'CCTV8K',
    'CCTV世界地理': 'CCTV世界地理频道',
    'CCTV兵器科技': 'CCTV兵器科技频道',
    'CCTV卫生健康': 'CCTV卫生健康频道',
    'CCTV央视台球': 'CCTV央视台球频道',
    'CCTV央视文化精品': 'CCTV央视文化精品频道',
    'CCTV女性时尚': 'CCTV女性时尚频道',
    'CCTV怀旧剧场': 'CCTV怀旧剧场频道',
    'CCTV电视指南': 'CCTV电视指南频道',
    'CCTV第一剧场': 'CCTV第一剧场频道',
    'CCTV风云剧场': 'CCTV风云剧场频道',
    'CCTV风云足球': 'CCTV风云足球频道',
    'CCTV风云音乐': 'CCTV风云音乐频道',
    'CCTV高尔夫·网球': 'CCTV高尔夫·网球频道',
    'CGTN俄语': 'CGTN俄语频道',
    'CGTN外语纪录': 'CGTN外语纪录频道',
    'CGTN法语': 'CGTN法语频道',
    'CGTN西班牙语': 'CGTN西班牙语频道',
    'CGTN阿拉伯语': 'CGTN阿拉伯语频道',
    '中国教育电视台1': '中国教育电视台1频道',
    '福建东南': '福建东南卫视',
  }
  
  const mappedName = nameMap[channelName] || nameMap[cleanName] || cleanName
  
  // 尝试匹配图标
  for (const [path, module] of Object.entries(channelIcons)) {
    const fileName = path.split('/').pop() || ''
    const baseName = fileName.replace(/\.(png|webp|jpg|jpeg)$/, '')
    
    if (baseName === mappedName || baseName === channelName || baseName === cleanName) {
      return (module as any).default || path
    }
  }
  
  // 如果找不到，尝试模糊匹配
  for (const [path, module] of Object.entries(channelIcons)) {
    const fileName = path.split('/').pop() || ''
    const baseName = fileName.replace(/\.(png|webp|jpg|jpeg)$/, '')
    
    if (baseName.includes(mappedName) || mappedName.includes(baseName)) {
      return (module as any).default || path
    }
  }
  
  return ''
}

// 频道列表
const channels = ref<any[]>([])
const loading = ref(false)
const error = ref('')

// 选中的频道
const selectedChannel = ref<any>(null)

// 节目单相关
const programList = ref<any[]>([])
const programLoading = ref(false)
const currentDate = ref(dayjs())
const dateRange = ref<dayjs.Dayjs[]>([])

// 直播预览相关
const previewDialog = ref(false)
const previewLoading = ref(false)
const previewUrl = ref('')
const currentProgram = ref<any>(null)
const hls = ref<Hls | null>(null)
const videoRef = ref<HTMLVideoElement | null>(null)

// 生成7天日期
const generateDateRange = () => {
  const range = []
  for (let i = 0; i < 7; i++) {
    range.push(dayjs().add(i, 'day'))
  }
  dateRange.value = range
}

// 获取频道列表
const fetchChannels = async () => {
  loading.value = true
  error.value = ''
  try {
    channels.value = await api.get('ysp/get_channel_list')
    if (channels.value.length > 0) {
      selectedChannel.value = channels.value[0]
      fetchPrograms(selectedChannel.value.livepid)
    }
  } catch (err) {
    console.error('获取频道列表失败:', err)
    error.value = '获取频道列表失败'
  } finally {
    loading.value = false
  }
}

// 获取节目单
const fetchPrograms = async (channelId: string) => {
  if (!channelId) return

  programLoading.value = true
  try {
    const date = currentDate.value.format('YYYYMMDD')
    programList.value = await api.get(`ysp/get_epg?channel_id=${channelId}&date=${date}`)
  } catch (err) {
    console.error('获取节目单失败:', err)
  } finally {
    programLoading.value = false
  }
}

// 切换频道
const switchChannel = (channel: any) => {
  selectedChannel.value = channel
  fetchPrograms(channel.livepid)
}

// 切换日期
const switchDate = (date: dayjs.Dayjs) => {
  currentDate.value = date
  // 这里可以根据日期重新获取节目单
  if (selectedChannel.value) {
    fetchPrograms(selectedChannel.value.livepid)
  }
}

// 录制节目
const recordProgram = (program: any) => {
  if (!selectedChannel.value) return

  const { cnlid, name: channelName, livepid, defn } = selectedChannel.value
  const { name: programName, startTime, endTime } = program

  // 检查是否为未来节目（预约）
  const now = new Date()
  const programStart = new Date(startTime)
  const isReserved = programStart > now

  router.push({
    path: '/collect/video',
    query: {
      source: 'ysp',
      mediaid: cnlid,
      title: programName,
      cnlid,
      name: channelName,
      livepid,
      defn,
      programName,
      startTime,
      endTime,
      type: 'TV',
      cate: 'TV',
      isReserved: isReserved.toString(),
    },
  })
}

// 预览直播
const previewLive = async () => {
  console.log('previewLive函数被调用', { selectedChannel: selectedChannel.value })

  if (!selectedChannel.value) {
    console.error('没有选中的频道')
    return
  }

  const { name: channelName } = selectedChannel.value
  currentProgram.value = { name: `${channelName} 直播` }
  previewLoading.value = true

  console.log('开始获取直播信息...')

  try {
    const { cnlid, livepid, defn } = selectedChannel.value
    const apiUrl = `ysp/get_live_detail?cnlid=${cnlid}&livepid=${livepid}&defn=${defn}`
    console.log('API请求URL:', apiUrl)

    const response = (await api.get(apiUrl)) as any
    console.log('API响应:', response)

    if (response && response.iretcode === 0 && response.playurl) {
      previewUrl.value = response.playurl
      console.log('直播URL:', previewUrl.value)
      previewDialog.value = true
      console.log('预览对话框已打开')

      // 对话框打开后延迟初始化HLS
      setTimeout(() => {
        console.log('准备初始化HLS...')
        initHls()
      }, 200)
    } else {
      console.error('获取直播信息失败:', response?.errinfo || '响应格式错误')
    }
  } catch (err) {
    console.error('获取直播信息失败:', err)
  } finally {
    previewLoading.value = false
    console.log('previewLive函数执行完成')
  }
}

// 初始化HLS播放
const initHls = () => {
  console.log('初始化HLS播放:', { previewUrl: previewUrl.value, videoRef: videoRef.value })

  if (Hls.isSupported() && videoRef.value && previewUrl.value) {
    // 销毁之前的实例
    if (hls.value) {
      hls.value.destroy()
      hls.value = null
    }

    try {
      // 配置HLS选项，优化加载速度
      const hlsConfig = {
        maxBufferLength: 30, // 最大缓冲长度（秒），减少以加快加载
        maxBufferSize: 30 * 1024 * 1024, // 最大缓冲大小（字节）
        maxBufferHole: 0.5, // 缓冲孔洞阈值
        liveSyncDurationCount: 3, // 直播同步持续时间
        liveMaxLatencyDurationCount: 5, // 直播最大延迟持续时间
        liveDurationInfinity: true, // 直播时长无限
        startLevel: 0, // 从最低质量开始，加快加载速度
        startPosition: -1, // 从直播最新位置开始
        enableWorker: true, // 启用Web Worker
        lowLatencyMode: false, // 关闭低延迟模式以提高稳定性
        backBufferLength: 60, // 回退缓冲长度
        fragLoadingMaxRetry: 3, // 片段加载最大重试次数
        manifestLoadingMaxRetry: 3, // 清单加载最大重试次数
        timeout: 10000, // 请求超时时间（毫秒）
      }

      hls.value = new Hls(hlsConfig)

      // 添加更多事件监听以便调试
      hls.value.on(Hls.Events.MANIFEST_LOADING, () => console.log('正在加载manifest...'))
      hls.value.on(Hls.Events.MANIFEST_LOADED, (event, data) => console.log('Manifest加载成功:', data))
      hls.value.on(Hls.Events.MANIFEST_PARSED, () => {
        console.log('Manifest解析成功，开始播放...')
        videoRef.value?.play().catch(err => console.error('播放失败:', err))
      })
      hls.value.on(Hls.Events.BUFFER_APPENDED, () => {
        console.log('缓冲区数据添加成功')
      })
      hls.value.on(Hls.Events.BUFFER_CREATED, () => {
        console.log('缓冲区创建成功')
      })
      hls.value.on(Hls.Events.ERROR, (event, data) => {
        console.error('HLS错误:', data)
        if (data.fatal) {
          switch (data.type) {
            case Hls.ErrorTypes.NETWORK_ERROR:
              console.error('网络错误，尝试重新加载...')
              hls.value?.startLoad()
              break
            case Hls.ErrorTypes.MEDIA_ERROR:
              console.error('媒体错误，尝试重新加载...')
              hls.value?.recoverMediaError()
              break
            default:
              console.error('HLS错误:', data)
              break
          }
        } else {
          // 非致命错误，尝试恢复
          if (data.details === 'bufferStalledError') {
            console.log('缓冲区停滞，尝试恢复...')
            // 尝试重新加载当前片段
            hls.value?.recoverMediaError()
          }
        }
      })

      hls.value.loadSource(previewUrl.value)
      hls.value.attachMedia(videoRef.value)
    } catch (error) {
      console.error('HLS初始化失败:', error)
    }
  } else {
    console.error('HLS不支持或参数不完整:', {
      hlsSupported: Hls.isSupported(),
      videoRef: videoRef.value,
      previewUrl: previewUrl.value,
    })
  }
}

// 关闭预览时清理HLS实例
const closePreview = () => {
  if (hls.value) {
    hls.value.destroy()
    hls.value = null
  }
  previewDialog.value = false
}

// 处理预览对话框状态变化
const handlePreviewDialogChange = (val: boolean) => {
  console.log('预览对话框状态变化:', val, { previewUrl: previewUrl.value, videoRef: videoRef.value })

  if (val) {
    // 对话框打开时延迟初始化HLS，确保DOM已渲染
    console.log('准备初始化HLS...')
    setTimeout(() => {
      console.log('开始执行initHls函数')
      initHls()
    }, 100)
  } else {
    // 对话框关闭时清理HLS实例
    console.log('对话框关闭，清理HLS实例')
    if (hls.value) {
      hls.value.destroy()
      hls.value = null
    }
  }
}

// 计算属性：当前日期的节目
const currentPrograms = computed(() => {
  return programList.value
})

// 获取节目状态（过去、当前、未来）
const getProgramStatus = (program: any) => {
  const now = new Date()
  const startTime = new Date(program.startTime)
  const endTime = new Date(program.endTime)

  if (now < startTime) {
    return 'future'
  } else if (now >= startTime && now <= endTime) {
    return 'current'
  } else {
    return 'past'
  }
}

// 检查节目是否可点击
const isProgramClickable = (program: any) => {
  return getProgramStatus(program) !== 'past'
}

onMounted(() => {
  generateDateRange()
  fetchChannels()
})
</script>

<template>
  <div class="ysp-view">
    <div class="ysp-header">
      <h1 class="text-h4 font-bold">央视频电视</h1>
    </div>

    <div class="ysp-content">
      <!-- 频道列表 -->
      <div class="channels-sidebar">
        <div class="channels-title">频道列表</div>
        <div v-if="loading" class="channels-loading">
          <VProgressCircular indeterminate size="24" />
        </div>
        <div v-else-if="error" class="channels-error">
          {{ error }}
        </div>
        <div v-else class="channels-list">
          <div
            v-for="channel in channels"
            :key="channel.cnlid"
            class="channel-item"
            :class="{ active: selectedChannel?.cnlid === channel.cnlid }"
            @click="switchChannel(channel)"
          >
            <div class="channel-icon-container">
              <img 
                v-if="getChannelIcon(channel.name)" 
                :src="getChannelIcon(channel.name)" 
                :alt="channel.name" 
                class="channel-icon"
              />
              <div v-else class="channel-icon-placeholder">
                <span class="channel-icon-text">{{ channel.name.substring(0, 4) }}</span>
              </div>
            </div>
            <button class="preview-btn" @click.stop="previewLive()">预览</button>
          </div>
        </div>
      </div>

      <!-- 节目单 -->
      <div class="programs-main">
        <!-- 日期选择 -->
        <div class="date-selector">
          <div
            v-for="date in dateRange"
            :key="date.format('YYYY-MM-DD')"
            class="date-item"
            :class="{ active: currentDate.format('YYYY-MM-DD') === date.format('YYYY-MM-DD') }"
            @click="switchDate(date)"
          >
            <div class="date-week">{{ date.format('ddd') }}</div>
            <div class="date-day">{{ date.format('MM/DD') }}</div>
          </div>
        </div>

        <!-- 节目列表 -->
        <div class="programs-list">
          <div v-if="programLoading" class="programs-loading">
            <VProgressCircular indeterminate size="24" />
          </div>
          <div v-else-if="!selectedChannel" class="programs-empty">请选择一个频道</div>
          <div v-else-if="currentPrograms.length === 0" class="programs-empty">暂无节目信息</div>
          <div v-else class="programs-content">
            <div
              v-for="program in currentPrograms"
              :key="program.programId"
              class="program-item"
              :class="{
                'program-item--past': getProgramStatus(program) === 'past',
                'program-item--current': getProgramStatus(program) === 'current',
                'program-item--future': getProgramStatus(program) === 'future',
              }"
              @click="isProgramClickable(program) && recordProgram(program)"
            >
              <div class="program-time">
                <div class="program-start-time">{{ program.startTimeStr }}</div>
                <div class="program-end-time">{{ program.endTimeStr }}</div>
              </div>
              <div class="program-info">
                <div class="program-name">{{ program.name }}</div>
                <div v-if="getProgramStatus(program) === 'current'" class="program-playing">
                  <span class="playing-dot"></span>
                  <span>正在播放</span>
                </div>
                <div v-else-if="program.isVip" class="program-vip">VIP</div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>

  <!-- 直播预览对话框 -->
  <VDialog v-model="previewDialog" width="800" max-width="90vw" @update:model-value="handlePreviewDialogChange">
    <VCard>
      <VCardTitle> {{ currentProgram?.name }} - {{ selectedChannel?.name }} </VCardTitle>
      <VCardText>
        <div v-if="previewLoading" class="preview-loading">
          <VProgressCircular indeterminate size="48" />
          <div class="loading-text">加载直播流...</div>
        </div>
        <div v-else-if="previewUrl" class="preview-container">
          <video ref="videoRef" controls class="preview-video" style="block-size: auto; inline-size: 100%" />
        </div>
        <div v-else class="preview-error">无法加载直播流</div>
      </VCardText>
      <VCardActions>
        <VBtn color="primary" @click="closePreview">关闭</VBtn>
      </VCardActions>
    </VCard>
  </VDialog>
</template>

<style scoped>
.ysp-view {
  padding: 16px;
}

.ysp-header {
  margin-block-end: 24px;
}

.ysp-content {
  display: grid;
  block-size: calc(100vh - 180px);
  gap: 24px;
  grid-template-columns: 200px 1fr;
}

/* 频道列表样式 */
.channels-sidebar {
  padding: 16px;
  border: 1px solid rgba(var(--v-theme-on-surface), 0.08);
  border-radius: 12px;
  background: rgba(var(--v-theme-surface), 0.94);
  overflow-y: auto;
}

.channels-title {
  color: rgb(var(--v-theme-on-surface));
  font-size: 16px;
  font-weight: 600;
  margin-block-end: 12px;
}

.channels-loading,
.channels-error {
  padding: 20px;
  text-align: center;
}

.channels-list {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.channel-item {
  padding: 12px;
  border: 1px solid transparent;
  border-radius: 8px;
  cursor: pointer;
  transition: all 0.2s ease;
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
}

.channel-item:hover {
  background: rgba(var(--v-theme-primary), 0.08);
}

.channel-item.active {
  border-color: rgba(var(--v-theme-primary), 0.2);
  background: rgba(var(--v-theme-primary), 0.12);
}

.channel-icon-container {
  flex: 1;
  height: 45px;
  border-radius: 6px;
  overflow: hidden;
  background: transparent;
  display: flex;
  align-items: center;
  justify-content: center;
  min-width: 0;
}

.channel-icon {
  width: 100%;
  height: 100%;
  object-fit: contain;
  display: block;
}

.channel-icon-placeholder {
  width: 100%;
  height: 100%;
  display: flex;
  align-items: center;
  justify-content: center;
  background: rgba(var(--v-theme-primary), 0.1);
}

.channel-icon-text {
  color: rgb(var(--v-theme-primary));
  font-size: 12px;
  font-weight: 600;
}

/* 节目单样式 */
.programs-main {
  display: flex;
  overflow: hidden;
  flex-direction: column;
  padding: 16px;
  border: 1px solid rgba(var(--v-theme-on-surface), 0.08);
  border-radius: 12px;
  background: rgba(var(--v-theme-surface), 0.94);
}

/* 日期选择器 */
.date-selector {
  display: flex;
  gap: 8px;
  margin-block-end: 20px;
  overflow-x: auto;
  padding-block-end: 8px;
}

.date-item {
  flex: 1;
  border: 1px solid transparent;
  border-radius: 8px;
  cursor: pointer;
  min-inline-size: 80px;
  padding-block: 12px;
  padding-inline: 8px;
  text-align: center;
  transition: all 0.2s ease;
}

.date-item:hover {
  background: rgba(var(--v-theme-primary), 0.08);
}

.date-item.active {
  border-color: rgba(var(--v-theme-primary), 0.2);
  background: rgba(var(--v-theme-primary), 0.12);
  font-weight: 600;
}

.date-week {
  color: rgb(var(--v-theme-on-surface));
  font-size: 14px;
  margin-block-end: 4px;
}

.date-day {
  color: rgb(var(--v-theme-on-surface-variant));
  font-size: 12px;
}

/* 节目列表 */
.programs-list {
  flex: 1;
  overflow-y: auto;
}

.programs-loading {
  display: flex;
  align-items: center;
  justify-content: center;
  block-size: 200px;
}

.programs-empty {
  display: flex;
  align-items: center;
  justify-content: center;
  block-size: 200px;
  color: rgb(var(--v-theme-on-surface-variant));
  font-size: 14px;
}

.programs-content {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.program-item {
  display: grid;
  padding: 12px;
  border: 1px solid transparent;
  border-radius: 8px;
  cursor: pointer;
  gap: 16px;
  grid-template-columns: 120px 1fr;
  transition: all 0.2s ease;
}

.program-item:hover {
  border-color: rgba(var(--v-theme-primary), 0.2);
  background: rgba(var(--v-theme-primary), 0.08);
}

.program-time {
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.program-start-time,
.program-end-time {
  color: rgb(var(--v-theme-on-surface));
  font-size: 14px;
  opacity: 0.6;
}

.program-info {
  display: flex;
  align-items: center;
  justify-content: space-between;
}

.program-name {
  flex: 1;
  color: rgb(var(--v-theme-on-surface));
  font-size: 14px;
  font-weight: 500;
}

.program-actions {
  display: flex;
  align-items: center;
  gap: 8px;
}

.preview-btn {
  border: 1px solid rgba(var(--v-theme-primary), 0.2);
  border-radius: 10px;
  background: rgba(var(--v-theme-primary), 0.1);
  color: rgb(var(--v-theme-primary));
  cursor: pointer;
  font-size: 12px;
  padding-block: 2px;
  padding-inline: 8px;
  transition: all 0.2s ease;
}

.preview-btn:hover {
  background: rgba(var(--v-theme-primary), 0.2);
}

.program-vip {
  border-radius: 10px;
  background: rgba(255, 107, 107, 10%);
  color: #ff6b6b;
  font-size: 12px;
  padding-block: 2px;
  padding-inline: 8px;
}

/* 节目状态样式 */
.program-item--past {
  cursor: not-allowed;
  opacity: 0.5;
}

.program-item--current {
  border-color: rgba(var(--v-theme-primary), 0.3);
  background: rgba(var(--v-theme-primary), 0.05);
}

.program-item--future {
  cursor: pointer;
}

/* 正在播放动画 */
.program-playing {
  display: flex;
  align-items: center;
  color: rgb(var(--v-theme-primary));
  font-size: 12px;
  font-weight: 500;
  gap: 6px;
}

.playing-dot {
  border-radius: 50%;
  animation: pulse 1.5s infinite;
  background: rgb(var(--v-theme-primary));
  block-size: 8px;
  inline-size: 8px;
}

@keyframes pulse {
  0%,
  100% {
    opacity: 1;
  }

  50% {
    opacity: 0.5;
  }
}

/* 预览对话框样式 */
.preview-loading {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 40px;
  gap: 16px;
}

.loading-text {
  color: rgb(var(--v-theme-on-surface-variant));
  font-size: 14px;
}

.preview-error {
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 40px;
  color: rgb(var(--v-theme-error));
  font-size: 14px;
}

/* 响应式设计 */
@media (width <= 768px) {
  .ysp-content {
    grid-template-columns: 1fr;
    grid-template-rows: auto 1fr;
  }

  .channels-sidebar {
    block-size: 200px;
  }

  .channels-list {
    flex-flow: row wrap;
  }

  .channel-item {
    flex: 1;
    min-inline-size: 120px;
  }
}
</style>
