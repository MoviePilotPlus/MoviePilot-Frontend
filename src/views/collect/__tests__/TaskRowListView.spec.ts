import TaskRowListView from '@/views/collect/TaskRowListView.vue'
import type { Collect } from '@/api/types'
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
  default: {
    get: mocks.apiGet,
    post: mocks.apiPost,
  },
  pluginApi: { get: vi.fn(), post: vi.fn() },
}))

vi.mock('vue-toastification', () => ({
  useToast: () => ({
    error: mocks.toastError,
    success: mocks.toastSuccess,
    warning: mocks.toastWarning,
  }),
}))

const sitesFixture = [
  { id: 1, name: '站点甲', is_active: true },
  { id: 2, name: '站点乙', is_active: false },
]

function collectFixture(id: number, overrides: Partial<Record<string, unknown>> = {}): Collect {
  return {
    id,
    cn_title: `任务${id}`,
    en_title: `task-${id}`,
    name: `task-${id}`,
    site: 'tencent',
    status: 'finished',
    team: '组A',
    resolution: '1080p',
    video_codec: 'h264',
    hdr_format: '',
    media_base_dir: '/media',
    file_size: 2 * 1024 * 1024 * 1024,
    seeds: [{ id: id * 10, site_id: 1, site_name: '站点甲', deleted: false }],
    tags: [],
    ...overrides,
  } as unknown as Collect
}

// VMenu activator="parent" 在 jsdom 卸载时找不到 parent vnode 会崩，stub 为纯透传
const VMenuStub = { template: '<div class="v-menu-stub"><slot /></div>' }
// TaskItem 内部 Vuetify 列表组件在 jsdom 渲染崩（VListItemTitle vnode null），
// 以标题替身保留行级断言所需的最小结构
const TaskItemStub = {
  props: { task: { type: Object, required: true } },
  emits: ['remove'],
  template: '<div class="task-item-stub"><span>{{ task.cn_title }}</span><span v-for="seed in task.seeds" :key="seed.id">{{ seed.site_name }}</span></div>',
}

describe('TaskRowListView', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mocks.apiGet.mockImplementation((endpoint: string) => {
      if (endpoint === 'site/') return sitesFixture
      throw new Error(`Unexpected GET ${endpoint}`)
    })
  })

  it('挂载即拉取站点列表（筛选项数据源）', async () => {
    renderWithProviders(TaskRowListView, { props: { items: [collectFixture(1)] }, global: { stubs: { VMenu: VMenuStub, TaskItem: TaskItemStub } } })

    await waitFor(() => {
      expect(mocks.apiGet).toHaveBeenCalledWith('site/')
    })
  })

  it('渲染任务标题', async () => {
    renderWithProviders(TaskRowListView, { props: { items: [collectFixture(1), collectFixture(2)] }, global: { stubs: { VMenu: VMenuStub, TaskItem: TaskItemStub } } })

    expect(await screen.findByText('任务1', { exact: false })).toBeTruthy()
    expect(screen.getByText('任务2', { exact: false })).toBeTruthy()
  })

  it('已删除的做种记录不参与渲染', async () => {
    renderWithProviders(TaskRowListView, {
      props: {
        items: [collectFixture(3, { seeds: [{ id: 31, site_id: 1, site_name: '站点甲', deleted: true }] })],
      },
      global: { stubs: { VMenu: VMenuStub, TaskItem: TaskItemStub } },
    })

    await waitFor(() => {
      expect(mocks.apiGet).toHaveBeenCalledWith('site/')
    })
    // deleted seed 被 filterSiteSeed 过滤，站点 chip 不出现
    expect(screen.queryByText('站点甲')).toBeNull()
  })
})
