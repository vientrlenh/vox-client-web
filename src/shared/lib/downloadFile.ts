/**
 * Tải một `Blob` về máy người dùng.
 *
 * Trình duyệt không có API "lưu file" nào khác ngoài việc dựng một thẻ `<a download>` rồi
 * tự bấm vào nó — nên đoạn này trông thủ công là đúng, không phải thiếu thư viện.
 *
 * `revokeObjectURL` bắt buộc phải gọi: mỗi `createObjectURL` giữ nguyên blob trong bộ nhớ
 * cho tới khi tab đóng, và bảng điểm một kỳ thi không phải là thứ nhẹ.
 */
export function downloadBlob(blob: Blob, fileName: string) {
  const url = URL.createObjectURL(blob)
  const anchor = document.createElement('a')
  anchor.download = fileName
  anchor.href = url
  document.body.appendChild(anchor)
  anchor.click()
  anchor.remove()
  URL.revokeObjectURL(url)
}

/**
 * Lấy tên file BE đặt trong header `Content-Disposition`.
 *
 * Tên file do BE quyết (có kèm dấu thời gian) nên hai lần xuất không ghi đè lên nhau trong
 * thư mục Downloads. `fallback` chỉ dùng khi header vắng mặt — proxy hoặc CORS có thể cắt
 * header này, và lúc đó vẫn phải tải được file.
 */
export function extractFileName(contentDisposition: unknown, fallback: string) {
  if (typeof contentDisposition !== 'string') {
    return fallback
  }

  const match = /filename="?([^"]+)"?/.exec(contentDisposition)
  return match?.[1] ?? fallback
}
