<!-- eslint-disable sonarjs/no-duplicate-string -->
<script lang="ts" setup>
// @ts-nocheck
import { useToast } from 'vue-toastification'
import api from '@/api'
import { useI18n } from 'vue-i18n'

// 截图模板卡：截图拼接模板配置引擎（预设 + 可视化调参 + 预览 + 保存）。
// basic 由父级 provide（CollectSettings.Basic 响应式引用）：初始化读 SCREENSHOT_TEMPLATE_CONFIG /
// SCREENSHOT_TEMPLATE，保存后回写 SCREENSHOT_TEMPLATE_CONFIG，避免与基础设置保存互相覆盖。
const basic = inject('collectSettingsBasic')

const { t } = useI18n()
const $toast = useToast()

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
    systemFonts.value = await api.get('collect/screenshot-fonts')
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
    tplPreviewSrc.value = result?.image
  } catch (e) { console.error('preview error', e) } finally { previewLoading.value = false }
}
async function saveScreenshotConfig() {
  savingScreenshotConfig.value = true
  try {
    const json = JSON.stringify(tplConfig.value)
    await api.post('system/env', { SCREENSHOT_TEMPLATE_CONFIG: json })
    // 回写表单组：否则随后保存基础设置时会把旧模板 JSON 原样提交回去（两处保存互相覆盖）
    basic.SCREENSHOT_TEMPLATE_CONFIG = json
    $toast.success(t('setting.collect.screenshotConfigSaveSuccess'))
  } catch { $toast.error(t('setting.collect.saveFailed')) } finally { savingScreenshotConfig.value = false }
}

// 模板初始化：优先用 JSON 配置，否则用预设名加载。
// env 回填是异步的：挂载时按当前值先渲染兜底预览，env 回填引起键值变化时重新初始化，
// 保证最终以存量配置渲染（与拆分前 loadSystemSettings 的行为一致）。
function initTpl() {
  const tplCfg = basic.SCREENSHOT_TEMPLATE_CONFIG
  if (tplCfg) {
    try {
      const parsed = JSON.parse(tplCfg)
      // 合并默认值，确保新增字段（如 font）存在
      tplConfig.value = tplDeepMerge(TPL_DEFAULTS, parsed)
    } catch { /* ignore */ }
  } else {
    const tplName = basic.SCREENSHOT_TEMPLATE
    if (tplName && TPL_PRESETS[tplName]) loadPreset(tplName)
  }
  renderTplPreview()
  loadSystemFonts()
}
onMounted(initTpl)
watch(() => [basic.SCREENSHOT_TEMPLATE_CONFIG, basic.SCREENSHOT_TEMPLATE], () => initTpl())

// 截图模板面板的选项词条化（预设名/背景类型/元数据位置与对齐）
const presetItems = computed(() => Object.keys(TPL_PRESETS).map(key => ({
  title: t(`setting.collect.preset${key.charAt(0).toUpperCase()}${key.slice(1)}`),
  value: key,
})))
const bgTypeLabels = computed(() => ({
  solid: t('setting.collect.bgSolid'),
  blur: t('setting.collect.bgBlur'),
  frosted: t('setting.collect.bgFrosted'),
  gradient: t('setting.collect.bgGradient'),
}))
const metadataPositionItems = computed(() => [
  { title: t('setting.collect.posTop'), value: 'top' },
  { title: t('setting.collect.posBottom'), value: 'bottom' },
  { title: t('setting.collect.posOverlay'), value: 'overlay' },
  { title: t('setting.collect.posLeft'), value: 'left' },
])
const metadataAlignItems = computed(() => [
  { title: t('setting.collect.alignLeft'), value: 'left' },
  { title: t('setting.collect.alignCenter'), value: 'center' },
])
</script>

<template>
  <VCard id="collect-screenshot">
    <VCardItem class="pb-2">
      <VCardTitle>{{ t('setting.collect.screenshotTemplate') }}</VCardTitle>
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
              <span class="text-medium-emphasis">{{ realtimePreview ? t('setting.collect.previewGenerating') : t('setting.collect.previewIdle') }}</span>
            </div>
          </div>
        </VCol>
        <!-- 右：控制区 -->
        <VCol cols="12" md="5">
          <!-- 工具栏 -->
          <div class="d-flex align-center gap-2 mb-2 flex-wrap">
            <VSelect v-model="activePreset" :items="presetItems" density="compact"
                     :label="t('setting.collect.presetLabel')" variant="outlined" hide-details style="max-width:140px"
                     @update:model-value="loadPreset" />
            <VSwitch v-model="realtimePreview" :label="t('setting.collect.realtimePreview')" density="compact" hide-details color="primary" />
            <VSpacer />
            <VBtn v-if="!realtimePreview" size="small" color="primary" variant="outlined"
                  :loading="previewLoading" prepend-icon="mdi-eye" @click="renderTplPreview">{{ t('setting.collect.previewBtn') }}</VBtn>
            <VBtn size="small" color="primary" :loading="savingScreenshotConfig"
                  prepend-icon="mdi-content-save" @click="saveScreenshotConfig">{{ t('common.save') }}</VBtn>
          </div>

          <!-- 背景 -->
          <div class="d-flex align-center gap-2 mb-2">
            <span class="text-caption font-weight-bold text-medium-emphasis flex-shrink-0 text-no-wrap">{{ t('setting.collect.bgSection') }}</span>
            <!-- 标签须 flex-shrink-0：.v-divider 是 flex:1 1 100%，basis 100%，
                 会在窄列里把同行文字压到换行；收缩全部由分割线承担 -->
            <VDivider class="flex-grow-1" />
          </div>
          <VBtnGroup divided density="compact" class="mb-4" style="width:100%">
            <VBtn v-for="bt in ['solid','blur','frosted','gradient']" :key="bt" size="x-small"
                  :variant="tplConfig.background.type===bt?'flat':'outlined'" :color="tplConfig.background.type===bt?'primary':''"
                  style="flex:1" @click="tplConfig.background.type=bt">
              {{ bgTypeLabels[bt] }}
            </VBtn>
          </VBtnGroup>
          <VRow dense class="mb-1" no-gutters>
            <VCol v-if="tplConfig.background.type==='solid'" cols="12" class="pr-1">
              <VMenu :close-on-content-click="false" location="bottom start">
                <template #activator="{ props: mp }">
                  <VTextField v-bind="mp" v-model="tplConfig.background.color" :label="t('setting.collect.bgColor')" density="compact" readonly variant="outlined" hide-details>
                    <template #prepend-inner><div :style="{backgroundColor:tplConfig.background.color,width:'18px',height:'18px',borderRadius:'3px',border:'1px solid #ccc'}" /></template>
                  </VTextField>
                </template>
                <VColorPicker v-model="tplConfig.background.color" mode="hex" hide-inputs />
              </VMenu>
            </VCol>
            <VCol v-if="['blur','frosted'].includes(tplConfig.background.type)" cols="6" class="pr-1">
              <div class="d-flex align-center gap-1">
                <span class="text-caption" style="min-width:28px">{{ t('setting.collect.blurAmount') }}</span>
                <VSlider v-model="tplConfig.background.blur" :min="0" :max="80" density="compact" hide-details thumb-size="14" class="flex-grow-1" />
                <VTextField v-model.number="tplConfig.background.blur" type="number" density="compact" variant="outlined" hide-details class="flex-shrink-0" style="width:72px" />
              </div>
            </VCol>
            <VCol v-if="tplConfig.background.type==='frosted'" cols="6" class="pl-1">
              <div class="d-flex align-center gap-1">
                <span class="text-caption" style="min-width:28px">{{ t('setting.collect.scrimAmount') }}</span>
                <VSlider v-model="tplConfig.background.scrim_alpha" :min="0" :max="255" density="compact" hide-details thumb-size="14" class="flex-grow-1" />
                <VTextField v-model.number="tplConfig.background.scrim_alpha" type="number" density="compact" variant="outlined" hide-details class="flex-shrink-0" style="width:72px" />
              </div>
            </VCol>
          </VRow>

          <!-- 拼图 -->
          <div class="d-flex align-center gap-2 mb-2 mt-3">
            <span class="text-caption font-weight-bold text-medium-emphasis flex-shrink-0 text-no-wrap">{{ t('setting.collect.gridSection') }}</span>
            <VDivider class="flex-grow-1" />
          </div>
          <VRow dense class="mb-1" no-gutters>
            <VCol cols="6" class="pr-1"><div class="d-flex align-center gap-1">
              <span class="text-caption" style="min-width:28px">{{ t('setting.collect.gapLabel') }}</span>
              <VSlider v-model="tplConfig.grid.gap" :min="0" :max="30" density="compact" hide-details thumb-size="14" class="flex-grow-1" />
              <VTextField v-model.number="tplConfig.grid.gap" type="number" density="compact" variant="outlined" hide-details class="flex-shrink-0" style="width:72px" />
            </div></VCol>
            <VCol cols="6" class="pl-1"><div class="d-flex align-center gap-1">
              <span class="text-caption" style="min-width:28px">{{ t('setting.collect.cornerRadius') }}</span>
              <VSlider v-model="tplConfig.grid.corner_radius" :min="0" :max="30" density="compact" hide-details thumb-size="14" class="flex-grow-1" />
              <VTextField v-model.number="tplConfig.grid.corner_radius" type="number" density="compact" variant="outlined" hide-details class="flex-shrink-0" style="width:72px" />
            </div></VCol>
            <VCol cols="6" class="pr-1"><div class="d-flex align-center gap-1">
              <span class="text-caption" style="min-width:28px">{{ t('setting.collect.borderWidth') }}</span>
              <VSlider v-model="tplConfig.grid.border_width" :min="0" :max="5" density="compact" hide-details thumb-size="14" class="flex-grow-1" />
              <VTextField v-model.number="tplConfig.grid.border_width" type="number" density="compact" variant="outlined" hide-details class="flex-shrink-0" style="width:72px" />
            </div></VCol>
            <VCol cols="6" class="pl-1">
              <VMenu :close-on-content-click="false" location="bottom start">
                <template #activator="{ props: mp }">
                  <VTextField v-bind="mp" v-model="tplConfig.grid.border_color" :label="t('setting.collect.borderColor')" density="compact" readonly variant="outlined" hide-details>
                    <template #prepend-inner><div :style="{backgroundColor:tplConfig.grid.border_color,width:'18px',height:'18px',borderRadius:'3px',border:'1px solid #ccc'}" /></template>
                  </VTextField>
                </template>
                <VColorPicker v-model="tplConfig.grid.border_color" mode="hex" hide-inputs />
              </VMenu>
            </VCol>
          </VRow>
          <VSwitch v-model="tplConfig.grid.shadow" :label="t('setting.collect.shadowLabel')" density="compact" hide-details class="mb-1 mt-1" />
          <VSwitch v-model="tplConfig.grid.show_timestamp" :label="t('setting.collect.showTimestamp')" density="compact" hide-details class="mb-1" />

          <!-- 元数据 -->
          <div class="d-flex align-center gap-2 mb-2 mt-3">
            <span class="text-caption font-weight-bold text-medium-emphasis flex-shrink-0 text-no-wrap">{{ t('setting.collect.metadataSection') }}</span>
            <VDivider class="flex-grow-1" />
          </div>
          <VRow dense class="mb-1" no-gutters>
            <VCol cols="4" class="pr-1"><VSelect v-model="tplConfig.metadata.position"
              :items="metadataPositionItems"
              :label="t('setting.collect.positionLabel')" density="compact" variant="outlined" hide-details /></VCol>
            <VCol cols="4" class="px-1"><VSelect v-model="tplConfig.metadata.align"
              :items="metadataAlignItems"
              :label="t('setting.collect.alignLabel')" density="compact" variant="outlined" hide-details /></VCol>
            <VCol cols="4" class="pl-1">
              <VMenu :close-on-content-click="false" location="bottom start">
                <template #activator="{ props: mp }">
                  <VTextField v-bind="mp" v-model="tplConfig.metadata.font_color" :label="t('setting.collect.fontColor')" density="compact" readonly variant="outlined" hide-details>
                    <template #prepend-inner><div :style="{backgroundColor:tplConfig.metadata.font_color,width:'18px',height:'18px',borderRadius:'3px',border:'1px solid #ccc'}" /></template>
                  </VTextField>
                </template>
                <VColorPicker v-model="tplConfig.metadata.font_color" mode="hex" hide-inputs />
              </VMenu>
            </VCol>
          </VRow>
          <div class="grid grid-cols-2 gap-x-2 gap-y-1 mt-1">
            <VSwitch v-model="tplConfig.metadata.hierarchy" :label="t('setting.collect.titleEnlarge')" density="compact" hide-details />
            <VSwitch v-model="tplConfig.metadata.label_prefix" :label="t('setting.collect.filePrefix')" density="compact" hide-details />
            <VSwitch v-model="tplConfig.metadata.outline" :label="t('setting.collect.darkOutline')" density="compact" hide-details />
            <VSwitch v-model="tplConfig.metadata.bold" :label="t('setting.collect.boldText')" density="compact" hide-details />
            <VSwitch v-model="tplConfig.poster.show_cover" :label="t('setting.collect.showCover')" density="compact" hide-details />
          </div>

          <!-- 字体 -->
          <div class="d-flex align-center gap-2 mb-2 mt-3">
            <span class="text-caption font-weight-bold text-medium-emphasis flex-shrink-0 text-no-wrap">{{ t('setting.collect.fontSection') }}</span>
            <VDivider class="flex-grow-1" />
          </div>
          <VRow dense class="mb-1" no-gutters>
            <VCol cols="6" class="pr-1">
              <VAutocomplete v-model="tplConfig.font.primary" :items="systemFonts" clearable
                :label="t('setting.collect.primaryFont')" density="compact" variant="outlined" hide-details />
            </VCol>
            <VCol cols="6" class="pl-1">
              <VAutocomplete v-model="tplConfig.font.fallback" :items="systemFonts" clearable
                :label="t('setting.collect.fallbackFont')" density="compact" variant="outlined" hide-details />
            </VCol>
          </VRow>
        </VCol>
      </VRow>

      <!-- 预览大图（VDialog 传送门渲染，置于卡内保持组件单根以继承锚点 id） -->
      <VDialog v-model="tplPreviewLarge" max-width="95vw">
        <VImg v-if="tplPreviewSrc" :src="tplPreviewSrc" max-height="90vh" contain @click="tplPreviewLarge = false" style="cursor:pointer" class="rounded-0" />
      </VDialog>
    </VCardText>
  </VCard>
</template>
