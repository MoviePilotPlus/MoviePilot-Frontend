<script setup lang="ts">
// @ts-nocheck
import api from '@/api'
import { ref, reactive, computed, watch, onMounted, onActivated } from 'vue'
import type { CategoryInfo, CategoryItem, UserInfo } from '@/api/types'
import { default as MediaCardListView } from '@/views/collect/MediaCardListView.vue'
import { default as MediaSearchView } from '@/views/collect/MediaSearchView.vue'
import { VDialog, VCard, VCardTitle, VCardText, VCardActions, VBtn, VImg, VRow, VCol, VChip, VMenu, VIcon } from 'vuetify/components'
import { useToast } from 'vue-toastification'

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

// 用户信息
const userInfo = ref({
  is_login: false,
  name: '',
  icon: '',
  vip_info: {
    vipTypeName: '',
    deadline: {
      date: ''
    },
    status: '0'
  }
})

// 登录弹窗相关
const loginDialogVisible = ref(false)
const qrCodeUrl = ref('')
const qrCodeToken = ref('')
const deviceId = ref('')
const pollingStatus = ref('')
const pollingTimer = ref<number | null>(null)
const loginTimeoutTimer = ref<number | null>(null)

const $toast = useToast()

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

    const groupedData: Record<string, CategoryInfo[]> = {}
    data.forEach((item: CategoryInfo) => {
      const filter_key = item.index_name
      if (!groupedData[filter_key]) {
        groupedData[filter_key] = []
      }
      groupedData[filter_key].push(item)
    })

    cates.value = groupedData
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

// 检测用户登录状态
async function checkLoginStatus() {
  try {
    const userInfoData: UserInfo = await api.get('iqiyi/user/info')
    userInfo.value = userInfoData
  } catch (error) {
    console.error('获取爱奇艺用户信息失败:', error)
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
    const response = await api.get('iqiyi/qrcode')
    console.log(response)
    qrCodeUrl.value = response.url
    qrCodeToken.value = response.qr_code_id
    deviceId.value = response.deviceid
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
      const response = await api.get('iqiyi/login_status', {
        params: {
          deviceid: deviceId.value,
          token: qrCodeToken.value
        }
      })

      console.log('轮询登录状态:', response)

      if (response.code === 'A00000' && response.data) {
        // 登录成功
        stopPolling() // 立即关闭轮询
        loginDialogVisible.value = false
        $toast.success('登录成功')
        
        // 保存cookie
        if (response.data.authcookie) {
          await api.post('iqiyi/login', {
            authcookie: response.data.authcookie
          })
        }
        
        // 重新获取用户信息
        await checkLoginStatus()
      } else if (response.code === 'P00501') {
        // 二维码过期
        stopPolling() // 立即关闭轮询
        pollingStatus.value = '二维码已过期'
        $toast.error('二维码已过期，请重新获取')
      } else if (response.code === 'A00001') {
        // 手机端尚未确认
        pollingStatus.value = '请在手机端确认登录'
      } else if (response.code === 'P01006') {
        // 手机端已扫描但未确认
        pollingStatus.value = '手机端已扫描，请确认登录'
      } else {
        // 其他状态
        pollingStatus.value = response.msg || '登录中...'
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
    await api.post('iqiyi/logout')
    userInfo.value = {
      is_login: false,
      name: '',
      icon: '',
      vip_info: {
        vipTypeName: '',
        deadline: {
          date: ''
        },
        status: '0'
      }
    }
    $toast.success('退出登录成功')
  } catch (error) {
    console.error('退出登录失败:', error)
    $toast.error('退出登录失败')
  }
}

// 格式化时间
function formatDate(dateString: string): string {
  if (!dateString) return ''
  try {
    const date = new Date(dateString)
    if (isNaN(date.getTime())) {
      // 尝试其他格式
      const timestamp = parseInt(dateString)
      if (!isNaN(timestamp)) {
        const dateFromTimestamp = new Date(timestamp * 1000)
        if (!isNaN(dateFromTimestamp.getTime())) {
          return dateFromTimestamp.toLocaleDateString('zh-CN', {
            year: 'numeric',
            month: '2-digit',
            day: '2-digit'
          })
        }
      }
      return dateString
    }
    return date.toLocaleDateString('zh-CN', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit'
    })
  } catch (error) {
    console.error('时间格式化失败:', error)
    return dateString
  }
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
onMounted(async () => {
  queryCate(defaultType)
  // 检测登录状态
  await checkLoginStatus()
})
// keep-alive 激活时（切回 tab）也重新拉取，避免缓存导致首次不渲染
onActivated(async () => {
  queryCate(defaultType)
  await checkLoginStatus()
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
    <div class="collect-toolbar px-3 flex justify-between items-center mb-3">
      <VCombobox ref="searchWordInput" v-model="searchWord" density="comfortable" variant="outlined"
        class="search-input search-input--wide" prepend-inner-icon="mdi-magnify" append-inner-icon="mdi-close"
        @click:append-inner="searchClear()" placeholder="搜索爱奇艺" @keydown.enter="searchMedia()" hide-details />
      <div class="flex items-center">
        <!-- 用户信息 -->
        <VMenu v-if="userInfo.is_login" location="bottom center" transition="scale-transition" nudge-bottom="10">
          <template #activator="{ props }">
            <div v-bind="props" class="relative cursor-pointer mr-3 transition-all duration-300 hover:scale-105" role="button" tabindex="0">
              <VImg :src="userInfo.icon" class="rounded-full border-2 border-transparent hover:border-primary transition-all duration-300" style="block-size: 36px; inline-size: 36px;" />
              <div v-if="userInfo.vip_info && userInfo.vip_info.status === '3'" class="absolute -top-1 -right-1 bg-gradient-to-br from-yellow-400 to-yellow-600 rounded-full p-0.5 shadow-lg w-5 h-5 flex items-center justify-center">
                <VIcon size="14" color="white">mdi-crown</VIcon>
              </div>
            </div>
          </template>
          <VCard class="p-4 min-w-[240px] rounded-xl shadow-lg border border-gray-100">
            <div class="flex flex-col items-center">
              <div class="relative mb-3">
                <VImg :src="userInfo.icon" class="rounded-full border-4 border-white shadow-md" style="block-size: 72px; inline-size: 72px;" />
                <div v-if="userInfo.vip_info && userInfo.vip_info.status === '3'" class="absolute -bottom-1 -right-1 bg-gradient-to-br from-yellow-400 to-yellow-600 rounded-full p-1 shadow-md w-6 h-6 flex items-center justify-center">
                  <VIcon size="16" color="white">mdi-crown</VIcon>
                </div>
              </div>
              <h3 class="font-semibold text-lg text-center mb-1">{{ userInfo.name }}</h3>
              <p v-if="userInfo.vip_info && userInfo.vip_info.deadline && userInfo.vip_info.deadline.date" class="text-sm text-gray-500 mb-3">{{ userInfo.vip_info.deadline.date }}</p>
              <VChip v-if="userInfo.vip_info && userInfo.vip_info.status === '3' && userInfo.vip_info.vipTypeName" variant="flat" color="primary" size="small" class="mb-3 px-3 py-0.5">
                {{ userInfo.vip_info.vipTypeName }}
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
          登录爱奇艺
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

    <!-- 登录弹窗 -->
    <VDialog v-model="loginDialogVisible" max-width="500px">
      <VCard>
        <VCardTitle>爱奇艺扫码登录</VCardTitle>
        <VCardText class="text-center">
          <VImg :src="`https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=${encodeURIComponent(qrCodeUrl)}`"
            class="mx-auto" style=" block-size: 200px;inline-size: 200px;" />
          <p class="mt-4">{{ pollingStatus }}</p>
          <p class="text-sm text-gray-500 mt-2">请使用爱奇艺APP扫描二维码登录</p>
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
