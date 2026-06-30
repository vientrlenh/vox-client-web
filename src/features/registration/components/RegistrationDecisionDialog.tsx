import type { FormEvent } from 'react'
import { useState } from 'react'
import { Check, ChevronLeft, X } from 'lucide-react'
import { useVietnamProvincesQuery } from '../api/useVietnamProvincesQuery'
import type {
  ApproveRegisterFormRequest,
  RegisterForm,
  RejectRegisterFormRequest,
} from '../types'
import { formatNullableText } from '../types'

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
  description: string
  provinceCode: string
  schoolCode: string
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

const approveTextFields: TextFieldConfig[] = [
  {
    id: 'approve-school-code',
    label: 'Mã trường',
    maxLength: 100,
    name: 'schoolCode',
    required: true,
  },
]

function createApproveFormState(): ApproveFormState {
  return {
    description: '',
    provinceCode: '',
    schoolCode: '',
  }
}

function trimApproveFormState(state: ApproveFormState): ApproveFormState {
  return {
    description: state.description.trim(),
    provinceCode: state.provinceCode.trim(),
    schoolCode: state.schoolCode.trim(),
  }
}

function buildApprovePayload(state: ApproveFormState) {
  const values = trimApproveFormState(state)
  const requiredFields: Array<[label: string, value: string]> = [
    ['Mã trường', values.schoolCode],
    ['Mã tỉnh thành', values.provinceCode],
  ]
  const missingField = requiredFields.find(([, value]) => !value)

  if (missingField) {
    return {
      error: `${missingField[0]} không được để trống.`,
      payload: null,
    }
  }

  return {
    error: null,
    payload: {
      description: values.description || null,
      provinceCode: values.provinceCode,
      schoolCode: values.schoolCode,
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
      <dd className="min-w-0 wrap-break-word font-bold text-blue-950">
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
    createApproveFormState(),
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

  const provincesQuery = useVietnamProvincesQuery()
  const provinces = provincesQuery.data ?? []

  function getProvinceName(code: string) {
    return (
      provinces.find((province) => String(province.code) === code)?.name ?? code
    )
  }

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
                  <section className="grid gap-3">
                    <h3 className="text-sm font-black text-blue-950">
                      Thông tin trường
                    </h3>
                    <div className="grid gap-3 sm:grid-cols-2">
                      {approveTextFields.map((field) => (
                        <TextField
                          disabled={isSubmitting}
                          field={field}
                          key={field.id}
                          onChange={handleApproveFieldChange}
                          value={approveForm[field.name]}
                        />
                      ))}

                      <label
                        className="block min-w-0"
                        htmlFor="approve-province-code"
                      >
                        <span className="mb-1.5 block text-xs font-bold text-blue-950">
                          Tỉnh / Thành phố <RequiredMark />
                        </span>
                        <select
                          className="h-10 w-full rounded-lg border border-slate-200 bg-white px-3 text-xs font-medium text-slate-900 outline-none transition focus:border-indigo-500 focus:ring-4 focus:ring-indigo-100 disabled:cursor-not-allowed disabled:bg-slate-50"
                          disabled={isSubmitting || provincesQuery.isLoading}
                          id="approve-province-code"
                          onChange={(event) =>
                            handleApproveFieldChange(
                              'provinceCode',
                              event.target.value,
                            )
                          }
                          required
                          value={approveForm.provinceCode}
                        >
                          <option value="">
                            {provincesQuery.isLoading
                              ? 'Đang tải tỉnh/thành phố...'
                              : 'Chọn tỉnh / thành phố'}
                          </option>
                          {provinces.map((province) => (
                            <option key={province.code} value={String(province.code)}>
                              {province.name}
                            </option>
                          ))}
                        </select>
                        {provincesQuery.isError ? (
                          <span className="mt-1 block text-xs font-medium text-red-600">
                            Không thể tải danh sách tỉnh/thành phố. Vui lòng thử
                            lại.
                          </span>
                        ) : null}
                      </label>
                    </div>
                  </section>

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
                      label="Tỉnh / Thành phố"
                      value={getProvinceName(decision.payload.provinceCode)}
                    />
                    <SummaryRow
                      label="Mô tả"
                      value={decision.payload.description}
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
