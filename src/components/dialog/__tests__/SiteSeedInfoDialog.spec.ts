import SiteSeedInfoDialog from '@/components/dialog/SiteSeedInfoDialog.vue'
import { fireEvent, screen, waitFor } from '@testing-library/vue'
import { renderWithProviders } from '@tests/support/render'
import { beforeEach, describe, expect, it, vi } from 'vitest'

const mocks = vi.hoisted(() => ({
  pluginGet: vi.fn(),
  pluginDelete: vi.fn(),
  toastError: vi.fn(),
  toastSuccess: vi.fn(),
}))

vi.mock('@/api', () => ({
  pluginApi: {
    get: mocks.pluginGet,
    post: vi.fn(),
    delete: mocks.pluginDelete,
  },
}))

vi.mock('vue-toastification', () => ({
  useToast: () => ({
    error: mocks.toastError,
    success: mocks.toastSuccess,
  }),
}))

function envelope(data: unknown, success = true, message = '') {
  return { success, message, data }
}

const seedProp = {
  id: 55,
  site_name: '站点甲',
  torrent_uploaded: false,
  torrent_downloaded: false,
  torrent_seeded: false,
}

const VDialogStub = { template: '<div><slot /></div>' }

/** 轮询间隔 1.5s×8 次太慢；fake timers 由各用例自行控制。 */
async function renderDialog(seed: Record<string, unknown> = seedProp) {
  return renderWithProviders(SiteSeedInfoDialog, {
    props: { seed },
    global: { stubs: { VDialog: VDialogStub, DialogCloseBtn: true } },
  })
}

describe('SiteSeedInfoDialog', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    vi.useFakeTimers()
    mocks.pluginGet.mockImplementation((endpoint: string) => {
      if (endpoint === 'collect/progress/seed/55') return envelope([])
      if (endpoint === 'collect/seed/detail/55') return envelope(seedProp)
      if (typeof endpoint === 'string' && endpoint.startsWith('collect/torrent_')) return envelope(null)
      throw new Error(`Unexpected GET ${endpoint}`)
    })
    return () => vi.useRealTimers()
  })

  it('拆 pluginApi 信封取 data 加载进度与种子详情（2026-08-23 回归）', async () => {
    mocks.pluginGet.mockImplementation((endpoint: string) => {
      if (endpoint === 'collect/progress/seed/55')
        return envelope([{ id: 1, action: 'torrent_publish', success: true, error_msg: null }])
      if (endpoint === 'collect/seed/detail/55') return envelope(seedProp)
      throw new Error(`Unexpected GET ${endpoint}`)
    })
    await renderDialog()

    await waitFor(() => {
      expect(mocks.pluginGet).toHaveBeenCalledWith('collect/progress/seed/55')
      expect(mocks.pluginGet).toHaveBeenCalledWith('collect/seed/detail/55')
    })
  })

  it('按状态位选择当前步骤：未发布时提交 torrent_publish 带 next_step=true', async () => {
    await renderDialog()

    await waitFor(() => {
      expect(mocks.pluginGet).toHaveBeenCalledWith('collect/seed/detail/55')
    })
    await fireEvent.click(screen.getByRole('button', { name: /发布种子/ }))

    await waitFor(() => {
      expect(mocks.pluginGet).toHaveBeenCalledWith('collect/torrent_publish/55?next_step=true')
    })
  })

  it('勾选仅本步后 next_step=false', async () => {
    await renderDialog()
    await waitFor(() => {
      expect(mocks.pluginGet).toHaveBeenCalledWith('collect/seed/detail/55')
    })

    await fireEvent.click(screen.getByText(/仅执行当前步骤/))
    await fireEvent.click(screen.getByRole('button', { name: /发布种子/ }))

    await waitFor(() => {
      expect(mocks.pluginGet).toHaveBeenCalledWith('collect/torrent_publish/55?next_step=false')
    })
  })

  it('已发布未下载时当前步骤切到 torrent_download', async () => {
    mocks.pluginGet.mockImplementation((endpoint: string) => {
      if (endpoint === 'collect/seed/detail/55')
        return envelope({ ...seedProp, torrent_uploaded: true })
      if (endpoint === 'collect/progress/seed/55') return envelope([])
      throw new Error(`Unexpected GET ${endpoint}`)
    })
    await renderDialog()

    await waitFor(() => {
      expect(mocks.pluginGet).toHaveBeenCalledWith('collect/seed/detail/55')
    })
    await fireEvent.click(screen.getByRole('button', { name: /下载种子/ }))

    await waitFor(() => {
      expect(mocks.pluginGet).toHaveBeenCalledWith('collect/torrent_download/55?next_step=true')
    })
  })

  it('删除种子走 DELETE collect/seed/{id} 并 emit remove', async () => {
    mocks.pluginDelete.mockResolvedValue(envelope(null))
    vi.stubGlobal('confirm', vi.fn(() => true))
    const { emitted } = await renderDialog()
    await waitFor(() => {
      expect(mocks.pluginGet).toHaveBeenCalledWith('collect/seed/detail/55')
    })

    await fireEvent.click(screen.getByRole('button', { name: /删除/ }))

    await waitFor(() => {
      expect(mocks.pluginDelete).toHaveBeenCalledWith('collect/seed/55')
    })
    expect(emitted()['remove']).toBeTruthy()
  })
})
