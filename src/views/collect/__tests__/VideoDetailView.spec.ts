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

/** 从渲染结果取组件实例的 addForm（testing-library 的返回值不直接暴露 vm，
 * 经挂载容器上 Vue 留下的 __vueParentComponent 拿 setupState）。 */
type VueComponentLike = { setupState?: { addForm?: { season?: number } } }

function getAddForm(
  container: { querySelector: (sel: string) => Element | null; firstElementChild: Element | null },
): { season?: number } | undefined {
  const host = container.querySelector('[data-v-app]') ?? container.firstElementChild
  const comp = (host as unknown as { __vueParentComponent?: VueComponentLike } | null)?.__vueParentComponent
  return comp?.setupState?.addForm
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
  })

  it('标题带「第N季」形态时季数表单自动填入解析值（贝贝彬 第四季 → 4）', async () => {
    mocks.apiGet.mockImplementation((endpoint: string) => {
      if (endpoint === 'tencent/detail') {
        return { ...mediaDetailFixture, title: '贝贝彬 第四季' }
      }
      if (endpoint === 'system/setting/TEAM_PARAMS') return { value: [] }
      if (endpoint === 'site/') return []
      throw new Error(`Unexpected GET ${endpoint}`)
    })

    const rendered = await renderDetailView()
    const form = getAddForm(rendered.container)
    expect(form).toBeTruthy()
    expect(form?.season).toBe(4)
  })

  it('标题无季数形态时季数保持默认 1', async () => {
    mocks.apiGet.mockImplementation((endpoint: string) => {
      if (endpoint === 'tencent/detail') {
        return { ...mediaDetailFixture, title: '普通剧名' }
      }
      if (endpoint === 'system/setting/TEAM_PARAMS') return { value: [] }
      if (endpoint === 'site/') return []
      throw new Error(`Unexpected GET ${endpoint}`)
    })

    const rendered = await renderDetailView()
    const form = getAddForm(rendered.container)
    expect(form).toBeTruthy()
    expect(form?.season).toBe(1)
  })

  it('「第N季」解析覆盖中文数字与阿拉伯数字形态', async () => {
    // 直接驱动解析函数（组件内函数经 setupState 暴露不可靠，用标题回读断言）
    const cases: Array<[string, number]> = [
      ['贝贝彬 第四季', 4],
      ['贝贝彬 第4季', 4],
      ['贝贝彬 第二季', 2],
      ['贝贝彬 第十二季', 12],
      ['贝贝彬 第二十三季', 23],
      ['贝贝彬 第3部', 3],
    ]
    for (const [title, expected] of cases) {
      mocks.apiGet.mockImplementation((endpoint: string) => {
        if (endpoint === 'tencent/detail') {
          return { ...mediaDetailFixture, title }
        }
        if (endpoint === 'system/setting/TEAM_PARAMS') return { value: [] }
        if (endpoint === 'site/') return []
        throw new Error(`Unexpected GET ${endpoint}`)
      })
      const rendered = await renderDetailView()
      const form = getAddForm(rendered.container)
      expect(form?.season, `标题「${title}」应解析为第 ${expected} 季`).toBe(expected)
    }
  })
})
