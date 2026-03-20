<template>
  <VDialog v-model="dialog" max-width="700">
    <VCard>
      <VCardTitle class="d-flex align-center">
        <VIcon class="mr-2">mdi-pencil</VIcon>
        编辑追更任务
        <VSpacer />
        <VBtn icon variant="text" @click="dialog = false">
          <VIcon>mdi-close</VIcon>
        </VBtn>
      </VCardTitle>
      <VDivider />

      <VCardText v-if="loading" class="text-center py-8">
        <VProgressCircular indeterminate color="primary" />
        <div class="mt-2">加载中...</div>
      </VCardText>

      <VCardText v-else>
        <VForm ref="formRef">
          <VRow>
            <VCol cols="12" md="4">
              <VTextField
                v-model.number="formData.total_episodes"
                label="总集数"
                type="number"
                variant="outlined"
                density="compact"
                hint="剧集总数"
                persistent-hint
              />
            </VCol>
            <VCol cols="12" md="4">
              <VTextField
                v-model.number="formData.start_episode"
                label="起始集数"
                type="number"
                variant="outlined"
                density="compact"
                hint="从第几集开始追更"
                persistent-hint
              />
            </VCol>
            <VCol cols="12" md="4">
              <VTextField
                v-model.number="formData.followed_max_episode"
                label="已追更集数"
                type="number"
                variant="outlined"
                density="compact"
                hint="已追更到的最大集数"
                persistent-hint
              />
            </VCol>
          </VRow>

          <VRow>
            <VCol cols="12" md="6">
              <VTextField
                v-model="formData.check_start_time"
                label="检测开始时间"
                type="time"
                variant="outlined"
                density="compact"
                hint="每天开始检测的时间"
                persistent-hint
              />
            </VCol>
            <VCol cols="12" md="6">
              <VTextField
                v-model="formData.check_end_time"
                label="检测结束时间"
                type="time"
                variant="outlined"
                density="compact"
                hint="每天结束检测的时间"
                persistent-hint
              />
            </VCol>
          </VRow>

          <VRow>
            <VCol cols="12" md="6">
              <VTextField
                v-model.number="formData.check_interval"
                label="检测间隔（分钟）"
                type="number"
                variant="outlined"
                density="compact"
                hint="每隔多少分钟检测一次"
                persistent-hint
              />
            </VCol>
          </VRow>

          <VRow class="mt-2">
            <VCol cols="12" md="4">
              <VCheckbox
                v-model="formData.auto_download"
                label="自动下载"
                density="compact"
              />
            </VCol>
            <VCol cols="12" md="4">
              <VCheckbox
                v-model="formData.auto_publish"
                label="自动发布"
                density="compact"
              />
            </VCol>
            <VCol cols="12" md="4">
              <VCheckbox
                v-model="formData.anon_publish"
                label="匿名发布"
                density="compact"
              />
            </VCol>
          </VRow>

          <VRow>
            <VCol cols="12">
              <div class="text-subtitle-2 mb-2">发布站点</div>
              <VChipGroup column v-model="formData.site_list" multiple>
                <VChip
                  v-for="site in siteList"
                  :key="site.id"
                  :color="formData.site_list.includes(site.id) ? 'primary' : ''"
                  filter
                  variant="outlined"
                  :value="site.id"
                >
                  {{ site.name }}
                </VChip>
              </VChipGroup>
            </VCol>
          </VRow>

          <VRow>
            <VCol cols="12">
              <div class="text-subtitle-2 mb-2">标签</div>
              <VChipGroup column v-model="formData.tags" multiple>
                <VChip
                  v-for="(value, key) in tagOptions"
                  :key="key"
                  :color="formData.tags.includes(key) ? 'primary' : ''"
                  filter
                  variant="outlined"
                  :value="key"
                >
                  {{ value }}
                </VChip>
              </VChipGroup>
            </VCol>
          </VRow>
        </VForm>
      </VCardText>

      <VDivider />
      <VCardActions>
        <VSpacer />
        <VBtn variant="outlined" @click="dialog = false">取消</VBtn>
        <VBtn color="primary" :loading="saving" @click="handleSave">保存</VBtn>
      </VCardActions>
    </VCard>
  </VDialog>
</template>

<script setup lang="ts">
import { ref, watch, computed } from 'vue'
import { useToast } from 'vue-toastification'
import api from '@/api'
import { tagOptions } from '@/api/constants'

interface Site {
  id: number
  name: string
}

const props = defineProps({
  modelValue: Boolean,
  followId: {
    type: Number,
    default: 0
  }
})

const emit = defineEmits(['update:modelValue', 'updated'])
const $toast = useToast()

const dialog = computed({
  get: () => props.modelValue,
  set: (val) => emit('update:modelValue', val)
})

const loading = ref(false)
const saving = ref(false)
const formRef = ref()
const siteList = ref<Site[]>([])

interface FormData {
  total_episodes: number | null
  start_episode: number | null
  followed_max_episode: number | null
  check_start_time: string
  check_end_time: string
  check_interval: number | null
  auto_download: boolean
  auto_publish: boolean
  anon_publish: boolean
  site_list: number[]
  tags: string[]
}

const formData = ref<FormData>({
  total_episodes: null,
  start_episode: null,
  followed_max_episode: null,
  check_start_time: '',
  check_end_time: '',
  check_interval: null,
  auto_download: true,
  auto_publish: true,
  anon_publish: false,
  site_list: [],
  tags: []
})

async function getSites() {
  try {
    siteList.value = await api.get('site/')
  } catch (error) {
    console.error('获取站点列表失败:', error)
  }
}

async function loadTaskDetail() {
  if (!props.followId) return
  
  loading.value = true
  try {
    const result = await api.get(`follow/${props.followId}`)
    if (result.success && result.data) {
      const task = result.data
      formData.value = {
        total_episodes: task.total_episodes,
        start_episode: task.start_episode,
        followed_max_episode: task.followed_max_episode,
        check_start_time: task.check_start_time || '',
        check_end_time: task.check_end_time || '',
        check_interval: task.check_interval,
        auto_download: task.auto_download ?? true,
        auto_publish: task.auto_publish ?? true,
        anon_publish: task.anon_publish ?? false,
        site_list: task.site_list || [],
        tags: task.tags || []
      }
    }
  } catch (error) {
    console.error('加载任务详情失败:', error)
    $toast.error('加载任务详情失败')
  } finally {
    loading.value = false
  }
}

async function handleSave() {
  if (!props.followId) return
  
  saving.value = true
  try {
    const updateData: Record<string, any> = {}
    
    if (formData.value.total_episodes !== null) updateData.total_episodes = formData.value.total_episodes
    if (formData.value.start_episode !== null) updateData.start_episode = formData.value.start_episode
    if (formData.value.followed_max_episode !== null) updateData.followed_max_episode = formData.value.followed_max_episode
    if (formData.value.check_start_time) updateData.check_start_time = formData.value.check_start_time
    if (formData.value.check_end_time) updateData.check_end_time = formData.value.check_end_time
    if (formData.value.check_interval !== null) updateData.check_interval = formData.value.check_interval
    
    updateData.auto_download = formData.value.auto_download
    updateData.auto_publish = formData.value.auto_publish
    updateData.anon_publish = formData.value.anon_publish
    updateData.site_list = formData.value.site_list
    updateData.tags = formData.value.tags
    
    const result = await api.put(`follow/${props.followId}`, updateData)
    if (result.success) {
      $toast.success('保存成功')
      dialog.value = false
      emit('updated')
    } else {
      $toast.error(result.message || '保存失败')
    }
  } catch (error) {
    console.error('保存失败:', error)
    $toast.error('保存失败')
  } finally {
    saving.value = false
  }
}

watch(dialog, (val) => {
  if (val && props.followId) {
    loadTaskDetail()
    getSites()
  }
})
</script>
