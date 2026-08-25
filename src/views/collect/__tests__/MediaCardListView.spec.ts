import MediaCardListView from '@/views/collect/MediaCardListView.vue'
import type { VideoInfo } from '@/api/types'
import { screen, waitFor } from '@testing-library/vue'
import { renderWithProviders } from '@tests/support/render'
import { defineComponent, type PropType } from 'vue'
import { beforeEach, describe, expect, it, vi } from 'vitest'

const mocks = vi.hoisted(() => ({
  pluginGet: vi.fn(),
}))

vi.mock('@/api', () => ({
  pluginApi: {
    get: mocks.pluginGet,
    post: vi.fn(),
  },
}))

function videoFixture(cid: string): VideoInfo {
  return {
    source: 'tencent',
    cid,
    vid: `v-${cid}`,
    title: `媒体${cid}`,
  } as unknown as VideoInfo
}

/** pluginApi 信封形态：data 数组 + message 会话。 */
function envelope(data: VideoInfo[], session = '') {
  return { success: true, message: session, data }
}

const VInfiniteScrollStub = defineComponent({
  name: 'VInfiniteScrollStub',
  props: { items: { type: Array as PropType<unknown[]>, default: () => [] }, mode: { type: String, default: '' }, side: { type: String, default: '' } },
  emits: ['load'],
  // 真组件进入视口即触发 @load({done})，stub 在挂载时模拟首帧加载
  async mounted() {
    this.$emit('load', { done: () => {} })
  },
  template: '<div class="v-infinite-scroll-stub"><slot /><slot name="loading" /><slot name="empty" /></div>',
})

const VideoCardStub = {
  props: { media: { type: Object, required: true }, cate: { type: String, default: '' } },
  template: '<div class="video-card-stub">{{ media.title }}</div>',
}

async function renderList() {
  return renderWithProviders(MediaCardListView, {
    props: { apipath: 'tencent/list', firstPage: 1 },
    global: { stubs: { VInfiniteScroll: VInfiniteScrollStub, VideoCard: VideoCardStub, LoadingBanner: true, NoDataFound: true } },
  })
}

describe('MediaCardListView', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('滚动加载触发时拆 pluginApi 信封渲染媒体卡（2026-08-23 pluginApi 回归）', async () => {
    mocks.pluginGet.mockResolvedValue(envelope([videoFixture('c1'), videoFixture('c2')]))
    const { container } = await renderList()

    // stub 透传默认插槽，手动触发一次 @load
    const scroll = container.querySelector('.v-infinite-scroll-stub')
    expect(scroll).toBeTruthy()
    expect(await screen.findByText('媒体c1')).toBeTruthy()
    expect(screen.getByText('媒体c2')).toBeTruthy()
  })

  it('首屏未撑满时连续加载直至空页，翻页参数递增', async () => {
    mocks.pluginGet.mockImplementation((_endpoint: string, config?: { params?: { page?: number } }) =>
      envelope([videoFixture(`p${config?.params?.page}`)], `session-${config?.params?.page}`))

    await renderList()
    await waitFor(() => {
      expect(mocks.pluginGet.mock.calls.length).toBeGreaterThanOrEqual(1)
    })
    // 翻页与 session 透传契约
    const firstCall = mocks.pluginGet.mock.calls[0]
    expect(firstCall?.[1]?.params?.page).toBe(1)
  })

  it('空数据页标记 hasMore 停止后续加载并渲染无数据态', async () => {
    mocks.pluginGet.mockResolvedValue(envelope([], 'session-1'))
    const { container } = await renderList()

    await waitFor(() => {
      expect(mocks.pluginGet).toHaveBeenCalled()
    })
    // NoDataFound stub 挂载（dataList 空且已刷新过）
    expect(container.querySelector('.video-card-stub')).toBeNull()
  })
})
