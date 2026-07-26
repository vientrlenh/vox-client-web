import type { ReactNode } from 'react'

export type ActionDialogTone = 'amber' | 'cyan' | 'emerald' | 'red' | 'slate' | 'violet'

const ICON_CLASSNAME: Record<ActionDialogTone, string> = {
  amber: 'bg-amber-50 text-amber-600',
  cyan: 'bg-cyan-50 text-cyan-600',
  emerald: 'bg-emerald-50 text-emerald-600',
  red: 'bg-red-50 text-red-600',
  slate: 'bg-slate-100 text-slate-600',
  violet: 'bg-violet-50 text-violet-600',
}

const CONFIRM_CLASSNAME: Record<ActionDialogTone, string> = {
  amber: 'bg-amber-600 hover:bg-amber-700',
  cyan: 'bg-cyan-600 hover:bg-cyan-700',
  emerald: 'bg-emerald-600 hover:bg-emerald-700',
  red: 'bg-red-600 hover:bg-red-700',
  slate: 'bg-slate-700 hover:bg-slate-800',
  violet: 'bg-violet-600 hover:bg-violet-700',
}

type ActionDialogProps = {
  cancelLabel?: string
  children?: ReactNode
  confirmDisabled?: boolean
  confirmLabel: string
  icon: ReactNode
  isPending?: boolean
  onCancel: () => void
  onConfirm: () => void
  subtitle?: ReactNode
  title: string
  tone: ActionDialogTone
  width?: 'md' | 'lg'
}

/**
 * Khung chung của các hộp thoại xác nhận trong màn chấm điểm. Gom lại một chỗ vì
 * sau rework có tới bảy hành động cùng hình dạng — mỗi cái tự dựng overlay thì
 * chỉ cần sửa một chi tiết là bảy chỗ lệch nhau.
 */
export function ActionDialog({
  cancelLabel = 'Hủy',
  children,
  confirmDisabled,
  confirmLabel,
  icon,
  isPending,
  onCancel,
  onConfirm,
  subtitle,
  title,
  tone,
  width = 'md',
}: ActionDialogProps) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/45 p-5">
      <div
        aria-modal="true"
        className={`max-h-[90vh] w-full overflow-y-auto rounded-2xl bg-white p-6 shadow-2xl ${
          width === 'lg' ? 'max-w-lg' : 'max-w-md'
        }`}
        role="dialog"
      >
        <div className="flex items-center gap-3">
          <span
            className={`inline-flex size-11 shrink-0 items-center justify-center rounded-xl ${ICON_CLASSNAME[tone]}`}
          >
            {icon}
          </span>
          <div className="min-w-0">
            <h2 className="text-lg font-extrabold text-slate-900">{title}</h2>
            {subtitle ? (
              <p className="mt-0.5 text-[12.5px] font-medium text-slate-500">{subtitle}</p>
            ) : null}
          </div>
        </div>

        {children}

        <div className="mt-5 flex gap-2.5">
          <button
            className="h-11 flex-1 rounded-lg border border-slate-200 bg-white text-sm font-bold text-slate-600 transition hover:bg-slate-50"
            onClick={onCancel}
            type="button"
          >
            {cancelLabel}
          </button>
          <button
            className={`h-11 flex-1 rounded-lg text-sm font-bold text-white transition disabled:cursor-not-allowed disabled:bg-slate-300 ${CONFIRM_CLASSNAME[tone]}`}
            disabled={isPending || confirmDisabled}
            onClick={onConfirm}
            type="button"
          >
            {confirmLabel}
          </button>
        </div>
      </div>
    </div>
  )
}

type ReasonFieldProps = {
  hint?: string
  id: string
  label: string
  maxLength?: number
  onChange: (value: string) => void
  placeholder?: string
  required?: boolean
  value: string
}

/** Ô nhập lý do dùng chung. `required` chỉ để hiển thị — chặn nút là việc của phía gọi. */
export function ReasonField({
  hint,
  id,
  label,
  maxLength = 1024,
  onChange,
  placeholder,
  required,
  value,
}: ReasonFieldProps) {
  return (
    <div className="mt-4">
      <label className="block text-[12.5px] font-bold text-slate-600" htmlFor={id}>
        {label}{' '}
        {required ? (
          <span className="font-extrabold text-red-500">*</span>
        ) : (
          <span className="font-semibold text-slate-400">(không bắt buộc)</span>
        )}
      </label>
      <textarea
        className="mt-1.5 min-h-24 w-full resize-y rounded-xl border border-slate-200 bg-slate-50 px-3.5 py-3 text-[13.5px] leading-relaxed text-slate-700 outline-none focus:border-cyan-400"
        id={id}
        maxLength={maxLength}
        onChange={(event) => onChange(event.target.value)}
        placeholder={placeholder}
        value={value}
      />
      <div className="mt-1 flex items-center justify-between text-[11px] font-semibold text-slate-400">
        <span>{hint ?? ''}</span>
        <span>
          {value.length}/{maxLength}
        </span>
      </div>
    </div>
  )
}

type DeadlineFieldProps = {
  hint?: string
  id: string
  label: string
  onChange: (value: string) => void
  value: string
}

/**
 * Hạn chấm. Giá trị là chuỗi của `<input type="datetime-local">`; đổi sang ISO có
 * offset bằng `localDateTimeToIso` ngay trước khi gửi — BE nhận OffsetDateTime.
 */
export function DeadlineField({ hint, id, label, onChange, value }: DeadlineFieldProps) {
  return (
    <div className="mt-4">
      <label className="block text-[12.5px] font-bold text-slate-600" htmlFor={id}>
        {label} <span className="font-semibold text-slate-400">(không bắt buộc)</span>
      </label>
      <input
        className="mt-1.5 h-11 w-full rounded-xl border border-slate-200 bg-slate-50 px-3.5 text-[13.5px] font-semibold text-slate-700 outline-none focus:border-cyan-400"
        id={id}
        onChange={(event) => onChange(event.target.value)}
        type="datetime-local"
        value={value}
      />
      {hint ? <p className="mt-1 text-[11px] font-semibold text-slate-400">{hint}</p> : null}
    </div>
  )
}
