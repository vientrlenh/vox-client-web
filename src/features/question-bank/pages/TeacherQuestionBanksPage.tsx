import { useState } from 'react'
import { useQueryClient } from '@tanstack/react-query'
import { useNavigate } from 'react-router'
import {
  useCreateQuestionBankMutation,
  useDeleteQuestionBankMutation,
  useReviewQuestionBankMutation,
  useUpdateQuestionBankMutation,
} from '../api/useQuestionBankMutations'
import { useQuestionBankQuery } from '../api/useQuestionBankQuery'
import {
  questionBankQueryKeys,
  type QuestionModuleScope,
  useQuestionBanksQuery,
} from '../api/useQuestionBanksQuery'
import { QuestionBankFormDialog } from '../components/QuestionBankFormDialog'
import type {
  QuestionBankFormMode,
  QuestionBankFormValues,
} from '../components/QuestionBankFormDialog'
import { QuestionBankPageHeader } from '../components/QuestionBankPageHeader'
import { QuestionBankPagination } from '../components/QuestionBankPagination'
import { QuestionBankTable } from '../components/QuestionBankTable'
import {
  canEditQuestionBank,
  canManageQuestionBank,
  getQuestionBankActorRole,
  getQuestionBankStatusActions,
} from '../permissions'
import type { CreateQuestionBankRequest, QuestionBankDto } from '../types'
import { useAppSelector } from '@/app/store/hooks'
import { QUESTION_MODULE_DEFAULT_LANGUAGE_ID } from '@/features/question/constants'

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
  const queryClient = useQueryClient()
  const user = useAppSelector((state) => state.auth.user)
  const [page, setPage] = useState(DEFAULT_PAGE)
  const [pageSize, setPageSize] = useState(DEFAULT_PAGE_SIZE)
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [dialogMode, setDialogMode] = useState<QuestionBankFormMode | null>(null)
  const [dialogTarget, setDialogTarget] = useState<QuestionBankDto | null>(null)
  const [dialogError, setDialogError] = useState<string | null>(null)
  const [pageMessage, setPageMessage] = useState<string | null>(null)

  const actorRole = getQuestionBankActorRole(user?.roles)
  const canManage = canManageQuestionBank(actorRole)
  const questionBanksQuery = useQuestionBanksQuery(scope, page - 1, pageSize)
  const questionBanks = questionBanksQuery.data?.content ?? []
  const selectedListBank =
    questionBanks.find((bank) => bank.id === selectedId) ??
    questionBanks[0] ??
    null
  const effectiveSelectedId = selectedListBank?.id ?? null
  const selectedBankQuery = useQuestionBankQuery(effectiveSelectedId)
  const selectedBank = selectedBankQuery.data ?? selectedListBank
  const createMutation = useCreateQuestionBankMutation()
  const updateMutation = useUpdateQuestionBankMutation()
  const deleteMutation = useDeleteQuestionBankMutation()
  const statusMutation = useReviewQuestionBankMutation()
  const isSubmitting =
    createMutation.isPending ||
    updateMutation.isPending ||
    deleteMutation.isPending ||
    statusMutation.isPending

  async function refreshBanks() {
    await queryClient.invalidateQueries({ queryKey: questionBankQueryKeys.all })
  }

  async function handleSubmit(
    mode: QuestionBankFormMode,
    values: QuestionBankFormValues,
  ) {
    try {
      setDialogError(null)

      if (mode === 'create') {
        const payload: CreateQuestionBankRequest = {
          code: values.code,
          description: values.description || null,
          languageId: QUESTION_MODULE_DEFAULT_LANGUAGE_ID,
          name: values.name,
        }

        const message = await createMutation.mutateAsync({
          payload,
          scope: scope === 'admin' ? 'admin' : 'school',
        })

        await refreshBanks()
        setDialogMode(null)
        setDialogTarget(null)
        setPageMessage(message)
        return
      }

      if (!dialogTarget) {
        return
      }

      const message = await updateMutation.mutateAsync({
        id: dialogTarget.id,
        payload: {
          description: values.description || null,
          name: values.name,
        },
      })

      await refreshBanks()
      setDialogMode(null)
      setDialogTarget(null)
      setPageMessage(message)
    } catch (error) {
      setDialogError(
        getErrorMessage(error) ?? 'không thể cập nhật question bank.',
      )
    }
  }

  async function handleDeleteBank(bank: QuestionBankDto) {
    if (!window.confirm(`Xóa question bank "${bank.name}"?`)) {
      return
    }

    try {
      const result = await deleteMutation.mutateAsync(bank.id)
      await refreshBanks()
      setPageMessage(
        result.archivedInstead
          ? `${result.message}. Backend đã archive thay vì xóa.`
          : result.message,
      )
    } catch (error) {
      setPageMessage(getErrorMessage(error) ?? 'không thể xóa question bank.')
    }
  }

  return (
    <section aria-labelledby="teacher-question-banks-title" className="grid gap-6">
      <QuestionBankPageHeader
        description="Danh sách ngân hàng câu hỏi được phép xem theo quyền của bạn."
        isRefreshing={questionBanksQuery.isFetching}
        onCreate={canManage ? () => setDialogMode('create') : undefined}
        onRefresh={() => {
          void questionBanksQuery.refetch()
        }}
        title={title}
      />

      {pageMessage ? (
        <div className="rounded-lg border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm font-semibold text-emerald-700">
          {pageMessage}
        </div>
      ) : null}

      <QuestionBankTable
        errorMessage={getErrorMessage(questionBanksQuery.error)}
        footer={
          <QuestionBankPagination
            isDisabled={questionBanksQuery.isLoading || questionBanksQuery.isError}
            onPageChange={(nextPage) => {
              setSelectedId(null)
              setPage(nextPage)
            }}
            onPageSizeChange={(nextPageSize) => {
              setSelectedId(null)
              setPage(DEFAULT_PAGE)
              setPageSize(nextPageSize)
            }}
            page={page}
            pageSize={pageSize}
            totalElements={questionBanksQuery.data?.totalElements ?? 0}
            totalPages={questionBanksQuery.data?.totalPages ?? 0}
          />
        }
        getAdditionalActions={
          canManage
            ? (bank) => [
                ...getQuestionBankStatusActions(bank, actorRole).map((action) => ({
                  id: `${action.id}-${bank.id}`,
                  label: action.label,
                  onSelect: () => {
                    void (async () => {
                      try {
                        const message = await statusMutation.mutateAsync({
                          id: bank.id,
                          payload: { action: action.action },
                        })
                        await refreshBanks()
                        setPageMessage(message)
                      } catch (error) {
                        setPageMessage(
                          getErrorMessage(error) ??
                            'không thể cập nhật trạng thái question bank.',
                        )
                      }
                    })()
                  },
                  tone: action.action === 'PUBLISH' ? ('success' as const) : ('default' as const),
                })),
                {
                  id: `delete-${bank.id}`,
                  label: 'Xóa',
                  onSelect: () => {
                    void handleDeleteBank(bank)
                  },
                  tone: 'danger' as const,
                },
              ]
            : undefined
        }
        isError={questionBanksQuery.isError}
        isLoading={questionBanksQuery.isLoading}
        onEdit={
          canManage
            ? (bank) => {
                if (!canEditQuestionBank(bank, actorRole)) {
                  return
                }
                setDialogError(null)
                setDialogTarget(bank)
                setDialogMode('edit')
              }
            : undefined
        }
        onRetry={() => {
          void questionBanksQuery.refetch()
        }}
        onSelect={(id) => {
          setSelectedId(id)
          navigate(`${basePath}/question-banks/${id}`)
        }}
        onViewTopics={(bank) =>
          navigate(
            `${basePath}/question-topics?bankId=${bank.id}&bankName=${encodeURIComponent(bank.name)}`,
          )
        }
        questionBanks={questionBanks}
        selectedId={effectiveSelectedId}
      />

      <QuestionBankFormDialog
        errorMessage={dialogError ?? undefined}
        isSubmitting={isSubmitting}
        mode={dialogMode}
        onClose={() => {
          if (isSubmitting) {
            return
          }
          setDialogError(null)
          setDialogTarget(null)
          setDialogMode(null)
        }}
        onSubmit={(mode, payload) => {
          void handleSubmit(mode, payload)
        }}
        questionBank={dialogMode === 'edit' ? selectedBank ?? dialogTarget : null}
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
