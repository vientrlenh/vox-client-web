import { useState } from 'react'
import { CheckCircle2, X } from 'lucide-react'
import type {
  CreateSchoolGradeLevelRequest,
  SchoolGradeLevel,
  UpdateSchoolGradeLevelRequest,
} from '../types'

export type SchoolGradeLevelFormMode = 'create' | 'edit'

type GradeLevelFormState = {
  code: string
  description: string
  name: string
  order: string
}

const emptyForm: GradeLevelFormState = {
  code: '',
  description: '',
  name: '',
  order: '',
}

function toEditForm(gradeLevel: SchoolGradeLevel): GradeLevelFormState {
  return {
    code: gradeLevel.code,
    description: gradeLevel.description ?? '',
    name: gradeLevel.name,
    order: String(gradeLevel.order),
  }
}

type SchoolGradeLevelFormDialogProps = {
  errorMessage?: string
  gradeLevel?: SchoolGradeLevel | null
  isOpen: boolean
  isSubmitting: boolean
  mode: SchoolGradeLevelFormMode
  onClose: () => void
  onCreate: (payload: CreateSchoolGradeLevelRequest) => void
  onUpdate: (id: string, payload: UpdateSchoolGradeLevelRequest) => void
}

type FieldInputProps = {
  disabled?: boolean
  label: string
  name: string
  onChange: (name: keyof GradeLevelFormState, value: string) => void
  placeholder?: string
  required?: boolean
  type?: string
  value: string
}

function FieldInput({
  disabled = false,
  label,
  name,
  onChange,
  placeholder,
  required = false,
  type = 'text',
  value,
}: FieldInputProps) {
  return (
    <label className="grid gap-2 text-sm font-bold text-slate-700">
      {label}
      <input
        className="h-11 rounded-lg border border-slate-200 px-3 text-sm font-medium text-slate-950 outline-none transition placeholder:text-slate-400 focus:border-cyan-500 focus:ring-4 focus:ring-cyan-100 disabled:bg-slate-100 disabled:text-slate-500"
        disabled={disabled}
        name={name}
        onChange={(event) =>
          onChange(name as keyof GradeLevelFormState, event.target.value)
        }
        placeholder={placeholder}
        required={required}
        type={type}
        value={value}
      />
    </label>
  )
}

export function SchoolGradeLevelFormDialog({
  errorMessage,
  gradeLevel,
  isOpen,
  isSubmitting,
  mode,
  onClose,
  onCreate,
  onUpdate,
}: SchoolGradeLevelFormDialogProps) {
  if (!isOpen) {
    return null
  }

  return (
    <SchoolGradeLevelFormDialogContent
      errorMessage={errorMessage}
      gradeLevel={gradeLevel}
      isSubmitting={isSubmitting}
      key={`${mode}-${gradeLevel?.id ?? 'new'}`}
      mode={mode}
      onClose={onClose}
      onCreate={onCreate}
      onUpdate={onUpdate}
    />
  )
}

function SchoolGradeLevelFormDialogContent({
  errorMessage,
  gradeLevel,
  isSubmitting,
  mode,
  onClose,
  onCreate,
  onUpdate,
}: Omit<SchoolGradeLevelFormDialogProps, 'isOpen'>) {
  const isEdit = mode === 'edit'
  const [form, setForm] = useState<GradeLevelFormState>(
    isEdit && gradeLevel ? toEditForm(gradeLevel) : emptyForm,
  )
  const [validationError, setValidationError] = useState<string | null>(null)

  function handleChange(name: keyof GradeLevelFormState, value: string) {
    setForm((current) => ({ ...current, [name]: value }))
  }

  function validateForm() {
    if (!form.name.trim()) {
      return 'Tên khối là bắt buộc.'
    }

    const orderNum = Number(form.order)

    if (!form.order.trim() || Number.isNaN(orderNum) || orderNum <= 0) {
      return 'Thứ tự phải là số nguyên lớn hơn 0.'
    }

    if (!isEdit && !form.code.trim()) {
      return 'Mã khối là bắt buộc.'
    }

    return null
  }

  function handleSubmit() {
    const error = validateForm()

    if (error) {
      setValidationError(error)
      return
    }

    setValidationError(null)

    if (isEdit && gradeLevel) {
      onUpdate(gradeLevel.id, {
        description: form.description.trim() || null,
        name: form.name.trim(),
        order: Number(form.order),
      })
      return
    }

    onCreate({
      code: form.code.trim(),
      description: form.description.trim() || null,
      name: form.name.trim(),
      order: Number(form.order),
    })
  }

  const title = isEdit ? 'Cập nhật khối' : 'Tạo khối mới'
  const displayedError = validationError ?? errorMessage

  return (
    <div className="fixed inset-0 z-50 grid place-items-center bg-slate-950/45 px-4 py-6">
      <form
        aria-labelledby="grade-level-dialog-title"
        className="grid max-h-[92vh] w-full max-w-2xl gap-5 overflow-y-auto rounded-lg bg-white p-6 shadow-xl shadow-slate-950/20"
        onSubmit={(event) => {
          event.preventDefault()
          handleSubmit()
        }}
        role="dialog"
      >
        <div className="flex items-start justify-between gap-4">
          <div>
            <h2
              className="text-xl font-black tracking-0 text-slate-950"
              id="grade-level-dialog-title"
            >
              {title}
            </h2>
            <p className="mt-1 text-sm font-medium text-slate-500">
              {isEdit
                ? 'Cập nhật thông tin khối học.'
                : 'Nhập thông tin để tạo khối học mới.'}
            </p>
          </div>
          <button
            aria-label="Đóng hộp thoại khối"
            className="inline-flex size-10 items-center justify-center rounded-lg text-slate-500 transition hover:bg-slate-100 hover:text-slate-950"
            disabled={isSubmitting}
            onClick={onClose}
            type="button"
          >
            <X aria-hidden="true" className="size-5" />
          </button>
        </div>

        {displayedError ? (
          <div
            className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm font-semibold text-red-700"
            role="alert"
          >
            {displayedError}
          </div>
        ) : null}

        <div className="grid gap-4 sm:grid-cols-2">
          <FieldInput
            disabled={isEdit || isSubmitting}
            label="Mã khối"
            name="code"
            onChange={handleChange}
            placeholder="K10"
            required={!isEdit}
            value={form.code}
          />
          <FieldInput
            disabled={isSubmitting}
            label="Tên khối"
            name="name"
            onChange={handleChange}
            placeholder="Khối 10"
            required
            value={form.name}
          />
          <FieldInput
            disabled={isSubmitting}
            label="Thứ tự hiển thị"
            name="order"
            onChange={handleChange}
            placeholder="1"
            required
            type="number"
            value={form.order}
          />
          <FieldInput
            disabled={isSubmitting}
            label="Mô tả"
            name="description"
            onChange={handleChange}
            placeholder="Nhập mô tả (tuỳ chọn)"
            value={form.description}
          />
        </div>

        <div className="flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
          <button
            className="inline-flex h-11 items-center justify-center rounded-lg border border-slate-200 px-4 text-sm font-bold text-slate-700 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-70"
            disabled={isSubmitting}
            onClick={onClose}
            type="button"
          >
            Hủy
          </button>
          <button
            className="inline-flex h-11 items-center justify-center gap-2 rounded-lg bg-cyan-600 px-4 text-sm font-bold text-white transition hover:bg-cyan-700 disabled:cursor-not-allowed disabled:opacity-70"
            disabled={isSubmitting}
            type="submit"
          >
            <CheckCircle2 aria-hidden="true" className="size-4" />
            {isSubmitting ? 'Đang lưu...' : 'Lưu khối'}
          </button>
        </div>
      </form>
    </div>
  )
}
