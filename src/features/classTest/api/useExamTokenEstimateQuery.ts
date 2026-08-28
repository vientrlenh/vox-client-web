import { useQuery } from '@tanstack/react-query'
import { graphQLRequest } from '@/shared/api'

export type ExamTokenEstimate = {
  estimatedCostUsd: number
}

export const examTokenEstimateQueryKeys = {
  byExam: (examId: string) => ['exam-token-estimate', examId] as const,
}

const EXAM_TOKEN_ESTIMATE_QUERY = `
  query ExamTokenEstimate($examId: ID!) {
    examTokenEstimate(examId: $examId) {
      estimatedCostUsd
    }
  }
`

async function fetchExamTokenEstimate(examId: string): Promise<ExamTokenEstimate> {
  const data = await graphQLRequest<{ examTokenEstimate: ExamTokenEstimate }>(
    EXAM_TOKEN_ESTIMATE_QUERY,
    { examId },
  )
  return data.examTokenEstimate
}

/**
 * Ước lượng worst-case chi phí AI, do BE tính. Trước đây FE tự nhân lại công thức
 * (duration × thí sinh × maxAttempt × giá) — bản chép tay đó đã bỏ, vì thời lượng bài thi giờ gồm cả
 * thời lượng phát AUDIO/VIDEO trong khi chi phí thì không, nên nhân ở client là ra số khác hẳn cái
 * BE dùng để chặn lúc bấm lưu.
 */
export function useExamTokenEstimateQuery(examId: string | undefined) {
  return useQuery({
    enabled: Boolean(examId),
    queryFn: () => fetchExamTokenEstimate(examId as string),
    queryKey: examTokenEstimateQueryKeys.byExam(examId ?? ''),
  })
}

/**
 * Ước lượng "nếu lưu với số lượt đang gõ". Chi phí TUYẾN TÍNH theo maxAttempt ở BE
 * (billable × số thí sinh × maxAttempt × giá), nên nhân tỉ lệ cho ra đúng con số BE sẽ tính — không
 * phải xấp xỉ, và không cần gọi lại server mỗi lần người dùng gõ.
 *
 * <p>Cố ý KHÔNG dựng lại công thức ở đây: thời lượng, số thí sinh và đơn giá vẫn nằm trọn bên BE,
 * client chỉ áp một tỉ lệ.
 */
export function scaleEstimateByMaxAttempt(
  estimatedCostUsd: number | undefined,
  savedMaxAttempt: number | null | undefined,
  nextMaxAttempt: number,
): number | undefined {
  if (estimatedCostUsd == null) {
    return undefined
  }
  const saved = savedMaxAttempt && savedMaxAttempt > 0 ? savedMaxAttempt : 1
  return (estimatedCostUsd / saved) * nextMaxAttempt
}
