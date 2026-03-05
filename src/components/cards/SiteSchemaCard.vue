<script setup lang="ts">
import noImage from '@images/logos/site.webp'
import { MediaServerConf, MediaServerLibrary, Site } from '@/api/types'
import { useToast } from 'vue-toastification'
import emby_image from '@images/logos/emby.png'
import jellyfin_image from '@images/logos/jellyfin.png'
import plex_image from '@images/logos/plex.png'
import trimemedia_image from '@images/logos/trimemedia.png'
import custom_image from '@images/logos/mediaserver.png'
import SiteSchemaEditDialog from '@/components/dialog/SiteSchemaEditDialog.vue'
import api from '@/api'
import { cloneDeep } from 'lodash-es'
import { useI18n } from 'vue-i18n'
import { mediaServerDict } from '@/api/constants'
import { useDisplay } from 'vuetify'

// 显示器宽度
const display = useDisplay()

// 获取i18n实例
const { t } = useI18n()

// 定义输入
const cardProps = defineProps({
  // 单个站点
  site: {
    type: Object as PropType<Site>,
    required: true,
  }
})

// 提示框
const $toast = useToast()
// 图标
const siteIcon = ref<string>('')
// 定义触发的自定义事件
const emit = defineEmits(['close', 'done', 'change'])

// 媒体统计数据
const infoItems = ref([
  {
    avatar: 'mdi-movie-roll',
    title: t('mediaType.movie'),
    amount: '0',
  },
  {
    avatar: 'mdi-television-box',
    title: t('mediaType.tv'),
    amount: '0',
  },
  {
    avatar: 'mdi-account',
    title: t('common.user'),
    amount: '0',
  },
])

// 同步媒体库选项
const librariesOptions = ref<{ title: string; value: string | undefined }[]>([
  {
    title: t('common.all'),
    value: 'all',
  },
])

// 媒体服务器详情弹窗
const mediaServerInfoDialog = ref(false)

// 媒体服务器详情
const mediaServerInfo = ref<MediaServerConf>({
  name: '',
  type: '',
  enabled: false,
  config: {},
})
// 查询站点图标
async function getSiteIcon() {
  try {
    siteIcon.value = (await api.get(`site/icon/${cardProps.site?.id}`)).data.icon
    if (!siteIcon.value) {
      siteIcon.value = noImage
    }
  } catch (error) {
    console.error(error)
  }
}
// 打开详情弹窗
function openMediaServerInfoDialog() {

  mediaServerInfoDialog.value = true

}

// 保存详情数据
function saveMediaServerInfo() {
  // 为空不保存，跳出警告框

  // 执行保存
  mediaServerInfoDialog.value = false
  emit('done')
}


// 按钮点击
function onClose() {
  emit('close')
}

onMounted(() => {
  getSiteIcon()
})
</script>
<template>
  <div>
    <VCard variant="tonal" @click="openMediaServerInfoDialog">
      <VCardText class="flex justify-space-between align-center gap-3">
        <div class="align-self-start flex-1">
          <div class="text-h6 mb-1">{{ site.name }}</div>
          <div class="text-sm mt-5 flex flex-wrap">
            <span class="me-2 mb-1">{{ site.domain }}</span>
          </div>
        </div>
        <VImg :src="siteIcon" cover rounded="lg" class="mt-7 me-3" max-width="3rem" min-width="3rem" />
      </VCardText>
    </VCard>
    <!-- 新增站点弹窗 -->
    <SiteSchemaEditDialog v-if="mediaServerInfoDialog" v-model="mediaServerInfoDialog" :site="site" oper="edit"
      @save="saveMediaServerInfo" @close="mediaServerInfoDialog = false" />

  </div>
</template>
