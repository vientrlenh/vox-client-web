import { ArrowLeft } from 'lucide-react'
import { useState } from 'react'
import { useQueryClient } from '@tanstack/react-query'
import { useNavigate, useParams, useSearchParams } from 'react-router'
import type { QuestionModuleScope } from '@/features/question-bank/api/useQuestionBanksQuery'
import { questionQueryKeys } from '@/features/question/api/useQuestionsQuery'
import { TopicQuestionsPanel } from '@/features/question/components/TopicQuestionsPanel'
import { useAppSelector } from '@/app/store/hooks'
import { useQuestionTopicQuery } from '../api/useQuestionTopicQuery'
import { useReviewQuestionTopicMutation } from '../api/useQuestionTopicMutations'
import {
  canManageQuestionTopic,
  getQuestionTopicActorRole,
  getQuestionTopicReviewActions,
} from '../permissions'
import { formatNullableText, getQuestionTopicStatusDisplay } from '../types'

type QuestionTopicDetailPageProps = {
  basePath: string
  scope: QuestionModuleScope
}

function getErrorMessage(error: unknown) {
  if (
    error &&
    typeof error === 'object' &&
    'message' in error &&
    typeof error.message === 'string'
  ) {
    return error.message
  }

  return 'Không thể tải chi tiết chủ đề câu hỏi.'
}

function QuestionTopicDetailPage({
  basePath,
  scope,
}: QuestionTopicDetailPageProps) {
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const user = useAppSelector((state) => state.auth.user)
  const { topicId } = useParams()
  const [searchParams] = useSearchParams()
  const bankId = searchParams.get('bankId') ?? ''
  const bankName = searchParams.get('bankName') ?? ''
  const topicQuery = useQuestionTopicQuery(topicId ?? null)
  const reviewMutation = useReviewQuestionTopicMutation()
  const [pageMessage, setPageMessage] = useState<string | null>(null)
  const topic = topicQuery.data
  const actorRole = getQuestionTopicActorRole(user?.roles)
  const canManage = canManageQuestionTopic(actorRole)
  const banksPath = `${basePath}/question-banks`

  // Backend có thể cascade trạng thái chủ đề xuống câu hỏi, nên bảng nhúng
  // bên dưới phải được làm mới cùng lúc với chủ đề.
  async function refreshAfterReview() {
    await topicQuery.refetch()
    await queryClient.invalidateQueries({ queryKey: questionQueryKeys.all })
  }

  if (topicQuery.isLoading) {
    return (
      <section className="rounded-lg border border-slate-200 bg-white p-6 text-sm font-semibold text-slate-600">
        Đang tải chi tiết chủ đề câu hỏi...
      </section>
    )
  }

  if (topicQuery.isError || !topic) {
    return (
      <section className="grid gap-4 rounded-lg border border-red-200 bg-red-50 p-6 text-sm font-semibold text-red-700">
        <span>{getErrorMessage(topicQuery.error)}</span>
        <button
          className="inline-flex h-10 w-fit items-center justify-center rounded-lg bg-red-600 px-4 text-sm font-bold text-white"
          onClick={() =>
            navigate(bankId ? `${banksPath}/${bankId}?tab=topics` : banksPath)
          }
          type="button"
        >
          Quay lại ngân hàng
        </button>
      </section>
    )
  }

  const status = getQuestionTopicStatusDisplay(topic.status)

  return (
    <section
      aria-labelledby="question-topic-detail-title"
      className="grid gap-6"
    >
      {pageMessage ? (
        <div className="rounded-lg border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm font-semibold text-emerald-700">
          {pageMessage}
        </div>
      ) : null}

      <div>
        <button
          className="mb-3 inline-flex items-center gap-1 text-sm font-bold text-indigo-600 transition hover:text-indigo-800"
          onClick={() =>
            navigate(
              `${banksPath}/${bankId || topic.questionBankId}?tab=topics`,
            )
          }
          type="button"
        >
          <ArrowLeft aria-hidden="true" className="size-4" />
          Quay lại ngân hàng
        </button>
        <h1
          className="text-3xl font-black text-blue-950"
          id="question-topic-detail-title"
        >
          Chi tiết chủ đề câu hỏi
        </h1>
        <p className="mt-2 text-sm font-medium text-slate-600">
          Xem thông tin và cập nhật quy trình duyệt theo quyền hiện tại.
        </p>
      </div>

      <div className="grid gap-6 rounded-lg border border-slate-200 bg-white p-6">
        <div className="flex flex-wrap items-center gap-3">
          <span className="rounded-full border border-slate-200 bg-slate-50 px-3 py-1 text-xs font-black text-slate-700">
            {formatNullableText(topic.code)}
          </span>
          <span className={`inline-flex rounded-full border px-3 py-1 text-xs font-black ${status.className}`}>
            {status.label}
          </span>
        </div>

        <div className="grid gap-4 md:grid-cols-2">
          <DetailItem
            label="Tên chủ đề"
            value={formatNullableText(topic.name)}
          />
          <DetailItem
            label="Ngân hàng câu hỏi"
            value={formatNullableText(bankName || topic.bank?.name || topic.questionBankId)}
          />
          <DetailItem label="Mã định danh chủ đề" value={topic.id} />
          <DetailItem
            label="Mã định danh ngân hàng"
            value={topic.questionBankId}
          />
        </div>

        <div>
          <p className="text-xs font-bold uppercase tracking-[0.08em] text-slate-500">Mô tả</p>
          <div className="mt-2 rounded-lg border border-slate-200 bg-slate-50 p-4 text-sm font-medium leading-6 text-slate-800">
            {formatNullableText(topic.description)}
          </div>
        </div>
      </div>

      {canManage ? (
        <div className="grid gap-4 rounded-lg border border-slate-200 bg-white p-6">
          <div>
            <h2 className="text-lg font-black text-slate-950">
              Quy trình duyệt
            </h2>
            <p className="mt-1 text-sm font-medium text-slate-600">
              Các thao tác hợp lệ với trạng thái hiện tại của chủ đề.
            </p>
          </div>

          <div className="flex flex-wrap gap-3">
            {getQuestionTopicReviewActions(topic, actorRole, {
              onArchive: () => {
                void (async () => {
                  try {
                    const message = await reviewMutation.mutateAsync({
                      id: topic.id,
                      payload: { action: 'ARCHIVE' },
                    })
                    await refreshAfterReview()
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
                    await refreshAfterReview()
                    setPageMessage(message)
                  } catch (error) {
                    setPageMessage(
                      getErrorMessage(error) ??
                        'Không thể cập nhật trạng thái chủ đề câu hỏi.',
                    )
                  }
                })()
              },
            }).map((action) => (
              <button
                className={[
                  'inline-flex h-10 items-center justify-center rounded-lg px-4 text-sm font-bold transition',
                  action.tone === 'success'
                    ? 'bg-emerald-600 text-white hover:bg-emerald-700'
                    : 'border border-slate-200 bg-white text-slate-700 hover:bg-slate-50',
                ].join(' ')}
                disabled={reviewMutation.isPending}
                key={action.id}
                onClick={action.onSelect}
                type="button"
              >
                {action.label}
              </button>
            ))}
          </div>
        </div>
      ) : null}

      <TopicQuestionsPanel
        basePath={basePath}
        questionBankId={bankId || topic.questionBankId}
        questionTopicId={topic.id}
        scope={scope}
        topicName={topic.name}
      />
    </section>
  )
}

function DetailItem({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg border border-slate-200 bg-slate-50 p-4">
      <p className="text-xs font-bold uppercase tracking-[0.08em] text-slate-500">
        {label}
      </p>
      <p className="mt-2 wrap-break-word text-sm font-bold text-slate-950">{value}</p>
    </div>
  )
}

export function TeacherQuestionTopicDetailPage() {
  return <QuestionTopicDetailPage basePath="/teacher" scope="teacher" />
}

export function SchoolAdminQuestionTopicDetailPage() {
  return <QuestionTopicDetailPage basePath="/school-admin" scope="school" />
}

export function SystemAdminQuestionTopicDetailPage() {
  return <QuestionTopicDetailPage basePath="/system-admin" scope="admin" />
}
