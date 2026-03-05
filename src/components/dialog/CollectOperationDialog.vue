<script setup lang="ts">
// @ts-nocheck

import { useToast } from 'vue-toastification'
import api from '@/api'
// 从API获取teamOptions数据
import { CollectProgress, Collect } from '@/api/types'
const progress = ref<Array<CollectProgress>>([])
// 输入参数
const props = defineProps({
  operation: String,
  collect_id: Number
})
// 提示框
const $toast = useToast()
// 注册事件
const emit = defineEmits(['close'])
const next_step = ref(false)
const skip_if_exists = ref(false)
const delete_old_file = ref(false)

const team = ref('')
// 制作组列表
const teamList = ref<any[]>([])

// 加载制作组数据
async function loadTeamOptions() {
  try {
    const result: { [key: string]: any } = await api.get('system/setting/TEAM_PARAMS')
    teamList.value = result.data?.value ?? []
    // 按照order排序
    teamList.value.sort((a, b) => (a.order || 0) - (b.order || 0))
    // 设置默认选中的制作组
    const defaultTeam = teamList.value.find(item => item.default) || teamList.value[0]
    if (defaultTeam) {
      team.value = defaultTeam.team
    }
  } catch (error) {
    console.error('加载制作组数据失败:', error)
    // 加载失败时使用默认值
    teamList.value = [{ team: 'ZimaWeb', copyright: 'Zima' }, { team: 'NoGroup', copyright: 'NoGroup' }]
  }
}

function getCopyright() {
  if (team.value) {
    return teamList.value.find((item) => item.team === team.value)?.copyright
  }
}
function getIcon() {
  switch (props.operation) {
    case 'start_download_by_collect':
      return 'mdi-arrow-down-bold-circle'
    case 'metadata_by_collect':
      return 'mdi-camcorder-box'
    case 'screenshot_by_collect':
      return 'mdi-camera'
    case 'collect_desc_by_collect':
      return 'mdi-format-text'
    case 'collect_move':
      return 'mdi-rename-box'
    case 'torrent_create':
      return 'mdi-chevron-double-right'
    case 'auto_update':
      return 'mdi-chevron-double-right'
    case 'remake_torrent':
      return 'mdi-transfer'
    default:
      return 'mdi-arrow-down-bold-circle'
  }
}
function getTitle() {
  switch (props.operation) {
    case 'start_download_by_collect':
      return '下载媒体文件'
    case 'metadata_by_collect':
      return '采集视频元数据'
    case 'screenshot_by_collect':
      return '采集视频截图'
    case 'collect_desc_by_collect':
      return '采集简介信息'
    case 'collect_move':
      return '重命名媒体文件'
    case 'torrent_create':
      return '创建种子文件'
    case 'auto_update':
      return '自动更新采集任务信息'
    case 'remake_torrent':
      return '转种'
    default:
      return '操作'
  }
}
function getText() {
  switch (props.operation) {
    case 'start_download_by_collect':
      return '推送下载媒体文件事件，稍后可以在下载任务中查看下载进度'
    case 'metadata_by_collect':
      return '推送采集视频元数据事件，稍后可以在详情中查看采集结果'
    case 'screenshot_by_collect':
      return '推送采集视频截图事件，稍后可以在详情中查看采集结果'
    case 'collect_desc_by_collect':
      return '推送采集简介信息事件，稍后可以在详情中查看采集结果'
    case 'collect_move':
      return '推送重命名媒体文件事件，稍后可以在详情中查看采集结果'
    case 'torrent_create':
      return '推送创建种子文件事件，稍后可以在详情中查看采集结果'
    case 'auto_update':
      return '推送自动更新采集任务信息事件，稍后可以在详情中查看采集结果'
    case 'remake_torrent':
      return '推送转钟事件，稍后可以在详情中查看采集结果'
    default:
      return '异步操作，请稍后查看结果'
  }
}
async function handleSubmit() {
  let result: { [key: string]: any }
  let params = {
    next_step: next_step.value,
    skip_if_exists: skip_if_exists.value,
    copyright: getCopyright(),
    team: team.value,
    delete_old_file: delete_old_file.value,
  }
  if (props.operation == 'remake_torrent') {
    if (!team.value) {
      $toast.error('请选择转种制作组！')
      return
    }
    params = {
      ...params,
      copyright: getCopyright(),
      team: team.value,
      delete_old_file: delete_old_file.value,
    }
  }
  result = await api.get(`collect/${props?.operation}/${props?.collect_id}`, { params: params })
  const title = getTitle()
  if (result && result.success) {
    // 添加下载成功
    $toast.success(`${title}事件发送成功！`)
    // 下载成功，返回链接
    emit('close')
  } else {
    // 添加下载失败
    $toast.error(`${title}事件发送失败：${result?.message}！`)
    // 下载失败，返回错误原因
    emit('close')
  }
}
onMounted(async () => {
  if (props.operation === 'remake_torrent') {
    await loadTeamOptions()
  }
})
</script>
<template>
  <VDialog width="auto" transition="dialog-bottom-transition">
    <VCard :prepend-icon="getIcon()" :text="getText()" :title="getTitle()">

      <div class="mb-6 ml-5" v-if="props.operation == 'remake_torrent'">
        <VChipGroup column v-model="team">
          <template v-for="(teamOption, index) in teamList" :key="index">
            <VChip filter variant="outlined" :value="teamOption.team">
              {{ teamOption.team }}
            </VChip>
          </template>
        </VChipGroup>
      </div>
      <div class="ml-5">
        <v-row>
          <v-col cols="6" v-if="props.operation == 'remake_torrent'">
            <v-switch v-model="delete_old_file" label="清除原有做种" hide-details>
            </v-switch>
          </v-col>
          <v-col cols="6" v-if="props.operation != 'remake_torrent'">
            <v-switch v-model="next_step" label="继续后续任务" hide-details>
            </v-switch>
          </v-col>
          <v-col cols="6" v-if="props.operation != 'remake_torrent'" v-model="skip_if_exists">
            <v-switch label="已存在跳过" hide-details>
            </v-switch>
          </v-col>
          <v-col cols="12">
            <div class="text-red-700" v-if="props.operation == 'remake_torrent' && delete_old_file">
              清除原有做种后，会删除原有做种文件和任务，且无法恢复！</div>
          </v-col>
        </v-row>

      </div>

      <template v-slot:actions>
        <v-spacer></v-spacer>
        <VBtn class="ms-auto" text="取消" @click="emit('close')"></VBtn>
        <VBtn class="ms-auto" text="确定" @click="handleSubmit"></VBtn>
      </template>
    </VCard>
  </VDialog>
</template>

<style lang="scss" scoped>
.v-table th {
  white-space: nowrap;
}
</style>
