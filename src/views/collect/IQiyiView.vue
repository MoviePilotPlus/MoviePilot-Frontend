<script setup lang="ts">
// @ts-nocheck
import api from '@/api'
import { ref, reactive, computed, watch, onMounted } from 'vue'
import type { CategoryInfo, CategoryItem } from '@/api/types'
import { default as MediaCardListView } from '@/views/collect/MediaCardListView.vue'
import { default as MediaSearchView } from '@/views/collect/MediaSearchView.vue'


// 排序 类型 资费 出品 地区 年份 状态 画风 年龄 全部 性别 语言  动画明星 剧场 奖项 其他-characteristic
// 电影或者电视剧 movies/tvs
const type = ref('1009')
// 当前Key
const currentKey = ref(0)

const cates = ref<Record<string, CategoryInfo[]>>({
  // 初始化一个空对象，实际数据会通过 API 获取
})
const showMoreFilters = ref(false)
const cateEntries = computed(() => Object.entries(cates.value))
const visibleCateEntries = computed(() => (showMoreFilters.value ? cateEntries.value : cateEntries.value.slice(0, 3)))
const hiddenFilterCount = computed(() => Math.max(cateEntries.value.length - 3, 0))
// 搜索词
const searchWord = ref<string | null>(null)
const isSearch = ref(false)


// 过滤参数
const defaultType = '1009'
const defaultSort = ''
const cate = ref('TV')

// 存储每个组的选中值
const groupSelections = reactive<Record<string, string>>({})

// 根据组的选中值计算 filterParams
const filterParams = computed(() => {
  const params: Record<string, string> = {
    'type': type.value,
    "mode": '24',
    "three_category_id_v2": '',
    "market_release_date_level": '',
    "smart_tag": '',
    "smart_tag_v2": '',
    "structure_id": '',
    "is_purchase": '',
    "is_album_finished": '',
    "is_limit_free": '',
    "is_exclusive": '',
    "is_qiyi_produced": '',
    "charge_control_paymark": '',
  }

  // 遍历所有组的选中值
  Object.entries(groupSelections).forEach(([groupKey, selectedValue]) => {
    // 确保该组存在并且选中值不为空
    if (cates.value[groupKey] && selectedValue) {
      // 找到对应的选项
      const selectedOption = cates.value[groupKey].find(option => option.option_value === selectedValue)
      if (selectedOption && selectedOption.filter_key) {

        // 处理 option_value 中包含逗号的情况，如 "1_1_1,is_purchase=1"
        if (selectedOption.option_value.indexOf(',') !== -1) {
          const originalOptionValue = selectedOption.option_value
          const mainValue = originalOptionValue.split(',')[0]

          // 设置主参数
          params[selectedOption.filter_key] = mainValue

          // 处理逗号后的所有部分，这些是其他 filter_params 的键值对
          const otherParams = originalOptionValue.split(',').slice(1)
          otherParams.forEach(param => {
            const [paramKey, paramValue] = param.split('=')
            if (paramKey && paramValue && paramKey in params) {
              params[paramKey] = paramValue
            }
          })
        } else {
          // 直接设置参数
          params[selectedOption.filter_key] = selectedValue
        }
      }
    }
  })

  return params
})

// 分类字典
const cateDictArray: CategoryItem[] = [
  { "value": "全部", "key": "1009", "cate": "TV" },
  { "value": "电视剧", "key": "2", "cate": "TV" },
  { "value": "电影", "key": "1", "cate": "Movie" },
  { "value": "综艺", "key": "6", "cate": "Show" },
  { "value": "动漫", "key": "4", "cate": "Comic" },
  { "value": "少儿", "key": "15", "cate": "Movie" },
  { "value": "纪录片", "key": "3", "cate": "Documentary" },
  { "value": "微剧", "key": "35", "cate": "TV" }
]
// 分类信息
async function queryCate(type: string) {
  try {
    const data: CategoryInfo[] = await api.get('iqiyi/category', {
      params: {
        type: type
      }
    })
    cateDictArray.forEach(item => {
      if (item.key == type) {
        cate.value = item.cate
      }
    })

    const groupedData: Record<string, CategoryInfo[]> = {};
    data.forEach((item: CategoryInfo) => {
      const filter_key = item.index_name;
      if (!groupedData[filter_key]) {
        groupedData[filter_key] = [];
      }
      groupedData[filter_key].push(item);
    });

    cates.value = groupedData;
    console.log('cates.value', cates.value)
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
// 当组选择变化时，更新currentKey以触发数据刷新
watch(groupSelections, () => {
  currentKey.value++
}, { deep: true })

// 检查选项是否被选中
function isOptionSelected(option: CategoryInfo, groupKey: string): boolean {
  return groupSelections[groupKey] === option.option_value
}

// 获取芯片颜色
function getChipColor(option: CategoryInfo, groupKey: string): string {
  return isOptionSelected(option, groupKey) ? 'primary' : ''
}
onMounted(() => {
  queryCate(defaultType)
})
// 类型变化
watch(type, () => {
  // 类型变化时，清空所有组的选中值
  Object.keys(groupSelections).forEach(key => {
    delete groupSelections[key]
  })

  queryCate(type.value)
  showMoreFilters.value = false
  currentKey.value++
})


</script>

<template>
  <div class="collect-source-view">
    <div class="collect-toolbar px-3 flex justify-start align-center">
      <VCombobox ref="searchWordInput" v-model="searchWord" density="comfortable" variant="outlined"
        class="search-input" prepend-inner-icon="mdi-magnify" append-inner-icon="mdi-close"
        @click:append-inner="searchClear()" placeholder="搜索爱奇艺" @keydown.enter="searchMedia()" hide-details />
    </div>
    <div class="collect-filter-panel px-3" v-show="!isSearch">
      <div class="collect-chip-row flex justify-start align-center">
        <VChipGroup v-model="type" column mandatory class="collect-chip-group">
          <!-- 遍历数组 -->
          <VChip :color="type == item.key ? 'primary' : ''" class="collect-filter-chip" tile :value="item.key" size="small"
            v-for="item in cateDictArray" :key="item.key">
            {{ item.value }}
          </VChip>
        </VChipGroup>
      </div>
      <div class="collect-chip-row flex justify-start align-center" v-for="[key, item] in visibleCateEntries" :key="key">
        <VChipGroup v-model="groupSelections[key]" column mandatory class="collect-chip-group">
          <VChip :color="getChipColor(option, key)" class="collect-filter-chip" tile :value="option.option_value" v-for="option in item"
            :key="option.option_name + option.option_value" size="small">
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
      <MediaSearchView v-if="isSearch" :key="currentKey" :apipath="`iqiyi/search`" :keyword="searchWord || ''"
        :cate="cate" />
      <MediaCardListView v-show="!isSearch" :key="currentKey" :apipath="`iqiyi/page_data`" :params="filterParams"
        :first-page="1" :cate="cate" />
    </div>
  </div>
</template>
<style scoped>
.collect-toolbar {
  margin-bottom: 10px;
}

.search-input {
  width: 100%;
  max-width: 560px;
}

:deep(.search-input .v-field) {
  border-radius: 12px;
  background: rgba(var(--v-theme-surface), 0.94);
  transition: box-shadow 0.2s ease, background-color 0.2s ease;
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
  min-height: 40px;
  font-size: 14px;
}

.collect-filter-panel {
  border: 1px solid rgba(var(--v-theme-on-surface), 0.08);
  border-radius: 12px;
  background: rgba(var(--v-theme-surface), 0.92);
  padding-block: 10px 8px;
}

.collect-chip-row + .collect-chip-row {
  margin-top: 6px;
}

.collect-filter-toggle-row {
  margin-top: 4px;
  margin-bottom: 2px;
}

.collect-filter-toggle {
  padding-inline: 4px;
  text-transform: none;
  font-size: 12px;
  color: rgba(var(--v-theme-primary), 0.85);
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
