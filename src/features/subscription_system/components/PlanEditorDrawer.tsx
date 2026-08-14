import type { FormEvent } from 'react'
import { useState } from 'react'
import { Check, ClipboardList, FileCheck2, Headphones, X } from 'lucide-react'
import { useQuotaPricingQuery } from '../api/useQuotaPricingQuery'
import type { CreatePlanPayload, QuotaType, SubscriptionPlan } from '../types'
import { QUOTA_LABELS, QUOTA_TYPES, formatVnd } from '../types'

const DEFAULT_SERVICE_FEE_RATIO_PERCENT = '20'

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
  CLASS_TEST: ClipboardList,
  GRADING: FileCheck2,
  PRACTICE: Headphones,
}

type PlanEditorDrawerProps = {
  errorMessage?: string
  isOpen: boolean
  isSubmitting: boolean
  onClose: () => void
  onCreate: (payload: CreatePlanPayload) => void
  onUpdate: (id: string, payload: CreatePlanPayload) => void
  plan: SubscriptionPlan | null
}

type QuotaFormState = Record<QuotaType, { includedQuantity: string }>

type FormState = {
  maxTimePerAttemptMin: string
  name: string
  pricePerYear: string
  quotas: QuotaFormState
  serviceFeeRatioPercent: string
  tagline: string
  validityDays: string
}

function emptyQuotas(): QuotaFormState {
  return {
    CLASS_TEST: { includedQuantity: '' },
    GRADING: { includedQuantity: '' },
    PRACTICE: { includedQuantity: '' },
  }
}

function createFormState(plan: SubscriptionPlan | null): FormState {
  if (!plan) {
    return {
      maxTimePerAttemptMin: '',
      name: '',
      pricePerYear: '',
      quotas: emptyQuotas(),
      serviceFeeRatioPercent: DEFAULT_SERVICE_FEE_RATIO_PERCENT,
      tagline: '',
      validityDays: '365',
    }
  }

  const quotas = emptyQuotas()
  for (const quota of plan.quotas) {
    quotas[quota.quotaType] = {
      includedQuantity: String(quota.includedQuantity),
    }
  }

  return {
    maxTimePerAttemptMin: plan.maxTimePerAttemptMin != null ? String(plan.maxTimePerAttemptMin) : '',
    name: plan.name,
    pricePerYear: String(plan.pricePerYear),
    quotas,
    serviceFeeRatioPercent: String(Math.round(plan.serviceFeeRatio * 100 * 100) / 100),
    tagline: plan.tagline ?? '',
    validityDays: String(plan.validityDays),
  }
}

function validate(form: FormState) {
  if (!form.name.trim()) {
    return 'Tên gói không được để trống.'
  }

  if (!form.pricePerYear || Number(form.pricePerYear) <= 0) {
    return 'Giá gói phải lớn hơn 0.'
  }

  if (!form.validityDays || Number(form.validityDays) <= 0) {
    return 'Thời hạn gói (ngày) phải lớn hơn 0.'
  }

  if (form.serviceFeeRatioPercent === '' || Number(form.serviceFeeRatioPercent) < 0) {
    return 'Phí dịch vụ (%) không được để trống.'
  }

  for (const quotaType of QUOTA_TYPES) {
    const quota = form.quotas[quotaType]
    if (quota.includedQuantity === '' || Number(quota.includedQuantity) < 0) {
      return `Hạn mức "${QUOTA_LABELS[quotaType]}" không hợp lệ.`
    }
    // plan_quota.included_quantity là numeric(18,6) ở DB -- chặn ở đây thay vì để BE trả lỗi
    // tràn số (numeric field overflow) khó hiểu.
    if (Number(quota.includedQuantity) >= 1_000_000_000_000) {
      return `Hạn mức "${QUOTA_LABELS[quotaType]}" vượt quá giới hạn cho phép (tối đa 999,999,999,999 USD).`
    }
  }

  return null
}

function toPayload(form: FormState): CreatePlanPayload {
  return {
    maxTimePerAttemptMin: form.maxTimePerAttemptMin ? Number(form.maxTimePerAttemptMin) : null,
    name: form.name.trim(),
    pricePerYear: Number(form.pricePerYear),
    // FE nhập % (vd 20), BE lưu tỉ lệ (0.20) -- xem QuotaSellingPriceProperties/SubscriptionPlan.serviceFeeRatio.
    serviceFeeRatio: Number(form.serviceFeeRatioPercent) / 100,
    quotas: QUOTA_TYPES.map((quotaType) => ({
      includedQuantity: Number(form.quotas[quotaType].includedQuantity),
      quotaType,
    })),
    tagline: form.tagline.trim() || null,
    validityDays: Number(form.validityDays),
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
}: PlanEditorDrawerProps) {
  const [form, setForm] = useState<FormState>(() => createFormState(plan))
  const [validationMessage, setValidationMessage] = useState<string | null>(null)
  const isEditMode = Boolean(plan)
  const { data: quotaPricing } = useQuotaPricingQuery()
  const serviceFeeRatioPercentNumber = Number(form.serviceFeeRatioPercent)
  // BE tự tính đúng công thức này khi lưu gói (QuotaPricingService.tokenUnitPriceFor) -- ở đây chỉ
  // hiện trước cho admin xem, không gửi lên BE.
  const suggestedTokenUnitPriceVnd =
    quotaPricing && !Number.isNaN(serviceFeeRatioPercentNumber)
      ? quotaPricing.usdToVndRate * (1 + serviceFeeRatioPercentNumber / 100)
      : null

  if (!isOpen) {
    return null
  }

  function updateField<K extends keyof FormState>(name: K, value: FormState[K]) {
    setForm((current) => ({ ...current, [name]: value }))
    setValidationMessage(null)
  }

  function updateQuota(quotaType: QuotaType, field: 'includedQuantity', value: string) {
    setForm((current) => ({
      ...current,
      quotas: {
        ...current.quotas,
        [quotaType]: { ...current.quotas[quotaType], [field]: value },
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

    const payload = toPayload(form)

    if (isEditMode && plan) {
      onUpdate(plan.id, payload)
      return
    }

    onCreate(payload)
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
            <p className="mt-1 text-sm font-medium text-slate-500">Định nghĩa giá, hạn mức và giá token mua thêm.</p>
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
              Mô tả ngắn
              <input
                className={inputClassName}
                disabled={isSubmitting}
                onChange={(event) => updateField('tagline', event.target.value)}
                placeholder="Phù hợp với..."
                value={form.tagline}
              />
            </label>

            <div className="grid grid-cols-2 gap-4">
              <label className="grid gap-2 text-sm font-bold text-blue-950">
                Giá / năm (VNĐ) <span className="text-red-500">*</span>
                <input
                  className={inputClassName}
                  disabled={isSubmitting}
                  inputMode="decimal"
                  onChange={(event) => updateField('pricePerYear', sanitizeNumericInput(event.target.value))}
                  placeholder="45,000,000"
                  type="text"
                  value={formatThousands(form.pricePerYear)}
                />
              </label>
              <label className="grid gap-2 text-sm font-bold text-blue-950">
                Thời hạn (ngày) <span className="text-red-500">*</span>
                <input
                  className={inputClassName}
                  disabled={isSubmitting}
                  min={1}
                  onChange={(event) => updateField('validityDays', event.target.value)}
                  placeholder="365"
                  type="number"
                  value={form.validityDays}
                />
              </label>
            </div>

            <div>
              <label className="grid gap-2 text-sm font-bold text-blue-950">
                Thời gian tối đa mỗi bài (phút)
                <input
                  className={inputClassName}
                  disabled={isSubmitting}
                  min={0}
                  onChange={(event) => updateField('maxTimePerAttemptMin', event.target.value)}
                  placeholder="60"
                  type="number"
                  value={form.maxTimePerAttemptMin}
                />
              </label>
            </div>

            <div>
              <label className="grid gap-2 text-sm font-bold text-blue-950">
                Phí dịch vụ (%) <span className="text-red-500">*</span>
                <input
                  className={inputClassName}
                  disabled={isSubmitting}
                  min={0}
                  onChange={(event) => updateField('serviceFeeRatioPercent', event.target.value)}
                  placeholder="20"
                  step="0.1"
                  type="number"
                  value={form.serviceFeeRatioPercent}
                />
              </label>
              {suggestedTokenUnitPriceVnd != null ? (
                <p className="mt-1.5 text-xs font-medium text-slate-500">
                  Giá áp dụng cho mỗi $1 hạn mức: <span className="font-bold text-indigo-600">{formatVnd(suggestedTokenUnitPriceVnd)}</span> (tỷ giá{' '}
                  {formatVnd(quotaPricing?.usdToVndRate)}/$ × margin) — BE tự tính khi lưu gói, không nhập tay.
                </p>
              ) : null}
            </div>

            <div className="border-t border-slate-200 pt-4">
              <p className="text-sm font-black text-blue-950">Hạn mức &amp; giá mua thêm</p>
              <p className="mt-1 text-xs text-slate-500">
                Hạn mức tính theo USD chi phí AI ước tính được tặng miễn phí mỗi chu kỳ; giá áp dụng khi trường dùng vượt hạn mức
                được BE tự tính theo tỷ giá + phí dịch vụ ở trên.
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
                          Hạn mức bao gồm (USD)
                          <input
                            className={inputClassName}
                            disabled={isSubmitting}
                            inputMode="decimal"
                            onChange={(event) =>
                              updateQuota(quotaType, 'includedQuantity', sanitizeNumericInput(event.target.value))
                            }
                            placeholder="1,000"
                            type="text"
                            value={formatThousands(form.quotas[quotaType].includedQuantity)}
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

        <div className="flex gap-3 border-t border-slate-200 px-6 py-5">
          <button
            className="flex-1 inline-flex h-11 items-center justify-center rounded-lg border border-slate-200 bg-white text-sm font-bold text-slate-700 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-60"
            disabled={isSubmitting}
            onClick={onClose}
            type="button"
          >
            Hủy
          </button>
          <button
            className="flex-1 inline-flex h-11 items-center justify-center gap-2 rounded-lg bg-indigo-600 text-sm font-black text-white transition hover:bg-indigo-700 disabled:cursor-not-allowed disabled:opacity-60"
            disabled={isSubmitting}
            form="plan-editor-form"
            type="submit"
          >
            <Check aria-hidden="true" className="size-4" />
            {isSubmitting ? 'Đang lưu...' : 'Lưu gói'}
          </button>
        </div>
      </aside>
    </div>
  )
}
