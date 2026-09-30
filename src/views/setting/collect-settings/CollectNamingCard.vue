<!-- eslint-disable sonarjs/no-duplicate-string -->
<script lang="ts" setup>
// @ts-nocheck
import { useToast } from 'vue-toastification'
import api from '@/api'
import { useI18n } from 'vue-i18n'
import { buildEnvPayload } from './share'
import type { ComponentPublicInstance } from 'vue'

// 命名格式模板卡：六个命名模板字段 + 变量芯片插入。
// basic 由父级 provide（CollectSettings.Basic 响应式引用；保存与基础设置同为 system/env 整组提交）。
const basic = inject('collectSettingsBasic')

const { t } = useI18n()
const $toast = useToast()

// ===== 命名格式模板：字段清单与变量速查 =====
// 六个命名模板字段统一在此登记：独立卡片渲染、label 走 i18n、变量芯片点击插入
const FORMAT_TEMPLATE_FIELDS = [
  { key: 'TV_FOLDER_FORMAT', labelKey: 'tvFolderFormat' },
  { key: 'TV_FILE_FORMAT', labelKey: 'tvFileFormat' },
  { key: 'TV_TITLE_FORMAT', labelKey: 'tvTitleFormat' },
  { key: 'MOVIE_FOLDER_FORMAT', labelKey: 'movieFolderFormat' },
  { key: 'MOVIE_FILE_FORMAT', labelKey: 'movieFileFormat' },
  { key: 'MOVIE_TITLE_FORMAT', labelKey: 'movieTitleFormat' },
] as const

// 命名模板可用变量与说明（与后端 generate_pt_filename 上下文一致）
const FORMAT_TEMPLATE_VARIABLES: Array<{ name: string, descKey: string }> = [
  { name: 'cn_title', descKey: 'varCnTitle' },
  { name: 'en_title', descKey: 'varEnTitle' },
  { name: 'version', descKey: 'varVersion' },
  { name: 'year', descKey: 'varYear' },
  { name: 'resolution', descKey: 'varResolution' },
  { name: 'source', descKey: 'varSource' },
  { name: 'video_codec', descKey: 'varVideoCodec' },
  { name: 'audio_codec', descKey: 'varAudioCodec' },
  { name: 'bit_depth', descKey: 'varBitDepth' },
  { name: 'frame_rate', descKey: 'varFrameRate' },
  { name: 'audio_tracks', descKey: 'varAudioTracks' },
  { name: 'team', descKey: 'varTeam' },
  { name: 'site', descKey: 'varSite' },
  { name: 'season', descKey: 'varSeason' },
  { name: 'episode', descKey: 'varEpisode' },
  { name: 'subtitle_language', descKey: 'varSubtitleLanguage' },
  { name: 'audio_language', descKey: 'varAudioLanguage' },
  { name: 'hdr_format', descKey: 'varHdrFormat' },
  { name: 'audio_channel', descKey: 'varAudioChannel' },
]

// 变量说明气泡缓存（首次悬停才查词条）
const formatVariableDescriptions = ref<Record<string, string>>({})

function formatVariableTooltip(variable: { name: string, descKey: string }) {
  if (!formatVariableDescriptions.value[variable.name])
    formatVariableDescriptions.value[variable.name] = t(`setting.collect.${variable.descKey}`)
  return formatVariableDescriptions.value[variable.name]
}

// 最近一次聚焦的命名模板字段，变量芯片插入目标
const activeFormatField = ref<string>('')
const formatFieldRefs = new Map<string, ComponentPublicInstance>()

function setFormatFieldRef(key: string, el: ComponentPublicInstance | Element | null) {
  if (el) formatFieldRefs.set(key, el as ComponentPublicInstance)
  else formatFieldRefs.delete(key)
}

// 把 {{变量}} 插入到最近聚焦的模板输入框光标处；无焦点时追加到末尾
function insertFormatVariable(variable: string) {
  const key = activeFormatField.value || FORMAT_TEMPLATE_FIELDS[0].key
  const component = formatFieldRefs.get(key)
  const textarea = component?.$el?.querySelector('textarea') as HTMLTextAreaElement | null
  if (!textarea) return

  const snippet = `{{ ${variable} }}`
  const start = textarea.selectionStart ?? textarea.value.length
  const end = textarea.selectionEnd ?? start
  const nextValue = `${textarea.value.slice(0, start)}${snippet}${textarea.value.slice(end)}`
  basic[key] = nextValue
  nextTick(() => {
    textarea.focus()
    const caret = start + snippet.length
    textarea.setSelectionRange(caret, caret)
  })
}

// 保存命名模板（与基础设置同组提交 system/env；截图组键由截图卡独占保存）
async function saveNamingSettings() {
  try {
    await api.post('system/env', buildEnvPayload(basic))
    $toast.success(t('setting.collect.basicSaveSuccess'))
  } catch (error) {
    console.log(error)
    $toast.error(t('setting.collect.basicSaveFailed'))
  }
}
</script>

<template>
  <VCard id="collect-naming" class="overflow-visible">
    <VCardItem>
      <VCardTitle>{{ t('setting.collect.namingFormat') }}</VCardTitle>
      <VCardSubtitle>{{ t('setting.collect.namingFormatDesc') }}</VCardSubtitle>
    </VCardItem>
    <VCardText>
      <!-- 变量速查：吸顶跟随滚动，悬停看变量说明，点击插入到最近聚焦的模板框光标处 -->
      <div class="template-variable-bar">
        <span class="template-variable-label">{{ t('setting.collect.namingVariables') }}</span>
        <VTooltip
          v-for="variable in FORMAT_TEMPLATE_VARIABLES"
          :key="variable.name"
          location="bottom"
          open-delay="250"
        >
          <template #activator="{ props: vp }">
            <VChip
              v-bind="vp"
              size="x-small"
              variant="outlined"
              color="primary"
              class="cursor-pointer flex-shrink-0 font-weight-medium"
              @click="insertFormatVariable(variable.name)"
            >
              {{ variable.name }}
            </VChip>
          </template>
          {{ formatVariableTooltip(variable) }}
        </VTooltip>
      </div>
      <VRow>
        <VCol v-for="field in FORMAT_TEMPLATE_FIELDS" :key="field.key" cols="12" md="12">
          <VTextarea
            :ref="el => setFormatFieldRef(field.key, el)"
            v-model="basic[field.key]"
            auto-grow
            :label="t(`setting.collect.${field.labelKey}`)"
            :hint="t('setting.collect.namingFieldHint')"
            rows="2"
            min-rows="2"
            max-rows="8"
            persistent-hint
            class="template-textarea"
            @focus="activeFormatField = field.key"
          />
        </VCol>
      </VRow>
      <div class="sticky-save-row">
        <VBtn type="button" color="primary" elevation="4" @click="saveNamingSettings" prepend-icon="mdi-content-save">
          {{ t('common.save') }}
        </VBtn>
      </div>
    </VCardText>
  </VCard>
</template>

<style scoped>
/* 长表单吸底保存按钮：跟随视口底部，滚动全程可及 */
.sticky-save-row {
  position: sticky;
  bottom: 0.75rem;
  z-index: 2;
  display: flex;
  justify-content: flex-start;
  padding-block-start: 0.75rem;
}

/* 命名模板变量速查条：吸顶跟随（锚点条之下），滚动中也可点击插入 */
.template-variable-bar {
  position: sticky;
  top: 9.2rem;
  z-index: 2;
  display: flex;
  flex-wrap: wrap;
  gap: 0.4rem;
  align-items: center;
  padding: 0.6rem 0.75rem;
  margin-block-end: 0.9rem;
  background: rgba(var(--v-theme-surface), 0.96);
  backdrop-filter: blur(6px);
  border-radius: 0.5rem;
}

.template-variable-label {
  color: rgba(var(--v-theme-on-surface), var(--v-medium-emphasis-opacity));
  font-size: 0.75rem;
  margin-inline-end: 0.35rem;
}

/* 命名模板输入框：等宽字体，代码不再糊成正文 */
.template-textarea :deep(textarea) {
  font-family: 'JetBrains Mono', 'Fira Code', Menlo, Consolas, monospace;
  font-size: 0.82rem;
  line-height: 1.5;
}
</style>
