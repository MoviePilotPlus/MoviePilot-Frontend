<script setup lang="ts">
// @ts-nocheck
import api from '@/api'
import { ref, reactive, watch, onMounted, computed } from 'vue'
import type { CategoryInfo, CategoryItem } from '@/api/types'
import { default as MediaCardListView } from '@/views/collect/MediaCardListView.vue'
import { default as MediaSearchView } from '@/views/collect/MediaSearchView.vue'
import { VTextField } from 'vuetify/components'

// 排序 类型 资费 出品 地区 年份 状态 画风 年龄 全部 性别 语言  动画明星 剧场 奖项 其他-characteristic
// 电影或者电视剧 movies/tvs
const type = ref('1')
// 当前Key
const currentKey = ref(0)

const cates = ref<Record<string, CategoryInfo[]>>({})
const showMoreFilters = ref(false)
const cateEntries = computed(() => Object.entries(cates.value))
const visibleCateEntries = computed(() => (showMoreFilters.value ? cateEntries.value : cateEntries.value.slice(0, 3)))
const hiddenFilterCount = computed(() => Math.max(cateEntries.value.length - 3, 0))
// 搜索词
const searchWord = ref<string | null>(null)
const isSearch = ref(false)

// 根据当前分类类型动态计算网格布局类
const gridClass = computed(() => {
  return type.value === '1' ? 'grid-media-card--landscape' : ''
})

// 过滤参数
const defaultType = '1'
const defaultSort = 'c2'
const cate = ref('TV')

const filterParams = reactive({
  'kind': '',
  'chargeInfo': '',
  'area': '',
  'feature': '',
  'year': '',
  'fitAge': '',
  'edition': '',
  'type': defaultType,
  'sort': defaultSort,
})

// 分类字典
const cateDictArray: CategoryItem[] = [
  { 'key': '1', 'value': '综艺', 'cate': 'Show' },
  { 'key': '2', 'value': '电视剧', 'cate': 'TV' },
  { 'key': '3', 'value': '电影', 'cate': 'Movie' },
  { 'key': '10', 'value': '少儿', 'cate': 'TV' },
  { 'key': '51', 'value': '纪录片', 'cate': 'Documentary' },
  { 'key': '50', 'value': '动漫', 'cate': 'Comic' },
  { 'key': '115', 'value': '教育', 'cate': 'Others' },
]
// 分类信息
async function queryCate(type: string) {
  try {
    const data: CategoryInfo[] = await api.get('mgtv/category', {
      params: {
        type: type,
      },
    })
    cateDictArray.forEach(item => {
      if (item.key == type) {
        cate.value = item.cate
      }
    })

    const groupedData: Record<string, CategoryInfo[]> = {}
    data.forEach((item: CategoryInfo) => {
      const filter_key = item.filter_key
      if (!groupedData[filter_key]) {
        groupedData[filter_key] = []
      }
      groupedData[filter_key].push(item)
    })

    cates.value = groupedData
  } catch (error) {
    console.log(error)
  }
}
function searchMedia() {
  isSearch.value = true
}
function searchClear() {
  searchWord.value = null
  isSearch.value = false
}
onMounted(() => {
  queryCate(defaultType)
})
// 类型变化
watch(type, () => {
  filterParams.type = type.value
  queryCate(type.value)
  showMoreFilters.value = false
  currentKey.value++
})

// 过滤参数变化
watch(filterParams, () => {
  if (!filterParams.sort) {
    filterParams.sort = 'c2'
  }
  if (!filterParams.type) {
    filterParams.type = '1'
  }
  currentKey.value++
})
</script>

<template>
  <div class="collect-source-view">
    <div class="collect-toolbar px-3 flex justify-start align-center">
      <VCombobox
        ref="searchWordInput"
        v-model="searchWord"
        density="comfortable"
        variant="outlined"
        class="search-input"
        prepend-inner-icon="mdi-magnify"
        append-inner-icon="mdi-close"
        @click:append-inner="searchClear()"
        placeholder="搜索芒果TV视频"
        @keydown.enter="searchMedia()"
        hide-details
      />
    </div>
    <div class="collect-filter-panel px-3" v-show="!isSearch">
      <div class="collect-chip-row flex justify-start align-center">
        <VChipGroup v-model="type" column mandatory class="collect-chip-group">
          <!-- 遍历数组 -->
          <VChip
            :color="type == item.key ? 'primary' : ''"
            class="collect-filter-chip"
            tile
            :value="item.key"
            size="small"
            v-for="item in cateDictArray"
            :key="item.key"
          >
            {{ item.value }}
          </VChip>
        </VChipGroup>
      </div>
      <div
        class="collect-chip-row flex justify-start align-center"
        v-for="[key, item] in visibleCateEntries"
        :key="key"
      >
        <VChipGroup
          v-model="filterParams[key as keyof typeof filterParams]"
          column
          mandatory
          class="collect-chip-group"
        >
          <VChip
            :color="filterParams[key as keyof typeof filterParams] == option.option_value ? 'primary' : ''"
            class="collect-filter-chip"
            tile
            :value="option.option_value"
            v-for="option in item"
            :key="option.option_value"
            size="small"
          >
            {{ option.option_name }}
          </VChip>
        </VChipGroup>
      </div>
      <div v-if="hiddenFilterCount > 0" class="collect-filter-toggle-row">
        <VBtn variant="text" size="small" class="collect-filter-toggle" @click="showMoreFilters = !showMoreFilters">
          {{ showMoreFilters ? '收起筛选' : `更多筛选（+${hiddenFilterCount}项）` }}
        </VBtn>
      </div>
    </div>

    <div class="pt-3">
      <MediaSearchView
        v-if="isSearch"
        :key="currentKey"
        :apipath="`mgtv/search`"
        :keyword="searchWord || ''"
        :cate="cate"
        :grid-class="gridClass"
      />
      <MediaCardListView
        v-show="!isSearch"
        :key="currentKey"
        :apipath="`mgtv/page_data`"
        :params="filterParams"
        :cate="cate"
        :first-page="1"
        :grid-class="gridClass"
      />
    </div>
  </div>
</template>
<style scoped>
.collect-toolbar {
  margin-block-end: 10px;
}

.search-input {
  inline-size: 100%;
  max-inline-size: 560px;
}

:deep(.search-input .v-field) {
  border-radius: 12px;
  background: rgba(var(--v-theme-surface), 0.94);
  transition:
    box-shadow 0.2s ease,
    background-color 0.2s ease;
}

:deep(.search-input .v-field .v-field__outline) {
  --v-field-border-opacity: 0.22;
}

:deep(.search-input .v-field:hover) {
  background: rgba(var(--v-theme-surface), 0.94);
}

:deep(.search-input .v-field:hover .v-field__outline) {
  --v-field-border-opacity: 0.28;
}

:deep(.search-input .v-field.v-field--focused) {
  box-shadow: 0 0 0 2px rgba(var(--v-theme-primary), 0.12);
}

:deep(.search-input .v-field.v-field--focused .v-field__outline) {
  --v-field-border-opacity: 0.42;
}

:deep(.search-input .v-field__input) {
  font-size: 14px;
  min-block-size: 40px;
}

.collect-filter-panel {
  border: 1px solid rgba(var(--v-theme-on-surface), 0.08);
  border-radius: 12px;
  background: rgba(var(--v-theme-surface), 0.92);
  padding-block: 10px 8px;
}

.collect-chip-row + .collect-chip-row {
  margin-block-start: 6px;
}

.collect-filter-toggle-row {
  margin-block: 4px 2px;
}

.collect-filter-toggle {
  color: rgba(var(--v-theme-primary), 0.85);
  font-size: 12px;
  padding-inline: 4px;
  text-transform: none;
}

.collect-chip-group {
  gap: 6px;
}

.collect-filter-chip {
  border: 1px solid rgba(var(--v-theme-primary), 0.16);
  border-radius: 999px !important;
  transition: transform 0.2s ease;
}

.collect-filter-chip:hover {
  transform: translateY(-1px);
}
</style>
