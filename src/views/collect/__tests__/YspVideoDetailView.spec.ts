import YspVideoDetailView from '@/views/collect/YspVideoDetailView.vue'
import { waitFor } from '@testing-library/vue'
import { renderWithProviders } from '@tests/support/render'
import { beforeEach, describe, expect, it, vi } from 'vitest'

const mocks = vi.hoisted(() => ({
  apiGet: vi.fn(),
  apiPost: vi.fn(),
  toastError: vi.fn(),
  toastSuccess: vi.fn(),
}))

vi.mock('@/api', () => ({
  default: { get: mocks.apiGet, post: mocks.apiPost },
  pluginApi: { get: mocks.apiGet, post: mocks.apiPost },
}))

vi.mock('vue-toastification', () => ({
  useToast: () => ({
    error: mocks.toastError,
    info: vi.fn(),
    success: mocks.toastSuccess,
    warning: vi.fn(),
  }),
}))

vi.mock('vue-router', async () => {
  const actual = await vi.importActual<typeof import('vue-router')>('vue-router')
  return { ...actual, useRouter: () => ({ push: vi.fn() }) }
})

vi.mock('hls.js', () => ({ default: class {} }))

async function renderDetailView() {
  const result = renderWithProviders(YspVideoDetailView, {
    props: {
      source: 'ysp',
      mediaid: 'ch-1',
      cnlid: 'ch-1',
      name: '央视频道一',
      livepid: 'live-1',
      title: '新闻联播 2026-08-25',
      type: 'tv',
      cate: 'TV',
      startTime: '2026-08-25 12:00:00',
      endTime: '2026-08-25 12:30:00',
    },
  })
  await waitFor(() => {
    expect(mocks.apiGet).toHaveBeenCalledWith('site/')
  })
  return result
}

describe('YspVideoDetailView（冒烟）', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mocks.apiGet.mockImplementation((endpoint: string) => {
      if (endpoint === 'site/') return [{ id: 1, name: '站点甲', is_active: true }]
      if (endpoint === 'system/setting/TEAM_PARAMS') return { value: [] }
      if (typeof endpoint === 'string' && endpoint.startsWith('ysp/get_live_program_douban_info')) return {}
      throw new Error(`Unexpected GET ${endpoint}`)
    })
  })

  it('挂载即拉取站点列表并自动选中第一个站点', async () => {
    await renderDetailView()
  })

  it('拉取制作组选项与节目豆瓣信息', async () => {
    await renderDetailView()

    await waitFor(() => {
      expect(mocks.apiGet).toHaveBeenCalledWith('system/setting/TEAM_PARAMS')
    })
    await waitFor(() => {
      const doubanCall = mocks.apiGet.mock.calls.find(([endpoint]) =>
        String(endpoint).startsWith('ysp/get_live_program_douban_info'))
      expect(doubanCall).toBeTruthy()
    })
  })
})
