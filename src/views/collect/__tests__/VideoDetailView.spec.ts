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

  it('豆瓣候选：选中态跟表单 ID 走，点选非默认候选后对勾迁移', async () => {
    // 先装候选 mock 再渲染（renderDetailView 内部会触发 detail 请求）
    // 带豆瓣候选与自动匹配项（douban_info=1394968，候选里还有 4926002）
    mocks.apiGet.mockImplementation((endpoint: string) => {
      if (endpoint === 'tencent/detail') {
        return {
          ...mediaDetailFixture,
          new_pic_vt: 'https://img.example/poster.jpg',
          year: '2005',
          douban_id: '1394968',
          douban_info: { id: '1394968', title: '举起手来！', year: '2005' },
          douban_list: [
            { id: '1394968', title: '举起手来！', year: '2005' },
            { id: '4926002', title: '举起手来2', year: '2010' },
          ],
        }
      }
      if (endpoint === 'system/setting/TEAM_PARAMS') return { value: [] }
      if (endpoint === 'site/') return []
      if (endpoint.startsWith('collect/status/')) return {}
      if (endpoint.startsWith('collect/ptgen/info')) return {}
      throw new Error(`Unexpected GET ${endpoint}`)
    })

    const rendered = await renderDetailView()
    const { container } = rendered
    await waitFor(() => {
      expect(container.querySelector('.douban-candidate-strip')).toBeTruthy()
    })
    const strip = container.querySelector('.douban-candidate-strip') as HTMLElement
    expect(strip.querySelectorAll('.douban-candidate').length).toBe(2)
    // 初始：自动匹配项（1394968）带选中态
    const cards = Array.from(strip.querySelectorAll('.douban-candidate')) as HTMLElement[]
    const activeIdx = cards.findIndex(card => card.classList.contains('douban-candidate--active'))
    expect(activeIdx).toBeGreaterThanOrEqual(0)
    expect(cards[activeIdx].querySelector('.douban-candidate__title')?.textContent).toContain('举起手来！')

    // 点选另一条候选 → 选中态迁移（对勾/描边跟 addForm.douban_id 走）
    const target = cards.find(card => !card.classList.contains('douban-candidate--active')) as HTMLElement
    target.click()
    await waitFor(() => {
      const actives = cards.filter(card => card.classList.contains('douban-candidate--active'))
      expect(actives).toHaveLength(1)
      expect(actives[0].querySelector('.douban-candidate__title')?.textContent).toContain('举起手来2')
    })
  })
})
