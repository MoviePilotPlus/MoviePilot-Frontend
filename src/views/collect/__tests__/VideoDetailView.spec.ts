import VideoDetailView from '@/views/collect/VideoDetailView.vue'
import { screen, waitFor } from '@testing-library/vue'
import { renderWithProviders } from '@tests/support/render'
import { beforeEach, describe, expect, it, vi } from 'vitest'

const mocks = vi.hoisted(() => ({
  apiGet: vi.fn(),
  apiPost: vi.fn(),
  toastError: vi.fn(),
  toastSuccess: vi.fn(),
  toastWarning: vi.fn(),
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
    warning: mocks.toastWarning,
  }),
}))

const mediaDetailFixture = {
  cn_title: '媒体详情剧',
  episode_list: [{ episode: 1, vid: 'v1' }],
  description: '简介内容',
}

async function renderDetailView() {
  const result = renderWithProviders(VideoDetailView, {
    props: {
      source: 'tencent',
      mediaid: 'm60001',
      vid: 'v1',
      title: '媒体详情剧',
      type: 'tv',
      cate: 'TV',
    },
  })
  await waitFor(() => {
    expect(mocks.apiGet).toHaveBeenCalledWith('tencent/detail', expect.anything())
  })
  return result
}

describe('VideoDetailView（冒烟）', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mocks.apiGet.mockImplementation((endpoint: string) => {
      if (endpoint === 'tencent/detail') return mediaDetailFixture
      if (endpoint === 'system/setting/TEAM_PARAMS') return { value: [] }
      if (endpoint === 'site/') return []
      throw new Error(`Unexpected GET ${endpoint}`)
    })
  })

  it('挂载即按 source/mediaid 拉取 {source}/detail', async () => {
    await renderDetailView()
  })

  it('渲染媒体标题', async () => {
    await renderDetailView()

    await waitFor(() => {
      expect(screen.getAllByText('媒体详情剧', { exact: false }).length).toBeGreaterThan(0)
    })
  })

  it('制作组与站点列表同时拉取，缺省不崩', async () => {
    mocks.apiGet.mockImplementation((endpoint: string) => {
      if (endpoint === 'tencent/detail') return mediaDetailFixture
      if (endpoint === 'system/setting/TEAM_PARAMS') return { value: null }
      if (endpoint === 'site/') return []
      throw new Error(`Unexpected GET ${endpoint}`)
    })

    await renderDetailView()
    await waitFor(() => {
      expect(mocks.apiGet).toHaveBeenCalledWith('system/setting/TEAM_PARAMS')
    })
  })
})
