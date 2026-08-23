<script setup lang="ts">
// @ts-nocheck
import noImage from '@images/logos/site.webp'
import { Site } from '@/api/types'
import { useToast } from 'vue-toastification'
import SiteSchemaEditDialog from '@/components/dialog/SiteSchemaEditDialog.vue'
import api from '@/api'
import { useI18n } from 'vue-i18n'
import { useDisplay } from 'vuetify'
import { getCachedSiteIcon } from '@/utils/siteIconCache'
import { getDisplayImageUrl } from '@/utils/imageUtils'

// 获取i18n实例
const { t } = useI18n()

// 定义输入
const cardProps = defineProps({
  // 单个站点
  site: {
    type: Object as PropType<Site>,
    required: true,
  },
})

// 图标
const siteIcon = ref<string>('')
// 定义触发的自定义事件
const emit = defineEmits(['close', 'done', 'change'])

// 媒体服务器详情弹窗
const siteSchemeInfoDialog = ref(false)
// 查询站点图标（默认 api 自动拆信封，响应即 data；与 SiteCard 同范式走缓存）
async function getSiteIcon() {
  const siteId = cardProps.site?.id
  if (!siteId) {
    siteIcon.value = noImage
    return
  }
  try {
    const icon = await getCachedSiteIcon(siteId, async () => {
      const response = await api.get<{ icon?: string }>(`site/icon/${siteId}`)
      return response?.icon || noImage
    })
    siteIcon.value = icon || noImage
  } catch (error) {
    siteIcon.value = noImage
    console.error(error)
  }
}
// 打开详情弹窗
function openSiteSchemeInfoDialog() {
  siteSchemeInfoDialog.value = true
}

// 保存详情数据
function saveSiteSchemeInfo() {
  // 为空不保存，跳出警告框

  // 执行保存
  siteSchemeInfoDialog.value = false
  emit('done')
}

onMounted(() => {
  getSiteIcon()
})
</script>
<template>
  <div>
    <VCard variant="tonal" @click="openSiteSchemeInfoDialog">
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
    <SiteSchemaEditDialog
      v-if="siteSchemeInfoDialog"
      v-model="siteSchemeInfoDialog"
      :site="site"
      oper="edit"
      @save="saveSiteSchemeInfo"
      @close="siteSchemeInfoDialog = false"
    />
  </div>
</template>
