<script setup lang="ts">
// @ts-nocheck
import noImage from '@images/logos/site.webp'
import { Site } from '@/api/types'
import SiteSchemaEditDialog from '@/components/dialog/SiteSchemaEditDialog.vue'
import api from '@/api'
import { useI18n } from 'vue-i18n'
import { getCachedSiteIcon } from '@/utils/siteIconCache'

// 国际化
const { t } = useI18n()

// 定义输入
const cardProps = defineProps({
  // 单个站点
  site: {
    type: Object as PropType<Site>,
    required: true,
  },
  // 是否已配置上传模板（由列表页按 siteschema.template 判定传入）
  hasTemplate: {
    type: Boolean,
    default: false,
  },
})

// 图标
const siteIcon = ref<string>('')
// 定义触发的自定义事件
const emit = defineEmits(['close', 'done', 'change'])

// 媒体服务器详情弹窗
const siteSchemeInfoDialog = ref(false)
// 查询站点图标（默认 api 自动拆信封，响应即 data；与 SiteCard 同范式走缓存）。
// 无图标的站点后端返回业务失败信封属正常情况，feedback 静默避免逐卡弹错
async function getSiteIcon() {
  const siteId = cardProps.site?.id
  if (!siteId) {
    siteIcon.value = noImage
    return
  }
  try {
    const icon = await getCachedSiteIcon(siteId, async () => {
      const response = await api.get<{ icon?: string }>(`site/icon/${siteId}`, { feedback: 'silent' })
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
    <VCard variant="tonal" class="site-schema-card" @click="openSiteSchemeInfoDialog">
      <!-- 已配置上传模板标识：右上角绿点，悬停有文字说明 -->
      <span
        v-if="hasTemplate"
        class="site-schema-badge"
        :title="t('setting.collect.templateConfigured')"
      />
      <!-- ps-3：图标与卡片左边框的呼吸间距（其余边保持紧凑） -->
      <VCardText class="d-flex align-center gap-3 pa-2 ps-3">
        <VImg
          :src="siteIcon"
          cover
          rounded="lg"
          class="site-schema-icon"
        />
        <div class="min-w-0 flex-1">
          <div class="site-schema-name text-truncate" :title="site.name">
            {{ site.name }}
          </div>
          <div class="site-schema-domain text-truncate" :title="site.domain">
            {{ site.domain }}
          </div>
        </div>
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

<style lang="scss" scoped>
.site-schema-card {
  position: relative;
  min-inline-size: 0;
  cursor: pointer;
  /* 全局 .v-card 圆角带 !important，须同级 !important 覆盖；站点卡用中等圆角 */
  border-radius: 0.5rem !important;
}

/* 「已配置」角标：右上角绿点，不参与文本布局 */
.site-schema-badge {
  position: absolute;
  inset-block-start: 0.45rem;
  inset-inline-end: 0.45rem;
  z-index: 1;
  border-radius: 50%;
  background: rgb(var(--v-theme-success));
  block-size: 0.5rem;
  inline-size: 0.5rem;
  pointer-events: auto;
}

/* VImg 自带 flex:1 0 auto 会横向拉伸；必须整条 flex 简写覆盖锁定正方形 */
.site-schema-icon {
  flex: 0 0 auto;
  block-size: 1.5rem;
  inline-size: 1.5rem;
}

.site-schema-name {
  /* 右侧留出绿点角标宽度，长名提前截断不与其重叠 */
  padding-inline-end: 0.9rem;
  color: rgba(var(--v-theme-on-surface), var(--v-high-emphasis-opacity));
  font-size: 0.85rem;
  font-weight: 600;
  line-height: 1.35;
}

.site-schema-domain {
  color: rgba(var(--v-theme-on-surface), var(--v-medium-emphasis-opacity));
  font-size: 0.7rem;
  line-height: 1.35;
  margin-block-start: 0.1rem;
}
</style>
