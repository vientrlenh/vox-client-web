import { render, screen } from '@testing-library/react'
import type { AlertView } from '../api/useRoomMonitor'
import { RoomAlertFeed } from './RoomAlertFeed'

/**
 * Ba kênh màu trên màn giám sát TRỰC TIẾP: đỏ = can thiệp ngay, hổ phách = để mắt, xám = sự cố kỹ
 * thuật. Giám thị quét màn hình bằng màu chứ không đọc nhãn từng ô, nên đây là thứ đáng chốt.
 *
 * <p>Màu lấy từ LOẠI cảnh báo (`getAlertTypeDisplay`), không từ `level` của bản ghi -- màn trực tiếp
 * không gọi `getAlertSeverity` ở đâu cả. Nhờ vậy bản ghi cũ (MULTIPLE_PERSONS còn mang CRITICAL) và
 * bản ghi mới (mang WARNING) hiện y hệt nhau, thay vì cùng một sự việc ra hai màu tuỳ ngày ghi.
 */
function createAlert(overrides: Partial<AlertView> = {}): AlertView {
  return {
    alertType: 'MULTIPLE_PERSONS',
    capturedAt: '2026-09-04T03:21:00.000Z',
    confidence: 0.92,
    participantId: 'participant-1',
    receivedAt: Date.parse('2026-09-04T03:21:00.000Z'),
    sessionId: 'session-1',
    streamId: 'stream-1',
    ...overrides,
  }
}

function renderFeed(alerts: AlertView[]) {
  return render(<RoomAlertFeed alerts={alerts} resolveName={() => 'Nguyễn Văn A'} />)
}

/** Ô cảnh báo là phần tử mang class màu; nhãn nằm trong nó. */
function alertTile(label: string) {
  return screen.getByText(label).closest('div[class*="rounded-lg"]')
}

describe('RoomAlertFeed colours', () => {
  /**
   * Hạ theo mức: MULTIPLE_PERSONS là WARNING nên nó nằm ở kênh hổ phách, không còn chiếm kênh đỏ.
   * Kênh đỏ giữ lại đúng nghĩa "bỏ chỗ, đi tới ngay" -- một màu đỏ bật ở mọi phiên thi là một màu
   * đỏ không ai còn phản ứng.
   */
  it('shows a second person in frame in amber, matching its WARNING level', () => {
    renderFeed([createAlert({ level: 'WARNING' })])

    expect(alertTile('Nhiều người trong khung hình')).toHaveClass('bg-amber-50')
  })

  /**
   * `level` được đóng dấu lúc GHI và không bao giờ tính lại, nên bản ghi trước `4cc6598` còn mang
   * CRITICAL mãi mãi. Màn trực tiếp không đọc `level`, nên điều đó không được phép tạo ra hai màu
   * cho cùng một sự việc.
   */
  it.each([
    { level: 'CRITICAL', when: 'bản ghi trước 4cc6598' },
    { level: 'WARNING', when: 'bản ghi sau 4cc6598' },
    { level: undefined, when: 'bản vox-streaming cũ không gửi level' },
  ])('renders the same amber whatever level the record carries: $level ($when)', ({ level }) => {
    renderFeed([createAlert({ level })])

    expect(alertTile('Nhiều người trong khung hình')).toHaveClass('bg-amber-50')
  })

  /**
   * Vế đối chứng, và là vế giữ cho ba test trên có nghĩa: kênh đỏ vẫn tồn tại và vẫn có loại nằm
   * trong đó. Nếu mọi thứ đều hổ phách thì màu thôi phân biệt được gì.
   */
  it('keeps the two act-now types on the red channel', () => {
    renderFeed([
      createAlert({ alertType: 'PHONE_DETECTED', streamId: 'stream-2' }),
      createAlert({ alertType: 'PROHIBITED_OBJECT', streamId: 'stream-3' }),
    ])

    expect(alertTile('Phát hiện điện thoại')).toHaveClass('bg-red-50')
    expect(alertTile('Phát hiện vật thể cấm')).toHaveClass('bg-red-50')
  })

  /** Sự cố kỹ thuật giữ kênh xám riêng, không trộn vào hổ phách dù cũng là WARNING. */
  it('keeps technical faults on the grey channel', () => {
    renderFeed([createAlert({ alertType: 'CAMERA_SIGNAL_LOST' })])

    expect(alertTile('Mất tín hiệu camera')).toHaveClass('bg-slate-100')
  })
})
