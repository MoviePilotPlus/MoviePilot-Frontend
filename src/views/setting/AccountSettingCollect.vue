<script lang="ts" setup>
// @ts-nocheck
import { useToast } from 'vue-toastification'
import { VRow, VSelect } from 'vuetify/lib/components/index.mjs'
import api from '@/api'
import { useI18n } from 'vue-i18n'
import CollectBasicCard from './collect-settings/CollectBasicCard.vue'
import CollectNamingCard from './collect-settings/CollectNamingCard.vue'
import CollectScreenshotCard from './collect-settings/CollectScreenshotCard.vue'
import CollectImageHostingCard from './collect-settings/CollectImageHostingCard.vue'
import CollectPtgenCard from './collect-settings/CollectPtgenCard.vue'
import CollectSiteSchemaCard from './collect-settings/CollectSiteSchemaCard.vue'
import CollectTeamCard from './collect-settings/CollectTeamCard.vue'

// 采集设置页（设定 → 采集）：装配各分区卡片 + 视频源账号凭据卡。
// 分区卡位于 ./collect-settings/，各自负责加载与保存；本页持有 Basic 组表单状态。

// 国际化
const { t } = useI18n()

// 提示框
const $toast = useToast()

// ===== 页内锚点导航：采集设置卡片分区 =====
const collectSectionAnchors = [
  { id: 'collect-basic', labelKey: 'basicSettings' },
  { id: 'collect-naming', labelKey: 'namingFormat' },
  { id: 'collect-screenshot', labelKey: 'screenshotTemplate' },
  { id: 'collect-imagehosting', labelKey: 'imageHosting' },
  { id: 'collect-ptgen', labelKey: 'ptgenSource' },
  { id: 'collect-siteschema', labelKey: 'siteSchema' },
  { id: 'collect-accounts', labelKey: 'accountSettings' },
  { id: 'collect-teams', labelKey: 'teamConfig' },
]

function scrollToCollectSection(id: string) {
  // 本页滚动容器是根级 glass 容器，对 smooth 行为不响应（实测仅 auto 生效）；
  // 需要留白时用 scroll-margin-top 兜住吸顶锚点条
  document.getElementById(id)?.scrollIntoView({ behavior: 'auto', block: 'start' })
}

// 采集器设置项
const CollectSettings = ref<any>({
  // 基础设置
  Basic: {
    MEDIA_DIR: '',
    DOWNLOAD_DIR: '',
    DOWNLOADER_SLEEP_TIME: 60,
    DOWNLOADER_THREAD_COUNT: 1,
    DOWNLOADER_SPEED: '10M',
    DOWNLOAD_TASK_MAX_WORKERS: 1,
    RAISE_EXCEPTION: false,
    API_DEBUG: false,
    SCREENSHOT_TEMPLATE: 'default',
    SCREENSHOT_TEMPLATE_CONFIG: '',
    SCREENSHOT_HDR_PROCESSOR: 'auto',
    SCREENSHOT_COUNT: 4,
    SCREENSHOT_GRID_ENABLED: true,
    SCREENSHOT_CACHE_ENABLED: false,
    SCREENSHOT_COMPRESS_LIMIT: 5 * 1024 * 1024,
    SCREENSHOT_MIN_SIZE_LIMIT: 1800 * 1024,
    SCREENSHOT_QUALITY_CHECK: true,
    BANGUMI_API_BASE: '',
    DOUBAN_COOKIES: '',
    DOUBAN_USE_PROXY: true,
    DOUBAN_BROWSER_FALLBACK: true,
    TORRENT_AUTHOR: '',
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
  Youku: {
    YOUKU_DOWNLOAD_LINE: 'normal_tv',
  },
  Tencent: {
    TENCENT_FETCH_LINE: 'normal_tv',
  },
})

// 向分区卡共享 Basic 组表单状态（读写同一响应式对象；卡内保存也基于它）
provide('collectSettingsBasic', CollectSettings.value.Basic)

const youkuDownloadLineOptions = computed(() => [
  { title: t('setting.collect.youkuLineNormalTv'), value: 'normal_tv' },
  { title: t('setting.collect.youkuLineAndroid'), value: 'android' },
  { title: t('setting.collect.youkuLineFrameEnjoy'), value: 'frame_enjoy_cinema' },
])

const tencentFetchLineOptions = computed(() => [
  { title: t('setting.collect.tencentLineNormalTv'), value: 'normal_tv' },
  { title: t('setting.collect.tencentLinePhone'), value: 'phone' },
  { title: t('setting.collect.tencentLineAuto'), value: 'auto' },
])

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
    if (result && result.value) tencentCookie.value = result.value
  } catch (error) {
    console.log(error)
  }
}
async function queryTvAppTicket() {
  try {
    const result: { [key: string]: any } = await api.get('system/setting/MgTvTicket')
    if (result && result.value) mgTvTicket.value = result.value
  } catch (error) {
    console.log(error)
  }
}
// 查询已设置的芒果App端Ticket
async function queryMgAppTicket() {
  try {
    const result: { [key: string]: any } = await api.get('system/setting/MgAppTicket')
    if (result && result.value) mgAppTicket.value = result.value
  } catch (error) {
    console.log(error)
  }
}

// 查询已设置的爱奇艺Cookie
async function queryIqiyiCookie() {
  try {
    const result: { [key: string]: any } = await api.get('system/setting/IQiyiCookie')
    if (result && result.value) iqiyiCookie.value = result.value
  } catch (error) {
    console.log(error)
  }
}

// 查询已设置的优酷Cookie
async function queryYoukuCookie() {
  try {
    const result: { [key: string]: any } = await api.get('system/setting/YoukuCookie')
    if (result && result.value) youkuCookie.value = result.value
  } catch (error) {
    console.log(error)
  }
}
async function queryYoukuStoken() {
  try {
    const result: { [key: string]: any } = await api.get('system/setting/YoukuStoken')
    if (result && result.value) youkuStoken.value = result.value
  } catch (error) {
    console.log(error)
  }
}

// 查询已设置的哔哩哔哩Cookie
async function queryBilibiliCookie() {
  try {
    const result: { [key: string]: any } = await api.get('system/setting/BilibiliCookie')
    if (result && result.value) bilibiliCookie.value = result.value
  } catch (error) {
    console.log(error)
  }
}

// 保存用户设置的腾讯视频Cookie
async function saveTencentCookie() {
  try {
    await api.post('system/setting/TencentCookie', tencentCookie.value)
    $toast.success(t('setting.collect.cookieSaveSuccess', { name: t('setting.collect.tencentCookie') }))
  } catch (error) {
    console.log(error)
    $toast.error(t('setting.collect.cookieSaveFailed', { name: t('setting.collect.tencentCookie') }))
  }
}
async function saveMgTvTicket() {
  try {
    await api.post('system/setting/MgTvTicket', mgTvTicket.value)
    $toast.success(t('setting.collect.cookieSaveSuccess', { name: t('setting.collect.mgTvTicket') }))
  } catch (error) {
    console.log(error)
    $toast.error(t('setting.collect.cookieSaveFailed', { name: t('setting.collect.mgTvTicket') }))
  }
}

async function saveMgAppTicket() {
  try {
    await api.post('system/setting/MgAppTicket', mgAppTicket.value)
    $toast.success(t('setting.collect.cookieSaveSuccess', { name: t('setting.collect.mgAppTicket') }))
  } catch (error) {
    console.log(error)
    $toast.error(t('setting.collect.cookieSaveFailed', { name: t('setting.collect.mgAppTicket') }))
  }
}

// 保存用户设置的爱奇艺Cookie
async function saveIqiyiCookie() {
  try {
    await api.post('system/setting/IQiyiCookie', iqiyiCookie.value)
    $toast.success(t('setting.collect.cookieSaveSuccess', { name: t('setting.collect.iqiyiCookie') }))
  } catch (error) {
    console.log(error)
    $toast.error(t('setting.collect.cookieSaveFailed', { name: t('setting.collect.iqiyiCookie') }))
  }
}

// 保存用户设置的优酷Cookie
async function saveYoukuCookie() {
  try {
    await api.post('system/setting/YoukuCookie', youkuCookie.value)
    $toast.success(t('setting.collect.cookieSaveSuccess', { name: t('setting.collect.youkuCookie') }))
  } catch (error) {
    console.log(error)
    $toast.error(t('setting.collect.cookieSaveFailed', { name: t('setting.collect.youkuCookie') }))
  }
}
// 保存用户设置的优酷Stoken
async function saveYoukuStoken() {
  try {
    await api.post('system/setting/YoukuStoken', youkuStoken.value)
    $toast.success(t('setting.collect.cookieSaveSuccess', { name: t('setting.collect.youkuStoken') }))
  } catch (error) {
    console.log(error)
    $toast.error(t('setting.collect.cookieSaveFailed', { name: t('setting.collect.youkuStoken') }))
  }
}
// 保存用户设置的哔哩哔哩Cookie
async function saveBilibiliCookie() {
  try {
    await api.post('system/setting/BilibiliCookie', bilibiliCookie.value)
    $toast.success(t('setting.collect.cookieSaveSuccess', { name: t('setting.collect.bilibiliCookie') }))
  } catch (error) {
    console.log(error)
    $toast.error(t('setting.collect.cookieSaveFailed', { name: t('setting.collect.bilibiliCookie') }))
  }
}

// 加载系统设置
async function loadSystemSettings() {
  try {
    const result: { [key: string]: any } = await api.get('system/env')
    // 将API返回的值赋值给CollectSettings
    for (const sectionKey of Object.keys(CollectSettings.value) as Array<keyof typeof CollectSettings.value>) {
      Object.keys(CollectSettings.value[sectionKey]).forEach((key: string) => {
        if (result.hasOwnProperty(key)) (CollectSettings.value[sectionKey] as any)[key] = result[key]
      })
    }
  } catch (error) {
    console.log(error)
  }
}

// 调用API保存设置
async function saveSystemSetting(value: { [key: string]: any }) {
  try {
    await api.post('system/env', value)
    return true
  } catch (error) {
    console.log(error)
  }
  return false
}

// 保存优酷下载线路设置
async function saveYoukuDownloadLineSettings() {
  if (await saveSystemSetting(CollectSettings.value.Youku)) {
    $toast.success(t('setting.collect.youkuDownloadLineSaveSuccess'))
  }
}

async function saveTencentFetchLineSettings() {
  if (await saveSystemSetting(CollectSettings.value.Tencent)) {
    $toast.success(t('setting.collect.tencentFetchLineSaveSuccess'))
  }
}

// 加载数据（分区卡的自身加载在各自组件 onMounted 内完成）
onMounted(() => {
  queryTencentCookie()
  queryTvAppTicket()
  queryMgAppTicket()
  queryIqiyiCookie()
  queryYoukuCookie()
  queryYoukuStoken()
  queryBilibiliCookie()
  loadSystemSettings()
})
</script>

<template>
  <!-- 页内锚点导航：与顶部 HeaderTab 同视觉语言的文字标签（吸顶，长页免滚动找卡） -->
  <nav class="collect-anchor-bar">
    <button
      v-for="anchor in collectSectionAnchors"
      :key="anchor.id"
      type="button"
      class="collect-anchor-tab"
      @click="scrollToCollectSection(anchor.id)"
    >
      {{ t(`setting.collect.${anchor.labelKey}`) }}
    </button>
  </nav>

  <VRow>
    <VCol cols="12">
      <CollectBasicCard :basic="CollectSettings.Basic" />
    </VCol>
  </VRow>

  <!-- 命名格式模板 -->
  <VRow>
    <VCol cols="12">
      <CollectNamingCard :basic="CollectSettings.Basic" />
    </VCol>
  </VRow>

  <!-- 截图模板配置 -->
  <VRow>
    <VCol cols="12">
      <CollectScreenshotCard :basic="CollectSettings.Basic" />
    </VCol>
  </VRow>

  <!-- 图床设置 -->
  <VRow>
    <VCol cols="12">
      <CollectImageHostingCard />
    </VCol>
  </VRow>

  <!-- 简介抓取线路 -->
  <VRow>
    <VCol cols="12">
      <CollectPtgenCard />
    </VCol>
  </VRow>

  <!-- 站点模板 -->
  <VRow>
    <VCol cols="12">
      <CollectSiteSchemaCard />
    </VCol>
  </VRow>

  <VRow>
    <VCol cols="12">
      <VCard id="collect-accounts">
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
          <VCardTitle> {{ t('setting.collect.mgTvTicket') }}</VCardTitle>
          <VCardSubtitle>{{ t('setting.collect.mgTvTicketHint') }} </VCardSubtitle>
        </VCardItem>
        <VCardText>
          <VTextarea
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
          <VTextarea
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
          <VCardTitle>{{ t('setting.collect.tencentFetchLine') }}</VCardTitle>
          <VCardSubtitle>{{ t('setting.collect.tencentFetchLineHint') }}</VCardSubtitle>
        </VCardItem>
        <VCardText>
          <VSelect
            v-model="CollectSettings.Tencent.TENCENT_FETCH_LINE"
            :items="tencentFetchLineOptions"
            item-title="title"
            item-value="value"
            :label="t('setting.collect.tencentFetchLine')"
            :hint="t('setting.collect.tencentFetchLineHint')"
            persistent-hint
            prepend-inner-icon="mdi-routes"
          />
        </VCardText>
        <VCardText>
          <VForm @submit.prevent="() => {}">
            <div class="d-flex flex-wrap gap-4 mt-4">
              <VBtn type="submit" @click="saveTencentFetchLineSettings"> {{ t('common.save') }} </VBtn>
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
      <CollectTeamCard />
    </VCol>
  </VRow>
</template>

<style scoped>
/* 锚点目标：跳转时给吸顶锚点条留出高度（id 落在各分区卡的根 VCard 上） */
#collect-basic,
#collect-naming,
#collect-screenshot,
#collect-imagehosting,
#collect-ptgen,
#collect-siteschema,
#collect-accounts,
#collect-teams {
  scroll-margin-top: 8.5rem;
}

/* 页内锚点导航：吸在设定页顶部 tab 栏之下，视觉对齐 HeaderTab（圆角文字标签 + 悬停底色） */
.collect-anchor-bar {
  position: sticky;
  top: 6.9rem;
  z-index: 3;
  display: flex;
  gap: 0.75rem;
  padding: 0.35rem 0.25rem 0.55rem;
  overflow-x: auto;
  scrollbar-width: none;
  /* 滚动时内容透出，用主题表面色渐隐保证吸顶时可读 */
  background: linear-gradient(to bottom, rgb(var(--v-theme-surface)) 78%, transparent);
}

.collect-anchor-bar::-webkit-scrollbar {
  display: none;
}

.collect-anchor-tab {
  position: relative;
  flex-shrink: 0;
  border-radius: 1.25rem;
  color: rgba(var(--v-theme-on-surface), 0.7);
  cursor: pointer;
  font-size: 0.8rem;
  font-weight: 600;
  line-height: 1.2;
  padding-block: 0.35rem;
  padding-inline: 0.85rem;
  white-space: nowrap;
  transition: color 0.2s ease, background-color 0.2s ease;
}

.collect-anchor-tab:hover {
  background-color: rgba(var(--v-theme-primary), 0.05);
  color: rgba(var(--v-theme-on-surface), 1);
}

.collect-anchor-tab:active {
  color: rgb(var(--v-theme-primary));
}
</style>
