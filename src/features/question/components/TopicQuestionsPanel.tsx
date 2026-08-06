import { useState } from 'react'
import { ExternalLink, Plus, RefreshCw } from 'lucide-react'
import { useNavigate } from 'react-router'
import type { QuestionModuleScope } from '@/features/question-bank/api/useQuestionBanksQuery'
import { useAppSelector } from '@/app/store/hooks'
import type { QuestionQueryFilters } from '../api/useQuestionsQuery'
import { useQuestionsQuery } from '../api/useQuestionsQuery'
import { canCreateQuestion, getQuestionActorRole } from '../permissions'
import { QuestionPagination } from './QuestionPagination'
import { QuestionTable } from './QuestionTable'

const DEFAULT_PAGE = 1
const DEFAULT_PAGE_SIZE = 10

function getErrorMessage(error: unknown) {
  if (
    error &&
    typeof error === 'object' &&
    'message' in error &&
    typeof error.message === 'string'
  ) {
    return error.message
  }

  return undefined
}

type TopicQuestionsPanelProps = {
  basePath: string
  questionBankId?: string
  questionTopicId: string
  scope: QuestionModuleScope
  topicName?: string
}

export function TopicQuestionsPanel({
  basePath,
  questionBankId,
  questionTopicId,
  scope,
  topicName,
}: TopicQuestionsPanelProps) {
  const navigate = useNavigate()
  const user = useAppSelector((state) => state.auth.user)
  const [page, setPage] = useState(DEFAULT_PAGE)
  const [pageSize, setPageSize] = useState(DEFAULT_PAGE_SIZE)

  const actorRole = getQuestionActorRole(user?.roles)
  const canCreate = canCreateQuestion(actorRole)
  const filters: QuestionQueryFilters = {
    keyword: '',
    questionBankId: questionBankId ?? '',
    questionTopicId,
    scope: '',
    sharing: '',
    status: '',
    topicName: '',
    type: '',
  }
  const questionsQuery = useQuestionsQuery(scope, 'all', page, pageSize, filters)

  // Danh sách đầy đủ (bộ lọc, xuất file, duyệt hàng loạt) vẫn nằm ở trang câu hỏi;
  // panel này chỉ là bảng rút gọn nên giữ một lối mở sang đó.
  const fullListSearch = new URLSearchParams({
    bankId: questionBankId ?? '',
    topicId: questionTopicId,
    topicName: topicName ?? '',
  }).toString()

  return (
    <section aria-labelledby="topic-questions-panel-title" className="grid gap-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h2
            className="text-lg font-black text-blue-950"
            id="topic-questions-panel-title"
          >
            Câu hỏi thuộc chủ đề
          </h2>
          <p className="mt-1 text-sm font-medium text-slate-500">
            {topicName
              ? `Danh sách câu hỏi thuộc chủ đề: ${topicName}`
              : 'Danh sách câu hỏi thuộc chủ đề này.'}
          </p>
        </div>

        <div className="flex flex-wrap gap-3">
          <button
            className="inline-flex h-11 items-center justify-center gap-2 rounded-full border border-slate-200 bg-white px-4 text-sm font-bold text-indigo-700 transition hover:bg-indigo-50 disabled:cursor-wait disabled:opacity-70"
            disabled={questionsQuery.isFetching}
            onClick={() => {
              void questionsQuery.refetch()
            }}
            type="button"
          >
            <RefreshCw
              aria-hidden="true"
              className={[
                'size-4',
                questionsQuery.isFetching ? 'animate-spin' : '',
              ].join(' ')}
            />
            Làm mới
          </button>

          <button
            className="inline-flex h-11 items-center justify-center gap-2 rounded-full border border-slate-200 bg-white px-4 text-sm font-bold text-slate-700 transition hover:bg-slate-50"
            onClick={() =>
              navigate(`${basePath}/questions/all?${fullListSearch}`)
            }
            type="button"
          >
            <ExternalLink aria-hidden="true" className="size-4" />
            Mở trong trang câu hỏi
          </button>

          {canCreate ? (
            <button
              className="inline-flex h-11 items-center justify-center gap-2 rounded-full bg-linear-to-r from-indigo-600 to-cyan-500 px-5 text-sm font-bold text-white transition hover:opacity-90"
              onClick={() =>
                navigate(
                  `${basePath}/questions/create?bankId=${questionBankId ?? ''}&topicId=${questionTopicId}`,
                )
              }
              type="button"
            >
              <Plus aria-hidden="true" className="size-4" />
              Tạo câu hỏi
            </button>
          ) : null}
        </div>
      </div>

      <QuestionTable
        errorMessage={getErrorMessage(questionsQuery.error)}
        footer={
          <QuestionPagination
            isDisabled={questionsQuery.isLoading || questionsQuery.isError}
            onPageChange={setPage}
            onPageSizeChange={(nextPageSize) => {
              setPage(DEFAULT_PAGE)
              setPageSize(nextPageSize)
            }}
            page={page}
            pageSize={pageSize}
            totalElements={questionsQuery.data?.totalElements ?? 0}
            totalPages={questionsQuery.data?.totalPages ?? 0}
          />
        }
        isError={questionsQuery.isError}
        isLoading={questionsQuery.isLoading}
        onRetry={() => {
          void questionsQuery.refetch()
        }}
        onSelect={(id) => navigate(`${basePath}/questions/${id}`)}
        questions={questionsQuery.data?.content ?? []}
        selectedId={null}
      />
    </section>
  )
}
