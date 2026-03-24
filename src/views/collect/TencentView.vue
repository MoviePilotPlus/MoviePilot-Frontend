<script setup lang="ts">
// @ts-nocheck
import api from '@/api'
import { ref, reactive, watch, onMounted, computed } from 'vue'
import type { CategoryInfo, CategoryItem, UserInfo } from '@/api/types'
import { default as MediaCardListView } from '@/views/collect/MediaCardListView.vue'
import { default as MediaSearchView } from '@/views/collect/MediaSearchView.vue'
import { VTextField, VDialog, VCard, VCardTitle, VCardText, VCardActions, VBtn, VImg, VRow, VCol, VChip, VMenu, VIcon } from 'vuetify/components'
import { useToast } from 'vue-toastification'

// 排序 类型 资费 出品 地区 年份 状态 画风 年龄 全部 性别 语言  动画明星 剧场 奖项 其他-characteristic
// 电影或者电视剧 movies/tvs
const type = ref('100113')
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
const userInfo = ref<UserInfo>({
  is_login: false,
  vip_status: 0,
  vip_type: 0,
  vip_type_name: '',
  due_date: '',
  nickname: '',
  face: ''
})

// 登录弹窗相关
const loginDialogVisible = ref(false)
const qrCodeUrl = ref('')
const qrCodeId = ref('')
const pollingStatus = ref('')
const pollingTimer = ref<number | null>(null)
const loginTimeoutTimer = ref<number | null>(null)

const $toast = useToast()


// 过滤参数
const defaultType = '100113'
const defaultSort = '75'
const cate = ref('TV')

const filterParams = reactive({
  'type': defaultType,
  'sort': defaultSort,
  'itype': '-1',
  'iyear': '-1',
  'pay': '-1',
  'iarea': '-1',
  'iregion': '0',
  'itrailer': '-1',
  'producer': '-1',
  'award': '-1',
  'theater': '-1',
  'attr': '-1',
  'anime_status': '-1',
  'item': '1',
  'iage': '-1',
  'gender': '-1',
  'language': '-1',
  'child_ip': '-1',
  'characteristic': '-1',
  'three': '-1',
  'ipay': '-1',
  'exclusive': '-1',
  'all': '-1',
  'prefer': '-1',
})

// 分类字典
const cateDictArray: CategoryItem[] = [
  { "key": "100113", "value": "电视剧", "cate": "TV" },
  { "key": "100173", "value": "电影", "cate": "Movie" },
  { "key": "100105", "value": "纪录片", "cate": "Documentary" },
  { "key": "100109", "value": "综艺", "cate": "Show" },
  { "key": "100119", "value": "动漫", "cate": "Comic" },
  { "key": "100150", "value": "少儿", "cate": "TV" },
  { "key": "110755", "value": "短剧", "cate": "Short" }
]
// 分类信息
async function queryCate(type: string) {
  try {
    const data: CategoryInfo[] = await api.get('tencent/category', {
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
      const filter_key = item.filter_key;
      if (!groupedData[filter_key]) {
        groupedData[filter_key] = [];
      }
      groupedData[filter_key].push(item);
    });

    cates.value = groupedData;
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
  // 检测登录状态
  await checkLoginStatus()
})

// 检测用户登录状态
async function checkLoginStatus() {
  try {
    const info: UserInfo = await api.get('tencent/user/info')
    userInfo.value = info
  } catch (error) {
    console.error('获取腾讯视频用户信息失败:', error)
    userInfo.value.is_login = false
  }
}

// 打开登录弹窗
function openLoginDialog() {
  loginDialogVisible.value = true
  getQRCode()
}

// 获取二维码
async function getQRCode() {
  try {
    const response = await api.get('tencent/qrcode')
    qrCodeUrl.value = response.url
    qrCodeId.value = response.qrcode_key
    pollingStatus.value = '等待扫码'

    // 开始轮询
    startPolling()

    // 设置登录超时
    loginTimeoutTimer.value = window.setTimeout(() => {
      stopPolling()
      pollingStatus.value = '登录超时'
      $toast.error('登录超时，请重新扫码')
    }, 300000)
  } catch (error) {
    console.error('获取二维码失败:', error)
    $toast.error('获取二维码失败')
  }
}

// 开始轮询登录状态
function startPolling() {
  // 确保先停止之前的轮询
  if (pollingTimer.value) {
    clearInterval(pollingTimer.value)
    pollingTimer.value = null
  }

  pollingTimer.value = window.setInterval(async () => {
    try {
      const response = await api.get('tencent/login_status', {
        params: { qr_code_id: qrCodeId.value }
      })

      pollingStatus.value = response.message

      if (response.status === 3) {
        // 已完成扫码，进行登录
        const loginResponse = await api.post('tencent/login?qr_code_id=' + qrCodeId.value)

        if (loginResponse.code === 0) {
          // 登录成功
          stopPolling() // 立即关闭轮询
          loginDialogVisible.value = false
          $toast.success('登录成功')
          // 重新获取用户信息
          await checkLoginStatus()
        } else {
          stopPolling()
          pollingStatus.value = '登录失败'
          $toast.error('登录失败，请重试')
        }
      }
    } catch (error) {
      console.error('轮询登录状态失败:', error)
    }
  }, 3000)
}

// 停止轮询
function stopPolling() {
  if (pollingTimer.value) {
    clearInterval(pollingTimer.value)
    pollingTimer.value = null
  }

  if (loginTimeoutTimer.value) {
    clearTimeout(loginTimeoutTimer.value)
    loginTimeoutTimer.value = null
  }
}

// 关闭登录弹窗
function closeLoginDialog() {
  stopPolling()
  loginDialogVisible.value = false
}

// 退出登录
async function logout() {
  try {
    await api.post('tencent/logout')
    userInfo.value.is_login = false
    userInfo.value.nickname = ''
    userInfo.value.face = ''
    userInfo.value.vip_status = 0
    userInfo.value.vip_type = 0
    userInfo.value.vip_type_name = ''
    userInfo.value.due_date = ''
    $toast.success('退出登录成功')
  } catch (error) {
    console.error('退出登录失败:', error)
    $toast.error('退出登录失败')
  }
}
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
    filterParams.sort = '75'
  }
  if (!filterParams.type) {
    filterParams.type = '100113'
  }
  currentKey.value++
})
</script>

<template>
  <div class="collect-source-view">
    <div class="collect-toolbar px-3 flex justify-between items-center mb-3">
      <VCombobox ref="searchWordInput" v-model="searchWord" density="comfortable" variant="outlined"
        class="search-input search-input--wide" prepend-inner-icon="mdi-magnify"
        append-inner-icon="mdi-close" @click:append-inner="searchClear()" placeholder="搜索腾讯视频"
        @keydown.enter="searchMedia()" hide-details />
      <div class="flex items-center">
        <!-- 当前登录用户信息 -->
        <VMenu v-if="userInfo.is_login" location="bottom center" transition="scale-transition" nudge-bottom="10">
          <template #activator="{ props }">
            <div v-bind="props" class="relative cursor-pointer mr-3 transition-all duration-300 hover:scale-105" role="button" tabindex="0">
              <VImg :src="userInfo.face" class="rounded-full border-2 border-transparent hover:border-primary transition-all duration-300" style="block-size: 36px; inline-size: 36px;" />
              <div v-if="userInfo.vip_status === 1" class="absolute -top-1 -right-1 bg-gradient-to-br from-yellow-400 to-yellow-600 rounded-full p-0.5 shadow-lg w-5 h-5 flex items-center justify-center">
                <VIcon size="14" color="white">mdi-crown</VIcon>
              </div>
            </div>
          </template>
          <VCard class="p-4 min-w-[240px] rounded-xl shadow-lg border border-gray-100">
            <div class="flex flex-col items-center">
              <div class="relative mb-3">
                <VImg :src="userInfo.face" class="rounded-full border-4 border-white shadow-md" style="block-size: 72px; inline-size: 72px;" />
                <div v-if="userInfo.vip_status === 1" class="absolute -bottom-1 -right-1 bg-gradient-to-br from-yellow-400 to-yellow-600 rounded-full p-1 shadow-md w-6 h-6 flex items-center justify-center">
                <VIcon size="16" color="white">mdi-crown</VIcon>
              </div>
              </div>
              <h3 class="font-semibold text-lg text-center mb-1">{{ userInfo.nickname }}</h3>
              <p v-if="userInfo.due_date" class="text-sm text-gray-500 mb-3">{{ userInfo.due_date }}</p>
              <VChip v-if="userInfo.vip_status === 1" variant="flat" color="primary" size="small" class="mb-3 px-3 py-0.5">
                {{ userInfo.vip_type_name }}
              </VChip>
              <VBtn variant="text" size="small" class="mt-1 text-red-500 hover:text-red-700 transition-colors duration-300" @click="logout()">
                <VIcon size="16" class="mr-1">mdi-logout</VIcon>
                退出登录
              </VBtn>
            </div>
          </VCard>
        </VMenu>
        <VBtn v-if="!userInfo.is_login" color="primary" variant="flat" class="rounded-full px-4 py-1.5 transition-all duration-300 hover:shadow-md hover:scale-105" @click="openLoginDialog()">
          <VIcon size="16" class="mr-1">mdi-login</VIcon>
          登录
        </VBtn>
      </div>
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
        <VChipGroup v-model="filterParams[key as keyof typeof filterParams]" column mandatory class="collect-chip-group">
          <VChip :color="filterParams[key as keyof typeof filterParams] == option.option_value ? 'primary' : ''" class="collect-filter-chip" tile
            :value="option.option_value" v-for="option in item" :key="option.option_value" size="small">
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
      <MediaSearchView v-if="isSearch" :key="currentKey" :apipath="`tencent/search`" :keyword="searchWord || ''"
        :cate="cate" />
      <MediaCardListView v-show="!isSearch" :key="currentKey" :apipath="`tencent/page_data`" :params="filterParams"
        :cate="cate" />
    </div>

    <!-- 登录弹窗 -->
    <VDialog v-model="loginDialogVisible" max-width="500px">
      <VCard>
        <VCardTitle>腾讯视频扫码登录</VCardTitle>
        <VCardText class="text-center">
          <VImg :src="`https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=${encodeURIComponent(qrCodeUrl)}`"
            class="mx-auto" style=" block-size: 200px;inline-size: 200px;" />
          <p class="mt-4">{{ pollingStatus }}</p>
          <p class="text-sm text-gray-500 mt-2">请使用腾讯视频APP扫描二维码登录</p>
        </VCardText>
        <VCardActions class="justify-center">
          <VBtn color="primary" @click="getQRCode()">刷新二维码</VBtn>
          <VBtn @click="closeLoginDialog()">取消</VBtn>
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
