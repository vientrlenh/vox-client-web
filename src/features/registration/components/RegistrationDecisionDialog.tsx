import type { FormEvent } from 'react'
import { useState } from 'react'
import { Check, ChevronLeft, X } from 'lucide-react'
import type {
  ApproveRegisterFormRequest,
  RegisterForm,
  RejectRegisterFormRequest,
} from '../types'
import { formatNullableText, formatStudentCount } from '../types'

export type RegistrationDecisionMode = 'approve' | 'reject'

export type RegistrationDecisionPayload =
  | {
      mode: 'approve'
      payload: ApproveRegisterFormRequest
    }
  | {
      mode: 'reject'
      payload: RejectRegisterFormRequest
    }

type RegistrationDecisionDialogProps = {
  errorMessage?: string
  form: RegisterForm | null
  isSubmitting: boolean
  mode: RegistrationDecisionMode | null
  onClose: () => void
  onSubmit: (decision: RegistrationDecisionPayload) => void
}

type RegistrationDecisionDialogContentProps = Omit<
  RegistrationDecisionDialogProps,
  'form' | 'mode'
> & {
  form: RegisterForm
  mode: RegistrationDecisionMode
}

type ApproveFormState = {
  contactAddress: string
  contactEmail: string
  contactFullName: string
  contactPhone: string
  dateOfBirth: string
  description: string
  schoolAddress: string
  schoolCode: string
  schoolDomain: string
  schoolName: string
  studentCount: string
}

type ApproveFieldName = keyof ApproveFormState

type TextFieldConfig = {
  autoComplete?: string
  id: string
  label: string
  maxLength?: number
  name: ApproveFieldName
  required?: boolean
  type?: string
}

const approveFieldGroups: Array<{
  fields: TextFieldConfig[]
  title: string
}> = [
  {
    fields: [
      {
        id: 'approve-school-code',
        label: 'Mã trường',
        maxLength: 100,
        name: 'schoolCode',
        required: true,
      },
      {
        autoComplete: 'organization',
        id: 'approve-school-name',
        label: 'Tên trường',
        maxLength: 255,
        name: 'schoolName',
        required: true,
      },
      {
        id: 'approve-school-domain',
        label: 'Tên miền trường',
        maxLength: 100,
        name: 'schoolDomain',
        required: true,
      },
      {
        id: 'approve-student-count',
        label: 'Số học sinh',
        name: 'studentCount',
        required: true,
        type: 'number',
      },
      {
        autoComplete: 'street-address',
        id: 'approve-school-address',
        label: 'Địa chỉ trường',
        maxLength: 512,
        name: 'schoolAddress',
        required: true,
      },
    ],
    title: 'Thông tin trường',
  },
  {
    fields: [
      {
        autoComplete: 'name',
        id: 'approve-contact-name',
        label: 'Họ và tên liên hệ',
        maxLength: 255,
        name: 'contactFullName',
        required: true,
      },
      {
        autoComplete: 'tel',
        id: 'approve-contact-phone',
        label: 'Số điện thoại liên hệ',
        maxLength: 20,
        name: 'contactPhone',
        required: true,
        type: 'tel',
      },
      {
        autoComplete: 'email',
        id: 'approve-contact-email',
        label: 'Email liên hệ',
        maxLength: 255,
        name: 'contactEmail',
        required: true,
        type: 'email',
      },
      {
        id: 'approve-date-of-birth',
        label: 'Ngày sinh',
        name: 'dateOfBirth',
        required: true,
        type: 'date',
      },
      {
        autoComplete: 'street-address',
        id: 'approve-contact-address',
        label: 'Địa chỉ liên hệ',
        maxLength: 512,
        name: 'contactAddress',
        required: true,
      },
    ],
    title: 'Thông tin liên hệ',
  },
]

function getDateInputValue(value?: string | null) {
  const isoDate = /^(\d{4}-\d{2}-\d{2})/.exec(value ?? '')

  return isoDate?.[1] ?? ''
}

function createApproveFormState(form: RegisterForm | null): ApproveFormState {
  return {
    contactAddress: form?.contactAddress ?? '',
    contactEmail: form?.contactEmail ?? '',
    contactFullName: form?.contactFullName ?? '',
    contactPhone: form?.contactPhone ?? '',
    dateOfBirth: getDateInputValue(form?.dateOfBirth),
    description: '',
    schoolAddress: form?.schoolAddress ?? '',
    schoolCode: '',
    schoolDomain: form?.schoolDomain ?? '',
    schoolName: form?.schoolName ?? '',
    studentCount:
      typeof form?.studentCount === 'number' && form.studentCount > 0
        ? String(form.studentCount)
        : '',
  }
}

function trimApproveFormState(state: ApproveFormState): ApproveFormState {
  return {
    contactAddress: state.contactAddress.trim(),
    contactEmail: state.contactEmail.trim(),
    contactFullName: state.contactFullName.trim(),
    contactPhone: state.contactPhone.trim(),
    dateOfBirth: state.dateOfBirth.trim(),
    description: state.description.trim(),
    schoolAddress: state.schoolAddress.trim(),
    schoolCode: state.schoolCode.trim(),
    schoolDomain: state.schoolDomain.trim(),
    schoolName: state.schoolName.trim(),
    studentCount: state.studentCount.trim(),
  }
}

function buildApprovePayload(state: ApproveFormState) {
  const values = trimApproveFormState(state)
  const requiredFields: Array<[label: string, value: string]> = [
    ['Mã trường', values.schoolCode],
    ['Tên trường', values.schoolName],
    ['Số điện thoại liên hệ', values.contactPhone],
    ['Email liên hệ', values.contactEmail],
    ['Tên miền trường', values.schoolDomain],
    ['Địa chỉ trường', values.schoolAddress],
    ['Số học sinh', values.studentCount],
    ['Họ và tên liên hệ', values.contactFullName],
    ['Ngày sinh', values.dateOfBirth],
    ['Địa chỉ liên hệ', values.contactAddress],
  ]
  const missingField = requiredFields.find(([, value]) => !value)

  if (missingField) {
    return {
      error: `${missingField[0]} không được để trống.`,
      payload: null,
    }
  }

  const studentCount = Number(values.studentCount)

  if (!Number.isInteger(studentCount) || studentCount < 1) {
    return {
      error: 'Số học sinh phải là số nguyên lớn hơn 0.',
      payload: null,
    }
  }

  return {
    error: null,
    payload: {
      contactAddress: values.contactAddress,
      contactEmail: values.contactEmail,
      contactFullName: values.contactFullName,
      contactPhone: values.contactPhone,
      dateOfBirth: values.dateOfBirth,
      description: values.description || null,
      schoolAddress: values.schoolAddress,
      schoolCode: values.schoolCode,
      schoolDomain: values.schoolDomain,
      schoolName: values.schoolName,
      studentCount,
    } satisfies ApproveRegisterFormRequest,
  }
}

function buildRejectPayload(reason: string) {
  const trimmedReason = reason.trim()

  if (!trimmedReason) {
    return {
      error: 'Lý do từ chối không được để trống.',
      payload: null,
    }
  }

  if (trimmedReason.length > 255) {
    return {
      error: 'Lý do từ chối không được vượt quá 255 ký tự.',
      payload: null,
    }
  }

  return {
    error: null,
    payload: {
      reason: trimmedReason,
    } satisfies RejectRegisterFormRequest,
  }
}

function RequiredMark() {
  return <span className="text-red-500">*</span>
}

function TextField({
  disabled,
  field,
  onChange,
  value,
}: {
  disabled: boolean
  field: TextFieldConfig
  onChange: (name: ApproveFieldName, value: string) => void
  value: string
}) {
  return (
    <label className="block min-w-0" htmlFor={field.id}>
      <span className="mb-1.5 block text-xs font-bold text-blue-950">
        {field.label} {field.required ? <RequiredMark /> : null}
      </span>
      <input
        autoComplete={field.autoComplete}
        className="h-10 w-full rounded-lg border border-slate-200 bg-white px-3 text-xs font-medium text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-indigo-500 focus:ring-4 focus:ring-indigo-100 disabled:cursor-not-allowed disabled:bg-slate-50"
        disabled={disabled}
        id={field.id}
        maxLength={field.maxLength}
        min={field.type === 'number' ? 1 : undefined}
        name={field.name}
        onChange={(event) => onChange(field.name, event.target.value)}
        required={field.required}
        type={field.type ?? 'text'}
        value={value}
      />
    </label>
  )
}

function SummaryRow({
  label,
  value,
}: {
  label: string
  value: string | number | null
}) {
  return (
    <div className="grid grid-cols-[120px_1fr] gap-3 text-sm">
      <dt className="font-semibold text-slate-500">{label}</dt>
      <dd className="min-w-0 break-words font-bold text-blue-950">
        {value ?? '-'}
      </dd>
    </div>
  )
}

export function RegistrationDecisionDialog({
  errorMessage,
  form,
  isSubmitting,
  mode,
  onClose,
  onSubmit,
}: RegistrationDecisionDialogProps) {
  if (!mode || !form) {
    return null
  }

  return (
    <RegistrationDecisionDialogContent
      errorMessage={errorMessage}
      form={form}
      isSubmitting={isSubmitting}
      key={`${mode}-${form.id}`}
      mode={mode}
      onClose={onClose}
      onSubmit={onSubmit}
    />
  )
}

function RegistrationDecisionDialogContent({
  errorMessage,
  form,
  isSubmitting,
  mode,
  onClose,
  onSubmit,
}: RegistrationDecisionDialogContentProps) {
  const [approveForm, setApproveForm] = useState(() =>
    createApproveFormState(form),
  )
  const [rejectReason, setRejectReason] = useState('')
  const [validationMessage, setValidationMessage] = useState<string | null>(
    null,
  )
  const [step, setStep] = useState<'form' | 'confirm'>('form')
  const [decision, setDecision] = useState<RegistrationDecisionPayload | null>(
    null,
  )

  const isApproveMode = mode === 'approve'
  const title = isApproveMode ? 'Duyệt đơn đăng ký' : 'Từ chối đơn đăng ký'
  const description = isApproveMode
    ? 'Kiểm tra và chỉnh thông tin sẽ được dùng để tạo trường học và tài khoản quản trị trường.'
    : 'Nhập lý do từ chối để gửi thông báo cho người đăng ký.'
  const submitLabel = isApproveMode ? 'Tiếp tục duyệt' : 'Tiếp tục từ chối'
  const confirmLabel = isApproveMode ? 'Xác nhận duyệt' : 'Xác nhận từ chối'
  const actionClassName = isApproveMode
    ? 'bg-emerald-600 hover:bg-emerald-700 focus:ring-emerald-100'
    : 'bg-red-600 hover:bg-red-700 focus:ring-red-100'

  function handleApproveFieldChange(name: ApproveFieldName, value: string) {
    setApproveForm((current) => ({
      ...current,
      [name]: value,
    }))
    setValidationMessage(null)
  }

  function handleSubmitForm(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()

    const result = isApproveMode
      ? buildApprovePayload(approveForm)
      : buildRejectPayload(rejectReason)

    if (result.error || !result.payload) {
      setValidationMessage(result.error)
      return
    }

    setValidationMessage(null)
    setDecision({
      mode,
      payload: result.payload,
    } as RegistrationDecisionPayload)
    setStep('confirm')
  }

  function handleBackToForm() {
    setValidationMessage(null)
    setStep('form')
  }

  function handleConfirm() {
    if (!decision) {
      return
    }

    onSubmit(decision)
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/45 px-4 py-6">
      <section
        aria-labelledby="registration-decision-title"
        aria-modal="true"
        className="flex max-h-[calc(100vh-2rem)] w-full max-w-3xl flex-col overflow-hidden rounded-lg bg-white shadow-2xl"
        role="dialog"
      >
        <header className="flex items-start justify-between gap-4 border-b border-slate-200 px-6 py-5">
          <div className="min-w-0">
            <h2
              className="text-lg font-black text-blue-950"
              id="registration-decision-title"
            >
              {title}
            </h2>
            <p className="mt-1 text-sm font-medium text-slate-500">
              {description}
            </p>
          </div>
          <button
            aria-label="Đóng"
            className="inline-flex size-9 shrink-0 items-center justify-center rounded-lg border border-slate-200 text-slate-500 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-60"
            disabled={isSubmitting}
            onClick={onClose}
            type="button"
          >
            <X aria-hidden="true" className="size-4" />
          </button>
        </header>

        <div className="min-h-0 overflow-y-auto px-6 py-5">
          <div className="mb-5 rounded-lg border border-slate-200 bg-slate-50 px-4 py-3">
            <p className="text-xs font-bold uppercase text-slate-500">
              Đơn đăng ký
            </p>
            <p className="mt-1 text-sm font-black text-blue-950">
              {formatNullableText(form.schoolName)}
            </p>
            <p className="mt-1 text-xs font-medium text-slate-500">
              {formatNullableText(form.contactFullName)} ·{' '}
              {formatNullableText(form.contactEmail)}
            </p>
          </div>

          {step === 'form' ? (
            <form className="grid gap-5" onSubmit={handleSubmitForm}>
              {isApproveMode ? (
                <>
                  {approveFieldGroups.map((group) => (
                    <section className="grid gap-3" key={group.title}>
                      <h3 className="text-sm font-black text-blue-950">
                        {group.title}
                      </h3>
                      <div className="grid gap-3 sm:grid-cols-2">
                        {group.fields.map((field) => (
                          <TextField
                            disabled={isSubmitting}
                            field={field}
                            key={field.id}
                            onChange={handleApproveFieldChange}
                            value={approveForm[field.name]}
                          />
                        ))}
                      </div>
                    </section>
                  ))}

                  <label className="block min-w-0" htmlFor="approve-description">
                    <span className="mb-1.5 block text-xs font-bold text-blue-950">
                      Mô tả trường
                    </span>
                    <textarea
                      className="min-h-24 w-full resize-y rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs font-medium text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-indigo-500 focus:ring-4 focus:ring-indigo-100 disabled:cursor-not-allowed disabled:bg-slate-50"
                      disabled={isSubmitting}
                      id="approve-description"
                      maxLength={2048}
                      onChange={(event) =>
                        handleApproveFieldChange(
                          'description',
                          event.target.value,
                        )
                      }
                      placeholder="Nhập mô tả trường nếu cần"
                      value={approveForm.description}
                    />
                  </label>
                </>
              ) : (
                <label className="block min-w-0" htmlFor="reject-reason">
                  <span className="mb-1.5 block text-xs font-bold text-blue-950">
                    Lý do từ chối <RequiredMark />
                  </span>
                  <textarea
                    className="min-h-32 w-full resize-y rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm font-medium text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-indigo-500 focus:ring-4 focus:ring-indigo-100 disabled:cursor-not-allowed disabled:bg-slate-50"
                    disabled={isSubmitting}
                    id="reject-reason"
                    maxLength={255}
                    onChange={(event) => {
                      setRejectReason(event.target.value)
                      setValidationMessage(null)
                    }}
                    placeholder="Nhập lý do từ chối"
                    required
                    value={rejectReason}
                  />
                  <span className="mt-1 block text-xs font-medium text-slate-500">
                    {rejectReason.trim().length}/255 ký tự
                  </span>
                </label>
              )}

              {validationMessage ? (
                <div
                  className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm font-semibold text-red-700"
                  role="alert"
                >
                  {validationMessage}
                </div>
              ) : null}

              <div className="flex flex-col-reverse gap-3 border-t border-slate-200 pt-5 sm:flex-row sm:justify-end">
                <button
                  className="inline-flex h-10 items-center justify-center rounded-lg border border-slate-200 bg-white px-4 text-sm font-bold text-slate-700 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-60"
                  disabled={isSubmitting}
                  onClick={onClose}
                  type="button"
                >
                  Hủy
                </button>
                <button
                  className={`inline-flex h-10 items-center justify-center gap-2 rounded-lg px-4 text-sm font-black text-white transition focus:ring-4 disabled:cursor-not-allowed disabled:opacity-60 ${actionClassName}`}
                  disabled={isSubmitting}
                  type="submit"
                >
                  <Check aria-hidden="true" className="size-4" />
                  {submitLabel}
                </button>
              </div>
            </form>
          ) : null}

          {step === 'confirm' && decision ? (
            <div className="grid gap-5">
              <div className="rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm font-semibold text-amber-800">
                Vui lòng xác nhận lần cuối trước khi thực hiện thao tác này.
              </div>

              <dl className="grid gap-3 rounded-lg border border-slate-200 px-4 py-4">
                {decision.mode === 'approve' ? (
                  <>
                    <SummaryRow
                      label="Mã trường"
                      value={decision.payload.schoolCode}
                    />
                    <SummaryRow
                      label="Tên trường"
                      value={decision.payload.schoolName}
                    />
                    <SummaryRow
                      label="Tên miền"
                      value={decision.payload.schoolDomain}
                    />
                    <SummaryRow
                      label="Email"
                      value={decision.payload.contactEmail}
                    />
                    <SummaryRow
                      label="Số học sinh"
                      value={formatStudentCount(decision.payload.studentCount)}
                    />
                  </>
                ) : (
                  <SummaryRow label="Lý do" value={decision.payload.reason} />
                )}
              </dl>

              {errorMessage ? (
                <div
                  className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm font-semibold text-red-700"
                  role="alert"
                >
                  {errorMessage}
                </div>
              ) : null}

              <div className="flex flex-col-reverse gap-3 border-t border-slate-200 pt-5 sm:flex-row sm:justify-end">
                <button
                  className="inline-flex h-10 items-center justify-center gap-2 rounded-lg border border-slate-200 bg-white px-4 text-sm font-bold text-slate-700 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-60"
                  disabled={isSubmitting}
                  onClick={handleBackToForm}
                  type="button"
                >
                  <ChevronLeft aria-hidden="true" className="size-4" />
                  Quay lại
                </button>
                <button
                  className={`inline-flex h-10 items-center justify-center gap-2 rounded-lg px-4 text-sm font-black text-white transition focus:ring-4 disabled:cursor-not-allowed disabled:opacity-60 ${actionClassName}`}
                  disabled={isSubmitting}
                  onClick={handleConfirm}
                  type="button"
                >
                  <Check aria-hidden="true" className="size-4" />
                  {isSubmitting ? 'Đang xử lý...' : confirmLabel}
                </button>
              </div>
            </div>
          ) : null}
        </div>
      </section>
    </div>
  )
}
