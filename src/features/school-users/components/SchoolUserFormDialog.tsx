import { useState } from 'react'
import { CheckCircle2, X } from 'lucide-react'
import type {
  CreateSchoolUserRequest,
  SchoolUser,
  SchoolUserRole,
  UpdateSchoolUserInput,
} from '../types'
import { toDateInputValue } from '../types'

export type SchoolUserFormMode = 'create' | 'edit'

type SchoolUserFormState = {
  address: string
  dateOfBirth: string
  email: string
  endDate: string
  fullName: string
  phone: string
  roleCode: SchoolUserRole
  startDate: string
}

const emptyUserForm: SchoolUserFormState = {
  address: '',
  dateOfBirth: '',
  email: '',
  endDate: '',
  fullName: '',
  phone: '',
  roleCode: 'STUDENT',
  startDate: '',
}

type SchoolUserFormDialogProps = {
  errorMessage?: string
  isOpen: boolean
  isSubmitting: boolean
  mode: SchoolUserFormMode
  onClose: () => void
  onCreate: (payload: CreateSchoolUserRequest) => void
  onUpdate: (userId: string, input: UpdateSchoolUserInput) => void
  schoolUser?: SchoolUser | null
}

type FieldInputProps = {
  disabled?: boolean
  label: string
  name: keyof SchoolUserFormState
  onChange: (name: keyof SchoolUserFormState, value: string) => void
  placeholder?: string
  required?: boolean
  type?: string
  value: string
}

function toEditForm(schoolUser: SchoolUser): SchoolUserFormState {
  const profile = schoolUser.user
  const roleCode =
    profile?.schoolRoles?.[0]?.code?.toUpperCase() === 'TEACHER'
      ? 'TEACHER'
      : 'STUDENT'

  return {
    address: profile?.address ?? '',
    dateOfBirth: toDateInputValue(profile?.dateOfBirth),
    email: profile?.email ?? '',
    endDate: toDateInputValue(schoolUser.endDate),
    fullName: profile?.fullName ?? '',
    phone: profile?.phone ?? '',
    roleCode,
    startDate: toDateInputValue(schoolUser.startDate),
  }
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
        onChange={(event) => onChange(name, event.target.value)}
        placeholder={placeholder}
        required={required}
        type={type}
        value={value}
      />
    </label>
  )
}

export function SchoolUserFormDialog({
  errorMessage,
  isOpen,
  isSubmitting,
  mode,
  onClose,
  onCreate,
  onUpdate,
  schoolUser,
}: SchoolUserFormDialogProps) {
  if (!isOpen) {
    return null
  }

  return (
    <SchoolUserFormDialogContent
      errorMessage={errorMessage}
      isSubmitting={isSubmitting}
      key={`${mode}-${schoolUser?.userId ?? 'new'}`}
      mode={mode}
      onClose={onClose}
      onCreate={onCreate}
      onUpdate={onUpdate}
      schoolUser={schoolUser}
    />
  )
}

function SchoolUserFormDialogContent({
  errorMessage,
  isSubmitting,
  mode,
  onClose,
  onCreate,
  onUpdate,
  schoolUser,
}: Omit<SchoolUserFormDialogProps, 'isOpen'>) {
  const isEdit = mode === 'edit'
  const [form, setForm] = useState<SchoolUserFormState>(
    isEdit && schoolUser ? toEditForm(schoolUser) : emptyUserForm,
  )
  const [validationError, setValidationError] = useState<string | null>(null)

  const isStudent = form.roleCode === 'STUDENT'

  function handleChange(name: keyof SchoolUserFormState, value: string) {
    setForm((current) => ({
      ...current,
      [name]: value,
    }))
  }

  function validateForm() {
    if (!form.fullName.trim()) {
      return 'Họ tên là bắt buộc.'
    }

    if (!form.phone.trim()) {
      return 'Số điện thoại là bắt buộc.'
    }

    if (!isEdit) {
      if (!form.email.trim()) {
        return 'Email là bắt buộc.'
      }

      if (!form.dateOfBirth) {
        return 'Ngày sinh là bắt buộc.'
      }

      if (!form.address.trim()) {
        return 'Địa chỉ là bắt buộc.'
      }

      if (isStudent && (!form.startDate || !form.endDate)) {
        return 'Ngày bắt đầu và ngày kết thúc là bắt buộc đối với học sinh.'
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

    if (isEdit && schoolUser?.userId) {
      onUpdate(schoolUser.userId, {
        address: form.address.trim() || null,
        dateOfBirth: form.dateOfBirth || null,
        fullName: form.fullName.trim(),
        phone: form.phone.trim(),
      })
      return
    }

    onCreate({
      address: form.address.trim(),
      dateOfBirth: form.dateOfBirth,
      email: form.email.trim(),
      endDate: isStudent ? form.endDate || null : null,
      fullName: form.fullName.trim(),
      phone: form.phone.trim(),
      roleCode: form.roleCode,
      startDate: isStudent ? form.startDate || null : form.startDate || null,
    })
  }

  const title = isEdit ? 'Cập nhật người dùng' : 'Tạo người dùng nhà trường'
  const displayedError = validationError ?? errorMessage

  return (
    <div className="fixed inset-0 z-50 grid place-items-center bg-slate-950/45 px-4 py-6">
      <form
        aria-labelledby="school-user-dialog-title"
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
              id="school-user-dialog-title"
            >
              {title}
            </h2>
            <p className="mt-1 text-sm font-medium text-slate-500">
              {isEdit
                ? 'Cập nhật họ tên, số điện thoại, ngày sinh và địa chỉ.'
                : 'Nhập thông tin để tạo học sinh hoặc giáo viên mới.'}
            </p>
          </div>
          <button
            aria-label="Đóng hộp thoại người dùng"
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
            label="Email"
            name="email"
            onChange={handleChange}
            placeholder="hocsinh@truong.edu.vn"
            required={!isEdit}
            type="email"
            value={form.email}
          />
          <FieldInput
            disabled={isSubmitting}
            label="Họ tên"
            name="fullName"
            onChange={handleChange}
            placeholder="Nguyễn Văn A"
            required
            value={form.fullName}
          />
          <FieldInput
            disabled={isSubmitting}
            label="Số điện thoại"
            name="phone"
            onChange={handleChange}
            placeholder="0901234567"
            required
            value={form.phone}
          />
          <FieldInput
            disabled={isSubmitting}
            label="Ngày sinh"
            name="dateOfBirth"
            onChange={handleChange}
            required={!isEdit}
            type="date"
            value={form.dateOfBirth}
          />

          {isEdit ? null : (
            <label className="grid gap-2 text-sm font-bold text-slate-700">
              Vai trò
              <select
                className="h-11 rounded-lg border border-slate-200 px-3 text-sm font-medium text-slate-950 outline-none transition focus:border-cyan-500 focus:ring-4 focus:ring-cyan-100 disabled:bg-slate-100 disabled:text-slate-500"
                disabled={isSubmitting}
                onChange={(event) => handleChange('roleCode', event.target.value)}
                value={form.roleCode}
              >
                <option value="STUDENT">Học sinh</option>
                <option value="TEACHER">Giáo viên</option>
              </select>
            </label>
          )}

          <FieldInput
            disabled={isSubmitting}
            label="Địa chỉ"
            name="address"
            onChange={handleChange}
            placeholder="Số nhà, đường, phường/xã"
            required={!isEdit}
            value={form.address}
          />
        </div>

        {isEdit ? null : (
          <div className="grid gap-4 sm:grid-cols-2">
            <FieldInput
              disabled={isSubmitting}
              label={isStudent ? 'Ngày bắt đầu' : 'Ngày bắt đầu (tùy chọn)'}
              name="startDate"
              onChange={handleChange}
              required={isStudent}
              type="date"
              value={form.startDate}
            />
            {isStudent ? (
              <FieldInput
                disabled={isSubmitting}
                label="Ngày kết thúc"
                name="endDate"
                onChange={handleChange}
                required
                type="date"
                value={form.endDate}
              />
            ) : (
              <div className="grid content-center rounded-lg border border-dashed border-slate-200 bg-slate-50 px-3 py-2 text-xs font-semibold text-slate-500">
                Giáo viên không có thời hạn kết thúc.
              </div>
            )}
          </div>
        )}

        {isEdit ? (
          <p className="text-xs font-semibold text-slate-500">
            Không thể đổi email và vai trò khi cập nhật.
          </p>
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
            {isSubmitting ? 'Đang lưu...' : 'Lưu người dùng'}
          </button>
        </div>
      </form>
    </div>
  )
}
