import type { PaymentLink } from './types'

/**
 * invoiceId của hóa đơn vừa được tạo link, lưu lại ngay trước khi rời trang sang cổng thanh toán.
 *
 * Phải tự lưu chứ không đọc lại được từ URL quay về: trang kết quả thanh toán cần invoiceId để đối
 * chiếu với danh sách hóa đơn tải từ BE, trong khi SePay redirect về success_url/error_url/cancel_url
 * trần không kèm tham số nào, còn PayOS chỉ gắn orderCode — mã riêng của PayOS, chỉ duy nhất trong
 * phạm vi cổng đó nên không tra ngược ra hóa đơn khi hệ thống có nhiều cổng.
 *
 * sessionStorage chứ không phải state trong bộ nhớ: cả hai cổng đều điều hướng full-page ra khỏi
 * ứng dụng, nên mọi state React đều mất trước khi người dùng quay lại.
 */
const PENDING_INVOICE_STORAGE_KEY = 'vox.payment.pendingInvoiceId'

export function rememberPendingInvoice(invoiceId: string) {
  try {
    sessionStorage.setItem(PENDING_INVOICE_STORAGE_KEY, invoiceId)
  } catch {
    // Trình duyệt có thể chặn sessionStorage (Safari private mode). Mất khả năng đối soát chủ động
    // ở trang kết quả là chấp nhận được: webhook và job đối soát định kỳ phía BE vẫn chốt hóa đơn.
  }
}

export function readPendingInvoice() {
  try {
    return sessionStorage.getItem(PENDING_INVOICE_STORAGE_KEY)
  } catch {
    return null
  }
}

export function clearPendingInvoice() {
  try {
    sessionStorage.removeItem(PENDING_INVOICE_STORAGE_KEY)
  } catch {
    // Xem ghi chú ở rememberPendingInvoice.
  }
}

/**
 * Đưa người dùng sang trang thanh toán của cổng. Rẽ nhánh theo {@code action} do BE trả về, không
 * theo tên cổng — đây là điểm mấu chốt để thêm cổng mới không phải sửa FE.
 */
export function goToCheckout(link: PaymentLink) {
  // Lưu trước khi điều hướng: sau lệnh submit/gán href thì không còn cơ hội chạy code nào nữa.
  rememberPendingInvoice(link.invoiceId)

  if (link.action === 'REDIRECT') {
    window.location.href = link.actionUrl
    return
  }

  submitCheckoutForm(link)
}

/**
 * SePay không tạo link riêng cho từng đơn: URL checkout là cố định, đơn hàng được mô tả bằng bộ
 * field kèm chữ ký HMAC nên phải POST chứ không GET được.
 */
function submitCheckoutForm(link: PaymentLink) {
  const form = document.createElement('form')
  form.method = 'POST'
  form.action = link.actionUrl
  form.style.display = 'none'

  // Object.entries giữ nguyên thứ tự chèn với key dạng chuỗi, và JSON.parse cũng dựng object theo
  // đúng thứ tự xuất hiện trong response — nên thứ tự mà BE đã ký được giữ nguyên tới đây. Tuyệt
  // đối không sort hay dựng lại object ở giữa đường, xem ghi chú ở PaymentLink.fields.
  for (const [name, value] of Object.entries(link.fields ?? {})) {
    const input = document.createElement('input')
    input.type = 'hidden'
    input.name = name
    input.value = value
    form.append(input)
  }

  document.body.append(form)
  form.submit()
}
