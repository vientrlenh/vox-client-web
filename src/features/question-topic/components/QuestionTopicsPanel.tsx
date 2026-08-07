import { useState } from 'react'
import { useQueryClient } from '@tanstack/react-query'
import { Plus, RefreshCw, Trash2 } from 'lucide-react'
import { useNavigate } from 'react-router'
import type { QuestionModuleScope } from '@/features/question-bank/api/useQuestionBanksQuery'
import { useAppSelector } from '@/app/store/hooks'
import { useQuestionTopicQuery } from '../api/useQuestionTopicQuery'
import {
  questionTopicQueryKeys,
  useQuestionTopicsQuery,
} from '../api/useQuestionTopicsQuery'
import {
  useCreateQuestionTopicMutation,
  useDeleteQuestionTopicMutation,
  useReviewQuestionTopicMutation,
  useUpdateQuestionTopicMutation,
} from '../api/useQuestionTopicMutations'
import { QuestionTopicFormDialog } from './QuestionTopicFormDialog'
import type { QuestionTopicFormMode } from './QuestionTopicFormDialog'
import { QuestionTopicPagination } from './QuestionTopicPagination'
import { QuestionTopicTable } from './QuestionTopicTable'
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

type QuestionTopicsPanelProps = {
  bankId: string
  bankName?: string
  basePath: string
  scope: QuestionModuleScope
}

export function QuestionTopicsPanel({
  bankId,
  bankName,
  basePath,
  scope,
}: QuestionTopicsPanelProps) {
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const user = useAppSelector((state) => state.auth.user)
  const [page, setPage] = useState(DEFAULT_PAGE)
  const [pageSize, setPageSize] = useState(DEFAULT_PAGE_SIZE)
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [dialogMode, setDialogMode] = useState<QuestionTopicFormMode | null>(null)
  const [dialogTarget, setDialogTarget] = useState<QuestionTopicDto | null>(null)
  const [dialogError, setDialogError] = useState<string | null>(null)
  const [pageMessage, setPageMessage] = useState<string | null>(null)

  const actorRole = getQuestionTopicActorRole(user?.roles)
  const canManage = canManageQuestionTopic(actorRole)
  const questionTopicsQuery = useQuestionTopicsQuery(scope, bankId, page - 1, pageSize)
  const questionTopics = questionTopicsQuery.data?.content ?? []
  const selectedListTopic =
    questionTopics.find((topic) => topic.id === selectedId) ??
    questionTopics[0] ??
    null
  const effectiveSelectedId = selectedListTopic?.id ?? null
  const selectedTopicQuery = useQuestionTopicQuery(effectiveSelectedId)
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

  async function handleSubmit(
    mode: QuestionTopicFormMode,
    payload: CreateQuestionTopicRequest | UpdateQuestionTopicRequest,
  ) {
    try {
      setDialogError(null)

      if (mode === 'create') {
        const message = await createMutation.mutateAsync(payload as CreateQuestionTopicRequest)
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
        getErrorMessage(error) ??
          'Không thể lưu chủ đề câu hỏi. Vui lòng thử lại.',
      )
    }
  }

  return (
    <section aria-labelledby="question-topics-panel-title" className="grid gap-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h2
            className="text-lg font-black text-blue-950"
            id="question-topics-panel-title"
          >
            Chủ đề
          </h2>
          <p className="mt-1 text-sm font-medium text-slate-500">
            {bankName
              ? `Danh sách chủ đề thuộc ngân hàng: ${bankName}`
              : 'Danh sách chủ đề thuộc ngân hàng câu hỏi này.'}
          </p>
        </div>

        <div className="flex flex-wrap gap-3">
          <button
            className="inline-flex h-11 items-center justify-center gap-2 rounded-full border border-slate-200 bg-white px-4 text-sm font-bold text-indigo-700 transition hover:bg-indigo-50 disabled:cursor-wait disabled:opacity-70"
            disabled={questionTopicsQuery.isFetching}
            onClick={() => {
              void questionTopicsQuery.refetch()
            }}
            type="button"
          >
            <RefreshCw
              aria-hidden="true"
              className={[
                'size-4',
                questionTopicsQuery.isFetching ? 'animate-spin' : '',
              ].join(' ')}
            />
            Làm mới
          </button>

          {canManage ? (
            <button
              className="inline-flex h-11 items-center justify-center gap-2 rounded-full bg-linear-to-r from-indigo-600 to-cyan-500 px-5 text-sm font-bold text-white transition hover:opacity-90"
              onClick={() => setDialogMode('create')}
              type="button"
            >
              <Plus aria-hidden="true" className="size-4" />
              Tạo chủ đề
            </button>
          ) : null}
        </div>
      </div>

      {pageMessage ? (
        <div className="rounded-lg border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm font-semibold text-emerald-700">
          {pageMessage}
        </div>
      ) : null}

      <QuestionTopicTable
        canEdit={(topic) => canEditQuestionTopic(topic, actorRole)}
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
                    void (async () => {
                      try {
                        const message = await reviewMutation.mutateAsync({
                          id: topic.id,
                          payload: { action: 'ARCHIVE' },
                        })
                        await refreshTopics()
                        setPageMessage(message)
                      } catch (error) {
                        setPageMessage(
                          getErrorMessage(error) ??
                            'Không thể cập nhật trạng thái chủ đề câu hỏi.',
                        )
                      }
                    })()
                  },
                  onPublish: () => {
                    void (async () => {
                      try {
                        const message = await reviewMutation.mutateAsync({
                          id: topic.id,
                          payload: { action: 'PUBLISH' },
                        })
                        await refreshTopics()
                        setPageMessage(message)
                      } catch (error) {
                        setPageMessage(
                          getErrorMessage(error) ??
                            'Không thể cập nhật trạng thái chủ đề câu hỏi.',
                        )
                      }
                    })()
                  },
                }),
                {
                  disabled: !canDeleteQuestionTopic(topic, actorRole),
                  disabledReason: 'Chỉ xóa được khi ở trạng thái Bản nháp',
                  icon: Trash2,
                  id: `delete-${topic.id}`,
                  label: 'Xóa',
                  onSelect: () => {
                    void (async () => {
                      try {
                        const message = await deleteMutation.mutateAsync(topic.id)
                        await refreshTopics()
                        setPageMessage(message)
                      } catch (error) {
                        setPageMessage(
                          getErrorMessage(error) ??
                            'Không thể xóa chủ đề câu hỏi.',
                        )
                      }
                    })()
                  },
                  tone: 'danger' as const,
                },
              ]
            : undefined
        }
        isError={questionTopicsQuery.isError}
        isLoading={questionTopicsQuery.isLoading}
        onEdit={
          canManage
            ? (topic) => {
                if (!canEditQuestionTopic(topic, actorRole)) {
                  return
                }
                setDialogError(null)
                setDialogTarget(topic)
                setDialogMode('edit')
              }
            : undefined
        }
        onRetry={() => {
          void questionTopicsQuery.refetch()
        }}
        onSelect={(topicId) => {
          setSelectedId(topicId)
          navigate(
            `${basePath}/question-topics/${topicId}?bankId=${bankId}&bankName=${encodeURIComponent(bankName ?? '')}`,
          )
        }}
        questionTopics={questionTopics}
        selectedId={effectiveSelectedId}
      />

      <QuestionTopicFormDialog
        key={`${dialogMode ?? 'closed'}-${dialogTarget?.id ?? selectedTopic?.id ?? 'new'}`}
        bankId={bankId}
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
        questionTopic={dialogMode === 'edit' ? selectedTopic ?? dialogTarget : null}
      />
    </section>
  )
}
