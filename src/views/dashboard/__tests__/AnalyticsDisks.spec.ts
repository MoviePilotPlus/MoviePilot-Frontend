import api from '@/api'
import AnalyticsDisks from '@/views/dashboard/AnalyticsDisks.vue'
import { renderWithProviders } from '@tests/support/render'
import { screen, waitFor } from '@testing-library/vue'
import { describe, expect, it, vi, beforeEach } from 'vitest'

vi.mock('@/api', () => ({ default: { get: vi.fn() } }))

const apiGet = vi.mocked(api.get)

describe('AnalyticsDisks', () => {
  beforeEach(() => {
    apiGet.mockReset()
    vi.spyOn(console, 'log').mockImplementation(() => {})
  })

  it('renders every mounted disk with mount point, usage caption and percent', async () => {
    apiGet.mockResolvedValue([
      { mount_point: 'C:\\', fs_type: 'NTFS', total: 2 * 1024 ** 3, used: 512 * 1024 ** 2, free: 1.5 * 1024 ** 3, percent: 25 },
      { mount_point: 'D:\\', fs_type: 'NTFS', total: 1024 ** 3, used: 1024 ** 3, free: 0, percent: 100 },
    ])

    await renderWithProviders(AnalyticsDisks)

    expect(await screen.findByText('C:')).toBeInTheDocument()
    expect(screen.getByText('D:')).toBeInTheDocument()
    expect(screen.getByText('25.0%')).toBeInTheDocument()
    expect(screen.getByText('100.0%')).toBeInTheDocument()
    expect(screen.getByText('已用 512.00 MB / 共 2.00 GB')).toBeInTheDocument()
    expect(screen.getByText('已用 1.00 GB / 共 1.00 GB')).toBeInTheDocument()
    expect(apiGet).toHaveBeenCalledWith('dashboard/disks')
  })

  it('compresses long POSIX mount points for display while keeping the full path in title', async () => {
    apiGet.mockResolvedValue([
      { mount_point: '/Volumes/media', fs_type: 'apfs', total: 1024 ** 3, used: 0, free: 1024 ** 3, percent: 0 },
    ])

    await renderWithProviders(AnalyticsDisks)

    expect(await screen.findByText('/Volumes/media')).toBeInTheDocument()
    expect(screen.getByText('0.0%')).toBeInTheDocument()
    expect(screen.getByText('已用 0.00 B / 共 1.00 GB')).toBeInTheDocument()
  })

  it('shows the empty hint when no disks are returned', async () => {
    apiGet.mockResolvedValue([])

    await renderWithProviders(AnalyticsDisks)

    expect(await screen.findByText('未发现已挂载的磁盘')).toBeInTheDocument()
  })

  it('keeps the empty hint when the request fails', async () => {
    apiGet.mockRejectedValue(new Error('remote unavailable'))

    await renderWithProviders(AnalyticsDisks)

    await waitFor(() => expect(apiGet).toHaveBeenCalledOnce())
    expect(screen.getByText('未发现已挂载的磁盘')).toBeInTheDocument()
  })
})
