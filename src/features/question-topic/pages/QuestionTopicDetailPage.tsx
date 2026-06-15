import { ArrowLeft, CheckCircle2, HelpCircle } from 'lucide-react'
import { useState } from 'react'
import { useNavigate, useParams, useSearchParams } from 'react-router'
import { useAppSelector } from '@/app/store/hooks'
import type { QuestionModuleScope } from '@/features/question-bank/api/useQuestionBanksQuery'
import { useQuestionTopicQuery } from '../api/useQuestionTopicQuery'
import { useReviewQuestionTopicMutation } from '../api/useQuestionTopicMutations'
import {
  canManageQuestionTopic,
  getQuestionTopicActorRole,
  getQuestionTopicReviewActions,
} from '../permissions'
import {
  formatNullableText,
  getQuestionTopicStatusDisplay,
  type ReviewQuestionTopicRequest,
} from '../types'

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

  return 'Khong the tai chi tiet question topic.'
}

function SuccessPopup({
  message,
  onClose,
}: {
  message: string
  onClose: () => void
}) {
  return (
    <div className="fixed inset-0 z-50 grid place-items-center bg-slate-950/35 px-4">
      <div className="w-full max-w-md rounded-xl bg-white p-6 shadow-2xl shadow-slate-950/20">
        <h2 className="text-xl font-black text-slate-950">Thanh cong</h2>
        <p className="mt-3 text-sm font-medium leading-6 text-slate-600">
          {message}
        </p>
        <div className="mt-6 flex justify-end">
          <button
            className="inline-flex h-10 items-center justify-center rounded-lg bg-indigo-600 px-4 text-sm font-bold text-white transition hover:bg-indigo-700"
            onClick={onClose}
            type="button"
          >
            Dong
          </button>
        </div>
      </div>
    </div>
  )
}

function DetailItem({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg border border-slate-200 bg-slate-50 p-4">
      <p className="text-xs font-bold uppercase tracking-[0.08em] text-slate-500">
        {label}
      </p>
      <p className="mt-2 break-words text-sm font-bold text-slate-950">{value}</p>
    </div>
  )
}

function QuestionTopicDetailPage({
  basePath,
  scope,
}: QuestionTopicDetailPageProps) {
  const navigate = useNavigate()
  const user = useAppSelector((state) => state.auth.user)
  const { topicId } = useParams()
  const [searchParams] = useSearchParams()
  const bankId = searchParams.get('bankId') ?? ''
  const bankName = searchParams.get('bankName') ?? ''
  const topicQuery = useQuestionTopicQuery(scope, topicId ?? null)
  const reviewMutation = useReviewQuestionTopicMutation()
  const [selectedAction, setSelectedAction] = useState('')
  const [actionError, setActionError] = useState<string | null>(null)
  const [successMessage, setSuccessMessage] = useState<string | null>(null)
  const topic = topicQuery.data
  const actorRole = getQuestionTopicActorRole(user?.roles)
  const canManage = canManageQuestionTopic(actorRole)

  const reviewActions = topic
    ? getQuestionTopicReviewActions(topic, actorRole, {
        onArchive: () => undefined,
        onPublish: () => undefined,
      }).map((item) => ({
        label: item.label,
        status: item.id === 'publish' ? 'PUBLISHED' : 'ARCHIVED',
      }))
    : []

  async function handleStatusUpdate() {
    if (!topic || !selectedAction) {
      setActionError('Vui long chon mot status action.')
      return
    }

    try {
      setActionError(null)
      const payload: ReviewQuestionTopicRequest = { targetStatus: selectedAction }
      const message = await reviewMutation.mutateAsync({
        id: topic.id,
        payload,
      })
      await topicQuery.refetch()
      setSuccessMessage(message)
      setSelectedAction('')
    } catch (error) {
      setActionError(
        getErrorMessage(error) ?? 'Khong the cap nhat status question topic.',
      )
    }
  }

  if (topicQuery.isLoading) {
    return (
      <section className="rounded-lg border border-slate-200 bg-white p-6 text-sm font-semibold text-slate-600">
        Dang tai chi tiet question topic...
      </section>
    )
  }

  if (topicQuery.isError || !topic) {
    return (
      <section className="grid gap-4 rounded-lg border border-red-200 bg-red-50 p-6 text-sm font-semibold text-red-700">
        <span>{getErrorMessage(topicQuery.error)}</span>
        <button
          className="inline-flex h-10 w-fit items-center justify-center rounded-lg bg-red-600 px-4 text-sm font-bold text-white"
          onClick={() => navigate(-1)}
          type="button"
        >
          Quay lai
        </button>
      </section>
    )
  }

  const status = getQuestionTopicStatusDisplay(topic.status)

  return (
    <section className="grid gap-6">
      {successMessage ? (
        <SuccessPopup
          message={successMessage}
          onClose={() => setSuccessMessage(null)}
        />
      ) : null}

      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <button
            className="mb-3 inline-flex items-center gap-1 text-sm font-bold text-indigo-600 transition hover:text-indigo-800"
            onClick={() => navigate(-1)}
            type="button"
          >
            <ArrowLeft aria-hidden="true" className="size-4" />
            Quay lai
          </button>
          <h1 className="text-3xl font-black text-blue-950">
            Chi tiet question topic
          </h1>
          <p className="mt-2 text-sm font-medium text-slate-600">
            Xem thong tin topic va cap nhat status theo quyen hien tai.
          </p>
        </div>

        <button
          className="inline-flex h-11 items-center justify-center gap-2 rounded-lg bg-indigo-600 px-4 text-sm font-bold text-white transition hover:bg-indigo-700"
          onClick={() =>
            navigate(
              `${basePath}/questions/all?bankId=${bankId || topic.questionBankId}&topicId=${topic.id}&topicName=${encodeURIComponent(topic.name)}`,
            )
          }
          type="button"
        >
          <HelpCircle aria-hidden="true" className="size-4" />
          Xem cau hoi
        </button>
      </div>

      <div className="grid gap-6 rounded-lg border border-slate-200 bg-white p-6">
        <div className="flex flex-wrap items-center gap-3">
          <span className="rounded-full border border-slate-200 bg-slate-50 px-3 py-1 text-xs font-black text-slate-700">
            {formatNullableText(topic.code)}
          </span>
          <span
            className={`inline-flex rounded-full border px-3 py-1 text-xs font-black ${status.className}`}
          >
            {status.label}
          </span>
        </div>

        <div className="grid gap-4 md:grid-cols-2">
          <DetailItem label="Ten topic" value={formatNullableText(topic.name)} />
          <DetailItem
            label="Question bank"
            value={formatNullableText(bankName || topic.questionBankId)}
          />
          <DetailItem label="Topic ID" value={topic.id} />
          <DetailItem label="Bank ID" value={topic.questionBankId} />
        </div>

        <div>
          <p className="text-xs font-bold uppercase tracking-[0.08em] text-slate-500">
            Mo ta
          </p>
          <div className="mt-2 rounded-lg border border-slate-200 bg-slate-50 p-4 text-sm font-medium leading-6 text-slate-800">
            {formatNullableText(topic.description)}
          </div>
        </div>
      </div>

      {canManage && reviewActions.length ? (
        <div className="grid gap-4 rounded-lg border border-slate-200 bg-white p-6">
          <div>
            <h2 className="text-lg font-black text-slate-950">Cap nhat status</h2>
            <p className="mt-1 text-sm font-medium text-slate-600">
              Chon action status phu hop voi question topic hien tai.
            </p>
          </div>

          <div className="grid gap-4 md:grid-cols-[1fr_auto]">
            <select
              className="h-11 rounded-lg border border-slate-200 px-3 text-sm font-medium text-slate-950 outline-none transition focus:border-indigo-500 focus:ring-4 focus:ring-indigo-100"
              disabled={reviewMutation.isPending}
              onChange={(event) => setSelectedAction(event.target.value)}
              value={selectedAction}
            >
              <option value="">Chon action</option>
              {reviewActions.map((action) => (
                <option key={action.status} value={action.status}>
                  {action.label}
                </option>
              ))}
            </select>

            <button
              className="inline-flex h-11 items-center justify-center gap-2 rounded-lg bg-slate-900 px-4 text-sm font-bold text-white transition hover:bg-slate-700 disabled:opacity-60"
              disabled={!selectedAction || reviewMutation.isPending}
              onClick={handleStatusUpdate}
              type="button"
            >
              <CheckCircle2 aria-hidden="true" className="size-4" />
              {reviewMutation.isPending ? 'Dang cap nhat...' : 'Luu status'}
            </button>
          </div>

          {actionError ? (
            <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm font-semibold text-red-700">
              {actionError}
            </div>
          ) : null}
        </div>
      ) : null}
    </section>
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
