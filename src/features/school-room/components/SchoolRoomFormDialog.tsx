import { useState } from 'react'
import { CheckCircle2, X } from 'lucide-react'
import type {
  CreateSchoolRoomRequest,
  SchoolRoom,
  UpdateSchoolRoomRequest,
} from '../types'

export type SchoolRoomFormMode = 'create' | 'edit'

type RoomFormState = {
  code: string
  description: string
  name: string
}

const emptyForm: RoomFormState = {
  code: '',
  description: '',
  name: '',
}

function toEditForm(room: SchoolRoom): RoomFormState {
  return {
    code: room.code,
    description: room.description ?? '',
    name: room.name,
  }
}

type SchoolRoomFormDialogProps = {
  errorMessage?: string
  isOpen: boolean
  isSubmitting: boolean
  mode: SchoolRoomFormMode
  onClose: () => void
  onCreate: (payload: CreateSchoolRoomRequest) => void
  onUpdate: (id: string, payload: UpdateSchoolRoomRequest) => void
  room?: SchoolRoom | null
}

type FieldInputProps = {
  disabled?: boolean
  hint?: string
  label: string
  maxLength?: number
  name: keyof RoomFormState
  onChange: (name: keyof RoomFormState, value: string) => void
  placeholder?: string
  required?: boolean
  value: string
}

function FieldInput({
  disabled = false,
  hint,
  label,
  maxLength,
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
        maxLength={maxLength}
        name={name}
        onChange={(event) => onChange(name, event.target.value)}
        placeholder={placeholder}
        required={required}
        type="text"
        value={value}
      />
      {hint ? (
        <span className="text-xs font-medium text-slate-400">{hint}</span>
      ) : null}
    </label>
  )
}

export function SchoolRoomFormDialog({
  errorMessage,
  isOpen,
  isSubmitting,
  mode,
  onClose,
  onCreate,
  onUpdate,
  room,
}: SchoolRoomFormDialogProps) {
  if (!isOpen) {
    return null
  }

  return (
    <SchoolRoomFormDialogContent
      errorMessage={errorMessage}
      isSubmitting={isSubmitting}
      key={`${mode}-${room?.id ?? 'new'}`}
      mode={mode}
      onClose={onClose}
      onCreate={onCreate}
      onUpdate={onUpdate}
      room={room}
    />
  )
}

function SchoolRoomFormDialogContent({
  errorMessage,
  isSubmitting,
  mode,
  onClose,
  onCreate,
  onUpdate,
  room,
}: Omit<SchoolRoomFormDialogProps, 'isOpen'>) {
  const isEdit = mode === 'edit'
  const [form, setForm] = useState<RoomFormState>(
    isEdit && room ? toEditForm(room) : emptyForm,
  )
  const [validationError, setValidationError] = useState<string | null>(null)

  function handleChange(name: keyof RoomFormState, value: string) {
    setForm((current) => ({ ...current, [name]: value }))
  }

  function validateForm() {
    if (!form.name.trim()) {
      return 'Tên phòng học là bắt buộc.'
    }

    if (!isEdit && !form.code.trim()) {
      return 'Mã phòng học là bắt buộc.'
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

    if (isEdit && room) {
      onUpdate(room.id, {
        description: form.description.trim() || null,
        name: form.name.trim(),
      })
      return
    }

    onCreate({
      code: form.code.trim(),
      description: form.description.trim() || null,
      name: form.name.trim(),
    })
  }

  const title = isEdit ? 'Cập nhật phòng học' : 'Tạo phòng học mới'
  const displayedError = validationError ?? errorMessage

  return (
    <div className="fixed inset-0 z-50 grid place-items-center bg-slate-950/45 px-4 py-6">
      <form
        aria-labelledby="school-room-dialog-title"
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
              id="school-room-dialog-title"
            >
              {title}
            </h2>
            <p className="mt-1 text-sm font-medium text-slate-500">
              {isEdit
                ? 'Cập nhật thông tin phòng học. Mã phòng không thể thay đổi.'
                : 'Nhập thông tin để tạo phòng học mới.'}
            </p>
          </div>
          <button
            aria-label="Đóng hộp thoại phòng học"
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
            hint={isEdit ? 'Mã phòng không thể sửa sau khi tạo.' : undefined}
            label="Mã phòng"
            maxLength={50}
            name="code"
            onChange={handleChange}
            placeholder="P101"
            required={!isEdit}
            value={form.code}
          />
          <FieldInput
            disabled={isSubmitting}
            label="Tên phòng"
            maxLength={100}
            name="name"
            onChange={handleChange}
            placeholder="Phòng 101"
            required
            value={form.name}
          />
        </div>

        <FieldInput
          disabled={isSubmitting}
          label="Mô tả"
          maxLength={2048}
          name="description"
          onChange={handleChange}
          placeholder="Nhập mô tả (tuỳ chọn)"
          value={form.description}
        />

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
            {isSubmitting ? 'Đang lưu...' : 'Lưu phòng học'}
          </button>
        </div>
      </form>
    </div>
  )
}
