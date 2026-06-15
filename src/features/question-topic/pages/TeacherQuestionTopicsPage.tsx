import { useState } from 'react'
import { useQueryClient } from '@tanstack/react-query'
import { useNavigate, useSearchParams } from 'react-router'
import { useAppSelector } from '@/app/store/hooks'
import type { QuestionModuleScope } from '@/features/question-bank/api/useQuestionBanksQuery'
import {
  questionTopicQueryKeys,
  useQuestionTopicsQuery,
} from '../api/useQuestionTopicsQuery'
import { useQuestionTopicQuery } from '../api/useQuestionTopicQuery'
import {
  useCreateQuestionTopicMutation,
  useDeleteQuestionTopicMutation,
  useReviewQuestionTopicMutation,
  useUpdateQuestionTopicMutation,
} from '../api/useQuestionTopicMutations'
import { QuestionTopicFormDialog } from '../components/QuestionTopicFormDialog'
import type {
  QuestionTopicFormMode,
} from '../components/QuestionTopicFormDialog'
import { QuestionTopicPageHeader } from '../components/QuestionTopicPageHeader'
import { QuestionTopicPagination } from '../components/QuestionTopicPagination'
import { QuestionTopicTable } from '../components/QuestionTopicTable'
import {
  canDeleteQuestionTopic,
  canEditQuestionTopic,
  canManageQuestionTopic,
  getQuestionTopicActorRole,
  getQuestionTopicReviewActions,
} from '../permissions'
import type {
  CreateQuestionTopicRequest,
  QuestionTopicDto,
  ReviewQuestionTopicRequest,
  UpdateQuestionTopicRequest,
} from '../types'

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

type QuestionTopicsPageProps = {
  basePath: string
  scope: QuestionModuleScope
  title?: string
}

function QuestionTopicsPage({
  basePath,
  scope,
  title = 'Chu de cau hoi',
}: QuestionTopicsPageProps) {
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const user = useAppSelector((state) => state.auth.user)
  const [searchParams] = useSearchParams()
  const bankId = searchParams.get('bankId') ?? ''
  const bankName = searchParams.get('bankName') ?? ''
  const [page, setPage] = useState(DEFAULT_PAGE)
  const [pageSize, setPageSize] = useState(DEFAULT_PAGE_SIZE)
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [dialogMode, setDialogMode] = useState<QuestionTopicFormMode | null>(null)
  const [dialogTarget, setDialogTarget] = useState<QuestionTopicDto | null>(null)
  const [dialogError, setDialogError] = useState<string | null>(null)
  const [pageMessage, setPageMessage] = useState<string | null>(null)

  const actorRole = getQuestionTopicActorRole(user?.roles)
  const canManage = canManageQuestionTopic(actorRole)
  const questionTopicsQuery = useQuestionTopicsQuery(scope, bankId, page, pageSize)
  const questionTopics = questionTopicsQuery.data?.content ?? []
  const selectedListTopic =
    questionTopics.find((topic) => topic.id === selectedId) ??
    questionTopics[0] ??
    null
  const effectiveSelectedId = selectedListTopic?.id ?? null
  const selectedTopicQuery = useQuestionTopicQuery(scope, effectiveSelectedId)
  const selectedTopic = selectedTopicQuery.data ?? selectedListTopic
  const createMutation = useCreateQuestionTopicMutation()
  const updateMutation = useUpdateQuestionTopicMutation()
  const deleteMutation = useDeleteQuestionTopicMutation()
  const reviewMutation = useReviewQuestionTopicMutation()
  const isSubmitting =
    createMutation.isPending ||
    updateMutation.isPending ||
    deleteMutation.isPending ||
    reviewMutation.isPending

  async function refreshTopics() {
    await queryClient.invalidateQueries({ queryKey: questionTopicQueryKeys.all })
  }

  function handleBack() {
    navigate(`${basePath}/question-banks`)
  }

  function handleViewDetail(topicId: string) {
    setSelectedId(topicId)
    navigate(
      `${basePath}/question-topics/${topicId}?bankId=${bankId}&bankName=${encodeURIComponent(bankName)}`,
    )
  }

  function openCreateDialog() {
    setDialogError(null)
    setDialogTarget(null)
    setDialogMode('create')
  }

  function openEditDialog(topic: QuestionTopicDto) {
    setDialogError(null)
    setDialogTarget(topic)
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

  async function handleSubmit(
    mode: QuestionTopicFormMode,
    payload: CreateQuestionTopicRequest | UpdateQuestionTopicRequest,
  ) {
    try {
      setDialogError(null)

      if (mode === 'create') {
        const message = await createMutation.mutateAsync(
          payload as CreateQuestionTopicRequest,
        )
        await refreshTopics()
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
        payload: payload as UpdateQuestionTopicRequest,
      })
      await refreshTopics()
      setDialogMode(null)
      setDialogTarget(null)
      setPageMessage(message)
    } catch (error) {
      setDialogError(
        getErrorMessage(error) ?? 'Khong the luu question topic. Vui long thu lai.',
      )
    }
  }

  async function handleDeleteTopic(topic: QuestionTopicDto) {
    if (!window.confirm(`Xoa question topic "${topic.name}"?`)) {
      return
    }

    try {
      const message = await deleteMutation.mutateAsync(topic.id)
      await refreshTopics()
      setPageMessage(message)
    } catch (error) {
      setPageMessage(getErrorMessage(error) ?? 'Khong the xoa question topic.')
    }
  }

  async function handleReviewAction(topic: QuestionTopicDto, targetStatus: string) {
    try {
      const payload: ReviewQuestionTopicRequest = { targetStatus }
      const message = await reviewMutation.mutateAsync({
        id: topic.id,
        payload,
      })
      await refreshTopics()
      setPageMessage(message)
    } catch (error) {
      setPageMessage(
        getErrorMessage(error) ?? 'Khong the cap nhat trang thai question topic.',
      )
    }
  }

  if (!bankId) {
    return (
      <section className="grid gap-6">
        <div className="flex min-h-80 flex-col items-center justify-center px-6 py-12 text-center">
          <p className="text-sm font-bold text-red-600">
            Khong tim thay ngan hang cau hoi. Vui long chon mot ngan hang truoc.
          </p>
          <button
            className="mt-4 inline-flex h-10 items-center justify-center rounded-full border border-slate-200 bg-white px-4 text-sm font-bold text-indigo-700 transition hover:bg-indigo-50"
            onClick={handleBack}
            type="button"
          >
            Quay lai danh sach ngan hang
          </button>
        </div>
      </section>
    )
  }

  return (
    <section
      aria-labelledby="teacher-question-topics-title"
      className="grid gap-6"
    >
      <QuestionTopicPageHeader
        bankName={bankName}
        description="Danh sach chu de thuoc ngan hang cau hoi theo quyen cua ban."
        isRefreshing={questionTopicsQuery.isFetching}
        onBack={handleBack}
        onCreate={canManage ? openCreateDialog : undefined}
        onRefresh={() => {
          void questionTopicsQuery.refetch()
        }}
        title={title}
      />

      {pageMessage ? (
        <div className="rounded-lg border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm font-semibold text-emerald-700">
          {pageMessage}
        </div>
      ) : null}

      <QuestionTopicTable
        errorMessage={getErrorMessage(questionTopicsQuery.error)}
        footer={
          <QuestionTopicPagination
            isDisabled={questionTopicsQuery.isLoading || questionTopicsQuery.isError}
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
            totalElements={questionTopicsQuery.data?.totalElements ?? 0}
            totalPages={questionTopicsQuery.data?.totalPages ?? 0}
          />
        }
        getAdditionalActions={
          canManage
            ? (topic) => [
                ...getQuestionTopicReviewActions(topic, actorRole, {
                  onArchive: () => {
                    void handleReviewAction(topic, 'ARCHIVED')
                  },
                  onPublish: () => {
                    void handleReviewAction(topic, 'PUBLISHED')
                  },
                }),
                ...(canDeleteQuestionTopic(topic, actorRole)
                  ? [
                      {
                        id: `delete-${topic.id}`,
                        label: 'Xoa',
                        onSelect: () => {
                          void handleDeleteTopic(topic)
                        },
                        tone: 'danger' as const,
                      },
                    ]
                  : []),
              ]
            : undefined
        }
        isError={questionTopicsQuery.isError}
        isLoading={questionTopicsQuery.isLoading}
        onEdit={
          canManage
            ? (topic) => {
                if (canEditQuestionTopic(topic, actorRole)) {
                  openEditDialog(topic)
                }
              }
            : undefined
        }
        onRetry={() => {
          void questionTopicsQuery.refetch()
        }}
        onSelect={handleViewDetail}
        onViewQuestions={(topic) => {
          navigate(
            `${basePath}/questions/all?bankId=${bankId}&topicId=${topic.id}&topicName=${encodeURIComponent(topic.name)}`,
          )
        }}
        questionTopics={questionTopics}
        selectedId={effectiveSelectedId}
      />

      <QuestionTopicFormDialog
        bankId={bankId}
        errorMessage={dialogError ?? undefined}
        isSubmitting={isSubmitting}
        mode={dialogMode}
        onClose={closeDialog}
        onSubmit={(mode, payload) => {
          void handleSubmit(mode, payload)
        }}
        questionTopic={dialogMode === 'edit' ? selectedTopic ?? dialogTarget : null}
      />
    </section>
  )
}

export function TeacherQuestionTopicsPage() {
  return <QuestionTopicsPage basePath="/teacher" scope="teacher" />
}

export function SchoolAdminQuestionTopicsPage() {
  return <QuestionTopicsPage basePath="/school-admin" scope="school" />
}

export function SystemAdminQuestionTopicsPage() {
  return <QuestionTopicsPage basePath="/system-admin" scope="admin" />
}
