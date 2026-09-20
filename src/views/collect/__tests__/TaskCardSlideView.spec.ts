import TaskCardSlideView from '@/views/collect/TaskCardSlideView.vue'
import type { DownloadTask } from '@/api/types'
import { screen } from '@testing-library/vue'
import { renderWithProviders } from '@tests/support/render'
import { describe, expect, it, vi } from 'vitest'

// SSE EventSource 不在 jsdom 里，打桩（v-memo 用例不需要进度推送）
vi.stubGlobal('EventSource', vi.fn().mockImplementation(() => ({ addEventListener: vi.fn(), close: vi.fn() })))

function taskFixture(id: number, episode: string, poster: string): DownloadTask {
  return {
    id,
    collect_id: 94,
    vid: `vid-${id}`,
    name: `航拍中国 2020 S01E0${episode}`,
    poster,
    episode,
    type: 'TV',
    defn: 'maxplus',
    cn_title: '航拍中国',
    en_title: 'Aerial China',
    year: '2020',
    season: '1',
    site: 'Tencent',
    source: 'WEB-DL',
    subtitle_language: 'CHS',
    audio_language: 'Mandarin',
    total_size: 0,
    team: 'CSWEB',
    copyright: 'CSWEB',
    pri: 1,
    status: 'Downloading',
    created_at: '2026-09-20 10:19:37',
  } as unknown as DownloadTask
}

describe('TaskCardSlideView 剧集列表渲染', () => {
  it('虚拟列表里的每张卡片渲染各自的剧集（v-memo 依赖数组含 item 本身）', async () => {
    // 回归（2026-09-20 实录）：v-memo="[progress[item.id]]" 只依赖进度对象，
    // 同一渲染批次里初始 progress 全为 undefined —— 第二张起的卡片被 memo 判定
    // "未变化"而复用第一张的 DOM，10 集全部显示第 1 集。依赖数组须含 item。
    const tasks = [
      taskFixture(445, '1', 'https://img.example/ep1.jpg'),
      taskFixture(446, '2', 'https://img.example/ep2.jpg'),
      taskFixture(447, '3', 'https://img.example/ep3.jpg'),
    ]
    await renderWithProviders(TaskCardSlideView, {
      props: { title: '剧集列表', taskList: tasks, height: '11rem', width: '20rem' },
    })

    // 三张卡片各自渲染自己的集数（v-memo 只依赖 progress 时会全部复用第一张）
    await vi.waitFor(
      () => {
        expect(screen.getAllByText('航拍中国S01E01').length).toBeGreaterThan(0)
        expect(screen.getAllByText('航拍中国S01E02').length).toBeGreaterThan(0)
        expect(screen.getAllByText('航拍中国S01E03').length).toBeGreaterThan(0)
      },
      { timeout: 5000 },
    )
    // 卡片标题带各自集数（getFormatedTitle 拼 SxxExx；标题+tooltip 各出现一次）
    expect(screen.getAllByText(/S01E0[123]/)).toHaveLength(6)
  })
})
