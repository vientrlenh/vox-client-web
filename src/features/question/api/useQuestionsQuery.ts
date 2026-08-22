import { keepPreviousData, useQuery } from '@tanstack/react-query'
import { graphQLRequest } from '@/shared/api'
import type { QuestionModuleScope } from '@/features/question-bank/api/useQuestionBanksQuery'
import type {
  QuestionAssetType,
  QuestionPage,
  QuestionScope,
  QuestionSharing,
  QuestionStatus,
  QuestionType,
} from '../types'

export type QuestionListView = 'all' | 'my' | 'review'

/** 'NONE' = chỉ câu KHÔNG có tài nguyên; '' = không lọc theo tài nguyên. */
export type QuestionAssetTypeFilter = '' | 'NONE' | QuestionAssetType

export type QuestionQueryFilters = {
  assetType?: QuestionAssetTypeFilter
  keyword: string
  questionBankId?: string
  questionTopicId?: string
  scope?: '' | QuestionScope
  sharing?: '' | QuestionSharing
  status?: '' | QuestionStatus
  topicName?: string
  type?: '' | QuestionType
}

const QUESTION_FIELDS = `
  id
  questionBankId
  questionTopicId
  code
  instructionText
  questionText
  promptText
  preparationText
  type
  preparationTimeSeconds
  minResponseSeconds
  maxResponseSeconds
  # type + durationSeconds: cộng thời lượng phát AUDIO/VIDEO vào thời gian làm bài khi soạn mã đề
  # (getQuestionAttemptSeconds), và hiện nhãn loại tài nguyên trong QuestionPicker.
  assets {
    type
    durationSeconds
  }
  sharing
  sourceQuestionId
  locked
  status
  confidentiality
  securePoolId
  createdAt
  updatedAt
  createdBy
  updatedBy
  usableInExam
  topic {
    id
    questionBankId
    code
    name
    description
    status
  }
  bank {
    id
    code
    name
    description
    ownerType
    status
  }
  collaborators {
    id
    userId
    questionId
    permission
    assignedAt
    user {
      id
      fullName
      email
    }
  }
`

const QUESTIONS_QUERY = `
  query Questions(
    $questionBankId: ID
    $questionTopicId: ID
    $topicName: String
    $status: QuestionStatus
    $type: QuestionType
    $sharing: QuestionSharing
    $assetType: String
    $scope: QuestionScope
    $keyword: String
    $page: Int!
    $size: Int!
  ) {
    questions(
      questionBankId: $questionBankId
      questionTopicId: $questionTopicId
      topicName: $topicName
      status: $status
      type: $type
      sharing: $sharing
      assetType: $assetType
      scope: $scope
      keyword: $keyword
      page: $page
      size: $size
    ) {
      content {
        ${QUESTION_FIELDS}
      }
      page
      size
      totalElements
      totalPages
    }
  }
`

const QUESTIONS_FOR_EXAM_PAPER_QUERY = `
  query QuestionsForExamPaper(
    $questionBankId: ID
    $questionTopicId: ID
    $topicName: String
    $status: QuestionStatus
    $type: QuestionType
    $sharing: QuestionSharing
    $assetType: String
    $scope: QuestionScope
    $keyword: String
    $page: Int!
    $size: Int!
  ) {
    questionsForExamPaper(
      questionBankId: $questionBankId
      questionTopicId: $questionTopicId
      topicName: $topicName
      status: $status
      type: $type
      sharing: $sharing
      assetType: $assetType
      scope: $scope
      keyword: $keyword
      page: $page
      size: $size
    ) {
      content {
        ${QUESTION_FIELDS}
      }
      page
      size
      totalElements
      totalPages
    }
  }
`

type QuestionsQueryData = {
  questions: QuestionPage
}

type FetchQuestionsInput = {
  filters: QuestionQueryFilters
  page: number
  size: number
}

export const questionQueryKeys = {
  all: ['questions'] as const,
  question: (id: string | null) =>
    [...questionQueryKeys.all, 'detail', id] as const,
  questions: (
    view: QuestionListView,
    page: number,
    size: number,
    filters: QuestionQueryFilters,
  ) => [...questionQueryKeys.all, 'list', view, page, size, filters] as const,
}

/**
 * Danh sách và bảng đếm phải nhìn cùng một phạm vi, nếu không con số trên tab sẽ không khớp với
 * số dòng người dùng thấy — nên hai bên dùng chung đúng hàm này.
 */
export function resolveScopeForView(
  scope: QuestionModuleScope,
  view: QuestionListView,
  filters: QuestionQueryFilters,
) {
  if (view === 'review' && scope === 'teacher') {
    return 'REVIEWING'
  }

  if (view === 'my') {
    return (filters.scope || 'MINE') as QuestionScope
  }

  if (scope === 'teacher') {
    return (filters.scope || 'ALL') as QuestionScope
  }

  return undefined
}

export async function fetchQuestions({
  filters,
  page,
  size,
}: FetchQuestionsInput) {
  const data = await graphQLRequest<QuestionsQueryData>(QUESTIONS_QUERY, {
    keyword: filters.keyword || undefined,
    page,
    questionBankId: filters.questionBankId || undefined,
    questionTopicId: filters.questionTopicId || undefined,
    scope: filters.scope || undefined,
    sharing: filters.sharing || undefined,
    assetType: filters.assetType || undefined,
    size,
    status: filters.status || undefined,
    topicName: filters.topicName || undefined,
    type: filters.type || undefined,
  })

  return data.questions
}

export function useQuestionsQuery(
  scope: QuestionModuleScope,
  view: QuestionListView,
  page: number,
  size: number,
  filters: QuestionQueryFilters,
) {
  const resolvedFilters: QuestionQueryFilters = {
    ...filters,
    scope: resolveScopeForView(scope, view, filters),
  }

  return useQuery({
    // Giữ dữ liệu trang trước trong lúc tải trang mới: lựa chọn hàng loạt được giữ xuyên trang nên
    // người dùng chuyển trang liên tục, thay cả bảng bằng khối "Đang tải" mỗi lần làm nhảy layout.
    placeholderData: keepPreviousData,
    queryFn: () =>
      fetchQuestions({
        filters: resolvedFilters,
        page: page - 1,
        size,
      }),
    queryKey: questionQueryKeys.questions(view, page, size, resolvedFilters),
    select: (data) => ({
      ...data,
      page: data.page + 1,
    }),
  })
}

async function fetchQuestionsForExamPaper({
  filters,
  page,
  size,
}: FetchQuestionsInput) {
  const data = await graphQLRequest<{ questionsForExamPaper: QuestionPage }>(
    QUESTIONS_FOR_EXAM_PAPER_QUERY,
    {
      keyword: filters.keyword || undefined,
      page,
      questionBankId: filters.questionBankId || undefined,
      questionTopicId: filters.questionTopicId || undefined,
      scope: filters.scope || undefined,
      sharing: filters.sharing || undefined,
      assetType: filters.assetType || undefined,
      size,
      status: filters.status || undefined,
      topicName: filters.topicName || undefined,
      type: filters.type || undefined,
    },
  )
  return data.questionsForExamPaper
}

export function useQuestionsForExamPaperQuery(
  page: number,
  size: number,
  filters: QuestionQueryFilters,
) {
  return useQuery({
    queryFn: () =>
      fetchQuestionsForExamPaper({
        filters,
        page: page - 1,
        size,
      }),
    queryKey: [...questionQueryKeys.all, 'exam-paper', page, size, filters],
    select: (data) => ({
      ...data,
      page: data.page + 1,
    }),
  })
}
