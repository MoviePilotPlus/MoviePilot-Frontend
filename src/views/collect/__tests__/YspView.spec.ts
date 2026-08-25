import YspView from '@/views/collect/YspView.vue'
import { screen, waitFor } from '@testing-library/vue'
import { renderWithProviders } from '@tests/support/render'
import { beforeEach, describe, expect, it, vi } from 'vitest'

const mocks = vi.hoisted(() => ({
  apiGet: vi.fn(),
  apiPost: vi.fn(),
}))

vi.mock('@/api', () => ({
  default: { get: mocks.apiGet, post: mocks.apiPost },
  pluginApi: { get: mocks.apiGet, post: mocks.apiPost },
}))

vi.mock('vue-router', async () => {
  const actual = await vi.importActual<typeof import('vue-router')>('vue-router')
  return { ...actual, useRouter: () => ({ push: vi.fn() }) }
})

// hls.js 仅在播放器激活时用；jsdom 下 stub 掉原生依赖
vi.mock('hls.js', () => ({ default: class {} }))

const channelsFixture = [
  { cnlid: 'ch-1', livepid: 'live-1', name: '央视频道一' },
  { cnlid: 'ch-2', livepid: 'live-2', name: '央视频道二' },
]

const epgFixture = [{ time: '20260825120000', title: '新闻联播' }]

async function renderYspView() {
  const result = renderWithProviders(YspView, { stubActions: false })
  await waitFor(() => {
    expect(mocks.apiGet).toHaveBeenCalledWith('ysp/get_channel_list')
  })
  return result
}

describe('YspView（央视频）', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    localStorage.clear()
    mocks.apiGet.mockImplementation((endpoint: string) => {
      if (endpoint === 'ysp/get_channel_list') return channelsFixture
      if (typeof endpoint === 'string' && endpoint.startsWith('ysp/get_epg')) return epgFixture
      if (endpoint === 'collect/reserved/tasks') return []
      throw new Error(`Unexpected GET ${endpoint}`)
    })
  })

  it('挂载拉取频道列表并默认选中第一个频道拉取节目单', async () => {
    await renderYspView()

    await waitFor(() => {
      expect(mocks.apiGet).toHaveBeenCalledWith(
        expect.stringMatching(/^ysp\/get_epg\?channel_id=live-1&date=\d{8}$/),
      )
    })
    expect(screen.getAllByText('央视频道').length).toBe(2)
    
  })

  it('localStorage 记忆的上次频道优先选中', async () => {
    localStorage.setItem('ysp_last_channel_id', 'live-2')
    await renderYspView()

    await waitFor(() => {
      expect(mocks.apiGet).toHaveBeenCalledWith(
        expect.stringMatching(/^ysp\/get_epg\?channel_id=live-2&date=\d{8}$/),
      )
    })
  })

  it('同时拉取采集预约任务列表', async () => {
    await renderYspView()

    await waitFor(() => {
      expect(mocks.apiGet).toHaveBeenCalledWith('collect/reserved/tasks')
    })
  })

  it('频道接口失败时展示错误文案不炸', async () => {
    mocks.apiGet.mockImplementation((endpoint: string) => {
      if (endpoint === 'ysp/get_channel_list') throw new Error('boom')
      if (endpoint === 'collect/reserved/tasks') return []
      throw new Error(`Unexpected GET ${endpoint}`)
    })

    await renderYspView().catch(() => undefined)

    await waitFor(() => {
      expect(screen.getByText('获取频道列表失败')).toBeTruthy()
    })
  })
})
