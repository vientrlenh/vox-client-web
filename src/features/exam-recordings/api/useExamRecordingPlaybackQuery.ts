import { useQuery } from '@tanstack/react-query'
import { graphQLRequest } from '@/shared/api'
import type { ExamRecordingPlaybackDto } from '../types'

type GraphQlExamRecordingPlaybackResponse = {
  examRecordingPlayback: ExamRecordingPlaybackDto[]
}

const EXAM_RECORDING_PLAYBACK_QUERY = `
  query ExamRecordingPlayback($examSessionId: ID!) {
    examRecordingPlayback(examSessionId: $examSessionId) {
      id
      streamType
      status
      source
      durationSeconds
      canonical
      playbackUrl
    }
  }
`

export const examRecordingQueryKeys = {
  all: ['exam-recordings'] as const,
  playback: (examSessionId: string | null) =>
    [...examRecordingQueryKeys.all, 'playback', examSessionId] as const,
}

export async function fetchExamRecordingPlayback(examSessionId: string) {
  const data = await graphQLRequest<GraphQlExamRecordingPlaybackResponse>(
    EXAM_RECORDING_PLAYBACK_QUERY,
    { examSessionId },
  )
  return data.examRecordingPlayback
}

/**
 * Bản ghi camera + màn hình của một phiên thi, kèm link phát.
 *
 * `staleTime` thấp hơn hạn của link (2 giờ ở backend) một quãng rộng: link chết thì thẻ video
 * trả 403 và người chấm chỉ thấy màn đen không rõ vì sao. Để react-query tự lấy link mới sau
 * 30 phút thì kể cả tab mở suốt buổi cũng không chạm tới hạn.
 *
 * `retry: false` vì hai lỗi hay gặp nhất -- không có quyền (403) và phiên thi không tồn tại
 * (404) -- đều không tự khỏi khi thử lại.
 */
export function useExamRecordingPlaybackQuery(examSessionId: string | null) {
  return useQuery({
    enabled: Boolean(examSessionId),
    queryFn: () => fetchExamRecordingPlayback(examSessionId as string),
    queryKey: examRecordingQueryKeys.playback(examSessionId),
    retry: false,
    staleTime: 30 * 60 * 1000,
  })
}
