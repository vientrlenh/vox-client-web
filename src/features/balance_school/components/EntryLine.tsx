import { ArrowDown, ArrowRightLeft, ArrowUp, PenLine, RotateCcw } from 'lucide-react'
import { QUOTA_LABELS } from '@/features/subscription_school/model'
import { BALANCE_ENTRY_LABELS, shortId, type BalanceEntryType, type SchoolBalanceEntry } from '../model'

type EntryVisual = {
  amountClass: string
  badge: string
  bubble: string
  icon: typeof ArrowUp
  iconClass: string
}

export const ENTRY_VISUALS: Record<BalanceEntryType, EntryVisual> = {
  ADJUSTMENT: {
    amountClass: 'text-slate-600',
    badge: 'border-slate-200 bg-slate-100 text-slate-700',
    bubble: 'bg-slate-100',
    icon: PenLine,
    iconClass: 'text-slate-600',
  },
  OVERAGE_CHARGE: {
    amountClass: 'text-amber-700',
    badge: 'border-amber-200 bg-amber-50 text-amber-700',
    bubble: 'bg-amber-50',
    icon: ArrowDown,
    iconClass: 'text-amber-700',
  },
  // Mũi tên HAI CHIỀU, không phải mũi tên xuống như OVERAGE_CHARGE: đây là chuyển túi, không phải
  // tiêu mất. Màu sky để không đụng chip indigo của cột "Loại hạn mức" ngay bên cạnh.
  QUOTA_FUNDING: {
    amountClass: 'text-sky-700',
    badge: 'border-sky-200 bg-sky-50 text-sky-700',
    bubble: 'bg-sky-50',
    icon: ArrowRightLeft,
    iconClass: 'text-sky-700',
  },
  REFUND: {
    amountClass: 'text-emerald-700',
    badge: 'border-violet-200 bg-violet-50 text-violet-700',
    bubble: 'bg-violet-50',
    icon: RotateCcw,
    iconClass: 'text-violet-700',
  },
  TOP_UP: {
    amountClass: 'text-emerald-700',
    badge: 'border-emerald-200 bg-emerald-50 text-emerald-700',
    bubble: 'bg-emerald-50',
    icon: ArrowUp,
    iconClass: 'text-emerald-700',
  },
}

/**
 * Nhãn nguồn của một bút toán, dựng từ ĐÚNG những gì backend trả về.
 *
 * Cố ý không có tên ca thi / tên học sinh: bút toán chỉ mang id thô, và đổi lấy nhãn giàu đòi ba
 * LEFT JOIN ở tầng đọc. Hiện id rút gọn kèm nhãn loại là đủ để tra cứu, và đúng cách nhật ký nợ đang
 * làm với triggerExamSessionId.
 */
export function entrySourceLabel(entry: SchoolBalanceEntry) {
  if (entry.examSessionId) {
    return `Ca thi ${shortId(entry.examSessionId)}`
  }
  if (entry.practiceSessionId) {
    return `Phiên ôn luyện ${shortId(entry.practiceSessionId)}`
  }
  if (entry.orderId) {
    return `Đơn hàng ${shortId(entry.orderId)}`
  }
  // Rẽ theo entryType TRƯỚC nhánh actorId chung: cả ADJUSTMENT lẫn QUOTA_FUNDING đều có actorId,
  // nhưng một bên là quản trị hệ thống sửa sổ, bên kia là chính nhà trường bấm chuyển tiền của mình.
  // Đọc mỗi "actorId != null" là gán nhầm việc của trường cho quản trị hệ thống.
  if (entry.entryType === 'QUOTA_FUNDING') {
    return entry.actorId ? `Quản trị trường ${shortId(entry.actorId)}` : ''
  }
  if (entry.actorId) {
    return `Quản trị hệ thống ${shortId(entry.actorId)}`
  }
  return ''
}

export function entryTitle(entry: SchoolBalanceEntry) {
  const base = BALANCE_ENTRY_LABELS[entry.entryType]
  return entry.quotaType ? `${base} · ${QUOTA_LABELS[entry.quotaType]}` : base
}
