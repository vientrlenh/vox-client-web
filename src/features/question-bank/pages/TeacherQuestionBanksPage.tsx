import { useState } from 'react'
import { useQueryClient } from '@tanstack/react-query'
import { useNavigate } from 'react-router'
import { useAppSelector } from '@/app/store/hooks'
import {
  useCreateQuestionBankMutation,
  useDeleteQuestionBankMutation,
  useReviewQuestionBankMutation,
  useUpdateQuestionBankMutation,
} from '../api/useQuestionBankMutations'
import {
  questionBankQueryKeys,
  type QuestionModuleScope,
  useQuestionBanksQuery,
} from '../api/useQuestionBanksQuery'
import { useQuestionBankQuery } from '../api/useQuestionBankQuery'
import { QuestionBankFormDialog } from '../components/QuestionBankFormDialog'
import type {
  QuestionBankFormMode,
  QuestionBankFormValues,
} from '../components/QuestionBankFormDialog'
import { QuestionBankPageHeader } from '../components/QuestionBankPageHeader'
import { QuestionBankPagination } from '../components/QuestionBankPagination'
import { QuestionBankTable } from '../components/QuestionBankTable'
import {
  canManageQuestionBank,
  getQuestionBankActorRole,
  getQuestionBankReviewActions,
} from '../permissions'
import type {
  CreateQuestionBankRequest,
  QuestionBankDto,
  UpdateQuestionBankRequest,
} from '../types'

const DEFAULT_PAGE = 1
const DEFAULT_PAGE_SIZE = 10
const FIXED_LANGUAGE_ID = '01890f44-0c7a-7cc1-bc3b-2e7f4f001234'

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
  title = 'Ngan hang cau hoi',
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
  const questionBanksQuery = useQuestionBanksQuery(scope, page, pageSize)
  const questionBanks = questionBanksQuery.data?.content ?? []
  const selectedListBank =
    questionBanks.find((bank) => bank.id === selectedId) ??
    questionBanks[0] ??
    null
  const effectiveSelectedId = selectedListBank?.id ?? null
  const selectedBankQuery = useQuestionBankQuery(scope, effectiveSelectedId)
  const selectedBank = selectedBankQuery.data ?? selectedListBank
  const createMutation = useCreateQuestionBankMutation()
  const updateMutation = useUpdateQuestionBankMutation()
  const deleteMutation = useDeleteQuestionBankMutation()
  const reviewMutation = useReviewQuestionBankMutation()
  const isSubmitting =
    createMutation.isPending ||
    updateMutation.isPending ||
    deleteMutation.isPending ||
    reviewMutation.isPending

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

  function openCreateDialog() {
    setDialogError(null)
    setDialogTarget(null)
    setDialogMode('create')
  }

  function openEditDialog(bank: QuestionBankDto) {
    setDialogError(null)
    setDialogTarget(bank)
    setDialogMode('edit')
  }

  function closeDialog() {
    if (isSubmitting) {
      return
    }

    setDialogError(null)
    setDialogTarget(null)
    setDialogMode(null)
  }

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
        if (scope === 'school' && !user?.schoolId) {
          setDialogError('Khong tim thay schoolId de tao question bank.')
          return
        }

        const payload: CreateQuestionBankRequest = {
          code: values.code,
          description: values.description || null,
          languageId: FIXED_LANGUAGE_ID,
          name: values.bankName,
          ...(scope === 'school' ? { schoolId: user?.schoolId } : {}),
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

      const payload: UpdateQuestionBankRequest = {
        bankName: values.bankName,
        description: values.description || null,
        isActive: values.isActive,
      }

      const message = await updateMutation.mutateAsync({
        id: dialogTarget.id,
        payload,
      })

      await refreshBanks()
      setDialogMode(null)
      setDialogTarget(null)
      setPageMessage(message)
    } catch (error) {
      setDialogError(
        getErrorMessage(error) ?? 'Khong the luu question bank. Vui long thu lai.',
      )
    }
  }

  async function handleDeleteBank(bank: QuestionBankDto) {
    if (!window.confirm(`Xoa question bank "${bank.bankName}"?`)) {
      return
    }

    try {
      const message = await deleteMutation.mutateAsync(bank.id)
      await refreshBanks()
      setPageMessage(message)
    } catch (error) {
      setPageMessage(getErrorMessage(error) ?? 'Khong the xoa question bank.')
    }
  }

  async function handleReviewAction(bank: QuestionBankDto, targetStatus: string) {
    try {
      const message = await reviewMutation.mutateAsync({
        id: bank.id,
        payload: { targetStatus },
      })
      await refreshBanks()
      setPageMessage(message)
    } catch (error) {
      setPageMessage(
        getErrorMessage(error) ?? 'Khong the cap nhat trang thai question bank.',
      )
    }
  }

  return (
    <section
      aria-labelledby="teacher-question-banks-title"
      className="grid gap-6"
    >
      <QuestionBankPageHeader
        description="Danh sach ngan hang cau hoi duoc phep xem theo quyen cua ban."
        isRefreshing={questionBanksQuery.isFetching}
        onCreate={canManage ? openCreateDialog : undefined}
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
            onPageChange={handlePageChange}
            onPageSizeChange={handlePageSizeChange}
            page={page}
            pageSize={pageSize}
            totalElements={questionBanksQuery.data?.totalElements ?? 0}
            totalPages={questionBanksQuery.data?.totalPages ?? 0}
          />
        }
        getAdditionalActions={
          canManage
            ? (bank) => [
                {
                  id: `delete-${bank.id}`,
                  label: 'Xoa',
                  onSelect: () => {
                    void handleDeleteBank(bank)
                  },
                  tone: 'danger',
                },
                ...getQuestionBankReviewActions(actorRole).map((action) => ({
                  id: `${action.id}-${bank.id}`,
                  label: action.label,
                  onSelect: () => {
                    void handleReviewAction(bank, action.status)
                  },
                  tone:
                    action.status === 'PUBLISHED'
                      ? ('success' as const)
                      : action.status === 'REJECTED'
                        ? ('danger' as const)
                        : ('default' as const),
                })),
              ]
            : undefined
        }
        isError={questionBanksQuery.isError}
        isLoading={questionBanksQuery.isLoading}
        onEdit={canManage ? openEditDialog : undefined}
        onRetry={() => {
          void questionBanksQuery.refetch()
        }}
        onSelect={setSelectedId}
        onViewTopics={(bank) => handleViewTopics(bank.id, bank.bankName)}
        questionBanks={questionBanks}
        selectedId={effectiveSelectedId}
      />

      <QuestionBankFormDialog
        errorMessage={dialogError ?? undefined}
        isSubmitting={isSubmitting}
        mode={dialogMode}
        onClose={closeDialog}
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
