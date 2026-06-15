import { useState } from 'react'
import { CheckCircle2, X } from 'lucide-react'
import type {
  CreateSchoolClassRequest,
  SchoolClass,
  SchoolClassStatus,
  UpdateSchoolClassRequest,
} from '../types'

export type SchoolClassFormMode = 'create' | 'edit'

type ClassFormState = {
  code: string
  description: string
  languageId: string
  name: string
  schoolGradeId: string
  status: SchoolClassStatus
}

const emptyClassForm: ClassFormState = {
  code: '',
  description: '',
  languageId: '',
  name: '',
  schoolGradeId: '',
  status: 'ACTIVE',
}

type SchoolClassFormDialogProps = {
  errorMessage?: string
  isOpen: boolean
  isSubmitting: boolean
  mode: SchoolClassFormMode
  onClose: () => void
  onCreate: (payload: CreateSchoolClassRequest) => void
  onUpdate: (id: string, payload: UpdateSchoolClassRequest) => void
  schoolClass?: SchoolClass | null
}

type FieldInputProps = {
  disabled?: boolean
  label: string
  name: keyof ClassFormState
  onChange: (name: keyof ClassFormState, value: string) => void
  placeholder?: string
  required?: boolean
  value: string
}

function isUuidLike(value: string) {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(
    value.trim(),
  )
}

function toEditForm(schoolClass: SchoolClass): ClassFormState {
  return {
    code: schoolClass.code,
    description: schoolClass.description ?? '',
    languageId: schoolClass.languageId ?? schoolClass.language?.id ?? '',
    name: schoolClass.name,
    schoolGradeId: schoolClass.schoolGradeId ?? schoolClass.schoolGrade?.id ?? '',
    status:
      schoolClass.status === 'ARCHIVED' || schoolClass.status === 'INACTIVE'
        ? schoolClass.status
        : 'ACTIVE',
  }
}

function FieldInput({
  disabled = false,
  label,
  name,
  onChange,
  placeholder,
  required = false,
  value,
}: FieldInputProps) {
  return (
    <label className="grid gap-2 text-sm font-bold text-slate-700">
      {label}
      <input
        className="h-11 rounded-lg border border-slate-200 px-3 text-sm font-medium text-slate-950 outline-none transition placeholder:text-slate-400 focus:border-cyan-500 focus:ring-4 focus:ring-cyan-100 disabled:bg-slate-100 disabled:text-slate-500"
        disabled={disabled}
        name={name}
        onChange={(event) => onChange(name, event.target.value)}
        placeholder={placeholder}
        required={required}
        value={value}
      />
    </label>
  )
}

export function SchoolClassFormDialog({
  errorMessage,
  isOpen,
  isSubmitting,
  mode,
  onClose,
  onCreate,
  onUpdate,
  schoolClass,
}: SchoolClassFormDialogProps) {
  if (!isOpen) {
    return null
  }

  return (
    <SchoolClassFormDialogContent
      errorMessage={errorMessage}
      isSubmitting={isSubmitting}
      key={`${mode}-${schoolClass?.id ?? 'new'}`}
      mode={mode}
      onClose={onClose}
      onCreate={onCreate}
      onUpdate={onUpdate}
      schoolClass={schoolClass}
    />
  )
}

function SchoolClassFormDialogContent({
  errorMessage,
  isSubmitting,
  mode,
  onClose,
  onCreate,
  onUpdate,
  schoolClass,
}: Omit<SchoolClassFormDialogProps, 'isOpen'>) {
  const isEdit = mode === 'edit'
  const [form, setForm] = useState<ClassFormState>(
    isEdit && schoolClass ? toEditForm(schoolClass) : emptyClassForm,
  )
  const [validationError, setValidationError] = useState<string | null>(null)

  function handleChange(name: keyof ClassFormState, value: string) {
    setForm((current) => ({
      ...current,
      [name]: value,
    }))
  }

  function validateForm() {
    if (!form.name.trim()) {
      return 'Tên lớp là bắt buộc.'
    }

    if (!isEdit) {
      if (!form.code.trim()) {
        return 'Mã lớp là bắt buộc.'
      }

      if (!isUuidLike(form.languageId)) {
        return 'ID ngôn ngữ không hợp lệ.'
      }

      if (!isUuidLike(form.schoolGradeId)) {
        return 'ID khối lớp không hợp lệ.'
      }
    }

    return null
  }

  function handleSubmit() {
    const nextValidationError = validateForm()

    if (nextValidationError) {
      setValidationError(nextValidationError)
      return
    }

    setValidationError(null)

    if (isEdit && schoolClass) {
      onUpdate(schoolClass.id, {
        description: form.description.trim() || null,
        name: form.name.trim(),
        status: form.status,
      })
      return
    }

    onCreate({
      code: form.code.trim(),
      description: form.description.trim() || null,
      languageId: form.languageId.trim(),
      name: form.name.trim(),
      schoolGradeId: form.schoolGradeId.trim(),
    })
  }

  const title = isEdit ? 'Cập nhật lớp học' : 'Tạo lớp học'
  const displayedError = validationError ?? errorMessage

  return (
    <div className="fixed inset-0 z-50 grid place-items-center bg-slate-950/45 px-4 py-6">
      <form
        aria-labelledby="class-dialog-title"
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
              id="class-dialog-title"
            >
              {title}
            </h2>
            <p className="mt-1 text-sm font-medium text-slate-500">
              {isEdit
                ? 'Cập nhật tên lớp, mô tả và trạng thái lớp học.'
                : 'Nhập thông tin để tạo lớp học mới.'}
            </p>
          </div>
          <button
            aria-label="Đóng hộp thoại lớp học"
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
            label="Mã lớp"
            name="code"
            onChange={handleChange}
            placeholder="ENG-6A"
            required={!isEdit}
            value={form.code}
          />
          <FieldInput
            disabled={isSubmitting}
            label="Tên lớp"
            name="name"
            onChange={handleChange}
            placeholder="Tiếng Anh 6A"
            required
            value={form.name}
          />
          <FieldInput
            disabled={isEdit || isSubmitting}
            label="ID ngôn ngữ"
            name="languageId"
            onChange={handleChange}
            placeholder="Dán ID ngôn ngữ"
            required={!isEdit}
            value={form.languageId}
          />
          <FieldInput
            disabled={isEdit || isSubmitting}
            label="ID khối lớp"
            name="schoolGradeId"
            onChange={handleChange}
            placeholder="Dán ID khối lớp"
            required={!isEdit}
            value={form.schoolGradeId}
          />
        </div>

        <label className="grid gap-2 text-sm font-bold text-slate-700">
          Mô tả
          <textarea
            className="min-h-28 rounded-lg border border-slate-200 px-3 py-3 text-sm font-medium text-slate-950 outline-none transition placeholder:text-slate-400 focus:border-cyan-500 focus:ring-4 focus:ring-cyan-100"
            disabled={isSubmitting}
            onChange={(event) => handleChange('description', event.target.value)}
            placeholder="Mô tả ngắn về lớp học"
            value={form.description}
          />
        </label>

        {isEdit ? (
          <label className="grid gap-2 text-sm font-bold text-slate-700">
            Trạng thái
            <select
              className="h-11 rounded-lg border border-slate-200 px-3 text-sm font-medium text-slate-950 outline-none transition focus:border-cyan-500 focus:ring-4 focus:ring-cyan-100"
              disabled={isSubmitting}
              onChange={(event) => handleChange('status', event.target.value)}
              value={form.status}
            >
              <option value="ACTIVE">Đang hoạt động</option>
              <option value="INACTIVE">Tạm dừng</option>
              <option value="ARCHIVED">Đã lưu trữ</option>
            </select>
          </label>
        ) : null}

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
            {isSubmitting ? 'Đang lưu...' : 'Lưu lớp học'}
          </button>
        </div>
      </form>
    </div>
  )
}
