// Nhãn tiếng Việt cho vòng đời DRAFT -> PUBLISHED -> ARCHIVED, dùng chung cho Rubric Version
// và Chính Sách Đánh Giá (Assessment Policy) vì cả hai cùng share enum trạng thái này.

const PUBLISH_STATUS_LABELS: Record<string, string> = {
  DRAFT: 'Bản nháp',
  PUBLISHED: 'Đã xuất bản',
  ARCHIVED: 'Đã lưu trữ',
};

export function publishStatusLabel(status: string | null | undefined): string {
  if (!status) return '—';
  return PUBLISH_STATUS_LABELS[status] ?? status;
}
