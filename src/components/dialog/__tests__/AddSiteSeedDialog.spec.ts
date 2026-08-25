import AddSiteSeedDialog from '@/components/dialog/AddSiteSeedDialog.vue'
import { fireEvent, screen, waitFor } from '@testing-library/vue'
import { renderWithProviders } from '@tests/support/render'
import { beforeEach, describe, expect, it, vi } from 'vitest'

const mocks = vi.hoisted(() => ({
  pluginGet: vi.fn(),
  pluginPost: vi.fn(),
  toastError: vi.fn(),
  toastSuccess: vi.fn(),
}))

// AddSiteSeedDialog 经 pluginApi 取数：原样返回 {success, message, data} 信封
vi.mock('@/api', () => ({
  pluginApi: {
    get: mocks.pluginGet,
    post: mocks.pluginPost,
  },
}))

vi.mock('vue-toastification', () => ({
  useToast: () => ({
    error: mocks.toastError,
    success: mocks.toastSuccess,
  }),
}))

const sitesFixture = [
  { id: 1, name: '站点甲' },
  { id: 2, name: '站点乙' },
  { id: 3, name: '站点丙' },
]

const props = {
  title: '添加做种任务',
  siteSeedList: [{ site_id: 2, site_name: '站点乙' }],
  collect: { id: 77 },
}

function envelope(data: unknown, success = true, message = '') {
  return { success, message, data }
}

/** v2 遗留 VDialog 无 modelValue 绑定，stub 为透传容器以聚焦业务逻辑。 */
const VDialogStub = { template: '<div><slot /></div>' }

async function renderDialog(extraProps: Record<string, unknown> = {}) {
  return renderWithProviders(AddSiteSeedDialog, {
    props: { ...props, ...extraProps },
    global: { stubs: { VDialog: VDialogStub, DialogCloseBtn: true } },
  })
}

describe('AddSiteSeedDialog', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mocks.pluginGet.mockImplementation((endpoint: string) => {
      if (endpoint === 'site/') return envelope(sitesFixture)
      throw new Error(`Unexpected GET ${endpoint}`)
    })
  })

  it('拆 pluginApi 信封取 data 并过滤已添加站点（2026-08-23 回归）', async () => {
    await renderDialog()

    expect(await screen.findByText('站点甲')).toBeTruthy()
    expect(screen.getByText('站点丙')).toBeTruthy()
    expect(screen.queryByText('站点乙')).toBeNull()
  })

  it('未选择站点直接提交时阻止并提示，不发 POST', async () => {
    await renderDialog()
    await screen.findByText('站点甲')

    await fireEvent.click(screen.getByRole('button', { name: /添加任务/ }))

    expect(mocks.toastError).toHaveBeenCalledWith('请选择站点')
    expect(mocks.pluginPost).not.toHaveBeenCalled()
  })

  it('选择站点后 POST collect/addSiteSeed 且载荷含 collect_id 与 next_step', async () => {
    mocks.pluginPost.mockResolvedValue(envelope(null))
    await renderDialog()
    await screen.findByText('站点甲')

    await fireEvent.click(screen.getByText('站点甲'))
    await fireEvent.click(screen.getByRole('button', { name: /添加任务/ }))

    await waitFor(() => {
      expect(mocks.pluginPost).toHaveBeenCalledWith('collect/addSiteSeed', {
        site_list: [1],
        collect_id: 77,
        next_step: true,
      })
    })
    expect(mocks.toastSuccess).toHaveBeenCalledWith('添加做种任务成功！')
  })

  it('业务失败（success=false）时展示 message 并 emit error', async () => {
    mocks.pluginPost.mockResolvedValue(envelope(null, false, '站点不可用'))
    const { emitted } = await renderDialog()
    await screen.findByText('站点甲')

    await fireEvent.click(screen.getByText('站点甲'))
    await fireEvent.click(screen.getByRole('button', { name: /添加任务/ }))

    await waitFor(() => {
      expect(mocks.toastError).toHaveBeenCalledWith(expect.stringContaining('站点不可用'))
    })
    expect(emitted()['error']).toBeTruthy()
  })
})
