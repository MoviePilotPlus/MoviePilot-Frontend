import FollowView from '@/views/collect/FollowView.vue'
import { fireEvent, screen, waitFor } from '@testing-library/vue'
import { renderWithProviders } from '@tests/support/render'
import { beforeEach, describe, expect, it, vi } from 'vitest'

const mocks = vi.hoisted(() => ({
  apiGet: vi.fn(),
  apiPost: vi.fn(),
  apiDelete: vi.fn(),
  toastError: vi.fn(),
  toastInfo: vi.fn(),
  toastSuccess: vi.fn(),
}))

vi.mock('@/api', () => ({
  default: {
    get: mocks.apiGet,
    post: mocks.apiPost,
    delete: mocks.apiDelete,
  },
  pluginApi: { get: vi.fn(), post: vi.fn() },
}))

vi.mock('vue-toastification', () => ({
  useToast: () => ({
    error: mocks.toastError,
    info: mocks.toastInfo,
    success: mocks.toastSuccess,
  }),
}))

const sitesFixture = [
  { id: 1, name: '站点甲' },
  { id: 2, name: '站点乙' },
]

const tasksFixture = [
  {
    id: 11,
    cn_title: '追更剧甲',
    en_title: 'Follow A',
    name: 'follow-a',
    site: 'tencent',
    defn: '1080P',
    year: 2025,
    season: 1,
    tags: ['Chinese'],
    site_list: [1, 2],
    is_active: true,
    is_finished: false,
    start_episode: 1,
    followed_max_episode: 8,
    total_episodes: 12,
    check_start_time: '08:00',
    check_end_time: '22:00',
    check_interval_min: 30,
    check_interval_max: 120,
    team: '组A',
    last_check_time: '2026-08-24 10:00',
    auto_download: true,
    auto_publish: true,
  },
  {
    id: 12,
    cn_title: '完结剧乙',
    site: 'iqiyi',
    defn: '4K',
    year: 2024,
    tags: [],
    site_list: [99],
    is_active: false,
    is_finished: true,
    followed_max_episode: 10,
    total_episodes: 10,
    check_interval_min: null,
    check_interval_max: null,
  },
]

async function renderFollowView() {
  return renderWithProviders(FollowView, {
    stubActions: false,
    global: {
      // v-menu 的 overlay 动画对业务断言无意义，stub 后菜单项直接平铺可查询
      stubs: {
        VMenu: { props: { closeOnContentClick: Boolean }, template: '<div class="v-menu-stub"><slot name="activator" /><slot /></div>' },
      },
    },
  })
}

async function waitForTasks() {
  await screen.findByText('追更剧甲')
}

describe('FollowView', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mocks.apiGet.mockImplementation((endpoint: string) => {
      if (endpoint === 'follow/') return tasksFixture
      if (endpoint === 'site/') return sitesFixture
      throw new Error(`Unexpected GET ${endpoint}`)
    })
  })

  it('加载追更任务与站点列表并渲染任务卡', async () => {
    await renderFollowView()
    await waitForTasks()

    expect(mocks.apiGet).toHaveBeenCalledWith('follow/')
    expect(mocks.apiGet).toHaveBeenCalledWith('site/')
    expect(screen.getByText('完结剧乙')).toBeTruthy()
  })

  it('站点 chip 用站点名渲染，未知站点回退 站点{id}', async () => {
    await renderFollowView()
    await waitForTasks()

    expect(screen.getByText('站点甲')).toBeTruthy()
    expect(screen.getByText('站点乙')).toBeTruthy()
    expect(screen.getByText('站点99')).toBeTruthy()
  })

  it('状态映射：追更中/已完结 文案正确', async () => {
    await renderFollowView()
    await waitForTasks()

    expect(screen.getByText('追更中')).toBeTruthy()
    expect(screen.getByText('已完结')).toBeTruthy()
  })

  it('追更进度按集数百分比展示', async () => {
    await renderFollowView()
    await waitForTasks()

    expect(screen.getByText('67%')).toBeTruthy()
    expect(screen.getByText('100%')).toBeTruthy()
  })

  it('手动检测 POST follow/{id}/check 后刷新列表', async () => {
    mocks.apiPost.mockResolvedValue(undefined)
    await renderFollowView()
    await waitForTasks()

    // 菜单项随 VMenu stub 平铺渲染（每个任务卡一份），取第一份点立即检测
    await fireEvent.click(screen.getAllByText('立即检测')[0])

    await waitFor(() => {
      expect(mocks.apiPost).toHaveBeenCalledWith('follow/11/check')
    })
    expect(mocks.toastInfo).toHaveBeenCalledWith('正在检测...')
  })

  it('暂停/启用切换 POST follow/{id}/toggle', async () => {
    mocks.apiPost.mockResolvedValue(undefined)
    await renderFollowView()
    await waitForTasks()

    await fireEvent.click(await screen.findByText('暂停'))

    await waitFor(() => {
      expect(mocks.apiPost).toHaveBeenCalledWith('follow/11/toggle')
    })
  })

  it('空任务列表展示引导文案', async () => {
    mocks.apiGet.mockImplementation((endpoint: string) => {
      if (endpoint === 'follow/') return []
      if (endpoint === 'site/') return sitesFixture
      throw new Error(`Unexpected GET ${endpoint}`)
    })
    await renderFollowView()

    expect(await screen.findByText('暂无追更任务')).toBeTruthy()
  })

  it('加载失败时 toast 报错且不渲染任务卡', async () => {
    mocks.apiGet.mockImplementation((endpoint: string) => {
      if (endpoint === 'follow/') throw new Error('boom')
      if (endpoint === 'site/') return sitesFixture
      throw new Error(`Unexpected GET ${endpoint}`)
    })
    await renderFollowView()

    await waitFor(() => {
      expect(mocks.toastError).toHaveBeenCalledWith('加载追更任务失败')
    })
    expect(screen.queryByText('追更剧甲')).toBeNull()
  })
})
