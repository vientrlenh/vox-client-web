import { useQuery } from '@tanstack/react-query'
import { graphQLRequest } from '@/shared/api'
import type { QuestionModuleScope } from '@/features/question-bank/api/useQuestionBanksQuery'
import type { QuestionStatus } from '../types'
import {
  questionQueryKeys,
  resolveScopeForView,
  type QuestionListView,
  type QuestionQueryFilters,
} from './useQuestionsQuery'

const QUESTION_STATUS_COUNTS_QUERY = `
  query QuestionStatusCounts(
    $questionBankId: ID
    $questionTopicId: ID
    $topicName: String
    $type: QuestionType
    $sharing: QuestionSharing
    $scope: QuestionScope
    $keyword: String
  ) {
    questionStatusCounts(
      questionBankId: $questionBankId
      questionTopicId: $questionTopicId
      topicName: $topicName
      type: $type
      sharing: $sharing
      scope: $scope
      keyword: $keyword
    ) {
      status
      count
    }
  }
`

type QuestionStatusCountsQueryData = {
  questionStatusCounts: Array<{ count: number; status: QuestionStatus }>
}

export type QuestionStatusCounts = {
  byStatus: Partial<Record<QuestionStatus, number>>
  total: number
}

/** Bộ lọc của bảng đếm — giống danh sách nhưng bỏ `status`, vì đó chính là chiều đang nhóm. */
type CountFilters = Omit<QuestionQueryFilters, 'status'>

function toCountFilters(filters: QuestionQueryFilters): CountFilters {
  return {
    keyword: filters.keyword,
    questionBankId: filters.questionBankId,
    questionTopicId: filters.questionTopicId,
    scope: filters.scope,
    sharing: filters.sharing,
    topicName: filters.topicName,
    type: filters.type,
  }
}

export async function fetchQuestionStatusCounts(filters: CountFilters) {
  const data = await graphQLRequest<QuestionStatusCountsQueryData>(
    QUESTION_STATUS_COUNTS_QUERY,
    {
      keyword: filters.keyword || undefined,
      questionBankId: filters.questionBankId || undefined,
      questionTopicId: filters.questionTopicId || undefined,
      scope: filters.scope || undefined,
      sharing: filters.sharing || undefined,
      topicName: filters.topicName || undefined,
      type: filters.type || undefined,
    },
  )

  return data.questionStatusCounts
}

/**
 * Số câu hỏi theo từng trạng thái, dùng cho tab trạng thái trên trang danh sách.
 *
 * Backend trả đủ một dòng cho mỗi trạng thái kể cả khi count = 0, nên UI không phải đoán trạng
 * thái nào bị thiếu. Query key nằm dưới `questionQueryKeys.all` để mọi thao tác đổi trạng thái
 * (kể cả hàng loạt) làm mới luôn cả danh sách lẫn số đếm bằng một lần invalidate.
 */
export function useQuestionStatusCountsQuery(
  scope: QuestionModuleScope,
  view: QuestionListView,
  filters: QuestionQueryFilters,
) {
  const resolvedFilters: CountFilters = {
    ...toCountFilters(filters),
    scope: resolveScopeForView(scope, view, filters),
  }

  return useQuery({
    queryFn: () => fetchQuestionStatusCounts(resolvedFilters),
    queryKey: [...questionQueryKeys.all, 'status-counts', view, resolvedFilters],
    select: (rows): QuestionStatusCounts =>
      rows.reduce<QuestionStatusCounts>(
        (accumulator, row) => {
          accumulator.byStatus[row.status] = row.count
          accumulator.total += row.count
          return accumulator
        },
        { byStatus: {}, total: 0 },
      ),
  })
}
