import { ArrowDown, ArrowUp, PenLine, RotateCcw, Users } from 'lucide-react'
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
  ALLOCATION_DRAW: {
    // Dấu tự do (cấp = trừ, hoàn = cộng) nên không cố định amountClass theo dấu như OVERAGE_CHARGE --
    // để nguyên màu trung tính, số tiền tự nói lên chiều qua dấu +/-.
    amountClass: 'text-indigo-700',
    badge: 'border-indigo-200 bg-indigo-50 text-indigo-700',
    bubble: 'bg-indigo-50',
    icon: Users,
    iconClass: 'text-indigo-700',
  },
  OVERAGE_CHARGE: {
    amountClass: 'text-amber-700',
    badge: 'border-amber-200 bg-amber-50 text-amber-700',
    bubble: 'bg-amber-50',
    icon: ArrowDown,
    iconClass: 'text-amber-700',
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
  // ALLOCATION_DRAW: KHÔNG hiện targetUserId ở đây -- backend đã chốt sẵn email người được cấp/hạ
  // hạn mức ngay trong "reason" lúc ghi (trường không cần nhìn UUID), lặp lại id ở dòng này là thừa.
  if (entry.actorId) {
    return `Quản trị hệ thống ${shortId(entry.actorId)}`
  }
  return ''
}

export function entryTitle(entry: SchoolBalanceEntry) {
  const base = BALANCE_ENTRY_LABELS[entry.entryType]
  return entry.quotaType ? `${base} · ${QUOTA_LABELS[entry.quotaType]}` : base
}
