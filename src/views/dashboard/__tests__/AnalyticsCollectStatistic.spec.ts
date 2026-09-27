import api from '@/api'
import AnalyticsCollectStatistic from '@/views/dashboard/AnalyticsCollectStatistic.vue'
import type { CollectStatistic } from '@/api/types'
import { renderWithProviders } from '@tests/support/render'
import { screen, waitFor } from '@testing-library/vue'
import { defineComponent } from 'vue'
import { describe, expect, it, vi } from 'vitest'

vi.mock('@/api', () => ({ default: { get: vi.fn() } }))
vi.mock('@/composables/useDashboardMotion', async importOriginal => {
  const actual = await importOriginal<typeof import('@/composables/useDashboardMotion')>()
  return {
    ...actual,
    useAnimatedDashboardNumber: (source: { value: number }) => source,
  }
})

const apiGet = vi.mocked(api.get)
const snapshotKey = 'MP_DASHBOARD_SNAPSHOT_V1:7:collect-statistic-v1'

function deferred<T>() {
  let resolve!: (value: T) => void
  const promise = new Promise<T>(resolver => {
    resolve = resolver
  })
  return { promise, resolve }
}

describe('AnalyticsCollectStatistic', () => {
  it('restores the last successful statistic before revalidation completes and renders torrent size', async () => {
    localStorage.setItem(
      snapshotKey,
      JSON.stringify({
        savedAt: Date.now(),
        value: {
          collect_count: 12,
          collect_finished_count: 8,
          seed_count: 5,
          torrent_size: 3 * 1024 ** 3,
          collect_count_month: 2,
          collect_finished_month: 1,
          seed_count_month: 1,
        },
      }),
    )
    const request = deferred<CollectStatistic>()
    apiGet.mockReturnValue(request.promise)

    await renderWithProviders(AnalyticsCollectStatistic, { initialState: { user: { userID: 7 } } })

    expect(screen.getByText('12')).toBeInTheDocument()
    expect(screen.getByText('8')).toBeInTheDocument()
    expect(screen.getByText('5')).toBeInTheDocument()
    expect(screen.getByText('3.00 GB')).toBeInTheDocument()
    expect(screen.getByText('+2 本月新增')).toBeInTheDocument()
    expect(apiGet).toHaveBeenCalledWith('collect/statistic')

    request.resolve({
      collect_count: 21,
      collect_finished_count: 15,
      seed_count: 9,
      torrent_size: 4 * 1024 ** 3,
      collect_count_month: 3,
      collect_finished_month: 2,
      seed_count_month: 2,
      source_counts: [],
      seeding_site_counts: [],
    })

    await waitFor(() => expect(screen.getByText('21')).toBeInTheDocument())
    expect(screen.getByText('+3 本月新增')).toBeInTheDocument()
    expect(JSON.parse(localStorage.getItem(snapshotKey) ?? '{}').value).toMatchObject({
      collect_count: 21,
      collect_finished_count: 15,
      seed_count: 9,
      torrent_size: 4 * 1024 ** 3,
    })
  })

  it('keeps the restored statistic when revalidation fails', async () => {
    localStorage.setItem(
      snapshotKey,
      JSON.stringify({
        savedAt: Date.now(),
        value: {
          collect_count: 12,
          collect_finished_count: 8,
          seed_count: 5,
          torrent_size: 1024,
          collect_count_month: 1,
          collect_finished_month: 0,
          seed_count_month: 0,
        },
      }),
    )
    vi.spyOn(console, 'log').mockImplementation(() => {})
    apiGet.mockRejectedValue(new Error('remote unavailable'))

    await renderWithProviders(AnalyticsCollectStatistic, { initialState: { user: { userID: 7 } } })

    await waitFor(() => expect(apiGet).toHaveBeenCalledWith('collect/statistic'))
    expect(screen.getByText('12')).toBeInTheDocument()
    expect(screen.getByText('8')).toBeInTheDocument()
    expect(screen.getByText('5')).toBeInTheDocument()
    expect(screen.getByText('1.00 KB')).toBeInTheDocument()
  })

  it('keeps the newest KeepAlive response when initial refreshes finish out of order', async () => {
    const firstRequest = deferred<CollectStatistic>()
    const secondRequest = deferred<CollectStatistic>()
    apiGet.mockReturnValueOnce(firstRequest.promise).mockReturnValueOnce(secondRequest.promise)
    const KeepAliveHarness = defineComponent({
      components: { AnalyticsCollectStatistic },
      template: '<KeepAlive><AnalyticsCollectStatistic /></KeepAlive>',
    })

    await renderWithProviders(KeepAliveHarness, { initialState: { user: { userID: 7 } } })
    await waitFor(() => expect(apiGet).toHaveBeenCalledTimes(2))

    secondRequest.resolve({
      collect_count: 21,
      collect_finished_count: 15,
      seed_count: 9,
      torrent_size: 4 * 1024 ** 3,
      collect_count_month: 3,
      collect_finished_month: 2,
      seed_count_month: 2,
      source_counts: [],
      seeding_site_counts: [],
    })
    await waitFor(() => expect(screen.getByText('21')).toBeInTheDocument())

    firstRequest.resolve({
      collect_count: 12,
      collect_finished_count: 8,
      seed_count: 5,
      torrent_size: 3 * 1024 ** 3,
      collect_count_month: 2,
      collect_finished_month: 1,
      seed_count_month: 1,
      source_counts: [],
      seeding_site_counts: [],
    })
    await Promise.resolve()

    expect(screen.getByText('21')).toBeInTheDocument()
    expect(screen.queryByText('12')).not.toBeInTheDocument()
    expect(JSON.parse(localStorage.getItem(snapshotKey) ?? '{}').value).toMatchObject({
      collect_count: 21,
      seed_count: 9,
    })
  })

  it('renders source distribution chips and seeding site bars sorted by count', async () => {
    apiGet.mockResolvedValue({
      collect_count: 10,
      collect_finished_count: 6,
      seed_count: 8,
      torrent_size: 1024,
      collect_count_month: 0,
      collect_finished_month: 0,
      seed_count_month: 0,
      source_counts: [
        { site: 'Tencent', count: 5 },
        { site: 'YouKu', count: 3 },
        { site: 'Unknown', count: 2 },
      ],
      seeding_site_counts: [
        { site_name: 'HDDolby', count: 5 },
        { site_name: 'PTerClub', count: 3 },
      ],
    })

    await renderWithProviders(AnalyticsCollectStatistic, { initialState: { user: { userID: 7 } } })

    // 源分布：已知源显示翻译名，未知源回退原文；计数降序渲染
    expect(await screen.findByText('腾讯视频')).toBeInTheDocument()
    expect(screen.getByText('优酷')).toBeInTheDocument()
    expect(screen.getByText('Unknown')).toBeInTheDocument()
    expect(screen.getByText('采集源分布')).toBeInTheDocument()

    // 做种站点：名称 + 计数，条形图按最大站点数归一
    expect(screen.getByText('做种站点')).toBeInTheDocument()
    expect(screen.getByText('HDDolby')).toBeInTheDocument()
    expect(screen.getByText('PTerClub')).toBeInTheDocument()
    const bars = screen.getAllByRole('progressbar')
    expect(bars.length).toBe(2)
  })

  it('hides dimension sections when no source or site data is returned', async () => {
    apiGet.mockResolvedValue({
      collect_count: 0,
      collect_finished_count: 0,
      seed_count: 0,
      torrent_size: 0,
      collect_count_month: 0,
      collect_finished_month: 0,
      seed_count_month: 0,
      source_counts: [],
      seeding_site_counts: [],
    })

    await renderWithProviders(AnalyticsCollectStatistic, { initialState: { user: { userID: 7 } } })

    await waitFor(() => expect(apiGet).toHaveBeenCalledWith('collect/statistic'))
    expect(screen.queryByText('采集源分布')).not.toBeInTheDocument()
    expect(screen.queryByText('做种站点')).not.toBeInTheDocument()
  })
})
