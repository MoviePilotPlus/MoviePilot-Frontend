<script lang="ts" setup>
/**
 * 表单字段尾部操作按钮组（PC/移动端自适应）。
 *
 * 背景：原 cdetail 基本信息字段用裸图标（放大镜/云朵/软盘）承载「获取信息 / 打开详情 /
 * 保存」三类操作，光看图标难以理解含义；plain 变体下图标失焦隐藏 + 保存图标依赖
 * focus/blur 时序，移动端基本不可见不可点。此组件把操作按钮化：
 * - PC（smAndUp）：横排「图标+短文字」小按钮，常显可点
 * - 移动端（smAndDown）：收进单个 ⋯ 菜单按钮，点开 VMenu 完整文字菜单——
 *   多个按钮并排在小屏既挤又易误触
 * - 挂在 VTextField #append-inner 槽内，不受字段聚焦态影响
 */
import { useDisplay } from 'vuetify'

export interface FieldAction {
  /** 操作键（仅作 v-for key） */
  key: string
  /** mdi 图标名 */
  icon: string
  /** 按钮文字（≤2 字为宜） */
  label: string
  /** 完整说明（PC 悬停 title / 移动端菜单项文字，默认用 label） */
  title?: string
  /** 是否禁用（不传默认可用） */
  disabled?: boolean
  /** 仅 PC 横排按钮禁用（移动端菜单仍可点，点击后自行提示） */
  pcDisabled?: boolean
  /** 点击回调 */
  onClick: () => void
}

const props = defineProps({
  actions: {
    type: Array as PropType<FieldAction[]>,
    default: () => [],
  },
})

const display = useDisplay()

/** 移动端菜单项文字：优先完整说明 */
function actionTitle(action: FieldAction) {
  return action.title || action.label
}
</script>

<template>
  <!-- 移动端：单个 ⋯ 按钮 + 下拉菜单（大触达区、零误触） -->
  <VMenu v-if="display.smAndDown.value && props.actions.length" location="bottom end" close-on-content-click>
    <template #activator="{ props: menuProps }">
      <VBtn
        v-bind="menuProps"
        class="app-field-actions__more"
        icon="mdi-dots-vertical"
        size="small"
        variant="text"
        density="comfortable"
        aria-label="字段操作菜单"
      />
    </template>
    <VList density="compact">
      <VListItem
        v-for="action in props.actions"
        :key="action.key"
        :prepend-icon="action.icon"
        :title="actionTitle(action)"
        :disabled="action.disabled"
        @click="action.onClick()"
      />
    </VList>
  </VMenu>

  <!-- PC：横排图标+文字小按钮 -->
  <div v-else-if="props.actions.length" class="app-field-actions">
    <VBtn
      v-for="action in props.actions"
      :key="action.key"
      class="app-field-actions__btn"
      :prepend-icon="action.icon"
      :title="actionTitle(action)"
      :aria-label="actionTitle(action)"
      :disabled="action.disabled ?? action.pcDisabled"
      size="x-small"
      variant="text"
      density="comfortable"
      @click="action.onClick()"
    >
      {{ action.label }}
    </VBtn>
  </div>
</template>

<style lang="scss" scoped>
.app-field-actions {
  display: flex;
  align-items: center;
  flex-shrink: 0;
  gap: 2px;
  // plain 变体下 append-inner 顶部对齐且带内边距，收紧到输入行中线附近
  margin-block-start: -4px;
}

.app-field-actions__btn {
  min-inline-size: 0;
  padding-inline: 4px;
  letter-spacing: 0;
}

// 移动端 ⋯ 按钮：44px 级触达区
.app-field-actions__more {
  margin-block-start: -4px;
}
</style>
