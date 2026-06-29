import { useState } from 'react'
import { CheckCircle2, X } from 'lucide-react'
import type {
  CreateSchoolGradeRequest,
  SchoolGrade,
  UpdateSchoolGradeRequest,
} from '../types'

export type SchoolGradeFormMode = 'create' | 'edit'

type GradeFormState = {
  code: string
  description: string
  endDate: string
  name: string
  startDate: string
}

const emptyForm: GradeFormState = {
  code: '',
  description: '',
  endDate: '',
  name: '',
  startDate: '',
}

function toEditForm(grade: SchoolGrade): GradeFormState {
  return {
    code: grade.code,
    description: grade.description ?? '',
    endDate: grade.endDate ?? '',
    name: grade.name,
    startDate: grade.startDate ?? '',
  }
}

type SchoolGradeFormDialogProps = {
  errorMessage?: string
  grade?: SchoolGrade | null
  isOpen: boolean
  isSubmitting: boolean
  mode: SchoolGradeFormMode
  onClose: () => void
  onCreate: (payload: CreateSchoolGradeRequest) => void
  onUpdate: (id: string, payload: UpdateSchoolGradeRequest) => void
}

type FieldInputProps = {
  disabled?: boolean
  label: string
  name: string
  onChange: (name: keyof GradeFormState, value: string) => void
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
          onChange(name as keyof GradeFormState, event.target.value)
        }
        placeholder={placeholder}
        required={required}
        type={type}
        value={value}
      />
    </label>
  )
}

export function SchoolGradeFormDialog({
  errorMessage,
  grade,
  isOpen,
  isSubmitting,
  mode,
  onClose,
  onCreate,
  onUpdate,
}: SchoolGradeFormDialogProps) {
  if (!isOpen) {
    return null
  }

  return (
    <SchoolGradeFormDialogContent
      errorMessage={errorMessage}
      grade={grade}
      isSubmitting={isSubmitting}
      key={`${mode}-${grade?.id ?? 'new'}`}
      mode={mode}
      onClose={onClose}
      onCreate={onCreate}
      onUpdate={onUpdate}
    />
  )
}

function SchoolGradeFormDialogContent({
  errorMessage,
  grade,
  isSubmitting,
  mode,
  onClose,
  onCreate,
  onUpdate,
}: Omit<SchoolGradeFormDialogProps, 'isOpen'>) {
  const isEdit = mode === 'edit'
  const [form, setForm] = useState<GradeFormState>(
    isEdit && grade ? toEditForm(grade) : emptyForm,
  )
  const [validationError, setValidationError] = useState<string | null>(null)

  function handleChange(name: keyof GradeFormState, value: string) {
    setForm((current) => ({ ...current, [name]: value }))
  }

  function validateForm() {
    if (!form.name.trim()) {
      return 'Tên năm học là bắt buộc.'
    }

    if (!isEdit && !form.code.trim()) {
      return 'Mã năm học là bắt buộc.'
    }

    if (!form.startDate) {
      return 'Ngày bắt đầu là bắt buộc.'
    }

    if (!form.endDate) {
      return 'Ngày kết thúc là bắt buộc.'
    }

    if (form.startDate >= form.endDate) {
      return 'Ngày bắt đầu phải trước ngày kết thúc.'
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

    if (isEdit && grade) {
      onUpdate(grade.id, {
        description: form.description.trim() || null,
        endDate: form.endDate,
        name: form.name.trim(),
        startDate: form.startDate,
      })
      return
    }

    onCreate({
      code: form.code.trim(),
      description: form.description.trim() || null,
      endDate: form.endDate,
      name: form.name.trim(),
      startDate: form.startDate,
    })
  }

  const title = isEdit ? 'Cập nhật năm học' : 'Tạo năm học mới'
  const displayedError = validationError ?? errorMessage

  return (
    <div className="fixed inset-0 z-50 grid place-items-center bg-slate-950/45 px-4 py-6">
      <form
        aria-labelledby="grade-dialog-title"
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
              id="grade-dialog-title"
            >
              {title}
            </h2>
            <p className="mt-1 text-sm font-medium text-slate-500">
              {isEdit
                ? 'Cập nhật thông tin năm học.'
                : 'Nhập thông tin để tạo năm học mới.'}
            </p>
          </div>
          <button
            aria-label="Đóng hộp thoại năm học"
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
            label="Mã năm học"
            name="code"
            onChange={handleChange}
            placeholder="NH2024-2025"
            required={!isEdit}
            value={form.code}
          />
          <FieldInput
            disabled={isSubmitting}
            label="Tên năm học"
            name="name"
            onChange={handleChange}
            placeholder="Năm học 2024-2025"
            required
            value={form.name}
          />
          <FieldInput
            disabled={isSubmitting}
            label="Ngày bắt đầu"
            name="startDate"
            onChange={handleChange}
            required
            type="date"
            value={form.startDate}
          />
          <FieldInput
            disabled={isSubmitting}
            label="Ngày kết thúc"
            name="endDate"
            onChange={handleChange}
            required
            type="date"
            value={form.endDate}
          />
          <div className="sm:col-span-2">
            <FieldInput
              disabled={isSubmitting}
              label="Mô tả"
              name="description"
              onChange={handleChange}
              placeholder="Nhập mô tả (tuỳ chọn)"
              value={form.description}
            />
          </div>
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
            {isSubmitting ? 'Đang lưu...' : 'Lưu năm học'}
          </button>
        </div>
      </form>
    </div>
  )
}
