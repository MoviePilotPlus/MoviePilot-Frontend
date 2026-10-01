<!-- eslint-disable sonarjs/no-duplicate-string -->
<script lang="ts" setup>
// @ts-nocheck
import { useToast } from 'vue-toastification'
import api from '@/api'
import { useI18n } from 'vue-i18n'

// 基础设置卡：目录 / 下载参数 / 标签与调试 / 截图 / 简介与豆瓣 / 种子。
// basic 由父级 provide（CollectSettings.Basic 响应式引用，读写同一对象），
// 整组提交 system/env；截图模板 JSON 由截图卡保存后回写 SCREENSHOT_TEMPLATE_CONFIG。
const basic = inject('collectSettingsBasic')

const { t } = useI18n()
const $toast = useToast()

// 截图 HDR/DV 色彩处理引擎选项
const screenshotHdrEngineOptions = computed(() => [
  { title: t('setting.collect.hdrEngineAuto'), value: 'auto' },
  { title: t('setting.collect.hdrEngineLibplacebo'), value: 'libplacebo' },
  { title: t('setting.collect.hdrEngineZscale'), value: 'zscale' },
])

// 截图体积上限/下限以 MB 展示（后端存字节）。
// 双向 computed 的 setter 在「清空输入」时无法区分「正在编辑」与「放弃编辑」，
// 会立刻把 getter 换算值顶回来（表现为数值被清空）——改为草稿态：
// 源值变化同步草稿，输入只在 blur 时校验写回（空串/非法=放弃编辑，回显源值）。
const MB = 1024 * 1024
function bytesToMbStr(value: unknown) {
  const n = Number(value)
  return Number.isFinite(n) && n > 0 ? String(Math.round((n / MB) * 100) / 100) : ''
}
const compressLimitMb = ref('')
const minSizeLimitMb = ref('')
watch(() => basic.SCREENSHOT_COMPRESS_LIMIT, (v) => { compressLimitMb.value = bytesToMbStr(v) }, { immediate: true })
watch(() => basic.SCREENSHOT_MIN_SIZE_LIMIT, (v) => { minSizeLimitMb.value = bytesToMbStr(v) }, { immediate: true })
function commitMbInput(target: 'compress' | 'min') {
  const draft = target === 'compress' ? compressLimitMb : minSizeLimitMb
  const key = target === 'compress' ? 'SCREENSHOT_COMPRESS_LIMIT' : 'SCREENSHOT_MIN_SIZE_LIMIT'
  const raw = draft.value.trim()
  const n = Number(raw)
  if (raw === '' || !Number.isFinite(n) || n < 0) {
    // 放弃编辑：回显当前源值
    draft.value = bytesToMbStr(basic[key])
    return
  }
  const bytes = Math.round(n * MB)
  draft.value = bytesToMbStr(bytes)
  basic[key] = bytes
}

// 保存基础设置（整组含截图参数键；模板 JSON 键由截图卡保存后回写，值保持最新）
async function saveBasicSettings() {
  try {
    await api.post('system/env', basic)
    $toast.success(t('setting.collect.basicSaveSuccess'))
  } catch (error) {
    console.log(error)
    $toast.error(t('setting.collect.basicSaveFailed'))
  }
}
</script>

<template>
  <VCard id="collect-basic" class="overflow-visible">
    <VCardItem>
      <VCardTitle>{{ t('setting.collect.basicSettings') }}</VCardTitle>
      <VCardSubtitle>{{ t('setting.collect.basicSettingsDesc') }}</VCardSubtitle>
    </VCardItem>
    <VCardText>
      <VForm @submit.prevent="() => {}">
        <!-- 目录 -->
        <div class="settings-section-title">{{ t('setting.collect.sectionDirectory') }}</div>
        <VRow>
          <VCol cols="12" md="6">
            <VTextField
              v-model="basic.MEDIA_DIR"
              :label="t('setting.collect.mediaDir')"
              :hint="t('setting.collect.mediaDirHint')"
              placeholder="/mnt/media"
              persistent-hint
              prepend-inner-icon="mdi-folder-download"
            />
          </VCol>
          <VCol cols="12" md="6">
            <VTextField
              v-model="basic.DOWNLOAD_DIR"
              :label="t('setting.collect.downloadDir')"
              :hint="t('setting.collect.downloadDirHint')"
              placeholder="/mnt/media"
              persistent-hint
              prepend-inner-icon="mdi-folder-download"
            />
          </VCol>
        </VRow>
        <!-- 下载参数 -->
        <div class="settings-section-title">{{ t('setting.collect.sectionDownload') }}</div>
        <VRow>
          <VCol cols="12" md="6">
            <VTextField
              v-model="basic.DOWNLOADER_THREAD_COUNT"
              type="number"
              :label="t('setting.collect.downloaderThreadCount')"
              :hint="t('setting.collect.downloaderThreadCountHint')"
              placeholder="10"
              min="1"
              persistent-hint
              prepend-inner-icon="mdi-numeric"
            />
          </VCol>
          <VCol cols="12" md="6">
            <VTextField
              v-model="basic.DOWNLOADER_SPEED"
              :label="t('setting.collect.downloaderSpeed')"
              :hint="t('setting.collect.downloaderSpeedHint')"
              placeholder="10M"
              persistent-hint
              prepend-inner-icon="mdi-speedometer"
            />
          </VCol>
          <VCol cols="12" md="6">
            <VTextField
              v-model="basic.DOWNLOAD_TASK_MAX_WORKERS"
              type="number"
              :label="t('setting.collect.downloadTaskMaxWorkers')"
              :hint="t('setting.collect.downloadTaskMaxWorkersHint')"
              placeholder="1"
              min="1"
              persistent-hint
              prepend-inner-icon="mdi-view-week"
            />
          </VCol>
          <VCol cols="12" md="6">
            <VTextField
              v-model="basic.DOWNLOADER_SLEEP_TIME"
              type="number"
              :label="t('setting.collect.downloaderSleepTime')"
              :hint="t('setting.collect.downloaderSleepTimeHint')"
              placeholder="1"
              min="0"
              persistent-hint
              prepend-inner-icon="mdi-fan"
            />
          </VCol>
          <VCol cols="12" md="6">
            <VSwitch
              v-model="basic.DOWNLOADER_DELETE_AFTER_DONE"
              :label="t('setting.collect.downloaderDeleteAfterDone')"
              :hint="t('setting.collect.downloaderDeleteAfterDoneHint')"
              persistent-hint
            />
          </VCol>
          <VCol cols="12" md="6">
            <VSwitch
              v-model="basic.SEED_SKIP_HASH_CHECK"
              :label="t('setting.collect.seedSkipHashCheck')"
              :hint="t('setting.collect.seedSkipHashCheckHint')"
              persistent-hint
            />
          </VCol>
        </VRow>
        <!-- 标签与调试 -->
        <div class="settings-section-title">{{ t('setting.collect.sectionTagDebug') }}</div>
        <VRow>
          <VCol cols="12" md="6">
            <VTextField
              v-model="basic.HIGH_BITRATE_THRESHOLD"
              type="number"
              :label="t('setting.collect.highBitrateThreshold')"
              :hint="t('setting.collect.highBitrateThresholdHint')"
              placeholder="10000000"
              suffix="bps"
              min="0"
              persistent-hint
              prepend-inner-icon="mdi-speedometer"
            />
          </VCol>
          <VCol cols="12" md="6">
            <VSwitch
              v-model="basic.RAISE_EXCEPTION"
              :label="t('setting.collect.raiseException')"
              :hint="t('setting.collect.raiseExceptionHint')"
              persistent-hint
            />
          </VCol>
          <VCol cols="12" md="6">
            <VSwitch
              v-model="basic.API_DEBUG"
              :label="t('setting.collect.apiDebug')"
              :hint="t('setting.collect.apiDebugHint')"
              persistent-hint
            />
          </VCol>
        </VRow>
        <!-- 截图 -->
        <div class="settings-section-title">{{ t('setting.collect.sectionScreenshot') }}</div>
        <VRow>
          <VCol cols="12" md="6">
            <VSelect
              v-model="basic.SCREENSHOT_HDR_PROCESSOR"
              :items="screenshotHdrEngineOptions"
              :label="t('setting.collect.screenshotHdrEngine')"
              :hint="t('setting.collect.screenshotHdrEngineHint')"
              persistent-hint
              prepend-inner-icon="mdi-palette"
            />
          </VCol>
          <VCol cols="12" md="6">
            <VSwitch
              v-model="basic.SCREENSHOT_GRID_ENABLED"
              :label="t('setting.collect.screenshotGridEnabled')"
              :hint="t('setting.collect.screenshotGridEnabledHint')"
              persistent-hint
            />
          </VCol>
          <VCol cols="12" md="6">
            <VSwitch
              v-model="basic.SCREENSHOT_CACHE_ENABLED"
              :label="t('setting.collect.screenshotCacheEnabled')"
              :hint="t('setting.collect.screenshotCacheEnabledHint')"
              persistent-hint
            />
          </VCol>
          <VCol cols="12" md="6">
            <VTextField
              v-model.number="basic.SCREENSHOT_COUNT"
              type="number"
              :label="t('setting.collect.screenshotCount')"
              :hint="t('setting.collect.screenshotCountHint')"
              placeholder="4"
              suffix="张"
              min="1"
              persistent-hint
              prepend-inner-icon="mdi-image-multiple"
            />
          </VCol>
          <VCol cols="12" md="6">
            <VTextField
              v-model="compressLimitMb"
              type="number"
              :label="t('setting.collect.screenshotCompressLimitMb')"
              :hint="t('setting.collect.screenshotCompressLimitHint')"
              placeholder="5"
              suffix="MB"
              min="0"
              step="0.5"
              persistent-hint
              prepend-inner-icon="mdi-image-size-select-large"
              @blur="commitMbInput('compress')"
            />
          </VCol>
          <VCol cols="12" md="6">
            <VTextField
              v-model="minSizeLimitMb"
              type="number"
              :label="t('setting.collect.screenshotMinSizeLimitMb')"
              :hint="t('setting.collect.screenshotMinSizeLimitHint')"
              placeholder="1.75"
              suffix="MB"
              min="0"
              step="0.25"
              persistent-hint
              prepend-inner-icon="mdi-image-size-select-small"
              @blur="commitMbInput('min')"
            />
          </VCol>
          <VCol cols="12" md="6">
            <VSwitch
              v-model="basic.SCREENSHOT_QUALITY_CHECK"
              :label="t('setting.collect.screenshotQualityCheck')"
              :hint="t('setting.collect.screenshotQualityCheckHint')"
              persistent-hint
            />
          </VCol>
        </VRow>
        <!-- 简介与豆瓣 -->
        <div class="settings-section-title">{{ t('setting.collect.sectionIntroDouban') }}</div>
        <VRow>
          <VCol cols="12" md="6">
            <VTextField
              v-model="basic.BANGUMI_API_BASE"
              :label="t('setting.collect.bangumiApiBase')"
              :hint="t('setting.collect.bangumiApiBaseHint')"
              placeholder="https://bgmapi.anibt.net/"
              persistent-hint
              prepend-inner-icon="mdi-api"
            />
          </VCol>
          <VCol cols="12" md="12">
            <VTextarea
              v-model="basic.DOUBAN_COOKIES"
              auto-grow
              :label="t('setting.collect.doubanCookies')"
              :hint="t('setting.collect.doubanCookiesHint')"
              :placeholder="t('setting.collect.doubanCookiesPlaceholder')"
              rows="2"
              persistent-hint
              prepend-inner-icon="mdi-cookie"
            />
          </VCol>
          <VCol cols="12" md="6">
            <VSwitch
              v-model="basic.DOUBAN_USE_PROXY"
              :label="t('setting.collect.doubanUseProxy')"
              :hint="t('setting.collect.doubanUseProxyHint')"
              persistent-hint
            />
          </VCol>
          <VCol cols="12" md="6">
            <VSwitch
              v-model="basic.DOUBAN_BROWSER_FALLBACK"
              :label="t('setting.collect.doubanBrowserFallback')"
              :hint="t('setting.collect.doubanBrowserFallbackHint')"
              persistent-hint
            />
          </VCol>
        </VRow>
        <!-- 种子 -->
        <div class="settings-section-title">{{ t('setting.collect.sectionTorrent') }}</div>
        <VRow>
          <VCol cols="12" md="6">
            <VTextField
              v-model="basic.TORRENT_AUTHOR"
              :label="t('setting.collect.torrentAuthor')"
              :hint="t('setting.collect.torrentAuthorHint')"
              placeholder=""
              persistent-hint
              prepend-inner-icon="mdi-account-edit"
            />
          </VCol>
        </VRow>
      </VForm>
      <!-- 吸底保存：长表单滚动到任意位置都可见（卡片开启 overflow-visible 以放行 sticky） -->
      <div class="sticky-save-row">
        <VBtn type="button" color="primary" elevation="4" @click="saveBasicSettings" prepend-icon="mdi-content-save">
          {{ t('common.save') }}
        </VBtn>
      </div>
    </VCardText>
  </VCard>
</template>

<style scoped>
/* 基础设置卡内分区标题 */
.settings-section-title {
  color: rgba(var(--v-theme-on-surface), var(--v-medium-emphasis-opacity));
  font-size: 0.8rem;
  font-weight: 600;
  letter-spacing: 0.04em;
  margin-block: 1.35rem 0.9rem;
  padding-inline-start: 0.55rem;
  border-inline-start: 3px solid rgb(var(--v-theme-primary));
}

.settings-section-title:first-child {
  margin-block-start: 0.25rem;
}

/* 长表单吸底保存按钮：跟随视口底部，滚动全程可及 */
.sticky-save-row {
  position: sticky;
  bottom: 0.75rem;
  z-index: 2;
  display: flex;
  justify-content: flex-start;
  padding-block-start: 0.75rem;
}
</style>
