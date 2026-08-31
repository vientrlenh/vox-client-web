import { useState } from 'react'
import { Calendar } from 'lucide-react'

import { DEFAULT_PRESETS, presetToRange, type DateRangeValue, type Preset } from './dateRangePresets'

export type { DateRangeValue, Preset } from './dateRangePresets'

/**
 * So sánh chuỗi `yyyy-mm-dd` là so sánh theo thứ tự thời gian, nên KHÔNG đi qua `new Date()`: chuỗi ở
 * đây là ngày lịch người dùng chọn, còn `Date` sẽ diễn giải nó theo múi giờ trình duyệt và làm phép
 * so lệch một ngày ở hai đầu ranh giới.
 */
function isInverted({ from, to }: DateRangeValue) {
  return from !== null && to !== null && from > to
}

/**
 * Bộ lọc khoảng thời gian dùng chung: preset dạng chip (7/30/90 ngày, năm nay, tất cả) kèm tuỳ chọn
 * tự chọn ngày bắt đầu/kết thúc. `onChange` luôn trả về `DateRangeValue` (yyyy-mm-dd hoặc null = không
 * giới hạn) — nơi gọi tự quy đổi sang định dạng cần thiết (vd. ISO instant) khi gửi lên API.
 *
 * <p>Khoảng tự chọn giữ ở dạng NHÁP và chỉ báo ra ngoài khi bấm Áp dụng. Gọi `onChange` ngay lúc gõ
 * dở tạo ra hai lỗi: chọn xong ngày bắt đầu là bắn một request kèm ngày kết thúc CŨ (thường là một
 * khoảng ngược), và mỗi lần sửa ngày lại thêm một cache key nữa cho một khoảng người dùng chưa hề
 * định hỏi.
 */
export function DateRangeFilter({
  onChange,
  presets = DEFAULT_PRESETS,
  value,
}: {
  onChange: (value: DateRangeValue) => void
  presets?: Preset[]
  value: DateRangeValue
}) {
  const [customOpen, setCustomOpen] = useState(false)
  const [draft, setDraft] = useState<DateRangeValue>(value)
  const activePresetKey = presets.find((p) => {
    const range = presetToRange(p)
    return range.from === value.from && range.to === value.to
  })?.key

  const inverted = isInverted(draft)

  function openCustom() {
    // Mở lại thì bắt đầu từ khoảng ĐANG hiển thị, không phải từ bản nháp bỏ dở lần trước.
    setDraft(value)
    setCustomOpen(true)
  }

  function applyDraft() {
    if (inverted) {
      return
    }
    onChange(draft)
    setCustomOpen(false)
  }

  return (
    <div className="flex flex-wrap items-center gap-2">
      <span className="mr-1 flex items-center gap-1.5 text-[13px] font-semibold text-slate-500">
        <Calendar aria-hidden="true" className="size-4" />
        Khoảng thời gian
      </span>
      {presets.map((preset) => {
        const active = !customOpen && activePresetKey === preset.key
        return (
          <button
            className={[
              'rounded-full px-3.5 py-1.5 text-[13px] font-semibold transition',
              active ? 'bg-indigo-600 text-white' : 'border border-slate-200 bg-white text-slate-600 hover:bg-slate-50',
            ].join(' ')}
            key={preset.key}
            onClick={() => {
              setCustomOpen(false)
              onChange(presetToRange(preset))
            }}
            type="button"
          >
            {preset.label}
          </button>
        )
      })}
      <button
        className={[
          'rounded-full px-3.5 py-1.5 text-[13px] font-semibold transition',
          customOpen || (!activePresetKey && (value.from || value.to))
            ? 'bg-indigo-600 text-white'
            : 'border border-slate-200 bg-white text-slate-600 hover:bg-slate-50',
        ].join(' ')}
        onClick={() => (customOpen ? setCustomOpen(false) : openCustom())}
        type="button"
      >
        Tùy chỉnh
      </button>
      {customOpen ? (
        <div className="flex flex-wrap items-center gap-2">
          <div
            className={[
              'flex items-center gap-2 rounded-full border bg-white px-3 py-1',
              inverted ? 'border-red-300' : 'border-slate-200',
            ].join(' ')}
          >
            <input
              aria-label="Từ ngày"
              className="w-32 border-none text-[13px] text-slate-700 outline-none"
              // `max`/`min` chặn được ở lịch bật lên, nhưng gõ tay vẫn lọt — nên vẫn phải kiểm tra
              // lại khi bấm Áp dụng.
              max={draft.to ?? undefined}
              onChange={(e) => setDraft((d) => ({ from: e.target.value || null, to: d.to }))}
              type="date"
              value={draft.from ?? ''}
            />
            <span className="text-slate-300">–</span>
            <input
              aria-label="Đến ngày"
              className="w-32 border-none text-[13px] text-slate-700 outline-none"
              min={draft.from ?? undefined}
              onChange={(e) => setDraft((d) => ({ from: d.from, to: e.target.value || null }))}
              type="date"
              value={draft.to ?? ''}
            />
          </div>
          <button
            className="rounded-full bg-indigo-600 px-3.5 py-1.5 text-[13px] font-semibold text-white transition hover:bg-indigo-700 disabled:cursor-not-allowed disabled:bg-slate-200 disabled:text-slate-400"
            disabled={inverted}
            onClick={applyDraft}
            type="button"
          >
            Áp dụng
          </button>
          <button
            className="rounded-full px-3 py-1.5 text-[13px] font-semibold text-slate-500 transition hover:text-slate-700"
            onClick={() => setCustomOpen(false)}
            type="button"
          >
            Hủy
          </button>
          {inverted ? (
            <span className="text-[12.5px] font-semibold text-red-600" role="alert">
              Ngày bắt đầu phải trước ngày kết thúc.
            </span>
          ) : null}
        </div>
      ) : null}
    </div>
  )
}
