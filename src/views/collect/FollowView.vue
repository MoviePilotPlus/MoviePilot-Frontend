<template>
  <div>
    <v-card class="mb-4">
      <v-card-title class="d-flex align-center">
        <v-icon class="mr-2">mdi-auto-fix</v-icon>
        追更任务
        <v-spacer />
        <v-btn color="primary" variant="text" @click="refresh">
          <v-icon>mdi-refresh</v-icon>
        </v-btn>
      </v-card-title>
    </v-card>

    <v-card v-if="loading" class="mb-4">
      <v-card-text class="text-center py-8">
        <v-progress-circular indeterminate color="primary" />
        <div class="mt-2">加载中...</div>
      </v-card-text>
    </v-card>

    <v-card v-else-if="!followTasks || followTasks.length === 0" class="mb-4">
      <v-card-text class="text-center py-8">
        <v-icon size="64" color="grey-lighten-1">mdi-inbox-outline</v-icon>
        <div class="mt-4 text-grey">暂无追更任务</div>
        <div class="text-caption text-grey mt-2">在视频采集页面选择"追更采集"创建追更任务</div>
      </v-card-text>
    </v-card>

    <template v-else>
      <v-card v-for="task in followTasks" :key="task.id" class="mb-4">
        <v-card-title class="d-flex align-center py-3">
          <div class="flex-grow-1">
            <div class="text-h6">{{ task.cn_title || task.en_title || task.name }}</div>
            <div class="text-caption text-grey mt-1">
              {{ task.site }} · {{ task.defn }} · {{ task.year || '未知年份' }}
              <span v-if="task.season"> · S{{ String(task.season).padStart(2, '0') }}</span>
            </div>
            <!-- 标签和站点 -->
            <div v-if="(task.tags && task.tags.length > 0) || (task.site_list && task.site_list.length > 0)" class="mt-2 d-flex align-center flex-wrap ga-1">
              <template v-if="task.tags && task.tags.length > 0">
                <v-chip
                  v-for="tag in task.tags"
                  :key="tag"
                  size="x-small"
                  color="primary"
                  variant="outlined"
                >
                  {{ tagOptions[tag as keyof typeof tagOptions] || tag }}
                </v-chip>
              </template>
              <template v-if="task.site_list && task.site_list.length > 0">
                <v-chip
                  v-for="siteId in task.site_list"
                  :key="siteId"
                  size="x-small"
                  color="success"
                  variant="outlined"
                >
                  {{ getSiteName(siteId) }}
                </v-chip>
              </template>
            </div>
          </div>
          <v-spacer />
          <v-chip :color="getStatusColor(task)" size="small" class="mr-2">
            {{ getStatusText(task) }}
          </v-chip>
          <v-menu>
            <template v-slot:activator="{ props }">
              <v-btn icon v-bind="props" variant="text">
                <v-icon>mdi-dots-vertical</v-icon>
              </v-btn>
            </template>
            <v-list>
              <v-list-item @click="editTask(task)">
                <v-list-item-title>
                  <v-icon class="mr-2">mdi-pencil</v-icon>
                  编辑
                </v-list-item-title>
              </v-list-item>
              <v-list-item @click="manualCheck(task.id)">
                <v-list-item-title>
                  <v-icon class="mr-2">mdi-refresh</v-icon>
                  立即检测
                </v-list-item-title>
              </v-list-item>
              <v-list-item @click="toggleTask(task)">
                <v-list-item-title>
                  <v-icon class="mr-2">{{ task.is_active ? 'mdi-pause' : 'mdi-play' }}</v-icon>
                  {{ task.is_active ? '暂停' : '启用' }}
                </v-list-item-title>
              </v-list-item>
              <v-list-item @click="showRecords(task)">
                <v-list-item-title>
                  <v-icon class="mr-2">mdi-history</v-icon>
                  查看记录
                </v-list-item-title>
              </v-list-item>
              <v-divider />
              <v-list-item @click="deleteTask(task.id)" class="text-error">
                <v-list-item-title>
                  <v-icon class="mr-2" color="error">mdi-delete</v-icon>
                  删除
                </v-list-item-title>
              </v-list-item>
            </v-list>
          </v-menu>
        </v-card-title>

        <v-divider />

        <v-card-text>
          <v-row>
            <v-col cols="6" md="3">
              <div class="text-caption text-grey">起始集数</div>
              <div class="text-body-1">第 {{ task.start_episode }} 集</div>
            </v-col>
            <v-col cols="6" md="3">
              <div class="text-caption text-grey">已追更</div>
              <div class="text-body-1">
                {{ task.followed_max_episode || 0 }} 集
                <span v-if="task.total_episodes" class="text-grey">
                  / {{ task.total_episodes }} 集
                </span>
              </div>
            </v-col>
            <v-col cols="6" md="3">
              <div class="text-caption text-grey">检测时间</div>
              <div class="text-body-1">
                {{ task.check_start_time || '00:00' }} - {{ task.check_end_time || '23:59' }}
              </div>
            </v-col>
            <v-col cols="6" md="3">
              <div class="text-caption text-grey">检测间隔</div>
              <div class="text-body-1">{{ task.check_interval_min || 5 }}-{{ task.check_interval_max || 30 }} 分钟</div>
            </v-col>
          </v-row>

          <v-row class="mt-2">
            <v-col cols="6" md="3">
              <div class="text-caption text-grey">制作组</div>
              <div class="text-body-1">{{ task.team || 'NoGroup' }}</div>
            </v-col>
            <v-col cols="6" md="3">
              <div class="text-caption text-grey">上次检测</div>
              <div class="text-body-1">{{ task.last_check_time || '未检测' }}</div>
            </v-col>
            <v-col cols="6" md="3">
              <div class="text-caption text-grey">自动下载</div>
              <div class="text-body-1">{{ task.auto_download ? '是' : '否' }}</div>
            </v-col>
            <v-col cols="6" md="3">
              <div class="text-caption text-grey">自动发布</div>
              <div class="text-body-1">{{ task.auto_publish ? '是' : '否' }}</div>
            </v-col>
          </v-row>

          <!-- 进度条 -->
          <div v-if="task.total_episodes" class="mt-4">
            <div class="d-flex justify-space-between text-caption mb-1">
              <span>追更进度</span>
              <span>{{ Math.round((task.followed_max_episode || 0) / task.total_episodes * 100) }}%</span>
            </div>
            <v-progress-linear
              :model-value="(task.followed_max_episode || 0) / task.total_episodes * 100"
              color="primary"
              height="6"
              rounded
            />
          </div>
        </v-card-text>
      </v-card>
    </template>

    <!-- 追更记录对话框 -->
    <v-dialog v-model="recordsDialog" max-width="800">
      <v-card>
        <v-card-title class="d-flex align-center">
          <v-icon class="mr-2">mdi-history</v-icon>
          追更记录
          <v-spacer />
          <v-btn icon variant="text" @click="recordsDialog = false">
            <v-icon>mdi-close</v-icon>
          </v-btn>
        </v-card-title>
        <v-divider />
        <v-card-text>
          <v-list v-if="records.length > 0">
            <v-list-item v-for="record in records" :key="record.id" class="px-0">
              <v-list-item-title>
                <div class="d-flex align-center">
                  <v-chip :color="record.success ? 'success' : 'error'" size="small" class="mr-2">
                    {{ record.success ? '成功' : '失败' }}
                  </v-chip>
                  <span>{{ record.check_time }}</span>
                </div>
              </v-list-item-title>
              <v-list-item-subtitle>
                <div v-if="record.new_episodes" class="mt-1">
                  <span class="text-success">新增剧集: {{ record.new_episodes }}</span>
                </div>
                <div v-if="record.detected_episodes" class="mt-1">
                  <span class="text-grey">检测到: {{ record.detected_episodes }}</span>
                </div>
                <div v-if="record.collect_ids" class="mt-1">
                  <span class="text-primary">采集任务ID: {{ record.collect_ids }}</span>
                </div>
                <div v-if="record.error_msg" class="mt-1">
                  <span class="text-error">错误: {{ record.error_msg }}</span>
                </div>
              </v-list-item-subtitle>
            </v-list-item>
          </v-list>
          <div v-else class="text-center py-8 text-grey">
            暂无记录
          </div>
        </v-card-text>
      </v-card>
    </v-dialog>

    <!-- 编辑对话框 -->
    <EditFollowDialog 
      v-model="editDialog" 
      :follow-id="selectedTaskId"
      @updated="loadFollowTasks" 
    />
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue'
import api from '@/api'
import { useToast } from 'vue-toastification'
import { tagOptions } from '@/api/constants'
import EditFollowDialog from '@/components/dialog/EditFollowDialog.vue'

const $toast = useToast()

interface Site {
  id: number
  name: string
}

interface FollowTask {
  id: number
  cid: string
  name: string | null
  site: string | null
  defn: string | null
  cn_title: string | null
  en_title: string | null
  year: string | null
  season: string | null
  team: string | null
  total_episodes: number | null
  start_episode: number | null
  followed_max_episode: number | null
  check_start_time: string | null
  check_end_time: string | null
  check_interval_min: number | null
  check_interval_max: number | null
  last_check_time: string | null
  last_update_date: string | null
  is_active: boolean | null
  is_finished: boolean | null
  auto_download: boolean | null
  auto_publish: boolean | null
  tags: string[]
  site_list: number[]
}

interface FollowRecord {
  id: number
  follow_task_id: number
  check_time: string | null
  detected_episodes: string | null
  new_episodes: string | null
  collect_ids: string | null
  success: boolean | null
  error_msg: string | null
}

const loading = ref(true)
const followTasks = ref<FollowTask[]>([])
const recordsDialog = ref(false)
const records = ref<FollowRecord[]>([])
const editDialog = ref(false)
const selectedTaskId = ref(0)
const siteList = ref<Site[]>([])

onMounted(() => {
  loadFollowTasks()
  loadSites()
})

async function loadFollowTasks() {
  loading.value = true
  try {
    const result = await api.get('follow/')
    if (result.success) {
      followTasks.value = result.data || []
    }
  } catch (error) {
    console.error('加载追更任务失败:', error)
    $toast.error('加载追更任务失败')
  } finally {
    loading.value = false
  }
}

async function loadSites() {
  try {
    siteList.value = await api.get('site/')
  } catch (error) {
    console.error('加载站点列表失败:', error)
  }
}

function getSiteName(siteId: number): string {
  const site = siteList.value.find(s => s.id === siteId)
  return site ? site.name : `站点${siteId}`
}

function refresh() {
  loadFollowTasks()
}

function getStatusColor(task: FollowTask) {
  if (task.is_finished) return 'success'
  if (!task.is_active) return 'grey'
  return 'primary'
}

function getStatusText(task: FollowTask) {
  if (task.is_finished) return '已完结'
  if (!task.is_active) return '已暂停'
  return '追更中'
}

async function manualCheck(taskId: number) {
  try {
    $toast.info('正在检测...')
    const result = await api.post(`follow/${taskId}/check`)
    if (result.success) {
      $toast.success(result.message || '检测完成')
      loadFollowTasks()
    } else {
      $toast.error(result.message || '检测失败')
    }
  } catch (error) {
    console.error('手动检测失败:', error)
    $toast.error('检测失败')
  }
}

async function toggleTask(task: FollowTask) {
  try {
    const result = await api.post(`follow/${task.id}/toggle`)
    if (result.success) {
      $toast.success(result.message)
      loadFollowTasks()
    } else {
      $toast.error(result.message || '操作失败')
    }
  } catch (error) {
    console.error('切换任务状态失败:', error)
    $toast.error('操作失败')
  }
}

async function deleteTask(taskId: number) {
  if (!confirm('确定要删除这个追更任务吗？')) {
    return
  }
  
  try {
    const result = await api.delete(`follow/${taskId}`)
    if (result.success) {
      $toast.success('删除成功')
      loadFollowTasks()
    } else {
      $toast.error(result.message || '删除失败')
    }
  } catch (error) {
    console.error('删除任务失败:', error)
    $toast.error('删除失败')
  }
}

async function showRecords(task: FollowTask) {
  try {
    const result = await api.get(`follow/${task.id}/records`)
    if (result.success) {
      records.value = result.data || []
      recordsDialog.value = true
    }
  } catch (error) {
    console.error('加载追更记录失败:', error)
    $toast.error('加载追更记录失败')
  }
}

function editTask(task: FollowTask) {
  selectedTaskId.value = task.id
  editDialog.value = true
}
</script>

<style scoped>
</style>
