<!-- eslint-disable sonarjs/no-duplicate-string -->
<script lang="ts" setup>
// @ts-nocheck
import { useToast } from 'vue-toastification'
import draggable from 'vuedraggable'
import api from '@/api'
import { useI18n } from 'vue-i18n'

// PTGen 简介抓取线路卡：拖拽排序（顺序即兜底线路优先级）+ refactor 自建部署参数。
const { t } = useI18n()
const $toast = useToast()

// ===== PTGen 简介抓取线路（拖拽排序：顺序即兜底线路优先级）=====
// 线路池固定三条：douban 直连页（数据最全，始终最先）/ ptgen_refactor
// （PT-Gen-Refactor 远端服务，直连源站解析）/ wmdb 镜像；历史 iyuu 线路已
// 下线（服务方停止提供数据），存量配置残留键会被后端忽略
interface PtgenSourceItem {
  key: string
  active: boolean
  base_url?: string
  secret?: string
  [field: string]: unknown
}
const ptgenSourceOrder = ref<PtgenSourceItem[]>([])
const defaultPtgenSourceOrder = ['douban', 'ptgen_refactor', 'wmdb']
// 行内折叠状态：键为线路 key，值为展开面板索引（null=收起）；仅 refactor 有参数段
const openPtgenPanels = ref<Record<string, number | null>>({})

function ptgenSourceLabel(key: string) {
  const keyMap: Record<string, string> = {
    douban: 'setting.collect.ptgenSourceDouban',
    ptgen_refactor: 'setting.collect.ptgenSourceRefactor',
    wmdb: 'setting.collect.ptgenSourceWmdb',
  }
  return t(keyMap[key] || key)
}

function ptgenSourceSubLabel(key: string) {
  const keyMap: Record<string, string> = {
    douban: 'setting.collect.ptgenSourceDoubanDesc',
    ptgen_refactor: 'setting.collect.ptgenSourceRefactorDesc',
    wmdb: 'setting.collect.ptgenSourceWmdbDesc',
  }
  return t(keyMap[key] || '')
}

async function loadPtgenSourceSetting() {
  try {
    const result: { value?: unknown } = await api.get('system/setting/PtgenSourceParams')
    // 同 system/setting/{key} 信封：data 是 {value: 配置}，未配置为 null
    const stored = result?.value
    const storedObj = (typeof stored === 'object' && stored !== null && !Array.isArray(stored))
      ? stored as Record<string, unknown>
      : {}
    const rawOrder = Array.isArray(storedObj.order) ? storedObj.order : []
    const storedOrder = rawOrder.filter(
      (k): k is string => typeof k === 'string' && defaultPtgenSourceOrder.includes(k),
    )
    const mergedOrder = [...storedOrder, ...defaultPtgenSourceOrder.filter(k => !storedOrder.includes(k))]
    ptgenSourceOrder.value = mergedOrder.map(key => {
      const section = (typeof storedObj[key] === 'object' && storedObj[key] !== null)
        ? storedObj[key] as Record<string, unknown>
        : {}
      return {
        key,
        active: section.active !== false,
        base_url: (typeof section.base_url === 'string' && section.base_url) || '',
        secret: (typeof section.secret === 'string' && section.secret) || '',
      }
    })
  } catch (error) {
    console.log(error)
    ptgenSourceOrder.value = defaultPtgenSourceOrder.map(key => ({ key, active: true, base_url: '', secret: '' }))
  }
}

async function savePtgenSourceSetting() {
  try {
    const payload: Record<string, unknown> = {
      order: ptgenSourceOrder.value.map(item => item.key),
    }
    for (const item of ptgenSourceOrder.value) {
      const { key, ...fields } = item
      payload[key] = fields
    }
    await api.post('system/setting/PtgenSourceParams', payload)
    $toast.success(t('setting.collect.ptgenSourceSaveSuccess'))
  } catch (error) {
    console.log(error)
    $toast.error(t('setting.collect.saveFailed'))
  }
}

onMounted(() => {
  loadPtgenSourceSetting()
})
</script>

<template>
  <VCard id="collect-ptgen">
    <VCardItem>
      <VCardTitle>{{ t('setting.collect.ptgenSource') }}</VCardTitle>
      <VCardSubtitle>{{ t('setting.collect.ptgenSourceDesc') }}</VCardSubtitle>
    </VCardItem>
    <VCardText>
      <VForm @submit.prevent="() => {}">
        <div class="text-medium-emphasis text-body-2 mb-3">
          {{ t('setting.collect.ptgenSourceOrderHint') }}
        </div>
        <!-- 简介抓取线路拖拽排序列表：顺序=优先级，douban 直连始终最先 -->
        <draggable
          v-model="ptgenSourceOrder"
          handle=".cursor-move"
          item-key="key"
          tag="div"
          :component-data="{ 'class': 'd-flex flex-column gap-3' }"
        >
          <template #item="{ element, index }">
            <VCard
              variant="tonal"
              class="pa-3"
              :class="{ 'opacity-60': !element.active }"
            >
              <div class="d-flex align-center gap-4">
                <VIcon icon="mdi-drag-vertical" color="grey" class="cursor-move" />
                <VChip size="x-small" variant="tonal" color="primary" label class="flex-shrink-0">
                  {{ t('setting.collect.priorityLabel') }} {{ index + 1 }}
                </VChip>
                <div class="flex-grow-1 min-w-0">
                  <div class="text-subtitle-2 font-weight-bold">{{ ptgenSourceLabel(element.key) }}</div>
                  <div class="text-caption text-medium-emphasis">{{ ptgenSourceSubLabel(element.key) }}</div>
                </div>
                <VSwitch
                  v-model="element.active"
                  color="primary"
                  density="compact"
                  hide-details
                  class="flex-shrink-0"
                />
              </div>
              <!-- PT-Gen-Refactor 自建部署参数（官方实例留空用内置默认）：行内手风琴展开；浅底子面板与头行分层 -->
              <VExpansionPanels
                v-if="element.key === 'ptgen_refactor'"
                v-model="openPtgenPanels[element.key]"
                variant="accordion"
                class="mt-2"
              >
                <VExpansionPanel data-testid="ptgen-panel-refactor">
                  <VExpansionPanelTitle>
                    <span class="text-caption text-medium-emphasis">{{ t('setting.collect.ptgenSourceRefactorParamsTitle') }}</span>
                  </VExpansionPanelTitle>
                  <VExpansionPanelText>
                    <div class="pa-1 rounded-lg collect-subpanel">
                      <VRow dense no-gutters>
                        <VCol cols="12" md="7" class="pr-md-1 pb-1 pb-md-0">
                          <VTextField
                            v-model="element.base_url"
                            :label="t('setting.collect.ptgenSourceRefactorBaseUrl')"
                            :hint="t('setting.collect.ptgenSourceRefactorBaseUrlHint')"
                            placeholder="https://pt-gen.hares.dpdns.org"
                            persistent-hint
                            density="compact"
                            prepend-inner-icon="mdi-api"
                          />
                        </VCol>
                        <VCol cols="12" md="5" class="pl-md-1">
                          <VTextField
                            v-model="element.secret"
                            :label="t('setting.collect.ptgenSourceRefactorSecret')"
                            :hint="t('setting.collect.ptgenSourceRefactorSecretHint')"
                            persistent-hint
                            density="compact"
                            prepend-inner-icon="mdi-key-variant"
                          />
                        </VCol>
                      </VRow>
                    </div>
                  </VExpansionPanelText>
                </VExpansionPanel>
              </VExpansionPanels>
            </VCard>
          </template>
        </draggable>
      </VForm>
    </VCardText>
    <VCardText>
      <VForm @submit.prevent="() => {}">
        <div class="d-flex flex-wrap gap-4 mt-4">
          <VBtn type="submit" @click="savePtgenSourceSetting" prepend-icon="mdi-content-save">
            {{ t('common.save') }}
          </VBtn>
        </div>
      </VForm>
    </VCardText>
  </VCard>
</template>

<style scoped>
/*
 * 拖拽卡片的展开参数子面板：与头行分层（与图床卡共用视觉）。
 */
.collect-subpanel {
  background: rgba(var(--v-theme-on-surface), 0.04);
}
</style>
