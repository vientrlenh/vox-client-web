import { useQuery } from '@tanstack/react-query'

import type { ActiveSchedule } from '../types'
import { fetchActiveSchedules } from './streamClient'

export const activeSchedulesQueryKeys = {
  all: ['activeSchedules'] as const,
}

/**
 * Ảnh chụp các ca thi đang có người stream, lấy trực tiếp từ vox-streaming.
 *
 * <p>Poll thay vì WebSocket là có chủ ý: kênh WS của giám thị mở theo **một** ca thi
 * (`/ws/monitor?scheduleId=...`), trong khi trang này cần nhìn nhiều ca cùng lúc. Mở song song mấy
 * socket chỉ để đếm đầu người thì đắt hơn nhiều so với một lần GET mỗi 5 giây, và độ trễ 5 giây là
 * chấp nhận được cho một màn hình dùng để *chọn* ca thi - theo dõi thật diễn ra ở trang trong.
 *
 * <p>Nhịp 5 giây cũng khớp với nhịp server sinh frame JPEG, nên không tạo ra thông tin mới nhanh
 * hơn mức dữ liệu thực sự thay đổi.
 */
export function useActiveSchedulesQuery(streamToken: string | undefined) {
  return useQuery({
    enabled: Boolean(streamToken),
    queryFn: () => fetchActiveSchedules(streamToken as string),
    queryKey: [...activeSchedulesQueryKeys.all, streamToken ?? 'no-token'],
    refetchInterval: 5_000,
    // Danh sách này mô tả "ngay bây giờ", nên một bản cũ không có giá trị gì.
    staleTime: 0,
  })
}

/** Tra cứu theo scheduleId. Ca thi không có ai stream sẽ vắng mặt hẳn trong phản hồi. */
export function indexByScheduleId(
  schedules: ActiveSchedule[] | undefined,
): Map<string, ActiveSchedule> {
  return new Map((schedules ?? []).map((schedule) => [schedule.scheduleId, schedule]))
}
