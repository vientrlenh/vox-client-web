import { ArrowLeft, Pencil } from 'lucide-react'
import { useState } from 'react'
import { useLocation, useNavigate, useParams } from 'react-router'
import { useAppSelector } from '@/app/store/hooks'
import { useQuestionQuery } from '../api/useQuestionQuery'
import {
  canEditQuestion,
  getQuestionActorRole,
  getQuestionReviewActions,
  getTeacherQuestionContext,
} from '../permissions'
import {
  formatDuration,
  formatNullableText,
  formatQuestionDate,
  getQuestionScopeDisplay,
  getQuestionStatusDisplay,
  getQuestionTypeDisplay,
  getQuestionVisibilityDisplay,
} from '../types'

type DetailTab = 'assets' | 'content' | 'guide'
type TeacherView = 'all' | 'my' | 'review'

function getErrorMessage(error: unknown) {
  if (
    error &&
    typeof error === 'object' &&
    'message' in error &&
    typeof error.message === 'string'
  ) {
    return error.message
  }

  return 'Khong the tai chi tiet cau hoi.'
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

type QuestionDetailPageProps = {
  basePath: string
}

function QuestionDetailPage({ basePath }: QuestionDetailPageProps) {
  const navigate = useNavigate()
  const location = useLocation()
  const { questionId } = useParams()
  const user = useAppSelector((state) => state.auth.user)
  const questionQuery = useQuestionQuery(questionId ?? null)
  const question = questionQuery.data
  const [activeTab, setActiveTab] = useState<DetailTab>('content')
  const [successMessage, setSuccessMessage] = useState<string | null>(
    (location.state as { successMessage?: string } | null)?.successMessage ?? null,
  )

  const teacherView =
    ((location.state as { fromView?: TeacherView } | null)?.fromView ?? null)
  const primaryRole = getQuestionActorRole(user?.roles)
  const teacherContext = getTeacherQuestionContext(teacherView)
  const canEdit = canEditQuestion(question, primaryRole, teacherContext)
  const canOpenEditor =
    canEdit ||
    getQuestionReviewActions(question, primaryRole, teacherContext).length > 0

  if (questionQuery.isLoading) {
    return (
      <section className="rounded-lg border border-slate-200 bg-white p-6 text-sm font-semibold text-slate-600">
        Dang tai chi tiet cau hoi...
      </section>
    )
  }

  if (questionQuery.isError || !question) {
    return (
      <section className="grid gap-4 rounded-lg border border-red-200 bg-red-50 p-6 text-sm font-semibold text-red-700">
        <span>{getErrorMessage(questionQuery.error)}</span>
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

  const status = getQuestionStatusDisplay(question.status)

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
          <h1 className="text-3xl font-black text-blue-950">Chi tiet cau hoi</h1>
          <p className="mt-2 text-sm font-medium text-slate-600">
            Xem toan bo thong tin question, assets va evaluation guide.
          </p>
        </div>

        {canOpenEditor ? (
          <button
            className="inline-flex h-11 items-center justify-center gap-2 rounded-lg bg-indigo-600 px-4 text-sm font-bold text-white transition hover:bg-indigo-700"
            onClick={() =>
              navigate(`${basePath}/questions/${question.id}/edit`, {
                state: { fromView: teacherView },
              })
            }
            type="button"
          >
            <Pencil aria-hidden="true" className="size-4" />
            Quan ly question
          </button>
        ) : null}
      </div>

      <div className="grid gap-6 rounded-lg border border-slate-200 bg-white p-6">
        <div className="flex flex-wrap items-center gap-3">
          <span className="rounded-full border border-slate-200 bg-slate-50 px-3 py-1 text-xs font-black text-slate-700">
            {formatNullableText(question.code)}
          </span>
          <span
            className={`rounded-full border px-3 py-1 text-xs font-black ${status.className}`}
          >
            {status.label}
          </span>
        </div>

        <div className="rounded-lg border border-slate-200 bg-slate-50 p-1">
          <div className="flex flex-wrap gap-2">
            {[
              { id: 'content', label: 'Question content' },
              { id: 'assets', label: 'Assets' },
              { id: 'guide', label: 'Evaluation guide' },
            ].map((tab) => (
              <button
                className={[
                  'rounded-lg px-4 py-2 text-sm font-bold transition',
                  activeTab === tab.id
                    ? 'bg-indigo-600 text-white'
                    : 'text-slate-600 hover:bg-white',
                ].join(' ')}
                key={tab.id}
                onClick={() => setActiveTab(tab.id as DetailTab)}
                type="button"
              >
                {tab.label}
              </button>
            ))}
          </div>
        </div>

        {activeTab === 'content' ? (
          <div className="grid gap-6">
            <div className="grid gap-4 md:grid-cols-2">
              <DetailItem
                label="Loai cau hoi"
                value={getQuestionTypeDisplay(question.type)}
              />
              <DetailItem
                label="Scope"
                value={getQuestionScopeDisplay(question.scope)}
              />
              <DetailItem
                label="Hien thi"
                value={getQuestionVisibilityDisplay(question.visibility)}
              />
              <DetailItem
                label="Chu de"
                value={formatNullableText(question.questionTopic?.name)}
              />
              <DetailItem
                label="Ngay tao"
                value={formatQuestionDate(question.createdAt)}
              />
              <DetailItem
                label="Cap nhat"
                value={formatQuestionDate(question.updatedAt)}
              />
            </div>

            <DetailBlock label="Noi dung cau hoi" value={question.questionText} />
            <DetailBlock label="Instruction" value={question.instructionText} />
            <DetailBlock label="Prompt" value={question.promptText} />
            <DetailBlock label="Preparation" value={question.preparationText} />

            <div className="grid gap-4 md:grid-cols-3">
              <DetailItem
                label="Thoi gian chuan bi"
                value={`${question.preparationTimeSeconds ?? 0} giay`}
              />
              <DetailItem
                label="Phan hoi toi thieu"
                value={`${question.minResponseSeconds ?? 0} giay`}
              />
              <DetailItem
                label="Phan hoi toi da"
                value={`${question.maxResponseSeconds ?? 0} giay`}
              />
            </div>
          </div>
        ) : null}

        {activeTab === 'assets' ? (
          <div className="grid gap-4">
            {question.assets?.length ? (
              question.assets.map((asset) => (
                <div
                  className="grid gap-4 rounded-lg border border-slate-200 p-4"
                  key={asset.id}
                >
                  <div className="flex flex-wrap items-center gap-3">
                    <span className="rounded-full border border-slate-200 bg-slate-50 px-3 py-1 text-xs font-black text-slate-700">
                      {formatNullableText(asset.type)}
                    </span>
                    <span className="text-sm font-bold text-slate-950">
                      {formatNullableText(asset.title)}
                    </span>
                  </div>

                  <div className="grid gap-4 md:grid-cols-2">
                    <DetailItem label="URL" value={formatNullableText(asset.url)} />
                    <DetailItem
                      label="Thoi luong"
                      value={
                        asset.durationSeconds == null
                          ? '-'
                          : formatDuration(asset.durationSeconds)
                      }
                    />
                    <DetailItem
                      label="Alt text"
                      value={formatNullableText(asset.altText)}
                    />
                    <DetailItem label="Thu tu" value={String(asset.order)} />
                  </div>
                  <DetailBlock label="Mo ta" value={asset.description} />
                  <DetailBlock label="Transcript" value={asset.transcript} />
                </div>
              ))
            ) : (
              <EmptyState text="Chua co asset nao cho cau hoi nay." />
            )}
          </div>
        ) : null}

        {activeTab === 'guide' ? (
          question.evaluationGuide ? (
            <div className="grid gap-4">
              <DetailBlock
                label="Expected content"
                value={question.evaluationGuide.expectedContent}
              />
              <DetailBlock
                label="Key points"
                value={question.evaluationGuide.keyPoints}
              />
              <DetailBlock
                label="Acceptable responses"
                value={question.evaluationGuide.acceptableResponses}
              />
              <DetailBlock
                label="Off-topic examples"
                value={question.evaluationGuide.offTopicExamples}
              />
              <DetailBlock
                label="Scoring hints"
                value={question.evaluationGuide.scoringHints}
              />
              <DetailBlock
                label="Common mistakes"
                value={question.evaluationGuide.commonMistakes}
              />
            </div>
          ) : (
            <EmptyState text="Chua co evaluation guide cho cau hoi nay." />
          )
        ) : null}
      </div>
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

function DetailBlock({
  label,
  value,
}: {
  label: string
  value?: string | null
}) {
  return (
    <div>
      <p className="text-xs font-bold uppercase tracking-[0.08em] text-slate-500">
        {label}
      </p>
      <div className="mt-2 rounded-lg border border-slate-200 bg-slate-50 p-4 text-sm font-medium leading-6 text-slate-800">
        {formatNullableText(value)}
      </div>
    </div>
  )
}

function EmptyState({ text }: { text: string }) {
  return (
    <div className="rounded-lg border border-dashed border-slate-300 bg-slate-50 p-8 text-center text-sm font-semibold text-slate-500">
      {text}
    </div>
  )
}

export function TeacherQuestionDetailPage() {
  return <QuestionDetailPage basePath="/teacher" />
}

export function SchoolAdminQuestionDetailPage() {
  return <QuestionDetailPage basePath="/school-admin" />
}

export function SystemAdminQuestionDetailPage() {
  return <QuestionDetailPage basePath="/system-admin" />
}
