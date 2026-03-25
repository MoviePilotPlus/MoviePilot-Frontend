<script setup lang="ts">
// @ts-nocheck
import api from '@/api'
import { ref, reactive, watch, onMounted, computed } from 'vue'
import type { CategoryInfo, CategoryItem } from '@/api/types'
import { default as MediaCardListView } from '@/views/collect/MediaCardListView.vue'
import { default as MediaSearchView } from '@/views/collect/MediaSearchView.vue'
import { VTextField, VDialog, VCard, VCardTitle, VCardText, VCardActions, VBtn, VIcon, VImg } from 'vuetify/components'

// 排序 类型 资费 出品 地区 年份 状态 画风 年龄 全部 性别 语言  动画明星 剧场 奖项 其他-characteristic
// 电影或者电视剧 movies/tvs
const type = ref('电视剧')
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

// 用户信息
const userInfo = ref({ is_login: false });
const loginDialogVisible = ref(false);
const loginStep = ref('qr-code');
const qrCodeUrl = ref('');
const qrCodeId = ref('');
const qrCodeT = ref('');
const loginError = ref('');
const pollingTimer = ref(null);

// 过滤参数
const defaultType = '电视剧'
const defaultSort = ''
const cate = ref('TV')

const filterParams = reactive({
  'type': defaultType,
  'sort': defaultSort,
  'main_area': '',
  'tags': '',
  'source': '',
  'year': '',
  'pay_type': '',
  'brand': '',
  'tag_label_name': '',
  'theatre': '',
  'status': '',
  'completed': '',
  'show_label_type': '',
  'age': '',
  'child_tags': '',
  'company': '',
  'people': '',
  'division': '',
  'game_brand': '',
  'game_type': '',
})

// 分类字典
const cateDictArray: CategoryItem[] = [
  { 'key': '电视剧', 'value': '电视剧', 'cate': 'TV' },
  { 'key': '电影', 'value': '电影', 'cate': 'Movie' },
  { 'key': '综艺', 'value': '综艺', 'cate': 'Show' },
  { 'key': '动漫', 'value': '动漫', 'cate': 'Comic' },
  { 'key': '少儿', 'value': '少儿', 'cate': 'Movie' },
  { 'key': '纪录片', 'value': '纪录片', 'cate': 'Documentary' },
  { 'key': '文化', 'value': '人文', 'cate': 'Movie' },
  { 'key': '体育', 'value': '体育', 'cate': 'Movie' },
  { 'key': '游戏', 'value': '游戏', 'cate': 'Movie' },
]
// 分类信息
async function queryCate(type: string) {
  try {
    const data: CategoryInfo[] = await api.get('youku/category', {
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
onMounted(async () => {
  queryCate(defaultType)
  await getUserInfo()
})
// 类型变化
watch(type, () => {
  // 类型变化时，将 filterParams 恢复到初始化状态
  Object.assign(filterParams, {
    'sort': defaultSort,
    'main_area': '',
    'tags': '',
    'source': '',
    'year': '',
    'pay_type': '',
    'brand': '',
    'tag_label_name': '',
    'theatre': '',
    'status': '',
    'completed': '',
    'show_label_type': '',
    'age': '',
    'child_tags': '',
    'company': '',
    'people': '',
    'division': '',
    'game_brand': '',
    'game_type': '',
  })
  filterParams.type = type.value
  queryCate(type.value)
  showMoreFilters.value = false
  currentKey.value++
})

// 过滤参数变化
watch(filterParams, () => {
  if (!filterParams.sort) {
    filterParams.sort = ''
  }
  if (!filterParams.type) {
    filterParams.type = '电视剧'
  }
  currentKey.value++
})

// 获取用户信息
const getUserInfo = async () => {
  try {
    const res = await api.get('/youku/user-info');
    userInfo.value = res;
  } catch (error) {
    console.error('获取用户信息失败:', error);
    // 即使获取用户信息失败，也设置is_login为false，确保页面正常展示
    userInfo.value = { is_login: false };
  }
};

// 生成登录二维码
const generateQRCode = async () => {
  try {
    const res = await api.get('/youku/qr-code');
    if (res && res.url) {
      qrCodeUrl.value = res.url;
      qrCodeId.value = res.qr_code_id;
      qrCodeT.value = res.t;
      loginStep.value = 'qr-code';
      startPolling();
    }
  } catch (error) {
    console.error('生成二维码失败:', error);
    loginError.value = '生成二维码失败，请重试';
    loginStep.value = 'failed';
  }
};

// 开始轮询二维码状态
const startPolling = () => {
  let count = 0;
  const maxCount = 120; // 2分钟
  
  pollingTimer.value = setInterval(async () => {
    count++;
    if (count >= maxCount) {
      clearInterval(pollingTimer.value);
      loginError.value = '二维码已过期，请重新生成';
      loginStep.value = 'failed';
      return;
    }
    
    try {
      const res = await api.get(`/youku/qr-code-status?ck=${qrCodeId.value}&t=${qrCodeT.value}`);
      if (res && res.content && res.content.data) {
        const status = res.content.data.qrCodeStatus;
        if (status === 'CONFIRMED') {
          clearInterval(pollingTimer.value);
          loginStep.value = 'success';
          setTimeout(() => {
            loginDialogVisible.value = false;
            getUserInfo();
          }, 1000);
        } else if (status === 'EXPIRED') {
          clearInterval(pollingTimer.value);
          loginError.value = '二维码已过期，请重新生成';
          loginStep.value = 'failed';
        } else if (status === 'CANCELED') {
          clearInterval(pollingTimer.value);
          loginError.value = '登录已取消';
          loginStep.value = 'failed';
        } else if (status === 'SCANNED') {
          loginStep.value = 'scanning';
        }
      }
    } catch (error) {
      console.error('获取二维码状态失败:', error);
    }
  }, 3000);
};

// 处理登录
const handleLogin = () => {
  loginStep.value = 'qr-code';
  loginDialogVisible.value = true;
  generateQRCode();
};

// 处理登出
const handleLogout = async () => {
  try {
    await api.post('/youku/logout');
    userInfo.value = { is_login: false };
  } catch (error) {
    console.error('登出失败:', error);
  }
};
</script>

<template>
  <div class="collect-source-view">
    <div class="collect-toolbar px-3 flex justify-between items-center mb-3">
      <VCombobox
        ref="searchWordInput"
        v-model="searchWord"
        density="comfortable"
        variant="outlined"
        class="search-input search-input--wide"
        prepend-inner-icon="mdi-magnify"
        append-inner-icon="mdi-close"
        @click:append-inner="searchClear()"
        placeholder="搜索优酷"
        @keydown.enter="searchMedia()"
        hide-details
      />
      <div class="flex items-center">
        <!-- 用户信息 -->
        <VMenu v-if="userInfo && userInfo.is_login" location="bottom center" transition="scale-transition" nudge-bottom="10">
          <template #activator="{ props }">
            <div v-bind="props" class="relative cursor-pointer mr-3 transition-all duration-300 hover:scale-105" role="button" tabindex="0">
              <VImg :src="userInfo.icon" class="rounded-full border-2 border-transparent hover:border-primary transition-all duration-300" style="block-size: 36px; inline-size: 36px;" />
              <div v-if="userInfo.is_vip" class="absolute -top-1 -right-1 bg-gradient-to-br from-yellow-400 to-yellow-600 rounded-full p-0.5 shadow-lg w-5 h-5 flex items-center justify-center">
                <VIcon size="14" color="white">mdi-crown</VIcon>
              </div>
            </div>
          </template>
          <VCard class="p-4 min-w-[240px] rounded-xl shadow-lg border border-gray-100">
            <div class="flex flex-col items-center">
              <div class="relative mb-3">
                <VImg :src="userInfo.icon" class="rounded-full border-4 border-white shadow-md" style="block-size: 72px; inline-size: 72px;" />
                <div v-if="userInfo.is_vip" class="absolute -bottom-1 -right-1 bg-gradient-to-br from-yellow-400 to-yellow-600 rounded-full p-1 shadow-md w-6 h-6 flex items-center justify-center">
                  <VIcon size="16" color="white">mdi-crown</VIcon>
                </div>
              </div>
              <h3 class="font-semibold text-lg text-center mb-1">{{ userInfo.name }}</h3>
              <p v-if="userInfo.due_date" class="text-sm text-gray-500 mb-3">{{ userInfo.due_date }}</p>
              <VChip v-if="userInfo.is_vip" variant="flat" color="primary" size="small" class="mb-3 px-3 py-0.5">
                会员
              </VChip>
              <VBtn variant="text" size="small" class="mt-1 text-red-500 hover:text-red-700 transition-colors duration-300" @click="handleLogout">
                <VIcon size="16" class="mr-1">mdi-logout</VIcon>
                退出登录
              </VBtn>
            </div>
          </VCard>
        </VMenu>
        <VBtn v-else color="primary" variant="flat" class="rounded-full px-4 py-1.5 transition-all duration-300 hover:shadow-md hover:scale-105" @click="handleLogin">
          <VIcon size="16" class="mr-1">mdi-login</VIcon>
          登录
        </VBtn>
      </div>
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
        :apipath="`youku/search`"
        :keyword="searchWord || ''"
        :cate="cate"
        grid-class="grid-media-card--landscape"
      />
      <MediaCardListView
        v-show="!isSearch"
        :key="currentKey"
        :apipath="`youku/page_data`"
        :params="filterParams"
        :first-page="1"
        :cate="cate"
        grid-class="grid-media-card--landscape"
      />
    </div>
    
    <!-- 登录弹窗 -->
    <VDialog v-model="loginDialogVisible" max-width="500px">
      <VCard>
        <VCardTitle>优酷扫码登录</VCardTitle>
        <VCardText class="text-center">
          <VImg v-if="qrCodeUrl" :src="qrCodeUrl" class="mx-auto" style=" block-size: 200px;inline-size: 200px;" />
          <div v-else class="text-gray-500 py-4">生成二维码中...</div>
          <p class="mt-4" v-if="loginStep === 'qr-code'">等待扫码</p>
          <p class="mt-4" v-else-if="loginStep === 'scanning'">正在扫码...</p>
          <p class="mt-4 text-green-500" v-else-if="loginStep === 'success'">登录成功</p>
          <p class="mt-4 text-red-500" v-else-if="loginStep === 'failed'">登录失败</p>
          <p class="text-sm text-gray-500 mt-2" v-if="loginStep === 'qr-code'">请使用优酷APP扫描二维码登录</p>
          <p class="text-sm text-gray-500 mt-2" v-else-if="loginStep === 'scanning'">请在手机上确认登录</p>
          <p class="text-sm text-gray-500 mt-2" v-else-if="loginStep === 'success'">正在跳转...</p>
          <p class="text-sm text-gray-500 mt-2" v-else-if="loginStep === 'failed'">{{ loginError }}</p>
        </VCardText>
        <VCardActions class="justify-center">
          <VBtn color="primary" @click="generateQRCode">刷新二维码</VBtn>
          <VBtn @click="loginDialogVisible = false">取消</VBtn>
        </VCardActions>
      </VCard>
    </VDialog>
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

.search-input--wide {
  flex: 1 1 auto;
  margin-inline-end: 10px;
  max-width: 720px;
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
