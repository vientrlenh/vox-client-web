import { useState, type ReactNode } from 'react'

/**
 * Ảnh đại diện, tự lùi về ô chữ cái khi không có ảnh.
 *
 * Gom từ bốn bản sao giống hệt nhau trong app/layouts -- chúng đều dựng sẵn ô chữ cái nhưng KHÔNG
 * bản nào đọc tới avatarUrl, nên người đã có ảnh vẫn chỉ thấy hai chữ trên thanh trên cùng.
 */

type AvatarProps = {
  /** Email dùng để suy ra chữ cái. Chỉ dùng khi không có ảnh và không truyền `fallback`. */
  email?: string | null
  /**
   * Đè TOÀN BỘ phần thay thế khi không có ảnh.
   *
   * Có mặt vì các danh sách chấm bài dùng ô chữ cái tô màu THEO TÊN (`avatarClasses` trả cả nền lẫn
   * màu chữ, ví dụ `bg-cyan-100 text-cyan-700`), không hợp với ô chữ trắng của thanh điều hướng.
   * Nhồi cả hai kiểu vào một bộ prop thì hỏng cả hai; để nơi gọi tự dựng thì phần đáng dùng chung
   * -- render ảnh và tự lùi khi ảnh hỏng -- vẫn nằm ở một chỗ.
   */
  fallback?: ReactNode
  /** Lớp nền cho ô chữ cái mặc định, khác nhau theo vai (indigo cho system admin, cyan cho còn lại). */
  fallbackClassName?: string
  /** Chữ hiện khi không có cả ảnh lẫn email. */
  fallbackInitials?: string
  sizeClassName?: string
  src?: string | null
}

/**
 * Giữ nguyên thuật toán của bốn bản cũ: lấy phần trước @, tách theo . _ -, ghép chữ đầu của tối đa
 * hai đoạn, và pad cho đủ hai ký tự bằng chữ đầu của email.
 */
function emailInitials(email?: string | null, fallback = 'U') {
  if (!email) {
    return fallback
  }

  return email
    .split('@')[0]
    .split(/[._-]/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0])
    .join('')
    .toUpperCase()
    .padEnd(2, email[0].toUpperCase())
    .slice(0, 2)
}

export function Avatar({
  email,
  fallback,
  fallbackClassName = 'bg-slate-600',
  fallbackInitials = 'U',
  sizeClassName = 'size-11',
  src,
}: AvatarProps) {
  // Lưu ĐÚNG url đã hỏng thay vì một cờ boolean: ảnh nằm ở kho ngoài (Firebase Storage) nên một
  // url có thể chết bất cứ lúc nào (object bị xoá, mạng lỗi) và khi đó <img> để lại cái icon vỡ
  // ngay trên thanh trên cùng của mọi trang. Lưu theo url thì đổi sang ảnh mới là tự thử lại,
  // không cần effect đồng bộ hay remount.
  const [failedSrc, setFailedSrc] = useState<string | null>(null)

  if (src && src !== failedSrc) {
    return (
      <img
        alt=""
        className={`${sizeClassName} shrink-0 rounded-full object-cover`}
        onError={() => setFailedSrc(src)}
        src={src}
      />
    )
  }

  if (fallback) {
    return <>{fallback}</>
  }

  return (
    <span
      className={`inline-flex ${sizeClassName} shrink-0 items-center justify-center rounded-full text-sm font-bold text-white ${fallbackClassName}`}
    >
      {emailInitials(email, fallbackInitials)}
    </span>
  )
}
