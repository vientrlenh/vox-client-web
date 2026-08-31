import { fireEvent, render, screen } from '@testing-library/react'
import { DateRangeFilter } from './DateRangeFilter'
import type { DateRangeValue, Preset } from './dateRangePresets'

const PRESETS: Preset[] = [
  { days: 'mtd', key: 'mtd', label: 'Tháng này' },
  { days: 'ytd', key: 'ytd', label: 'Năm nay' },
]

const RANGE: DateRangeValue = { from: '2026-08-01', to: '2026-08-31' }

function renderFilter(onChange = jest.fn(), value: DateRangeValue = RANGE) {
  render(<DateRangeFilter onChange={onChange} presets={PRESETS} value={value} />)
  return onChange
}

function openCustom() {
  fireEvent.click(screen.getByRole('button', { name: 'Tùy chỉnh' }))
}

describe('DateRangeFilter', () => {
  it('applies a preset immediately', () => {
    const onChange = renderFilter()

    fireEvent.click(screen.getByRole('button', { name: 'Năm nay' }))

    expect(onChange).toHaveBeenCalledTimes(1)
    expect(onChange.mock.calls[0][0]).toEqual({ from: `${new Date().getFullYear()}-01-01`, to: expect.any(String) })
  })

  /**
   * Lỗi cũ: mỗi lần gõ một ô ngày là gọi API ngay kèm ngày CÒN LẠI của khoảng cũ. Chọn ngày bắt đầu
   * 01/09 khi khoảng hiện tại kết thúc 31/08 sẽ bắn một request cho khoảng NGƯỢC, BE trả về 0 và
   * người dùng thấy trang rỗng mà không hiểu vì sao.
   */
  it('does not report a range while the dates are still being picked', () => {
    const onChange = renderFilter()
    openCustom()

    fireEvent.change(screen.getByLabelText('Từ ngày'), { target: { value: '2026-09-01' } })
    fireEvent.change(screen.getByLabelText('Đến ngày'), { target: { value: '2026-09-30' } })

    expect(onChange).not.toHaveBeenCalled()
  })

  it('reports the range once, on Áp dụng', () => {
    const onChange = renderFilter()
    openCustom()

    fireEvent.change(screen.getByLabelText('Từ ngày'), { target: { value: '2026-09-01' } })
    fireEvent.change(screen.getByLabelText('Đến ngày'), { target: { value: '2026-09-30' } })
    fireEvent.click(screen.getByRole('button', { name: 'Áp dụng' }))

    expect(onChange).toHaveBeenCalledTimes(1)
    expect(onChange).toHaveBeenCalledWith({ from: '2026-09-01', to: '2026-09-30' })
  })

  /** BE nhận khoảng ngược và trả về 0 — chặn ở đây thì người dùng biết vì sao, thay vì thấy trang rỗng. */
  it('blocks an inverted range instead of sending it', () => {
    const onChange = renderFilter()
    openCustom()

    fireEvent.change(screen.getByLabelText('Từ ngày'), { target: { value: '2026-09-30' } })
    fireEvent.change(screen.getByLabelText('Đến ngày'), { target: { value: '2026-09-01' } })

    expect(screen.getByRole('alert')).toHaveTextContent('Ngày bắt đầu phải trước ngày kết thúc.')
    expect(screen.getByRole('button', { name: 'Áp dụng' })).toBeDisabled()

    fireEvent.click(screen.getByRole('button', { name: 'Áp dụng' }))
    expect(onChange).not.toHaveBeenCalled()
  })

  it('discards the draft on Hủy', () => {
    const onChange = renderFilter()
    openCustom()

    fireEvent.change(screen.getByLabelText('Từ ngày'), { target: { value: '2026-09-01' } })
    fireEvent.click(screen.getByRole('button', { name: 'Hủy' }))

    expect(onChange).not.toHaveBeenCalled()

    // Mở lại thì bắt đầu từ khoảng ĐANG hiển thị, không phải bản nháp vừa bỏ.
    openCustom()
    expect(screen.getByLabelText('Từ ngày')).toHaveValue('2026-08-01')
  })

  /** Một ngày để trống nghĩa là "không giới hạn mốc này", không phải một khoảng ngược. */
  it('allows an open-ended range', () => {
    const onChange = renderFilter()
    openCustom()

    fireEvent.change(screen.getByLabelText('Từ ngày'), { target: { value: '' } })
    fireEvent.click(screen.getByRole('button', { name: 'Áp dụng' }))

    expect(onChange).toHaveBeenCalledWith({ from: null, to: '2026-08-31' })
  })
})
