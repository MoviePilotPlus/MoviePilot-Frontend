<!-- eslint-disable sonarjs/no-duplicate-string -->
<script lang="ts" setup>
// @ts-nocheck
import { useToast } from 'vue-toastification'
import draggable from 'vuedraggable'
import api from '@/api'
import { useI18n } from 'vue-i18n'

// 制作组配置卡：发种时写入的版权/声明/禁转信息，支持拖拽排序与默认制作组。
const { t } = useI18n()
const $toast = useToast()

// 制作组配置
type TeamConfig = {
  id: string // 添加唯一ID用于稳定的key
  team: string
  copyright: string
  declare: string
  ban_reprint: string
  default: boolean
  order: number
}

// 团队配置相关
const teamConfigs = ref<TeamConfig[]>([])
const isTeamLoading = ref(false)
const defaultTeamId = ref('')

// 添加制作组配置
function addTeamConfig() {
  const newConfig: TeamConfig = {
    id: Date.now().toString(), // 使用时间戳作为唯一ID
    team: '',
    copyright: '',
    declare: '',
    ban_reprint: '',
    default: false,
    order: teamConfigs.value.length + 1,
  }

  teamConfigs.value.push(newConfig)

  // 如果是第一个制作组，设置为默认
  if (teamConfigs.value.length === 1) {
    newConfig.default = true
    defaultTeamId.value = newConfig.team
  }
}

// 删除制作组配置
function removeTeamConfig(teamConfig: TeamConfig) {
  const index = teamConfigs.value.indexOf(teamConfig)
  if (index !== -1) {
    // 如果删除的是默认制作组，设置第一个为默认
    if (teamConfig.default && teamConfigs.value.length > 1) {
      const remainingTeam = teamConfigs.value[0 === index ? 1 : 0]
      remainingTeam.default = true
      defaultTeamId.value = remainingTeam.team
    }

    teamConfigs.value.splice(index, 1)
  }
}

// 查询制作组配置
async function queryTeamConfigs() {
  try {
    isTeamLoading.value = true
    const result: { [key: string]: any } = await api.get('system/setting/TEAM_PARAMS')
    if (result && result.value) {
      // 根据order字段排序
      teamConfigs.value = result.value
        .sort((a: any, b: any) => a.order - b.order)
        .map((item: any, index: number) => ({
          ...item,
          id: item.id || `team_${index}_${Date.now()}`, // 确保每个项目都有唯一ID
        }))
      // 处理默认值
      if (teamConfigs.value.length > 0) {
        const defaultConfig = teamConfigs.value.find(config => config.default)
        if (defaultConfig) {
          defaultTeamId.value = defaultConfig.team
        } else {
          teamConfigs.value[0].default = true
          defaultTeamId.value = teamConfigs.value[0].team
        }
      }
    }
  } catch (error) {
    console.log(error)
  } finally {
    isTeamLoading.value = false
  }
}

// 保存制作组配置
async function saveTeamConfigs() {
  try {
    // 验证至少要有一个制作组
    if (teamConfigs.value.length === 0) {
      $toast.error(t('collect.teamMinOne'))
      return
    }

    // 验证每个制作组的名称和版权信息不能为空
    for (let i = 0; i < teamConfigs.value.length; i++) {
      const config = teamConfigs.value[i]
      if (!config.team || config.team.trim() === '') {
        $toast.error(t('collect.teamNameRequired', { index: i + 1 }))
        return
      }
      if (!config.copyright || config.copyright.trim() === '') {
        $toast.error(t('collect.teamCopyrightRequired', { index: i + 1 }))
        return
      }
    }

    // 确保有默认制作组
    handleDefaultTeam(teamConfigs.value)

    // 更新order字段，并移除id字段
    const configsToSave = teamConfigs.value.map((item, index) => ({
      team: item.team,
      copyright: item.copyright,
      declare: item.declare,
      ban_reprint: item.ban_reprint,
      default: item.default,
      order: index + 1,
    }))

    await api.post('system/setting/TEAM_PARAMS', JSON.stringify(configsToSave), {
      headers: {
        'Content-Type': 'text/plain',
      },
    })

    $toast.success(t('collect.teamSaveSuccess'))
  } catch (error) {
    console.log(error)
    $toast.error(t('collect.teamSaveFailed'))
  }
}

// 处理默认制作组
function handleDefaultTeam(teams: TeamConfig[]) {
  const defaultTeam = teams.find(item => item.default)
  if (teams.length > 0 && !defaultTeam) {
    teams[0].default = true
  }
  return teams
}

// 通过团队名称设置默认制作组
function setDefaultTeamByValue(teamName: string) {
  teamConfigs.value.forEach(config => {
    config.default = config.team === teamName
    if (config.default) {
      defaultTeamId.value = config.team
    }
  })
}

onMounted(() => {
  queryTeamConfigs()
})
</script>

<template>
  <VCard id="collect-teams">
    <VCardItem>
      <VCardTitle>{{ t('collect.teamConfig') }}</VCardTitle>
      <VCardSubtitle>{{ t('collect.teamConfigDesc') }}</VCardSubtitle>
    </VCardItem>
    <VCardText>
      <VAlert v-if="isTeamLoading" type="info" variant="tonal">
        {{ t('common.loading') }}
      </VAlert>

      <VAlert v-else-if="teamConfigs.length === 0" type="info" variant="tonal">
        {{ t('collect.noTeamConfig') }}
      </VAlert>

      <div v-else class="mb-4">
        <draggable v-model="teamConfigs" item-key="id" handle=".drag-handle" @end="() => {}" class="draggable-list">
          <template #item="{ element, index }">
            <VCard class="mb-2">
              <VCardText class="p-3">
                <div class="flex items-center gap-4 mb-3">
                  <VIcon class="drag-handle cursor-move" color="grey">mdi-drag-vertical</VIcon>
                  <VRadio
                    v-model="defaultTeamId"
                    :value="element.team"
                    :label="t('collect.defaultTeam')"
                    @change="setDefaultTeamByValue(element.team)"
                  />
                  <div class="text-xs text-grey ml-auto">{{ t('collect.order') }}: {{ index + 1 }}</div>
                </div>

                <div class="flex flex-col md:flex-row gap-2">
                  <VTextField
                    v-model="element.team"
                    :label="t('collect.teamName')"
                    dense
                    outlined
                    hide-details
                    full-width
                  />
                  <VTextField
                    v-model="element.copyright"
                    :label="t('collect.copyright')"
                    dense
                    outlined
                    hide-details
                    full-width
                  />
                  <VTextField
                    v-model="element.declare"
                    :label="t('common.declare')"
                    dense
                    outlined
                    hide-details
                    full-width
                  />
                  <VTextField
                    v-model="element.ban_reprint"
                    :label="t('collect.banReprint')"
                    dense
                    outlined
                    hide-details
                    full-width
                  />
                  <VBtn
                    color="error"
                    icon
                    @click="removeTeamConfig(element)"
                    :disabled="teamConfigs.length <= 1"
                    class="self-center"
                  >
                    <VIcon>mdi-delete</VIcon>
                  </VBtn>
                </div>
              </VCardText>
            </VCard>
          </template>
        </draggable>
      </div>
    </VCardText>
    <VCardText>
      <VForm @submit.prevent="() => {}">
        <div class="d-flex flex-wrap gap-4 mt-4">
          <VBtn
            type="submit"
            @click="addTeamConfig"
            prepend-icon="mdi-plus"
            color="primary"
            :loading="isTeamLoading"
          >
            {{ t('common.add') }}
          </VBtn>
          <VBtn type="submit" @click="saveTeamConfigs" prepend-icon="mdi-content-save" :loading="isTeamLoading">
            {{ t('common.save') }}
          </VBtn>
        </div>
      </VForm>
    </VCardText>
  </VCard>
</template>
