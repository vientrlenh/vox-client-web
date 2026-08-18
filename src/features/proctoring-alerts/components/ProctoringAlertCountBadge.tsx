import { AlertTriangle } from 'lucide-react'

import type { AlertSeverityCounts } from '../api/useExamAlertCountsQuery'

type ProctoringAlertCountBadgeProps = {
  counts?: AlertSeverityCounts
}

/**
 * Dấu "bài này có cảnh báo giám sát" trên một dòng điều phối chấm bài.
 *
 * <p>Cố tình KHÔNG đếm mức INFO. Thang cảnh báo có ba nấc với ba nơi đến khác nhau: CRITICAL là can
 * thiệp ngay trong lúc thi, WARNING là xem lại lúc chấm, còn INFO chỉ vào sổ. Đếm cả INFO thì những
 * sự kiện hoàn toàn bình thường -- camera nối lại được chẳng hạn -- cũng thắp đỏ một dòng, và chỉ
 * cần vài lần như thế là người điều phối học được cách bỏ qua cái nhãn này. Một dấu hiệu bị phớt lờ
 * còn tệ hơn không có dấu hiệu nào.
 *
 * <p>Một chip duy nhất chứ không phải ba: dòng này đã có "Nghi vấn" và "Có đơn" đứng cạnh, và câu
 * hỏi ở màn điều phối chỉ là "bài này có đáng để ý không". Phân tích chi tiết là việc của người chấm
 * khi mở bài, nơi `ProctoringAlertsCard` liệt kê đầy đủ.
 */
export function ProctoringAlertCountBadge({ counts }: ProctoringAlertCountBadgeProps) {
  if (!counts || counts.needsReview === 0) {
    return null
  }

  const hasCritical = counts.critical > 0
  const detail = [
    counts.critical > 0 ? `${counts.critical} nghiêm trọng` : null,
    counts.warning > 0 ? `${counts.warning} cảnh báo` : null,
    counts.info > 0 ? `${counts.info} thông tin` : null,
  ]
    .filter(Boolean)
    .join(' · ')

  return (
    <span
      className={`inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-[11px] font-bold ${
        hasCritical
          ? 'border-red-200 bg-red-50 text-red-700'
          : 'border-amber-200 bg-amber-50 text-amber-700'
      }`}
      title={`Cảnh báo giám sát: ${detail}`}
    >
      <AlertTriangle className="size-3" />
      {counts.needsReview}
    </span>
  )
}
