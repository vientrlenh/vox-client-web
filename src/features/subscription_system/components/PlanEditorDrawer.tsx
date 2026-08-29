import type { FormEvent } from 'react'
import { useState } from 'react'
import { FileCheck2, Headphones, X } from 'lucide-react'
import type {
  CreateSubscriptionPlanPayload,
  QuotaType,
  SubscriptionPlan,
  SubscriptionPlanPeriod,
  UpdateSubscriptionPlanPayload,
} from '../types'
import { QUOTA_LABELS, QUOTA_TYPES } from '../types'

// Cho các ô số lớn (giá, hạn mức) -- lưu trong form state dưới dạng số thuần không dấu phẩy,
// chỉ định dạng lại lúc hiển thị để dễ đọc/dễ nhập (vd "1,000,000"). Input phải đổi sang
// type="text" vì type="number" của trình duyệt không cho phép hiện dấu phẩy.
function formatThousands(value: string): string {
  if (!value) {
    return value
  }
  const [integerPart, decimalPart] = value.split('.')
  const formattedInteger = integerPart === '' ? '' : Number(integerPart || '0').toLocaleString('en-US')
  return decimalPart !== undefined ? `${formattedInteger}.${decimalPart}` : formattedInteger
}

// Lọc ký tự gõ vào chỉ còn chữ số + tối đa 1 dấu chấm thập phân (bỏ dấu phẩy vừa hiện, bỏ chữ/ký
// tự khác) -- phải tự lọc vì input giờ là type="text", trình duyệt không còn tự chặn giúp.
function sanitizeNumericInput(value: string): string {
  const digitsAndDots = value.replace(/,/g, '').replace(/[^0-9.]/g, '')
  const firstDotIndex = digitsAndDots.indexOf('.')
  if (firstDotIndex === -1) {
    return digitsAndDots
  }
  return digitsAndDots.slice(0, firstDotIndex + 1) + digitsAndDots.slice(firstDotIndex + 1).replace(/\./g, '')
}

const QUOTA_ICONS: Record<QuotaType, typeof FileCheck2> = {
  EXAM: FileCheck2,
  PRACTICE: Headphones,
}

const PERIOD_OPTIONS: Array<{ label: string; value: SubscriptionPlanPeriod }> = [
  { label: 'Ngày', value: 'DAY' },
  { label: 'Tháng', value: 'MONTH' },
  { label: 'Năm', value: 'YEAR' },
]

// school_subscription_quota_records.total_allocated_amount_vnd là numeric(18,6) -- chặn ở đây thay vì
// để BE trả "numeric field overflow" khó hiểu.
const MAX_QUOTA_AMOUNT_VND = 1_000_000_000_000

type PlanEditorDrawerProps = {
  errorMessage?: string
  isOpen: boolean
  isSubmitting: boolean
  onClose: () => void
  onCreate: (payload: CreateSubscriptionPlanPayload) => void
  onUpdate: (id: string, payload: UpdateSubscriptionPlanPayload) => void
  plan: SubscriptionPlan | null
  // Điền sẵn giá/chu kỳ khi mở form từ luồng "tạo gói thay thế" -- bỏ qua khi đang sửa (plan != null).
  prefillPeriodCount?: number | null
  prefillPeriodType?: SubscriptionPlanPeriod | null
  prefillPriceVnd?: number | null
}

type QuotaFormState = Record<QuotaType, { includedAmountVnd: string }>

type FormState = {
  maxTimePerAttemptMin: string
  name: string
  periodCount: string
  periodType: SubscriptionPlanPeriod
  priceVnd: string
  quotas: QuotaFormState
  tagline: string
}

function emptyQuotas(): QuotaFormState {
  return {
    EXAM: { includedAmountVnd: '' },
    PRACTICE: { includedAmountVnd: '' },
  }
}

function createFormState(
  plan: SubscriptionPlan | null,
  prefillPriceVnd?: number | null,
  prefillPeriodType?: SubscriptionPlanPeriod | null,
  prefillPeriodCount?: number | null,
): FormState {
  if (!plan) {
    return {
      maxTimePerAttemptMin: '',
      name: '',
      periodCount: prefillPeriodCount != null ? String(prefillPeriodCount) : '1',
      periodType: prefillPeriodType ?? 'YEAR',
      priceVnd: prefillPriceVnd != null ? String(prefillPriceVnd) : '',
      quotas: emptyQuotas(),
      tagline: '',
    }
  }

  const quotas = emptyQuotas()
  for (const quota of plan.quotas) {
    quotas[quota.quotaType] = { includedAmountVnd: String(quota.includedAmountVnd) }
  }

  return {
    maxTimePerAttemptMin: plan.maxTimePerAttemptMin != null ? String(plan.maxTimePerAttemptMin) : '',
    name: plan.name,
    periodCount: String(plan.periodCount),
    periodType: plan.periodType,
    priceVnd: String(plan.priceVnd),
    quotas,
    tagline: plan.tagline ?? '',
  }
}

function validate(form: FormState) {
  if (!form.name.trim()) {
    return 'Tên gói không được để trống.'
  }

  // BE đòi tagline NOT NULL (subscription_plans.tagline) -- chặn ở đây để không nhận lỗi 500 khó đọc.
  if (!form.tagline.trim()) {
    return 'Mô tả ngắn không được để trống.'
  }

  if (!form.priceVnd || Number(form.priceVnd) <= 0) {
    return 'Giá gói phải lớn hơn 0.'
  }

  if (!form.periodCount || Number(form.periodCount) <= 0) {
    return 'Số chu kỳ phải lớn hơn 0.'
  }

  if (!form.maxTimePerAttemptMin || Number(form.maxTimePerAttemptMin) <= 0) {
    return 'Thời gian tối đa mỗi bài phải lớn hơn 0.'
  }

  for (const quotaType of QUOTA_TYPES) {
    const quota = form.quotas[quotaType]
    if (quota.includedAmountVnd === '' || Number(quota.includedAmountVnd) < 0) {
      return `Hạn mức "${QUOTA_LABELS[quotaType]}" không hợp lệ.`
    }
    if (Number(quota.includedAmountVnd) >= MAX_QUOTA_AMOUNT_VND) {
      return `Hạn mức "${QUOTA_LABELS[quotaType]}" vượt quá giới hạn cho phép.`
    }
  }

  return null
}

function toPayload(form: FormState): CreateSubscriptionPlanPayload {
  return {
    maxTimePerAttemptMin: Number(form.maxTimePerAttemptMin),
    name: form.name.trim(),
    periodCount: Number(form.periodCount),
    periodType: form.periodType,
    priceVnd: Number(form.priceVnd),
    quotas: QUOTA_TYPES.map((quotaType) => ({
      includedAmountVnd: Number(form.quotas[quotaType].includedAmountVnd),
      quotaType,
    })),
    tagline: form.tagline.trim(),
  }
}

// KHÔNG gồm periodType: cột period_type ở BE là updatable = false (UpdateSubscriptionPlanInput không
// khai field này) -- gửi kèm sẽ bị GraphQL từ chối "field name 'periodType' is not defined".
function toUpdatePayload(form: FormState): UpdateSubscriptionPlanPayload {
  return {
    maxTimePerAttemptMin: Number(form.maxTimePerAttemptMin),
    name: form.name.trim(),
    periodCount: Number(form.periodCount),
    priceVnd: Number(form.priceVnd),
    quotas: QUOTA_TYPES.map((quotaType) => ({
      includedAmountVnd: Number(form.quotas[quotaType].includedAmountVnd),
      quotaType,
    })),
    tagline: form.tagline.trim(),
  }
}

const inputClassName =
  'h-11 rounded-lg border border-slate-200 px-3 text-sm font-medium text-blue-950 outline-none transition placeholder:text-slate-400 focus:border-indigo-500 focus:ring-4 focus:ring-indigo-100 disabled:cursor-not-allowed disabled:bg-slate-50'

export function PlanEditorDrawer({
  errorMessage,
  isOpen,
  isSubmitting,
  onClose,
  onCreate,
  onUpdate,
  plan,
  prefillPeriodCount,
  prefillPeriodType,
  prefillPriceVnd,
}: PlanEditorDrawerProps) {
  const [form, setForm] = useState<FormState>(() =>
    createFormState(plan, prefillPriceVnd, prefillPeriodType, prefillPeriodCount),
  )
  const [validationMessage, setValidationMessage] = useState<string | null>(null)
  const isEditMode = Boolean(plan)
  const isPrefilled = !isEditMode && prefillPriceVnd != null

  if (!isOpen) {
    return null
  }

  function updateField<K extends keyof FormState>(name: K, value: FormState[K]) {
    setForm((current) => ({ ...current, [name]: value }))
    setValidationMessage(null)
  }

  function updateQuota(quotaType: QuotaType, value: string) {
    setForm((current) => ({
      ...current,
      quotas: {
        ...current.quotas,
        [quotaType]: { includedAmountVnd: value },
      },
    }))
    setValidationMessage(null)
  }

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()

    const validationError = validate(form)
    if (validationError) {
      setValidationMessage(validationError)
      return
    }

    if (isEditMode && plan) {
      onUpdate(plan.id, toUpdatePayload(form))
      return
    }

    onCreate(toPayload(form))
  }

  return (
    <div className="fixed inset-0 z-50 overflow-hidden">
      <button
        aria-label="Đóng biểu mẫu gói bằng lớp phủ"
        className="absolute inset-0 bg-slate-950/45"
        onClick={onClose}
        type="button"
      />
      <aside
        aria-labelledby="plan-editor-title"
        aria-modal="true"
        className="absolute right-0 top-0 flex h-full w-full max-w-lg flex-col overflow-hidden bg-white shadow-2xl shadow-slate-950/20"
        role="dialog"
      >
        <header className="flex items-start justify-between gap-4 border-b border-slate-200 px-6 py-5">
          <div className="min-w-0">
            <h2 className="text-lg font-black text-blue-950" id="plan-editor-title">
              {isEditMode ? 'Chỉnh sửa gói' : 'Tạo gói mới'}
            </h2>
            <p className="mt-1 text-sm font-medium text-slate-500">Định nghĩa giá, chu kỳ và hạn mức của gói.</p>
          </div>
          <button
            aria-label="Đóng biểu mẫu gói"
            className="inline-flex size-9 shrink-0 items-center justify-center rounded-lg border border-slate-200 text-slate-500 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-60"
            disabled={isSubmitting}
            onClick={onClose}
            type="button"
          >
            <X aria-hidden="true" className="size-4" />
          </button>
        </header>

        <div className="min-h-0 flex-1 overflow-y-auto px-6 py-6">
          <form className="grid gap-5" id="plan-editor-form" onSubmit={handleSubmit}>
            <label className="grid gap-2 text-sm font-bold text-blue-950">
              Tên gói <span className="text-red-500">*</span>
              <input
                className={inputClassName}
                disabled={isSubmitting}
                onChange={(event) => updateField('name', event.target.value)}
                placeholder="VD: Tiêu chuẩn"
                value={form.name}
              />
            </label>

            <label className="grid gap-2 text-sm font-bold text-blue-950">
              Mô tả ngắn <span className="text-red-500">*</span>
              <input
                className={inputClassName}
                disabled={isSubmitting}
                onChange={(event) => updateField('tagline', event.target.value)}
                placeholder="Phù hợp với..."
                value={form.tagline}
              />
            </label>

            <label className="grid gap-2 text-sm font-bold text-blue-950">
              Giá (VND) <span className="text-red-500">*</span>
              <input
                className={inputClassName}
                disabled={isSubmitting}
                inputMode="decimal"
                onChange={(event) => updateField('priceVnd', sanitizeNumericInput(event.target.value))}
                placeholder="24,000,000"
                type="text"
                value={formatThousands(form.priceVnd)}
              />
            </label>

            {/* Chu kỳ = periodCount x periodType, thay cho validityDays cũ. Gói tính theo tháng/năm thì
                hạn phải rơi đúng ngày tương ứng — cộng thô theo số ngày sẽ lệch dần qua từng lần gia hạn. */}
            <div className="grid grid-cols-2 gap-4">
              <label className="grid gap-2 text-sm font-bold text-blue-950">
                Số chu kỳ <span className="text-red-500">*</span>
                <input
                  className={inputClassName}
                  disabled={isSubmitting}
                  min={1}
                  onChange={(event) => updateField('periodCount', event.target.value)}
                  placeholder="1"
                  type="number"
                  value={form.periodCount}
                />
              </label>
              <label className="grid gap-2 text-sm font-bold text-blue-950">
                Đơn vị chu kỳ <span className="text-red-500">*</span>
                <select
                  className={inputClassName}
                  disabled={isSubmitting || isEditMode}
                  onChange={(event) => updateField('periodType', event.target.value as SubscriptionPlanPeriod)}
                  value={form.periodType}
                >
                  {PERIOD_OPTIONS.map((option) => (
                    <option key={option.value} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </select>
              </label>
            </div>

            {isEditMode ? (
              <p className="-mt-3 text-xs font-medium text-slate-500">
                Đơn vị chu kỳ không thể đổi sau khi tạo gói — tạo gói mới nếu cần đổi.
              </p>
            ) : null}

            {isPrefilled ? (
              <p className="-mt-3 text-xs font-medium text-indigo-600">
                Giá và chu kỳ đã điền sẵn theo gói bạn chọn — có thể sửa lại nếu muốn khác. Gói mới ở trạng thái
                nháp; bạn cần tự xuất bản khi sẵn sàng.
              </p>
            ) : null}

            <label className="grid gap-2 text-sm font-bold text-blue-950">
              Thời gian tối đa mỗi bài (phút) <span className="text-red-500">*</span>
              <input
                className={inputClassName}
                disabled={isSubmitting}
                min={1}
                onChange={(event) => updateField('maxTimePerAttemptMin', event.target.value)}
                placeholder="15"
                type="number"
                value={form.maxTimePerAttemptMin}
              />
            </label>

            <div className="border-t border-slate-200 pt-4">
              <p className="text-sm font-black text-blue-950">Hạn mức đi kèm gói</p>
              <p className="mt-1 text-xs text-slate-500">
                Hai ví tiêu tách riêng, tính bằng VND. Tiêu hết ví này không đụng tới ví kia; phần dùng vượt định
                mức trừ thẳng vào số dư trường tự nạp.
              </p>
              <div className="mt-4 grid gap-4">
                {QUOTA_TYPES.map((quotaType) => {
                  const Icon = QUOTA_ICONS[quotaType]
                  return (
                    <div className="rounded-lg border border-slate-200 p-4" key={quotaType}>
                      <p className="flex items-center gap-2 text-sm font-bold text-blue-950">
                        <Icon aria-hidden="true" className="size-4 text-indigo-600" />
                        {QUOTA_LABELS[quotaType]}
                      </p>
                      <div className="mt-3">
                        <label className="grid gap-1.5 text-xs font-bold text-slate-600">
                          Hạn mức bao gồm (VND)
                          <input
                            className={inputClassName}
                            disabled={isSubmitting}
                            inputMode="decimal"
                            onChange={(event) => updateQuota(quotaType, sanitizeNumericInput(event.target.value))}
                            placeholder="16,000,000"
                            type="text"
                            value={formatThousands(form.quotas[quotaType].includedAmountVnd)}
                          />
                        </label>
                      </div>
                    </div>
                  )
                })}
              </div>
            </div>

            {validationMessage ? (
              <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm font-semibold text-red-700" role="alert">
                {validationMessage}
              </div>
            ) : null}

            {errorMessage ? (
              <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm font-semibold text-red-700" role="alert">
                {errorMessage}
              </div>
            ) : null}
          </form>
        </div>

        <footer className="flex items-center justify-end gap-3 border-t border-slate-200 px-6 py-4">
          <button
            className="inline-flex h-10 items-center justify-center rounded-lg border border-slate-200 bg-white px-4 text-sm font-bold text-slate-700 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-60"
            disabled={isSubmitting}
            onClick={onClose}
            type="button"
          >
            Hủy
          </button>
          <button
            className="inline-flex h-10 items-center justify-center rounded-lg bg-indigo-600 px-4 text-sm font-black text-white transition hover:bg-indigo-700 disabled:cursor-not-allowed disabled:opacity-60"
            disabled={isSubmitting}
            form="plan-editor-form"
            type="submit"
          >
            {isSubmitting ? 'Đang lưu...' : isEditMode ? 'Lưu thay đổi' : 'Tạo gói'}
          </button>
        </footer>
      </aside>
    </div>
  )
}
