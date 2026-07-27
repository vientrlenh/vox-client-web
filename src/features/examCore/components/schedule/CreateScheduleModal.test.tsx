import { screen } from '@testing-library/react'
import { renderWithProviders } from '@/test/renderWithProviders'
import { CreateScheduleModal } from './CreateScheduleModal'

// Giờ Việt Nam; ca 08:00–09:00 ngày 01/09/2026 dài đúng 1 tiếng.
const START = '2026-09-01T08:00:00+07:00'
const END_ONE_HOUR = '2026-09-01T09:00:00+07:00'

const room = { code: 'P101', id: 'room-1', name: 'Phòng 101' }

function renderModal(props: Partial<Parameters<typeof CreateScheduleModal>[0]> = {}) {
  renderWithProviders(
    <CreateScheduleModal
      initial={{ endDate: END_ONE_HOUR, room, startDate: START }}
      onClose={jest.fn()}
      onSubmit={jest.fn()}
      {...props}
    />,
  )
  return screen.getByRole('button', { name: 'Tạo ca thi' })
}

describe('CreateScheduleModal — ràng buộc khung giờ', () => {
  it('cho tạo khi ca thi thoả mọi ràng buộc', () => {
    expect(
      renderModal({
        examCloseAt: '2026-09-02T00:00:00+07:00',
        examOpenAt: '2026-09-01T00:00:00+07:00',
        examTimeDurationSecond: 1800,
      }),
    ).toBeEnabled()
  })

  it('chặn ca thi ngắn hơn thời gian làm bài, nêu số phút', () => {
    // 1 tiếng < 90 phút -> BE sẽ từ chối; chặn trước ở đây để khỏi phải bấm mới biết.
    const submit = renderModal({ examTimeDurationSecond: 5400 })
    expect(submit).toBeDisabled()
    // Hint dưới ô "Kết thúc" cũng nói "tối thiểu 90 phút", nên bám vào vế sau để chắc
    // chắn đang khớp banner lỗi chứ không phải hint.
    expect(
      screen.getByText(/tối thiểu 90 phút — bằng thời gian làm bài của kỳ thi/),
    ).toBeInTheDocument()
  })

  it('chặn ca thi bắt đầu trước giờ mở của kỳ thi', () => {
    const submit = renderModal({ examOpenAt: '2026-09-01T10:00:00+07:00' })
    expect(submit).toBeDisabled()
    expect(screen.getByText(/không được bắt đầu trước giờ mở/)).toBeInTheDocument()
  })

  it('chặn ca thi kết thúc sau giờ đóng của kỳ thi', () => {
    const submit = renderModal({ examCloseAt: '2026-09-01T08:30:00+07:00' })
    expect(submit).toBeDisabled()
    expect(screen.getByText(/không được kết thúc sau giờ đóng/)).toBeInTheDocument()
  })

  it('bỏ ràng buộc khung mở/đóng cho bài trên lớp', () => {
    // CLASS_TEST đi chiều ngược lại: ca thi là nguồn của openAt/closeAt, nên BE cũng
    // không ràng buộc chiều này khi sửa — áp ở FE sẽ khiến không dời được lịch.
    const submit = renderModal({
      examCloseAt: '2026-09-01T08:30:00+07:00',
      examOpenAt: '2026-09-01T10:00:00+07:00',
      isClassTest: true,
    })
    expect(submit).toBeEnabled()
  })

  it('vẫn chặn khi giờ kết thúc không sau giờ bắt đầu', () => {
    const submit = renderModal({
      initial: { endDate: START, room, startDate: END_ONE_HOUR },
    })
    expect(submit).toBeDisabled()
    expect(screen.getByText(/phải sau thời gian bắt đầu/)).toBeInTheDocument()
  })
})
