import CollectDetailView from '@/views/collect/CollectDetailView.vue'
import { screen, waitFor } from '@testing-library/vue'
import { renderWithProviders } from '@tests/support/render'
import { beforeEach, describe, expect, it, vi } from 'vitest'

const mocks = vi.hoisted(() => ({
  apiGet: vi.fn(),
  apiPut: vi.fn(),
  apiPost: vi.fn(),
  toastError: vi.fn(),
  toastSuccess: vi.fn(),
}))

vi.mock('@/api', () => ({
  default: { get: mocks.apiGet, post: mocks.apiPost, put: mocks.apiPut },
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

const collectFixture = {
  id: '88',
  cn_title: '采集详情剧',
  site: 'tencent',
  type: 'tv',
  status: 'finished',
  tags: JSON.stringify(['Chinese']),
  douban_id: '',
  imdb_id: '',
  tmdb_id: '',
  bangumi_id: '',
  sub_title: '副标题甲',
}

const taskFixture = [{ id: 901, success: true, error_msg: null }]

async function renderDetailView() {
  const result = renderWithProviders(CollectDetailView, { props: { id: '88' } })
  await waitFor(() => {
    expect(mocks.apiGet).toHaveBeenCalledWith('collect/88')
    expect(mocks.apiGet).toHaveBeenCalledWith('collect/task/88')
    expect(mocks.apiGet).toHaveBeenCalledWith('collect/seed/88')
  })
  return result
}

describe('CollectDetailView（冒烟）', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mocks.apiGet.mockImplementation((endpoint: string) => {
      if (endpoint === 'collect/88') return collectFixture
      if (endpoint === 'collect/task/88') return taskFixture
      if (endpoint === 'collect/seed/88') return []
      if (endpoint === 'site/') return []
      throw new Error(`Unexpected GET ${endpoint}`)
    })
  })

  it('挂载即拉取采集详情/任务/做种三组数据', async () => {
    await renderDetailView()
  })

  it('渲染采集标题', async () => {
    await renderDetailView()

    await waitFor(() => {
      expect(screen.getByText('采集详情剧', { exact: false })).toBeTruthy()
    })
  })

  it('任务与做种列表空/有值均不崩', async () => {
    mocks.apiGet.mockImplementation((endpoint: string) => {
      if (endpoint === 'collect/88') return collectFixture
      if (endpoint === 'collect/task/88') return []
      if (endpoint === 'collect/seed/88') return []
      if (endpoint === 'site/') return []
      throw new Error(`Unexpected GET ${endpoint}`)
    })

    await renderDetailView()
  })
})
