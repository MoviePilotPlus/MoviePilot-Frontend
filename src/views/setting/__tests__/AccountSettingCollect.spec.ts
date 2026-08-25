import AccountSettingCollect from '@/views/setting/AccountSettingCollect.vue'
import { fireEvent, screen, waitFor, within } from '@testing-library/vue'
import { renderWithProviders } from '@tests/support/render'
import { beforeEach, describe, expect, it, vi } from 'vitest'

const mocks = vi.hoisted(() => ({
  apiGet: vi.fn(),
  apiPost: vi.fn(),
  toastError: vi.fn(),
  toastInfo: vi.fn(),
  toastSuccess: vi.fn(),
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
    info: mocks.toastInfo,
    success: mocks.toastSuccess,
  }),
}))

/** system/setting/{key} 的 GET 返回 {value: 配置} 双层信封（上游形态）。 */
function settingEnvelope(value: unknown) {
  return { value }
}

/** system/env 采集段默认：只含会参与表单回填的键。 */
const systemEnvFixture: Record<string, unknown> = {
  MEDIA_DIR: '/media',
  DOWNLOAD_DIR: '/downloads',
  DOWNLOADER_THREAD_COUNT: 3,
  DOWNLOADER_SPEED: '20M',
  DOWNLOADER_DELETE_AFTER_DONE: false,
  YOUKU_DOWNLOAD_LINE: 'android',
}

const siteListFixture = [
  { id: 1, name: '站点A', domain: 'a.example' },
  { id: 2, name: '站点B', domain: 'b.example' },
]

const imageHostingFixture = {
  ipic: { active: true },
  imgbb: { apikey: 'bb-key', active: true },
  panda: { apikey: '', active: true },
  imgbox: { username: '', password: '', active: true },
}

const teamParamsFixture = [
  { team: '组A', copyright: '©A', declare: '', ban_reprint: '', default: true, order: 1 },
  { team: '组B', copyright: '©B', declare: '', ban_reprint: '', default: false, order: 2 },
]

/** 复刻页面 onMounted 的全量 GET 面；未预期的端点直接抛错暴露契约漂移。 */
function mockAllSettings(overrides: { imageHosting?: unknown } = {}) {
  mocks.apiGet.mockImplementation((endpoint: string) => {
    switch (endpoint) {
      case 'system/env':
        return systemEnvFixture
      case 'collect/screenshot-fonts':
        return []
      case 'site/icon/1':
      case 'site/icon/2':
        return null
      case 'system/setting/TencentCookie':
        return settingEnvelope('tencent-cookie-1')
      case 'system/setting/MgTvTicket':
        return settingEnvelope('tv-ticket-1')
      case 'system/setting/MgAppTicket':
        return settingEnvelope('app-ticket-1')
      case 'system/setting/IQiyiCookie':
        return settingEnvelope('iqiyi-cookie-1')
      case 'system/setting/YoukuCookie':
        return settingEnvelope('youku-cookie-1')
      case 'system/setting/YoukuStoken':
        return settingEnvelope('youku-stoken-1')
      case 'system/setting/BilibiliCookie':
        return settingEnvelope('bili-cookie-1')
      case 'system/setting/ImageHostingParams':
        return settingEnvelope(overrides.imageHosting ?? imageHostingFixture)
      case 'system/setting/MediaServers':
        return settingEnvelope(null)
      case 'system/setting/TEAM_PARAMS':
        return settingEnvelope(teamParamsFixture)
      case 'site/':
        return siteListFixture
      case 'siteschema/':
        return []
      default:
        throw new Error(`Unexpected GET ${endpoint}`)
    }
  })
}

function getCardByTitle(title: string) {
  const card = screen.getByText(title, { selector: '.v-card-title' }).closest('.v-card') as HTMLElement
  expect(card).not.toBeNull()
  const queries = within(card)
  return { ...queries, element: card }
}

/** 等待挂载期的全部异步 GET 收敛。 */
async function waitForMountedLoads() {
  await waitFor(() => {
    expect(mocks.apiGet).toHaveBeenCalledWith('system/setting/TEAM_PARAMS')
    expect(mocks.apiGet).toHaveBeenCalledWith('site/')
  })
}

async function renderCollectSettings() {
  const result = renderWithProviders(AccountSettingCollect, { stubActions: false })
  await waitForMountedLoads()
  return result
}

describe('AccountSettingCollect', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockAllSettings()
  })

  it('拆开 system/setting 双层信封回填七类 Cookie/Ticket 表单', async () => {
    await renderCollectSettings()

    const tencentCard = getCardByTitle('腾讯视频Cookie')
    expect(tencentCard.getAllByDisplayValue('tencent-cookie-1').length).toBeGreaterThan(0)

    const iqiyiCard = getCardByTitle('爱奇艺Cookie')
    expect(iqiyiCard.getAllByDisplayValue('iqiyi-cookie-1').length).toBeGreaterThan(0)

    const youkuCard = getCardByTitle('优酷Cookie')
    expect(youkuCard.getAllByDisplayValue('youku-cookie-1').length).toBeGreaterThan(0)

    const stokenCard = getCardByTitle('优酷Stoken')
    expect(stokenCard.getAllByDisplayValue('youku-stoken-1').length).toBeGreaterThan(0)

    const biliCard = getCardByTitle('哔哩哔哩Cookie')
    expect(biliCard.getAllByDisplayValue('bili-cookie-1').length).toBeGreaterThan(0)
  })

  it('信封 value 为 null 时表单保持空串不炸（未配置过的新装场景）', async () => {
    mocks.apiGet.mockImplementation((endpoint: string) => {
      if (endpoint.startsWith('system/setting/')) return { value: null }
      if (endpoint === 'system/env') return {}
      if (endpoint === 'site/') return []
      if (endpoint === 'siteschema/') return []
      throw new Error(`Unexpected GET ${endpoint}`)
    })

    await renderCollectSettings()

    const tencentCard = getCardByTitle('腾讯视频Cookie')
    const input = tencentCard.element.querySelector("input, textarea") as HTMLInputElement
    expect(input.value).toBe('')
  })

  it('图床设置拆信封取 value 并合并默认子键（2026-08-24 信封回归）', async () => {
    await renderCollectSettings()

    // 存量配置里 imgbb 的 apikey 应回填进表单；未配置的图床保留默认开关
    const hostingCard = getCardByTitle('图床设置')
    const inputs = hostingCard.element.querySelectorAll('input, textarea')
    const values = Array.from(inputs).map(el => (el as HTMLInputElement).value)
    expect(values).toContain('bb-key')
  })

  it('图床存量配置携带 smms 死键时合并结果不回写死键', async () => {
    mocks.apiGet.mockImplementation((endpoint: string) => {
      if (endpoint === 'system/setting/ImageHostingParams')
        return settingEnvelope({ ...imageHostingFixture, smms: { apikey: 'dead', active: true } })
      return null
    })
    // 覆盖默认实现后重新放行其它端点
    mocks.apiGet.mockImplementation((endpoint: string) => {
      if (endpoint === 'system/setting/ImageHostingParams')
        return settingEnvelope({ ...imageHostingFixture, smms: { apikey: 'dead', active: true } })
      if (endpoint === 'system/env') return systemEnvFixture
      if (endpoint === 'system/setting/MediaServers') return settingEnvelope(null)
      if (endpoint === 'system/setting/TEAM_PARAMS') return settingEnvelope(teamParamsFixture)
      if (endpoint.startsWith('system/setting/')) return settingEnvelope(null)
      if (endpoint === 'site/' || endpoint === 'siteschema/') return []
      throw new Error(`Unexpected GET ${endpoint}`)
    })

    await renderCollectSettings()

    // 打开图床卡片保存动作，断言 POST 载荷不含 smms
    const hostingCard = getCardByTitle('图床设置')
    await fireEvent.click(hostingCard.getAllByRole('button', { name: /保存/ })[0])
    await waitFor(() => {
      const call = mocks.apiPost.mock.calls.find(([path]) => path === 'system/setting/ImageHostingParams')
      expect(call).toBeTruthy()
      expect(Object.keys(call?.[1] as Record<string, unknown>)).not.toContain('smms')
    })
  })

  it('保存 Cookie 时 POST 原值到对应 system/setting 键', async () => {
    await renderCollectSettings()

    const tencentCard = getCardByTitle('腾讯视频Cookie')
    await fireEvent.click(tencentCard.getByRole('button', { name: /保存/ }))
    await waitFor(() => {
      expect(mocks.apiPost).toHaveBeenCalledWith('system/setting/TencentCookie', 'tencent-cookie-1')
    })
    expect(mocks.toastSuccess).toHaveBeenCalledWith('腾讯视频Cookie保存成功')
  })

  it('基础设置保存 POST system/env 且只含表单声明键', async () => {
    await renderCollectSettings()

    const basicCard = getCardByTitle('基础设置')
    await fireEvent.click(basicCard.getByRole('button', { name: /保存/ }))
    await waitFor(() => {
      const call = mocks.apiPost.mock.calls.find(([path]) => path === 'system/env')
      expect(call).toBeTruthy()
      const payload = call?.[1] as Record<string, unknown>
      expect(payload.MEDIA_DIR).toBe('/media')
      expect(payload.YOUKU_DOWNLOAD_LINE).toBeUndefined()
    })
  })

  it('优酷下载线路保存独立 POST，不夹带基础设置键', async () => {
    await renderCollectSettings()

    const youkuCard = getCardByTitle('优酷下载线路')
    await fireEvent.click(youkuCard.getByRole('button', { name: /保存/ }))
    await waitFor(() => {
      const call = mocks.apiPost.mock.calls.find(([path]) => path === 'system/env')
      expect(call).toBeTruthy()
      const payload = call?.[1] as Record<string, unknown>
      expect(payload.YOUKU_DOWNLOAD_LINE).toBe('android')
      expect(payload.MEDIA_DIR).toBeUndefined()
    })
  })

  it('制作组配置按 order 排序加载并保留默认标记', async () => {
    await renderCollectSettings()

    const teamCard = getCardByTitle('制作组配置')
    expect(teamCard.getAllByDisplayValue('组A').length).toBeGreaterThan(0)
    expect(teamCard.getAllByDisplayValue('组B').length).toBeGreaterThan(0)
  })

  it('腾讯API设置卡片已移除，不再渲染任何 CHACHA20/CKEY42 输入', async () => {
    await renderCollectSettings()

    expect(screen.queryByText('腾讯API设置')).toBeNull()
    expect(screen.queryByDisplayValue(/chacha/i)).toBeNull()
    // 页面上不得再出现对这两个配置键的 GET
    expect(mocks.apiGet.mock.calls.some(([endpoint]) => String(endpoint).includes('CHACHA20') || String(endpoint).includes('CKEY42'))).toBe(false)
  })
})
