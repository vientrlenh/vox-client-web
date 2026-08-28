import { useState } from 'react'
import { AlertTriangle, Archive, X } from 'lucide-react'
import { formatVnd, type SubscriptionPlan } from '../types'

type SelectOption = {
  label: string
  value: string
}

type ArchivePlanDialogProps = {
  activeSchoolCount: number
  isOpen: boolean
  isSubmitting: boolean
  onClose: () => void
  onConfirm: (replacedByPlanId: string | null) => void
  plan: SubscriptionPlan | null
  replacementOptions: SelectOption[]
}

export function ArchivePlanDialog({
  activeSchoolCount,
  isOpen,
  isSubmitting,
  onClose,
  onConfirm,
  plan,
  replacementOptions,
}: ArchivePlanDialogProps) {
  const [selection, setSelection] = useState('')

  if (!isOpen || !plan) {
    return null
  }

  const replacementRequired = activeSchoolCount > 0

  function handleClose() {
    setSelection('')
    onClose()
  }

  function handleConfirm() {
    onConfirm(selection || null)
    setSelection('')
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/45 px-4 py-6">
      <section
        aria-labelledby="archive-plan-dialog-title"
        aria-modal="true"
        className="w-full max-w-md rounded-2xl bg-white shadow-2xl"
        role="dialog"
      >
        <div className="flex items-start justify-between gap-4 border-b border-slate-200 px-6 py-5">
          <div className="flex min-w-0 items-start gap-3">
            <div className="mt-0.5 flex size-10 shrink-0 items-center justify-center rounded-full border border-amber-200 bg-amber-50 text-amber-700">
              <Archive aria-hidden="true" className="size-5" />
            </div>
            <div className="min-w-0">
              <h2 className="text-lg font-black text-blue-950" id="archive-plan-dialog-title">
                Lưu trữ gói dịch vụ
              </h2>
              <p className="mt-1 text-sm font-medium leading-6 text-slate-600">
                Gói <strong>{plan.name}</strong> sẽ được lưu trữ và không còn hiển thị cho trường đăng ký mới. Các
                trường đang dùng gói này không bị ảnh hưởng ngay, nhưng nếu không chọn gói thay thế, các trường sẽ
                không gia hạn được cho tới khi có gói thay thế. Giá của gói thay thế có thể khác gói hiện tại (
                {formatVnd(plan.pricePerYear)}) — trường vẫn sẽ được xem trước và xác nhận giá mới trước khi bị
                thu tiền ở lần gia hạn tới.
              </p>
            </div>
          </div>
          <button
            aria-label="Đóng hộp thoại"
            className="inline-flex size-9 shrink-0 items-center justify-center rounded-lg border border-slate-200 text-slate-500 transition hover:bg-slate-50"
            onClick={handleClose}
            type="button"
          >
            <X aria-hidden="true" className="size-4" />
          </button>
        </div>

        <div className="px-6 pt-5">
          {replacementRequired ? (
            <div className="mb-4 flex items-start gap-2.5 rounded-lg border border-amber-200 bg-amber-50 px-3.5 py-3 text-xs font-semibold text-amber-800">
              <AlertTriangle aria-hidden="true" className="mt-0.5 size-4 shrink-0" />
              <span>
                Đang có <strong>{activeSchoolCount}</strong> trường sử dụng gói này — bắt buộc chọn gói thay thế
                trước khi lưu trữ.
              </span>
            </div>
          ) : null}

          <label className="grid gap-2 text-sm font-semibold text-slate-700">
            <span>
              Gói thay thế khi trường gia hạn {replacementRequired ? <span className="text-red-500">*</span> : '(không bắt buộc)'}
            </span>
            <select
              className="h-10 rounded-xl border border-slate-200 px-3 text-sm text-slate-900 outline-none transition focus:border-indigo-400 focus:ring-4 focus:ring-indigo-50"
              onChange={(event) => setSelection(event.target.value)}
              value={selection}
            >
              <option value="">
                {replacementOptions.length === 0
                  ? 'Chưa có gói nào cùng giá đang hoạt động — chặn gia hạn cho tới khi có gói thay thế'
                  : 'Không chọn — chặn gia hạn cho tới khi có gói thay thế'}
              </option>
              {replacementOptions.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </label>
        </div>

        <div className="flex flex-col-reverse gap-3 px-6 py-5 sm:flex-row sm:justify-end">
          <button
            className="inline-flex h-10 items-center justify-center rounded-lg border border-slate-200 bg-white px-4 text-sm font-bold text-slate-700 transition hover:bg-slate-50"
            disabled={isSubmitting}
            onClick={handleClose}
            type="button"
          >
            Không
          </button>
          <button
            className="inline-flex h-10 items-center justify-center gap-2 rounded-lg bg-indigo-600 px-4 text-sm font-black text-white transition hover:bg-indigo-700 disabled:cursor-not-allowed disabled:opacity-60"
            disabled={isSubmitting || (replacementRequired && !selection)}
            onClick={handleConfirm}
            type="button"
          >
            {isSubmitting ? 'Đang lưu trữ...' : 'Lưu trữ'}
          </button>
        </div>
      </section>
    </div>
  )
}
