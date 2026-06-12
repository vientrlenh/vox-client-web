import { useState } from 'react'
import { useNavigate } from 'react-router'
import {
  type QuestionModuleScope,
  useQuestionBanksQuery,
} from '../api/useQuestionBanksQuery'
import { useQuestionBankQuery } from '../api/useQuestionBankQuery'
import { QuestionBankPageHeader } from '../components/QuestionBankPageHeader'
import { QuestionBankPagination } from '../components/QuestionBankPagination'
import { QuestionBankTable } from '../components/QuestionBankTable'

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

type QuestionBanksPageProps = {
  basePath: string
  scope: QuestionModuleScope
  title?: string
}

function QuestionBanksPage({
  basePath,
  scope,
  title = 'Ngân hàng câu hỏi',
}: QuestionBanksPageProps) {
  const navigate = useNavigate()
  const [page, setPage] = useState(DEFAULT_PAGE)
  const [pageSize, setPageSize] = useState(DEFAULT_PAGE_SIZE)
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const questionBanksQuery = useQuestionBanksQuery(scope, page, pageSize)
  const questionBanks = questionBanksQuery.data?.content ?? []
  const selectedListBank =
    questionBanks.find((bank) => bank.id === selectedId) ??
    questionBanks[0] ??
    null
  const effectiveSelectedId = selectedListBank?.id ?? null

  useQuestionBankQuery(scope, effectiveSelectedId)

  function handlePageChange(nextPage: number) {
    setSelectedId(null)
    setPage(nextPage)
  }

  function handlePageSizeChange(nextPageSize: number) {
    setSelectedId(null)
    setPage(DEFAULT_PAGE)
    setPageSize(nextPageSize)
  }

  function handleViewTopics(bankId: string, bankName: string) {
    navigate(
      `${basePath}/question-topics?bankId=${bankId}&bankName=${encodeURIComponent(bankName)}`,
    )
  }

  return (
    <section
      aria-labelledby="teacher-question-banks-title"
      className="grid gap-6"
    >
      <QuestionBankPageHeader
        description="Danh sách ngân hàng câu hỏi được phép xem theo quyền của bạn."
        isRefreshing={questionBanksQuery.isFetching}
        onRefresh={() => {
          void questionBanksQuery.refetch()
        }}
        title={title}
      />

      <QuestionBankTable
        errorMessage={getErrorMessage(questionBanksQuery.error)}
        footer={
          <QuestionBankPagination
            isDisabled={questionBanksQuery.isLoading || questionBanksQuery.isError}
            onPageChange={handlePageChange}
            onPageSizeChange={handlePageSizeChange}
            page={page}
            pageSize={pageSize}
            totalElements={questionBanksQuery.data?.totalElements ?? 0}
            totalPages={questionBanksQuery.data?.totalPages ?? 0}
          />
        }
        isError={questionBanksQuery.isError}
        isLoading={questionBanksQuery.isLoading}
        onRetry={() => {
          void questionBanksQuery.refetch()
        }}
        onSelect={setSelectedId}
        onViewTopics={(bank) => handleViewTopics(bank.id, bank.bankName)}
        questionBanks={questionBanks}
        selectedId={effectiveSelectedId}
      />
    </section>
  )
}

export function TeacherQuestionBanksPage() {
  return <QuestionBanksPage basePath="/teacher" scope="teacher" />
}

export function SchoolAdminQuestionBanksPage() {
  return <QuestionBanksPage basePath="/school-admin" scope="school" />
}

export function SystemAdminQuestionBanksPage() {
  return <QuestionBanksPage basePath="/system-admin" scope="admin" />
}
