import { useState } from 'react'
import { useQueryClient } from '@tanstack/react-query'
import { Trash2 } from 'lucide-react'
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
  canDeleteQuestionBank,
  canEditQuestionBank,
  canManageQuestionBank,
  getQuestionBankActorRole,
  getQuestionBankStatusActions,
} from '../permissions'
import type { CreateQuestionBankRequest, QuestionBankDto } from '../types'
import { useAppSelector } from '@/app/store/hooks'
import { useSupportedLanguagesQuery } from '@/features/languages/api/useSupportedLanguagesQuery'

const DEFAULT_PAGE = 1
const DEFAULT_PAGE_SIZE = 10
const LANGUAGE_OPTIONS_PAGE_SIZE = 100

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
  // MỌI scope đều phải chọn ngôn ngữ, kể cả ngân hàng của trường.
  //
  // Trước đây scope trường gán cứng QUESTION_MODULE_DEFAULT_LANGUAGE_ID -- một UUID viết thẳng
  // trong mã nguồn. Cách đó hỏng theo kiểu im lặng: hằng số ấy trùng khít từng ký tự với
  // QUESTION_MODULE_DEFAULT_SCHOOL_ID (id của một TRƯỜNG, bảng khác hẳn), nên ít nhất một trong
  // hai đang trỏ sai bảng. Ngân hàng tạo ra vẫn lưu thành công, chỉ là gắn vào một hàng không
  // phải ngôn ngữ -- không lỗi, không cảnh báo, chỉ sai.
  //
  // Bắt chọn thì id luôn đến từ danh sách server trả về, không thể trỏ nhầm bảng.
  const languagesQuery = useSupportedLanguagesQuery(
    1,
    LANGUAGE_OPTIONS_PAGE_SIZE,
    { isActive: 'active', search: '' },
    // Chỉ nạp khi thật sự mở form tạo, không phải mỗi lần vào trang danh sách.
    dialogMode === 'create',
  )
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
          languageId: values.languageId,
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
        getErrorMessage(error) ?? 'Không thể cập nhật ngân hàng câu hỏi.',
      )
    }
  }

  async function handleDeleteBank(bank: QuestionBankDto) {
    if (!window.confirm(`Xóa ngân hàng câu hỏi "${bank.name}"?`)) {
      return
    }

    try {
      const result = await deleteMutation.mutateAsync(bank.id)
      await refreshBanks()
      setPageMessage(
        result.archivedInstead
          ? `${result.message}. Hệ thống đã lưu trữ thay vì xóa.`
          : result.message,
      )
    } catch (error) {
      setPageMessage(
        getErrorMessage(error) ?? 'Không thể xóa ngân hàng câu hỏi.',
      )
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
        canEdit={(bank) => canEditQuestionBank(bank, actorRole)}
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
                  icon: action.icon,
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
                            'Không thể cập nhật trạng thái ngân hàng câu hỏi.',
                        )
                      }
                    })()
                  },
                  tone: action.action === 'PUBLISH' ? ('success' as const) : ('default' as const),
                })),
                {
                  disabled: !canDeleteQuestionBank(bank, actorRole),
                  disabledReason: 'Chỉ xóa được khi ở trạng thái Bản nháp',
                  icon: Trash2,
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
          navigate(`${basePath}/question-banks/${bank.id}?tab=topics`)
        }
        questionBanks={questionBanks}
        selectedId={effectiveSelectedId}
      />

      <QuestionBankFormDialog
        key={`${dialogMode ?? 'closed'}-${dialogTarget?.id ?? selectedBank?.id ?? 'new'}`}
        errorMessage={dialogError ?? undefined}
        isLanguagesLoading={languagesQuery.isLoading}
        isSubmitting={isSubmitting}
        languages={languagesQuery.data?.content ?? []}
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
        showLanguageField
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
