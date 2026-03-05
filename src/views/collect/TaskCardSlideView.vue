<script lang="ts" setup>
// @ts-nocheck
import { throttle } from 'lodash-es'
import type { DownloadTask, Progress } from '@/api/types'
import TaskCard from '@/components/cards/TaskCard.vue'
import SlideView from '@/components/slide/SlideView.vue'
import { useI18n } from 'vue-i18n'

const { t } = useI18n()

// 输入参数
const props = defineProps({
  title: String,
  taskList: {
    type: Array as PropType<DownloadTask[]>,
    default: () => []
  },
  width: String,
  height: String,
})

// 提供给子组件的属性
provide('rankingPropsKey', reactive({ ...props }))
const progress = shallowRef<Record<number, Progress>>({});
// 事件源
let eventSource: EventSource | null = null
// SSE持续接收消息
function startSSEMessager() {
  // 延迟 3 秒启动 SSE，避免相关认证信息尚未写入 Cookie 导致 403
  setTimeout(() => {
    eventSource = new EventSource(`${import.meta.env.VITE_API_BASE_URL}task/progress`)
    eventSource.addEventListener('message', throttle(event => {
      // 为 curr 参数显式指定类型，避免隐式 any 类型
      const updates = JSON.parse(event.data).reduce((acc: Record<number, Progress>, curr: { task_id: number } & Progress) => {
        acc[curr.task_id] = curr;
        return acc;
      }, {});
      progress.value = { ...progress.value, ...updates };
    }, 500));
  }, 3000)
}

// 页面加载时，加载当前用户数据
onBeforeMount(async () => {
  startSSEMessager()
})

// 页面卸载时，关闭事件源
onBeforeUnmount(() => {
  if (eventSource) eventSource.close()
})
// 组件加载完成
const componentLoaded = ref(false)

// 数据列表
const dataList = ref<DownloadTask[]>([])
function removeTask(id: number) {
  const index = dataList.value.findIndex(item => item.id === id)
  if (index !== -1) {
    dataList.value.splice(index, 1)
  }
}
// 加载时获取数据
onMounted(() => {
  dataList.value = props.taskList
  componentLoaded.value = true
})
onActivated(() => {
  dataList.value = props.taskList
  componentLoaded.value = true
})
</script>

<template>
  <SlideView v-if="componentLoaded">
    <template #content>
      <template v-for="data in props.taskList" :key="data.id">
        <TaskCard :info="data" v-memo="[progress[data.id]]" :progress="progress[data.id]" height="11rem" width="20rem"
          @remove="removeTask" />
      </template>
    </template>
  </SlideView>
</template>
