<script lang="ts" setup>
/**
 * 表单字段尾部操作按钮组（图标+文字小按钮，PC/移动端统一口径）。
 *
 * 背景：原 cdetail 基本信息字段用裸图标（放大镜/云朵/软盘）承载「获取信息 / 打开详情 /
 * 保存」三类操作，光看图标难以理解含义；软盘保存图标还依赖 focus/blur 时序浮现，
 * 移动端基本不可见不可点。此组件把操作按钮化：
 * - 挂在 VTextField #append-inner 槽内常显（不受字段聚焦态影响）
 * - 每个按钮 = 图标 + 短文字，无需悬停即可理解
 */
export interface FieldAction {
  /** 操作键（仅作 v-for key） */
  key: string
  /** mdi 图标名 */
  icon: string
  /** 按钮文字（≤2 字为宜） */
  label: string
  /** 悬停长说明（可选，默认用 label） */
  title?: string
  /** 是否禁用（不传默认可用） */
  disabled?: boolean
  /** 点击回调 */
  onClick: () => void
}

const props = defineProps({
  actions: {
    type: Array as PropType<FieldAction[]>,
    default: () => [],
  },
})
</script>

<template>
  <div class="app-field-actions">
    <VBtn
      v-for="action in props.actions"
      :key="action.key"
      class="app-field-actions__btn"
      :prepend-icon="action.icon"
      :title="action.title || action.label"
      :aria-label="action.title || action.label"
      :disabled="action.disabled"
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

// 窄屏（两列布局下约 <600px）时按钮组转入输入框下方独立一行，
// 避免与文本抢占同一行导致两边都不可用。
@media (width <600px) {
  .app-field-actions {
    flex-direction: column;
    align-items: flex-end;
    gap: 0;
    margin-block-start: 0;
  }

  // 字段容器从 grid 单行改为允许按钮换行
  :deep(.v-field__field) {
    flex-wrap: wrap;
  }

  .app-field-actions__btn {
    padding-inline: 2px;
  }
}
</style>
