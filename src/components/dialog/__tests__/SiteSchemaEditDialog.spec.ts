import SiteSchemaEditDialog from '@/components/dialog/SiteSchemaEditDialog.vue'
import { fireEvent, screen, waitFor } from '@testing-library/vue'
import { renderWithProviders } from '@tests/support/render'
import { beforeEach, describe, expect, it, vi } from 'vitest'

const mocks = vi.hoisted(() => ({
  pluginGet: vi.fn(),
  pluginPost: vi.fn(),
  toastError: vi.fn(),
  toastSuccess: vi.fn(),
}))

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

function envelope(data: unknown, success = true, message = '') {
  return { success, message, data }
}

const teamFixture = [
  { team: '组A', copyright: '©A', default: true, order: 1 },
]

/** 站点模板详情：无 id → 新增模式；带 id → 编辑模式。 */
function schemaFixture(withId: boolean) {
  return {
    ...(withId ? { id: 9 } : {}),
    name: '模板站',
    domain: 'tpl.example',
    upload_page: 'https://tpl.example/upload.php',
    upload_api: 'https://tpl.example/takeupload.php',
    template: { type: { movie: '1', tv: '2' } },
  }
}

const VDialogStub = { template: '<div><slot /></div>' }

/** onMounted 立刻取数，mock 必须在渲染前就绪。 */
async function renderDialog(withId: boolean) {
  mocks.pluginGet.mockImplementation((endpoint: string) => {
    if (endpoint === 'system/setting/TEAM_PARAMS') return envelope(envelope(teamFixture))
    if (endpoint === 'siteschema/tpl.example') return envelope(schemaFixture(withId))
    throw new Error(`Unexpected GET ${endpoint}`)
  })
  return renderWithProviders(SiteSchemaEditDialog, {
    props: { site: { domain: 'tpl.example' } },
    global: { stubs: { VDialog: VDialogStub, VDialogCloseBtn: true } },
  })
}

describe('SiteSchemaEditDialog', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mocks.pluginGet.mockImplementation((endpoint: string) => {
      if (endpoint === 'system/setting/TEAM_PARAMS') return envelope(envelope(teamFixture))
      if (endpoint === 'siteschema/tpl.example') return envelope(schemaFixture(true))
      throw new Error(`Unexpected GET ${endpoint}`)
    })
  })

  it('拆 pluginApi 双层信封取团队与站点模板（2026-08-23 回归）', async () => {
    await renderDialog(true)

    expect(await screen.findByDisplayValue('模板站')).toBeTruthy()
    expect(mocks.pluginGet).toHaveBeenCalledWith('siteschema/tpl.example')
    expect(mocks.pluginGet).toHaveBeenCalledWith('system/setting/TEAM_PARAMS')
  })

  it('编辑模式保存 POST siteschema/ 且保留 id 与模板对象', async () => {
    mocks.pluginPost.mockResolvedValue(envelope(null))
    await renderDialog(true)
    await screen.findByDisplayValue('模板站')

    await fireEvent.click(screen.getByRole('button', { name: /保存/ }))

    await waitFor(() => {
      expect(mocks.pluginPost).toHaveBeenCalledWith('siteschema/', expect.objectContaining({
        id: 9,
        name: '模板站',
        domain: 'tpl.example',
      }))
    })
  })

  it('新增模式（无 id）保存剥离 id 字段', async () => {
    mocks.pluginPost.mockResolvedValue(envelope(null))
    await renderDialog(false)
    await screen.findByDisplayValue('模板站')

    await fireEvent.click(screen.getByRole('button', { name: /新增站点模板/ }))

    await waitFor(() => {
      const call = mocks.pluginPost.mock.calls.find(([path]) => path === 'siteschema/')
      expect(call).toBeTruthy()
      expect(call?.[1]).not.toHaveProperty('id')
    })
  })
})
