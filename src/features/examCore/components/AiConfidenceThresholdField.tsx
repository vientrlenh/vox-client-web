type AiConfidenceThresholdFieldProps = {
  /** null = chưa đặt ngưỡng. */
  value: number | null
  onChange: (value: number | null) => void
  disabled?: boolean
}

/**
 * Ô nhập ngưỡng tin cậy AI (phần trăm) cho kỳ thi / bài kiểm tra trên lớp.
 *
 * <p>Bỏ trống là một lựa chọn HỢP LỆ, không phải thiếu sót: khi đó hệ thống dùng bộ luật ngưỡng
 * mặc định như trước. Vì vậy ô này không đánh dấu bắt buộc, và phần mô tả nói rõ điều gì xảy ra
 * khi để trống -- người dùng không phải đoán.
 *
 * <p>Đặt ngưỡng thì các luật mặc định bị BỎ QUA hoàn toàn, chỉ còn đúng một phép so. Đó là điều
 * đáng nói ra: nhà trường cần biết mình đang thay thế cả bộ luật chứ không phải thêm một tầng lọc.
 */
export function AiConfidenceThresholdField({
  value,
  onChange,
  disabled = false,
}: AiConfidenceThresholdFieldProps) {
  return (
    <label className="grid gap-1.5 text-sm font-bold text-slate-700">
      Ngưỡng tin cậy AI (%)
      <input
        className="h-11 rounded-lg border border-slate-200 px-3 text-sm font-medium text-slate-900 outline-none transition focus:border-indigo-500 focus:ring-4 focus:ring-indigo-100 disabled:bg-slate-50"
        disabled={disabled}
        inputMode="decimal"
        max={100}
        min={0}
        onChange={(event) => {
          const raw = event.target.value.trim()
          // Chuỗi rỗng -> null ("không đặt"), KHÔNG phải 0. Số 0 là một ngưỡng thật và nó vẫn bỏ
          // qua bộ luật mặc định, nên gộp hai thứ này lại là đổi hành vi chấm mà người dùng không
          // hề chọn.
          if (raw === '') {
            onChange(null)
            return
          }
          const parsed = Number(raw)
          if (Number.isNaN(parsed)) {
            return
          }
          onChange(Math.min(100, Math.max(0, parsed)))
        }}
        placeholder="Để trống nếu dùng mặc định"
        step="1"
        type="number"
        value={value ?? ''}
      />
      <span className="text-xs font-medium text-slate-500">
        Bài nào AI chấm với độ tin cậy thấp hơn mức này sẽ chuyển sang chờ giáo viên duyệt thay vì
        công bố ngay. Để trống thì hệ thống dùng bộ tiêu chí mặc định; nhập số thì mức bạn đặt
        thay thế hoàn toàn bộ tiêu chí đó.
      </span>
    </label>
  )
}
