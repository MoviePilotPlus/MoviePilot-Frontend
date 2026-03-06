<script lang="ts" setup>
// @ts-nocheck
import api from '@/api'
import type { DownloadTask, Progress } from '@/api/types'
import { formatFileSize } from '@/@core/utils/formatters'
import { downloadStatus } from '@/api/constants'
import tencentImage from '@images/logos/tencent-white.png'
import DownloadTaskInfoDialog from '@/components/dialog/DownloadTaskInfoDialog.vue'

// 注册事件
const emit = defineEmits(['remove'])
// 输入参数
const props = defineProps({
  info: {
    type: Object as PropType<DownloadTask>,
    default: () => {},
    required: true,
  },
  progress: {
    type: Object as PropType<Progress>,
    default: () => {},
  },
  width: String,
  height: String,
})

const showProgressInfo = ref(false)

// 进度条
function getPercentage() {
  if (!props.progress) return 0
  return props.progress.percent ?? 0
  return 0
}
// 来源角标字典
const siteIconDict: { [key: string]: any } = {
  Tencent: tencentImage,
}
function showProgressInfoDialog() {
  showProgressInfo.value = true
}
// 速度
function getSpeedText() {
  if (props.progress) {
    return `${formatFileSize(props.progress?.downloaded_size || 0)} / ${formatFileSize(props.progress?.total_size || 0)}  ↓ ${formatFileSize(props.progress?.speed)}/s`
  }
  return `${formatFileSize(props.info?.downloaded_size || 0)} / ${formatFileSize(props.info?.total_size || 0)}  ↓ ${formatFileSize(props.info?.speed)}/s`
}
function getFormatedTitle() {
  // 由于 padStart 是字符串方法，需要将 number 类型的 season 转换为字符串
  const season = props.info?.season ? `S${String(props.info.season).padStart(2, '0')}` : ''
  const episode = props.info?.episode ? `E${String(props.info.episode).padStart(2, '0')}` : ''
  if (props.info?.cn_title) {
    return `${props.info?.cn_title}${season}${episode}`
  }
  return ''
}
// 角标颜色
function getChipColor() {
  const status = getSatus()
  if (status === downloadStatus.DownloadError) {
    return 'border-red-500 bg-red-600'
  } else if (status === downloadStatus.Downloading) {
    return 'bg-green-500 border-green-600'
  } else {
    return 'border-purple-600 bg-purple-600'
  }
}
function getSatus() {
  console.log('props.progress: ', props.progress)
  if (props.progress) {
    console.log('downloadStatus:', downloadStatus[props.progress.state as keyof typeof downloadStatus])
    return downloadStatus[props.progress.state as keyof typeof downloadStatus]
  }
  return downloadStatus[props.info.status as keyof typeof downloadStatus]
}

function showToggleBtn() {
  const status = getSatus()
  if (status === downloadStatus.DownloadCreated) {
    return true
  } else if (getSatus() === downloadStatus.DownloadPending) {
    return true
  } else if (getSatus() === downloadStatus.DownloadPending) {
    return true
  } else if (getSatus() === downloadStatus.Downloading) {
    return true
  } else if (getSatus() === downloadStatus.DownloadError) {
    return true
  } else if (getSatus() === downloadStatus.DownloadStop) {
    return true
  } else {
    return false
  }
}

function downloadBtnIcon() {
  const showBtn = showToggleBtn()
  const status = getSatus()
  if (showBtn) {
    return status === downloadStatus.Downloading ? 'mdi-pause' : 'mdi-play'
  } else {
    return ''
  }
}
// 下载状态
function downloading() {
  const status = getSatus()
  return status === downloadStatus.Downloading
}

// 图片是否加载完成
const imageLoaded = ref(false)

// 图片加载完成响应
function imageLoadHandler() {
  imageLoaded.value = true
}

// 计算文本类
function getTextClass() {
  return imageLoaded.value ? 'text-white' : ''
}

// 下载状态控制
async function toggleDownload() {
  const operation = downloading() ? 'stop' : 'start'
  try {
    const result: { [key: string]: any } = await api.get(`task/${operation}/${props.info?.id}`)
    if (result.success) {
      if (operation === 'stop') {
        props.info.status = downloadStatus.DownloadStop
      } else {
        props.info.status = downloadStatus.Downloading
      }
    }
  } catch (error) {
    console.error(error)
  }
}

// 删除下截
async function deleteDownload() {
  try {
    await api.delete(`collect/task/${props.info?.id}`)
    emit('remove', props.info?.id)
  } catch (error) {
    console.error(error)
  }
}
const taskCardRef = ref<HTMLElement | null>(null)
</script>

<template>
  <VHover>
    <template #default="hover">
      <div ref="taskCardRef">
        <VCard
          :key="props.info?.id"
          class="glass-card"
          v-bind="hover.props"
          :height="props.height"
          :width="props.width"
          @click.stop="showProgressInfoDialog"
        >
          <VChip
            variant="elevated"
            size="small"
            :class="getChipColor()"
            class="absolute right-2 top-2 bg-opacity-50 shadow-md text-white font-bold"
          >
            {{ getSatus() }}
          </VChip>
          <VAvatar size="24" density="compact" class="absolute top-1 left-4" tile v-show="hover.isHovering">
            <VImg cover :src="siteIconDict[props.info.site]" class="shadow-lg" />
          </VAvatar>
          <template #image>
            <VImg
              :src="props.info?.poster"
              aspect-ratio="2/3"
              cover
              class="brightness-50 card-bg"
              @load="imageLoadHandler"
            />
          </template>
          <VCardItem class="card-content pt-7">
            <VCardTitle class="truncate text-base font-bold" :class="getTextClass()">
              {{ getFormatedTitle() }}
              <VTooltip activator="parent" location="bottom">{{ getFormatedTitle() }}</VTooltip>
            </VCardTitle>
            <VCardTitle class="truncate text-sm" :class="getTextClass()">
              {{ props.info?.en_title }}
              <VTooltip activator="parent" location="bottom">{{ props.info?.en_title }}</VTooltip>
            </VCardTitle>

            <!-- <VCardSubtitle class="break-words whitespace-normal" :class="getTextClass()">
          {{ props.info?.name }}
        </VCardSubtitle> -->
            <template v-if="downloading()">
              <VCardItem class="text-subtitle-2 pt-4 pb-1 pl-0 pr-0" :class="getTextClass()">
                {{ getSpeedText() }}
                <VProgressLinear :model-value="getPercentage()" />
              </VCardItem>
            </template>
            <template v-else>
              <VCardItem class="text-subtitle-2 pt-2 pb-1 pl-0 pr-0 task-info-chips" :class="getTextClass()">
                <div class="task-info-chips-content">
                  <VChip
                    variant="outlined"
                    size="x-small"
                    label
                    class="mr-1 text-white font-bold"
                    v-if="props.info.resolution"
                    >{{ props.info.resolution }}</VChip
                  >
                  <VChip
                    variant="outlined"
                    size="x-small"
                    label
                    class="mr-1 text-white font-bold"
                    v-if="props.info.total_size"
                    >{{ formatFileSize(props.info?.total_size || 0) }}</VChip
                  >
                  <VChip
                    variant="outlined"
                    size="x-small"
                    label
                    class="mr-1 text-white font-bold"
                    v-if="props.info.video_codec"
                    >{{ props.info.video_codec }}</VChip
                  >
                  <VChip
                    variant="outlined"
                    size="x-small"
                    label
                    class="mr-1 text-white font-bold"
                    v-if="props.info.hdr_format"
                    >{{ props.info.hdr_format }}</VChip
                  >
                  <VChip
                    variant="outlined"
                    size="x-small"
                    label
                    class="mr-1 text-white font-bold"
                    v-if="props.info.audio_codec"
                    >{{ props.info.audio_codec }}</VChip
                  >
                  <span
                    v-if="
                      !props.info.resolution &&
                      !props.info.total_size &&
                      !props.info.video_codec &&
                      !props.info.hdr_format &&
                      !props.info.audio_codec
                    "
                    class="text-medium-emphasis text-caption"
                    >等待中...</span
                  >
                </div>
              </VCardItem>
            </template>

            <!-- <VCardItem v-if="getPercentage() > 0" class="text-subtitle-2 pt-0 pb-0 pl-0 pr-0" :class="getTextClass()">
          <VProgressLinear :model-value="getPercentage()" />
        </VCardItem> -->
            <!-- <VCardText v-if="getPercentage() > 0" class="pt-3 pb-1 pl-0 pr-0" :class="getTextClass()">
          <VProgressLinear :model-value="getPercentage()" />
        </VCardText> -->

            <VCardActions class="justify-space-between pt-2 pb-0 pl-0 pr-0">
              <VBtn :readonly="!showToggleBtn()" :icon="downloadBtnIcon()" @click.stop="toggleDownload" />
              <VBtn color="error" icon="mdi-trash-can-outline" @click.stop="deleteDownload" />
            </VCardActions>
          </VCardItem>
        </VCard>
        <DownloadTaskInfoDialog
          v-if="showProgressInfo"
          v-model="showProgressInfo"
          type="task"
          :id="props.info.id"
          :name="props.info.name"
          @close="showProgressInfo = false"
        />
      </div>
    </template>
  </VHover>
</template>
<style scoped>
/* 卡片整体样式 */
.glass-card {
  position: relative;
  overflow: hidden;
  border: 1px solid rgba(var(--v-theme-on-surface), 0.08);
  border-radius: 14px;
  background-color: rgb(var(--v-theme-surface));
  box-shadow: 0 1px 6px rgba(0, 0, 0, 4%);
  transition:
    border-color 0.2s ease,
    box-shadow 0.2s ease;
}

.glass-card:hover {
  border-color: rgba(var(--v-theme-primary), 0.2);
  box-shadow: 0 6px 14px rgba(0, 0, 0, 8%);
}

/* 卡片背景图处理 */
.card-bg {
  position: absolute;
  block-size: 100%;
  filter: brightness(0.6);
  inline-size: 100%;
  transform: scale(1.02);

  /* 防止模糊边缘漏出 */

  /* 覆盖 Vuetify 图片容器样式 */
  :deep(.v-img__img) {
    object-fit: cover;
  }
}

/* 卡片内容定位 */
.card-content {
  position: relative;
  z-index: 2;
  background: linear-gradient(to top, rgba(0, 0, 0, 55%), rgba(0, 0, 0, 18%));
  block-size: 100%;
  min-block-size: 140px;

  /* display: flex;
    flex-direction: column;
    justify-content: center;
    align-items: center; */

  /* color: white; */

  /* text-shadow: 0 2px 4px rgba(0, 0, 0, 0.2); */
}

/* 任务信息标签区域固定高度 */
.task-info-chips {
  min-block-size: 32px !important;
}

.task-info-chips :deep(.v-card-item__content) {
  min-block-size: 24px;
}

.task-info-chips-content {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 4px;
  min-block-size: 24px;
}

/* 按钮样式增强 */
:deep(.v-btn) {
  border: 1px solid rgba(255, 255, 255, 28%);
  background: rgba(255, 255, 255, 8%) !important;

  &:hover {
    background: rgba(255, 255, 255, 16%) !important;
  }
}
</style>
