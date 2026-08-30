import { useEffect, useState } from 'react'
import { AlertTriangle, Check, X } from 'lucide-react'
import { useCancelOrderMutation } from '../api/useOrderMutations'
import { formatDateTime, formatVnd } from '../format'
import type { Order } from '../types'

type CancelOrderDialogProps = {
  onCancelled: () => void
  onClose: () => void
  order: Order
}

function getErrorMessage(error: unknown) {
  if (error && typeof error === 'object' && 'message' in error && typeof error.message === 'string') {
    return error.message
  }
  return undefined
}

/**
 * Hủy đơn có HAI kết cục, và kết cục xấu chỉ lộ ra sau khi bấm.
 *
 * CancelOrderUseCase từ chối khi cổng còn giữ một phiên thanh toán sống — với SePay là MỌI LẦN đã
 * phát mã, vì cổng không có API hủy phiên chưa trả. Nên hộp thoại này không hứa trước là hủy được;
 * nó nói rõ điều kiện, rồi hiện nguyên văn lời từ chối của backend kèm mốc đơn tự đóng.
 */
// Người gọi chỉ dựng component này KHI mở (xem OrderDetailPage), nên mỗi lần mở là một lần mount
// mới và state bắt đầu sạch — không cần effect nào để dọn lời từ chối của lần trước.
export function CancelOrderDialog({ onCancelled, onClose, order }: CancelOrderDialogProps) {
  const cancelMutation = useCancelOrderMutation()
  const [refusal, setRefusal] = useState<string | null>(null)

  useEffect(() => {
    function onKeyDown(event: KeyboardEvent) {
      if (event.key === 'Escape') {
        onClose()
      }
    }

    document.addEventListener('keydown', onKeyDown)
    return () => document.removeEventListener('keydown', onKeyDown)
  }, [onClose])

  async function handleConfirm() {
    try {
      await cancelMutation.mutateAsync(order.id)
      onCancelled()
    } catch (error) {
      setRefusal(getErrorMessage(error) ?? 'Không thể hủy đơn hàng.')
    }
  }

  const isRefused = refusal !== null

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center bg-slate-950/45 px-4 py-10">
      <section
        aria-labelledby="cancel-order-title"
        aria-modal="true"
        className="w-full max-w-lg rounded-2xl bg-white shadow-2xl"
        role="dialog"
      >
        <div className="flex items-start gap-3 border-b border-slate-200 px-5 py-5">
          <span
            className={`mt-0.5 inline-flex size-9.5 shrink-0 items-center justify-center rounded-full border ${
              isRefused ? 'border-red-200 bg-red-50 text-red-700' : 'border-amber-200 bg-amber-50 text-amber-700'
            }`}
          >
            <AlertTriangle aria-hidden="true" className="size-[19px]" />
          </span>
          <div className="min-w-0 flex-1">
            <h2 className="text-[17px] font-bold text-blue-950" id="cancel-order-title">
              {isRefused ? 'Chưa hủy được đơn này' : 'Hủy đơn hàng?'}
            </h2>
            <p className="mt-1 text-[12.5px] leading-snug text-slate-500">
              <span className="font-mono">#{order.id.slice(0, 8)}</span> · {order.description} ·{' '}
              <span className="tabular-nums">{formatVnd(order.totalAmountVnd)}</span>
            </p>
          </div>
          <button
            aria-label="Đóng hộp thoại"
            className="inline-flex size-8.5 shrink-0 items-center justify-center rounded-lg border border-slate-200 text-slate-500 transition hover:bg-slate-50 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-indigo-600"
            onClick={onClose}
            type="button"
          >
            <X aria-hidden="true" className="size-4" />
          </button>
        </div>

        <div className="flex flex-col gap-3.5 px-5 py-5">
          {isRefused ? (
            <>
              <p
                className="rounded-[10px] border border-red-200 bg-red-50 px-3.5 py-3 text-[13px] leading-relaxed text-red-800"
                role="alert"
              >
                {refusal}
              </p>
              <p className="text-[12.5px] leading-relaxed text-slate-600">
                Đơn tự đóng lúc{' '}
                <strong className="font-bold text-blue-950 tabular-nums">{formatDateTime(order.expiresAt)}</strong>. Tới
                lúc đó trường chưa đặt được đơn đăng ký mới — mỗi trường chỉ được có một đơn đang mở.
              </p>
            </>
          ) : (
            <>
              <p className="text-[13.5px] leading-relaxed text-slate-700">
                Đơn sẽ chuyển sang <strong className="font-bold">Đã hủy</strong> và không thu đồng nào. Trường có thể
                đặt đơn mới ngay sau đó.
              </p>
              <p className="flex items-start gap-2.5 rounded-[10px] border border-slate-200 bg-slate-50 px-3.5 py-3 text-[12.5px] leading-relaxed text-slate-600">
                <Check aria-hidden="true" className="mt-0.5 size-4 shrink-0 text-slate-400" />
                <span>
                  Chỉ hủy được khi chưa mở phiên thanh toán nào. Nếu đã bấm Thanh toán, cổng có thể không cho hủy sớm và
                  phải đợi đơn hết hạn.
                </span>
              </p>
            </>
          )}
        </div>

        <div className="flex flex-wrap justify-end gap-2.5 border-t border-slate-200 px-5 py-4">
          <button
            className="inline-flex h-10.5 items-center rounded-lg border border-slate-200 bg-white px-4 text-[13.5px] font-semibold text-slate-600 transition hover:bg-slate-50 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-indigo-600"
            onClick={onClose}
            type="button"
          >
            {isRefused ? 'Đóng' : 'Không'}
          </button>
          {isRefused ? null : (
            <button
              className="inline-flex h-10.5 items-center rounded-lg bg-rose-600 px-5 text-[13.5px] font-bold text-white transition hover:bg-rose-700 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-rose-600 disabled:cursor-not-allowed disabled:opacity-60"
              disabled={cancelMutation.isPending}
              onClick={() => void handleConfirm()}
              type="button"
            >
              {cancelMutation.isPending ? 'Đang hủy...' : 'Hủy đơn'}
            </button>
          )}
        </div>
      </section>
    </div>
  )
}
