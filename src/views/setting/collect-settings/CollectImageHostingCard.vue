<!-- eslint-disable sonarjs/no-duplicate-string -->
<script lang="ts" setup>
// @ts-nocheck
import { useToast } from 'vue-toastification'
import draggable from 'vuedraggable'
import api from '@/api'
import { useI18n } from 'vue-i18n'

// 图床设置卡：优先级拖拽排序（顺序即优先级，主流程取第一个启用的图床）+ 各图床凭据。
const { t } = useI18n()
const $toast = useToast()

// 图床配置对象（order 键存优先级序，其余键为各图床凭据/开关）
const imageHosting = ref<Record<string, any>>({})

// 图床优先级拖拽列表（与 imageHosting 双向同步；字段以引用共享，行内编辑直接写回）
const hostingOrder = ref<{ key: string; [field: string]: any }[]>([])

// 调用API查询图床设置
async function loadImageHostingSetting() {
  const defaultImageHostingSettings = {
    'ipic': {
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
    'pixhost': {
      'active': true,
    },
  }
  const defaultHostingOrder = ['pixhost', 'imgbox', 'ipic', 'imgbb', 'panda']
  try {
    const result: { [key: string]: any } = await api.get('system/setting/ImageHostingParams')
    // 接口 data 是 {value: 配置对象} 信封；未配置为 null、历史脏数据可能是非对象，
    // 且存量配置可能缺新增图床的子键——一律与默认值合并后使用，保证表单可编辑
    const stored = result?.value
    const storedObj = (typeof stored === 'object' && stored !== null && !Array.isArray(stored))
      ? { ...(stored as Record<string, any>) }
      : {}
    // smms 图床已停服下线：存量配置残留的 smms 子键丢弃，不参与合并
    const storedOrder = storedObj.order
    delete storedObj.smms
    delete storedObj.order
    imageHosting.value = typeof stored === 'object' && stored !== null
      ? { ...defaultImageHostingSettings, ...storedObj }
      : defaultImageHostingSettings
    // 优先级序：存量 order（校验合法图床名，缺失的按默认序补尾）回填拖拽列表
    const validKeys = defaultHostingOrder
    const storedList = Array.isArray(storedOrder)
      ? storedOrder.filter((k: any) => typeof k === 'string' && validKeys.includes(k))
      : []
    const mergedOrder = [...storedList, ...validKeys.filter(k => !storedList.includes(k))]
    imageHosting.value.order = mergedOrder
  } catch (error) {
    console.log(error)
  }
  syncHostingOrder()
}

// 从 imageHosting 合成拖拽列表（顺序 + 各图床凭据/开关）
function syncHostingOrder() {
  const hosting = imageHosting.value
  if (!hosting) return
  hostingOrder.value = (hosting.order || []).map((key: string) => ({
    key,
    ...(hosting[key] || {}),
  }))
}

// 调用API保存图床设置
async function saveImageHostingSetting() {
  try {
    // 拖拽列表回写：顺序进 order 键，行内凭据/开关回各图床子键
    const hosting: Record<string, any> = { ...imageHosting.value }
    for (const item of hostingOrder.value) {
      const { key, ...fields } = item
      hosting[key] = { ...hosting[key], ...fields }
    }
    hosting.order = hostingOrder.value.map(item => item.key)
    await api.post('system/setting/ImageHostingParams', hosting)
    $toast.success(t('setting.collect.imageHostingSaveSuccess'))
    await loadImageHostingSetting()
  } catch (error) {
    console.log(error)
    $toast.error(t('setting.collect.imageHostingSaveFailed'))
  }
}

// 图床显示名（词条键映射）
function hostingLabel(key: string) {
  const keyMap: Record<string, string> = {
    ipic: 'setting.collect.ipic',
    imgbb: 'setting.collect.imgbb',
    panda: 'setting.collect.panda',
    imgbox: 'setting.collect.imgbox',
    pixhost: 'setting.collect.pixhost',
  }
  return t(keyMap[key] || key)
}

// 图床一句话定位（与 ptgen 线路卡片描述行对齐）
function hostingSubLabel(key: string) {
  const keyMap: Record<string, string> = {
    ipic: 'setting.collect.hostingIpicDesc',
    imgbb: 'setting.collect.hostingImgbbDesc',
    panda: 'setting.collect.hostingPandaDesc',
    imgbox: 'setting.collect.hostingImgboxDesc',
    pixhost: 'setting.collect.hostingPixhostDesc',
  }
  return t(keyMap[key] || '')
}

onMounted(() => {
  loadImageHostingSetting()
})
</script>

<template>
  <VCard id="collect-imagehosting">
    <VCardItem>
      <VCardTitle>{{ t('setting.collect.imageHosting') }}</VCardTitle>
      <VCardSubtitle>{{ t('setting.collect.imageHostingDesc') }}</VCardSubtitle>
    </VCardItem>
    <VCardText>
      <VExpansionPanels variant="accordion">
        <VExpansionPanel>
          <VExpansionPanelTitle>
            <span class="text-subtitle-1 font-weight-bold">{{ t('setting.collect.imageHostingPanelTitle') }}</span>
          </VExpansionPanelTitle>
          <VExpansionPanelText>
      <VForm @submit.prevent="() => {}">
        <div class="text-medium-emphasis text-body-2 mb-3">
          {{ t('setting.collect.imageHostingOrderHint') }}
        </div>
        <!-- 图床优先级拖拽排序列表：顺序=优先级，主流程取第一个启用的 -->
        <draggable
          v-model="hostingOrder"
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
                  <div class="text-subtitle-2 font-weight-bold">{{ hostingLabel(element.key) }}</div>
                  <div class="text-caption text-medium-emphasis">{{ hostingSubLabel(element.key) }}</div>
                </div>
                <VSwitch
                  v-model="element.active"
                  color="primary"
                  density="compact"
                  hide-details
                  class="flex-shrink-0"
                />
              </div>
              <!-- 各图床凭据字段（免账号图床无凭据段）；浅底子面板与头行分层 -->
              <div v-if="element.key === 'imgbb' || element.key === 'panda'" class="mt-2 pa-3 rounded-lg collect-subpanel">
                <VTextField
                  v-model="element.apikey"
                  :label="t('setting.collect.apikey')"
                  prepend-inner-icon="mdi-key"
                  density="compact"
                  variant="outlined"
                  hide-details
                />
              </div>
              <div v-else-if="element.key === 'imgbox'" class="mt-2 pa-3 rounded-lg collect-subpanel">
                <VRow dense no-gutters>
                  <VCol cols="12" md="6" class="pr-md-1 pb-1 pb-md-0">
                    <VTextField
                      v-model="element.username"
                      :label="t('setting.collect.username')"
                      prepend-inner-icon="mdi-account"
                      density="compact"
                      variant="outlined"
                      hide-details
                    />
                  </VCol>
                  <VCol cols="12" md="6" class="pl-md-1">
                    <VTextField
                      v-model="element.password"
                      :label="t('setting.collect.password')"
                      prepend-inner-icon="mdi-account-key"
                      density="compact"
                      variant="outlined"
                      hide-details
                    />
                  </VCol>
                </VRow>
              </div>
            </VCard>
          </template>
        </draggable>
      </VForm>
          </VExpansionPanelText>
        </VExpansionPanel>
      </VExpansionPanels>
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
</template>

<style scoped>
/*
 * 拖拽卡片的展开参数子面板：与头行分层。
 * 不能写 bg-surface-lighten-1 —— Vuetify 3 已移除 lighten/darken 变体类，
 * 该 class 不产出任何 CSS（静默失效），故用主题变量直接上色适配明暗主题。
 */
.collect-subpanel {
  background: rgba(var(--v-theme-on-surface), 0.04);
}
</style>
