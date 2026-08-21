<template>
  <VDialog v-model="dialog" max-width="900">
    <VCard>
      <VCardTitle>合并打包</VCardTitle>
      <VCardText>
        <!-- 源任务信息 -->
        <div v-if="sourceInfo" class="mb-4">
          <div class="text-h6">
            {{ sourceInfo.cn_title }} {{ sourceInfo.year }} S{{ sourceInfo.season || '' }} - {{ sourceInfo.site || '' }}
          </div>
        </div>

        <!-- 分集列表 -->
        <VDataTable
          v-model="selectedItems"
          :headers="headers"
          :items="mergeList"
          item-value="collect_id"
          show-select
          class="bordered mt-4"
        >
          <template #[`item.name`]="{ item }">
            {{ item.name }}
          </template>
          <template #[`item.episodes`]="{ item }">
            {{ item.episodes }}
          </template>
          <template #[`item.file_size`]="{ item }">
            {{ formatFileSize(item.file_size || 0) }}
          </template>
        </VDataTable>

        <div v-if="mergeList.length === 0 && !loading" class="text-center text-grey mt-4">
          暂无可合并的分集
        </div>

        <!-- 选项 -->
        <div class="mt-4">
          <VCheckbox v-model="deleteSource" label="合并后删除原分集任务（文件将移动而非复制）" density="compact" />
        </div>
      </VCardText>

      <VCardActions>
        <VSpacer />
        <VBtn variant="outlined" @click="dialog = false">取消</VBtn>
        <VBtn 
          color="primary" 
          :loading="merging"
          :disabled="selectedItems.length === 0"
          @click="handleMerge"
        >
          确认合并
        </VBtn>
      </VCardActions>
    </VCard>
  </VDialog>
</template>

<script lang="ts" setup>
// @ts-nocheck
import { ref, watch, computed } from 'vue'
import { useToast } from 'vue-toastification'
import { useRouter } from 'vue-router'
import { pluginApi as api } from '@/api'
import { formatFileSize } from '@/@core/utils/formatters'

const props = defineProps({
  modelValue: Boolean,
  collectId: {
    type: Number,
    required: true
  }
})

const emit = defineEmits(['update:modelValue', 'merged'])
const $toast = useToast()
const router = useRouter()

const dialog = computed({
  get: () => props.modelValue,
  set: (val) => {
    emit('update:modelValue', val)
  }
})

const loading = ref(false)
const merging = ref(false)
const sourceInfo = ref<any>(null)
const mergeList = ref<any[]>([])
const selectedItems = ref<number[]>([])
const deleteSource = ref(false)

const headers = [
  { title: '任务名称', key: 'name', sortable: true },
  { title: '集数', key: 'episodes', sortable: true },
  { title: '文件大小', key: 'file_size', sortable: true },
]

async function fetchMergeList() {
  loading.value = true
  try {
    const result = await api.get(`collect/merge/${props.collectId}`)
    if (result.success && result.data) {
      sourceInfo.value = result.data.source
      mergeList.value = result.data.merge_list || []
      selectedItems.value = mergeList.value.map((item: any) => item.collect_id)
    }
  } catch (error) {
    console.error(error)
    $toast.error('获取合并列表失败')
  } finally {
    loading.value = false
  }
}

async function handleMerge() {
  if (selectedItems.value.length === 0) {
    $toast.warning('请选择要合并的分集')
    return
  }

  merging.value = true
  try {
    const result = await api.post(`collect/merge/${props.collectId}`, {
      collect_ids: selectedItems.value,
      delete_source: deleteSource.value,
    })
    if (result.success) {
      $toast.success('合并成功')
      dialog.value = false
      emit('merged')
      if (result.data?.new_collect_id) {
        router.push(`/cdetail?id=${result.data.new_collect_id}`)
      }
    } else {
      $toast.error(result.message || '合并失败')
    }
  } catch (error) {
    console.error(error)
    $toast.error('合并失败')
  } finally {
    merging.value = false
  }
}

watch(dialog, (val) => {
  if (val) {
    fetchMergeList()
    selectedItems.value = []
    deleteSource.value = false
  }
})
</script>
