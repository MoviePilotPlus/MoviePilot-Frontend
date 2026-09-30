<!-- eslint-disable sonarjs/no-duplicate-string -->
<script lang="ts" setup>
// @ts-nocheck
import { useToast } from 'vue-toastification'
import draggable from 'vuedraggable'
import api from '@/api'
import { Site } from '@/api/types'
import SiteSchemaCard from '@/components/cards/SiteSchemaCard.vue'
import SiteSchemaImportDialog from '@/components/dialog/SiteSchemaImportDialog.vue'
import { useI18n } from 'vue-i18n'

// 站点模板卡：站点网格 + 搜索过滤 + 导入/导出/同步覆盖。
const { t } = useI18n()
const $toast = useToast()

// 所有站点
const allSites = ref<Site[]>([])

// 导入对话框
const siteImportDialog = ref(false)

// ===== 站点模板搜索过滤 =====
const siteSearchKeyword = ref('')

function matchSiteSchema(site: Site) {
  const keyword = siteSearchKeyword.value.trim().toLowerCase()
  if (!keyword) return true
  return (
    site.name?.toLowerCase().includes(keyword) || site.domain?.toLowerCase().includes(keyword)
  )
}

// 站点域名 → 是否已配置上传模板（siteschema.template 非空）
const siteTemplateConfigured = ref<Record<string, boolean>>({})

async function loadSiteList() {
  try {
    const data: Site[] = await api.get('site/')
    allSites.value = data
  } catch (error) {
    console.log(error)
  }
  try {
    const schemas: Array<{ domain?: string, template?: Record<string, unknown> | null }> = await api.get('siteschema/')
    const map: Record<string, boolean> = {}
    for (const schema of schemas) {
      if (schema.domain)
        map[schema.domain] = !!schema.template && Object.keys(schema.template).length > 0
    }
    siteTemplateConfigured.value = map
  } catch (error) {
    console.log(error)
  }
}

// 导出站点模板
async function exportSiteSchemas() {
  try {
    // 获取所有站点模板数据
    const siteSchemas = await api.get('siteschema/')

    // 创建导出数据，只包含必要的字段，排除id
    const exportData = siteSchemas.map((schema: any) => {
      const rest = { ...schema }
      delete rest.id
      return rest
    })

    // 创建Blob对象
    const blob = new Blob([JSON.stringify(exportData, null, 2)], { type: 'application/json' })

    // 创建下载链接
    const url = URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.href = url
    link.download = `site_schemas_export_${new Date().toISOString().split('T')[0]}.json`
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
    URL.revokeObjectURL(url)

    // 显示成功提示
    $toast.success(t('setting.collect.siteSchemaExportSuccess'))
  } catch (error) {
    console.error('导出站点模板失败:', error)
    $toast.error(t('setting.collect.siteSchemaExportFailed'))
  }
}

// 处理导入成功
function handleImportSuccess() {
  // 重新获取站点模板数据
  loadSiteList()
  $toast.success(t('setting.collect.siteSchemaImportSuccess'))
}
// 同步覆盖站点模板：用默认 siteschema.json 覆盖库中同 domain 行（2FA 保留，库独有不删）
const siteSyncConfirmDialog = ref(false)
const siteSyncLoading = ref(false)
async function syncSiteSchemas() {
  siteSyncLoading.value = true
  try {
    const result: { written?: number, kept?: number } = await api.post('siteschema/sync/default')
    siteSyncConfirmDialog.value = false
    loadSiteList()
    $toast.success(t('setting.collect.siteSchemaSyncSuccess', { written: result?.written ?? 0, kept: result?.kept ?? 0 }))
  }
  catch (error) {
    console.error('同步覆盖站点模板失败:', error)
    $toast.error(t('setting.collect.siteSchemaSyncFailed'))
  }
  finally {
    siteSyncLoading.value = false
  }
}

onMounted(() => {
  loadSiteList()
})
</script>

<template>
  <VCard id="collect-siteschema">
    <VCardItem>
      <VCardTitle>{{ t('setting.collect.siteSchema') }}</VCardTitle>
      <VCardSubtitle>{{ t('setting.collect.siteSchemaDesc') }}</VCardSubtitle>
    </VCardItem>
    <VCardText>
      <!-- 站点搜索：按名称/域名过滤，拖拽排序在无搜索词时可用（紧凑单行，右对齐） -->
      <VTextField
        v-model="siteSearchKeyword"
        density="compact"
        variant="outlined"
        single-line
        :placeholder="t('setting.collect.siteSearchPlaceholder')"
        prepend-inner-icon="mdi-magnify"
        clearable
        hide-details
        class="site-search-field mb-3"
      />
      <draggable
        v-model="allSites"
        handle=".cursor-move"
        item-key="id"
        tag="div"
        :component-data="{ 'class': 'grid gap-2 grid-site-schema-card' }"
      >
        <template #item="{ element }">
          <div v-show="matchSiteSchema(element)" class="h-100">
            <SiteSchemaCard
              :site="element"
              :has-template="siteTemplateConfigured[element.domain] === true"
            />
          </div>
        </template>
      </draggable>
    </VCardText>
    <VCardText>
      <VForm @submit.prevent="() => {}">
        <div class="d-flex flex-wrap gap-4 mt-4">
          <!-- 导入按钮 -->
          <VBtn color="primary" variant="tonal" @click="siteImportDialog = true" prepend-icon="mdi-import">
            {{ t('site.actions.import') }}
          </VBtn>
          <!-- 导出按钮 -->
          <VBtn color="warning" variant="tonal" @click="exportSiteSchemas" prepend-icon="mdi-export">
            {{ t('site.actions.export') }}
          </VBtn>
          <!-- 同步覆盖按钮：用默认模板覆盖库中同 domain 行 -->
          <VBtn color="error" variant="tonal" @click="siteSyncConfirmDialog = true" prepend-icon="mdi-sync">
            {{ t('setting.collect.siteSchemaSyncConfirmTitle') }}
          </VBtn>
        </div>
      </VForm>
    </VCardText>

    <!-- 同步覆盖站点模板确认弹窗 -->
    <VDialog v-model="siteSyncConfirmDialog" max-width="36rem">
      <VCard>
        <VCardItem>
          <VCardTitle>{{ t('setting.collect.siteSchemaSyncConfirmTitle') }}</VCardTitle>
        </VCardItem>
        <VCardText>{{ t('setting.collect.siteSchemaSyncConfirmText') }}</VCardText>
        <VCardActions>
          <VSpacer />
          <VBtn variant="text" @click="siteSyncConfirmDialog = false">{{ t('common.cancel') }}</VBtn>
          <VBtn color="primary" :loading="siteSyncLoading" @click="syncSiteSchemas">{{ t('common.confirm') }}</VBtn>
        </VCardActions>
      </VCard>
    </VDialog>

    <!-- 导入站点模板弹窗 -->
    <SiteSchemaImportDialog v-if="siteImportDialog" v-model="siteImportDialog" @import-success="handleImportSuccess" />
  </VCard>
</template>

<style scoped>
/* 站点模板卡专用网格：紧凑卡更小列宽（共享 grid-app-card 不动） */
.grid-site-schema-card {
  grid-template-columns: repeat(auto-fill, minmax(10.5rem, 1fr));
}

/* 站点搜索框：固定窄宽右对齐，不占整行 */
.site-search-field {
  max-inline-size: 15rem;
  margin-inline-start: auto;
}
</style>
