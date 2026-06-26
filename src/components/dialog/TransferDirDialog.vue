<template>
  <VDialog v-model="dialog" max-width="640">
    <VCard>
      <VCardTitle>转移目录</VCardTitle>
      <VCardText>
        <!-- 当前任务信息 -->
        <div v-if="collect" class="mb-4">
          <div class="text-subtitle-1 font-weight-bold">
            {{ collect.cn_title || collect.title || collect.name }}
          </div>
          <div class="text-body-2 text-medium-emphasis mt-1">
            当前做种目录（media_base_dir）：
            <span class="text-primary">{{ collect.media_base_dir || '（空）' }}</span>
          </div>
        </div>

        <VAlert type="info" variant="tonal" density="compact" class="mb-4">
          将把该任务的视频文件、种子文件以及下载器中已做种的种子数据，
          统一迁移到下面的新目录，并更新相关路径字段（不处理 m3u8、下载命令等下载临时内容）。
        </VAlert>

        <!-- 目标目录选择 -->
        <div class="text-body-2 mb-2">选择新的做种根目录（新 media_base_dir）</div>
        <PathInput v-model="targetDir" :root="'/'" :storage="'local'">
          <template #activator="{ menuprops }">
            <VTextField
              :model-value="targetDir"
              @update:model-value="(v: string) => (targetDir = v)"
              placeholder="请选择或输入目标目录"
              v-bind="menuprops"
            />
          </template>
        </PathInput>
      </VCardText>

      <VCardActions>
        <VSpacer />
        <VBtn variant="outlined" @click="dialog = false">取消</VBtn>
        <VBtn color="primary" :loading="transferring" :disabled="!canSubmit" @click="handleTransfer">
          确认转移
        </VBtn>
      </VCardActions>
    </VCard>
  </VDialog>
</template>

<script lang="ts" setup>
// @ts-nocheck
import { ref, computed, watch } from 'vue'
import { useToast } from 'vue-toastification'
import api from '@/api'
import PathInput from '@/components/input/PathInput.vue'
import type { Collect } from '@/api/types'

const props = defineProps({
  modelValue: Boolean,
  collect: {
    type: Object as PropType<Collect>,
    default: () => ({}) as Collect,
  },
})

const emit = defineEmits(['update:modelValue', 'done'])
const $toast = useToast()

const dialog = computed({
  get: () => props.modelValue,
  set: (val) => emit('update:modelValue', val),
})

const targetDir = ref('')
const transferring = ref(false)

const canSubmit = computed(() => {
  const target = (targetDir.value || '').trim()
  const current = (props.collect?.media_base_dir || '').trim()
  return !!target && target !== current
})

// 打开时用当前 media_base_dir 作为默认起始值
watch(
  () => props.modelValue,
  (visible) => {
    if (visible) {
      targetDir.value = props.collect?.media_base_dir || '/'
      transferring.value = false
    }
  },
)

async function handleTransfer() {
  const collectId = props.collect?.id
  if (!collectId) {
    $toast.error('缺少采集任务ID')
    return
  }
  const target = (targetDir.value || '').trim()
  if (!target) {
    $toast.error('请选择目标目录')
    return
  }
  transferring.value = true
  try {
    const result: { success?: boolean; message?: string } = await api.post(
      `collect/transfer_dir/${collectId}`,
      { target_dir: target },
    )
    if (result?.success) {
      $toast.success(result.message || '转移目录任务已提交')
      emit('done')
      dialog.value = false
    } else {
      $toast.error(result?.message || '转移目录失败')
    }
  } catch (error: any) {
    $toast.error(error?.response?.data?.message || '转移目录失败')
  } finally {
    transferring.value = false
  }
}
</script>
