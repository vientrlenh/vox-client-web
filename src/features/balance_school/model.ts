import type { QuotaType } from '@/features/subscription_school/model'

/**
 * Ví tiền TỰ NẠP của trường -- KHÔNG phải hạn mức còn lại.
 *
 * Hạn mức kèm gói (SubscriptionQuotaRecord) tách theo từng QuotaType và được cấp lại mỗi kỳ; ví này
 * là MỘT con số, sống xuyên kỳ, và chỉ bị trừ khi hạn mức của loại tương ứng đã cạn. Gộp hai con số
 * làm một là âm thầm xoá mất giới hạn theo loại.
 */
export type SchoolBalance = {
  schoolId: string
  /** Chuỗi thập phân, không phải number -- xem ghi chú về tiền tệ bên dưới. Âm = đang nợ. */
  balanceVnd: string
  /**
   * balanceVnd < 0. Backend trả sẵn thay vì để client tự so với 0: đây đúng là luật mà
   * SchoolSubscriptionDebtGuardService dùng để chặn mở ca thi, và một luật chỉ nên có một nơi định nghĩa.
   */
  locked: boolean
  updatedAt: string | null
}

export type BalanceEntryType = 'TOP_UP' | 'OVERAGE_CHARGE' | 'REFUND' | 'ADJUSTMENT' | 'ALLOCATION_DRAW'

export type SchoolBalanceEntry = {
  id: string
  entryType: BalanceEntryType
  amountVnd: string
  /** Số dư NGAY SAU bút toán, lấy nguyên từ backend. Đừng cộng dồn amountVnd -- sổ có phân trang. */
  balanceAfterVnd: string
  occurredAt: string
  orderId: string | null
  examSessionId: string | null
  practiceSessionId: string | null
  quotaType: QuotaType | null
  costUsd: string | null
  fxRateUsed: string | null
  reason: string | null
  actorId: string | null
  /** ALLOCATION_DRAW: người được cấp/hạ hạn mức cá nhân. null với mọi loại còn lại. */
  targetUserId: string | null
}

export type SchoolBalanceEntryPage = {
  content: SchoolBalanceEntry[]
  page: number
  size: number
  totalElements: number
  totalPages: number
}

export type SchoolBalanceSummary = {
  creditedVnd: string
  overageChargedVnd: string
  adjustedVnd: string
}

export type DebtEventType = 'LOCKED' | 'CAP_EXCEEDED' | 'CLEARED'

export type SchoolDebtEvent = {
  id: string
  eventType: DebtEventType
  /** null với CLEARED: hết nợ là sự kiện cấp TRƯỜNG, không thuộc ví hạn mức nào. */
  quotaType: QuotaType | null
  /** LOCKED/CAP_EXCEEDED: đúng MỘT trong hai có giá trị. CLEARED: cả hai null. */
  triggerExamSessionId: string | null
  triggerPracticeSessionId: string | null
  triggerAmountVnd: string | null
  totalAllocatedVnd: string | null
  usedAmountVnd: string | null
  overageVnd: string
  occurredAt: string | null
}

export type SchoolDebtEventPage = {
  content: SchoolDebtEvent[]
  page: number
  size: number
  totalElements: number
  totalPages: number
}

export const BALANCE_ENTRY_LABELS: Record<BalanceEntryType, string> = {
  ADJUSTMENT: 'Điều chỉnh thủ công',
  ALLOCATION_DRAW: 'Cấp/hoàn hạn mức cá nhân',
  OVERAGE_CHARGE: 'Trừ vượt hạn mức',
  REFUND: 'Hoàn tiền',
  TOP_UP: 'Nạp thêm',
}

export const DEBT_EVENT_LABELS: Record<DebtEventType, string> = {
  CAP_EXCEEDED: 'Vượt trần cảnh báo',
  CLEARED: 'Hết nợ · trường mở khoá',
  LOCKED: 'Rơi vào nợ · trường bị khoá',
}

/**
 * TIỀN Ở FEATURE NÀY LÀ CHUỖI, không phải number -- và đó là chủ ý của backend.
 *
 * school_balances / school_balance_entries / school_debt_events đều là numeric(18,6), cố ý giữ 6 số
 * lẻ vì một lượt ôn luyện có thể chỉ tốn vài phần trăm đồng. 128440.95 không biểu diễn chính xác
 * được bằng double, mà đây lại đúng là chỗ con số phải khớp tuyệt đối. Backend gửi chuỗi thập phân
 * nguyên vẹn (BigDecimal.toPlainString), client chỉ đổi sang số ở bước HIỂN THỊ.
 *
 * Hai luật đi kèm: hiển thị tối đa 2 số lẻ, và TUYỆT ĐỐI không cộng dồn amountVnd để dựng lại số dư
 * -- balanceAfterVnd đã có sẵn chính là để không ai phải cộng.
 */
export function toNumber(value: string | null | undefined): number {
  if (value == null || value.trim() === '') {
    return 0
  }
  const parsed = Number(value)
  return Number.isFinite(parsed) ? parsed : 0
}

const VND_2DP = new Intl.NumberFormat('vi-VN', { maximumFractionDigits: 2, minimumFractionDigits: 2 })
const VND_0DP = new Intl.NumberFormat('vi-VN', { maximumFractionDigits: 0 })

/** Luôn 2 số lẻ. Dùng ở bảng và ô tổng, nơi các cột số phải thẳng hàng với nhau. */
export function formatVnd(value: string | null | undefined) {
  return `${VND_2DP.format(toNumber(value))} ₫`
}

/** Làm tròn về đồng nguyên. Chỉ dùng cho số tiền vốn KHÔNG có phần lẻ: hạn mức gói, số tiền nạp. */
export function formatVndWhole(value: number | string | null | undefined) {
  return `${VND_0DP.format(typeof value === 'number' ? value : toNumber(value))} ₫`
}

/**
 * Tách phần nguyên và phần lẻ để phần lẻ hiển thị nhỏ hơn.
 *
 * Số dư gần như không bao giờ tròn đồng, nhưng phần lẻ không phải thứ hiệu trưởng cần đọc -- nó chỉ
 * cần có mặt để khớp với sao kê.
 */
export function splitVnd(value: string | null | undefined) {
  const shown = VND_2DP.format(toNumber(value))
  const cut = shown.lastIndexOf(',')
  return cut < 0 ? { fraction: '', whole: shown } : { fraction: shown.slice(cut), whole: shown.slice(0, cut) }
}

export function formatDateTime(value: string | null | undefined) {
  if (!value) {
    return '—'
  }
  const date = new Date(value)
  return Number.isNaN(date.getTime())
    ? '—'
    : date.toLocaleString('vi-VN', { day: '2-digit', hour: '2-digit', minute: '2-digit', month: '2-digit', year: 'numeric' })
}

export function formatDate(value: string | null | undefined) {
  if (!value) {
    return '—'
  }
  const date = new Date(value)
  return Number.isNaN(date.getTime())
    ? '—'
    : date.toLocaleDateString('vi-VN', { day: '2-digit', month: '2-digit', year: 'numeric' })
}

/** Rút gọn UUID cho nhãn tra cứu -- đủ để đối chiếu với hỗ trợ, không chiếm hết dòng. */
export function shortId(value: string | null | undefined) {
  return value ? `#${value.slice(0, 8)}` : ''
}

export const DEFAULT_TOP_UP_AMOUNTS = [1_000_000, 2_000_000, 5_000_000, 10_000_000]
