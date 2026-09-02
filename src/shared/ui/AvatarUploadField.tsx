import { useEffect, useRef, useState } from 'react'
import { ImagePlus, Loader2, Trash2, UserRound } from 'lucide-react'
import { uploadFileToStorage } from '@/shared/firebase/uploadToStorage'

/**
 * Chọn ảnh -> tải thẳng lên Firebase Storage -> trả URL về cho form. Backend không bao giờ nhận
 * file, chỉ nhận đúng chuỗi URL này (xem AvatarUrlPolicy bên vox).
 *
 * LƯU Ý về nơi thực sự chặn: kiểu file và dung lượng kiểm ở đây CHỈ để báo lỗi sớm cho người dùng.
 * Vì client tải thẳng lên Storage, thứ duy nhất chặn được một file cố tình sai là Firebase Storage
 * Security Rules -- phải cấu hình giới hạn contentType/size ở đó, đừng tin phần kiểm dưới đây.
 *
 * Ảnh hiện ra NGAY khi chọn (blob cục bộ), không đợi tải lên xong: đường truyền của trường học có
 * thể mất vài giây cho một tấm 2MB, và trong khoảng đó form trông như không phản ứng gì.
 *
 * Blob cục bộ được ưu tiên hơn `value` khi hiển thị, nên nếu cha xóa `value` từ bên ngoài (reset
 * form) thì hãy REMOUNT bằng `key` chứ đừng chỉ đổi prop -- đó cũng là cách React khuyến nghị để
 * dọn state theo một giá trị đổi, và tránh phải đồng bộ prop vào state bằng effect.
 */

const ACCEPTED_TYPES = ['image/png', 'image/jpeg', 'image/webp']
const ACCEPT_ATTRIBUTE = ACCEPTED_TYPES.join(',')
const MAX_BYTES = 2 * 1024 * 1024

type AvatarUploadFieldProps = {
  disabled?: boolean
  /** Tên dùng cho alt và chữ cái thay thế khi chưa có ảnh. */
  name?: string
  onChange: (url: string | null) => void
  /** Thư mục trên Storage. Mặc định "avatars" -- xem chú thích ở SystemAdminCreateSchoolPage. */
  pathPrefix?: string
  value: string | null
}

export function AvatarUploadField({
  disabled = false,
  name,
  onChange,
  pathPrefix = 'avatars',
  value,
}: AvatarUploadFieldProps) {
  const [isUploading, setIsUploading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [localPreview, setLocalPreview] = useState<string | null>(null)
  const inputRef = useRef<HTMLInputElement>(null)
  // Giữ URL blob hiện tại ngoài state để cleanup lúc unmount không đọc phải closure cũ.
  const previewUrlRef = useRef<string | null>(null)

  /** Đổi preview và thu hồi cái cũ. MỌI thay đổi preview phải đi qua đây, nếu không là rò bộ nhớ. */
  function replacePreview(next: string | null) {
    if (previewUrlRef.current) {
      URL.revokeObjectURL(previewUrlRef.current)
    }
    previewUrlRef.current = next
    setLocalPreview(next)
  }

  useEffect(() => {
    return () => {
      if (previewUrlRef.current) {
        URL.revokeObjectURL(previewUrlRef.current)
      }
    }
  }, [])

  async function handleSelect(event: React.ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0]
    // Reset ngay: chọn lại ĐÚNG file vừa lỗi sẽ không bắn change nếu value còn nguyên.
    event.target.value = ''
    if (!file) return

    if (!ACCEPTED_TYPES.includes(file.type)) {
      setError('Ảnh đại diện chỉ hỗ trợ định dạng PNG, JPEG hoặc WEBP.')
      return
    }
    if (file.size > MAX_BYTES) {
      setError('Ảnh đại diện không được vượt quá 2MB.')
      return
    }

    setError(null)
    replacePreview(URL.createObjectURL(file))
    setIsUploading(true)
    try {
      const url = await uploadFileToStorage(
        file,
        `${pathPrefix}/${crypto.randomUUID()}/${file.name}`,
      )
      // CỐ Ý giữ nguyên blob đang hiển thị thay vì đổi src sang url vừa nhận: đổi sẽ bắt trình
      // duyệt tải lại đúng tấm ảnh đang nằm trên màn hình, kèm một nhịp nháy. url mới là thứ gửi đi.
      onChange(url)
    } catch {
      // Bỏ preview khi tải lên hỏng: để lại ảnh trên màn hình cạnh dòng báo lỗi thì người dùng
      // không thể biết ảnh đã lên hay chưa.
      replacePreview(null)
      setError('Tải ảnh lên thất bại. Vui lòng thử lại.')
    } finally {
      setIsUploading(false)
    }
  }

  const isBusy = disabled || isUploading
  const displaySrc = localPreview ?? value

  return (
    <div className="grid gap-2">
      <div className="flex items-center gap-4">
        <div className="relative size-16 shrink-0">
          {displaySrc ? (
            <img
              alt={name ? `Ảnh đại diện của ${name}` : 'Ảnh đại diện'}
              className="size-16 rounded-full border border-slate-200 object-cover"
              src={displaySrc}
            />
          ) : (
            <span className="inline-flex size-16 items-center justify-center rounded-full border border-dashed border-slate-300 bg-slate-50 text-slate-400">
              <UserRound aria-hidden="true" className="size-7" />
            </span>
          )}

          {/* Ảnh hiện ngay không được đọc thành "xong": lớp phủ này giữ trạng thái đang chạy. */}
          {isUploading ? (
            <span className="absolute inset-0 grid place-items-center rounded-full bg-slate-950/45">
              <Loader2 aria-hidden="true" className="size-5 animate-spin text-white" />
            </span>
          ) : null}
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <button
            className="inline-flex h-9 items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3 text-xs font-bold text-blue-950 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-60"
            disabled={isBusy}
            onClick={() => inputRef.current?.click()}
            type="button"
          >
            <ImagePlus aria-hidden="true" className="size-4" />
            {isUploading ? 'Đang tải lên…' : displaySrc ? 'Đổi ảnh' : 'Chọn ảnh'}
          </button>

          {displaySrc ? (
            <button
              className="inline-flex h-9 items-center gap-1.5 rounded-lg px-3 text-xs font-bold text-red-600 transition hover:bg-red-50 disabled:cursor-not-allowed disabled:opacity-60"
              disabled={isBusy}
              onClick={() => {
                setError(null)
                replacePreview(null)
                onChange(null)
              }}
              type="button"
            >
              <Trash2 aria-hidden="true" className="size-4" />
              Gỡ ảnh
            </button>
          ) : null}
        </div>

        <input
          accept={ACCEPT_ATTRIBUTE}
          className="sr-only"
          disabled={isBusy}
          onChange={handleSelect}
          ref={inputRef}
          type="file"
        />
      </div>

      {error ? (
        <p className="text-xs font-semibold text-red-600" role="alert">
          {error}
        </p>
      ) : (
        <p className="text-xs font-medium text-slate-500">PNG, JPEG hoặc WEBP, tối đa 2MB.</p>
      )}
    </div>
  )
}
