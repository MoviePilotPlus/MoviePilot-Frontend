<script lang="ts" setup>
// @ts-nocheck
// 核心导入
import { PropType, ref, reactive, computed, watch, onMounted, getCurrentInstance } from 'vue'
import { useDisplay } from 'vuetify'
import { useI18n } from 'vue-i18n'
import { useToast } from 'vue-toastification'

// API和类型导入
import api from '@/api'
import type { Collect, Site, SiteSeed } from '@/api/types'
import { collectStatus, categoryOptions } from '@/api/constants'

// 组件导入
import TaskItem from '@/components/cards/TaskItem.vue'

// 初始化
const { t } = useI18n()
const display = useDisplay()
const { proxy } = getCurrentInstance()!
const emit = defineEmits(['remove'])
// 提示框
const $toast = useToast()
// 定义输入参数
const props = defineProps({
  items: Array as PropType<Collect[]>,
})
// 所有站点
const allSites = ref<Site[]>([])
const keyword = ref('')
// 控制选择框显示/隐藏的开关
const showSelectionControls = ref(false)
// 过滤表单
const filterForm: Record<string, string[]> = reactive({
  keyword: [] as string[],
  // 包含站点
  site: [] as string[],
  // 不包含站点
  siteNotInclude: [] as string[],
  // 制作组
  releaseGroup: [] as string[],
  // 视频编码
  videoCode: [] as string[],
  // 质量
  edition: [] as string[],
  // 分辨率
  resolution: [] as string[],
  // 状态
  status: [] as string[],
  // 媒体类型
  cate: [] as string[],
  // 文件大小范围
  fileSizeRange: [] as string[],
})
function getFilterItemName(key: string, option: string) {
  if (key == 'status') {
    return collectStatus[option as keyof typeof collectStatus]
  } else if (key == 'fileSizeRange') {
    // 文件大小范围显示名称使用国际化翻译
    return t(`file.fileSizeRange.${option}`) || option
  } else if (key == 'cate') {
    // 使用 categoryOptions 常量显示媒体类型的中文名称
    return categoryOptions[option as keyof typeof categoryOptions] || option
  } else {
    return option
  }
}

// 统一存储过滤选项
const filterOptions: Record<string, string[]> = reactive({
  site: [] as string[],
  siteNotInclude: [] as string[],
  edition: [] as string[],
  resolution: [] as string[],
  videoCode: [] as string[],
  releaseGroup: [] as string[],
  status: [] as string[],
  keyword: [] as string[],
  // 使用 categoryOptions 中的键作为媒体类型选项
  cate: Object.keys(categoryOptions),
  fileSizeRange: ['tiny', 'small', 'medium', 'large', 'xlarge'],
})

// 过滤项映射
const filterTitles: Record<string, string> = {
  keyword: t('collect.keyword'),
  site: t('collect.siteInclude'),
  siteNotInclude: t('collect.siteNotInclude'),
  status: t('collect.status'),
  videoCode: t('collect.filterVideoCode'),
  edition: t('collect.filterEdition'),
  resolution: t('collect.filterResolution'),
  releaseGroup: t('collect.filterReleaseGroup'),
  // 媒体类型和文件大小使用国际化翻译
  cate: t('filterRule.mediaType'),
  fileSizeRange: t('workflow.filterTorrents.size'),
}

// 排序中文名
const sortTitles: Record<string, string> = {
  default: t('collect.sortDefault'),
  size: t('collect.sortSize')
}

// 排序字段
const sortField = ref('default')
// 降序
const sortType = ref<'asc' | 'desc'>('desc')

// 数据列表
const dataList = ref<Array<Collect>>([])

// 过滤后的数据列表
const filteredDataList = ref<Array<Collect>>([])

// 显示用的数据列表
const displayDataList = ref<Array<Collect>>([])
const selectedItems = ref<number[]>([])
const showDeleteConfirm = ref(false)
const deleteOptions = ref({
  delete_file: true,
  remove_seed: true
})
// 批量添加站点相关
const showAddSiteDialog = ref(false)
const selectedSites = ref<number[]>([])
const addSiteOptions = ref({
  next_step: false
})
// 全选状态的计算属性
const isAllSelected = computed(() => {
  return filteredDataList.value.length > 0 && selectedItems.value.length === filteredDataList.value.length
})

// 计算已选择的过滤条件数量
const getFilterCount = computed(() => {
  let count = 0
  for (const key in filterForm) {
    count += filterForm[key].length
  }
  return count
})

// 计算已选择的过滤条件
const getSelectedFilters = computed(() => {
  const filters: Record<string, string[]> = {}
  for (const key in filterForm) {
    if (filterForm[key].length > 0) {
      filters[key] = [...filterForm[key]]
    }
  }
  return filters
})

// 移除单个过滤条件
function removeFilter(key: string, value: string) {
  const index = filterForm[key].indexOf(value)
  if (index !== -1) {
    filterForm[key].splice(index, 1)
  }
}

// 从选中列表中移除单个任务
function removeSelectedItem(id: number) {
  const index = selectedItems.value.indexOf(id)
  if (index !== -1) {
    selectedItems.value.splice(index, 1)
  }
}

// 切换单个任务的选中状态
function toggleSelection(id: number) {
  const index = selectedItems.value.indexOf(id)
  if (index === -1) {
    selectedItems.value.push(id)
  } else {
    selectedItems.value.splice(index, 1)
  }
}

// 清除所有过滤条件
function clearAllFilters() {
  for (const key in filterForm) {
    filterForm[key] = []
  }
  keywordClear()
}

// 初始化过滤选项
function initOptions(data: Collect) {
  const optionValue = (options: Array<string>, value: string | undefined) => {
    if (value && !options.includes(value)) {
      options.push(value)
    }
  }
  optionValue(filterOptions.status, data?.status)
  optionValue(filterOptions.releaseGroup, data?.team)
  optionValue(filterOptions.videoCode, data?.video_codec)
  optionValue(filterOptions.edition, data?.hdr_format)
  optionValue(filterOptions.resolution, data?.resolution)
}
// 查询所有站点
async function querySites() {
  try {
    const data: Site[] = await api.get('site/')
    // 过滤站点，只有启用的站点才显示
    allSites.value = data.filter(item => item.is_active)
    filterOptions.site = allSites.value.map(item => item.name)
    filterOptions.siteNotInclude = allSites.value.map(item => item.name)
  } catch (error) {
    console.log(error)
  }
}
// 修改watch监听，同时监听排序字段的变化
watch([filterForm, sortField, sortType], () => {
  // 筛选条件改变时，清空选中状态
  if (selectedItems.value.length > 0) {
    selectedItems.value = []
  }
  filterData()
})

// 计算过滤后的列表
function filterData() {
  // 清空列表
  dataList.value = []
  displayDataList.value = []
  // 匹配过滤函数
  const match = (filter: Array<string>, value: string | undefined) =>
    filter.length === 0 || (value && filter.includes(value))
  // 站点匹配
  const matchSite = (filter: Array<string>, value: Array<SiteSeed>) =>
    filter.length === 0 || (value && filter.some(item => value.some(site => site.site_name.includes(item))))
  // 不包含站点匹配
  const matchSiteNotInclude = (filter: Array<string>, value: Array<SiteSeed>) =>
    filter.length === 0 || value.length === 0 || (value && filter.every(item => value.every(site => !site.site_name.includes(item))))
  // 关键字搜索
  const search = (filter: string[], value?: string) => {
    if (!filter.length) return true;
    if (!value) return false;
    return filter.some(item =>
      value.toLowerCase().includes(item.toLowerCase())
    );
  }
  // 文件大小范围匹配函数
  const matchFileSizeRange = (filter: Array<string>, value: number | null) => {
    if (filter.length === 0) return true;
    if (value === null || value === undefined) return false;

    const sizeInGB = value / (1024 * 1024 * 1024);

    // 只要有一个范围匹配就返回true
    return filter.some(range => {
      switch (range) {
        case 'tiny':
          return sizeInGB < 0.5;  // 小于500MB
        case 'small':
          return sizeInGB >= 0.5 && sizeInGB < 2;  // 500MB-2GB
        case 'medium':
          return sizeInGB >= 2 && sizeInGB < 10;
        case 'large':
          return sizeInGB >= 10 && sizeInGB < 30;
        case 'xlarge':
          return sizeInGB >= 30;
        default:
          return false;
      }
    });
  }

  // 先收集所有过滤选项，再过滤数据
  if (props.items?.length) {
    // 首先收集所有过滤选项
    props.items.forEach(data => {
      initOptions(data)
    })

    // 筛选数据
    let filteredData: Collect[] = []
    // 然后根据过滤条件筛选数据
    props.items.forEach(data => {
      if (
        // 关键字过滤
        search(filterForm.keyword, data.cn_title) &&
        //过滤站点
        matchSite(filterForm.site, data.seeds) &&
        matchSiteNotInclude(filterForm.siteNotInclude, data.seeds) &&
        // 制作组过滤
        match(filterForm.releaseGroup, data.team) &&
        // 视频编码过滤
        match(filterForm.videoCode, data.video_codec) &&
        // 分辨率过滤
        match(filterForm.resolution, data.resolution) &&
        // 状态过滤
        match(filterForm.status, data.status) &&
        // 质量过滤
        match(filterForm.edition, data.hdr_format) &&
        // 媒体类型过滤
        match(filterForm.cate, data.cate) &&
        // 文件大小范围过滤
        matchFileSizeRange(filterForm.fileSizeRange, data.file_size)
      ) {
        filteredData.push(data)
      }
    })

    // 排序
    if (sortType.value === 'desc') {
      if (sortField.value === 'default') {
        filteredData = filteredData.sort((a, b) => {
          // 将日期格式转换为时间戳进行比较，避免直接对日期对象进行算术运算
          const bCreatedAt = new Date(b.created_at).getTime();
          const aCreatedAt = new Date(a.created_at).getTime();
          return bCreatedAt - aCreatedAt
        });
      } else if (sortField.value === 'size') {
        // 处理 b.file_size 和 a.file_size 可能为 null 的情况
        filteredData = filteredData.sort((a, b) => {
          const bSize = b.file_size === null ? 0 : b.file_size;
          const aSize = a.file_size === null ? 0 : a.file_size;
          return bSize - aSize;
        });
      }
    } else {
      if (sortField.value === 'default') {
        filteredData = filteredData.sort((a, b) => {
          // 将日期格式转换为时间戳进行比较，避免直接对日期对象进行算术运算
          const bCreatedAt = new Date(b.created_at).getTime();
          const aCreatedAt = new Date(a.created_at).getTime();
          return aCreatedAt - bCreatedAt
        });
      } else if (sortField.value === 'size') {
        // 处理 b.file_size 和 a.file_size 可能为 null 的情况
        filteredData = filteredData.sort((a, b) => {
          const bSize = b.file_size === null ? 0 : b.file_size;
          const aSize = a.file_size === null ? 0 : a.file_size;
          return aSize - bSize;
        });
      }
    }
    filteredDataList.value = filteredData
    // 显示前20个
    displayDataList.value = filteredData.slice(0, 20)
    // 保存剩余数据
    dataList.value = filteredData.slice(20)
  }
}

// 过滤菜单相关
const filterMenuOpen = ref(false)
const currentFilter = ref('site')
const currentFilterTitle = computed(() => filterTitles[currentFilter.value])
const currentFilterOptions = computed(() => {
  return filterOptions[currentFilter.value]
})

// 添加全部筛选菜单相关
const allFilterMenuOpen = ref(false)

// 开关全部筛选菜单
function toggleAllFilterMenu() {
  allFilterMenuOpen.value = !allFilterMenuOpen.value
}

// 给定过滤类型返回不同图标
function getFilterIcon(key: string) {
  const icons: Record<string, string> = {
    status: 'mdi-clipboard-check-outline',
    site: 'mdi-server-network',
    siteNotInclude: 'mdi-server-network-off',
    resolution: 'mdi-monitor-screenshot',
    videoCode: 'mdi-video-vintage',
    edition: 'mdi-quality-high',
    releaseGroup: 'mdi-account-group-outline',
    // 为新的过滤项添加图标
    cate: 'mdi-filmstrip',
    fileSizeRange: 'mdi-database',
  }
  return icons[key] || 'mdi-filter-variant'
}

// 全选某个过滤项
function selectAll(key: string) {
  filterForm[key] = [...filterOptions[key]]
}

// 清除某个过滤项
function clearFilter(key: string) {
  filterForm[key] = []
  if (key === 'keyword') {
    keywordClear()
  }
}

// 添加toggleFilterMenu函数
function toggleFilterMenu(key: string) {
  if (currentFilter.value === key && filterMenuOpen.value) {
    filterMenuOpen.value = false
  } else {
    currentFilter.value = key
    filterMenuOpen.value = true
  }
}

function loadMore({ done }: { done: any }) {
  // 从 dataList 中获取最前面的 20 个元素
  const itemsToMove = dataList.value.splice(0, 20)
  displayDataList.value.push(...itemsToMove)
  done('ok')
}

// 处理图标点击
const handleSortIconClick = () => {
  // 切换排序方向
  sortType.value = sortType.value === 'asc' ? 'desc' : 'asc'
}

function keywordSearch() {
  if (keyword.value) {
    filterForm.keyword = [keyword.value]
    filterOptions.keyword = [keyword.value]
  } else {
    filterForm.keyword = []
    filterOptions.keyword = []
  }
  // filterData()
}
function keywordClear() {
  keyword.value = ''
  filterForm.keyword = []
  filterOptions.keyword = []
  // filterData()
}
function remove(collect_id: number) {
  let idx = 0
  for (let i = 0; i < dataList.value.length; i++) {
    if (dataList.value[i].id === collect_id) {
      idx = i
      break
    }
  }
  dataList.value.splice(idx, 1)
  idx = 0
  for (let i = 0; i < displayDataList.value.length; i++) {
    if (displayDataList.value[i].id === collect_id) {
      idx = i
      break
    }
  }
  displayDataList.value.splice(idx, 1)

  // 从选中列表中移除
  const selectedIdx = selectedItems.value.indexOf(collect_id)
  if (selectedIdx !== -1) {
    selectedItems.value.splice(selectedIdx, 1)
  }
}

// 切换选中状态
function toggleSelect(id: number) {
  const idx = selectedItems.value.indexOf(id)
  if (idx !== -1) {
    selectedItems.value.splice(idx, 1)
  } else {
    selectedItems.value.push(id)
  }
}

// 全选/反选
function toggleSelectAll() {
  if (isAllSelected.value) {
    // 如果已全选，则取消全选
    selectedItems.value = []
  } else {
    // 全选筛选后的所有项目
    selectedItems.value = filteredDataList.value.map(item => item.id)
  }
}

// 显示删除确认对话框
function showDeleteConfirmDialog() {
  if (selectedItems.value.length === 0) {
    $toast.warning(t('collect.selectTaskBeforeDelete'))
    return
  }
  showDeleteConfirm.value = true
}

// 确认删除
async function confirmDelete() {
  // 检查是否有选中的任务
  if (!selectedItems.value || selectedItems.value.length === 0) {
    $toast.error(t('collect.selectTaskBeforeDelete'))
    showDeleteConfirm.value = false
    return
  }

  try {
    const response = await api.post('collect/batchDelete', {
      collect_ids: selectedItems.value,
      delete_file: deleteOptions.value.delete_file,
      remove_seed: deleteOptions.value.remove_seed
    })
    $toast.success(t('collect.deleteTaskSuccess'))
    // 从显示列表中移除已删除的项目
    selectedItems.value.forEach(id => {
      const idx = displayDataList.value.findIndex(item => item.id === id)
      if (idx !== -1) {
        displayDataList.value.splice(idx, 1)
      }
    })
    // 清空选中列表
    selectedItems.value = []
  } catch (error) {
    $toast.error(t('collect.deleteTaskFailed'))
    console.error('删除任务失败:', error)
  } finally {
    showDeleteConfirm.value = false
    // 重置删除选项
    deleteOptions.value = {
      delete_file: true,
      remove_seed: true
    }
  }
}
function filterSiteSeed() {
  props.items?.forEach(item => {
    item.seeds = item.seeds.filter(seed => seed.deleted === false)
  })
}

// 显示批量添加站点对话框
function showAddSiteDialogDialog() {
  if (selectedItems.value.length === 0) {
    $toast.warning(t('collect.selectTaskBeforeDelete'))
    return
  }
  selectedSites.value = []
  showAddSiteDialog.value = true
}

// 批量添加站点
async function batchAddSiteSeed() {
  if (selectedSites.value.length === 0) {
    $toast.warning('请选择至少一个站点')
    return
  }
  
  try {
    const response = await api.post('collect/batchAddSiteSeed', {
      collect_ids: selectedItems.value,
      site_list: selectedSites.value,
      next_step: addSiteOptions.value.next_step
    })
    
    if (response.success) {
      $toast.success(response.message || '批量添加站点成功')
      showAddSiteDialog.value = false
      selectedSites.value = []
      addSiteOptions.value.next_step = false
      // 刷新数据以更新站点信息
      window.location.reload()
    } else {
      $toast.error(response.message || '批量添加站点失败')
    }
  } catch (error) {
    $toast.error('批量添加站点失败')
    console.error('批量添加站点失败:', error)
  }
}

// 初始化过滤选项
onMounted(() => {
  filterSiteSeed()
  querySites()
  filterData()
})
</script>

<template>
  <div class="torrent-view">
    <!-- 搜索头部容器 - 新增，用于固定在顶部 -->
    <div class="search-header d-none d-sm-block">
      <!-- PC端页面头部和筛选栏 -->
      <VCard class="view-header task-toolbar-card mb-3">
        <div class="pa-3">
          <!-- 第一行：VChip和批量操作区域 -->
          <div class="d-flex align-center mb-2">
            <VChip color="primary" variant="flat" size="small" class="search-count" prepend-icon="mdi-magnify">
              {{ filteredDataList?.length || 0 }} {{ t('collect.resources') }}
            </VChip>
            <!-- 批量操作区域 -->
            <div class="batch-operations mr-0">
              <VBtn v-if="showSelectionControls && selectedItems.length > 0" color="success" variant="flat" size="small"
                @click="showAddSiteDialogDialog" prepend-icon="mdi-server-plus" class="ml-2">
                {{ t('collect.batchAddSite') }} ({{ selectedItems.length }})
              </VBtn>
              <VBtn v-if="showSelectionControls && selectedItems.length > 0" color="error" variant="flat" size="small"
                @click="showDeleteConfirmDialog" prepend-icon="mdi-delete" class="ml-2">
                {{ t('collect.batchDelete') }} ({{ selectedItems.length }})
              </VBtn>
              <VCheckbox v-if="showSelectionControls" v-model="isAllSelected" @change="toggleSelectAll"
                :label="t('collect.selectAll')" density="compact" hide-details class="me-2 ml-2" />
            </div>
            <VBtn variant="tonal" size="small" @click="showSelectionControls = !showSelectionControls"
              :prepend-icon="showSelectionControls ? 'mdi-checkbox-blank-off-outline' : 'mdi-checkbox-marked-outline'">
              {{ showSelectionControls ? t('collect.hideSelectionControls') : t('collect.showSelectionControls') }}
            </VBtn>
          </div>
          <!-- 第二行：筛选区域 -->
          <div class="filter-bar">
            <!-- 排序选择 -->
            <VSelect v-model="sortField"
              :items="Object.entries(sortTitles).map(([key, title]) => ({ title, value: key }))" item-title="title"
              item-value="value" density="compact" hide-details class="sort-select" variant="plain">
              <template #prepend-inner>
                <!-- 添加排序点击事件 -->
                <VIcon @mousedown.stop.prevent="handleSortIconClick">
                  {{ sortType === 'asc' ? 'mdi-sort-ascending' : 'mdi-sort-descending' }}
                </VIcon>
              </template>
            </VSelect>
            <div class="filter-divider"></div>
            <!-- 筛选按钮 -->
            <VBtn v-for="(title, key) in filterTitles" v-show="filterOptions[key].length > 0" :key="key" variant="tonal"
              size="small" :color="filterForm[key].length > 0 ? 'primary' : undefined"
              :prepend-icon="getFilterIcon(key)" class="filter-btn" rounded="pill">
              {{ title }}
              <VChip v-if="filterForm[key].length > 0" size="small" color="primary" class="ms-1" variant="elevated">
                {{ filterForm[key].length }}
              </VChip>
              <VMenu activator="parent" :close-on-content-click="false" scrim>
                <VCard max-width="20rem">
                  <VCardText class="filter-menu-content">
                    <div class="flex justify-between">
                      <VBtn variant="text" size="small" color="primary" @click="selectAll(key)">
                        {{ t('collect.selectAll') }}
                      </VBtn>
                      <VBtn v-if="filterForm[key].length > 0" variant="text" size="small" color="error"
                        @click="clearFilter(key)">
                        {{ t('collect.clear') }}
                      </VBtn>
                    </div>
                    <VChipGroup v-model="filterForm[key]" column multiple class="filter-options">
                      <VChip v-for="option in filterOptions[key]" :key="option" :value="option" filter
                        variant="elevated" class="ma-1 filter-chip" size="small">
                        {{ getFilterItemName(key, option) }}
                      </VChip>
                    </VChipGroup>
                  </VCardText>
                </VCard>
              </VMenu>
            </VBtn>

            <!-- 全部筛选按钮 -->
            <VBtn variant="tonal" size="small" color="primary" class="filter-btn me-2" prepend-icon="mdi-filter-variant"
              rounded="pill" @click="toggleAllFilterMenu">
              {{ t('collect.allFilters') }}
              <VChip v-if="getFilterCount > 0" size="small" color="primary" class="ms-1" variant="elevated">
                {{ getFilterCount }}
              </VChip>
            </VBtn>

            <!-- 清除全部筛选按钮 -->
            <VBtn v-if="getFilterCount > 0" variant="text" size="small" color="error" @click="clearAllFilters"
              class="filter-btn" prepend-icon="mdi-close-circle-outline">
              {{ t('collect.clearFilters') }}
            </VBtn>
          </div>

        </div>
        <div class="search-bar">
          <VTextField v-model="keyword" :label="filterTitles.keyword" :placeholder="t('collect.searchHint')"
            append-inner-icon="mdi-close" prepend-inner-icon="mdi-magnify" density="compact" variant="solo" hide-details
            single-line class="task-search-field" @click:append-inner="keywordClear" @blur="keywordSearch"
            @keyup.enter="keywordSearch" />
        </div>
        <!-- 已选择的过滤项显示 -->
        <div v-if="getFilterCount > 0" class="selected-filters">
          <div class="d-flex flex-wrap align-center">
            <template v-for="(values, key) in getSelectedFilters" :key="key">
              <VChip v-for="(value, index) in values" :key="`${key}-${index}`" color="primary" size="small" closable
                variant="elevated" class="me-1 mb-1 mt-1 filter-tag" @click:close="removeFilter(key, value)">
                <VIcon size="small" :icon="getFilterIcon(key)" class="me-1"></VIcon>
                <strong>{{ filterTitles[key] }}:</strong> {{ getFilterItemName(key, value) }}
              </VChip>
            </template>
          </div>
        </div>
      </VCard>
    </div>

    <!-- 移动端头部和筛选区域 -->
    <VCard class="d-block d-sm-none search-header-mobile task-toolbar-card mb-3">
      <!-- 移动端头部 -->
      <div class="view-header">
        <div class="d-flex align-center flex-wrap pa-2">
          <div class="d-flex align-center w-100">
            <VChip color="primary" variant="elevated" size="small" class="search-count me-auto"
              prepend-icon="mdi-magnify">
              {{ filteredDataList?.length || 0 }} {{ t('collect.resources') }}
            </VChip>

            <!-- 排序选择 -->
            <VSelect v-model="sortField"
              :items="Object.entries(sortTitles).map(([key, title]) => ({ title, value: key }))" item-title="title"
              item-value="value" density="compact" hide-details class="mobile-sort-select" variant="plain">
              <template #prepend-inner>
                <!-- 添加排序点击事件 -->
                <VIcon @mousedown.stop.prevent="handleSortIconClick">
                  {{ sortType === 'asc' ? 'mdi-sort-ascending' : 'mdi-sort-descending' }}
                </VIcon>
              </template>
            </VSelect>
          </div>

          <!-- 批量操作区域 - 移动端 -->
          <div class="batch-operations-mobile w-100">
            <div class="d-flex justify-between align-center">

              <div class="d-flex">
                <VCheckbox v-if="showSelectionControls" v-model="isAllSelected" @change="toggleSelectAll"
                  :label="t('collect.selectAll')" density="compact" hide-details class="me-2" />
                <VBtn v-if="showSelectionControls && selectedItems.length > 0" color="success" variant="flat" size="small"
                  @click="showAddSiteDialogDialog" prepend-icon="mdi-server-plus" class="mr-1">
                  {{ t('collect.addSite') }}
                </VBtn>
                <VBtn v-if="showSelectionControls && selectedItems.length > 0" color="error" variant="flat" size="small"
                  @click="showDeleteConfirmDialog" prepend-icon="mdi-delete">
                  {{ t('collect.deleteSelected') }}({{ selectedItems.length }})
                </VBtn>
              </div>
              <VBtn variant="tonal" size="small" @click="showSelectionControls = !showSelectionControls"
                :prepend-icon="showSelectionControls ? 'mdi-checkbox-blank-off-outline' : 'mdi-checkbox-marked-outline'">
                {{ showSelectionControls ? t('collect.hideSelectionControls') : t('collect.showSelectionControls') }}
              </VBtn>
            </div>
          </div>

          <!-- 移动端筛选操作 -->
          <div class="mobile-filter-actions w-100 mt-2">
            <VBtn variant="tonal" color="primary" class="mobile-filter-btn" prepend-icon="mdi-filter-variant"
              @click="toggleAllFilterMenu">
              {{ t('collect.allFilters') }}
              <VChip v-if="getFilterCount > 0" size="x-small" color="primary" class="ms-2" variant="flat">
                {{ getFilterCount }}
              </VChip>
            </VBtn>
            <VBtn v-if="getFilterCount > 0" variant="text" color="error" class="mobile-filter-clear"
              prepend-icon="mdi-close-circle-outline" @click="clearAllFilters">
              {{ t('collect.clearFilters') }}
            </VBtn>
          </div>
        </div>
        <div class="search-bar">
          <VTextField v-model="keyword" :label="filterTitles.keyword" :placeholder="t('collect.searchHint')"
            append-inner-icon="mdi-close" prepend-inner-icon="mdi-magnify" density="compact" variant="solo" hide-details
            single-line class="task-search-field" @click:append-inner="keywordClear" @blur="keywordSearch"
            @keyup.enter="keywordSearch" />
        </div>
      </div>
    </VCard>

    <!-- 全部筛选弹窗 -->
    <VDialog v-model="allFilterMenuOpen" max-width="50rem" location="center" scrollable
      :fullscreen="!display.mdAndUp.value">
      <VCard>
        <VDialogCloseBtn @click="allFilterMenuOpen = false" />
        <VCardTitle class="py-3 d-flex align-center">
          <VIcon icon="mdi-filter-variant" class="me-2"></VIcon>
          <span>{{ t('collect.allFilters') }}</span>
          <VSpacer />
          <VBtn v-if="getFilterCount > 0" class="me-10" variant="text" size="small" color="error"
            @click="clearAllFilters">
            {{ t('collect.clearAll') }}
          </VBtn>
        </VCardTitle>
        <VDivider />
        <VCardText>
          <div class="all-filters-grid">
            <VCard v-for="(title, key) in filterTitles" variant="tonal" :key="key" class="filter-section"
              v-show="filterOptions[key].length > 0">
              <VCardItem class="py-2">
                <template #prepend>
                  <VIcon :icon="getFilterIcon(key)" class="me-2"></VIcon>
                </template>
                <VCardTitle>{{ title }}</VCardTitle>
                <template #append>
                  <VBtn variant="text" size="small" color="primary" @click="selectAll(key)">
                    {{ t('collect.selectAll') }}
                  </VBtn>
                  <VBtn v-if="filterForm[key].length > 0" variant="text" size="small" color="error"
                    @click="clearFilter(key)">
                    {{ t('collect.clear') }}
                  </VBtn>
                </template>
              </VCardItem>
              <VCardText>
                <VChipGroup v-model="filterForm[key]" column multiple class="filter-options">
                  <VChip v-for="option in filterOptions[key]" :key="option" :value="option" filter variant="elevated"
                    class="ma-1 filter-chip" size="small">
                    {{ getFilterItemName(key, option) }}
                  </VChip>
                </VChipGroup>
              </VCardText>
            </VCard>
          </div>
        </VCardText>
      </VCard>
    </VDialog>

    <!-- 筛选弹窗 -->
    <VDialog v-model="filterMenuOpen" max-width="25rem" max-height="85vh" location="center">
      <VCard>
        <VCardTitle class="py-3 d-flex align-center">
          <VIcon :icon="getFilterIcon(currentFilter)" class="me-2"></VIcon>
          <span>{{ currentFilterTitle }}</span>
          <VSpacer />
          <VBtn v-if="filterForm[currentFilter].length > 0" variant="text" size="small" color="error"
            @click="clearFilter(currentFilter)">
            {{ t('collect.clear') }}
          </VBtn>
          <VBtn variant="text" size="small" color="primary" @click="selectAll(currentFilter)">
            {{ t('collect.selectAll') }}
          </VBtn>
        </VCardTitle>
        <VDivider />
        <VCardText>
          <VChipGroup v-model="filterForm[currentFilter]" column multiple class="filter-options">
            <VChip v-for="option in currentFilterOptions" :key="option" :value="option" filter variant="elevated"
              class="ma-1 filter-chip" size="small">
              {{ getFilterItemName(currentFilter, option) }}
            </VChip>
          </VChipGroup>
        </VCardText>
        <VCardActions>
          <VSpacer />
          <VBtn color="primary" prepend-icon="mdi-check" class="px-5" @click="filterMenuOpen = false">
            {{ t('collect.confirm') }}
          </VBtn>
        </VCardActions>
      </VCard>
    </VDialog>

    <!-- 资源列表容器 -->
    <VCard class="resource-list-container">
      <!-- 无结果时显示 -->
      <div v-if="displayDataList.length === 0" class="no-results">
        <VIcon icon="mdi-file-search-outline" size="64" color="grey-lighten-1" />
        <div class="text-h6 text-grey mt-4">{{ t('collect.noData') }}</div>
      </div>
      <!-- 资源列表 -->
      <VInfiniteScroll v-else mode="intersect" side="end" :items="displayDataList"
        class="resource-list overflow-visible" @load="loadMore">
        <template #loading />
        <template #empty />
        <div v-for="(item, index) in displayDataList" :key="item.id" 
             class="resource-item-container"
             :class="{ 'selected': selectedItems.includes(item.id) }">
          <div class="selection-checkbox" v-if="showSelectionControls" 
               @click.stop="toggleSelection(item.id)">
            <VIcon v-if="selectedItems.includes(item.id)" color="white" size="16">mdi-check</VIcon>
          </div>
          <div class="task-content">
            <TaskItem :task="item" :key="item.id" @remove="remove" />
          </div>
          <VDivider v-if="index < displayDataList.length - 1" class="my-2" />
        </div>
      </VInfiniteScroll>
    </VCard>

    <!-- 批量删除确认对话框 -->
    <VDialog v-model="showDeleteConfirm" max-width="500px" location="center">
      <VCard>
        <VCardTitle class="text-error">
          <VIcon icon="mdi-alert-circle-outline" class="me-2"></VIcon>
          {{ t('collect.deleteConfirm') }}
        </VCardTitle>
        <VDivider />
        <VCardText>
          <div class="mb-4">
            <p class="mb-2">{{ t('collect.selectedTasks') }}: {{ selectedItems.length }}</p>
            <div class="selected-tasks-list max-h-48 overflow-y-auto">
              <div v-for="id in selectedItems.slice(0, 10)" :key="id"
                class="task-item-ellipsis d-flex items-center gap-2">
                <span class="flex-1 min-w-0 text-ellipsis overflow-hidden">
                  {{ displayDataList.find((item: any) => item.id === id)?.cn_title || `ID: ${id}` }}
                  {{ displayDataList.find((item: any) => item.id === id)?.year ? ` (${displayDataList.find((item: any) => item.id === id)?.year})` : '' }}
                  <span v-if="displayDataList.find((item: any) => item.id === id)?.season" class="text-primary">
                    S{{ String(displayDataList.find((item: any) => item.id === id)?.season).padStart(2, '0') }}
                  </span>
                  <span v-if="displayDataList.find((item: any) => item.id === id)?.episodes" class="text-success">
                    E{{ displayDataList.find((item: any) => item.id === id)?.episodes }}
                  </span>
                </span>
                <VIcon icon="mdi-close-circle"
                  class="text-error cursor-pointer hover:opacity-70 transition-opacity flex-shrink-0"
                  @click.stop="removeSelectedItem(id)" :title="t('collect.removeFromSelection')"></VIcon>
              </div>
              <div v-if="selectedItems.length > 10" class="text-grey">
                {{ t('collect.moreTasks', { count: selectedItems.length }) }}
              </div>
            </div>
          </div>
          <VCheckbox v-model="deleteOptions.remove_seed" :label="t('collect.removeSeed')" color="error" />
          <VCheckbox v-model="deleteOptions.delete_file" :label="t('collect.deleteFile')" color="error" />
        </VCardText>
        <VCardActions>
          <VBtn @click="showDeleteConfirm = false">{{ t('collect.cancel') }}</VBtn>
          <VBtn color="error" @click="confirmDelete">{{ t('collect.delete') }}</VBtn>
        </VCardActions>
      </VCard>
    </VDialog>

    <!-- 批量增加站点对话框 -->
    <VDialog v-model="showAddSiteDialog" max-width="600px" location="center">
      <VCard>
        <VCardTitle class="d-flex align-center">
          <VIcon icon="mdi-server-plus" class="me-2" color="success"></VIcon>
          {{ t('collect.batchAddSite') }}
        </VCardTitle>
        <VDivider />
        <VCardText>
          <!-- 已选任务列表 -->
          <div class="mb-4">
            <div class="text-subtitle-2 mb-2">{{ t('collect.selectedTasks') }} ({{ selectedItems.length }})</div>
            <div class="selected-tasks-list max-h-48 overflow-y-auto">
              <div v-for="id in selectedItems" :key="id"
                class="task-item-ellipsis d-flex items-center gap-2 py-1">
                <span class="flex-1 min-w-0 text-ellipsis overflow-hidden">
                  {{ displayDataList.find((item: any) => item.id === id)?.cn_title || `ID: ${id}` }}
                  {{ displayDataList.find((item: any) => item.id === id)?.year ? ` (${displayDataList.find((item: any) => item.id === id)?.year})` : '' }}
                  <span v-if="displayDataList.find((item: any) => item.id === id)?.season" class="text-primary">
                    S{{ String(displayDataList.find((item: any) => item.id === id)?.season).padStart(2, '0') }}
                  </span>
                  <span v-if="displayDataList.find((item: any) => item.id === id)?.episodes" class="text-success">
                    E{{ displayDataList.find((item: any) => item.id === id)?.episodes }}
                  </span>
                </span>
                <VIcon icon="mdi-close-circle"
                  class="text-error cursor-pointer hover:opacity-70 transition-opacity flex-shrink-0"
                  @click.stop="removeSelectedItem(id)" :title="t('collect.removeFromSelection')"></VIcon>
              </div>
            </div>
          </div>
          
          <!-- 站点选择 -->
          <div class="mt-4">
            <div class="text-subtitle-2 mb-2">{{ t('collect.selectSite') }}</div>
            <VChipGroup v-model="selectedSites" multiple column>
              <VChip v-for="site in allSites" :key="site.id" 
                     :value="site.id" filter variant="outlined" size="small">
                {{ site.name }}
              </VChip>
            </VChipGroup>
          </div>
          
          <!-- 自动发布选项 -->
          <VCheckbox v-model="addSiteOptions.next_step" :label="t('collect.autoPublish')" density="compact" class="mt-4" />
        </VCardText>
        <VCardActions>
          <VBtn @click="showAddSiteDialog = false">{{ t('collect.cancel') }}</VBtn>
          <VBtn color="success" @click="batchAddSiteSeed" :disabled="selectedSites.length === 0 || selectedItems.length === 0">
            {{ t('collect.confirm') }}
          </VBtn>
        </VCardActions>
      </VCard>
    </VDialog>
  </div>
</template>
<style scoped>
.torrent-view {
  position: relative;
  block-size: 100%;
}

.search-header {
  position: sticky;
  z-index: 11;
  backdrop-filter: blur(10px);
  inset-block-start: 0;
}

.search-header-mobile {
  position: relative;
  z-index: 1;
  backdrop-filter: none;
}

.task-toolbar-card {
  overflow: hidden;
  border: 1px solid rgba(var(--v-theme-on-surface), 0.08);
  border-radius: 14px;
  background: rgb(var(--v-theme-surface));
  box-shadow: 0 1px 4px rgba(0, 0, 0, 3%);
}

.view-header {
  overflow: hidden;
}

.search-count {
  font-weight: 600;
  letter-spacing: 0.1px;
}

.search-bar {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 4px;
  padding-block: 0 12px;
  padding-inline: 12px;
}

.task-search-field {
  inline-size: 100%;
}

.task-search-field :deep(.v-field) {
  border: 1px solid rgba(var(--v-theme-on-surface), 0.1);
  border-radius: 12px;
  background-color: rgb(var(--v-theme-surface));
  box-shadow: none;
}

.task-search-field :deep(.v-field--focused) {
  border-color: rgba(var(--v-theme-primary), 0.35);
  box-shadow: 0 0 0 1px rgba(var(--v-theme-primary), 0.1);
}

.filter-bar {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 6px;
}

.filter-divider {
  background-color: rgba(var(--v-theme-on-surface), 0.12);
  block-size: 24px;
  inline-size: 1px;
  margin-block: 0;
  margin-inline: 8px;
}

.filter-btn {
  min-inline-size: 0;
}

.filter-menu-content {
  max-block-size: 50vh;
  overflow-y: auto;
}

.filter-options {
  display: flex;
  flex-wrap: wrap;
}

.filter-chip {
  border: 1px solid rgba(var(--v-theme-primary), 0.2);
  margin: 4px;
  background-color: rgba(var(--v-theme-primary), 0.07) !important;
  color: rgba(var(--v-theme-on-surface), 0.9) !important;
  font-weight: 500;
}

.filter-chip.v-chip--selected {
  background-color: rgba(var(--v-theme-primary), 0.8) !important;
  color: rgb(var(--v-theme-on-primary)) !important;
  font-weight: 600;
}

.filter-tag {
  font-weight: 500;
}

.selected-filters {
  overflow: hidden;
  border-block-start: 1px solid rgba(var(--v-theme-on-surface), 0.06);
  background-color: rgba(var(--v-theme-surface-variant), 0.08);
  padding-block: 8px;
  padding-inline: 12px;
}

.batch-operations {
  display: flex;
  align-items: center;
  margin-inline: auto;
}

.resource-list-container {
  border-radius: 14px;
  border: 1px solid rgba(var(--v-theme-on-surface), 0.08);
  background-color: rgb(var(--v-theme-surface));
  box-shadow: 0 1px 4px rgba(0, 0, 0, 2%);
  padding: 10px;
}

.resource-list {
  display: flex;
  flex-direction: column;
  gap: 8px;
}


.resource-item-container {
  position: relative;
  inline-size: 100%;
  border-radius: 12px;
  transition: all 0.2s ease;
}

.resource-item-container.selected .task-content {
  border-left: 3px solid rgb(var(--v-theme-success));
  margin-left: -3px;
  background-color: rgba(var(--v-theme-success), 0.03);
  border-radius: 12px;
}

.selection-checkbox {
  position: absolute;
  z-index: 10;
  inset-block-start: 10px;
  inset-inline-start: 10px;
  width: 22px;
  height: 22px;
  display: flex;
  align-items: center;
  justify-content: center;
  background-color: rgba(var(--v-theme-surface), 0.9);
  border: 2px solid rgba(var(--v-theme-on-surface), 0.3);
  border-radius: 4px;
  transition: all 0.2s ease;
  cursor: pointer;
}

.resource-item-container.selected .selection-checkbox {
  background-color: rgb(var(--v-theme-success));
  border-color: rgb(var(--v-theme-success));
}

.task-content {
  box-sizing: border-box;
  flex: 1;
  inline-size: 100%;
}

.task-content .torrent-item {
  box-sizing: border-box;
  inline-size: 100%;
}

.selected-tasks-list {
  padding: 8px;
  border: 1px solid rgba(var(--v-theme-on-surface), 0.1);
  border-radius: 8px;
  background-color: rgba(var(--v-theme-surface-variant), 0.05);
  max-block-size: 200px;
  overflow-y: auto;
  scrollbar-color: rgba(var(--v-theme-primary), 0.3) transparent;
  scrollbar-width: thin;
}

.selected-tasks-list::-webkit-scrollbar {
  inline-size: 6px;
}

.selected-tasks-list::-webkit-scrollbar-track {
  background: transparent;
}

.selected-tasks-list::-webkit-scrollbar-thumb {
  border-radius: 3px;
  background-color: rgba(var(--v-theme-primary), 0.3);
}

.task-item-ellipsis {
  overflow: hidden;
  padding-block: 2px;
  padding-inline: 0;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.no-results {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  min-block-size: 300px;
  color: rgba(var(--v-theme-on-surface), 0.68);
}

.mobile-filter-actions {
  display: flex;
  align-items: center;
  gap: 8px;
}

.mobile-filter-btn {
  flex: 1;
  justify-content: center;
}

.mobile-filter-clear {
  flex-shrink: 0;
}

.batch-operations-mobile {
  display: flex;
  flex-direction: column;
  padding: 6px 8px;
  border: 1px solid rgba(var(--v-theme-on-surface), 0.08);
  border-radius: 10px;
  background-color: rgba(var(--v-theme-surface-variant), 0.05);
  gap: 6px;
  margin-block-start: 8px;
}

.batch-operations-mobile .d-flex {
  align-items: center;
  justify-content: space-between;
}

.mobile-sort-select {
  max-inline-size: 130px;
  min-inline-size: 80px;
}

@media (width <=600px) {
  .search-header {
    position: relative;
    backdrop-filter: none;
  }

  .resource-list-container {
    border-radius: 12px;
    padding: 8px;
  }
}

.all-filters-grid {
  display: grid;
  gap: 24px;
  grid-template-columns: repeat(auto-fit, minmax(300px, 1fr));
}

.filter-section {
  background-color: rgba(var(--v-theme-surface-variant), 0.08);
}
</style>
