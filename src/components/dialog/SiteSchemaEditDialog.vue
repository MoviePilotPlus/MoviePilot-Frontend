<script lang="ts" setup>
import { useToast } from 'vue-toastification'
import type { Site } from '@/api/types'
import { doneNProgress, startNProgress } from '@/api/nprogress'
import { numberValidator, requiredValidator } from '@/@validators'
import api from '@/api'
import { useDisplay } from 'vuetify'
import { useI18n } from 'vue-i18n'
import { categoryOptions, tagOptions } from '@/api/constants'
import { ref, computed, onMounted } from 'vue'

interface SiteSchema {
  id: number
  name: string
  domain: string
  download_page: string
  upload_page: string
  upload_api: string
  update_api: string
  tracker_api: string
  detail_page: string
  is_https: boolean
  cookie_required: boolean
  template: string
}

// 国际化
const { t } = useI18n()

// 显示器宽度
const display = useDisplay()

// 输入参数
const props = defineProps({
  site: {
    type: Object as () => Site,
    required: true,
  },
})
const oper = computed(() => (siteForm.value?.id ? 'edit' : 'add'))

// 注册事件
const emit = defineEmits(['save', 'remove', 'close'])

// 站点编辑表单数据
const siteForm = ref<SiteSchema>({
  id: 0,
  name: '',
  domain: '',
  download_page: '',
  upload_page: '',
  upload_api: '',
  update_api: '',
  tracker_api: '',
  detail_page: '',
  is_https: true,
  cookie_required: true,
  template: '{}',
})

// 团队数据类型定义
interface TeamOption {
  team: string
  copyright: string
  default: boolean
  order: number
}

// 模板数据类型定义
interface TemplateDataType {
  type: Record<string, string>
  source: Record<string, string>
  resolution: Record<string, string>
  video_codec: Record<string, string>
  audio_codec: Record<string, string>
  area: Record<string, string>
  team: Record<string, string>
  tags: Record<string, string>
}

// 团队数据
const teamOptions = ref<TeamOption[]>([])

// 解析模板数据
const templateData = ref<TemplateDataType>({
  type: {
    Movie: '',
    TV: '',
    Documentary: '',
    Comic: '',
    Show: '',
    Music: '',
    Sports: '',
    Game: '',
    Short: '',
    Other: '',
  },
  source: {
    UHD_BLURAY: '',
    BLURAY: '',
    THREE_D_BLURAY: '',
    REMUX: '',
    ENCODE: '',
    TRACK: '',
    WEB_DL: '',
    CD: '',
    DVDR: '',
    HDTV: '',
    MINIBD: '',
    HD_DVD: '',
    SACD: '',
  },
  resolution: {
    UHD: '',
    SHD: '',
    FHD: '',
    HD: '',
    SD: '',
  },
  video_codec: {
    H265: '',
    H264: '',
    VP8: '',
    VP9: '',
    VC1: '',
    AV1: '',
    XVID: '',
    MPEG2: '',
    MPEG4: '',
    OTHER: '',
  },
  audio_codec: {
    DTS_HDMAX: '',
    DTS_HDMA: '',
    DTS_HDHR: '',
    DTS_HD: '',
    DTS_X: '',
    DTS: '',
    LPCM: '',
    DDP: '',
    DD: '',
    ATMOS: '',
    AAC: '',
    AV3A: '',
    TrueHD: '',
    FLAC: '',
    APE: '',
    MP3: '',
    WAV: '',
    OPUS: '',
    OGG: '',
    MP2: '',
    OTHER: '',
  },
  area: {
    // 中国大陆
    CHN: '',
    // 美国
    US: '',
    // 英国
    GB: '',
    // 德国
    DE: '',
    // 法国
    FR: '',
    // 西班牙
    ES: '',
    // 意大利
    IT: '',
    // 中国香港
    HK: '',
    // 中国澳门
    MO: '',
    // 中国台湾
    TW: '',
    // 日本
    JPN: '',
    // 韩国
    KOR: '',
    // 印度
    IND: '',
    //马来西亚
    MYS: '',
    //缅甸
    MMR: '',
    //菲律宾
    PHL: '',
    //新加坡
    SGP: '',
    //泰国
    THA: '',
    //越南
    VNM: '',
    // 其它
    OTHER: '',
  },
  team: {},
  tags: {
    Children: '',
    Comedy: '',
    Official: '',
    Mandarin: '',
    Cantonese: '',
    ChineseSubtitles: '',
    DolbyVision: '',
    HDRVivid: '',
    HDR10_PLUS: '',
    HDR10: '',
    Completed: '',
    Original: '',
    HighBitrateHighFrameRate: '',
    ThreeD: '',
    Collection: '',
  },
})

// 更新模板数据到表单
function updateTemplateForm() {
  try {
    const templateStr = siteForm.value.template || '{}'
    const parsed = JSON.parse(templateStr) as Record<string, any>

    // 确保parsed是对象类型
    if (typeof parsed !== 'object' || parsed === null) return

    // 安全地更新每个类别的数据
    const categories: (keyof TemplateDataType)[] = [
      'type',
      'source',
      'resolution',
      'video_codec',
      'audio_codec',
      'area',
      'team',
      'tags',
    ]

    categories.forEach(category => {
      if (parsed[category] && typeof parsed[category] === 'object') {
        const categoryData = parsed[category] as Record<string, any>
        const templateCategory = templateData.value[category] as Record<string, string>

        if (templateCategory && typeof templateCategory === 'object') {
          Object.keys(templateCategory).forEach(key => {
            if (categoryData[key] !== undefined) {
              templateCategory[key] = String(categoryData[key])
            }
          })
        }
      }
    })
  } catch (error) {
    console.error('解析模板数据失败:', error)
  }
}

// 获取团队数据
async function fetchTeamData() {
  try {
    const response = await api.get('system/setting/TEAM_PARAMS')
    console.log('团队数据API响应:', response)
    // 安全地访问响应数据
    if (response && response.data && typeof response.data === 'object') {
      const responseData = response.data as { success?: boolean; value?: TeamOption[] }
      console.log('团队数据解析结果:', responseData)
      // 根据API实际返回格式调整检查逻辑
      if (responseData && Array.isArray(responseData.value)) {
        teamOptions.value = responseData.value
        console.log('团队数据已设置:', teamOptions.value)
        // 初始化team对象
        templateData.value.team = {}
        teamOptions.value.forEach(team => {
          if (team && team.team) {
            templateData.value.team[team.team] = ''
            console.log('初始化团队:', team.team)
          }
        })
        // 重新更新模板数据
        updateTemplateForm()
      } else {
        console.warn('团队数据格式不正确或为空:', responseData)
      }
    } else {
      console.warn('团队数据响应格式不正确:', response)
    }
  } catch (error) {
    console.error('获取团队数据失败:', error)
    teamOptions.value = []
  }
}

// 提示框
const $toast = useToast()
// 查询站点信息
async function fetchSiteInfo() {
  try {
    const response = await api.get(`siteschema/${props.site.domain}`)
    console.log('获取站点信息响应:', response)
    // 安全地访问和处理API响应
    if (response) {
      const apiData = response as Partial<SiteSchema>
      // 逐个属性赋值以确保类型安全
      siteForm.value.id = apiData.id || 0
      siteForm.value.name = apiData.name || ''
      siteForm.value.domain = apiData.domain || ''
      siteForm.value.download_page = apiData.download_page || ''
      siteForm.value.upload_page = apiData.upload_page || ''
      siteForm.value.upload_api = apiData.upload_api || ''
      siteForm.value.update_api = apiData.update_api || ''
      siteForm.value.tracker_api = apiData.tracker_api || ''
      siteForm.value.detail_page = apiData.detail_page || ''
      siteForm.value.is_https = apiData.is_https !== undefined ? apiData.is_https : true
      siteForm.value.cookie_required = apiData.cookie_required !== undefined ? apiData.cookie_required : true

      // 确保template是字符串格式
      if (typeof apiData.template === 'object' && apiData.template !== null) {
        siteForm.value.template = JSON.stringify(apiData.template)
      } else if (typeof apiData.template === 'string') {
        siteForm.value.template = apiData.template
      } else {
        siteForm.value.template = '{}'
      }

      updateTemplateForm()
    }
  } catch (error) {
    console.error('获取站点信息失败:', error)
  }
}

// 调用API 新增站点
async function addSite() {
  startNProgress()
  try {
    // 将对象转换为JSON字符串，移除id字段（新增场景不需要id）
    const { id, ...siteFormWithoutId } = siteForm.value
    const formData = { ...siteFormWithoutId, template: templateData.value }
    const result = await api.post('siteschema/', formData)
    console.log('添加站点result:', result)
    // 安全地处理API响应
    if (result && typeof result === 'object') {
      const resultData = result as { success?: boolean; message?: string }
      console.log('添加站点响应:', resultData)
      if (resultData.success) {
        $toast.success(t('siteshema.messages.addSuccess'))
        emit('save')
      } else {
        $toast.error(`${t('siteshema.messages.addFailed')}：${resultData.message || '未知错误'}`)
      }
    }
  } catch (error) {
    console.error('添加站点失败:', error)
    $toast.error(t('siteshema.messages.addFailed'))
  } finally {
    doneNProgress()
  }
}

// 调用API更新站点信息
async function updateSiteInfo() {
  startNProgress()
  try {
    const formData = { ...siteForm.value, template: templateData.value }
    const result: { [key: string]: string } = await api.put('siteschema/', formData)
    if (result.success) {
      $toast.success(`${siteForm.value?.name || ''} ${t('siteshema.messages.updateSuccess')}`)
      emit('save')
    } else {
      $toast.error(
        `${siteForm.value?.name || ''} ${t('siteshema.messages.updateFailed')}：${result.message || '未知错误'}`,
      )
    }
  } catch (error) {
    $toast.error(`${siteForm.value?.name || ''} ${t('siteshema.messages.updateFailed')}！`)
    console.error('更新站点信息失败:', error)
  } finally {
    doneNProgress()
  }
}

onMounted(async () => {
  try {
    await fetchTeamData()
    await fetchSiteInfo()
  } catch (error) {
    console.error('初始化数据失败:', error)
  }
})
</script>

<template>
  <VDialog scrollable :close-on-back="false" eager max-width="45rem" :fullscreen="!display.mdAndUp.value">
    <VCard>
      <VCardItem class="py-2">
        <template #prepend>
          <VIcon :icon="oper == 'add' ? 'mdi-web-plus' : 'mdi-web'" class="me-2" />
        </template>
        <VCardTitle>{{ `${oper === 'add' ? t('siteshema.actions.add') : t('siteshema.actions.edit')}` }}</VCardTitle>
        <VCardSubtitle>{{ siteForm.name }}</VCardSubtitle>
      </VCardItem>
      <VDialogCloseBtn @click="emit('close')" />
      <VDivider />
      <VCardText>
        <VForm @submit.prevent="() => {}">
          <VRow>
            <VCol cols="12" md="6">
              <VTextField
                v-model="siteForm.name"
                :label="t('siteshema.fields.name')"
                :rules="[requiredValidator]"
                :hint="t('siteshema.hints.name')"
                persistent-hint
                prepend-inner-icon="mdi-account"
              />
            </VCol>
            <VCol cols="6" md="3">
              <VSwitch v-model="siteForm.cookie_required" :label="t('siteshema.fields.cookie_required')" />
            </VCol>
            <VCol cols="6" md="3">
              <VSwitch v-model="siteForm.is_https" :label="t('siteshema.fields.is_https')" />
            </VCol>
          </VRow>
          <VRow>
            <VCol cols="12" md="6">
              <VTextField
                v-model="siteForm.domain"
                :label="t('siteshema.fields.domain')"
                :hint="t('siteshema.hints.domain')"
                persistent-hint
                prepend-inner-icon="mdi-web"
              />
            </VCol>
            <VCol cols="12" md="6">
              <VTextField
                v-model="siteForm.upload_api"
                :label="t('siteshema.fields.upload_api')"
                :hint="t('siteshema.hints.upload_api')"
                persistent-hint
                prepend-inner-icon="mdi-upload"
              />
            </VCol>
          </VRow>
          <VRow>
            <VCol cols="12" md="6">
              <VTextField
                v-model="siteForm.update_api"
                :label="t('siteshema.fields.update_api')"
                :hint="t('siteshema.hints.update_api')"
                persistent-hint
                prepend-inner-icon="mdi-pencil-box-outline"
              />
            </VCol>
            <VCol cols="12" md="6">
              <VTextField
                v-model="siteForm.download_page"
                :label="t('siteshema.fields.download_page')"
                :hint="t('siteshema.hints.download_page')"
                persistent-hint
                prepend-inner-icon="mdi-download"
              />
            </VCol>
          </VRow>
          <VRow>
            <VCol cols="12" md="6">
              <VTextField
                v-model="siteForm.detail_page"
                :label="t('siteshema.fields.detail_page')"
                :hint="t('siteshema.hints.detail_page')"
                persistent-hint
                prepend-inner-icon="mdi-information-variant"
              />
            </VCol>
            <VCol cols="12" md="6">
              <VTextField
                v-model="siteForm.tracker_api"
                :label="t('siteshema.fields.tracker_api')"
                :hint="t('siteshema.hints.tracker_api')"
                persistent-hint
                prepend-inner-icon="mdi-incognito"
              />
            </VCol>
          </VRow>
          <!-- 可视化模板编辑器 -->
          <VDivider class="my-4" />
          <VRow>
            <VCol cols="12">
              <VSubheader class="text-h6 font-bold">{{ t('siteshema.fields.template') }}</VSubheader>
              <p class="text-sm text-gray-500 mb-4">{{ t('siteshema.hints.template') }}</p>
            </VCol>
          </VRow>

          <!-- 类型配置 -->
          <VRow>
            <VCol cols="12">
              <VCard class="mb-4">
                <VCardTitle class="text-lg font-medium">类型配置</VCardTitle>
                <VCardText>
                  <VRow>
                    <VCol
                      v-for="key in Object.keys(categoryOptions)"
                      :key="`type-${key}`"
                      cols="12"
                      sm="6"
                      md="4"
                      lg="3"
                    >
                      <VTextField
                        v-model="templateData.type[key]"
                        :label="(categoryOptions as Record<string, string>)[key]"
                        type="text"
                        :hint="key"
                        persistent-hint
                      />
                    </VCol>
                  </VRow>
                </VCardText>
              </VCard>
            </VCol>
          </VRow>

          <!-- 来源配置 -->
          <VRow>
            <VCol cols="12">
              <VCard class="mb-4">
                <VCardTitle class="text-lg font-medium">来源配置</VCardTitle>
                <VCardText>
                  <VRow>
                    <VCol cols="12" sm="6" md="4" lg="3">
                      <VTextField v-model="templateData.source.UHD_BLURAY" label="UHD蓝光" type="text" />
                    </VCol>
                    <VCol cols="12" sm="6" md="4" lg="3">
                      <VTextField v-model="templateData.source.BLURAY" label="蓝光" type="text" />
                    </VCol>
                    <VCol cols="12" sm="6" md="4" lg="3">
                      <VTextField v-model="templateData.source.THREE_D_BLURAY" label="3D蓝光" type="text" />
                    </VCol>
                    <VCol cols="12" sm="6" md="4" lg="3">
                      <VTextField v-model="templateData.source.REMUX" label="REMUX" type="text" />
                    </VCol>
                    <VCol cols="12" sm="6" md="4" lg="3">
                      <VTextField v-model="templateData.source.ENCODE" label="ENCODE" type="text" />
                    </VCol>
                    <VCol cols="12" sm="6" md="4" lg="3">
                      <VTextField v-model="templateData.source.TRACK" label="TRACK" type="text" />
                    </VCol>
                    <VCol cols="12" sm="6" md="4" lg="3">
                      <VTextField v-model="templateData.source.WEB_DL" label="WEB-DL" type="text" />
                    </VCol>
                    <VCol cols="12" sm="6" md="4" lg="3">
                      <VTextField v-model="templateData.source.CD" label="CD" type="text" />
                    </VCol>
                    <VCol cols="12" sm="6" md="4" lg="3">
                      <VTextField v-model="templateData.source.DVDR" label="DVD" type="text" />
                    </VCol>
                    <VCol cols="12" sm="6" md="4" lg="3">
                      <VTextField v-model="templateData.source.HDTV" label="HDTV" type="text" />
                    </VCol>
                    <VCol cols="12" sm="6" md="4" lg="3">
                      <VTextField v-model="templateData.source.MINIBD" label="MINIBD" type="text" />
                    </VCol>
                    <VCol cols="12" sm="6" md="4" lg="3">
                      <VTextField v-model="templateData.source.HD_DVD" label="HD DVD" type="text" />
                    </VCol>
                    <VCol cols="12" sm="6" md="4" lg="3">
                      <VTextField v-model="templateData.source.SACD" label="SACD" type="text" />
                    </VCol>
                  </VRow>
                </VCardText>
              </VCard>
            </VCol>
          </VRow>

          <!-- 分辨率配置 -->
          <VRow>
            <VCol cols="12">
              <VCard class="mb-4">
                <VCardTitle class="text-lg font-medium">分辨率配置</VCardTitle>
                <VCardText>
                  <VRow>
                    <VCol cols="12" sm="6" md="4" lg="3">
                      <VTextField v-model="templateData.resolution.UHD" label="8K (UHD)" type="text" />
                    </VCol>
                    <VCol cols="12" sm="6" md="4" lg="3">
                      <VTextField v-model="templateData.resolution.SHD" label="4K (SHD)" type="text" />
                    </VCol>
                    <VCol cols="12" sm="6" md="4" lg="3">
                      <VTextField v-model="templateData.resolution.FHD" label="1080p (FHD)" type="text" />
                    </VCol>
                    <VCol cols="12" sm="6" md="4" lg="3">
                      <VTextField v-model="templateData.resolution.HD" label="720p (HD)" type="text" />
                    </VCol>
                    <VCol cols="12" sm="6" md="4" lg="3">
                      <VTextField v-model="templateData.resolution.SD" label="标清 (SD)" type="text" />
                    </VCol>
                  </VRow>
                </VCardText>
              </VCard>
            </VCol>
          </VRow>

          <!-- 视频编码配置 -->
          <VRow>
            <VCol cols="12">
              <VCard class="mb-4">
                <VCardTitle class="text-lg font-medium">视频编码配置</VCardTitle>
                <VCardText>
                  <VRow>
                    <VCol cols="12" sm="6" md="4" lg="3">
                      <VTextField v-model="templateData.video_codec.H265" label="H.265/HEVC" type="text" />
                    </VCol>
                    <VCol cols="12" sm="6" md="4" lg="3">
                      <VTextField v-model="templateData.video_codec.H264" label="H.264/AVC" type="text" />
                    </VCol>
                    <VCol cols="12" sm="6" md="4" lg="3">
                      <VTextField v-model="templateData.video_codec.VP8" label="VP8" type="text" />
                    </VCol>
                    <VCol cols="12" sm="6" md="4" lg="3">
                      <VTextField v-model="templateData.video_codec.VP9" label="VP9" type="text" />
                    </VCol>
                    <VCol cols="12" sm="6" md="4" lg="3">
                      <VTextField v-model="templateData.video_codec.VC1" label="VC-1" type="text" />
                    </VCol>
                    <VCol cols="12" sm="6" md="4" lg="3">
                      <VTextField v-model="templateData.video_codec.AV1" label="AV1" type="text" />
                    </VCol>
                    <VCol cols="12" sm="6" md="4" lg="3">
                      <VTextField v-model="templateData.video_codec.XVID" label="XVID" type="text" />
                    </VCol>
                    <VCol cols="12" sm="6" md="4" lg="3">
                      <VTextField v-model="templateData.video_codec.MPEG2" label="MPEG-2" type="text" />
                    </VCol>
                    <VCol cols="12" sm="6" md="4" lg="3">
                      <VTextField v-model="templateData.video_codec.MPEG4" label="MPEG-4" type="text" />
                    </VCol>
                    <VCol cols="12" sm="6" md="4" lg="3">
                      <VTextField v-model="templateData.video_codec.OTHER" label="其他" type="text" />
                    </VCol>
                  </VRow>
                </VCardText>
              </VCard>
            </VCol>
          </VRow>

          <!-- 标签配置 -->
          <VRow>
            <VCol cols="12">
              <VCard class="mb-4">
                <VCardTitle class="text-lg font-medium">标签配置</VCardTitle>
                <VCardText>
                  <VRow>
                    <VCol
                      v-for="key in Object.keys(tagOptions)"
                      :key="`tag-${String(key)}`"
                      cols="12"
                      sm="6"
                      md="4"
                      lg="3"
                    >
                      <VTextField
                        v-model="templateData.tags[String(key)]"
                        :label="String((tagOptions as Record<string, string>)[key])"
                        type="text"
                        :hint="String(key)"
                        persistent-hint
                      />
                    </VCol>
                  </VRow>
                </VCardText>
              </VCard>
            </VCol>
          </VRow>

          <!-- 团队配置 -->
          <VRow>
            <VCol cols="12">
              <VCard class="mb-4">
                <VCardTitle class="text-lg font-medium">团队配置</VCardTitle>
                <VCardText>
                  <VRow>
                    <VCol
                      v-for="team in teamOptions"
                      :key="`team-${String(team?.team || 'unknown')}`"
                      cols="12"
                      sm="6"
                      md="4"
                      lg="3"
                    >
                      <VTextField
                        v-model="templateData.team[String(team?.team || '')]"
                        :label="String(team?.copyright || team?.team || '未知团队')"
                        type="text"
                        :hint="String(team?.team || '')"
                        persistent-hint
                      />
                    </VCol>
                  </VRow>
                </VCardText>
              </VCard>
            </VCol>
          </VRow>

          <!-- 地区配置 -->
          <VRow>
            <VCol cols="12">
              <VCard class="mb-4">
                <VCardTitle class="text-lg font-medium">地区配置</VCardTitle>
                <VCardText>
                  <VRow>
                    <VCol cols="12" sm="6" md="4" lg="3">
                      <VTextField v-model="templateData.area.CHN" label="中国大陆" type="text" />
                    </VCol>
                    <VCol cols="12" sm="6" md="4" lg="3">
                      <VTextField v-model="templateData.area.GB" label="英国" type="text" />
                    </VCol>
                    <VCol cols="12" sm="6" md="4" lg="3">
                      <VTextField v-model="templateData.area.DE" label="德国" type="text" />
                    </VCol>
                    <VCol cols="12" sm="6" md="4" lg="3">
                      <VTextField v-model="templateData.area.FR" label="法国" type="text" />
                    </VCol>
                    <VCol cols="12" sm="6" md="4" lg="3">
                      <VTextField v-model="templateData.area.ES" label="西班牙" type="text" />
                    </VCol>
                    <VCol cols="12" sm="6" md="4" lg="3">
                      <VTextField v-model="templateData.area.IT" label="意大利" type="text" />
                    </VCol>
                    <VCol cols="12" sm="6" md="4" lg="3">
                      <VTextField v-model="templateData.area.US" label="美国" type="text" />
                    </VCol>
                    <VCol cols="12" sm="6" md="4" lg="3">
                      <VTextField v-model="templateData.area.HK" label="中国香港" type="text" />
                    </VCol>
                    <VCol cols="12" sm="6" md="4" lg="3">
                      <VTextField v-model="templateData.area.MO" label="中国澳门" type="text" />
                    </VCol>
                    <VCol cols="12" sm="6" md="4" lg="3">
                      <VTextField v-model="templateData.area.TW" label="中国台湾" type="text" />
                    </VCol>
                    <VCol cols="12" sm="6" md="4" lg="3">
                      <VTextField v-model="templateData.area.JPN" label="日本" type="text" />
                    </VCol>
                    <VCol cols="12" sm="6" md="4" lg="3">
                      <VTextField v-model="templateData.area.KOR" label="韩国" type="text" />
                    </VCol>
                    <VCol cols="12" sm="6" md="4" lg="3">
                      <VTextField v-model="templateData.area.IND" label="印度" type="text" />
                    </VCol>
                    <VCol cols="12" sm="6" md="4" lg="3">
                      <VTextField v-model="templateData.area.MYS" label="马来西亚" type="text" />
                    </VCol>
                    <VCol cols="12" sm="6" md="4" lg="3">
                      <VTextField v-model="templateData.area.MMR" label="缅甸" type="text" />
                    </VCol>
                    <VCol cols="12" sm="6" md="4" lg="3">
                      <VTextField v-model="templateData.area.PHL" label="菲律宾" type="text" />
                    </VCol>
                    <VCol cols="12" sm="6" md="4" lg="3">
                      <VTextField v-model="templateData.area.SGP" label="新加坡" type="text" />
                    </VCol>
                    <VCol cols="12" sm="6" md="4" lg="3">
                      <VTextField v-model="templateData.area.THA" label="泰国" type="text" />
                    </VCol>
                    <VCol cols="12" sm="6" md="4" lg="3">
                      <VTextField v-model="templateData.area.VNM" label="越南" type="text" />
                    </VCol>
                    <VCol cols="12" sm="6" md="4" lg="3">
                      <VTextField v-model="templateData.area.OTHER" label="其他" type="text" />
                    </VCol>
                  </VRow>
                </VCardText>
              </VCard>
            </VCol>
          </VRow>

          <!-- 音频编码配置 -->
          <VRow>
            <VCol cols="12">
              <VCard class="mb-4">
                <VCardTitle class="text-lg font-medium">音频编码配置</VCardTitle>
                <VCardText>
                  <VRow>
                    <VCol cols="12" sm="6" md="4" lg="3">
                      <VTextField
                        v-model="templateData.audio_codec.DTS_HDMAX"
                        label="DTS-HD Master Audio"
                        type="text"
                      />
                    </VCol>
                    <VCol cols="12" sm="6" md="4" lg="3">
                      <VTextField v-model="templateData.audio_codec.DTS_HDMA" label="DTS-HD MA" type="text" />
                    </VCol>
                    <VCol cols="12" sm="6" md="4" lg="3">
                      <VTextField v-model="templateData.audio_codec.DTS_HDHR" label="DTS-HD HR" type="text" />
                    </VCol>
                    <VCol cols="12" sm="6" md="4" lg="3">
                      <VTextField v-model="templateData.audio_codec.DTS_X" label="DTS:X" type="text" />
                    </VCol>
                    <VCol cols="12" sm="6" md="4" lg="3">
                      <VTextField v-model="templateData.audio_codec.DTS" label="DTS" type="text" />
                    </VCol>
                    <VCol cols="12" sm="6" md="4" lg="3">
                      <VTextField v-model="templateData.audio_codec.LPCM" label="LPCM" type="text" />
                    </VCol>
                    <VCol cols="12" sm="6" md="4" lg="3">
                      <VTextField v-model="templateData.audio_codec.DDP" label="Dolby Digital Plus" type="text" />
                    </VCol>
                    <VCol cols="12" sm="6" md="4" lg="3">
                      <VTextField v-model="templateData.audio_codec.DD" label="Dolby Digital" type="text" />
                    </VCol>
                    <VCol cols="12" sm="6" md="4" lg="3">
                      <VTextField v-model="templateData.audio_codec.ATMOS" label="Dolby Atmos" type="text" />
                    </VCol>
                    <VCol cols="12" sm="6" md="4" lg="3">
                      <VTextField v-model="templateData.audio_codec.AAC" label="AAC" type="text" />
                    </VCol>
                    <VCol cols="12" sm="6" md="4" lg="3">
                      <VTextField v-model="templateData.audio_codec.TrueHD" label="TrueHD" type="text" />
                    </VCol>
                    <VCol cols="12" sm="6" md="4" lg="3">
                      <VTextField v-model="templateData.audio_codec.FLAC" label="FLAC" type="text" />
                    </VCol>
                    <VCol cols="12" sm="6" md="4" lg="3">
                      <VTextField v-model="templateData.audio_codec.APE" label="APE" type="text" />
                    </VCol>
                    <VCol cols="12" sm="6" md="4" lg="3">
                      <VTextField v-model="templateData.audio_codec.MP3" label="MP3" type="text" />
                    </VCol>
                    <VCol cols="12" sm="6" md="4" lg="3">
                      <VTextField v-model="templateData.audio_codec.WAV" label="WAV" type="text" />
                    </VCol>
                  </VRow>
                </VCardText>
              </VCard>
            </VCol>
          </VRow>
        </VForm>
      </VCardText>
      <VCardActions class="pt-3">
        <VSpacer />
        <VBtn v-if="oper === 'add'" color="primary" @click="addSite" prepend-icon="mdi-plus" class="px-5">
          {{ t('siteshema.actions.add') }}
        </VBtn>
        <VBtn v-else color="primary" @click="updateSiteInfo" prepend-icon="mdi-content-save" class="px-5">
          {{ t('common.save') }}
        </VBtn>
      </VCardActions>
    </VCard>
  </VDialog>
</template>
