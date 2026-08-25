import TencentView from '@/views/collect/TencentView.vue'
import { waitFor } from '@testing-library/vue'
import { renderWithProviders } from '@tests/support/render'
import { beforeEach, describe, expect, it, vi } from 'vitest'

const mocks = vi.hoisted(() => ({
  apiGet: vi.fn(),
  apiPost: vi.fn(),
}))

// 六源同构契约：@/api 与 pluginApi 共用同一组 spy
vi.mock('@/api', () => ({
  default: { get: mocks.apiGet, post: mocks.apiPost },
  pluginApi: { get: mocks.apiGet, post: mocks.apiPost },
}))

vi.mock('vue-toastification', () => ({
  useToast: () => ({ error: vi.fn(), info: vi.fn(), success: vi.fn() }),
}))

const CardListStub = {
  props: { apipath: { type: String, default: '' } },
  template: '<div class="media-card-list-stub" :data-apipath="apipath" />',
}

function categoryFixture() {
  return [
    { filter_key: 'type', index_name: 'type', key: '1', value: '电视剧' },
    { filter_key: 'area', index_name: 'area', key: '3', value: '内地' },
  ]
}

async function renderSourceView() {
  const result = renderWithProviders(TencentView, {
    global: { stubs: { MediaCardListView: CardListStub, MediaSearchView: true } },
  })
  await waitFor(() => {
    expect(mocks.apiGet).toHaveBeenCalledWith('tencent/category', expect.anything())
  })
  return result
}

describe('TencentView（六源同构契约）', () => {
  beforeEach(() => {
    mocks.apiGet.mockReset()
    mocks.apiGet.mockImplementation((endpoint: string) => {
      if (endpoint === 'tencent/category') return categoryFixture()
      if (endpoint === 'tencent/user/info') return { is_login: true, vip_status: 1 }
      return []
    })
  })

  it('挂载即拉取 tencent/category 分类', async () => {
    await renderSourceView()
  })

  it('媒体列表接线到本源的 page_data 端点', async () => {
    const { container } = await renderSourceView()

    await waitFor(() => {
      expect(container.querySelector('.media-card-list-stub')).toBeTruthy()
    })
    expect((container.querySelector('.media-card-list-stub') as HTMLElement).dataset.apipath).toBe('tencent/page_data')
  })
      it('拉取并展示登录用户信息', async () => {
        await renderSourceView()
        expect(mocks.apiGet).toHaveBeenCalledWith('tencent/user/info')
      })

})
