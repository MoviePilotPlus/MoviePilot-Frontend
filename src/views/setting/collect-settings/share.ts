// 采集设置分区卡共享常量与工具。
// 截图组配置键由 CollectScreenshotCard 独占保存：基础/命名卡提交 system/env 时
// 剔除这些键，避免两处保存互相覆盖（历史 bug：截图模板保存后被基础设置保存回退）。
export const SCREENSHOT_ENV_KEYS = [
  'SCREENSHOT_TEMPLATE',
  'SCREENSHOT_TEMPLATE_CONFIG',
  'SCREENSHOT_HDR_PROCESSOR',
  'SCREENSHOT_GRID_ENABLED',
  'SCREENSHOT_CACHE_ENABLED',
  'SCREENSHOT_COUNT',
  'SCREENSHOT_COMPRESS_LIMIT',
  'SCREENSHOT_MIN_SIZE_LIMIT',
  'SCREENSHOT_QUALITY_CHECK',
] as const

// Basic 组去掉截图键后的 system/env 载荷
export function buildEnvPayload(basic: Record<string, unknown>) {
  const payload: Record<string, unknown> = {}
  for (const key of Object.keys(basic)) {
    if (!(SCREENSHOT_ENV_KEYS as readonly string[]).includes(key)) payload[key] = basic[key]
  }
  return payload
}
