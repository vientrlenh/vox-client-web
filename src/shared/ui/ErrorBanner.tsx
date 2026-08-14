import { AlertCircle } from 'lucide-react'

type ErrorBannerProps = {
  className?: string
  message: string | null
}

/**
 * Báo lỗi nằm trong luồng nội dung — anh em đỏ của {@link WarningBanner}.
 *
 * <p>Dùng cho lỗi cần người dùng đọc rồi sửa (validate form, lỗi API khi submit): nó ở lại tới khi
 * lỗi được xử lý, khác {@link FeedbackToast} vốn nổi ở góc màn hình và tự tắt sau vài giây — kiểu
 * đó hợp với thông báo thành công hơn là với lỗi mà người dùng phải thao tác lại.
 */
export function ErrorBanner({ className, message }: ErrorBannerProps) {
  if (!message) {
    return null
  }

  return (
    <div
      className={[
        'flex items-start gap-3 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700',
        className,
      ]
        .filter(Boolean)
        .join(' ')}
      role="alert"
    >
      <div className="mt-0.5 flex size-8 shrink-0 items-center justify-center rounded-full border border-red-300 bg-red-100 text-red-700">
        <AlertCircle aria-hidden="true" className="size-4" />
      </div>
      <div className="flex-1 whitespace-pre-line font-semibold">{message}</div>
    </div>
  )
}
