import { CalendarDays, ChevronDown, Plus, X } from 'lucide-react'
import type { ReactNode } from 'react'

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

export function DateField({ disabled }: { disabled?: boolean }) {
  return (
    <label className="block min-w-0" htmlFor="birth-date">
      <span className="mb-1.5 block text-xs font-bold leading-4 text-blue-950">
        Ngày sinh <RequiredMark />
      </span>
      <span className="relative block">
        <input
          className="h-10 w-full rounded-lg border border-slate-200 bg-white px-3 pr-10 text-xs font-medium text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-indigo-500 focus:ring-4 focus:ring-indigo-100"
          disabled={disabled}
          id="birth-date"
          name="dateOfBirth"
          placeholder="dd/mm/yyyy"
          required
          type="text"
        />
        <CalendarDays
          aria-hidden="true"
          className="pointer-events-none absolute right-3 top-1/2 size-4 -translate-y-1/2 text-slate-500"
        />
      </span>
    </label>
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

export function DocumentUrlsField({
  disabled,
  onChange,
  required,
  urls,
}: {
  disabled?: boolean
  onChange: (urls: string[]) => void
  required?: boolean
  urls: string[]
}) {
  function updateAt(index: number, value: string) {
    onChange(urls.map((url, current) => (current === index ? value : url)))
  }

  function addRow() {
    onChange([...urls, ''])
  }

  function removeAt(index: number) {
    const next = urls.filter((_, current) => current !== index)
    onChange(next.length > 0 ? next : [''])
  }

  return (
    <div className="grid gap-2">
      <span className="block text-xs font-bold leading-4 text-blue-950">
        Tài liệu xác thực {required ? <RequiredMark /> : '(không bắt buộc)'}
      </span>
      <p className="text-[11px] font-medium leading-4 text-slate-500">
        Dán liên kết tài liệu đã lưu trữ trực tuyến (Google Drive, OneDrive...).
      </p>
      <div className="grid gap-2">
        {urls.map((url, index) => (
          <div className="flex items-center gap-2" key={index}>
            <input
              className="h-10 w-full rounded-lg border border-slate-200 bg-white px-3 text-xs font-medium text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-indigo-500 focus:ring-4 focus:ring-indigo-100"
              disabled={disabled}
              onChange={(event) => updateAt(index, event.target.value)}
              placeholder="https://..."
              type="url"
              value={url}
            />
            <button
              aria-label="Xoá tài liệu"
              className="inline-flex size-10 shrink-0 items-center justify-center rounded-lg border border-slate-200 bg-white text-slate-500 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-60"
              disabled={disabled || urls.length === 1}
              onClick={() => removeAt(index)}
              type="button"
            >
              <X aria-hidden="true" className="size-4" />
            </button>
          </div>
        ))}
      </div>
      <button
        className="inline-flex h-9 w-fit items-center gap-1.5 rounded-lg border border-indigo-200 bg-indigo-50 px-3 text-xs font-bold text-indigo-700 transition hover:bg-indigo-100 disabled:cursor-not-allowed disabled:opacity-60"
        disabled={disabled}
        onClick={addRow}
        type="button"
      >
        <Plus aria-hidden="true" className="size-4" />
        Thêm tài liệu
      </button>
    </div>
  )
}

