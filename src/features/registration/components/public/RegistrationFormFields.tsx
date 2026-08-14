import { CalendarDays, ChevronDown, Paperclip, X } from 'lucide-react'
import type { ReactNode } from 'react'
import { useRef } from 'react'

export type FieldConfig = {
  autoComplete?: string
  className?: string
  id: string
  label: string
  maxLength?: number
  min?: number
  name: string
  placeholder: string
  required?: boolean
  type?: string
}

export function RequiredMark() {
  return <span className="text-red-500">*</span>
}

export function TextField({
  autoComplete,
  className = '',
  disabled,
  id,
  label,
  maxLength,
  min,
  name,
  placeholder,
  required,
  type = 'text',
}: FieldConfig & { disabled?: boolean }) {
  return (
    <label className={`block min-w-0 ${className}`} htmlFor={id}>
      <span className="mb-1.5 block text-xs font-bold leading-4 text-blue-950">
        {label} {required ? <RequiredMark /> : null}
      </span>
      <input
        autoComplete={autoComplete}
        className="h-10 w-full rounded-lg border border-slate-200 bg-white px-3 text-xs font-medium text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-indigo-500 focus:ring-4 focus:ring-indigo-100"
        disabled={disabled}
        id={id}
        maxLength={maxLength}
        min={min}
        name={name}
        placeholder={placeholder}
        required={required}
        type={type}
      />
    </label>
  )
}

const MIN_BIRTH_DATE = '1900-01-01'

/** Ngày hôm nay theo múi giờ máy người dùng, dạng `yyyy-MM-dd`. */
function getTodayValue(): string {
  const now = new Date()
  const month = `${now.getMonth() + 1}`.padStart(2, '0')
  const day = `${now.getDate()}`.padStart(2, '0')
  return `${now.getFullYear()}-${month}-${day}`
}

export function DateField({ disabled }: { disabled?: boolean }) {
  const inputRef = useRef<HTMLInputElement>(null)

  /**
   * Chỉ nút lịch bên phải gọi hàm này, KHÔNG gắn lên chính ô nhập.
   *
   * Gắn onClick lên input thì mỗi lần bấm vào ô là lịch bật ra, người dùng không đặt được con
   * trỏ vào ô ngày/tháng/năm để gõ -- thành ra bắt buộc phải chọn bằng chuột. Bỏ đi thì ô
   * type="date" hoạt động đúng bản chất: gõ thẳng từ bàn phím, còn muốn lịch thì bấm nút.
   */
  function openCalendar() {
    const input = inputRef.current
    if (!input || disabled) {
      return
    }
    input.focus()
    try {
      input.showPicker?.()
    } catch {
      // Trình duyệt không cho mở lịch bằng script: người dùng vẫn nhập tay được.
    }
  }

  return (
    <div className="min-w-0">
      <label
        className="mb-1.5 block text-xs font-bold leading-4 text-blue-950"
        htmlFor="birth-date"
      >
        Ngày sinh <RequiredMark />
      </label>
      <div className="relative">
        <input
          className="h-10 w-full rounded-lg border border-slate-200 bg-white px-3 pr-10 text-xs font-medium text-slate-900 outline-none transition focus:border-indigo-500 focus:ring-4 focus:ring-indigo-100 [&::-webkit-calendar-picker-indicator]:hidden"
          disabled={disabled}
          id="birth-date"
          max={getTodayValue()}
          min={MIN_BIRTH_DATE}
          name="dateOfBirth"
          ref={inputRef}
          required
          type="date"
        />
        <button
          aria-label="Mở lịch chọn ngày sinh"
          className="absolute right-1.5 top-1/2 inline-flex size-7 -translate-y-1/2 items-center justify-center rounded-md text-slate-500 transition hover:bg-slate-100 hover:text-indigo-600 disabled:cursor-not-allowed disabled:opacity-60"
          disabled={disabled}
          onClick={openCalendar}
          tabIndex={-1}
          type="button"
        >
          <CalendarDays aria-hidden="true" className="size-4" />
        </button>
      </div>
    </div>
  )
}

export function SelectField({
  children,
  disabled,
  id,
  label,
  name,
  required,
}: {
  children: ReactNode
  disabled?: boolean
  id: string
  label: string
  name: string
  required?: boolean
}) {
  return (
    <label className="block min-w-0" htmlFor={id}>
      <span className="mb-1.5 block text-xs font-bold leading-4 text-blue-950">
        {label} {required ? <RequiredMark /> : null}
      </span>
      <span className="relative block">
        <select
          className="h-10 w-full appearance-none rounded-lg border border-slate-200 bg-white px-3 pr-9 text-xs font-medium text-slate-900 outline-none transition focus:border-indigo-500 focus:ring-4 focus:ring-indigo-100"
          defaultValue=""
          disabled={disabled}
          id={id}
          name={name}
          required={required}
        >
          {children}
        </select>
        <ChevronDown
          aria-hidden="true"
          className="pointer-events-none absolute right-3 top-1/2 size-4 -translate-y-1/2 text-slate-500"
        />
      </span>
    </label>
  )
}

export function PositionSelectField({ disabled }: { disabled?: boolean }) {
  return (
    <SelectField
      disabled={disabled}
      id="position"
      label="Chức vụ"
      name="position"
      required
    >
      <option disabled value="">
        Nhập chức vụ của bạn
      </option>
      <option value="Hiệu trưởng">Hiệu trưởng</option>
      <option value="Phó hiệu trưởng">Phó hiệu trưởng</option>
      <option value="Giáo viên">Giáo viên</option>
      <option value="Quản trị viên">Quản trị viên</option>
    </SelectField>
  )
}

export function FormSection({
  children,
  title,
}: {
  children: ReactNode
  title: string
}) {
  return (
    <section className="border-t border-slate-200 pt-4">
      <h2 className="mb-3 text-sm font-black text-blue-950">{title}</h2>
      {children}
    </section>
  )
}

export type FormMessageTone = 'error' | 'success'

export type FormMessage = {
  text: string
  tone: FormMessageTone
}

export function FormMessageBanner({ message }: { message: FormMessage | null }) {
  if (!message) {
    return null
  }

  const className =
    message.tone === 'success'
      ? 'border-emerald-200 bg-emerald-50 text-emerald-700'
      : 'border-red-200 bg-red-50 text-red-700'

  return (
    <div
      className={`mt-4 rounded-lg border px-4 py-3 text-xs font-semibold ${className}`}
      role={message.tone === 'error' ? 'alert' : 'status'}
    >
      {message.text}
    </div>
  )
}

function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
}

export function DocumentFilesField({
  disabled,
  files,
  onChange,
  required,
}: {
  disabled?: boolean
  files: File[]
  onChange: (files: File[]) => void
  required?: boolean
}) {
  function handleFileInput(event: React.ChangeEvent<HTMLInputElement>) {
    const selected = Array.from(event.target.files ?? [])
    onChange([...files, ...selected])
    event.target.value = ''
  }

  function removeAt(index: number) {
    onChange(files.filter((_, i) => i !== index))
  }

  return (
    <div className="grid min-w-0 gap-2">
      <span className="block text-xs font-bold leading-4 text-blue-950">
        Tài liệu xác thực {required ? <RequiredMark /> : '(không bắt buộc)'}
      </span>
      <p className="text-[11px] font-medium leading-4 text-slate-500">
        Tải lên tài liệu xác thực (PDF, hình ảnh...). Tối đa 10 MB mỗi file.
      </p>

      {files.length > 0 && (
        <ul className="grid min-w-0 gap-1.5">
          {files.map((file, index) => (
            <li
              className="flex w-full min-w-0 max-w-full items-center gap-2 overflow-hidden rounded-lg border border-slate-200 bg-slate-50 px-3 py-2"
              key={`${file.name}-${index}`}
            >
              <Paperclip aria-hidden="true" className="size-3.5 shrink-0 text-slate-400" />
              <span
                className="min-w-0 flex-1 truncate text-xs font-medium text-slate-700"
                title={file.name}
              >
                {file.name}
              </span>
              <span className="shrink-0 text-[10px] font-medium text-slate-400">
                {formatFileSize(file.size)}
              </span>
              <button
                aria-label={`Xoá ${file.name}`}
                className="inline-flex size-6 shrink-0 items-center justify-center rounded text-slate-400 transition hover:bg-slate-200 hover:text-slate-600 disabled:cursor-not-allowed disabled:opacity-60"
                disabled={disabled}
                onClick={() => removeAt(index)}
                type="button"
              >
                <X aria-hidden="true" className="size-3.5" />
              </button>
            </li>
          ))}
        </ul>
      )}

      <label className={`inline-flex h-9 w-fit cursor-pointer items-center gap-1.5 rounded-lg border border-indigo-200 bg-indigo-50 px-3 text-xs font-bold text-indigo-700 transition hover:bg-indigo-100 ${disabled ? 'cursor-not-allowed opacity-60' : ''}`}>
        <Paperclip aria-hidden="true" className="size-4" />
        Chọn tài liệu
        <input
          accept="image/*,.pdf,.doc,.docx"
          className="sr-only"
          disabled={disabled}
          multiple
          onChange={handleFileInput}
          type="file"
        />
      </label>
    </div>
  )
}

