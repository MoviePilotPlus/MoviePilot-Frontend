<!-- eslint-disable sonarjs/no-duplicate-string -->
<script lang="ts" setup>
// @ts-nocheck
import { useToast } from 'vue-toastification'
import api from '@/api'
import { useI18n } from 'vue-i18n'

// 视频源账号卡：六源登录凭据 + 腾讯/优酷下载线路，按源折叠分区（手风琴）。
// 凭据仍按原契约逐键保存（system/setting/{key}）；线路走 system/env 单键提交。
// 下载线路的表单状态由父级 provide（CollectSettings.Youku/Tencent，随 env 回填）。
const { t } = useI18n()
const $toast = useToast()

const lines = inject('collectSourceLines')

// ===== 凭据字段与分区配置（驱动渲染与加载/保存） =====
interface CredentialField {
  key: string // credentials 表单状态键
  settingKey: string // system/setting/{settingKey}
  titleKey: string
  hintKey: string
  tipsTitleKey?: string
  tipsKey?: string
}
interface SourceSection {
  key: string
  titleKey: string // collect.{key}Tab 源名词条
  fields: CredentialField[]
}

const SOURCES: SourceSection[] = [
  {
    key: 'tencent',
    titleKey: 'collect.tencentTab',
    fields: [
      {
        key: 'TencentCookie',
        settingKey: 'TencentCookie',
        titleKey: 'setting.collect.tencentCookie',
        hintKey: 'setting.collect.tencentCookieHint',
        tipsTitleKey: 'setting.collect.tencentCookieTipsTitle',
        tipsKey: 'setting.collect.tencentCookieTips',
      },
    ],
  },
  {
    key: 'iqiyi',
    titleKey: 'collect.iqiyiTab',
    fields: [
      {
        key: 'IQiyiCookie',
        settingKey: 'IQiyiCookie',
        titleKey: 'setting.collect.iqiyiCookie',
        hintKey: 'setting.collect.iqiyiCookieHint',
        tipsTitleKey: 'setting.collect.iqiyiCookieTipsTitle',
        tipsKey: 'setting.collect.iqiyiCookieTips',
      },
    ],
  },
  {
    key: 'youku',
    titleKey: 'collect.youkuTab',
    fields: [
      {
        key: 'YoukuCookie',
        settingKey: 'YoukuCookie',
        titleKey: 'setting.collect.youkuCookie',
        hintKey: 'setting.collect.youkuCookieHint',
        tipsTitleKey: 'setting.collect.youkuCookieTipsTitle',
        tipsKey: 'setting.collect.youkuCookieTips',
      },
      {
        key: 'YoukuStoken',
        settingKey: 'YoukuStoken',
        titleKey: 'setting.collect.youkuStoken',
        hintKey: 'setting.collect.youkuStokenHint',
        tipsTitleKey: 'setting.collect.youkuStokenTipsTitle',
        tipsKey: 'setting.collect.youkuStokenTips',
      },
    ],
  },
  {
    key: 'mgtv',
    titleKey: 'collect.mgtvTab',
    fields: [
      {
        key: 'MgTvTicket',
        settingKey: 'MgTvTicket',
        titleKey: 'setting.collect.mgTvTicket',
        hintKey: 'setting.collect.mgTvTicketHint',
        tipsTitleKey: 'setting.collect.mgTvTicketTipsTitle',
        tipsKey: 'setting.collect.mgTvTicketTips',
      },
      {
        key: 'MgAppTicket',
        settingKey: 'MgAppTicket',
        titleKey: 'setting.collect.mgAppTicket',
        hintKey: 'setting.collect.mgAppTicketHint',
        tipsTitleKey: 'setting.collect.mgAppTicketTipsTitle',
        tipsKey: 'setting.collect.mgAppTicketTips',
      },
    ],
  },
  {
    key: 'bilibili',
    titleKey: 'collect.bilibiliTab',
    fields: [
      {
        key: 'BilibiliCookie',
        settingKey: 'BilibiliCookie',
        titleKey: 'setting.collect.bilibiliCookie',
        hintKey: 'setting.collect.bilibiliCookieHint',
        tipsTitleKey: 'setting.collect.bilibiliCookieTipsTitle',
        tipsKey: 'setting.collect.bilibiliCookieTips',
      },
    ],
  },
]

// 凭据表单状态（键 = system/setting 配置键，与后端契约一致）
const credentials = reactive<Record<string, string>>({
  TencentCookie: '',
  IQiyiCookie: '',
  YoukuCookie: '',
  YoukuStoken: '',
  MgTvTicket: '',
  MgAppTicket: '',
  BilibiliCookie: '',
})

// 手风琴默认全收起（徽标已标出配置状态）
const openPanels = ref<string[]>([])

async function loadCredentials() {
  const allFields = SOURCES.flatMap(source => source.fields)
  await Promise.allSettled(allFields.map(async (field) => {
    try {
      const result: { value?: unknown } = await api.get(`system/setting/${field.settingKey}`)
      if (result && result.value) credentials[field.key] = String(result.value)
    } catch (error) {
      console.log(error)
    }
  }))
}

// 分区是否已配置（任一凭据非空）
function isConfigured(source: SourceSection) {
  return source.fields.some(field => (credentials[field.key] || '').trim() !== '')
}

// 保存单条凭据：POST 原值到对应 system/setting 键
async function saveCredential(field: CredentialField) {
  try {
    await api.post(`system/setting/${field.settingKey}`, credentials[field.key])
    $toast.success(t('setting.collect.cookieSaveSuccess', { name: t(field.titleKey) }))
  } catch (error) {
    console.log(error)
    $toast.error(t('setting.collect.cookieSaveFailed', { name: t(field.titleKey) }))
  }
}

// ===== 下载线路（腾讯/优酷；状态由父级 provide，保存走 system/env 单键） =====
const youkuLineOptions = computed(() => [
  { title: t('setting.collect.youkuLineNormalTv'), value: 'normal_tv' },
  { title: t('setting.collect.youkuLineAndroid'), value: 'android' },
  { title: t('setting.collect.youkuLineFrameEnjoy'), value: 'frame_enjoy_cinema' },
])

const tencentLineOptions = computed(() => [
  { title: t('setting.collect.tencentLineNormalTv'), value: 'normal_tv' },
  { title: t('setting.collect.tencentLinePhone'), value: 'phone' },
  { title: t('setting.collect.tencentLineAuto'), value: 'auto' },
])

async function saveYoukuLine() {
  try {
    await api.post('system/env', { YOUKU_DOWNLOAD_LINE: lines.Youku.YOUKU_DOWNLOAD_LINE })
    $toast.success(t('setting.collect.youkuDownloadLineSaveSuccess'))
  } catch (error) {
    console.log(error)
    $toast.error(t('setting.collect.saveFailed'))
  }
}

async function saveTencentLine() {
  try {
    await api.post('system/env', { TENCENT_FETCH_LINE: lines.Tencent.TENCENT_FETCH_LINE })
    $toast.success(t('setting.collect.tencentFetchLineSaveSuccess'))
  } catch (error) {
    console.log(error)
    $toast.error(t('setting.collect.saveFailed'))
  }
}

onMounted(() => {
  loadCredentials()
})
</script>

<template>
  <VCard id="collect-accounts">
    <VCardItem>
      <VCardTitle>{{ t('setting.collect.accountSettings') }}</VCardTitle>
      <VCardSubtitle>{{ t('setting.collect.accountSettingsDesc') }}</VCardSubtitle>
    </VCardItem>
    <VCardText>
      <VExpansionPanels v-model="openPanels" variant="accordion" multiple>
        <VExpansionPanel
          v-for="source in SOURCES"
          :key="source.key"
          :data-testid="`credential-panel-${source.key}`"
        >
          <VExpansionPanelTitle>
            <div class="d-flex align-center gap-2">
              <span class="text-subtitle-1 font-weight-bold">{{ t(source.titleKey) }}</span>
              <VChip size="x-small" variant="tonal" :color="isConfigured(source) ? 'success' : undefined">
                {{ t(isConfigured(source) ? 'setting.collect.templateConfigured' : 'setting.collect.templateNotConfigured') }}
              </VChip>
            </div>
          </VExpansionPanelTitle>
          <VExpansionPanelText>
            <div v-for="field in source.fields" :key="field.key" class="mb-4">
              <VTextarea
                v-model="credentials[field.key]"
                auto-grow
                :label="t(field.titleKey)"
                :hint="t(field.hintKey)"
                rows="3"
                persistent-hint
              />
              <VAlert
                v-if="field.tipsKey"
                type="info"
                variant="tonal"
                density="compact"
                class="mt-2"
                :title="t(field.tipsTitleKey)"
              >
                <span v-html="t(field.tipsKey)" />
              </VAlert>
              <div class="d-flex mt-2">
                <VBtn size="small" color="primary" @click="saveCredential(field)" prepend-icon="mdi-content-save">
                  {{ t('common.save') }}
                </VBtn>
              </div>
            </div>

            <!-- 腾讯采集线路 -->
            <template v-if="source.key === 'tencent'">
              <VSelect
                v-model="lines.Tencent.TENCENT_FETCH_LINE"
                :items="tencentLineOptions"
                item-title="title"
                item-value="value"
                :label="t('setting.collect.tencentFetchLine')"
                :hint="t('setting.collect.tencentFetchLineHint')"
                persistent-hint
                prepend-inner-icon="mdi-routes"
              />
              <div class="d-flex mt-2">
                <VBtn size="small" color="primary" @click="saveTencentLine" prepend-icon="mdi-content-save">
                  {{ t('common.save') }}
                </VBtn>
              </div>
            </template>

            <!-- 优酷下载线路 -->
            <template v-if="source.key === 'youku'">
              <VSelect
                v-model="lines.Youku.YOUKU_DOWNLOAD_LINE"
                :items="youkuLineOptions"
                item-title="title"
                item-value="value"
                :label="t('setting.collect.youkuDownloadLine')"
                :hint="t('setting.collect.youkuDownloadLineHint')"
                persistent-hint
                prepend-inner-icon="mdi-routes"
              />
              <div class="d-flex mt-2">
                <VBtn size="small" color="primary" @click="saveYoukuLine" prepend-icon="mdi-content-save">
                  {{ t('common.save') }}
                </VBtn>
              </div>
            </template>
          </VExpansionPanelText>
        </VExpansionPanel>
      </VExpansionPanels>
    </VCardText>
  </VCard>
</template>
