import { useState } from 'react'
import { Calendar } from 'lucide-react'

import { DEFAULT_PRESETS, presetToRange, type DateRangeValue, type Preset } from './dateRangePresets'

export type { DateRangeValue, Preset } from './dateRangePresets'

/**
 * Bộ lọc khoảng thời gian dùng chung: preset dạng chip (7/30/90 ngày, năm nay, tất cả) kèm tuỳ chọn
 * tự chọn ngày bắt đầu/kết thúc. `onChange` luôn trả về `DateRangeValue` (yyyy-mm-dd hoặc null = không
 * giới hạn) — nơi gọi tự quy đổi sang định dạng cần thiết (vd. ISO instant) khi gửi lên API.
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
  const activePresetKey = presets.find((p) => {
    const range = presetToRange(p)
    return range.from === value.from && range.to === value.to
  })?.key

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
        onClick={() => setCustomOpen((open) => !open)}
        type="button"
      >
        Tùy chỉnh
      </button>
      {customOpen ? (
        <div className="flex items-center gap-2 rounded-full border border-slate-200 bg-white px-3 py-1">
          <input
            aria-label="Từ ngày"
            className="w-32 border-none text-[13px] text-slate-700 outline-none"
            onChange={(e) => onChange({ from: e.target.value || null, to: value.to })}
            type="date"
            value={value.from ?? ''}
          />
          <span className="text-slate-300">–</span>
          <input
            aria-label="Đến ngày"
            className="w-32 border-none text-[13px] text-slate-700 outline-none"
            onChange={(e) => onChange({ from: value.from, to: e.target.value || null })}
            type="date"
            value={value.to ?? ''}
          />
        </div>
      ) : null}
    </div>
  )
}
