import EditFollowDialog from '@/components/dialog/EditFollowDialog.vue'
import { fireEvent, screen, waitFor } from '@testing-library/vue'
import { renderWithProviders } from '@tests/support/render'
import { beforeEach, describe, expect, it, vi } from 'vitest'

const mocks = vi.hoisted(() => ({
  pluginGet: vi.fn(),
  pluginPut: vi.fn(),
  toastError: vi.fn(),
  toastSuccess: vi.fn(),
}))

vi.mock('@/api', () => ({
  pluginApi: {
    get: mocks.pluginGet,
    put: mocks.pluginPut,
    post: vi.fn(),
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

const sitesFixture = [
  { id: 1, name: '站点甲' },
  { id: 2, name: '站点乙' },
]

const taskFixture = {
  id: 11,
  total_episodes: 12,
  start_episode: 1,
  followed_max_episode: 8,
  check_start_time: '',
  check_end_time: '',
  check_interval_min: 30,
  check_interval_max: 120,
  auto_download: true,
  auto_publish: false,
  anon_publish: true,
  site_list: [1],
  tags: ['中文'],
}

const VDialogStub = { template: '<div><slot /></div>' }

async function renderDialog(followId = 11) {
  // 组件靠 watch(modelValue) 的 false→true 边沿加载数据，初始给 false 再切 true
  const result = await renderWithProviders(EditFollowDialog, {
    props: { followId, modelValue: false },
    global: { stubs: { VDialog: VDialogStub, DialogCloseBtn: true } },
  })
  await result.rerender({ followId, modelValue: true })
  return result
}

describe('EditFollowDialog', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mocks.pluginGet.mockImplementation((endpoint: string) => {
      if (endpoint === 'site/') return envelope(sitesFixture)
      if (endpoint === 'follow/11') return envelope(taskFixture)
      throw new Error(`Unexpected GET ${endpoint}`)
    })
  })

  it('拆 pluginApi 信封加载站点列表与任务详情（2026-08-23 回归）', async () => {
    await renderDialog()

    expect(await screen.findByDisplayValue('8')).toBeTruthy()
    expect(mocks.pluginGet).toHaveBeenCalledWith('follow/11')
    expect(mocks.pluginGet).toHaveBeenCalledWith('site/')
  })

  it('保存时 PUT follow/{id} 且载荷保留任务开关与站点/标签数组', async () => {
    mocks.pluginPut.mockResolvedValue(envelope(null))
    await renderDialog()
    await screen.findByDisplayValue('8')

    await fireEvent.click(screen.getByRole('button', { name: /保存/ }))

    await waitFor(() => {
      expect(mocks.pluginPut).toHaveBeenCalledWith('follow/11', expect.objectContaining({
        followed_max_episode: 8,
        auto_download: true,
        auto_publish: false,
        anon_publish: true,
        site_list: [1],
        tags: ['中文'],
      }))
    })
    expect(mocks.toastSuccess).toHaveBeenCalledWith('保存成功')
  })

  it('业务失败时展示后端 message 不关闭弹窗', async () => {
    mocks.pluginPut.mockResolvedValue(envelope(null, false, '参数越界'))
    const { emitted } = await renderDialog()
    await screen.findByDisplayValue('8')

    await fireEvent.click(screen.getByRole('button', { name: /保存/ }))

    await waitFor(() => {
      expect(mocks.toastError).toHaveBeenCalledWith('参数越界')
    })
    expect(emitted()['updated']).toBeUndefined()
  })
})
