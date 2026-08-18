import { renderHook } from '@testing-library/react'

import type { ProctorCandidateSummaryDto } from '@/features/examCore/types'

import type { StreamView } from '../api/useRoomMonitor'
import { useMonitoringBoard, type StreamFilter } from './useMonitoringBoard'

const NOW = Date.parse('2026-08-18T09:30:00.000Z')

function stream(overrides: Partial<StreamView> & Pick<StreamView, 'streamId'>): StreamView {
  return {
    participantId: 'cand-1',
    startedAt: '2026-08-18T09:00:00.000Z',
    streamType: 'camera',
    ...overrides,
  }
}

function candidate(candidateId: string): ProctorCandidateSummaryDto {
  return { candidateId, sessionStatus: 'IN_PROGRESS', studentName: 'Nguyễn Văn A' } as ProctorCandidateSummaryDto
}

function board(streams: StreamView[], filter: StreamFilter = 'all') {
  const { result } = renderHook(() =>
    useMonitoringBoard({
      alerts: [],
      candidates: [candidate('cand-1')],
      filter,
      now: NOW,
      streams,
    }),
  )
  return result.current
}

describe('luồng hiện hành khi học viên rớt rồi vào lại', () => {
  it('chỉ giữ một luồng mỗi loại trên lưới, dù có bao nhiêu lần kết nối', () => {
    const { onScreen } = board([
      stream({ endedAt: NOW - 600_000, streamId: 'cam-1', streamType: 'camera' }),
      stream({ endedAt: NOW - 600_000, streamId: 'scr-1', streamType: 'screen' }),
      stream({ startedAt: '2026-08-18T09:20:00.000Z', streamId: 'cam-2', streamType: 'camera' }),
      stream({ startedAt: '2026-08-18T09:20:00.000Z', streamId: 'scr-2', streamType: 'screen' }),
    ])

    // Bốn ô là đúng triệu chứng đã gặp: hai lần kết nối nhân đôi cả lưới lẫn thanh tab.
    expect(onScreen[0].currentStreams.map((item) => item.streamId)).toEqual(['cam-2', 'scr-2'])
  })

  it('không xoá luồng cũ khỏi allStreams -- cảnh báo cũ mang streamId đó', () => {
    const { onScreen } = board([
      stream({ endedAt: NOW - 600_000, streamId: 'cam-1' }),
      stream({ startedAt: '2026-08-18T09:20:00.000Z', streamId: 'cam-2' }),
    ])

    expect(onScreen[0].allStreams.map((item) => item.streamId)).toEqual(['cam-1', 'cam-2'])
  })

  it('luồng đang sống thắng luồng đã ngừng kể cả khi mốc bắt đầu nói ngược lại', () => {
    // Mốc thời gian tới từ nhiều nguồn (sự kiện participant, snapshot, seed đọc Redis) nên lệch nhau
    // là chuyện thường; "cái nào đang chạy" thì không mơ hồ.
    const { onScreen } = board([
      stream({ startedAt: '2026-08-18T09:00:00.000Z', streamId: 'cam-live' }),
      stream({ endedAt: NOW - 60_000, startedAt: '2026-08-18T09:25:00.000Z', streamId: 'cam-ended' }),
    ])

    expect(onScreen[0].currentStreams.map((item) => item.streamId)).toEqual(['cam-live'])
  })

  it('startedAt rỗng không làm hỏng thứ tự', () => {
    // Một khung hình về trước sự kiện 'joined' tạo ô tạm chưa có startedAt. Date.parse('') ra NaN,
    // và mọi so sánh với NaN đều false -- thứ tự sẽ hỏng trong im lặng nếu không quy về 0.
    const { onScreen } = board([
      stream({ endedAt: NOW - 600_000, startedAt: '', streamId: 'cam-1' }),
      stream({ endedAt: NOW - 60_000, startedAt: '2026-08-18T09:20:00.000Z', streamId: 'cam-2' }),
    ])

    expect(onScreen[0].currentStreams.map((item) => item.streamId)).toEqual(['cam-2'])
  })
})

describe('học viên biến mất vẫn phải nhìn thấy được', () => {
  it('rớt hẳn không vào lại thì ô vẫn còn và báo mất kết nối', () => {
    // Đây là lý do không xoá luồng đã ngừng: ô đó CHÍNH LÀ cảnh báo. Xoá nó đi thì một học viên
    // biến mất giữa ca trở thành sự kiện không ai nhìn thấy.
    const { neverConnected, onScreen } = board([stream({ endedAt: NOW - 60_000, streamId: 'cam-1' })])

    expect(onScreen).toHaveLength(1)
    expect(onScreen[0].status).toBe('dropped')
    expect(onScreen[0].currentStreams.map((item) => item.streamId)).toEqual(['cam-1'])
    // Và họ không được rơi sang danh sách "chưa từng kết nối" -- đó là một lời nói dối về người vừa
    // rớt giữa ca.
    expect(neverConnected).toHaveLength(0)
  })

  it('vào lại nhiều lần rồi rớt hẳn thì giữ đúng đoạn cuối cùng', () => {
    const { onScreen } = board([
      stream({ endedAt: NOW - 900_000, startedAt: '2026-08-18T09:00:00.000Z', streamId: 'cam-1' }),
      stream({ endedAt: NOW - 60_000, startedAt: '2026-08-18T09:20:00.000Z', streamId: 'cam-2' }),
    ])

    expect(onScreen[0].currentStreams.map((item) => item.streamId)).toEqual(['cam-2'])
    expect(onScreen[0].status).toBe('dropped')
  })
})

describe('bộ lọc mật độ', () => {
  it('áp lên luồng hiện hành, không lên bản sao đã bị thay thế', () => {
    const { onScreen } = board(
      [
        stream({ endedAt: NOW - 600_000, streamId: 'cam-1', streamType: 'camera' }),
        stream({ startedAt: '2026-08-18T09:20:00.000Z', streamId: 'cam-2', streamType: 'camera' }),
        stream({ startedAt: '2026-08-18T09:20:00.000Z', streamId: 'scr-1', streamType: 'screen' }),
      ],
      'camera',
    )

    expect(onScreen[0].streams.map((item) => item.streamId)).toEqual(['cam-2'])
  })
})
