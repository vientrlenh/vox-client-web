import type { ExamScheduleDto, ExamScheduleStatus } from '@/features/examCore/types'
import {
  formatScheduleProgressLabel,
  isScheduleCounted,
  isSchedulePublishedOrLater,
  isScheduleStepDone,
  summarizeSchedules,
} from './scheduleProgress'

function schedule(id: string, status: ExamScheduleStatus): ExamScheduleDto {
  return { id, proctors: [{ id: `p-${id}` }], schoolRoomId: `room-${id}`, status } as unknown as ExamScheduleDto
}

describe('vị từ trạng thái ca thi — gương của ExamScheduleStatus ở backend', () => {
  it('ca hủy và ca dời không được tính vào tiến độ', () => {
    expect(isScheduleCounted('DRAFT')).toBe(true)
    expect(isScheduleCounted('PUBLISHED')).toBe(true)
    expect(isScheduleCounted('COMPLETED')).toBe(true)
    expect(isScheduleCounted('CANCELLED')).toBe(false)
    expect(isScheduleCounted('MOVED')).toBe(false)
  })

  it('ca đã hoàn thành vẫn là ca đã công bố trở lên', () => {
    expect(isSchedulePublishedOrLater('PUBLISHED')).toBe(true)
    expect(isSchedulePublishedOrLater('COMPLETED')).toBe(true)
    expect(isSchedulePublishedOrLater('DRAFT')).toBe(false)
  })
})

describe('summarizeSchedules', () => {
  it('đếm từng trạng thái sau khi trừ ca hủy/dời', () => {
    const progress = summarizeSchedules([
      schedule('s1', 'DRAFT'),
      schedule('s2', 'PUBLISHED'),
      schedule('s3', 'COMPLETED'),
      schedule('s4', 'CANCELLED'),
      schedule('s5', 'MOVED'),
    ])

    expect(progress).toEqual({
      completedCount: 1,
      draftCount: 1,
      publishedCount: 1,
      readyCount: 2,
      totalCount: 3,
    })
  })

  it('nhận cả dạng rút gọn { id, status } của trang danh sách', () => {
    const progress = summarizeSchedules([{ id: 's1', status: 'COMPLETED' }])

    expect(progress.readyCount).toBe(1)
    expect(progress.totalCount).toBe(1)
  })
})

describe('isScheduleStepDone', () => {
  it('ca đã hoàn thành vẫn tính là xếp lịch xong', () => {
    expect(isScheduleStepDone(summarizeSchedules([schedule('s1', 'COMPLETED')]))).toBe(true)
  })

  it('lọc hết ca hủy/dời mà không còn ca nào thì chưa xong', () => {
    expect(isScheduleStepDone(summarizeSchedules([schedule('s1', 'CANCELLED')]))).toBe(false)
    expect(isScheduleStepDone(summarizeSchedules([schedule('s1', 'MOVED')]))).toBe(false)
    expect(isScheduleStepDone(summarizeSchedules([]))).toBe(false)
  })

  it('còn ca bản nháp thì chưa xong', () => {
    expect(isScheduleStepDone(summarizeSchedules([schedule('s1', 'COMPLETED'), schedule('s2', 'DRAFT')]))).toBe(false)
  })
})

describe('formatScheduleProgressLabel', () => {
  it.each([
    [[], 'Chưa có ca thi nào'],
    [['CANCELLED' as const], 'Chưa có ca thi nào'],
    [['COMPLETED' as const, 'DRAFT' as const], 'Còn 1 ca thi chưa công bố'],
    [['COMPLETED' as const], '1 ca thi đã hoàn thành'],
    [['PUBLISHED' as const, 'PUBLISHED' as const], '2 ca thi đã công bố'],
    [['PUBLISHED' as const, 'COMPLETED' as const], '2 ca thi (1 đã hoàn thành)'],
  ])('%s → %s', (statuses, expected) => {
    const progress = summarizeSchedules(statuses.map((status, index) => schedule(`s${index}`, status)))

    expect(formatScheduleProgressLabel(progress)).toBe(expected)
  })
})
