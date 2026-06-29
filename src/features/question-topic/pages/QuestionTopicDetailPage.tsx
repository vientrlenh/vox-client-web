import { ArrowLeft, HelpCircle } from 'lucide-react'
import { useState } from 'react'
import { useNavigate, useParams, useSearchParams } from 'react-router'
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

function QuestionTopicDetailPage({ basePath }: QuestionTopicDetailPageProps) {
  const navigate = useNavigate()
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
      {pageMessage ? (
        <div className="rounded-lg border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm font-semibold text-emerald-700">
          {pageMessage}
        </div>
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
          <h1 className="text-3xl font-black text-blue-950">Chi tiet question topic</h1>
          <p className="mt-2 text-sm font-medium text-slate-600">
            Xem thong tin topic va cap nhat workflow theo quyen hien tai.
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
          <span className={`inline-flex rounded-full border px-3 py-1 text-xs font-black ${status.className}`}>
            {status.label}
          </span>
        </div>

        <div className="grid gap-4 md:grid-cols-2">
          <DetailItem label="Ten topic" value={formatNullableText(topic.name)} />
          <DetailItem
            label="Question bank"
            value={formatNullableText(bankName || topic.bank?.name || topic.questionBankId)}
          />
          <DetailItem label="Topic ID" value={topic.id} />
          <DetailItem label="Bank ID" value={topic.questionBankId} />
        </div>

        <div>
          <p className="text-xs font-bold uppercase tracking-[0.08em] text-slate-500">Mo ta</p>
          <div className="mt-2 rounded-lg border border-slate-200 bg-slate-50 p-4 text-sm font-medium leading-6 text-slate-800">
            {formatNullableText(topic.description)}
          </div>
        </div>
      </div>

      {canManage ? (
        <div className="grid gap-4 rounded-lg border border-slate-200 bg-white p-6">
          <div>
            <h2 className="text-lg font-black text-slate-950">Workflow</h2>
            <p className="mt-1 text-sm font-medium text-slate-600">
              Cac thao tac status hop le cho topic hien tai.
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
                    await topicQuery.refetch()
                    setPageMessage(message)
                  } catch (error) {
                    setPageMessage(
                      getErrorMessage(error) ??
                        'Khong the cap nhat trang thai question topic.',
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
                    await topicQuery.refetch()
                    setPageMessage(message)
                  } catch (error) {
                    setPageMessage(
                      getErrorMessage(error) ??
                        'Khong the cap nhat trang thai question topic.',
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
    </section>
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

export function TeacherQuestionTopicDetailPage() {
  return <QuestionTopicDetailPage basePath="/teacher" />
}

export function SchoolAdminQuestionTopicDetailPage() {
  return <QuestionTopicDetailPage basePath="/school-admin" />
}

export function SystemAdminQuestionTopicDetailPage() {
  return <QuestionTopicDetailPage basePath="/system-admin" />
}
